import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAdmin } from '../auth/middleware';
import { storeFile } from '../storage/r2';
import * as models from '../models/service';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only PNG, JPEG, and WebP are allowed.'));
  },
});

router.post('/floor-plan', requireAdmin as any, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'no_file_uploaded' }); return; }
    const { variantId } = req.body as any;
    if (!variantId) { res.status(400).json({ error: 'missing_variant_id' }); return; }

    const ext = path.extname(req.file.originalname) || '.png';
    const key = `floor-plans/${variantId}/${Date.now()}${ext}`;
    const url = await storeFile(key, req.file.buffer, req.file.mimetype);

    await models.updateVariant(variantId, { floorPlanUrl: url });

    res.json({ data: { url } });
  } catch (err: any) {
    console.error(err);
    if (err.message?.includes('Invalid file type')) {
      res.status(400).json({ error: 'invalid_file_type' });
      return;
    }
    res.status(500).json({ error: 'upload_failed' });
  }
});

export default router;
