// Cloudflare Pages Function: Reverse Proxy for /api/* to Vercel Backend
// This keeps all static files, images & frontend on Cloudflare Pages (0 Vercel Fast Transfer usage)
// while forwarding only database queries to Vercel Serverless Express + Prisma.

interface Env {
  VERCEL_API_URL?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const backendBase = context.env.VERCEL_API_URL?.replace(/\/$/, '') || 'https://dungeons-api.vercel.app';
  const targetUrl = new URL(url.pathname + url.search, backendBase);

  // Forward request with all methods (GET, POST, PUT, DELETE, PATCH, OPTIONS)
  const proxyRequest = new Request(targetUrl.toString(), {
    method: context.request.method,
    headers: context.request.headers,
    body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
    redirect: 'follow',
  });

  try {
    const response = await fetch(proxyRequest);
    return response;
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
};

