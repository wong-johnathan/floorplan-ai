import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getBTOProject, listFlatTypes, createFlatType, updateFlatType, deleteFlatType,
  createVariant, updateVariant, deleteVariant, deleteBTOProject, uploadFloorPlan,
} from '../../lib/api';

const BEDROOM_MAP: Record<string, number> = { '2-Room Flexi': 1, '3-Room': 2, '4-Room': 3, '5-Room': 3, '3Gen': 4 };

function EditableSizeRange({ id, sizeMin, sizeMax, bedroomCount, onSave, updateFn }: {
  id: string; sizeMin?: number; sizeMax?: number; bedroomCount: number;
  onSave: () => void; updateFn: (id: string, data: Record<string, unknown>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [min, setMin] = useState(sizeMin?.toString() ?? '');
  const [max, setMax] = useState(sizeMax?.toString() ?? '');

  if (editing) {
    return (
      <span className="text-xs font-normal text-zinc-500 inline-flex items-center gap-1">
        ({bedroomCount} BR,
        <input type="number" value={min} onChange={(e) => setMin(e.target.value)}
          className="w-12 px-1 py-0 border border-blue-300 rounded text-xs" placeholder="min" autoFocus
          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false); }} />–
        <input type="number" value={max} onChange={(e) => setMax(e.target.value)}
          className="w-12 px-1 py-0 border border-blue-300 rounded text-xs" placeholder="max"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateFn(id, { typicalSizeMin: min ? parseFloat(min) : null, typicalSizeMax: max ? parseFloat(max) : null });
              setEditing(false); onSave();
            }
            if (e.key === 'Escape') setEditing(false);
          }} />
        sqm)
      </span>
    );
  }

  const label = (sizeMin && sizeMax) ? `${sizeMin}–${sizeMax} sqm` : 'click to set sqm';
  return (
    <span className="text-xs font-normal text-zinc-500 cursor-pointer hover:text-blue-600" onClick={() => setEditing(true)} title="Click to set size range">
      ({bedroomCount} BR, {label})
    </span>
  );
}

