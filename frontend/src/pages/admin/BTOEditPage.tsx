import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createBTOProject, updateBTOProject, getBTOProject } from '../../lib/api';

const HDB_TOWNS = [
  'Ang Mo Kio', 'Bedok', 'Bishan', 'Bukit Batok', 'Bukit Merah', 'Bukit Panjang',
  'Central Area', 'Choa Chu Kang', 'Clementi', 'Geylang', 'Hougang',
  'Jurong East', 'Jurong West', 'Kallang/Whampoa', 'Marine Parade', 'Pasir Ris',
  'Punggol', 'Queenstown', 'Sembawang', 'Sengkang', 'Serangoon', 'Tampines',
  'Toa Payoh', 'Woodlands', 'Yishun',
];

export function BTOEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const { data: existing } = useQuery({
    queryKey: ['bto', id],
    queryFn: () => getBTOProject(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    name: '', slug: '', town: '', location: '', launchYear: new Date().getFullYear(),
    description: '', classification: 'standard',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name, slug: existing.slug,
        town: existing.town, location: existing.location,
        launchYear: existing.launchYear,
        description: existing.description ?? '',
        classification: existing.classification ?? 'standard',
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => isEdit ? updateBTOProject(id!, form) : createBTOProject(form),
    onSuccess: (result) => navigate(`/admin/bto/${result.id}`),
    onError: (err: Error) => setError(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name || !form.slug || !form.town || !form.location || !form.launchYear) {
      setError('Name, slug, town, location, and launch year are required.');
      return;
    }
    saveMutation.mutate();
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
        {isEdit ? 'Edit BTO Project' : 'New BTO Project'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-700 dark:text-red-400">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm" placeholder="e.g. Verandah @ Kallang" />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Slug</label>
          <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm font-mono" placeholder="verandah-kallang-2024" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Town</label>
            <select value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm">
              <option value="">Select town...</option>
              {HDB_TOWNS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Classification</label>
            <select value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm">
              <option value="standard">Standard</option>
              <option value="plus">Plus</option>
              <option value="prime">Prime</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm" placeholder="e.g. Kallang" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Launch Year</label>
            <input type="number" value={form.launchYear} onChange={(e) => setForm({ ...form, launchYear: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm" rows={3} />
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saveMutation.isPending} className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-md text-sm font-medium disabled:opacity-50">
            {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-700 dark:text-zinc-300">Cancel</button>
        </div>
      </form>
    </div>
  );
}
