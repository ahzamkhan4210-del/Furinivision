
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Camera, 
  Maximize2, 
  ArrowLeft, 
  Layout, 
  X,
  User,
  Heart,
  Search,
  ChevronRight,
  Menu,
  Sparkles,
  Upload,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Box,
  Store,
  Users,
  Package,
  Settings,
  Home,
  LogOut,
  Bell,
  CheckCircle2,
  Plus,
  ImageIcon,
  DollarSign,
  BoxSelect,
  Star,
  MessageSquare,
  View,
  Camera as CameraIcon,
  Loader2,
  Filter,
  Info,
  Scan,
  Palette,
  Check,
  AlertCircle,
  Clock,
  FileCode,
  ExternalLink,
  RotateCw,
  RotateCcw,
  Zap,
  TriangleAlert,
  Dna,
  Hand,
  ScanEye
} from 'lucide-react';
import { MOCK_PRODUCTS } from './constants';
import { Product, AppView, CartItem, User as UserType, Review, RoomAnalysis, Hotspot } from './types';
import { generateVisualPlacement, analyzeRoomImage } from './services/geminiService';
import { getProductsFromDB, saveProductsToDB, deleteProductFromDB, clearAllProductsDB } from './services/storageService';

const AUTH_STORAGE_KEY = 'furnivision_auth_session';
const ModelViewer = 'model-viewer' as any;

