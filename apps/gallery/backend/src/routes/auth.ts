import { createToken, verifyToken, extractTokenFromHeader } from "../jwt.js";
import { checkLoginRateLimit, recordLoginAttempt } from "../loginRateLimiter.js";
import { validateLogin } from "../validation.js";
import { verifyPassword } from "../auth.js";
import { handlePayments } from "../payments.js";

export const handleAuth = async (request: Request, url: URL, pathName: string, env: any, dbManager: any, corsHeaders: any, photoProcessor: any) => {


        if (pathName === "/api/auth/login" && request.method === "POST") {
          const parsed = (await request.json()) as any;
          const validation = validateLogin(parsed);
          if (!validation.success || !validation.data) {
            return new Response(
              JSON.stringify({
                error: "Validation Error",
                message: validation.error || "Invalid credentials",
              }),
              { status: 400 },
            );
          }
          const { email, password } = validation.data;

          // Brute-force protection — check before touching the DB for the user
          const clientIp = request.headers.get('CF-Connecting-IP') ??
                           request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
                           'unknown';
          const rateLimit = await checkLoginRateLimit(dbManager, email, clientIp);
          if (!rateLimit.allowed) {
            return new Response(
              JSON.stringify({
                error: "Too Many Requests",
                message: "Too many failed login attempts. Please try again later.",
              }),
              {
                status: 429,
                headers: {
                  'Retry-After': String(rateLimit.retryAfterSeconds ?? 900),
                  'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + (rateLimit.retryAfterSeconds ?? 900)),
                },
              },
            );
          }

          const user = (await dbManager.get(
            "SELECT * FROM users WHERE email = ?",
            [email],
          )) as any;
          const passwordOk = user && (await verifyPassword(password, user.password));

          // Record attempt before returning to prevent timing oracle
          await recordLoginAttempt(dbManager, email, clientIp, !!passwordOk);

          if (!passwordOk) {
            return new Response(
              JSON.stringify({
                error: "Auth Error",
                message: "Invalid email or password",
              }),
              { status: 401 },
            );
          }

          // Generate proper JWT token
          const token = await createToken(
            {
              userId: user.id,
              email: user.email,
              role: user.role,
            },
            env.JWT_SECRET
          );

          delete user.password;
          return new Response(JSON.stringify({ token, user }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
  return null;
};
