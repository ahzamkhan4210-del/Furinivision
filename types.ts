
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
  model3d?: string; // URL or Base64 of GLB model
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

export interface Order {
  id: string;
  customerId: string;
  vendorId: string;
  productId: string;
  status: 'pending' | 'customizing' | 'shipped' | 'delivered';
  date: string;
  total: number;
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

export interface FitScoreResult {
  score: number;
  reasoning: string;
  placementTips: string;
  isSizeAppropriate: boolean;
}

export type AppView = 'home' | 'catalog' | 'details' | 'analyze' | 'ar' | 'cart' | 'login' | 'vendor-dashboard' | 'profile' | 'wishlist';

export interface CartItem {
  product: Product;
  quantity: number;
  customization?: {
    material: string;
    color: string;
    dimensions: string;
  };
}
