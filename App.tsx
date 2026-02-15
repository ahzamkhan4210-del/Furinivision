
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Camera, Maximize2, ArrowLeft, Layout, X, User, Heart, 
  Search, ChevronRight, Menu, Sparkles, Upload, RefreshCw, ShoppingBag, 
  Trash2, Box, Store, Users, Package, Settings, Home, LogOut, 
  CheckCircle2, Plus, ImageIcon, DollarSign, View, Loader2, Info, Scan, 
  RotateCw, RotateCcw, Zap, TriangleAlert, Dna, Hand, ScanEye, Move, 
  Scaling, Compass, AlertCircle
} from 'lucide-react';
import { MOCK_PRODUCTS } from './constants';
import { Product, AppView, CartItem, User as UserType, RoomAnalysis } from './types';
import { generateVisualPlacement, analyzeRoomImage } from './services/geminiService';
import { getProductsFromDB, saveProductsToDB, deleteProductFromDB, clearAllProductsDB } from './services/storageService';

const AUTH_STORAGE_KEY = 'furnivision_auth_session';
const ModelViewer = 'model-viewer' as any;

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('login');
  const [user, setUser] = useState<UserType | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [vendorSubView, setVendorSubView] = useState<'overview' | 'inventory' | 'settings'>('overview');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [roomImage, setRoomImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<RoomAnalysis | null>(null);
  const [scanStep, setScanStep] = useState<'idle' | 'scanning' | 'results'>('idle');
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: 'Sofa', description: '', image: '', model3d: '', material: 'Oak', annotation: '' });
  const [showVisualizer, setShowVisualizer] = useState(false);
  const [visualizerStep, setVisualizerStep] = useState<'upload' | 'processing' | 'result'>('upload');
  const [visualizerInputImg, setVisualizerInputImg] = useState<string | null>(null);
  const [visualizerOutputImg, setVisualizerOutputImg] = useState<string | null>(null);
  const [visualizerError, setVisualizerError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'image' | '3d'>('image');
  const [arRotation, setArRotation] = useState(0);
  const [arScale, setArScale] = useState(1);
  const [isScanning, setIsScanning] = useState(true);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState("Initializing AI...");

  const modelViewerRef = useRef<any>(null);
  const arModelViewerRef = useRef<any>(null);

  useEffect(() => {
    const initApp = async () => {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const u = JSON.parse(saved);
        setUser(u);
        setView(u.role === 'vendor' ? 'vendor-dashboard' : 'home');
      }
      const dbProducts = await getProductsFromDB();
      setProducts(dbProducts.length > 0 ? dbProducts : MOCK_PRODUCTS);
    };
    initApp();
  }, []);

  useEffect(() => {
    if (view === 'ar') {
      setIsScanning(true);
      const timer = setTimeout(() => setIsScanning(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const handleLogin = (role: 'customer' | 'vendor') => {
    const u: UserType = { id: 'u1', name: role === 'customer' ? 'Alexander' : 'FurniVendor', email: '', role };
    setUser(u);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
    setView(role === 'vendor' ? 'vendor-dashboard' : 'home');
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setView('login');
  };

  const handleInitiateScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result as string;
      setRoomImage(b64);
      setScanStep('scanning');
      try {
        const res = await analyzeRoomImage(b64);
        setAnalysisResult(res);
        setScanStep('results');
      } catch (err) {
        setScanStep('idle');
        alert("Spatial mapping failed. Try a photo with more light.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProcessVisualization = async () => {
    if (!visualizerInputImg || !selectedProduct) return;
    setVisualizerStep('processing');
    setVisualizerError(null);
    setProcessProgress(0);
    const interval = setInterval(() => {
      setProcessProgress(p => {
        if (p < 30) setProcessStatus("Analyzing room geometry...");
        else if (p < 60) setProcessStatus("Matching ambient light...");
        else setProcessStatus("Rendering neural shadows...");
        return p < 92 ? p + 4 : p;
      });
    }, 250);
    
    try {
      const res = await generateVisualPlacement(visualizerInputImg, selectedProduct.image, selectedProduct.name, selectedProduct.style, selectedProduct.description);
      setVisualizerOutputImg(res);
      setVisualizerStep('result');
    } catch (err: any) {
      setVisualizerError(err.message || "Neural placement failed.");
      setVisualizerStep('upload');
    } finally {
      clearInterval(interval);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'model') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    
    // Size check for mobile responsiveness
    if (file.size > 20 * 1024 * 1024) {
      setFileError("File too large. Maximum 20MB allowed.");
      return;
    }

    setIsProcessingFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      if (type === 'image') setNewProduct(p => ({ ...p, image: res }));
      else setNewProduct(p => ({ ...p, model3d: res }));
      setIsProcessingFile(false);
    };
    reader.onerror = () => {
      setFileError("Error reading file.");
      setIsProcessingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.image) {
      alert("Please fill in basic details and upload an image.");
      return;
    }

    const p: Product = {
      id: Date.now().toString(),
      name: newProduct.name,
      category: newProduct.category,
      price: parseFloat(newProduct.price),
      dimensions: { width: 100, height: 100, depth: 100, unit: 'cm' },
      image: newProduct.image,
      model3d: newProduct.model3d,
      description: newProduct.description || "A premium furniture piece.",
      style: "Modern",
      material: [newProduct.material],
      colors: ["Natural"],
      vendorId: user?.id || 'v1',
      vendorName: user?.name || 'Vendor',
      reviews: []
    };
    const updated = [p, ...products];
    setProducts(updated);
    await saveProductsToDB(updated);
    setIsAddingProduct(false);
    setNewProduct({ name: '', price: '', category: 'Sofa', description: '', image: '', model3d: '', material: 'Oak', annotation: '' });
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Permanently remove this listing?")) {
      const updated = products.filter(p => p.id !== id);
      setProducts(updated);
      await deleteProductFromDB(id);
    }
  };

  const resetArPlacement = () => {
    setArRotation(0);
    setArScale(1);
    if (arModelViewerRef.current) {
      arModelViewerRef.current.cameraOrbit = "0deg 75deg 105%";
    }
  };

  const startARSession = () => {
    if (arModelViewerRef.current) {
      arModelViewerRef.current.activateAR();
    }
  };

  const toggleWishlist = (p: Product, e?: React.MouseEvent) => {
     if(e) e.stopPropagation();
     setWishlist(prev => prev.some(item => item.id === p.id) ? prev.filter(item => item.id !== p.id) : [...prev, p]);
  };

  const isWishlisted = (id: string) => wishlist.some(item => item.id === id);

  const renderLogin = () => (
    <div className="fixed inset-0 z-[100] bg-sage flex flex-col justify-between overflow-hidden">
      <div className="pt-20 px-10 text-center text-white z-20">
        <h1 className="text-5xl font-extrabold mb-4 leading-tight tracking-tighter drop-shadow-lg">FurniVision</h1>
        <p className="text-white/80 text-sm max-w-xs mx-auto font-medium">Elevating Spatial Commerce with Neural Intelligence</p>
      </div>
      <div className="bg-white rounded-t-[6rem] p-12 pt-16 heavy-shadow z-20">
        <h3 className="text-primary font-bold text-center mb-10 uppercase tracking-[0.2em] text-[10px]">Portal Identity</h3>
        <div className="grid grid-cols-2 gap-6 mb-12">
          <button onClick={() => handleLogin('customer')} className="flex flex-col items-center gap-5 p-8 bg-sage-light/30 rounded-[3.5rem] border border-sage-light active:bg-sage active:text-white transition-all group shadow-sm">
            <Users size={36} className="text-sage group-active:text-white" />
            <span className="font-bold text-sm">Customer</span>
          </button>
          <button onClick={() => handleLogin('vendor')} className="flex flex-col items-center gap-5 p-8 bg-sage-light/30 rounded-[3.5rem] border border-sage-light active:bg-sage active:text-white transition-all group shadow-sm">
            <Store size={36} className="text-sage group-active:text-white" />
            <span className="font-bold text-sm">Vendor</span>
          </button>
        </div>
        <p className="text-center text-[9px] text-secondary/30 font-black uppercase tracking-[0.4em]">v2.5 Spatial Protocol</p>
      </div>
    </div>
  );

  const renderHome = () => (
    <div className="min-h-screen bg-background pb-40 overflow-y-auto no-scrollbar">
      <div className="bg-white px-8 pt-16 pb-12 rounded-b-[4rem] soft-shadow mb-10 border-b border-sage-light/20">
        <div className="flex justify-between items-center text-primary mb-10">
          <button className="p-3 bg-sage-light/20 rounded-2xl"><Menu size={24} /></button>
          <div onClick={() => setView('profile')} className="w-12 h-12 rounded-full border-2 border-sage overflow-hidden shadow-xl cursor-pointer ring-4 ring-white"><img src="https://i.pravatar.cc/100" /></div>
        </div>
        <h2 className="text-5xl font-extrabold text-primary leading-[1.1] tracking-tighter">Design Your<br/><span className="text-sage">Sanctuary</span></h2>
      </div>
      <div className="px-8 grid grid-cols-2 gap-6">
        {products.map(p => (
          <div key={p.id} onClick={() => { setSelectedProduct(p); setView('details'); }} className="bg-white p-4 rounded-[2.5rem] soft-shadow active:scale-95 transition-all cursor-pointer border border-transparent hover:border-sage/30 group">
            <div className="aspect-square rounded-[2rem] overflow-hidden mb-5 bg-sage-light/10 relative">
               <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
               <button onClick={(e) => toggleWishlist(p, e)} className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-colors ${isWishlisted(p.id) ? 'bg-red-50 text-red-500' : 'bg-black/10 text-white'}`}><Heart size={14} className={isWishlisted(p.id) ? 'fill-current' : ''} /></button>
            </div>
            <h4 className="font-bold text-sm text-primary truncate px-1">{p.name}</h4>
            <div className="flex justify-between items-center mt-2 px-1">
               <p className="text-sage font-black text-sm">${p.price}</p>
               {p.model3d && <Box size={14} className="text-secondary opacity-20" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDetails = () => selectedProduct && (
    <div className="min-h-screen bg-background pb-32 overflow-y-auto no-scrollbar h-screen">
      <div className="p-8 fixed top-0 w-full z-40 flex justify-between pointer-events-none">
        <button onClick={() => setView('home')} className="p-4 bg-white/80 backdrop-blur-xl rounded-full soft-shadow pointer-events-auto active:scale-90 transition-all text-primary"><ArrowLeft size={20} /></button>
        <button onClick={() => setView('cart')} className="p-4 bg-white/80 backdrop-blur-xl rounded-full soft-shadow text-sage relative pointer-events-auto active:scale-90 transition-all">
          <ShoppingCart size={20} />
          {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-sage text-white text-[8px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">{cart.length}</span>}
        </button>
      </div>
      <div className="pt-24 px-8 pb-32 flex flex-col items-center">
        <div className="w-full aspect-[4/5] rounded-[4.5rem] overflow-hidden shadow-2xl relative border-8 border-white bg-white group/preview">
          {viewMode === 'image' ? (
            <img src={selectedProduct.image} className="w-full h-full object-contain p-8 animate-in fade-in zoom-in duration-500" />
          ) : (
            <ModelViewer ref={modelViewerRef} src={selectedProduct.model3d} camera-controls auto-rotate shadow-intensity="1.5" environment-image="neutral" style={{ width: '100%', height: '100%' }} />
          )}
          <div className="absolute top-8 right-8 flex flex-col gap-5">
            {selectedProduct.model3d && (
              <button onClick={() => setViewMode(viewMode === '3d' ? 'image' : '3d')} className={`p-5 rounded-[1.8rem] soft-shadow transition-all active:scale-90 ${viewMode === '3d' ? 'bg-sage text-white' : 'bg-white/95 text-sage border border-sage-light'}`}>
                {viewMode === '3d' ? <ImageIcon size={22} /> : <Box size={22} />}
              </button>
            )}
            <button onClick={() => setShowVisualizer(true)} className="p-5 bg-primary text-white rounded-[1.8rem] shadow-xl active:scale-110 transition-transform"><Sparkles size={22} /></button>
          </div>
          {selectedProduct.model3d && (
            <button onClick={() => setView('ar')} className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-sage text-white px-10 py-4 rounded-full font-black text-[10px] uppercase shadow-2xl flex items-center gap-3 tracking-[0.2em] active:scale-95 transition-all">
              <Move size={14} /> Project into AR
            </button>
          )}
        </div>
        <div className="w-full mt-12 space-y-6">
          <div className="flex justify-between items-start">
            <h2 className="text-4xl font-extrabold text-primary leading-tight max-w-[75%] tracking-tighter">{selectedProduct.name}</h2>
            <span className="text-3xl font-black text-sage tracking-tighter">${selectedProduct.price}</span>
          </div>
          <p className="text-secondary leading-relaxed opacity-70 text-base">{selectedProduct.description}</p>
          <div className="grid grid-cols-2 gap-4 pt-6">
             <div className="bg-sage-light/30 p-5 rounded-[2.2rem] border border-sage-light text-center">
                <span className="text-[9px] font-black uppercase text-secondary/40 tracking-widest block mb-1">Style</span>
                <p className="font-bold text-primary text-sm">{selectedProduct.style}</p>
             </div>
             <div className="bg-sage-light/30 p-5 rounded-[2.2rem] border border-sage-light text-center">
                <span className="text-[9px] font-black uppercase text-secondary/40 tracking-widest block mb-1">Material</span>
                <p className="font-bold text-primary text-sm">{selectedProduct.material[0]}</p>
             </div>
          </div>
          <button onClick={() => { setCart(c => [...c, { product: selectedProduct, quantity: 1 }]); setView('cart'); }} className="w-full bg-primary text-white font-black py-7 rounded-[3rem] shadow-2xl text-[11px] tracking-[0.3em] uppercase active:scale-[0.98] transition-all mt-6">Secure Your Piece</button>
        </div>
      </div>
    </div>
  );

  const renderArView = () => (
    <div className="fixed inset-0 z-[300] bg-black animate-in fade-in duration-700 flex flex-col">
      {isScanning && (
        <div className="absolute inset-0 z-[450] bg-black/40 backdrop-blur-[3px] flex flex-col items-center justify-center p-12 text-center text-white animate-pulse">
          <Scan size={90} className="mb-10 opacity-30" />
          <h3 className="text-3xl font-black mb-4 uppercase tracking-[0.2em]">Spatial Sync</h3>
          <p className="opacity-60 text-sm font-medium">Calibrating floor plane for furniture projection.</p>
        </div>
      )}
      <div className="absolute top-0 w-full p-8 flex justify-between items-center z-[400]">
         <button onClick={()=>setView('details')} className="p-5 bg-white/10 backdrop-blur-2xl rounded-full text-white active:scale-90 transition-all border border-white/10 shadow-2xl"><ArrowLeft size={24}/></button>
         <div className="bg-white/10 backdrop-blur-2xl px-6 py-3 rounded-full border border-white/10 flex items-center gap-3 shadow-2xl">
           <Zap size={14} className="text-sage" />
           <span className="text-white text-[10px] font-black uppercase tracking-widest">Real-Time Reality</span>
         </div>
      </div>
      <ModelViewer 
        ref={arModelViewerRef} src={selectedProduct?.model3d} ar ar-modes="webxr scene-viewer quick-look" ar-placement="floor" ar-scale="auto" camera-controls shadow-intensity="2.5" 
        rotation={`0deg ${arRotation}deg 0deg`} scale={`${arScale} ${arScale} ${arScale}`} style={{width:'100%', height:'100%', flex: 1}}
      />
      <div className="p-10 bg-gradient-to-t from-black via-black/90 to-transparent z-[350] space-y-10">
         <div className="flex items-center gap-8 text-white">
            <Compass size={24} className="opacity-30" />
            <input type="range" min="0" max="360" value={arRotation} onChange={(e)=>setArRotation(parseInt(e.target.value))} className="flex-1 accent-sage h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer" />
            <span className="text-[12px] font-black min-w-[40px] text-sage text-right">{arRotation}°</span>
         </div>
         <div className="flex justify-between gap-6">
            <div className="flex-1 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] p-1.5 flex border border-white/10 text-white/50 text-[11px] font-black shadow-xl">
               <button onClick={()=>setArScale(0.7)} className={`flex-1 py-4 rounded-[1.8rem] transition-all ${arScale === 0.7 ? 'bg-sage text-white shadow-lg' : ''}`}>70%</button>
               <button onClick={()=>setArScale(1)} className={`flex-1 py-4 rounded-[1.8rem] transition-all ${arScale === 1 ? 'bg-sage text-white shadow-lg' : ''}`}>AUTO</button>
               <button onClick={()=>setArScale(1.3)} className={`flex-1 py-4 rounded-[1.8rem] transition-all ${arScale === 1.3 ? 'bg-sage text-white shadow-lg' : ''}`}>130%</button>
            </div>
            <button onClick={resetArPlacement} className="p-6 bg-white/5 backdrop-blur-2xl rounded-[2.5rem] text-white border border-white/10 active:scale-90 transition-all shadow-xl"><RefreshCw size={26}/></button>
         </div>
         <button onClick={startARSession} className="w-full bg-sage text-white py-8 rounded-[3.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-[0_0_40px_rgba(154,179,130,0.4)] active:scale-95 transition-all">Initialize Spatial View</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto h-screen relative bg-background overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.2)]">
      {view === 'login' && renderLogin()}
      {view === 'home' && renderHome()}
      {view === 'details' && renderDetails()}
      {view === 'ar' && renderArView()}
      
      {view === 'cart' && (
        <div className="p-10 pt-24 space-y-10 overflow-y-auto h-screen no-scrollbar animate-in slide-in-from-right duration-300">
          <button onClick={() => setView('home')} className="fixed top-10 left-10 p-4 bg-white rounded-full soft-shadow text-secondary active:scale-90 transition-transform"><ArrowLeft size={22} /></button>
          <h2 className="text-4xl font-extrabold text-primary tracking-tighter">Your Collection</h2>
          {cart.length === 0 ? (
            <div className="py-24 text-center text-secondary opacity-20 italic font-bold flex flex-col items-center gap-6">
               <ShoppingBag size={80} />
               <p className="text-xl">Your bag is currently empty.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {cart.map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-[3rem] flex items-center gap-6 soft-shadow border border-white animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className="w-24 h-24 rounded-3xl overflow-hidden bg-sage-light/10 shadow-inner"><img src={item.product.image} className="w-full h-full object-cover" /></div>
                  <div className="flex-1"><h4 className="font-bold text-primary truncate leading-tight">{item.product.name}</h4><p className="text-sage font-black text-sm uppercase mt-1">${item.product.price}</p></div>
                  <button onClick={() => setCart(c => c.filter((_, idx) => idx !== i))} className="text-red-400 p-4 bg-red-50 rounded-[1.8rem] active:bg-red-400 active:text-white transition-all"><Trash2 size={22} /></button>
                </div>
              ))}
              <div className="mt-14 p-10 bg-primary rounded-[4rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><Zap size={100} /></div>
                <div><span className="text-[10px] font-black uppercase opacity-40 block mb-1 tracking-widest">Investment Total</span><span className="text-4xl font-black tracking-tighter">${cart.reduce((s, i) => s + i.product.price, 0).toLocaleString()}</span></div>
                <button className="bg-sage text-white px-10 py-5 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 relative z-10">Checkout</button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'analyze' && (
        <div className="p-10 pt-24 h-screen overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-500">
          <button onClick={() => setView('home')} className="fixed top-10 left-10 p-4 bg-white rounded-full soft-shadow active:scale-90 transition-all"><ArrowLeft size={22} /></button>
          <h2 className="text-4xl font-extrabold text-primary mb-12 tracking-tighter">Spatial <span className="text-sage">Analysis</span></h2>
          {scanStep === 'idle' && (
            <div className="space-y-12">
              <label className="aspect-[4/3] rounded-[4.5rem] border-4 border-dashed border-sage-light bg-sage-light/5 flex flex-col items-center justify-center cursor-pointer transition-all active:bg-sage-light/10 group shadow-inner overflow-hidden relative">
                <input type="file" className="hidden" accept="image/*" onChange={handleInitiateScan}/>
                <Camera size={90} className="text-sage opacity-20 mb-8 group-hover:scale-110 transition-transform duration-500" />
                <span className="text-sage font-black text-[11px] uppercase tracking-[0.3em]">Snapshot Environment</span>
              </label>
              <div className="bg-white p-10 rounded-[3.5rem] soft-shadow border border-sage-light/20 space-y-6">
                 <div className="flex items-center gap-4"><Info size={24} className="text-sage" /><h4 className="font-black text-[11px] uppercase text-primary tracking-widest">Why Map Your Room?</h4></div>
                 <p className="text-sm font-medium text-secondary leading-relaxed">Our spatial engine analyzes light vector fields and stylistic DNA to ensure every furniture piece coordinates with your existing sanctuary.</p>
              </div>
            </div>
          )}
          {scanStep === 'scanning' && (
            <div className="py-32 flex flex-col items-center text-center">
              <div className="relative mb-14">
                 <RefreshCw size={110} className="text-sage animate-spin-slow opacity-80" />
                 <div className="absolute inset-0 flex items-center justify-center"><Dna size={40} className="text-sage animate-pulse" /></div>
              </div>
              <h4 className="font-black text-primary uppercase tracking-[0.4em] text-[12px] mb-4">Parsing Reality</h4>
              <p className="text-secondary/40 text-[9px] font-black uppercase tracking-[0.2em] animate-pulse">Extracting Structural Metadata...</p>
            </div>
          )}
          {scanStep === 'results' && analysisResult && (
            <div className="space-y-10 animate-in fade-in duration-1000">
               <div className="aspect-[4/3] rounded-[4.5rem] overflow-hidden shadow-2xl border-4 border-white relative group">
                  <img src={roomImage || ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-xl px-6 py-2 rounded-full text-white text-[9px] font-black uppercase tracking-widest border border-white/20 shadow-xl">Environment Scanned</div>
               </div>
               <div className="bg-white p-10 rounded-[4.5rem] soft-shadow border border-sage-light/20 space-y-8">
                  <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-1"><span className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">Style Genome</span><p className="font-bold text-primary text-xl leading-tight">{analysisResult.style}</p></div>
                    <div className="space-y-1"><span className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">Base Tone</span><p className="font-bold text-primary text-xl leading-tight">{analysisResult.primaryColor}</p></div>
                  </div>
                  <div className="space-y-2"><span className="text-[10px] font-black text-secondary/30 uppercase tracking-widest">Atmosphere Node</span><p className="font-bold text-sage italic leading-relaxed text-base">"{analysisResult.vibe}"</p></div>
                  <button onClick={() => setScanStep('idle')} className="w-full bg-sage-light/40 text-sage py-7 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.3em] mt-6 active:scale-95 transition-all">New Spatial Session</button>
               </div>
            </div>
          )}
        </div>
      )}

      {showVisualizer && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
           <div className="p-10 flex justify-between items-center border-b border-sage-light/20 bg-white/80 backdrop-blur-xl sticky top-0 z-10">
              <h3 className="text-2xl font-black text-primary flex items-center gap-4 tracking-tighter"><Sparkles className="text-sage" /> Neural Vision</h3>
              <button onClick={()=>{setShowVisualizer(false); setVisualizerStep('upload'); setVisualizerError(null);}} className="p-4 bg-sage-light/30 text-secondary rounded-full active:scale-90 transition-all"><X size={28} /></button>
           </div>
           <div className="flex-1 p-10 overflow-y-auto no-scrollbar pb-20">
              {visualizerError && <div className="mb-10 bg-red-50 p-8 rounded-[3.5rem] flex gap-5 text-red-500 text-sm font-bold animate-in shake border border-red-100"><AlertCircle size={28} className="flex-shrink-0" /> {visualizerError}</div>}
              {visualizerStep === 'upload' && (
                <div className="space-y-12 animate-in slide-in-from-bottom duration-500">
                    <p className="text-secondary text-center px-10 text-base font-medium leading-relaxed">Synthesize a high-fidelity preview of <span className="text-sage font-black">{selectedProduct?.name}</span> within your specific environmental lighting.</p>
                    <label className="aspect-square rounded-[5.5rem] border-4 border-dashed border-sage-light bg-sage-light/5 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group shadow-inner">
                       <input type="file" className="hidden" accept="image/*" onChange={(e)=>{ const f=e.target.files?.[0]; if(f){ const r=new FileReader(); r.onload=()=>setVisualizerInputImg(r.result as string); r.readAsDataURL(f);} }}/>
                       {visualizerInputImg ? <img src={visualizerInputImg} className="w-full h-full object-cover" /> : <><Upload size={90} className="text-sage mb-10 opacity-20" /><span className="text-sage font-black text-[11px] uppercase tracking-[0.4em]">Anchor Plate</span></>}
                    </label>
                    <button disabled={!visualizerInputImg} onClick={handleProcessVisualization} className="w-full bg-primary text-white py-8 rounded-[3rem] font-black text-[12px] tracking-[0.4em] uppercase shadow-2xl disabled:opacity-20 active:scale-95 transition-all">Generate Projection</button>
                </div>
              )}
              {visualizerStep === 'processing' && (
                <div className="py-32 flex flex-col items-center text-center animate-in zoom-in duration-700">
                   <div className="relative mb-16">
                      <RefreshCw size={130} className="text-sage animate-spin-slow opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center"><Sparkles size={50} className="text-sage animate-pulse" /></div>
                   </div>
                   <h4 className="font-black text-primary text-3xl mb-8 tracking-tighter uppercase">Computing Scene</h4>
                   <div className="w-full max-w-[85%] bg-sage-light/30 h-4 rounded-full overflow-hidden shadow-inner mb-8">
                      <div className="h-full bg-sage shadow-[0_0_25px_rgba(154,179,130,0.6)] transition-all duration-700 rounded-full" style={{width:`${processProgress}%`}}></div>
                   </div>
                   <p className="font-black text-sage animate-pulse tracking-[0.4em] uppercase text-[10px]">{processStatus}</p>
                </div>
              )}
              {visualizerStep === 'result' && (
                <div className="space-y-12 animate-in zoom-in-up duration-1000">
                    <div className="aspect-square rounded-[5.5rem] overflow-hidden shadow-2xl border-8 border-white relative group">
                       <img src={visualizerOutputImg || ''} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/10 group-active:opacity-0 transition-opacity"></div>
                       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-2xl px-8 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] border border-white/20 shadow-2xl">Neural Vision Result</div>
                    </div>
                    <div className="flex gap-6">
                       <button onClick={()=>{setVisualizerStep('upload'); setVisualizerOutputImg(null);}} className="flex-1 bg-sage-light/40 text-sage py-8 rounded-[3rem] font-black uppercase text-[11px] tracking-[0.2em] active:scale-95 transition-all border border-sage-light/20">Recalibrate</button>
                       <button onClick={()=>setShowVisualizer(false)} className="flex-1 bg-primary text-white py-8 rounded-[3rem] font-black uppercase text-[11px] shadow-2xl tracking-[0.2em] active:scale-95 transition-all">Save Preview</button>
                    </div>
                </div>
              )}
           </div>
        </div>
      )}

      {user?.role === 'customer' && !['login', 'ar'].includes(view) && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[90%] bg-primary/95 backdrop-blur-2xl rounded-full h-22 flex justify-between items-center px-12 shadow-[0_30px_70px_rgba(0,0,0,0.5)] z-50 border border-white/10 ring-1 ring-white/20">
          <button onClick={() => setView('home')} className={`p-5 rounded-full transition-all duration-500 ${view === 'home' || view === 'details' ? 'text-sage scale-125 bg-white/5' : 'text-white/30 hover:text-white/60'}`}><Home size={28} /></button>
          <button onClick={() => { setScanStep('idle'); setAnalysisResult(null); setView('analyze'); }} className={`p-5 rounded-full transition-all duration-500 ${view === 'analyze' ? 'text-sage scale-125 bg-white/5' : 'text-white/30 hover:text-white/60'}`}><Maximize2 size={28} /></button>
          <button onClick={() => setView('cart')} className={`p-5 rounded-full transition-all duration-500 ${view === 'cart' ? 'text-sage scale-125 bg-white/5' : 'text-white/30 hover:text-white/60'}`}><ShoppingCart size={28} /></button>
          <button onClick={() => setView('profile')} className={`p-5 rounded-full transition-all duration-500 ${view === 'profile' || view === 'wishlist' ? 'text-sage scale-125 bg-white/5' : 'text-white/30 hover:text-white/60'}`}><User size={28} /></button>
        </div>
      )}

      {view === 'profile' && (
        <div className="p-10 pt-24 h-screen bg-background overflow-y-auto no-scrollbar animate-in slide-in-from-left duration-500">
           <button onClick={() => setView('home')} className="fixed top-10 left-10 p-4 bg-white rounded-full soft-shadow text-secondary active:scale-90 transition-all"><ArrowLeft size={22} /></button>
           <div className="flex flex-col items-center mb-16 pt-10">
             <div className="w-36 h-36 rounded-[4rem] border-4 border-sage overflow-hidden mb-8 shadow-2xl rotate-3"><img src="https://i.pravatar.cc/250" className="-rotate-3 scale-110" /></div>
             <h3 className="text-4xl font-extrabold text-primary tracking-tighter">{user?.name}</h3>
             <span className="text-[11px] text-secondary font-black uppercase tracking-[0.4em] opacity-40 mt-3">{user?.role} Protocol</span>
           </div>
           <div className="space-y-6">
              <button onClick={() => setView('wishlist')} className="w-full bg-white p-10 rounded-[4rem] soft-shadow flex items-center justify-between group active:scale-[0.98] transition-all border border-transparent hover:border-sage-light/20">
                <div className="flex items-center gap-6"><div className="p-5 bg-red-50 text-red-500 rounded-[2rem] shadow-sm"><Heart size={26} /></div><span className="font-black text-primary uppercase text-[11px] tracking-widest">Saved Collection</span></div>
                <span className="bg-red-50 text-red-500 px-5 py-1.5 rounded-full text-[10px] font-black shadow-inner">{wishlist.length}</span>
              </button>
              <button onClick={handleLogout} className="w-full bg-red-50 text-red-500 py-10 rounded-[4rem] font-black uppercase text-[12px] tracking-[0.4em] mt-12 active:bg-red-500 active:text-white transition-all shadow-sm border border-red-100">End Session</button>
           </div>
        </div>
      )}

      {view === 'wishlist' && (
        <div className="p-10 pt-24 h-screen bg-background overflow-y-auto no-scrollbar animate-in zoom-in duration-300">
          <button onClick={() => setView('profile')} className="fixed top-10 left-10 p-4 bg-white rounded-full soft-shadow text-secondary active:scale-90 transition-all"><ArrowLeft size={22} /></button>
          <h2 className="text-4xl font-extrabold text-primary mb-12 tracking-tighter">Your Favorites</h2>
          {wishlist.length === 0 ? (
            <div className="py-24 text-center opacity-20 font-bold italic flex flex-col items-center gap-6">
               <Heart size={80} />
               <p className="text-xl">Your collection is empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              {wishlist.map(p => (
                <div key={p.id} onClick={() => { setSelectedProduct(p); setView('details'); }} className="bg-white p-5 rounded-[3rem] soft-shadow active:scale-95 transition-all cursor-pointer border border-transparent hover:border-sage/20 group">
                  <div className="aspect-square rounded-[2.2rem] overflow-hidden mb-5 bg-sage-light/10 shadow-inner"><img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /></div>
                  <h4 className="font-bold text-sm text-primary truncate leading-tight px-1">{p.name}</h4>
                  <p className="text-sage font-black text-xs mt-2 uppercase tracking-widest px-1">${p.price}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {user?.role === 'vendor' && view === 'vendor-dashboard' && (
        <div className="p-10 pt-24 h-screen overflow-y-auto no-scrollbar animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-16">
            <div><h2 className="text-5xl font-extrabold text-primary tracking-tighter">Vendor <span className="text-sage">OS</span></h2><p className="text-[10px] font-black uppercase text-secondary/40 tracking-[0.4em] mt-3">Spatial Logistics Hub</p></div>
            <button onClick={handleLogout} className="p-5 bg-red-50 text-red-500 rounded-full active:scale-90 transition-transform shadow-sm"><LogOut size={28}/></button>
          </div>
          {isAddingProduct ? (
            <div className="bg-white p-10 rounded-[5rem] soft-shadow space-y-8 animate-in zoom-in-up duration-500 border border-sage-light/20 mb-20">
               <div className="flex justify-between items-center mb-6"><h4 className="font-black text-primary uppercase text-[11px] tracking-[0.2em]">Deploy New Listing</h4><button onClick={() => setIsAddingProduct(false)} className="p-3 bg-secondary/5 rounded-full"><X size={20}/></button></div>
               <div className="space-y-6">
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-secondary/30 ml-6">Product Identity</label><input type="text" placeholder="e.g. Zenit Sofa System" className="w-full bg-sage-light/10 border-none rounded-[2rem] p-6 text-sm font-bold placeholder:text-secondary/30 focus:ring-4 focus:ring-sage/20 transition-all" value={newProduct.name} onChange={e=>setNewProduct({...newProduct, name: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-secondary/30 ml-6">MSRP Value ($)</label><input type="number" placeholder="2499" className="w-full bg-sage-light/10 border-none rounded-[2rem] p-6 text-sm font-bold placeholder:text-secondary/30 focus:ring-4 focus:ring-sage/20 transition-all" value={newProduct.price} onChange={e=>setNewProduct({...newProduct, price: e.target.value})} /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black uppercase text-secondary/30 ml-6">Design Philosophy</label><textarea placeholder="Describe dimensions and craft..." className="w-full bg-sage-light/10 border-none rounded-[2.5rem] p-7 text-sm font-bold placeholder:text-secondary/30 focus:ring-4 focus:ring-sage/20 transition-all h-40 no-scrollbar" value={newProduct.description} onChange={e=>setNewProduct({...newProduct, description: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-6">
                    <label className="flex flex-col items-center gap-4 p-10 bg-sage-light/10 rounded-[3rem] border-2 border-dashed border-sage/20 cursor-pointer active:bg-sage/10 transition-all text-center group">
                       <input type="file" className="hidden" accept="image/*" onChange={e=>handleFileUpload(e, 'image')} />
                       <ImageIcon size={36} className="text-sage group-hover:scale-125 transition-transform" />
                       <span className="text-[9px] font-black text-sage uppercase tracking-widest">{newProduct.image ? 'Identity Plate OK' : 'Snapshot'}</span>
                    </label>
                    <label className="flex flex-col items-center gap-4 p-10 bg-sage-light/10 rounded-[3rem] border-2 border-dashed border-sage/20 cursor-pointer active:bg-sage/10 transition-all text-center group">
                       <input type="file" className="hidden" accept=".glb" onChange={e=>handleFileUpload(e, 'model')} />
                       <Box size={36} className="text-sage group-hover:scale-125 transition-transform" />
                       <span className="text-[9px] font-black text-sage uppercase tracking-widest">{newProduct.model3d ? '3D Mesh OK' : 'GLB Mesh'}</span>
                    </label>
                  </div>
                  {fileError && <p className="text-red-500 text-[10px] font-black text-center p-4 bg-red-50 rounded-[1.5rem]">{fileError}</p>}
                  <button onClick={handleAddProduct} disabled={isProcessingFile} className="w-full bg-sage text-white py-8 rounded-[3rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all mt-10 shadow-[0_20px_40px_rgba(154,179,130,0.3)]">{isProcessingFile ? <Loader2 className="animate-spin mx-auto"/> : 'Publish To Reality'}</button>
               </div>
            </div>
          ) : (
            <div className="space-y-12 pb-32">
              <div className="grid grid-cols-2 gap-8">
                <div className="bg-sage p-10 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-end min-h-[180px]">
                  <div className="absolute top-0 right-0 p-8 opacity-20 rotate-12"><Package size={80} /></div>
                  <span className="text-[10px] font-black uppercase opacity-60 tracking-[0.3em] mb-2">Live Inventory</span>
                  <p className="text-5xl font-black tracking-tighter">{products.length}</p>
                </div>
                <button onClick={() => setIsAddingProduct(true)} className="bg-white p-10 rounded-[4.5rem] soft-shadow border-4 border-dashed border-sage-light flex flex-col items-center justify-center gap-4 group active:bg-sage-light/10 transition-all hover:scale-105 duration-300">
                  <Plus size={50} className="text-sage group-hover:rotate-90 transition-transform duration-500" />
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">Add Item</span>
                </button>
              </div>
              <div className="space-y-6">
                <h4 className="text-[11px] font-black uppercase text-secondary/30 tracking-[0.4em] ml-2 mb-4">Current Catalog</h4>
                {products.map((p, i) => (
                  <div key={p.id} className="bg-white p-6 rounded-[3.5rem] soft-shadow flex items-center gap-6 border border-white hover:border-sage/20 transition-all animate-in slide-in-from-bottom duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="w-24 h-24 rounded-[2rem] overflow-hidden bg-sage-light/10 relative shadow-inner">
                       <img src={p.image} className="w-full h-full object-cover" />
                       {p.model3d && <div className="absolute top-2 right-2 bg-sage p-1.5 rounded-full text-white shadow-xl"><Box size={10}/></div>}
                    </div>
                    <div className="flex-1"><h4 className="font-bold text-base text-primary leading-tight tracking-tight">{p.name}</h4><p className="text-sage font-black text-sm mt-1 uppercase tracking-tighter">${p.price.toLocaleString()}</p></div>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-5 text-red-400 bg-red-50 rounded-[2rem] active:bg-red-500 active:text-white transition-all shadow-sm"><Trash2 size={24} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
