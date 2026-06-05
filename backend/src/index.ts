import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRouter from './auth/routes';
import btoRouter from './bto/routes';
import modelsRouter from './models/routes';
import uploadRouter from './upload/routes';
import wallsRouter from './walls/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files from local filesystem (dev fallback when R2 not configured)
app.use('/uploads', express.static('uploads'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'floorplan-ai-backend', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api', btoRouter);
app.use('/api', modelsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api', wallsRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