const App: React.FC = () => {
  // App State
  const [view, setView] = useState<AppView>('login');
  const [user, setUser] = useState<UserType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  
  // Vendor UI State
  const [vendorSubView, setVendorSubView] = useState<'overview' | 'inventory' | 'settings'>('overview');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Room Analysis State
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<RoomAnalysis | null>(null);
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'results'>('idle');

  // New Product Form
  const [newProduct, setNewProduct] = useState({
    name: '', price: '', category: 'Sofa', description: '', image: '', model3d: '', material: 'Oak', annotation: ''
  });

  // AI Visualizer State
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerStep, setVisualizerStep] = useState<'upload' | 'processing' | 'result'>('upload');
  const [visualizerInputImg, setVisualizerInputImg] = useState<string | null>(null);
  const [visualizerOutputImg, setVisualizerOutputImg] = useState<string | null>(null);
  const [visualizerError, setVisualizerError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'image' | '3d'>('image');
  
  // 3D Enhanced Controls
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const modelViewerRef = useRef<any>(null);
  const arModelViewerRef = useRef<any>(null);

  const [processProgress, setProcessProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState("Initializing AI...");

  const statusMessages = [
    "Analyzing room dimensions...",
    "Matching ambient lighting...",
    "Calculating spatial perspective...",
    "Scaling furniture accurately...",
    "Applying realistic shadows...",
    "Finalizing visual placement..."
  ];

  // Load persistence on mount
  useEffect(() => {
    const initApp = async () => {
      // 1. Load User Session
      const savedSession = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedSession) {
        try {
          const parsedUser = JSON.parse(savedSession);
          setUser(parsedUser);
          setView(parsedUser.role === 'vendor' ? 'vendor-dashboard' : 'home');
        } catch (e) { localStorage.removeItem(AUTH_STORAGE_KEY); }
      }

      // 2. Load Persistent Products from IndexedDB (Handles 50MB+)
      try {
        const dbProducts = await getProductsFromDB();
        if (dbProducts && dbProducts.length > 0) {
          setProducts(dbProducts);
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      } catch (e) {
        console.error("IndexedDB load failed", e);
        setProducts(MOCK_PRODUCTS);
      }
    };

    initApp();
  }, []);

  useEffect(() => {
    let interval: any;
    if (visualizerStep === 'processing') {
      setProcessProgress(0);
      interval = setInterval(() => {
        setProcessProgress(prev => {
          if (prev >= 98) return prev;
          const next = prev + (Math.random() * 5);
          const msgIndex = Math.min(Math.floor((next / 100) * statusMessages.length), statusMessages.length - 1);
          setProcessStatus(statusMessages[msgIndex]);
          return next;
        });
      }, 600);
    }
    return () => clearInterval(interval);
  }, [visualizerStep]);

  // Handlers
  const navigateToProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewMode('image');
    setView('details');
    setIsAutoRotating(true);
  };

  const handleLogin = (role: 'customer' | 'vendor') => {
    const userData: UserType = { 
      id: role === 'customer' ? 'u1' : 'v1', 
      name: role === 'customer' ? 'Julian' : 'Furniture Master', 
      email: `${role}@vision.com`, 
      role 
    };
    setUser(userData);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    setView(role === 'vendor' ? 'vendor-dashboard' : 'home');
    setVendorSubView('overview');
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setCart([]);
    setWishlist([]);
    setView('login');
  };

  const handleInitiateScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setRoomImage(base64);
      setScanStep('scanning');
      try {
        const result = await analyzeRoomImage(base64);
        setAnalysisResult(result);
        setScanStep('results');
      } catch (err) {
        setScanStep('idle');
        alert("Spatial analysis failed. Please try again with a clearer photo.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProcessVisualization = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!visualizerInputImg || !selectedProduct) return;
    setVisualizerStep('processing');
    setVisualizerError(null);
    try {
      const result = await generateVisualPlacement(
        visualizerInputImg,
        selectedProduct.image,
        selectedProduct.name,
        selectedProduct.style,
        selectedProduct.description
      );
      setVisualizerOutputImg(result);
      setVisualizerStep('result');
    } catch (error: any) {
      setVisualizerError(error.message || "AI failed to generate visual. Try a better lit room photo.");
      setVisualizerStep('upload');
    }
  };

  const toggleWishlist = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const addToCart = (product: Product) => {
    setCart(prev => [...prev, { product, quantity: 1 }]);
    setView('cart');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'model') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);

    // Validation for 3D Models
    if (type === 'model') {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'gltf') {
        setFileError("Gltf files are multi-part. Please use a self-contained .glb file (Binary GLTF).");
        return;
      }
      if (extension !== 'glb') {
        setFileError("Only .glb files are supported for mobile 3D preview.");
        return;
      }
      // Increased limit to 50MB for mobile uploads
      if (file.size > 50 * 1024 * 1024) {
        setFileError("File is too massive! Please stay under 50MB for mobile performance.");
        return;
      }
    } else {
      // Standard image limit
      if (file.size > 10 * 1024 * 1024) {
        setFileError("Image is too large. Max 10MB allowed.");
        return;
      }
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      if (type === 'image') {
        setNewProduct(prev => ({ ...prev, image: base64String }));
      } else {
        setNewProduct(prev => ({ ...prev, model3d: base64String }));
      }
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      setFileError("Memory limit reached. Try a smaller file or clear browser cache.");
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) {
      alert("Missing required fields: Name, Price, and Preview Image are mandatory.");
      return;
    }
    
    setIsProcessingFile(true);
    const hotspots: Hotspot[] = newProduct.annotation ? [
      { position: "-0.5m 1.0m 0.2m", normal: "0m 1m 0m", text: newProduct.annotation }
    ] : [];

    const product: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      category: newProduct.category,
      price: parseFloat(newProduct.price),
      dimensions: { width: 100, height: 100, depth: 100, unit: 'cm' },
      image: newProduct.image,
      model3d: newProduct.model3d,
      description: newProduct.description || "Freshly added item.",
      style: "Modern",
      material: [newProduct.material],
      colors: ["Natural"],
      vendorId: user?.id || 'v1',
      vendorName: user?.name || 'Vendor',
      reviews: [],
      hotspots
    };
    
    const updatedProducts = [product, ...products];
    setProducts(updatedProducts);
    
    try {
      await saveProductsToDB(updatedProducts);
    } catch (e) {
      alert("Storage error: Device space may be full.");
    }
    
    setIsProcessingFile(false);
    setIsAddingProduct(false);
    setVendorSubView('inventory');
    setNewProduct({ name: '', price: '', category: 'Sofa', description: '', image: '', model3d: '', material: 'Oak', annotation: '' });
  };

  const isWishlisted = (id: string) => wishlist.some(p => p.id === id);

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this listing?")) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      try {
        await deleteProductFromDB(id);
      } catch (e) { console.error(e); }
    }
  };

  const handleClearShop = async () => {
    if (window.confirm("Warning: This will delete ALL products permanently from your device. Proceed?")) {
      setProducts([]);
      try {
        await clearAllProductsDB();
      } catch (e) { console.error(e); }
    }
  };

  const resetCamera = () => {
    if (modelViewerRef.current) {
      // Smoothly interpolate back to default view
      modelViewerRef.current.cameraOrbit = "0deg 75deg 105%";
      modelViewerRef.current.fieldOfView = "auto";
      modelViewerRef.current.cameraTarget = "auto auto auto";
      setIsAutoRotating(true);
    }
  };

  const startARSession = () => {
    if (arModelViewerRef.current) {
      arModelViewerRef.current.activateAR();
    }
  };

  // Sub-renderers
  const renderLogin = () => (
    <div className="fixed inset-0 z-[100] bg-sage flex flex-col justify-between overflow-hidden">
      <div className="pt-16 px-10 text-center text-white z-20">
        <h1 className="text-4xl font-extrabold mb-4 leading-tight drop-shadow-sm">FurniVision</h1>
        <p className="text-white/80 text-sm max-w-xs mx-auto text-center leading-relaxed">AI-Powered Smart Furniture Commerce Platform.</p>
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center z-10 p-6">
        <div className="w-full max-w-[280px] aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/20 animate-float bg-white/10 backdrop-blur-sm">
          <img src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=90&w=600" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="bg-white rounded-t-[3.5rem] p-10 pt-10 heavy-shadow z-20">
        <h3 className="text-primary font-bold text-center mb-6 uppercase tracking-widest text-[10px]">Sign in as</h3>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={() => handleLogin('customer')} className="flex flex-col items-center gap-3 p-5 bg-sage-light/30 rounded-3xl border border-sage-light active:bg-sage active:text-white transition-all group">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-sage group-active:bg-white/20 transition-colors"><Users size={24} /></div>
            <span className="font-bold text-sm">Customer</span>
          </button>
          <button onClick={() => handleLogin('vendor')} className="flex flex-col items-center gap-3 p-5 bg-sage-light/30 rounded-3xl border border-sage-light active:bg-sage active:text-white transition-all group">
            <div className="p-3 bg-white rounded-2xl shadow-sm text-sage group-active:bg-white/20 transition-colors"><Store size={24} /></div>
            <span className="font-bold text-sm">Vendor</span>
          </button>
        </div>
        <p className="text-center text-[9px] text-secondary/40 uppercase font-black tracking-[0.2em]">Innovating Spatial Commerce</p>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="min-h-screen bg-background pb-32 overflow-y-auto no-scrollbar">
      <div className="bg-white px-8 pt-16 pb-12 flex flex-col gap-8 rounded-b-[3.5rem] soft-shadow">
        <div className="flex justify-between items-center text-primary">
          <div className="p-2 bg-sage-light/20 rounded-xl"><Menu size={24} /></div>
          <button onClick={() => setView('profile')} className="w-12 h-12 rounded-full border-2 border-sage overflow-hidden shadow-md"><img src="https://i.pravatar.cc/100" className="w-full h-full object-cover" /></button>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-primary leading-tight">Modern<br/><span className="text-sage">Furniture</span></h2>
          <p className="text-sm font-medium text-secondary mt-2">Personalized recommendations for your home.</p>
        </div>
      </div>
      <div className="px-6 -mt-6 space-y-10">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-secondary/30 font-bold italic text-center animate-in fade-in duration-700">
            <ShoppingBag size={80} className="mb-6 opacity-20" />
            <p className="text-lg">The shop is currently empty.</p>
            <p className="text-xs uppercase tracking-widest mt-2">Check back soon for new arrivals.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-5 overflow-x-auto no-scrollbar py-4 px-1">
                {products.map(p => (
                    <div key={p.id} onClick={() => navigateToProduct(p)} className="bg-white rounded-[2.2rem] p-3 flex gap-4 min-w-[280px] soft-shadow border border-white active:scale-[0.98] transition-all cursor-pointer relative group">
                        <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden shadow-sm flex-shrink-0 relative">
                            <img src={p.image} className="w-full h-full object-cover" />
                            {p.model3d && (
                              <div className="absolute bottom-1 left-1 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                <Box size={10} className="text-sage" />
                                <span className="text-[8px] font-black text-sage uppercase">3D</span>
                              </div>
                            )}
                            <button onClick={(e) => toggleWishlist(p, e)} className={`absolute top-1.5 right-1.5 p-1.5 rounded-full backdrop-blur-md ${isWishlisted(p.id) ? 'bg-red-50 text-red-500' : 'bg-black/20 text-white'}`}><Heart size={14} className={isWishlisted(p.id) ? 'fill-current' : ''} /></button>
                        </div>
                        <div className="flex-1 flex flex-col justify-center py-1">
                            <h3 className="font-bold text-base text-primary truncate">{p.name}</h3>
                            <span className="text-sage font-black text-sm mt-1">${p.price}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-2 gap-5 pb-10">
                {products.map(p => (
                    <div key={p.id} onClick={() => navigateToProduct(p)} className="bg-white rounded-[2.5rem] p-4 soft-shadow active:scale-[0.95] transition-all flex flex-col items-center text-center cursor-pointer border border-transparent relative">
                        {p.model3d && <div className="absolute top-6 left-6 z-10 bg-sage text-white p-1.5 rounded-full shadow-lg"><Box size={14}/></div>}
                        <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-4 bg-sage-light/10"><img src={p.image} className="w-full h-full object-cover" /></div>
                        <h4 className="font-bold text-sm text-primary truncate w-full">{p.name}</h4>
                        <p className="text-sage font-black text-sm mt-2">${p.price}</p>
                    </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderDetails = () => {
    if (!selectedProduct) return null;
    return (
      <div className="min-h-screen bg-background pb-32 overflow-y-auto no-scrollbar h-screen">
        <div className="p-8 flex justify-between items-center fixed top-0 w-full z-30">
            <button onClick={() => setView('home')} className="p-3 bg-white/90 backdrop-blur-md rounded-full soft-shadow text-secondary"><ArrowLeft size={20} /></button>
            <button onClick={() => setView('cart')} className="p-3 bg-white/90 backdrop-blur-md rounded-full soft-shadow text-sage relative">
              <ShoppingCart size={20} />
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-sage text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-white">{cart.length}</span>}
            </button>
        </div>
        <div className="flex flex-col items-center pt-24 px-8 pb-32">
            <div className="w-full aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl mb-10 relative border-8 border-white bg-white flex items-center justify-center z-10">
                {viewMode === 'image' ? ( 
                  <img src={selectedProduct.image} className="w-full h-full object-contain p-6 animate-in zoom-in duration-500" /> 
                ) : (
                  <div className="w-full h-full relative group/model">
                    <ModelViewer 
                      ref={modelViewerRef}
                      src={selectedProduct.model3d} 
                      alt={selectedProduct.name} 
                      auto-rotate={isAutoRotating ? "" : undefined}
                      camera-controls 
                      shadow-intensity="1.5" 
                      power-preference="high-performance" 
                      loading="eager" 
                      min-field-of-view="20deg"
                      max-field-of-view="auto"
                      interpolation-decay="200"
                      className="w-full h-full animate-in fade-in duration-500" 
                      style={{ width: '100%', height: '100%', backgroundColor: '#fcfdfa' }}
                    >
                      {/* Dynamic Hotspots */}
                      {selectedProduct.hotspots?.map((hs, i) => (
                        <button key={i} className="hotspot" slot={`hotspot-${i}`} data-position={hs.position} data-normal={hs.normal}>
                          <div className="hotspot-dot"></div>
                          <div className="annotation">{hs.text}</div>
                        </button>
                      ))}

                      {/* 3D Tools Overlay */}
                      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
                        {/* Reset Camera Button */}
                        <button 
                          onClick={resetCamera} 
                          className="p-4 bg-white/95 backdrop-blur-xl rounded-full shadow-lg text-primary active:scale-90 transition-all border border-sage-light/20 flex items-center justify-center"
                          title="Reset View"
                        >
                          <RotateCcw size={20} />
                        </button>
                        
                        {/* Auto-Rotate Toggle with subtle pulsing animation when active */}
                        <button 
                          onClick={() => setIsAutoRotating(!isAutoRotating)} 
                          className={`p-4 rounded-full shadow-lg transition-all active:scale-90 border border-sage-light/20 flex items-center justify-center ${isAutoRotating ? 'bg-sage text-white shadow-[0_0_15px_rgba(154,179,130,0.4)] animate-pulse' : 'bg-white/95 text-primary'}`}
                          title={isAutoRotating ? "Disable Auto-Rotate" : "Enable Auto-Rotate"}
                        >
                          <RotateCw size={20} className={`${isAutoRotating ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                        </button>
                      </div>

                      {/* Interaction Guidance */}
                      <div className="absolute bottom-6 left-6 flex flex-col gap-2 pointer-events-none transition-opacity duration-300 group-hover/model:opacity-100 opacity-60">
                        <div className="flex items-center gap-2">
                           <Box size={14} className="text-sage" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-secondary">Orbit / Zoom</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <Hand size={14} className="text-sage" />
                           <span className="text-[9px] font-black uppercase tracking-widest text-secondary">Two-Finger Pan</span>
                        </div>
                      </div>
                    </ModelViewer>
                  </div>
                )}
                
                <div className="absolute top-6 right-6 flex flex-col gap-4 z-20">
                    {selectedProduct.model3d && ( 
                      <button onClick={() => setViewMode(viewMode === 'image' ? '3d' : 'image')} className={`p-4 rounded-[1.5rem] soft-shadow transition-all active:scale-90 ${viewMode === '3d' ? 'bg-sage text-white' : 'bg-white/95 text-sage border border-sage-light'}`}>
                        {viewMode === '3d' ? <ImageIcon size={22} /> : <Box size={22} />}
                      </button> 
                    )}
                    <button onClick={() => setView('analyze')} className="p-4 bg-white/95 backdrop-blur-sm rounded-[1.5rem] soft-shadow text-sage border border-sage-light active:scale-90 transition-all"><Maximize2 size={22} /></button>
                    <button onClick={() => setShowVisualizer(true)} className="p-4 bg-sage text-white rounded-[1.5rem] shadow-lg active:scale-110 transition-transform"><Sparkles size={22} /></button>
                </div>

                {selectedProduct.model3d && ( 
                  <button onClick={() => setView('ar')} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-sage text-white px-8 py-4 rounded-full font-black text-[10px] uppercase shadow-xl flex items-center gap-2 tracking-widest active:scale-95 transition-all"><View size={16} /> View in AR</button> 
                )}
            </div>
            
            <div className="w-full animate-in slide-in-from-bottom duration-500">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-3xl font-extrabold text-primary leading-tight max-w-[70%]">{selectedProduct.name}</h2>
                  <span className="text-3xl font-black text-sage">${selectedProduct.price}</span>
                </div>
                <p className="text-secondary text-base leading-relaxed mb-10 opacity-85">{selectedProduct.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className="bg-sage-light/40 p-6 rounded-[2.5rem] border border-sage-light text-center">
                    <span className="text-[10px] font-black uppercase text-sage-dark block mb-2 tracking-widest">Material</span>
                    <span className="font-bold text-sm text-primary">{selectedProduct.material[0]}</span>
                  </div>
                  <div className="bg-sage-light/40 p-6 rounded-[2.5rem] border border-sage-light text-center">
                    <span className="text-[10px] font-black uppercase text-sage-dark block mb-2 tracking-widest">Dimensions</span>
                    <span className="font-bold text-sm text-primary">{selectedProduct.dimensions.width}x{selectedProduct.dimensions.height}cm</span>
                  </div>
                </div>
                
                <button onClick={() => addToCart(selectedProduct)} className="w-full bg-sage-dark text-white font-black py-7 rounded-[3rem] shadow-2xl text-xs tracking-widest uppercase mb-6 active:scale-95 transition-all">Add To Cart</button>
            </div>
        </div>
      </div>
    );
  };

  const renderCart = () => (
    <div className="pt-20 px-8 h-screen bg-background overflow-y-auto pb-32">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => setView('home')} className="p-3 bg-white rounded-full soft-shadow text-secondary"><ArrowLeft size={20} /></button>
        <h2 className="text-3xl font-black text-primary">Your Cart</h2>
      </div>
      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-secondary opacity-30 font-bold italic"><ShoppingBag size={80} className="mb-6" />Cart is empty.</div>
      ) : (
        <div className="space-y-6">
          {cart.map((item, idx) => (
            <div key={idx} className="bg-white rounded-[2.2rem] p-4 soft-shadow flex gap-5 border border-sage-light/10 animate-in fade-in duration-300">
              <div className="w-24 h-24 rounded-[1.8rem] overflow-hidden bg-sage-light/10 flex items-center justify-center"><img src={item.product.image} className="w-full h-full object-contain p-2" /></div>
              <div className="flex-1 flex flex-col justify-between py-1">
                <h3 className="font-bold text-primary truncate text-lg">{item.product.name}</h3>
                <div className="flex justify-between items-end">
                  <span className="text-sage font-black text-xl">${item.product.price}</span>
                  <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 p-3 bg-red-50 rounded-2xl"><Trash2 size={20} /></button>
                </div>
              </div>
            </div>
          ))}
          <div className="mt-10 p-10 bg-sage rounded-[3.5rem] text-white space-y-8 shadow-2xl">
             <div className="flex justify-between items-center"><span className="font-bold text-xs uppercase tracking-widest opacity-80">Subtotal</span><span className="text-4xl font-black">${cart.reduce((a,b)=>a+b.product.price,0)}</span></div>
             <button className="w-full bg-white text-sage py-6 rounded-full font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Complete Order</button>
          </div>
        </div>
      )}
    </div>
  );

  const renderWishlist = () => (
    <div className="pt-20 px-8 h-screen bg-background overflow-y-auto pb-32">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => setView('profile')} className="p-3 bg-white rounded-full soft-shadow text-secondary"><ArrowLeft size={20} /></button>
        <h2 className="text-3xl font-black text-primary">Wishlist</h2>
      </div>
      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-secondary opacity-30 font-bold italic"><Heart size={80} className="mb-6" />No saved items.</div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
           {wishlist.map(p => (
             <div key={p.id} onClick={() => navigateToProduct(p)} className="bg-white p-5 rounded-[2.8rem] soft-shadow relative cursor-pointer border border-sage-light/10 active:scale-95 transition-all">
                <div className="aspect-square rounded-[2rem] overflow-hidden bg-sage-light/10 mb-4"><img src={p.image} className="w-full h-full object-cover" /></div>
                <h4 className="font-bold text-sm text-primary truncate px-1">{p.name}</h4>
                <button onClick={(e)=>{e.stopPropagation(); toggleWishlist(p);}} className="absolute top-2 right-2 p-2 bg-red-50 text-red-500 rounded-full shadow-sm"><X size={16} /></button>
             </div>
           ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div className="pt-20 px-8 h-screen bg-background overflow-y-auto pb-32">
       <div className="flex items-center gap-4 mb-12"><button onClick={() => setView('home')} className="p-3 bg-white rounded-full soft-shadow text-secondary"><ArrowLeft size={20} /></button><h2 className="text-3xl font-black text-primary">Account</h2></div>
       <div className="flex flex-col items-center mb-12 animate-in fade-in duration-500">
          <div className="w-28 h-28 rounded-full border-4 border-white shadow-2xl overflow-hidden mb-6"><img src="https://i.pravatar.cc/200" className="w-full h-full object-cover" /></div>
          <h3 className="text-2xl font-black text-primary">{user?.name}</h3>
          <p className="text-[10px] font-black text-secondary opacity-40 uppercase tracking-[0.2em]">{user?.role}</p>
       </div>
       <div className="space-y-5">
          <button onClick={() => setView('wishlist')} className="w-full p-7 bg-white rounded-[2.5rem] soft-shadow flex justify-between items-center active:scale-[0.98] transition-all group border border-transparent hover:border-sage-light/30">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-red-50 text-red-400 rounded-2xl group-hover:scale-110 transition-transform"><Heart size={22} /></div>
              <span className="font-bold text-primary">My Wishlist</span>
            </div>
            <span className="text-[10px] font-black text-sage bg-sage-light/30 px-3 py-1 rounded-full">{wishlist.length}</span>
          </button>
          <button className="w-full p-7 bg-white rounded-[2.5rem] soft-shadow flex justify-between items-center group border border-transparent hover:border-sage-light/30">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-sage-light/40 text-sage rounded-2xl group-hover:scale-110 transition-transform"><Clock size={22} /></div>
              <span className="font-bold text-primary">Order History</span>
            </div>
            <ChevronRight size={20} className="text-secondary/30" />
          </button>
          <button onClick={handleLogout} className="w-full p-7 bg-red-50 text-red-500 rounded-[2.5rem] flex justify-center items-center gap-4 font-black uppercase text-xs tracking-widest mt-12 active:scale-95 transition-all shadow-sm"><LogOut size={22} /> Sign Out</button>
       </div>
    </div>
  );

  const renderVendorDashboard = () => (
    <div className="min-h-screen bg-background pb-32 pt-16 px-8 flex flex-col overflow-y-auto no-scrollbar h-screen">
       <header className="flex justify-between items-center mb-10">
          <div><h2 className="text-2xl font-black text-primary">Vendor Portal</h2><p className="text-[10px] text-secondary font-black uppercase tracking-widest">{vendorSubView}</p></div>
          <div className="w-12 h-12 rounded-full border-2 border-sage overflow-hidden shadow-md"><img src="https://i.pravatar.cc/150?u=vendor" /></div>
       </header>

       {isAddingProduct ? (
         <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-20">
            <div className="bg-white rounded-[3rem] p-8 pb-10 soft-shadow border border-sage-light/30 space-y-8">
                <div className="flex justify-between items-center"><h3 className="text-xl font-bold">New Listing</h3><button onClick={()=>setIsAddingProduct(false)} className="p-2 bg-sage-light/20 rounded-full"><X size={24}/></button></div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Image Upload */}
                  <label className="aspect-square rounded-[2rem] bg-sage-light/20 border-2 border-dashed border-sage-light flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all active:scale-95 shadow-inner">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} />
                      {newProduct.image ? <img src={newProduct.image} className="w-full h-full object-contain" /> : <div className="text-center"><ImageIcon size={28} className="text-sage mx-auto mb-2"/><span className="text-[9px] font-black uppercase tracking-widest text-sage">Photo</span></div>}
                  </label>

                  {/* 3D Model Upload - Enhanced for 50MB */}
                  <label className={`aspect-square rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all active:scale-95 shadow-inner relative ${newProduct.model3d ? 'bg-white' : 'bg-sage-light/10 border-sage-light'}`}>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".glb" 
                        onChange={(e) => handleFileUpload(e, 'model')} 
                      />
                      {isProcessingFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 size={28} className="text-sage animate-spin" />
                          <span className="text-[8px] font-black text-sage uppercase tracking-widest">Encoding 3D...</span>
                        </div>
                      ) : newProduct.model3d ? (
                        <div className="w-full h-full relative">
                          <ModelViewer src={newProduct.model3d} auto-rotate style={{ width: '100%', height: '100%' }}></ModelViewer>
                          <div className="absolute top-2 right-2 bg-sage text-white p-1 rounded-full shadow-lg"><CheckCircle2 size={12}/></div>
                        </div>
                      ) : (
                        <div className="text-center text-sage">
                          <Box size={28} className="mx-auto mb-2" />
                          <span className="text-[9px] font-black uppercase tracking-widest">3D (max 50MB)</span>
                        </div>
                      )}
                  </label>
                </div>

                {fileError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-[1.5rem] flex gap-3 text-red-500 text-[10px] font-bold animate-in shake duration-300">
                    <TriangleAlert size={16} className="flex-shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}

                <div className="space-y-5">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 ml-4">Product Name</label><input placeholder="Nordic Lounge Chair..." className="w-full bg-sage-light/20 border-none rounded-[1.5rem] p-5 font-bold outline-none shadow-inner" value={newProduct.name} onChange={(e)=>setNewProduct({...newProduct, name:e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 ml-4">Price ($)</label><input placeholder="0.00" type="number" className="w-full bg-sage-light/20 border-none rounded-[1.5rem] p-5 font-bold outline-none shadow-inner" value={newProduct.price} onChange={(e)=>setNewProduct({...newProduct, price:e.target.value})} /></div>
                  
                  {/* Annotation Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-sage ml-4 flex items-center gap-1"><Zap size={10} /> Key Feature Annotation</label>
                    <input placeholder="e.g. Ergonomic lumbar support..." className="w-full bg-sage-light/30 border border-sage-light/20 rounded-[1.5rem] p-5 font-bold outline-none shadow-inner text-primary" value={newProduct.annotation} onChange={(e)=>setNewProduct({...newProduct, annotation:e.target.value})} />
                  </div>

                  <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-secondary/40 ml-4">Description</label><textarea placeholder="Describe style and size..." rows={3} className="w-full bg-sage-light/20 border-none rounded-[1.5rem] p-5 font-medium outline-none shadow-inner" value={newProduct.description} onChange={(e)=>setNewProduct({...newProduct, description:e.target.value})} /></div>
                </div>
                <button 
                  disabled={isProcessingFile || !!fileError}
                  onClick={handleAddProduct} 
                  className="w-full bg-sage text-white py-6 rounded-full font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                >
                  {isProcessingFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="animate-spin" size={16} />
                      <span>Writing to Database...</span>
                    </div>
                  ) : "Publish Listing"}
                </button>
                <div className="flex items-start gap-2 px-4 opacity-50">
                  <Info size={14} className="mt-0.5" />
                  <p className="text-[9px] font-medium leading-relaxed italic">Self-contained .glb files are saved to device IndexedDB. Large files may take a moment to encode.</p>
                </div>
            </div>
         </div>
       ) : (
         <div className="space-y-8 animate-in fade-in duration-500">
            {vendorSubView === 'overview' && (
              <div className="space-y-10">
                 <div className="grid grid-cols-2 gap-5">
                    <div className="bg-sage p-8 rounded-[3rem] text-white shadow-2xl"><span className="text-[9px] font-black uppercase block mb-2 opacity-70 tracking-widest">Total Sales</span><span className="text-3xl font-black">${products.length > 0 ? "14.2k" : "0"}</span></div>
                    <div className="bg-white p-8 rounded-[3rem] soft-shadow border border-sage-light/10"><span className="text-[9px] font-black uppercase block mb-2 opacity-40 tracking-widest">Active Orders</span><span className="text-3xl font-black text-primary">{products.length > 0 ? "28" : "0"}</span></div>
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-primary">Recent Listings</h3>
                      <button onClick={()=>setVendorSubView('inventory')} className="text-sage text-xs font-black uppercase tracking-widest">View All</button>
                    </div>
                    {products.length === 0 ? (
                      <div className="bg-white p-10 rounded-[3rem] soft-shadow border border-sage-light/5 text-center text-secondary/30">
                        No active listings.
                      </div>
                    ) : (
                      <div className="space-y-4">
                          {products.slice(0,4).map(p=>(
                            <div key={p.id} className="bg-white p-4 rounded-[2.2rem] soft-shadow flex items-center gap-4 border border-sage-light/5 active:scale-95 transition-all">
                              <div className="w-16 h-16 rounded-2xl bg-sage-light/20 overflow-hidden flex-shrink-0"><img src={p.image} className="w-full h-full object-contain p-2" /></div>
                              <div className="flex-1"><h4 className="font-bold text-sm text-primary truncate">{p.name}</h4><span className="text-sage font-black text-xs">${p.price}</span></div>
                              <button onClick={()=>navigateToProduct(p)} className="p-2 text-sage bg-sage-light/30 rounded-full"><ExternalLink size={18}/></button>
                            </div>
                          ))}
                      </div>
                    )}
                 </div>
              </div>
            )}
            {vendorSubView === 'inventory' && (
              <div className="space-y-8">
                 <div className="flex justify-between items-center"><h3 className="text-2xl font-black text-primary">Manage Stock</h3><button onClick={()=>setIsAddingProduct(true)} className="p-4 bg-sage text-white rounded-[1.5rem] shadow-xl active:scale-90 transition-all"><Plus size={28}/></button></div>
                 <div className="grid grid-cols-1 gap-5 pb-10">
                   {products.length === 0 ? (
                     <div className="flex flex-col items-center justify-center py-24 text-secondary/30 italic">
                       <Package size={60} className="mb-4 opacity-10" />
                       Inventory is empty.
                     </div>
                   ) : (
                     products.map(p=>(
                       <div key={p.id} className="bg-white p-5 rounded-[2.8rem] soft-shadow flex justify-between items-center border border-sage-light/10 group">
                          <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-sage-light/20 relative">
                              <img src={p.image} className="w-full h-full object-contain p-2" />
                              {p.model3d && <div className="absolute -top-1 -right-1 bg-sage text-white p-1 rounded-full shadow-sm"><Box size={10}/></div>}
                            </div>
                            <div>
                              <h4 className="font-bold text-base text-primary">{p.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black uppercase text-sage">Active</span>
                                <span className="w-1 h-1 rounded-full bg-secondary/30"></span>
                                <span className="text-[10px] font-black uppercase text-secondary/40">${p.price}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={()=>navigateToProduct(p)} className="p-3 bg-sage-light/30 text-sage rounded-2xl hover:bg-sage hover:text-white transition-colors"><ExternalLink size={18}/></button>
                             <button onClick={() => handleDeleteProduct(p.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={18}/></button>
                          </div>
                       </div>
                     ))
                   )}
                 </div>
              </div>
            )}
            {vendorSubView === 'settings' && (
              <div className="space-y-6">
                 <button className="w-full p-8 bg-white rounded-[3rem] soft-shadow flex justify-between items-center group">
                   <div className="flex items-center gap-5">
                      <div className="p-3 bg-sage-light/40 text-sage rounded-2xl"><Store size={22}/></div>
                      <span className="font-bold text-primary">Store Information</span>
                   </div>
                   <ChevronRight size={20} className="text-secondary/30"/>
                 </button>
                 <button onClick={handleClearShop} className="w-full p-8 bg-red-50 text-red-500 rounded-[3rem] font-black uppercase text-xs tracking-widest flex justify-center items-center gap-4 shadow-sm active:scale-95 transition-all mt-10"><Trash2 size={22}/> Delete All Products</button>
                 <button onClick={handleLogout} className="w-full p-8 bg-sage-light/30 text-sage rounded-[3rem] font-black uppercase text-xs tracking-widest flex justify-center items-center gap-4 shadow-sm active:scale-95 transition-all mt-4"><LogOut size={22}/> Logout</button>
              </div>
            )}
         </div>
       )}
    </div>
  );

  const renderAnalyze = () => (
    <div className="pt-20 px-8 h-screen bg-background overflow-y-auto pb-32 no-scrollbar">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => setView('home')} className="p-3 bg-white rounded-full soft-shadow text-secondary"><ArrowLeft size={20} /></button>
        <h2 className="text-3xl font-black text-primary">Spatial Scan</h2>
      </div>

      {scanStep === 'idle' && (
        <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
          <label 
            className="aspect-[3/4] rounded-[3rem] border-2 border-dashed border-sage-light bg-sage-light/10 flex flex-col items-center justify-center cursor-pointer active:bg-sage-light/20 transition-all overflow-hidden relative shadow-inner"
          >
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleInitiateScan}
            />
            {roomImage ? (
              <img src={roomImage} className="w-full h-full object-cover" alt="Room" />
            ) : (
              <div className="text-center p-10">
                <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl flex items-center justify-center mx-auto mb-8 text-sage"><CameraIcon size={40} /></div>
                <h3 className="font-bold text-xl text-primary mb-3">Map Your Space</h3>
                <p className="text-xs text-secondary font-medium leading-relaxed px-6 opacity-60">Upload a room photo for AI analysis of style and layout compatibility.</p>
              </div>
            )}
          </label>
          {roomImage && (
            <button 
              className="w-full py-5 rounded-full border-2 border-sage text-sage font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              Scan Different Room
            </button>
          )}
        </div>
      )}

      {scanStep === 'scanning' && (
        <div className="flex flex-col items-center justify-center py-20 relative animate-in fade-in duration-700">
          <div className="w-full aspect-[3/4] rounded-[4rem] overflow-hidden mb-12 relative shadow-2xl border-4 border-white">
            <img src={roomImage!} className="w-full h-full object-cover grayscale opacity-40" alt="Scanning" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sage/40 to-transparent w-full h-3 shadow-[0_0_30px_rgba(154,179,130,0.6)] animate-[scan_3s_linear_infinite]"></div>
          </div>
          <h3 className="text-2xl font-black text-primary mb-3">Spatial AI Processing</h3>
          <p className="text-sage font-bold animate-pulse text-sm tracking-widest uppercase">Analyzing dimensions and vibe...</p>
        </div>
      )}

      {scanStep === 'results' && analysisResult && (
        <div className="space-y-10 animate-in slide-in-from-bottom duration-700 pb-12">
          <div className="aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white">
            <img src={roomImage!} className="w-full h-full object-cover" alt="Analyzed Room" />
          </div>
          
          <div className="bg-white rounded-[3rem] p-10 soft-shadow border border-sage-light/20">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-sage/10 text-sage rounded-2xl"><Sparkles size={24} /></div>
              <h3 className="text-2xl font-bold text-primary">Spatial Insights</h3>
            </div>
            
            <div className="space-y-8">
              <div className="flex justify-between items-center py-4 border-b border-sage-light/10">
                <span className="text-[10px] font-black uppercase text-secondary/40 tracking-[0.2em]">Dominant Style</span>
                <span className="font-bold text-primary text-base">{analysisResult.style}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-sage-light/10">
                <span className="text-[10px] font-black uppercase text-secondary/40 tracking-[0.2em]">Color Story</span>
                <span className="font-bold text-primary text-base">{analysisResult.primaryColor}</span>
              </div>
              <div className="flex justify-between items-center py-4 border-b border-sage-light/10">
                <span className="text-[10px] font-black uppercase text-secondary/40 tracking-[0.2em]">Usage Zone</span>
                <span className="font-bold text-primary text-base">{analysisResult.roomType}</span>
              </div>
              <div className="pt-2">
                <span className="text-[10px] font-black uppercase text-secondary/40 tracking-[0.2em] block mb-4">AI Design Note</span>
                <p className="text-sm text-secondary italic leading-relaxed opacity-80">"{analysisResult.vibe}"</p>
              </div>
            </div>
          </div>

          <div className="bg-sage p-10 rounded-[4rem] text-white shadow-2xl">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-6 opacity-80">Accent Pallete</h4>
            <div className="flex flex-wrap gap-3">
              {analysisResult.accentColors.map((color, i) => (
                <span key={i} className="px-5 py-3 bg-white/20 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-widest">{color}</span>
              ))}
            </div>
            <button onClick={() => setView('home')} className="w-full bg-white text-sage py-6 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl mt-12 active:scale-95 transition-all">Shop Matches</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-md mx-auto h-screen relative bg-background overflow-hidden shadow-2xl">
      <style>{` @keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } } `}</style>
      
      {view === 'login' && renderLogin()}
      {view === 'home' && renderHome()}
      {view === 'details' && renderDetails()}
      {view === 'cart' && renderCart()}
      {view === 'wishlist' && renderWishlist()}
      {view === 'analyze' && renderAnalyze()}
      {view === 'profile' && renderProfile()}
      {view === 'vendor-dashboard' && renderVendorDashboard()}
      {view === 'ar' && (
        <div className="fixed inset-0 z-[300] bg-black animate-in fade-in duration-500 flex flex-col">
          <div className="absolute top-0 w-full p-8 flex justify-between items-center z-[400]">
             <button onClick={()=>setView('details')} className="p-4 bg-white/10 backdrop-blur-xl rounded-full text-white active:scale-90 transition-all border border-white/20"><ArrowLeft size={24}/></button>
             <div className="bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
               <ScanEye size={16} className="text-sage" />
               <span className="text-white text-[9px] font-bold uppercase tracking-widest">AR Preview Mode</span>
             </div>
          </div>

          <ModelViewer 
            ref={arModelViewerRef}
            src={selectedProduct?.model3d} 
            ar 
            ar-modes="webxr scene-viewer quick-look" 
            ar-placement="floor"
            ar-scale="auto"
            camera-controls 
            interaction-prompt="auto"
            shadow-intensity="2" 
            power-preference="high-performance" 
            loading="eager" 
            style={{width:'100%', height:'100%', backgroundColor: 'transparent', flex: 1}}
          >
            {/* Help Prompt */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 flex flex-col items-center animate-pulse">
               <Box size={48} className="text-white mb-4" />
               <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] text-center">Place in your space</p>
            </div>
          </ModelViewer>

          <div className="p-10 bg-gradient-to-t from-black via-black/80 to-transparent z-[350] flex flex-col items-center gap-6">
             <div className="flex gap-8 opacity-60">
                <div className="flex flex-col items-center gap-2">
                   <div className="p-2 border border-white/30 rounded-lg"><Hand size={18} className="text-white" /></div>
                   <span className="text-white text-[8px] font-bold uppercase tracking-widest">Move</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="p-2 border border-white/30 rounded-lg"><RotateCw size={18} className="text-white" /></div>
                   <span className="text-white text-[8px] font-bold uppercase tracking-widest">Rotate</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                   <div className="p-2 border border-white/30 rounded-lg"><Maximize2 size={18} className="text-white" /></div>
                   <span className="text-white text-[8px] font-bold uppercase tracking-widest">Scale</span>
                </div>
             </div>
             
             <button 
                onClick={startARSession}
                className="w-full bg-sage text-white py-6 rounded-full font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(154,179,130,0.5)] active:scale-95 transition-all flex items-center justify-center gap-3"
             >
                <View size={20} />
                Start Spatial AR
             </button>
             <p className="text-white/40 text-[8px] font-medium uppercase tracking-widest text-center">Tap button to enter full AR spatial mode</p>
          </div>
        </div>
      )}

      {/* AI Visualizer Modal */}
      {showVisualizer && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col animate-in fade-in slide-in-from-bottom duration-300">
           <div className="p-8 flex justify-between items-center border-b border-sage-light/30">
              <h3 className="text-2xl font-black text-primary flex items-center gap-3"><Sparkles className="text-sage" /> AI Visualizer</h3>
              <button onClick={()=>{setShowVisualizer(false); setVisualizerStep('upload'); setVisualizerError(null);}} className="p-3 bg-sage-light/30 text-secondary rounded-full active:scale-90 transition-all"><X size={28} /></button>
           </div>
           <div className="flex-1 p-8 overflow-y-auto no-scrollbar pb-10">
              {visualizerError && <div className="mb-8 bg-red-50 border border-red-100 p-5 rounded-[2.5rem] flex gap-4 text-red-500 text-xs font-bold animate-in shake duration-500"><AlertCircle size={20} className="flex-shrink-0"/> {visualizerError}</div>}
              {visualizerStep === 'upload' && (
                <div className="space-y-10 animate-in slide-in-from-bottom duration-500">
                    <p className="text-secondary font-medium text-center px-10 opacity-70 leading-relaxed">AI will realistically place <span className="text-sage font-black">{selectedProduct?.name}</span> in your room environment.</p>
                    <label className="aspect-square rounded-[4rem] border-2 border-dashed border-sage-light bg-sage-light/10 flex flex-col items-center justify-center cursor-pointer active:bg-sage-light/20 transition-all overflow-hidden relative shadow-inner group">
                       <input type="file" className="hidden" accept="image/*" onChange={(e)=>{
                         const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onload=()=>setVisualizerInputImg(r.result as string); r.readAsDataURL(f);}
                       }}/>
                       {visualizerInputImg ? <img src={visualizerInputImg} className="w-full h-full object-cover" alt="Input Room" /> : <><Upload size={64} className="text-sage mb-6 opacity-40 group-hover:-translate-y-2 transition-transform" /><span className="text-sage font-black text-[10px] uppercase tracking-[0.2em]">Upload Room Environment</span></>}
                    </label>
                    <button disabled={!visualizerInputImg} onClick={handleProcessVisualization} className="w-full bg-sage text-white py-6 rounded-full font-black text-xs tracking-widest uppercase shadow-2xl disabled:opacity-30 active:scale-95 transition-all">Generate AR Scene</button>
                </div>
              )}
              {visualizerStep === 'processing' && (
                <div className="py-24 flex flex-col items-center text-center animate-in zoom-in duration-500">
                   <div className="relative mb-12">
                     <RefreshCw size={100} className="text-sage animate-spin" />
                     <div className="absolute inset-0 flex items-center justify-center"><Sparkles size={32} className="text-sage animate-pulse" /></div>
                   </div>
                   <h4 className="font-black text-primary text-2xl mb-5">Neural Scene Rendering</h4>
                   <div className="w-full max-w-[80%] bg-sage-light/40 h-3 rounded-full overflow-hidden mb-8 shadow-inner"><div className="h-full bg-sage transition-all duration-700 rounded-full" style={{width:`${processProgress}%`}}></div></div>
                   <p className="font-bold text-sage animate-pulse tracking-widest uppercase text-[10px]">{processStatus}</p>
                </div>
              )}
              {visualizerStep === 'result' && (
                <div className="space-y-10 animate-in zoom-in duration-700">
                    <div className="aspect-square rounded-[4rem] overflow-hidden shadow-2xl border-4 border-white"><img src={visualizerOutputImg || ''} className="w-full h-full object-cover" alt="Visualized Furniture" /></div>
                    <div className="flex gap-5">
                      <button onClick={()=>{setVisualizerStep('upload'); setVisualizerOutputImg(null);}} className="flex-1 bg-sage-light/50 text-sage py-6 rounded-full font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all border border-sage-light">Retry AI Gen</button>
                      <button onClick={()=>setShowVisualizer(false)} className="flex-1 bg-sage text-white py-6 rounded-full font-black text-[10px] uppercase shadow-2xl tracking-widest active:scale-95 transition-all">Save Preview</button>
                    </div>
                </div>
              )}
           </div>
        </div>
      )}

      {/* Navigation Bars */}
      {user?.role === 'customer' && !['login', 'ar'].includes(view) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] bg-sage rounded-full h-16 flex justify-between items-center px-8 shadow-2xl border border-white/20 z-50">
            <button onClick={() => setView('home')} className={`p-2.5 rounded-full transition-all ${view === 'home' || view === 'details' ? 'text-white bg-primary/20 scale-110' : 'text-white/60'}`}><Home size={22} /></button>
            <button onClick={() => { setScanStep('idle'); setAnalysisResult(null); setView('analyze'); }} className={`p-2.5 rounded-full transition-all ${view === 'analyze' ? 'text-white bg-primary/20 scale-110' : 'text-white/60'}`}><Search size={22} /></button>
            <button onClick={() => setView('cart')} className={`p-2.5 rounded-full transition-all ${view === 'cart' ? 'text-white bg-primary/20 scale-110' : 'text-white/60'}`}><ShoppingCart size={22} /></button>
            <button onClick={() => setView('profile')} className={`p-2.5 rounded-full transition-all ${view === 'profile' || view === 'wishlist' ? 'text-white bg-primary/20 scale-110' : 'text-white/60'}`}><User size={22} /></button>
        </div>
      )}

      {user?.role === 'vendor' && view === 'vendor-dashboard' && !isAddingProduct && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[85%] bg-sage rounded-full h-16 flex justify-between items-center px-8 shadow-2xl border border-white/20 z-50">
            <button onClick={() => setVendorSubView('overview')} className={`p-2.5 rounded-full transition-all ${vendorSubView === 'overview' ? 'text-white bg-primary/20 scale-110' : 'text-white/60'}`}><Layout size={22} /></button>
            <button onClick={() => setVendorSubView('inventory')} className={`p-2.5 rounded-full transition-all ${vendorSubView === 'inventory' ? 'text-white bg-primary/20 scale-110' : 'text-white/60'}`}><Package size={22} /></button>
            <button onClick={() => setVendorSubView('settings')} className={`p-2.5 rounded-full transition-all ${vendorSubView === 'settings' ? 'text-white bg-primary/20 scale-110' : 'text-white/60'}`}><Settings size={22} /></button>
        </div>
      )}
    </div>
  );
};

export default App;
