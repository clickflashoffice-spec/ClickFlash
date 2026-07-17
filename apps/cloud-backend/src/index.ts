import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt, sign, verify } from 'hono/jwt'
import Stripe from 'stripe'
import { signLicense, LicensePayload } from '@clickflash/licensing/crypto'

type Bindings = {
  DB: D1Database
  HIGH_RES_BUCKET: R2Bucket
  JWT_SECRET: string
  STRIPE_SECRET_KEY: string
  PRIVATE_KEY_PEM: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'clickflash-cloud-backend' })
})

// === Auth Routes ===
app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json()

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400)
  }

  // Validate user against D1 database
  const user = await c.env.DB.prepare('SELECT id, email, password, role FROM users WHERE email = ?').bind(email).first<any>()

  // Note: For production, compare hashed passwords securely
  if (!user || user.password !== password) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  // Create JWT token
  const token = await sign(
    { sub: user.id, email: user.email, role: user.role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 },
    c.env.JWT_SECRET,
    'HS256'
  )
  
  return c.json({ token, user: { id: user.id, email: user.email, role: user.role } })
})

// === Protected Routes ===
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return jwt({ secret: c.env.JWT_SECRET, alg: 'HS256' })(c, next)
})

// Albums
app.get('/api/albums', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM albums ORDER BY created_at DESC').all()
  return c.json({ albums: results })
})

app.post('/api/albums', async (c) => {
  const albumData = await c.req.json()
  const id = albumData.id || `album_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

  await c.env.DB.prepare(
    'INSERT INTO albums (id, title, date, photographerId, status, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))'
  ).bind(
    id,
    albumData.title || 'Untitled Album',
    albumData.date || new Date().toISOString().split('T')[0],
    albumData.photographerId || null,
    albumData.status || 'Draft'
  ).run()

  return c.json({ success: true, id })
})

// Stripe Checkout
app.post('/api/checkout', async (c) => {
  const { albumId, photoIds } = await c.req.json()
  
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' as any })
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Photos from Album ${albumId}`,
            },
            unit_amount: 500 * photoIds.length, // $5.00 per photo
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://gallery.clickflash.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://gallery.clickflash.com/album/${albumId}`,
    })

    return c.json({ url: session.url })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

// R2 High-Res Photos (Pre-signed URLs or direct serve)
app.get('/api/photos/:albumId/:photoId', async (c) => {
  const { albumId, photoId } = c.req.param()
  const tokenPayload = c.get('jwtPayload') as { sub?: string; role?: string } | undefined
  const userId = tokenPayload?.sub
  const userRole = tokenPayload?.role

  // Allow admins or photographers full access without checking purchase
  let hasPurchased = userRole === 'Admin' || userRole === 'Photographer'

  if (!hasPurchased && userId) {
    // Verify if user has purchased this photo via D1 orders table
    const order = await c.env.DB.prepare(
      `SELECT o.id FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ? AND oi.photo_id = ? AND (o.status = 'PAID' OR o.status = 'COMPLETED')`
    ).bind(userId, photoId).first()

    if (order) {
      hasPurchased = true
    }
  }
  
  if (!hasPurchased) {
    return c.json({ error: 'Payment required or unauthorized access' }, 403)
  }

  const object = await c.env.HIGH_RES_BUCKET.get(`photos/${albumId}/${photoId}`)
  
  if (object === null) {
    return c.text('Object Not Found', 404)
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, { headers })
})

// === Admin Routes ===
app.post('/api/admin/licenses', async (c) => {
  // In a real app, this route would be protected by admin JWT middleware
  const body = await c.req.json()
  
  try {
    const payload: LicensePayload = {
      machineFingerprint: body.hardwareUuid,
      issuedAt: Date.now(),
      features: body.tier === 'ENTERPRISE' ? ['ALL'] : [body.tier],
    }

    if (body.expiresAt) {
      payload.expiresAt = new Date(body.expiresAt).getTime()
    }

    const licenseData = signLicense(payload, c.env.PRIVATE_KEY_PEM)

    return c.json({
      success: true,
      license: licenseData
    })
  } catch (err: any) {
    return c.json({ error: err.message }, 500)
  }
})

export default app
