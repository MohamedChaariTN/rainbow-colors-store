import multer from 'multer';

// Vercel's filesystem is read-only except for /tmp, and files written there
// do not survive a cold start. Keep uploads in memory and persist the image
// itself as a data URL in PostgreSQL so product images remain available.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const fileName = file.originalname.toLowerCase();
    cb(null, allowed.some((extension) => fileName.endsWith(extension)));
  }
});
