import app from '../backend/src/app';

// Vercel rewrites every /api/* request to this single function with the
// original sub-path carried in __rc_path. Rebuild the URL expected by the
// Express router before handing the request to the API application.
export default function handler(req: any, res: any) {
  const rawUrl = String(req.url || '/');
  const parsed = new URL(rawUrl, 'http://localhost');
  const rewrittenPath = parsed.searchParams.get('__rc_path');

  if (rewrittenPath !== null) {
    parsed.searchParams.delete('__rc_path');
    const query = parsed.searchParams.toString();
    req.url = `/api/${rewrittenPath.replace(/^\/+/, '')}${query ? `?${query}` : ''}`;
  } else if (!rawUrl.startsWith('/api')) {
    req.url = `/api${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
  }

  return app(req, res);
}