function EditableVariantName({ id, name, onSave }: { id: string; name: string; onSave: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const mutation = useMutation({
    mutationFn: (newName: string) => updateVariant(id, { name: newName }),
    onSuccess: () => { setEditing(false); onSave(); },
  });
  if (editing) {
    return (
      <input
        type="text" value={value} onChange={(e) => setValue(e.target.value)}
        onBlur={() => { if (value.trim() && value !== name) mutation.mutate(value.trim()); else setEditing(false); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { if (value.trim() && value !== name) mutation.mutate(value.trim()); else setEditing(false); } if (e.key === 'Escape') { setValue(name); setEditing(false); } }}
        className="px-1 py-0.5 border border-blue-300 rounded text-sm font-medium w-32"
        autoFocus
      />
    );
  }
  return (
    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-50 cursor-pointer hover:text-blue-600" onClick={() => setEditing(true)} title="Click to rename">
      {name} ✎
    </span>
  );
}

export function BTODetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['flat-types', id] });

  const { data: project, isLoading } = useQuery({
    queryKey: ['bto', id], queryFn: () => getBTOProject(id!), enabled: Boolean(id),
  });
  const { data: flatTypes } = useQuery({
    queryKey: ['flat-types', id], queryFn: () => listFlatTypes(id!), enabled: Boolean(id),
  });

  const deleteProjectMut = useMutation({ mutationFn: () => deleteBTOProject(id!), onSuccess: () => navigate('/admin/bto') });
  const createFlatTypeMut = useMutation({
    mutationFn: (name: string) => createFlatType(id!, { name, bedroomCount: BEDROOM_MAP[name] ?? 2 }),
    onSuccess: invalidate,
  });
  const deleteFlatTypeMut = useMutation({ mutationFn: (ftId: string) => deleteFlatType(ftId), onSuccess: invalidate });
  const updateFlatTypeMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => updateFlatType(id, data),
    onSuccess: invalidate,
  });
  const createVariantMut = useMutation({
    mutationFn: ({ ftId, name }: { ftId: string; name: string }) => createVariant(ftId, { name }),
    onSuccess: invalidate,
  });
  const deleteVariantMut = useMutation({ mutationFn: (vId: string) => deleteVariant(vId), onSuccess: invalidate });

  const handleUpload = async (variantId: string, file: File) => {
    await uploadFloorPlan(file, variantId);
    invalidate();
  };

  if (isLoading) return <p className="text-sm text-zinc-500">Loading...</p>;
  if (!project) return <p className="text-sm text-zinc-500">Project not found.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin/bto" className="text-sm text-zinc-500 hover:underline mb-1 block">← Back to BTO Projects</Link>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{project.name}</h1>
          <p className="text-sm text-zinc-500">{project.town} · {project.location} · {project.launchYear} · {project.classification}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/bto/${project.id}/edit`} className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-700 rounded-md text-sm text-zinc-700 dark:text-zinc-300">Edit</Link>
          <button onClick={() => { if (confirm('Delete this project?')) deleteProjectMut.mutate(); }} className="px-3 py-1.5 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-600">Delete</button>
        </div>
      </div>

      <div className="space-y-6">
        {flatTypes?.map((ft) => (
          <div key={ft.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {ft.name}{' '}
                  <EditableSizeRange
                    id={ft.id}
                    sizeMin={ft.typicalSizeMin}
                    sizeMax={ft.typicalSizeMax}
                    bedroomCount={ft.bedroomCount}
                    onSave={invalidate}
                    updateFn={(id, data) => updateFlatTypeMut.mutate({ id, data })}
                  />
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => createVariantMut.mutate({ ftId: ft.id, name: `Variant ${(ft.variants?.length ?? 0) + 1}` })} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md">+ Variant</button>
                <button onClick={() => { if (confirm('Delete this flat type?')) deleteFlatTypeMut.mutate(ft.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
            </div>
            {ft._count?.variants === 0 && !ft.variants?.length ? (
              <p className="text-xs text-zinc-500">No layout variants yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {(ft.variants ?? []).map((v) => (
                  <div key={v.id} className="flex gap-3 p-3 border border-zinc-100 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-800/50">
                    {/* Floor plan thumbnail / upload */}
                    <div className="w-24 h-24 flex-shrink-0 bg-zinc-200 dark:bg-zinc-700 rounded-md overflow-hidden flex items-center justify-center">
                      {v.floorPlanUrl ? (
                        <img src={v.floorPlanUrl} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <label className="cursor-pointer text-center p-2">
                          <span className="text-xs text-zinc-500">No floor plan</span>
                          <span className="block text-xs text-blue-600 mt-1">Upload</span>
                          <input
                            type="file" accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUpload(v.id, f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {/* Variant details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <EditableVariantName id={v.id} name={v.name} onSave={invalidate} />
                        <button onClick={() => { if (confirm('Delete?')) deleteVariantMut.mutate(v.id); }} className="text-xs text-red-500 hover:underline flex-shrink-0">×</button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {v.totalArea ? `${v.totalArea} sqm` : ''}
                        {v.isWhiteFlat ? ' · White Flat' : ''}
                        {v._count ? ` · ${v._count.walls} walls · ${v._count.roomDefs} rooms` : ' · 0 walls · 0 rooms'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${v.published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {v.published ? 'Published' : 'Draft'}
                        </span>
                        <Link to={`/admin/variants/${v.id}/annotate`} className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium">
                          Annotate Walls
                        </Link>
                        {v.floorPlanUrl && (
                          <label className="px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded text-xs cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
                            Change Image
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(v.id, f); }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        {['2-Room Flexi', '3-Room', '4-Room', '5-Room', '3Gen'].map((name) => (
          <button key={name} onClick={() => createFlatTypeMut.mutate(name)} className="px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            + {name} ({BEDROOM_MAP[name]} BR)
          </button>
        ))}
      </div>
    </div>
  );
}
