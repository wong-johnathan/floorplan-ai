import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { createFlatType, createVariant, uploadFloorPlan } from '../../lib/api';

const FLAT_TYPES = ['2-Room Flexi', '3-Room', '4-Room', '5-Room', '3Gen'];
const BEDROOM_MAP: Record<string, number> = { '2-Room Flexi': 1, '3-Room': 2, '4-Room': 3, '5-Room': 3, '3Gen': 4 };

export function FlatModelEditPage() {
  const { btoId } = useParams<{ btoId: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [flatTypeName, setFlatTypeName] = useState('4-Room');
  const [variantName, setVariantName] = useState('Standard');
  const [isWhiteFlat, setIsWhiteFlat] = useState(false);
  const [totalArea, setTotalArea] = useState('');
  const [typicalSizeMin, setTypicalSizeMin] = useState('');
  const [typicalSizeMax, setTypicalSizeMax] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!btoId) throw new Error('No project');
      // 1. Create flat type
      const ft = await createFlatType(btoId, {
        name: flatTypeName,
        bedroomCount: BEDROOM_MAP[flatTypeName] ?? 2,
        typicalSizeMin: typicalSizeMin ? parseFloat(typicalSizeMin) : undefined,
        typicalSizeMax: typicalSizeMax ? parseFloat(typicalSizeMax) : undefined,
      });
      // 2. Create layout variant
      const v = await createVariant(ft.id, { name: variantName, totalArea: totalArea ? parseFloat(totalArea) : undefined, isWhiteFlat });
      // 3. Upload floor plan if selected
      if (file) await uploadFloorPlan(file, v.id);
      return v;
    },
    onSuccess: (v) => navigate(`/admin/variants/${v.id}/annotate`),
    onError: (err: Error) => setError(err.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f); }
  }

  function handleSubmit(e: React.FormEvent) { e.preventDefault(); setError(''); createMutation.mutate(); }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">Add Flat Type & Layout</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">{error}</div>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Flat Type</label>
            <select value={flatTypeName} onChange={(e) => setFlatTypeName(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm">
              {FLAT_TYPES.map((t) => <option key={t} value={t}>{t} ({BEDROOM_MAP[t]} BR)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Layout Variant Name</label>
            <input type="text" value={variantName} onChange={(e) => setVariantName(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm" placeholder="Standard, Type 1, White Flat..." />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Typical Size Min (sqm)</label>
            <input type="number" value={typicalSizeMin} onChange={(e) => setTypicalSizeMin(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm" placeholder="e.g. 89" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Typical Size Max (sqm)</label>
            <input type="number" value={typicalSizeMax} onChange={(e) => setTypicalSizeMax(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm" placeholder="e.g. 94" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Variant Area (sqm)</label>
            <input type="number" value={totalArea} onChange={(e) => setTotalArea(e.target.value)} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm" placeholder="e.g. 90" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" checked={isWhiteFlat} onChange={(e) => setIsWhiteFlat(e.target.checked)} className="rounded" />
          <label className="text-sm text-zinc-700 dark:text-zinc-300">White Flat (open-concept, no internal partitions)</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Floor Plan Image</label>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="w-full text-sm text-zinc-600 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300" />
          {preview && <img src={preview} alt="Preview" className="mt-2 max-h-48 rounded-md border border-zinc-200 dark:border-zinc-700" />}
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-md text-sm font-medium disabled:opacity-50">
            {createMutation.isPending ? 'Creating...' : 'Create & Annotate'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-700 dark:text-zinc-300">Cancel</button>
        </div>
      </form>
    </div>
  );
}
