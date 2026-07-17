/**
 * Simple Router for Cloudflare Workers
 */

type Handler = (
  request: Request,
  env: any,
  params: Record<string, string>,
  ctx: ExecutionContext,
) => Promise<Response> | Response;
type Middleware = (
  request: Request,
  env: any,
  ctx: ExecutionContext,
) => Promise<Response | Request | null> | Response | Request | null;

interface Route {
  method: string;
  pattern: URLPattern;
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];
  private middlewares: Middleware[] = [];

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  get(path: string, handler: Handler) {
    this.addRoute('GET', path, handler);
  }

  post(path: string, handler: Handler) {
    this.addRoute('POST', path, handler);
  }

  put(path: string, handler: Handler) {
    this.addRoute('PUT', path, handler);
  }

  patch(path: string, handler: Handler) {
    this.addRoute('PATCH', path, handler);
  }

  delete(path: string, handler: Handler) {
    this.addRoute('DELETE', path, handler);
  }

  private addRoute(method: string, path: string, handler: Handler) {
    const pattern = new URLPattern({ pathname: path });
    this.routes.push({ method, pattern, handler });
  }

  async handle(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // Run middlewares — each middleware can return a modified Request
    // (via Response with header `X-Modified-Request`) or a Response to short-circuit.
    let currentRequest = request;
    for (const middleware of this.middlewares) {
      const result = await middleware(currentRequest, env, ctx);
      if (result !== null) {
        // If the middleware returned a Request (not a Response), use it as the new request.
        if (result instanceof Request) {
          currentRequest = result;
          continue;
        }
        return result;
      }
    }

    // Find matching route
    const url = new URL(currentRequest.url);

    for (const route of this.routes) {
      if (route.method !== currentRequest.method) continue;

      const match = route.pattern.exec({ pathname: url.pathname });
      if (match) {
        const params = match.pathname.groups;
        return await route.handler(currentRequest, env, params, ctx);
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}
