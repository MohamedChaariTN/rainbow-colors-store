import app from '../backend/src/app';

// One catch-all Vercel function serves the complete /api surface. The Express
// application is intentionally API-only: static storefront and admin files are
// built into frontend/public by scripts/build-static.js.
export default app;
