import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import { sign, verify } from 'hono/jwt';
import type { AppEnv } from './types';

const GALLERY_AUDIENCE = 'clickflash-gallery';
const GALLERY_ISSUER = 'clickflash-cloud';
const MINIMUM_SECRET_BYTES = 32;
const textEncoder = new TextEncoder();

export type ServicePrincipal = {
  kind: 'service';
};

export type GalleryPrincipal = {
  kind: 'gallery';
  eventId: string;
  regionId: string;
};

export type Principal = ServicePrincipal | GalleryPrincipal;

export class AuthConfigurationError extends Error {
  constructor(secretName: string) {
    super(`${secretName} must be configured with at least ${MINIMUM_SECRET_BYTES} bytes`);
    this.name = 'AuthConfigurationError';
  }
}

function requireSecret(value: string | undefined, secretName: string): string {
  if (!value || textEncoder.encode(value).byteLength < MINIMUM_SECRET_BYTES) {
    throw new AuthConfigurationError(secretName);
  }

  return value;
}

async function digest(value: string): Promise<Uint8Array> {
  const result = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return new Uint8Array(result);
}

async function secretsMatch(left: string, right: string): Promise<boolean> {
  const [leftDigest, rightDigest] = await Promise.all([digest(left), digest(right)]);
  let difference = leftDigest.length ^ rightDigest.length;

  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }

  return difference === 0;
}

export async function createGalleryToken(
  env: AppEnv['Bindings'],
  eventId: string,
  regionId: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const secret = requireSecret(env.JWT_SECRET, 'JWT_SECRET');

  return sign(
    {
      sub: eventId,
      eventId,
      regionId,
      role: 'gallery',
      iss: GALLERY_ISSUER,
      aud: GALLERY_AUDIENCE,
      iat: now,
      exp: now + 12 * 60 * 60
    },
    secret,
    'HS256'
  );
}

export async function verifyGalleryToken(
  env: AppEnv['Bindings'],
  token: string
): Promise<GalleryPrincipal | null> {
  const secret = requireSecret(env.JWT_SECRET, 'JWT_SECRET');

  try {
    const payload = await verify(token, secret, {
      alg: 'HS256',
      iss: GALLERY_ISSUER,
      aud: GALLERY_AUDIENCE
    });

    if (
      payload.role !== 'gallery' ||
      typeof payload.eventId !== 'string' ||
      payload.eventId.length === 0 ||
      typeof payload.regionId !== 'string' ||
      payload.regionId.length === 0 ||
      payload.sub !== payload.eventId
    ) {
      return null;
    }

    return { kind: 'gallery', eventId: payload.eventId, regionId: payload.regionId };
  } catch {
    return null;
  }
}

function bearerToken(c: Context<AppEnv>): string | null {
  const header = c.req.header('Authorization');
  if (!header) return null;

  const [scheme, token, extra] = header.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) return null;
  return token;
}

export const requireServiceAuth = createMiddleware<AppEnv>(async (c, next) => {
  let configuredSecret: string;
  try {
    configuredSecret = requireSecret(c.env.SERVICE_API_KEY, 'SERVICE_API_KEY');
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return c.json({ error: 'Service authentication is not configured' }, 503);
    }
    throw error;
  }

  const suppliedSecret = c.req.header('X-ClickFlash-Service-Key');
  if (!suppliedSecret || !(await secretsMatch(suppliedSecret, configuredSecret))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('principal', { kind: 'service' });
  await next();
});

export const requireGalleryAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = bearerToken(c);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  let principal: GalleryPrincipal | null;
  try {
    principal = await verifyGalleryToken(c.env, token);
  } catch (error) {
    if (error instanceof AuthConfigurationError) {
      return c.json({ error: 'Gallery authentication is not configured' }, 503);
    }
    throw error;
  }

  if (!principal) return c.json({ error: 'Invalid token' }, 401);
  if (principal.regionId !== c.get('regionId')) {
    return c.json({ error: 'Token is not valid for this region' }, 401);
  }

  c.set('principal', principal);
  await next();
});

export function getGalleryPrincipal(c: Context<AppEnv>): GalleryPrincipal {
  const principal = c.get('principal');
  if (principal?.kind !== 'gallery') {
    throw new Error('Gallery principal missing after authentication');
  }
  return principal;
}
