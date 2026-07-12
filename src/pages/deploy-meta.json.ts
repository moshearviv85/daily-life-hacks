import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = () => {
  const commit =
    process.env.CF_PAGES_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    process.env.COMMIT_SHA ??
    'local';

  return new Response(JSON.stringify({ commit }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
