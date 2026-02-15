
export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Hotspot {
  position: string;
  normal: string;
  text: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unit: string;
  };
  image: string;
  model3d?: string;
  description: string;
  style: string;
  material: string[];
  colors: string[];
  vendorId: string;
  vendorName: string;
  reviews: Review[];
  hotspots?: Hotspot[];
}

export interface User {
  id: string;
  name: string;
  role: 'customer' | 'vendor';
  email: string;
}

export interface RoomAnalysis {
  style: string;
  primaryColor: string;
  accentColors: string[];
  lighting: string;
  roomType: string;
  detectedObjects: string[];
  vibe: string;
}

export type AppView = 'home' | 'catalog' | 'details' | 'analyze' | 'ar' | 'cart' | 'login' | 'vendor-dashboard' | 'profile' | 'wishlist';

export interface CartItem {
  product: Product;
  quantity: number;
}
