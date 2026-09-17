import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middleware/error';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
}));

app.use(express.json({ limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api', routes);

// Serve frontend
app.use(express.static(path.join(__dirname, '../../store')));
app.use('/admin', express.static(path.join(__dirname, '../../admin')));

app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin/index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../store/index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🎨 Rainbow Colors Server running on http://localhost:${PORT}`);
  console.log(`🛒 Store: http://localhost:${PORT}`);
  console.log(`⚙️  Admin: http://localhost:${PORT}/admin`);
});