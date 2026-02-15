
import { Product } from './types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Elowen Lounge Chair',
    category: 'Seating',
    price: 899,
    dimensions: { width: 85, height: 92, depth: 80, unit: 'cm' },
    image: 'https://images.unsplash.com/photo-1598198414976-ddb788ec80c1?auto=format&fit=crop&q=90&w=800',
    model3d: 'https://modelviewer.dev/shared-assets/models/Chair.glb',
    description: 'A masterpiece of Scandinavian design. The Elowen combines sustainable oak with premium velvet upholstery for a timeless look.',
    style: 'Mid-Century Modern',
    material: ['Solid Oak', 'Velvet'],
    colors: ['Emerald', 'Midnight', 'Sand'],
    vendorId: 'v1',
    vendorName: 'Nordic Living',
    reviews: [],
    hotspots: [
      { position: "0.2m 0.5m 0.2m", normal: "0m 0m 1m", text: "Hand-stitched velvet upholstery" },
      { position: "0m 0.1m 0m", normal: "0m -1m 0m", text: "Solid FSC-certified Oak legs" }
    ]
  },
  {
    id: 'p2',
    name: 'Linear Modular Sofa',
    category: 'Sofas',
    price: 2450,
    dimensions: { width: 240, height: 75, depth: 100, unit: 'cm' },
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=90&w=800',
    model3d: 'https://modelviewer.dev/shared-assets/models/CORSICAN_SOFA.glb',
    description: 'Architectural precision meets comfort. This modular piece can be configured to fit any spatial requirement while maintaining a low-profile silhouette.',
    style: 'Minimalist',
    material: ['Aluminium Frame', 'High-Density Foam'],
    colors: ['Cloud Grey', 'Charcoal'],
    vendorId: 'v1',
    vendorName: 'Modern Forms',
    reviews: [],
    hotspots: [
      { position: "1m 0.4m 0.2m", normal: "0m 1m 0m", text: "Modular attachment points" }
    ]
  },
  {
    id: 'p3',
    name: 'Industrial Atlas Table',
    category: 'Tables',
    price: 1150,
    dimensions: { width: 180, height: 75, depth: 90, unit: 'cm' },
    image: 'https://images.unsplash.com/photo-1530018607912-eff2df17a0bc?auto=format&fit=crop&q=90&w=800',
    model3d: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    description: 'Raw materials refined for the modern home. A heavy cast-iron base supports a reclaimed walnut top with live edges.',
    style: 'Industrial',
    material: ['Reclaimed Walnut', 'Cast Iron'],
    colors: ['Natural Walnut'],
    vendorId: 'v2',
    vendorName: 'Forge & Timber',
    reviews: [],
    hotspots: [
      { position: "0m 0.75m 0m", normal: "0m 1m 0m", text: "Water-resistant finish" }
    ]
  }
];
