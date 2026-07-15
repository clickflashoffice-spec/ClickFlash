import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
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
  
  // TODO: Validate user against D1 database
  const valid = email === 'test@clickflash.com' && password === 'password123'
  
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  // Create JWT token
  // import { sign } from 'hono/jwt'
  // const token = await sign({ email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, c.env.JWT_SECRET)
  
  return c.json({ token: 'dummy_token' }) // Replace with real token
})

// === Protected Routes ===
// app.use('/api/*', (c, next) => jwt({ secret: c.env.JWT_SECRET })(c, next))

// Albums
app.get('/api/albums', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM albums').all()
  return c.json({ albums: results })
})

app.post('/api/albums', async (c) => {
  const albumData = await c.req.json()
  // TODO: Insert into D1
  return c.json({ success: true })
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
  
  // TODO: Verify if user has purchased this photo via D1 orders table
  const hasPurchased = true 
  
  if (!hasPurchased) {
    return c.json({ error: 'Unauthorized' }, 403)
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
