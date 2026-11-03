interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  VERCEL_API_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Proxy /api/* requests to Vercel Serverless Express API
    if (url.pathname.startsWith('/api/')) {
      const backendBase = env.VERCEL_API_URL?.replace(/\/$/, '') || 'https://dungeons-api.vercel.app';
      const targetUrl = new URL(url.pathname + url.search, backendBase);

      const headers = new Headers(request.headers);
      headers.set('host', new URL(backendBase).host);

      const proxyRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      try {
        return await fetch(proxyRequest);
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Proxy Error: Could not reach backend server',
            details: err?.message || String(err),
          }),
          {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Serve static assets with single-page-application routing via Cloudflare Assets
    return env.ASSETS.fetch(request);
  },
};

