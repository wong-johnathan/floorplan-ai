import type { BTOProject, FlatType, LayoutVariant, AnnotationData } from '../types/admin';

const BASE = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json.data;
}

// ─── BTO Projects ────────────────────────────────────────────────

export function listBTOProjects(): Promise<BTOProject[]> { return request('/api/bto'); }
export function listAllBTOProjects(): Promise<BTOProject[]> { return request('/api/bto/all'); }
export function getBTOProject(id: string): Promise<BTOProject> { return request(`/api/bto/${id}`); }

export function createBTOProject(data: { name: string; slug: string; town: string; location: string; launchYear: number; description?: string; classification?: string }): Promise<BTOProject> {
  return request('/api/bto', { method: 'POST', body: JSON.stringify(data) });
}
export function updateBTOProject(id: string, data: Record<string, unknown>): Promise<BTOProject> {
  return request(`/api/bto/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteBTOProject(id: string): Promise<void> {
  return request(`/api/bto/${id}`, { method: 'DELETE' });
}

// ─── Flat Types ──────────────────────────────────────────────────

export function listFlatTypes(btoProjectId: string): Promise<FlatType[]> {
  return request(`/api/bto/${btoProjectId}/flat-types`);
}
export function createFlatType(btoProjectId: string, data: { name: string; bedroomCount: number; typicalSizeMin?: number; typicalSizeMax?: number }): Promise<FlatType> {
  return request(`/api/bto/${btoProjectId}/flat-types`, { method: 'POST', body: JSON.stringify(data) });
}
export function updateFlatType(id: string, data: Record<string, unknown>): Promise<FlatType> {
  return request(`/api/flat-types/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteFlatType(id: string): Promise<void> {
  return request(`/api/flat-types/${id}`, { method: 'DELETE' });
}

// ─── Layout Variants ─────────────────────────────────────────────

export function listVariants(flatTypeId: string): Promise<LayoutVariant[]> {
  return request(`/api/flat-types/${flatTypeId}/variants`);
}
export function createVariant(flatTypeId: string, data: { name: string; totalArea?: number; isWhiteFlat?: boolean }): Promise<LayoutVariant> {
  return request(`/api/flat-types/${flatTypeId}/variants`, { method: 'POST', body: JSON.stringify(data) });
}
export function getVariant(id: string): Promise<LayoutVariant> {
  return request(`/api/variants/${id}`);
}
export function updateVariant(id: string, data: Record<string, unknown>): Promise<LayoutVariant> {
  return request(`/api/variants/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteVariant(id: string): Promise<void> {
  return request(`/api/variants/${id}`, { method: 'DELETE' });
}

// ─── Upload ──────────────────────────────────────────────────────

export async function uploadFloorPlan(file: File, variantId: string): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('variantId', variantId);
  const res = await fetch('/api/upload/floor-plan', { method: 'POST', credentials: 'include', body: formData });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || res.statusText);
  return json.data;
}

// ─── Wall Annotation ─────────────────────────────────────────────

export function saveAnnotation(variantId: string, data: AnnotationData): Promise<LayoutVariant> {
  return request(`/api/variants/${variantId}/annotation`, { method: 'PUT', body: JSON.stringify(data) });
}
export function publishVariant(variantId: string): Promise<LayoutVariant> {
  return request(`/api/variants/${variantId}/publish`, { method: 'POST' });
}
