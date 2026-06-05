import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../auth/middleware';
import * as models from './service';

const router = Router();

// ─── Flat Types ──────────────────────────────────────────────────

router.get('/bto/:btoId/flat-types', async (req: Request, res: Response) => {
  try {
    const list = await models.listFlatTypes(req.params.btoId as string);
    res.json({ data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.post('/bto/:btoId/flat-types', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { name, bedroomCount, typicalSizeMin, typicalSizeMax } = req.body as any;
    if (!name || !bedroomCount) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }
    const ft = await models.createFlatType(req.params.btoId as string, { name, bedroomCount, typicalSizeMin, typicalSizeMax });
    res.status(201).json({ data: ft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.put('/flat-types/:id', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const ft = await models.updateFlatType(req.params.id as string, req.body as any);
    res.json({ data: ft });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.delete('/flat-types/:id', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    await models.removeFlatType(req.params.id as string);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

// ─── Layout Variants ─────────────────────────────────────────────

router.get('/flat-types/:flatTypeId/variants', async (req: Request, res: Response) => {
  try {
    const list = await models.listVariants(req.params.flatTypeId as string);
    res.json({ data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.post('/flat-types/:flatTypeId/variants', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { name, totalArea, isWhiteFlat } = req.body as any;
    if (!name) { res.status(400).json({ error: 'missing_name' }); return; }
    const v = await models.createVariant(req.params.flatTypeId as string, { name, totalArea, isWhiteFlat });
    res.status(201).json({ data: v });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.get('/variants/:id', async (req: Request, res: Response) => {
  try {
    const v = await models.getVariant(req.params.id as string);
    if (!v) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ data: v });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.put('/variants/:id', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const v = await models.updateVariant(req.params.id as string, req.body as any);
    res.json({ data: v });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.delete('/variants/:id', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    await models.removeVariant(req.params.id as string);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

export default router;
