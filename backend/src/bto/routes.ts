import { Router, type Request, type Response } from 'express';
import { requireAdmin } from '../auth/middleware';
import * as bto from './service';

const router = Router();

router.get('/bto', async (_req: Request, res: Response) => {
  try {
    const projects = await bto.listPublished();
    res.json({ data: projects });
  } catch (err) {
    console.error('GET /api/bto:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.get('/bto/all', requireAdmin as any, async (_req: Request, res: Response) => {
  try {
    const projects = await bto.listAll();
    res.json({ data: projects });
  } catch (err) {
    console.error('GET /api/bto/all:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.get('/bto/:id', async (req: Request, res: Response) => {
  try {
    const project = await bto.getById(req.params.id as string);
    if (!project) { res.status(404).json({ error: 'not_found' }); return; }
    res.json({ data: project });
  } catch (err) {
    console.error('GET /api/bto/:id:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.post('/bto', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, town, location, launchYear, classification, imageUrl } = req.body as any;
    if (!name || !slug || !town || !location || !launchYear) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }
    const project = await bto.create({ name, slug, description, town, location, launchYear, classification, imageUrl });
    res.status(201).json({ data: project });
  } catch (err: any) {
    console.error('POST /api/bto:', err);
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'duplicate_slug', message: 'A project with this slug already exists.' });
      return;
    }
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.put('/bto/:id', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    const project = await bto.update(req.params.id as string, req.body as any);
    res.json({ data: project });
  } catch (err) {
    console.error('PUT /api/bto/:id:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

router.delete('/bto/:id', requireAdmin as any, async (req: Request, res: Response) => {
  try {
    await bto.remove(req.params.id as string);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/bto/:id:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

export default router;
