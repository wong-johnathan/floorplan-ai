export interface FurnitureDef {
  type: string;
  label: string;
  category: string;
  defaultW: number;
  defaultH: number;
  color: string;
}

export const FURNITURE_CATEGORIES = [
  'Seating', 'Tables', 'Beds', 'Storage', 'Appliances', 'Sanitary',
] as const;
export type FurnitureCategory = typeof FURNITURE_CATEGORIES[number];

export const FURNITURE_CATALOG: FurnitureDef[] = [
  // Seating
  { type: 'sofa-3s', label: 'Sofa (3-Seater)', category: 'Seating', defaultW: 2.1, defaultH: 0.85, color: '#C4A882' },
  { type: 'sofa-2s', label: 'Sofa (2-Seater)', category: 'Seating', defaultW: 1.6, defaultH: 0.85, color: '#C4A882' },
  { type: 'armchair', label: 'Armchair', category: 'Seating', defaultW: 0.9, defaultH: 0.85, color: '#C9A87C' },

  // Tables
  { type: 'table-round', label: 'Round Table', category: 'Tables', defaultW: 1.2, defaultH: 1.2, color: '#D4C4A8' },
  { type: 'table-square', label: 'Square Table', category: 'Tables', defaultW: 1.0, defaultH: 1.0, color: '#D4C4A8' },

  // Beds
  { type: 'bed-single', label: 'Single Bed', category: 'Beds', defaultW: 2.0, defaultH: 1.0, color: '#CCBBA5' },
  { type: 'bed-queen', label: 'Double Bed', category: 'Beds', defaultW: 2.0, defaultH: 1.6, color: '#D5C4B0' },

  // Storage
  { type: 'wardrobe', label: 'Wardrobe', category: 'Storage', defaultW: 1.2, defaultH: 0.6, color: '#B8A890' },

  // Appliances
  { type: 'fridge', label: 'Fridge', category: 'Appliances', defaultW: 0.8, defaultH: 0.7, color: '#E0E0E0' },
  { type: 'stove', label: 'Stove', category: 'Appliances', defaultW: 0.6, defaultH: 0.6, color: '#3A3A3A' },
  { type: 'washer', label: 'Washer', category: 'Appliances', defaultW: 0.7, defaultH: 0.7, color: '#E4E4E4' },
  { type: 'counter', label: 'Counter', category: 'Appliances', defaultW: 1.8, defaultH: 0.6, color: '#E8E0D0' },
  { type: 'tv', label: 'TV', category: 'Appliances', defaultW: 1.2, defaultH: 0.08, color: '#2A2A2A' },

  // Sanitary
  { type: 'toilet', label: 'Toilet Bowl', category: 'Sanitary', defaultW: 0.45, defaultH: 0.7, color: '#F8F8F8' },
  { type: 'sink', label: 'Sink', category: 'Sanitary', defaultW: 0.55, defaultH: 0.45, color: '#E8E0D0' },
  { type: 'bathtub', label: 'Bathtub', category: 'Sanitary', defaultW: 1.7, defaultH: 0.75, color: '#FAFAFA' },
  { type: 'shower', label: 'Shower', category: 'Sanitary', defaultW: 1.0, defaultH: 1.0, color: '#EEF4F8' },
];
