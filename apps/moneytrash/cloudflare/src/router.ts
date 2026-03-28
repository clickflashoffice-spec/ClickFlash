/**
 * Simple Router for Cloudflare Workers
 */

type Handler = (request: Request, env: any, ctx: ExecutionContext, params?: Record<string, string>) => Promise<Response> | Response;
type Middleware = (request: Request, env: any, ctx: ExecutionContext) => Promise<Response | null> | Response | null;

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
    // Run middlewares
    for (const middleware of this.middlewares) {
      const result = await middleware(request, env, ctx);
      if (result !== null) {
        return result;
      }
    }

    // Find matching route
    const url = new URL(request.url);
    
    for (const route of this.routes) {
      if (route.method !== request.method) continue;
      
      const match = route.pattern.exec({ pathname: url.pathname });
      if (match) {
        const params = match.pathname.groups;
        return await route.handler(request, env, ctx, params);
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}
