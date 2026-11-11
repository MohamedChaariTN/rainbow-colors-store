import app from './app';

const PORT = process.env.PORT || 3000;

// Local development entry point. Vercel uses api/[...path].ts, which imports
// the API-only Express application from app.ts and never calls listen().
app.listen(PORT, () => {
  console.log(`Rainbow Colors catalogue API running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
