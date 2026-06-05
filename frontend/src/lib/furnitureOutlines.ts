/**
 * Furniture outline renderers — each function draws a recognizable top-down
 * furniture shape into a Canvas 2D context, scaled to the item's width/height.
 * All coordinates are normalised 0–1, then mapped to actual pixels.
 */

function rp(ctx: CanvasRenderingContext2D, x: number, y: number, rw: number, rh: number, cr: number, w: number, h: number) {
  const rx = x * w, ry = y * h, pw = rw * w, ph = rh * h, r = cr * Math.min(w, h);
  ctx.beginPath();
  if (r < 1) { ctx.rect(rx, ry, pw, ph); return; }
  ctx.moveTo(rx + r, ry); ctx.lineTo(rx + pw - r, ry);
  ctx.arcTo(rx + pw, ry, rx + pw, ry + r, r);
  ctx.lineTo(rx + pw, ry + ph - r);
  ctx.arcTo(rx + pw, ry + ph, rx + pw - r, ry + ph, r);
  ctx.lineTo(rx + r, ry + ph);
  ctx.arcTo(rx, ry + ph, rx, ry + ph - r, r);
  ctx.lineTo(rx, ry + r);
  ctx.arcTo(rx, ry, rx + r, ry, r);
}

export const FurnitureOutlines: Record<string, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {

  'toilet'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#666'; ctx.fillStyle = '#F8F8F8';
    rp(ctx, 0.02, 0.08, 0.28, 0.84, 0.03, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#F8F8F8';
    ctx.ellipse(w * 0.62, h * 0.5, w * 0.36, h * 0.34, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#F0F0F0';
    ctx.ellipse(w * 0.6, h * 0.55, w * 0.24, h * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#CCC'; ctx.lineWidth = 0.8;
    ctx.moveTo(w * 0.35, h * 0.55); ctx.lineTo(w * 0.44, h * 0.55); ctx.stroke();
  },

  'bathtub'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#777'; ctx.fillStyle = '#FAFAFA';
    rp(ctx, 0.02, 0.02, 0.96, 0.96, 0.08, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F0F0F0'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(w * 0.82, h * 0.5, w * 0.14, h * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#999'; ctx.arc(w * 0.82, h * 0.5, w * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.strokeStyle = '#DDD'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.06, h * 0.5); ctx.lineTo(w * 0.63, h * 0.5); ctx.stroke();
  },

  'shower'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#777'; ctx.fillStyle = '#EEF4F8';
    rp(ctx, 0.02, 0.02, 0.96, 0.96, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#D0D8E0'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.12, h * 0.12); ctx.lineTo(w * 0.88, h * 0.88);
    ctx.moveTo(w * 0.88, h * 0.12); ctx.lineTo(w * 0.12, h * 0.88); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#999'; ctx.arc(w * 0.5, h * 0.5, w * 0.05, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.strokeStyle = '#AAA'; ctx.lineWidth = 1;
    ctx.arc(w * 0.08, h * 0.08, w * 0.1, 0, Math.PI / 2); ctx.stroke();
  },

  'sink'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#888'; ctx.fillStyle = '#E8E0D0';
    rp(ctx, 0, 0, 1, 1, 0.03, w, h); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.8; ctx.strokeStyle = '#BBB'; ctx.fillStyle = '#F8F8F8';
    rp(ctx, 0.08, 0.1, 0.37, 0.8, 0.05, w, h); ctx.fill(); ctx.stroke();
    rp(ctx, 0.52, 0.1, 0.4, 0.8, 0.05, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#CCC';
    ctx.arc(w * 0.26, h * 0.5, w * 0.025, 0, Math.PI * 2); ctx.fill();
    ctx.arc(w * 0.72, h * 0.5, w * 0.025, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = '#C0C0C0';
    ctx.arc(w * 0.5, h * 0.06, w * 0.04, 0, Math.PI * 2); ctx.fill();
  },

  'stove'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#444'; ctx.fillStyle = '#3A3A3A';
    rp(ctx, 0.02, 0.02, 0.96, 0.96, 0.03, w, h); ctx.fill(); ctx.stroke();
    const burners: [number, number][] = [[0.22, 0.22], [0.78, 0.22], [0.22, 0.78], [0.78, 0.78]];
    for (const [bx, by] of burners) {
      ctx.beginPath(); ctx.fillStyle = '#222'; ctx.arc(w * bx, h * by, w * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 0.5; ctx.strokeStyle = '#555'; ctx.beginPath();
      ctx.moveTo(w * (bx - 0.04), h * by); ctx.lineTo(w * (bx + 0.04), h * by);
      ctx.moveTo(w * bx, h * (by - 0.04)); ctx.lineTo(w * bx, h * (by + 0.04)); ctx.stroke();
    }
    for (const [kx, ky] of [[0.12, 0.92], [0.35, 0.92], [0.65, 0.92], [0.88, 0.92]]) {
      ctx.beginPath(); ctx.fillStyle = '#666'; ctx.arc(w * kx, h * ky, w * 0.025, 0, Math.PI * 2); ctx.fill();
    }
  },

  'fridge'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#999'; ctx.fillStyle = '#E8E8E8';
    rp(ctx, 0.02, 0, 0.96, 1, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#CCC'; ctx.lineWidth = 0.8;
    ctx.moveTo(w * 0.38, 0); ctx.lineTo(w * 0.38, h); ctx.stroke();
    ctx.beginPath(); ctx.lineWidth = 0.8; ctx.strokeStyle = '#BBB';
    ctx.moveTo(w * 0.08, h * 0.55); ctx.lineTo(w * 0.32, h * 0.55); ctx.stroke();
    ctx.moveTo(w * 0.44, h * 0.45); ctx.lineTo(w * 0.68, h * 0.45); ctx.stroke();
  },

  'washer'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#999'; ctx.fillStyle = '#E4E4E4';
    rp(ctx, 0.02, 0.02, 0.96, 0.96, 0.03, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#BBB'; ctx.lineWidth = 1; ctx.fillStyle = '#D8D8D8';
    ctx.arc(w * 0.5, h * 0.42, w * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#EAEAEA';
    ctx.arc(w * 0.5, h * 0.42, w * 0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#CCC'; rp(ctx, 0.2, 0.82, 0.6, 0.12, 0.01, w, h); ctx.fill();
    ctx.strokeStyle = '#BBB'; ctx.lineWidth = 0.8; ctx.stroke();
  },

  'wardrobe'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#8B7D6B'; ctx.fillStyle = '#D4C4B0';
    rp(ctx, 0.02, 0, 0.96, 1, 0.01, w, h); ctx.fill(); ctx.stroke();
    // Left door — slightly open (angled line)
    ctx.beginPath(); ctx.strokeStyle = '#B0A090'; ctx.lineWidth = 0.8;
    ctx.moveTo(w * 0.48, 0); ctx.lineTo(w * 0.42, h); ctx.stroke();
    // Right door — closed reference line
    ctx.beginPath(); ctx.strokeStyle = '#D0C0B0'; ctx.lineWidth = 0.4;
    ctx.moveTo(w * 0.52, 0); ctx.lineTo(w * 0.52, h); ctx.stroke();
    // Handles
    ctx.beginPath(); ctx.fillStyle = '#888';
    ctx.arc(w * 0.25, h * 0.5, w * 0.025, 0, Math.PI * 2); ctx.fill();
    ctx.arc(w * 0.78, h * 0.5, w * 0.025, 0, Math.PI * 2); ctx.fill();
    // Hanging rod
    ctx.beginPath(); ctx.strokeStyle = '#C0B0A0'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.08, h * 0.18); ctx.lineTo(w * 0.44, h * 0.18);
    ctx.moveTo(w * 0.56, h * 0.18); ctx.lineTo(w * 0.92, h * 0.18); ctx.stroke();
  },

  'cabinet'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#8B7D6B'; ctx.fillStyle = '#D4C4B0';
    rp(ctx, 0.02, 0.02, 0.96, 0.96, 0.01, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#B0A090'; ctx.lineWidth = 0.5;
    ctx.moveTo(0, h * 0.45); ctx.lineTo(w, h * 0.45);
    ctx.moveTo(0, h * 0.55); ctx.lineTo(w, h * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#888';
    ctx.arc(w * 0.5, h * 0.25, w * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.arc(w * 0.5, h * 0.75, w * 0.03, 0, Math.PI * 2); ctx.fill();
  },

  'bookshelf'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#8B7D6B'; ctx.fillStyle = '#D4C4B0';
    rp(ctx, 0.02, 0.02, 0.96, 0.96, 0.01, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#B0A090'; ctx.lineWidth = 0.5;
    for (let ry = 0.22; ry < 1; ry += 0.22) { ctx.moveTo(0, h * ry); ctx.lineTo(w, h * ry); }
    ctx.stroke();
  },

  'bed-queen'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#999'; ctx.fillStyle = '#F0EAE0';
    rp(ctx, 0.02, 0.22, 0.96, 0.78, 0.04, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#C8B898'; ctx.strokeStyle = '#A09078';
    rp(ctx, 0, 0, 1, 0.26, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FAFAFA'; ctx.lineWidth = 0.8; ctx.strokeStyle = '#DDD';
    rp(ctx, 0.08, 0.03, 0.36, 0.18, 0.02, w, h); ctx.fill(); ctx.stroke();
    rp(ctx, 0.56, 0.03, 0.36, 0.18, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.08, h * 0.62); ctx.lineTo(w * 0.92, h * 0.62); ctx.stroke();
  },

  'bed-single'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#999'; ctx.fillStyle = '#F0EAE0';
    rp(ctx, 0.02, 0.25, 0.96, 0.75, 0.04, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#C8B898'; ctx.strokeStyle = '#A09078';
    rp(ctx, 0, 0, 1, 0.28, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FAFAFA'; ctx.lineWidth = 0.8; ctx.strokeStyle = '#DDD';
    rp(ctx, 0.15, 0.03, 0.7, 0.2, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.08, h * 0.65); ctx.lineTo(w * 0.92, h * 0.65); ctx.stroke();
  },

  'sofa-2s'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#B8956A'; ctx.fillStyle = '#D4C4A8';
    rp(ctx, 0, 0.12, 1, 0.76, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#C8B090';
    rp(ctx, 0.02, 0.04, 0.96, 0.22, 0.01, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#A08060'; ctx.lineWidth = 1; ctx.strokeStyle = '#8B6D50';
    rp(ctx, 0, 0.08, 0.08, 0.84, 0.03, w, h); ctx.fill(); ctx.stroke();
    rp(ctx, 0.92, 0.08, 0.08, 0.84, 0.03, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.48, h * 0.25); ctx.lineTo(w * 0.48, h * 0.82); ctx.stroke();
  },

  'sofa-3s'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#B8956A';
    rp(ctx, 0, 0.12, 1, 0.76, 0.02, w, h); ctx.stroke();
    rp(ctx, 0.02, 0.04, 0.96, 0.22, 0.01, w, h); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#8B6D50';
    rp(ctx, 0, 0.08, 0.06, 0.84, 0.03, w, h); ctx.stroke();
    rp(ctx, 0.94, 0.08, 0.06, 0.84, 0.03, w, h); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.32, h * 0.25); ctx.lineTo(w * 0.32, h * 0.82);
    ctx.moveTo(w * 0.65, h * 0.25); ctx.lineTo(w * 0.65, h * 0.82); ctx.stroke();
  },

  'sofa-l'(ctx, w, h) {
    const sc = 0.38;
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#B8956A'; ctx.fillStyle = '#D4C4A8';
    rp(ctx, 0, 0.12, 1 - sc, 0.76, 0.02, w, h); ctx.fill(); ctx.stroke();
    rp(ctx, 1 - sc, 0.12, sc, 0.88, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#C8B090';
    rp(ctx, 0.02, 0.04, 0.96 - sc, 0.22, 0.01, w, h); ctx.fill(); ctx.stroke();
    rp(ctx, 1 - sc + 0.02, 0.04, sc - 0.02, 0.22, 0.01, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#A08060'; ctx.lineWidth = 1; ctx.strokeStyle = '#8B6D50';
    rp(ctx, 0, 0.08, 0.06, 0.84, 0.03, w, h); ctx.fill(); ctx.stroke();
  },

  'armchair'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#B8956A'; ctx.fillStyle = '#D4C4A8';
    rp(ctx, 0.06, 0.15, 0.88, 0.7, 0.03, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#C8B090';
    rp(ctx, 0.06, 0.06, 0.88, 0.22, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#A08060'; ctx.lineWidth = 1; ctx.strokeStyle = '#8B6D50';
    rp(ctx, 0, 0.1, 0.1, 0.8, 0.04, w, h); ctx.fill(); ctx.stroke();
    rp(ctx, 0.9, 0.1, 0.1, 0.8, 0.04, w, h); ctx.fill(); ctx.stroke();
  },

  'dining-chair'(ctx, w, h) {
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#8B7355';
    // Seat (main body)
    rp(ctx, 0.05, 0.22, 0.9, 0.73, 0.08, w, h); ctx.stroke();
    // Back rest (thin strip at top)
    rp(ctx, 0.05, 0.02, 0.9, 0.16, 0.06, w, h); ctx.stroke();
  },

  'stool'(ctx, w, h) {
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#999'; ctx.fillStyle = '#E0D5C0';
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  },

  'dining-table'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#A09080'; ctx.fillStyle = '#E8DCC8';
    rp(ctx, 0.02, 0.02, 0.96, 0.96, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.1, h * 0.5); ctx.lineTo(w * 0.9, h * 0.5); ctx.stroke();
  },

  'coffee-table'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#A09080'; ctx.fillStyle = '#E8DCC8';
    rp(ctx, 0.04, 0.04, 0.92, 0.92, 0.04, w, h); ctx.fill(); ctx.stroke();
  },

  'side-table'(ctx, w, h) {
    ctx.lineWidth = 1.3; ctx.strokeStyle = '#A09080'; ctx.fillStyle = '#E8DCC8';
    const m = 0.12;
    rp(ctx, m, m, 1 - m * 2, 1 - m * 2, 0.03, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = '#B0A090'; ctx.lineWidth = 0.6;
    ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.5, h * m);
    ctx.moveTo(w * 0.5, h * (1 - m)); ctx.lineTo(w * 0.5, h); ctx.stroke();
  },

  'plant'(ctx, w, h) {
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#6B8E23'; ctx.fillStyle = '#AED581';
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.42, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.fillStyle = '#8BC34A';
    ctx.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  },

  'rug'(ctx, w, h) {
    ctx.strokeStyle = '#D4A76A'; ctx.lineWidth = 1.5; ctx.fillStyle = '#F5E6D0';
    rp(ctx, 0.02, 0.02, 0.96, 0.96, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 0.6; ctx.strokeStyle = '#E0C8A0';
    rp(ctx, 0.08, 0.08, 0.84, 0.84, 0.01, w, h); ctx.stroke();
  },

  'table-round'(ctx, w, h) {
    const r = Math.min(w, h) * 0.46;
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#A09080'; ctx.fillStyle = '#E8DCC8';
    ctx.beginPath(); ctx.arc(w * 0.5, h * 0.5, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Pedestal hint
    ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 0.5;
    ctx.arc(w * 0.5, h * 0.5, r * 0.2, 0, Math.PI * 2); ctx.stroke();
  },

  'table-square'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#A09080'; ctx.fillStyle = '#E8DCC8';
    rp(ctx, 0.04, 0.04, 0.92, 0.92, 0.02, w, h); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.15, h * 0.5); ctx.lineTo(w * 0.85, h * 0.5); ctx.stroke();
  },

  'counter'(ctx, w, h) {
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#AAA'; ctx.fillStyle = '#E8E0D0';
    rp(ctx, 0, 0, 1, 1, 0.02, w, h); ctx.fill(); ctx.stroke();
    // Counter texture line
    ctx.beginPath(); ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.1, h * 0.45); ctx.lineTo(w * 0.9, h * 0.45);
    ctx.moveTo(w * 0.1, h * 0.55); ctx.lineTo(w * 0.9, h * 0.55); ctx.stroke();
    // Sink integration hint
    ctx.beginPath(); ctx.fillStyle = 'rgba(180,180,180,0.3)';
    rp(ctx, 0.15, 0.15, 0.3, 0.35, 0.04, w, h); ctx.fill();
    ctx.strokeStyle = '#CCC'; ctx.lineWidth = 0.5; ctx.stroke();
  },

  'tv'(ctx, w, h) {
    // Very thin rectangle — TV in plan view is just a line on the wall
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#333'; ctx.fillStyle = '#2A2A2A';
    rp(ctx, 0, 0.1, 1, 0.8, 0.01, w, h); ctx.fill(); ctx.stroke();
    // Stand/back indication
    ctx.beginPath(); ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5;
    ctx.moveTo(w * 0.3, h * 0.5); ctx.lineTo(w * 0.1, h * 0.9);
    ctx.moveTo(w * 0.7, h * 0.5); ctx.lineTo(w * 0.9, h * 0.9); ctx.stroke();
  },
};
