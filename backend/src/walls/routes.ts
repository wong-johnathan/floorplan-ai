import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../auth/middleware';
import * as walls from './service';

const router = Router();

router.put('/variants/:id/annotation', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { walls: wallData, rooms: roomData, furniture: furnitureData } = req.body as any;
    if (!wallData || !roomData) {
      res.status(400).json({ error: 'missing_walls_or_rooms' });
      return;
    }
    const result = await walls.saveAnnotation(req.params.id as string, { walls: wallData, rooms: roomData, furniture: furnitureData });
    res.json({ data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'save_failed' });
  }
});

router.post('/variants/:id/publish', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const v = await walls.publish(req.params.id as string);
    res.json({ data: v });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'publish_failed' });
  }
});

export default router;
