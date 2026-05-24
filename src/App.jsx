import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup 
} from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { 
  Store, Package, Edit3, Save, Home, Plus, CheckCircle, ShoppingBag, 
  User, LogIn, ChevronRight, Heart, Star, MapPin, X, AlertCircle, 
  Loader2, UserPlus, LogOut, Trash2, Minus, TrendingUp, Shield,
  Settings, ChevronLeft, Info, BellRing, DollarSign, Search,
  MessageSquare, FileText, BarChart3, SlidersHorizontal, Bike,
  RotateCcw, Map, Award, Medal, Activity, Calendar, Power,
  CreditCard, Banknote, Ticket, Tag, Users, Zap, TrendingDown,
  LayoutDashboard, MenuSquare, Check, Clock, UploadCloud, ShoppingCart, LocateFixed, ShieldCheck, Ban, Coins, CheckSquare
} from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyBvym0d0zTET0ml--gYW9QYSZ3TUdflt3Q",
  authDomain: "mahalleden-al.firebaseapp.com",
  projectId: "mahalleden-al",
  storageBucket: "mahalleden-al.firebasestorage.app",
  messagingSenderId: "469599940338",
  appId: "1:469599940338:web:5f7678074466e38b18ea6b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const firestore = getFirestore(app);
const storage = getStorage(app);
const appId = 'tencere-tr-production';

const CATEGORY_IMAGES = {
  'Hamur İşi': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=80',
  'Tatlı': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&q=80',
  'Ana Yemek': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
  'Salata & Meze': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  'Kahvaltılık': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80',
  'Diyet & Fit': 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80',
  'default': 'https://images.unsplash.com/photo-1542010582004-94921160351f?w=400&q=80'
};

const INITIAL_DB = { sellers: [], products: [], orders: [], creditRequests: [] };

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [userData, setUserData] = useState(null); 
  const [db, setDb] = useState(INITIAL_DB);
  const [role, setRole] = useState('customer'); 
  const [toast, setToast] = useState(null);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [ratingModal, setRatingModal] = useState({ isOpen: false, order: null, stars: 5 });
  const [cart, setCart] = useState({ sellerId: null, items: [] });
  const [favorites, setFavorites] = useState([]);

  const [apiCities, setApiCities] = useState([]);
  const [apiDistricts, setApiDistricts] = useState([]);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  
  const [customerView, setCustomerView] = useState('home'); 
  const [selCity, setSelCity] = useState(localStorage.getItem('tencere_city') || 'Kocaeli');
  const [selDist, setSelDist] = useState(localStorage.getItem('tencere_dist') || 'İzmit');
  const [selectedSellerId, setSelectedSellerId] = useState(null); 
  const [isApplying, setIsApplying] = useState(false);

  const [sellerView, setSellerView] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('Ana Yemek');
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageFile, setImageFile] = useState(null);

  const [adminView, setAdminView] = useState('dashboard');

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    fetch('https://turkiyeapi.dev/api/v1/provinces').then(res => res.json()).then(data => { if(data && data.data) setApiCities(data.data.sort((a,b) => a.name.localeCompare(b.name))); }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    const cityObj = apiCities.find(c => c.name === selCity);
    if (cityObj) { fetch(`https://turkiyeapi.dev/api/v1/provinces/${cityObj.id}`).then(res => res.json()).then(data => setApiDistricts(data.data.districts.sort((a,b)=> a.name.localeCompare(b.name)))).catch(err => console.error(err));
    } else { setApiDistricts([]); }
  }, [selCity, apiCities]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
            const uData = userDoc.data();
            setUserData(uData);
            setRole(uData.role === 'admin' ? 'admin' : (uData.role === 'seller' ? 'seller' : 'customer'));
        } else {
            const newProfile = { uid: user.uid, name: user.displayName || 'Yeni Kullanıcı', email: user.email, role: 'customer', createdAt: new Date().toISOString() };
            await setDoc(doc(firestore, 'users', user.uid), newProfile);
            setUserData(newProfile); setRole('customer');
        }
      } else { setCurrentUser(null); setUserData(null); setRole('customer'); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const dbRef = doc(firestore, 'artifacts', appId, 'public', 'marketplaceMain');
    return onSnapshot(dbRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!data.orders) data.orders = [];
        if (!data.sellers) data.sellers = [];
        if (!data.products) data.products = [];
        if (!data.creditRequests) data.creditRequests = [];
        data.sellers = data.sellers.map(s => s.hasOwnProperty('isOpen') ? s : { ...s, isOpen: true });
        setDb(data);
      } else { setDoc(dbRef, INITIAL_DB); }
    });
  }, []);

  const api = { saveDb: (newDb) => setDoc(doc(firestore, 'artifacts', appId, 'public', 'marketplaceMain'), newDb).catch(err => console.error(err)) };

  const handleCityChange = (e) => { setSelCity(e.target.value); setSelDist(''); localStorage.setItem('tencere_city', e.target.value); };
  const handleDistChange = (e) => { setSelDist(e.target.value); localStorage.setItem('tencere_dist', e.target.value); };

  const handleFindLocation = () => {
    if (!navigator.geolocation) { showToast("Konum desteklenmiyor.", "error"); return; }
    setIsGpsLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10&addressdetails=1`);
            const data = await res.json();
            const province = data.address.province || data.address.state || data.address.city;
            if (province) { const cleanCity = province.replace(' Province', ''); setSelCity(cleanCity); localStorage.setItem('tencere_city', cleanCity); showToast("Konum bulundu: " + cleanCity); }
        } catch (error) { showToast("Konum çözümlenemedi.", "error"); }
        finally { setIsGpsLoading(false); }
    }, () => { showToast("Konum izni reddedildi.", "error"); setIsGpsLoading(false); });
  };

  const getSellerBadges = (sellerId) => {
    const seller = db.sellers.find(s => s.id === sellerId);
    if (!seller) return [];
    const badges = [];
    const completedOrders = db.orders.filter(o => o.sellerId === sellerId && (o.status === 'completed' || o.status === 'ready'));
    if (seller.rating >= 4.8 && seller.reviewCount >= 5) badges.push({ id: 'taste_master', label: 'Lezzet Ustası', icon: <Award size={14}/>, color: 'bg-amber-100 text-amber-700 border-amber-200' });
    if (completedOrders.length >= 3) badges.push({ id: 'super_neighbor', label: 'Süper Komşu', icon: <Medal size={14}/>, color: 'bg-blue-100 text-blue-700 border-blue-200' });
    return badges;
  };

  const handleGoogleLogin = async () => {
      setIsAuthLoading(true); setAuthError(null);
      try { await signInWithPopup(auth, googleProvider); setIsAuthModalOpen(false); showToast("Google ile giriş yapıldı!"); } 
      catch (error) { setAuthError("Giriş başarısız."); } finally { setIsAuthLoading(false); }
  };
  const handleRegister = async (e) => {
    e.preventDefault(); setIsAuthLoading(true); setAuthError(null); const formData = new FormData(e.target);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.get('email'), formData.get('password'));
      const profileData = { uid: userCredential.user.uid, name: formData.get('name'), phone: formData.get('phone'), email: formData.get('email'), role: 'customer', createdAt: new Date().toISOString() };
      await setDoc(doc(firestore, 'users', userCredential.user.uid), profileData);
      setUserData(profileData); setIsAuthModalOpen(false); showToast("Hoş geldiniz!");
    } catch (error) { setAuthError("Kayıt başarısız."); } finally { setIsAuthLoading(false); }
  };
  const handleLogin = async (e) => {
    e.preventDefault(); setIsAuthLoading(true); setAuthError(null); const formData = new FormData(e.target);
    try { await signInWithEmailAndPassword(auth, formData.get('email'), formData.get('password')); setIsAuthModalOpen(false); showToast("Giriş yapıldı."); } 
    catch (error) { setAuthError("Hatalı bilgi!"); } finally { setIsAuthLoading(false); }
  };
  const handleLogout = async () => { await signOut(auth); setUserData(null); setRole('customer'); setCustomerView('home'); setAdminView('dashboard'); setSellerView('dashboard'); showToast("Çıkış yapıldı."); };

  const addToCart = (product) => {
    const seller = db.sellers.find(s => s.id === product.sellerId);
    if (seller && (!seller.isOpen || seller.status !== 'approved')) { showToast("Bu dükkan şu an kapalı.", "error"); return; }
    if (cart.sellerId && cart.sellerId !== product.sellerId) { showToast("Farklı satıcılardan ürün eklenemez.", "error"); return; }
    setCart(prev => {
      const existing = prev.items.find(item => item.product.id === product.id);
      if (existing) {
        if(existing.qty >= product.stockToday) { showToast(`Stok kalmadı!`, "error"); return prev; }
        return { sellerId: product.sellerId, items: prev.items.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item) };
      }
      return { sellerId: product.sellerId, items: [...prev.items, { product, qty: 1 }] };
    });
    showToast("Sepete eklendi!");
  };
  const removeFromCart = (productId) => { setCart(prev => { const newItems = prev.items.filter(item => item.product.id !== productId); return { sellerId: newItems.length > 0 ? prev.sellerId : null, items: newItems }; }); };
  const updateCartQty = (productId, delta) => { setCart(prev => { const newItems = prev.items.map(item => { if (item.product.id === productId) { const newQty = item.qty + delta; if (newQty < 1) return item; if (newQty > item.product.stockToday) { showToast(`Stok yetersiz!`, "error"); return item; } return { ...item, qty: newQty }; } return item; }); return { ...prev, items: newItems }; }); };
  
  const handleCheckout = () => {
    if (!currentUser) { setIsCartOpen(false); setAuthMode('login'); setIsAuthModalOpen(true); return; }
    const totalAmount = cart.items.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
    const newOrder = { id: 'ord_' + Date.now(), orderCode: 'TNC-' + Math.floor(10000 + Math.random() * 90000), customerId: currentUser.uid, customerName: userData?.name || 'Anonim', sellerId: cart.sellerId, items: cart.items, totalPrice: totalAmount, status: 'pending', createdAt: new Date().toISOString() };
    api.saveDb({ ...db, orders: [...db.orders, newOrder] });
    setCart({ sellerId: null, items: [] }); setIsCartOpen(false); showToast("Sipariş satıcıya iletildi!");
  };

  const handleBecomeSeller = async (e) => {
    e.preventDefault(); if (!currentUser) return; const formData = new FormData(e.target);
    const newSeller = { id: 'sel_' + Date.now(), userId: currentUser.uid, brandName: formData.get('brandName'), city: formData.get('city'), district: formData.get('district'), neighborhood: formData.get('neighborhood'), address: formData.get('address'), description: formData.get('description'), status: 'approved', orderCredit: 10, rating: 5.0, reviewCount: 0, featured: false, deliveryMethod: formData.get('deliveryMethod'), isOpen: true, lastBrandNameChange: Date.now(), workingHours: '08:00 - 20:00', logoUrl: '', createdAt: new Date().toISOString() };
    api.saveDb({ ...db, sellers: [...db.sellers, newSeller] });
    const updatedUser = { ...userData, role: 'seller' };
    await setDoc(doc(firestore, 'users', currentUser.uid), updatedUser);
    setUserData(updatedUser); showToast("Mağazanız açıldı!"); setRole('seller'); 
  };

  // ============================================================================
  // YÖNETİCİ (ADMIN) PANELİ - GÜÇLENDİRİLMİŞ KONTROL MERKEZİ
  // ============================================================================
  const renderAdminApp = () => {
    const completedOrders = db.orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const platformFee = (totalRevenue * 0.1).toFixed(2); 
    const totalCustomers = new Set(db.orders.map(o => o.customerId)).size; 
    const pendingCredits = (db.creditRequests || []).filter(r => r.status === 'pending');

    const handleToggleSellerStatus = (sellerId, currentStatus) => {
        const newStatus = currentStatus === 'approved' ? 'banned' : 'approved';
        const updatedSellers = db.sellers.map(s => s.id === sellerId ? { ...s, status: newStatus, isOpen: newStatus === 'approved' } : s);
        api.saveDb({ ...db, sellers: updatedSellers });
        showToast(newStatus === 'banned' ? "Dükkan Yasaklandı!" : "Dükkan Onaylandı!");
    };

    const handleApproveCredit = (reqId, sellerId, amount) => {
        const updatedSellers = db.sellers.map(s => s.id === sellerId ? { ...s, orderCredit: (s.orderCredit || 0) + amount } : s);
        const updatedReqs = (db.creditRequests || []).map(r => r.id === reqId ? { ...r, status: 'approved' } : r);
        api.saveDb({ ...db, sellers: updatedSellers, creditRequests: updatedReqs });
        showToast(`${amount} Kredi başarıyla onaylandı ve yüklendi!`);
    };

    const handleRejectCredit = (reqId) => {
        const updatedReqs = (db.creditRequests || []).map(r => r.id === reqId ? { ...r, status: 'rejected' } : r);
        api.saveDb({ ...db, creditRequests: updatedReqs });
        showToast("Kredi talebi reddedildi.", "error");
    };

    const updateSellerCredit = (sellerId, delta) => {
        const updatedSellers = db.sellers.map(s => {
            if (s.id === sellerId) {
                // Kredi eksiye düşmesin diye Math.max kullanıyoruz
                const newCredit = Math.max(0, (s.orderCredit || 0) + delta);
                return { ...s, orderCredit: newCredit };
            }
            return s;
        });
        api.saveDb({ ...db, sellers: updatedSellers });
        showToast("Satıcı kredisi güncellendi!");
    };

    return (
      <div className="pb-24 bg-stone-100 min-h-screen relative animate-in fade-in">
        <div className="bg-stone-900 px-5 pt-8 pb-6 sticky top-0 z-40 rounded-b-[2rem] shadow-xl text-white">
           <div className="flex justify-between items-start mb-5">
             <div><h1 className="text-2xl font-black flex items-center gap-2"><ShieldCheck className="text-orange-500"/> Yönetici Merkezi</h1><p className="text-stone-400 text-sm mt-1">Tüm analizler ve kontrol sizde.</p></div>
             <button onClick={handleLogout} className="p-3 bg-stone-800 rounded-full text-stone-300 hover:text-white hover:bg-red-500 transition-colors shadow-lg"><LogOut size={18}/></button>
           </div>
           <div className="flex gap-2 bg-stone-800 p-1.5 rounded-xl overflow-x-auto no-scrollbar">
              <button onClick={() => setAdminView('dashboard')} className={`flex-1 py-2 px-3 whitespace-nowrap text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${adminView === 'dashboard' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-400 hover:text-white'}`}><TrendingUp size={14}/> Analizler</button>
              <button onClick={() => setAdminView('sellers')} className={`flex-1 py-2 px-3 whitespace-nowrap text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${adminView === 'sellers' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-400 hover:text-white'}`}><Users size={14}/> Satıcı Yönetimi</button>
              <button onClick={() => setAdminView('credits')} className={`flex-1 py-2 px-3 whitespace-nowrap text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${adminView === 'credits' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-400 hover:text-white'}`}>
                  <CreditCard size={14}/> Talepler {pendingCredits.length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px]">{pendingCredits.length}</span>}
              </button>
           </div>
        </div>

        <div className="p-5 space-y-4">
           {adminView === 'dashboard' && (
              <div className="space-y-4 animate-in slide-in-from-left">
                  <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-6 rounded-[2rem] shadow-lg text-white relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-10"><Activity size={120}/></div>
                      <p className="text-stone-400 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><TrendingUp size={14}/> Toplam Platform Hacmi</p>
                      <h2 className="text-4xl font-black text-orange-500">{totalRevenue} ₺</h2>
                      <div className="mt-4 pt-4 border-t border-stone-700 flex justify-between relative z-10">
                          <div><p className="text-stone-400 text-[10px] uppercase">Tahmini Kazancın (%10)</p><p className="font-bold text-lg">{platformFee} ₺</p></div>
                          <div className="text-right"><p className="text-stone-400 text-[10px] uppercase">Tamamlanan</p><p className="font-bold text-lg">{completedOrders.length} Sipariş</p></div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200"><div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-3"><Store size={20}/></div><p className="text-stone-400 text-[10px] font-bold uppercase">Kayıtlı Satıcılar</p><p className="text-3xl font-black text-stone-800">{db.sellers.length}</p></div>
                      <div className="bg-white p-5 rounded-3xl shadow-sm border border-stone-200"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3"><Users size={20}/></div><p className="text-stone-400 text-[10px] font-bold uppercase">Müşteriler</p><p className="text-3xl font-black text-stone-800">{totalCustomers}</p></div>
                  </div>
              </div>
           )}

           {adminView === 'sellers' && (
               <div className="space-y-4 animate-in slide-in-from-right">
                  {db.sellers.length === 0 ? ( <div className="text-center p-10"><Store size={48} className="mx-auto text-stone-300 mb-4" /><p className="text-stone-500 font-bold">Kayıtlı satıcı yok.</p></div> ) : (
                      db.sellers.map(s => (
                          <div key={s.id} className={`bg-white p-5 rounded-3xl border shadow-sm mb-4 ${s.status === 'banned' ? 'border-red-200 opacity-75' : 'border-stone-200'}`}>
                             <div className="flex justify-between items-start mb-4 border-b pb-4">
                                <div><h3 className="font-black text-stone-800 text-lg flex items-center gap-2">{s.brandName} {s.status === 'banned' && <Ban size={16} className="text-red-500"/>}</h3><p className="text-xs text-stone-500 font-medium">{s.city} - {s.district}</p></div>
                                <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${s.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status === 'approved' ? 'AKTİF' : 'YASAKLI'}</span>
                             </div>

                             {/* MANUEL KREDİ YÖNETİM ALANI */}
                             <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 mb-4">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-black text-stone-600 flex items-center gap-1 uppercase tracking-wider"><Coins size={14} className="text-orange-500"/> Kredi Kontrolü</span>
                                    <span className="font-black text-2xl text-stone-800">{s.orderCredit} <span className="text-[10px] text-stone-400 font-bold uppercase">Hakkı</span></span>
                                </div>
                                
                                {/* Ekleme Butonları (+) */}
                                <div className="flex gap-1.5 mb-2">
                                    <button onClick={() => updateSellerCredit(s.id, 1)} className="flex-1 py-2 bg-green-50 border border-green-200 text-green-700 hover:bg-green-500 hover:text-white rounded-xl text-xs font-black transition-colors">+1</button>
                                    <button onClick={() => updateSellerCredit(s.id, 10)} className="flex-1 py-2 bg-green-50 border border-green-200 text-green-700 hover:bg-green-500 hover:text-white rounded-xl text-xs font-black transition-colors">+10</button>
                                    <button onClick={() => updateSellerCredit(s.id, 20)} className="flex-1 py-2 bg-green-50 border border-green-200 text-green-700 hover:bg-green-500 hover:text-white rounded-xl text-xs font-black transition-colors">+20</button>
                                    <button onClick={() => updateSellerCredit(s.id, 50)} className="flex-1 py-2 bg-green-50 border border-green-200 text-green-700 hover:bg-green-500 hover:text-white rounded-xl text-xs font-black transition-colors">+50</button>
                                </div>

                                {/* Çıkarma Butonları (-) */}
                                <div className="flex gap-1.5">
                                    <button onClick={() => updateSellerCredit(s.id, -1)} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black transition-colors">-1</button>
                                    <button onClick={() => updateSellerCredit(s.id, -10)} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black transition-colors">-10</button>
                                    <button onClick={() => updateSellerCredit(s.id, -20)} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black transition-colors">-20</button>
                                    <button onClick={() => updateSellerCredit(s.id, -50)} className="flex-1 py-2 bg-red-50 border border-red-200 text-red-700 hover:bg-red-500 hover:text-white rounded-xl text-xs font-black transition-colors">-50</button>
                                </div>
                             </div>

                             {s.status === 'approved' ? (
                                 <button onClick={() => handleToggleSellerStatus(s.id, s.status)} className="w-full py-3 bg-red-50 text-red-600 border border-red-200 text-xs font-black rounded-xl flex items-center justify-center gap-2 hover:bg-red-500 hover:text-white transition-colors"><Ban size={16}/> Dükkanı Yasakla (Kapat)</button>
                             ) : (
                                 <button onClick={() => handleToggleSellerStatus(s.id, s.status)} className="w-full py-3 bg-green-50 text-green-600 border border-green-200 text-xs font-black rounded-xl flex items-center justify-center gap-2 hover:bg-green-500 hover:text-white transition-colors"><CheckCircle size={16}/> Yasağı Kaldır ve Onayla</button>
                             )}
                          </div>
                      ))
                  )}
               </div>
           )}

           {adminView === 'credits' && (
              <div className="space-y-4 animate-in slide-in-from-right">
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl text-sm text-orange-800 font-medium flex items-start gap-3"><Info size={20} className="flex-shrink-0 mt-0.5"/><div>EFT/Havale ile ödeme yapan satıcıların kredi yüklemelerini banka hesabınızı kontrol ettikten sonra buradan onaylayın.</div></div>
                  {pendingCredits.length === 0 ? ( <div className="text-center p-10"><CheckSquare size={48} className="mx-auto text-stone-300 mb-4" /><p className="text-stone-500 font-bold">Bekleyen kredi talebi yok.</p></div> ) : (
                      pendingCredits.map(req => (
                          <div key={req.id} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col gap-4">
                              <div className="flex justify-between items-center border-b pb-3"><div><h4 className="font-black text-stone-800 text-lg">{req.brandName}</h4><p className="text-xs text-stone-400">{new Date(req.createdAt).toLocaleString('tr-TR')}</p></div><div className="text-right"><div className="text-2xl font-black text-orange-500">+{req.amount} Kredi</div><div className="text-sm font-bold text-stone-500">Ödenecek: {req.price} ₺</div></div></div>
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveCredit(req.id, req.sellerId, req.amount)} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"><CheckCircle size={20}/> Onayla</button>
                                <button onClick={() => handleRejectCredit(req.id)} className="w-16 bg-red-50 hover:bg-red-100 text-red-600 font-black py-4 rounded-xl flex items-center justify-center transition-colors"><X size={20}/></button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
           )}
        </div>
      </div>
    );
  };

  const renderAuthModal = () => {
    if (!isAuthModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4 backdrop-blur-md">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 relative border border-stone-100">
          <button onClick={() => {setIsAuthModalOpen(false); setAuthError(null);}} className="absolute top-6 right-6 p-2 bg-stone-100 text-stone-500 rounded-full"><X size={18} /></button>
          <div className="text-center mb-6"><h2 className="text-2xl font-black text-stone-800">Tencere<span className="text-orange-500">.tr</span></h2><p className="text-stone-500 text-sm mt-1">{authMode === 'login' ? 'Tekrar hoş geldiniz.' : 'Mutfaktan taze çıkanları yakalayın.'}</p></div>
          <button onClick={handleGoogleLogin} disabled={isAuthLoading} className="w-full mb-4 bg-white border-2 border-stone-100 text-stone-800 font-bold py-3 rounded-2xl flex justify-center items-center gap-3 hover:bg-stone-50 transition"><svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Google ile Devam Et</button>
        </div>
      </div>
    );
  };

  const renderCartDrawer = () => {
    if (!isCartOpen) return null;
    const totalAmount = cart.items.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
    const seller = db.sellers.find(s => s.id === cart.sellerId);
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex justify-end">
        <div className="bg-stone-50 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right">
          <div className="p-6 bg-white border-b border-stone-100 flex justify-between items-center"><h2 className="text-xl font-black text-stone-800 flex items-center gap-2"><ShoppingBag className="text-orange-500"/> Sepetim</h2><button onClick={() => setIsCartOpen(false)} className="p-2 bg-stone-100 rounded-full"><X size={20}/></button></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-2"><ShoppingBag size={48} className="opacity-20"/><p className="font-bold">Sepetiniz boş.</p></div>
            ) : (
              <>
                <div className="bg-orange-50 text-orange-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2"><Store size={14}/> {seller?.brandName}</div>
                {cart.items.map(item => (
                  <div key={item.product.id} className="bg-white p-4 rounded-2xl shadow-sm flex gap-4">
                    <div className="w-16 h-16 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0"><img src={item.product.image} className="w-full h-full object-cover" /></div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div><h4 className="font-bold text-stone-800 text-sm">{item.product.name}</h4><p className="text-orange-600 font-black text-sm">{item.product.price} ₺</p></div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-3 bg-stone-50 rounded-lg p-1 border">
                          <button onClick={() => updateCartQty(item.product.id, -1)} className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-stone-600"><Minus size={14}/></button>
                          <span className="font-bold text-sm">{item.qty}</span>
                          <button onClick={() => updateCartQty(item.product.id, 1)} className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-stone-600"><Plus size={14}/></button>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-stone-400 hover:text-red-500"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
          {cart.items.length > 0 && <div className="p-6 bg-white border-t space-y-4"><div className="flex justify-between items-center"><span className="font-bold text-stone-500">Toplam:</span><span className="font-black text-stone-800 text-2xl">{totalAmount} ₺</span></div><button onClick={handleCheckout} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg">Siparişi Onayla</button></div>}
        </div>
      </div>
    );
  };

  const renderCustomerApp = () => {
    const filteredProducts = db.products.filter(p => {
      if (p.status !== 'approved') return false;
      const seller = db.sellers.find(s => s.id === p.sellerId);
      return seller && seller.status === 'approved' && seller.city === selCity && (selDist === '' || seller.district === selDist);
    });
    const myOrders = currentUser ? db.orders.filter(o => o.customerId === currentUser.uid).reverse() : [];
    const activeOrder = myOrders.find(o => ['pending', 'approved', 'ready'].includes(o.status));
    const activeSellerProfile = db.sellers.find(s => s.id === selectedSellerId);
    const activeSellerProducts = db.products.filter(p => p.sellerId === selectedSellerId && p.status === 'approved');

    const submitRating = () => {
      const order = ratingModal.order;
      const updatedSellers = db.sellers.map(s => {
        if (s.id === order.sellerId) {
          const newCount = (s.reviewCount || 0) + 1;
          const currentTotal = (s.rating || 5) * (s.reviewCount || 0);
          return { ...s, rating: parseFloat(((currentTotal + ratingModal.stars) / newCount).toFixed(1)), reviewCount: newCount };
        }
        return s;
      });
      api.saveDb({ ...db, sellers: updatedSellers });
      showToast("Değerlendirmeniz için teşekkürler!"); setRatingModal({ isOpen: false, order: null, stars: 5 });
    };

    return (
      <div className="pb-24 bg-stone-50 min-h-screen relative">
        <div className="bg-white px-5 pt-6 pb-4 sticky top-0 z-40 shadow-sm rounded-b-[2rem]">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-black text-stone-800 tracking-tight cursor-pointer" onClick={()=>setCustomerView('home')}>Tencere<span className="text-orange-500">.tr</span></h1>
            {currentUser ? (
              <div className="flex items-center gap-2"><span className="text-xs font-bold text-stone-600">{userData?.name?.split(' ')[0]}</span><button onClick={handleLogout} className="p-2 bg-stone-100 rounded-full text-stone-500"><LogOut size={16}/></button></div>
            ) : <button onClick={() => setIsAuthModalOpen(true)} className="text-xs font-black text-orange-600 bg-orange-50 px-4 py-2 rounded-full border border-orange-100 flex items-center gap-1"><LogIn size={14}/> Giriş Yap</button>}
          </div>
          {customerView === 'home' && (
            <div className="flex gap-2">
                <div className="flex-1 bg-stone-50 p-2 rounded-2xl border flex gap-2">
                    <select value={selCity} onChange={handleCityChange} className="flex-1 bg-white border rounded-xl p-2 text-[10px] font-bold outline-none"><option value="">İl Seç</option>{apiCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                    <select value={selDist} onChange={handleDistChange} disabled={!selCity} className="flex-1 bg-white border rounded-xl p-2 text-[10px] font-bold outline-none disabled:opacity-50"><option value="">Tüm İlçeler</option>{apiDistricts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}</select>
                </div>
                <button onClick={handleFindLocation} disabled={isGpsLoading} className="bg-stone-900 text-white w-14 rounded-2xl flex items-center justify-center shadow-md disabled:bg-stone-400">{isGpsLoading ? <Loader2 size={18} className="animate-spin"/> : <LocateFixed size={18}/>}</button>
            </div>
          )}
        </div>

        {activeOrder && customerView === 'home' && (
            <div className="mx-5 mt-4 bg-orange-500 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between cursor-pointer" onClick={() => setCustomerView('orders')}>
                <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-full"><BellRing size={20} className="animate-pulse"/></div><div><p className="text-xs font-bold opacity-90 uppercase">Siparişin Yolda</p><p className="font-black text-sm">{activeOrder.status === 'pending' ? 'Onay bekleniyor...' : activeOrder.status === 'approved' ? 'Hazırlanıyor! 🥘' : 'Teslime Hazır! 🏃‍♂️'}</p></div></div>
                <ChevronRight size={20}/>
            </div>
        )}

        <div className="p-5">
          {customerView === 'home' && (
            <div className="space-y-4">
              <h2 className="font-black text-lg text-stone-800 flex justify-between items-center">Yakınındaki Lezzetler</h2>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-3xl border"><Store size={40} className="mx-auto text-stone-300 mb-3"/><p className="text-stone-500 font-bold">Bu bölgede henüz ürün yok.</p></div>
              ) : (
                filteredProducts.map(product => {
                  const seller = db.sellers.find(s => s.id === product.sellerId);
                  const isFav = favorites.includes(product.id);
                  const badges = getSellerBadges(seller?.id);
                  return (
                    <div key={product.id} className="bg-white rounded-[2rem] border border-stone-100 p-4 shadow-sm relative group">
                      <button onClick={() => setFavorites(prev => prev.includes(product.id) ? prev.filter(id=>id!==product.id) : [...prev, product.id])} className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm"><Heart size={20} fill={isFav ? "#ef4444" : "none"} className={isFav ? "text-red-500" : "text-stone-400"} /></button>
                      <div className="w-full h-40 bg-stone-100 rounded-[1.5rem] mb-3 overflow-hidden cursor-pointer" onClick={() => { setSelectedSellerId(seller.id); setCustomerView('sellerProfile'); }}>
                        <img src={product.image} className="w-full h-full object-cover" />
                        {(!seller?.isOpen || seller?.status !== 'approved') && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><span className="bg-red-500 text-white font-black px-4 py-2 rounded-xl text-sm">Şu An Kapalı</span></div>}
                      </div>
                      <div className="px-1 flex justify-between items-end">
                        <div className="flex-1 pr-2">
                          <h3 className="font-black text-stone-800 text-base mb-1">{product.name}</h3>
                          <div className="flex items-center gap-1.5 mb-2 cursor-pointer" onClick={() => { setSelectedSellerId(seller.id); setCustomerView('sellerProfile'); }}><Store size={12} className="text-stone-400"/><span className="text-xs font-bold text-stone-500">{seller?.brandName}</span><div className="flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded text-orange-600"><Star size={10} fill="currentColor"/><span className="text-[10px] font-black">{seller?.rating || 'Yeni'}</span></div></div>
                          {badges.length > 0 && ( <div className="flex gap-1 mb-2">{badges.map(b => <span key={b.id} className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border ${b.color}`}>{b.icon} {b.label}</span>)}</div> )}
                          <p className="text-lg font-black text-stone-800 mt-2">{product.price} ₺ <span className="text-xs text-stone-400 font-medium">/ {product.unit}</span></p>
                        </div>
                        <button onClick={() => addToCart(product)} className="bg-orange-500 text-white w-12 h-12 rounded-[1.2rem] flex items-center justify-center shadow-md"><Plus size={24} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {customerView === 'sellerProfile' && activeSellerProfile && (
             <div className="animate-in slide-in-from-right">
                <button onClick={() => setCustomerView('home')} className="mb-4 flex items-center gap-1 text-stone-500 font-bold bg-white px-4 py-2 rounded-xl shadow-sm"><ChevronLeft size={18}/> Geri</button>
                <div className="bg-white rounded-[2rem] p-6 shadow-sm border mb-6 relative overflow-hidden">
                    {activeSellerProfile.logoUrl && <img src={activeSellerProfile.logoUrl} className="absolute right-6 top-6 w-16 h-16 rounded-full border-4 border-white shadow-md object-cover" />}
                    <h2 className="text-2xl font-black text-stone-800 mb-1 pr-20">{activeSellerProfile.brandName} {!activeSellerProfile.isOpen && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded ml-2 align-middle">Kapalı</span>}</h2>
                    <p className="text-stone-500 text-sm flex items-center gap-1 mb-2"><MapPin size={14}/> {activeSellerProfile.district}, {activeSellerProfile.neighborhood}</p>
                    <p className="text-stone-500 text-xs flex items-center gap-1 mb-4"><Clock size={12}/> {activeSellerProfile.workingHours || '08:00 - 20:00'}</p>
                    <div className="bg-stone-50 p-4 rounded-2xl border"><p className="text-sm font-medium text-stone-600 italic">"{activeSellerProfile.description}"</p></div>
                </div>
                <h3 className="font-black text-lg text-stone-800 mb-4 flex items-center gap-2"><Package className="text-orange-500"/> Menü</h3>
                <div className="space-y-3">
                    {activeSellerProducts.map(product => (
                        <div key={product.id} className="bg-white p-4 rounded-2xl shadow-sm border flex gap-4 items-center">
                            <div className="w-20 h-20 bg-stone-100 rounded-xl overflow-hidden"><img src={product.image} className="w-full h-full object-cover" /></div>
                            <div className="flex-1">
                                <h4 className="font-bold text-stone-800 mb-1">{product.name}</h4>
                                <p className="text-[10px] text-stone-400 font-bold flex items-center gap-1 mb-2"><Clock size={10}/> {product.prepTime || 'Hemen Hazır'}</p>
                                <p className="text-orange-600 font-black">{product.price} ₺</p>
                            </div>
                            <button onClick={() => addToCart(product)} className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Plus size={20} /></button>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {customerView === 'orders' && (
             <div className="space-y-4 animate-in fade-in">
               <h2 className="font-black text-xl text-stone-800 mb-4 flex items-center gap-2"><Package className="text-orange-500"/> Siparişlerim</h2>
               {!currentUser ? (
                 <div className="text-center py-12 text-stone-400 bg-white rounded-3xl border"><p className="font-bold mb-4">Siparişler için giriş yapın.</p><button onClick={() => setIsAuthModalOpen(true)} className="bg-orange-50 text-orange-600 font-bold px-6 py-2 rounded-xl">Giriş Yap</button></div>
               ) : myOrders.map(order => {
                    const seller = db.sellers.find(s => s.id === order.sellerId);
                    return (
                     <div key={order.id} className="bg-white rounded-[1.5rem] border p-4 shadow-sm mb-3">
                       <div className="flex justify-between items-center mb-3 border-b pb-3"><span className="text-xs font-black text-stone-500">{order.orderCode}</span><span className={`text-[10px] font-bold px-2 py-1 rounded uppercase bg-stone-100 text-stone-500`}>{order.status}</span></div>
                       <p className="text-sm font-bold text-stone-700 mb-2"><Store size={14} className="inline mr-1 text-stone-400"/> {seller?.brandName}</p>
                       {order.items.map((item, idx) => <div key={idx} className="flex justify-between text-sm text-stone-500 mb-1"><span>{item.qty}x {item.product.name}</span></div>)}
                       <div className="font-black text-lg text-stone-800 text-right mt-3 mb-3">{order.totalPrice} ₺</div>
                       {order.status === 'ready' && <button onClick={() => { api.saveDb({ ...db, orders: db.orders.map(o => o.id === order.id ? { ...o, status: 'completed' } : o) }); setRatingModal({ isOpen: true, order: order, stars: 5 }); }} className="w-full bg-green-500 text-white font-bold py-3 rounded-xl">Teslim Aldım</button>}
                     </div>
                    )
                 })
               }
             </div>
          )}

          {customerView === 'profile' && (
            <div className="space-y-4 animate-in fade-in">
              <h2 className="font-black text-xl text-stone-800 mb-4 flex items-center gap-2"><User className="text-orange-500"/> Profilim</h2>
              {!currentUser ? (
                <div className="text-center py-12 text-stone-400 bg-white rounded-3xl border"><button onClick={() => setIsAuthModalOpen(true)} className="bg-orange-50 text-orange-600 font-bold px-6 py-2 rounded-xl">Giriş Yap</button></div>
              ) : (
                <>
                  <div className="bg-white rounded-[1.5rem] border p-6 shadow-sm flex items-center gap-4">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-2xl font-black text-stone-800">{userData?.name?.charAt(0)}</div>
                    <div><h3 className="font-bold text-lg text-stone-800">{userData?.name}</h3><p className="text-stone-500 text-sm">{userData?.email}</p></div>
                  </div>
                  {(!userData?.role || userData?.role === 'customer') && !isApplying && (
                    <div className="bg-orange-50 rounded-[1.5rem] border border-orange-100 p-6 shadow-sm flex flex-col items-center text-center mt-6">
                      <Store size={32} className="text-orange-500 mb-3"/><h3 className="font-bold text-orange-800 mb-2">Mutfağınızı Gelire Dönüştürün</h3><button onClick={() => setIsApplying(true)} className="bg-orange-500 text-white font-bold px-6 py-3 rounded-xl w-full mt-2">Satıcı Profili Oluştur</button>
                    </div>
                  )}
                  {isApplying && (
                     <div className="bg-white rounded-[1.5rem] border p-6 shadow-xl mt-6">
                        <div className="flex justify-between items-center mb-4"><h3 className="font-black text-lg">Mağaza Bilgileri</h3><button onClick={() => setIsApplying(false)}><X size={20}/></button></div>
                        <form onSubmit={handleBecomeSeller} className="space-y-4">
                          <input name="brandName" required placeholder="Markanız (Örn: Ayşe'nin Mutfağı)" className="w-full bg-stone-50 border rounded-xl p-3 text-sm font-medium" />
                          <div className="flex gap-2">
                              <select name="city" required onChange={handleCityChange} className="w-1/2 bg-stone-50 border rounded-xl p-3 text-sm font-medium"><option value="">İl Seç</option>{apiCities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                              <select name="district" required className="w-1/2 bg-stone-50 border rounded-xl p-3 text-sm font-medium disabled:opacity-50" disabled={!apiDistricts.length}><option value="">İlçe Seç</option>{apiDistricts.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}</select>
                          </div>
                          <input name="neighborhood" required placeholder="Mahalle" className="w-full bg-stone-50 border rounded-xl p-3 text-sm font-medium" />
                          <textarea name="address" required placeholder="Açık Adres" className="w-full bg-stone-50 border rounded-xl p-3 text-sm font-medium resize-none"></textarea>
                          <textarea name="description" required placeholder="Kısa Açıklama" rows="2" className="w-full bg-stone-50 border rounded-xl p-3 text-sm font-medium resize-none"></textarea>
                          <select name="deliveryMethod" className="w-full bg-stone-50 border rounded-xl p-3 text-sm font-medium"><option value="both">Hem Gel-Al Hem Eve Teslim</option><option value="pickup">Sadece Gel-Al</option></select>
                          <button type="submit" className="w-full bg-stone-900 text-white font-black py-4 rounded-xl">Kayıt Ol ve Başla!</button>
                        </form>
                     </div>
                  )}
                </>
              )}
            </div>
          )}
          {ratingModal.isOpen && (
             <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
               <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl text-center">
                 <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"><Star size={32} fill="currentColor"/></div>
                 <h3 className="text-xl font-black text-stone-800 mb-2">Afiyet Olsun!</h3>
                 <div className="flex justify-center gap-2 mb-6 mt-4">{[1, 2, 3, 4, 5].map(star => <button key={star} onClick={() => setRatingModal(prev => ({...prev, stars: star}))} className="focus:outline-none transition-transform hover:scale-110"><Star size={36} fill={star <= ratingModal.stars ? "#f97316" : "none"} className={star <= ratingModal.stars ? "text-orange-500" : "text-stone-300"} /></button>)}</div>
                 <button onClick={submitRating} className="w-full bg-stone-900 text-white font-black py-4 rounded-xl">Değerlendir</button>
                 <button onClick={() => setRatingModal({isOpen: false, order: null, stars: 5})} className="w-full text-stone-400 font-bold py-3 mt-2 text-sm">Geç</button>
               </div>
             </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-6 py-3 pb-safe flex justify-between items-center z-40">
          <button onClick={() => {setCustomerView('home'); setSelectedSellerId(null);}} className={`flex flex-col items-center gap-0.5 ${customerView === 'home' ? 'text-orange-500' : 'text-stone-400'}`}><Home size={22} /><span className="text-[10px] font-bold">Keşfet</span></button>
          <div className="relative -top-5"><button onClick={() => setIsCartOpen(true)} className="w-14 h-14 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-white"><ShoppingBag size={22} />{cart.items.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{cart.items.reduce((acc, item)=> acc+item.qty, 0)}</span>}</button></div>
          <button onClick={() => setCustomerView('orders')} className={`flex flex-col items-center gap-0.5 ${customerView === 'orders' ? 'text-orange-500' : 'text-stone-400'}`}><Package size={22} /><span className="text-[10px] font-bold">Siparişlerim</span></button>
          <button onClick={() => setCustomerView('profile')} className={`flex flex-col items-center gap-0.5 ${customerView === 'profile' ? 'text-orange-500' : 'text-stone-400'}`}><User size={22} /><span className="text-[10px] font-bold">Profil</span></button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // SATICI (SELLER) PANELİ
  // ============================================================================
  const renderSellerApp = () => {
    let currentSeller = currentUser ? db.sellers.find(s => s.userId === currentUser.uid) : null;
    if (!currentSeller) return <div className="p-10 text-center">Satıcı profili bulunamadı. Lütfen Müşteri panelinden profil oluşturun.</div>;
    if (currentSeller.status === 'banned') return <div className="p-10 flex flex-col items-center justify-center h-screen bg-stone-900 text-white text-center"><Ban size={64} className="text-red-500 mb-4"/><h2 className="text-2xl font-black mb-2">Dükkanınız Yasaklandı</h2><p className="text-stone-400">Kurallara aykırı hareket ettiğiniz için dükkanınız yönetici tarafından kapatılmıştır.</p></div>;

    const sellerOrders = db.orders.filter(o => o.sellerId === currentSeller.id);
    const sellerProducts = db.products.filter(p => p.sellerId === currentSeller.id);
    const activeOrders = sellerOrders.filter(o => o.status === 'pending' || o.status === 'approved');
    const completedOrders = sellerOrders.filter(o => o.status === 'completed' || o.status === 'ready');
    const totalEarnings = completedOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    const handleToggleStatus = () => {
        const updatedSellers = db.sellers.map(s => s.id === currentSeller.id ? { ...s, isOpen: !s.isOpen } : s);
        api.saveDb({ ...db, sellers: updatedSellers });
        showToast(currentSeller.isOpen ? "Dükkan Kapatıldı" : "Dükkan Açıldı");
    };

    const handleRequestCredit = (amount, price) => {
        const newReq = { id: 'req_' + Date.now(), sellerId: currentSeller.id, brandName: currentSeller.brandName, amount: amount, price: price, status: 'pending', createdAt: new Date().toISOString() };
        api.saveDb({ ...db, creditRequests: [...(db.creditRequests || []), newReq] });
        showToast("Talebiniz alındı! EFT sonrası yöneticiler kredinizi onaylayacaktır.");
        setSellerView('dashboard');
    };

    const handleAddProduct = async (e) => {
      e.preventDefault(); setIsSaving(true); const formData = new FormData(e.target);
      const category = formData.get('category');
      let finalImageUrl = formData.get('customUrl') || CATEGORY_IMAGES[category] || CATEGORY_IMAGES['default'];

      if (imageFile) {
        if (imageFile.size > 2 * 1024 * 1024) { showToast("Görsel 2MB'dan büyük olamaz!", "error"); setIsSaving(false); return; }
        try {
            const fileRef = ref(storage, `product_images/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
            const uploadTask = uploadBytesResumable(fileRef, imageFile);
            await new Promise((resolve, reject) => {
              uploadTask.on('state_changed', (snap) => { setUploadProgress((snap.bytesTransferred / snap.totalBytes) * 100); }, (err) => reject(err), async () => { finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref); resolve(); });
            });
        } catch (error) { showToast("Görsel yüklenemedi.", "error"); setIsSaving(false); return; }
      }
      const newProduct = { id: 'prod_' + Date.now(), sellerId: currentSeller.id, name: formData.get('name'), category: category, price: Number(formData.get('price')), stockToday: Number(formData.get('stock')), unit: formData.get('unit'), prepTime: formData.get('prepTime'), status: 'approved', image: finalImageUrl };
      api.saveDb({ ...db, products: [...db.products, newProduct] });
      showToast("Harika! Ürün vitrine eklendi."); setSellerView('products'); setUploadProgress(0); setImageFile(null); setIsSaving(false);
    };

    const handleApproveOrder = (orderId) => {
        if (currentSeller.orderCredit < 1) { showToast("Krediniz yetersiz! Lütfen kredi yükleyin.", "error"); return; }
        const updatedOrders = db.orders.map(o => o.id === orderId ? { ...o, status: 'approved' } : o);
        const updatedSellers = db.sellers.map(s => s.id === currentSeller.id ? { ...s, orderCredit: s.orderCredit - 1 } : s);
        api.saveDb({ ...db, orders: updatedOrders, sellers: updatedSellers });
    };

    const handleMarkReady = (orderId) => { api.saveDb({ ...db, orders: db.orders.map(o => o.id === orderId ? { ...o, status: 'ready' } : o) }); };
    
    const handleUpdateSettings = (e) => {
        e.preventDefault(); const formData = new FormData(e.target);
        const newBrandName = formData.get('brandName');
        const now = Date.now();
        const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
        let finalLastChangeDate = currentSeller.lastBrandNameChange || 0;

        if (newBrandName !== currentSeller.brandName) {
            if (now - finalLastChangeDate < sixtyDaysMs) {
                const daysLeft = Math.ceil((sixtyDaysMs - (now - finalLastChangeDate)) / (1000 * 60 * 60 * 24));
                showToast(`Güvenlik: İsminizi değiştirmek için ${daysLeft} gün daha beklemelisiniz!`, "error"); return;
            } else { finalLastChangeDate = now; }
        }
        const updatedSellers = db.sellers.map(s => s.id === currentSeller.id ? { ...s, brandName: newBrandName, address: formData.get('address'), description: formData.get('description'), workingHours: formData.get('workingHours'), logoUrl: formData.get('logoUrl'), lastBrandNameChange: finalLastChangeDate } : s);
        api.saveDb({ ...db, sellers: updatedSellers }); showToast("Mağaza ayarları güncellendi!"); setSellerView('dashboard');
    };

    return (
      <div className="pb-24 bg-stone-950 min-h-screen text-stone-100 relative">
        <div className="bg-stone-900 px-5 pt-8 pb-4 sticky top-0 z-40 shadow-sm border-b border-stone-800">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-black shadow-md">{currentSeller.brandName.substring(0,2).toUpperCase()}</div>
               <div><h1 className="text-lg font-black text-white">Mağazam</h1><p className="text-stone-400 text-xs">{currentSeller.brandName}</p></div>
            </div>
            <button className="border border-orange-500/30 text-orange-500 text-[10px] font-black px-2 py-1 rounded bg-orange-500/10">TEST MODU</button>
          </div>
        </div>

        <div className="p-5">
          {sellerView === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-[2rem] p-6 shadow-xl flex justify-between items-center relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-20"><CreditCard size={100}/></div>
                <div className="relative z-10">
                   <h3 className="text-orange-100 font-bold mb-1 text-xs tracking-wider uppercase">Kalan Sipariş Kredisi</h3>
                   <div className="text-5xl font-black text-white">{currentSeller.orderCredit}</div>
                </div>
                <button onClick={() => setSellerView('buyCredit')} className="relative z-10 bg-white text-orange-600 font-black py-3 px-5 rounded-xl shadow-lg flex items-center gap-2"><Plus size={18}/> Yükle</button>
              </div>

              <div className="bg-stone-900 p-5 rounded-[1.5rem] border border-stone-800">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-bold flex items-center gap-2"><BarChart3 size={16} className="text-orange-500"/> Haftalık Performans</h3><span className="text-xs text-stone-500">Son 7 Gün</span></div>
                  <div className="flex justify-between text-[10px] font-bold text-stone-500 mb-6 border-b border-stone-800 pb-4 px-2"><span>PZT</span><span>SAL</span><span>ÇAR</span><span>PER</span><span>CUM</span><span>CTS</span><span className="text-orange-500">PAZ</span></div>
                  <div className="flex gap-4">
                      <div className="flex-1"><p className="text-[10px] text-stone-400 font-bold mb-1 flex items-center gap-1"><DollarSign size={12}/> TOPLAM KAZANÇ</p><p className="text-2xl font-black">{totalEarnings} ₺</p></div>
                      <div className="flex-1"><p className="text-[10px] text-stone-400 font-bold mb-1 flex items-center gap-1"><CheckCircle size={12}/> TAMAMLANAN</p><p className="text-2xl font-black">{completedOrders.length} <span className="text-xs font-medium text-stone-500">Sipariş</span></p></div>
                  </div>
              </div>

              <h2 className="font-black text-lg text-white mb-4 flex items-center gap-2"><BellRing size={18} className="text-orange-500"/> Bekleyen Siparişler</h2>
              {activeOrders.length === 0 ? (
                  <div className="bg-stone-900 border border-stone-800 border-dashed rounded-3xl p-10 text-center">
                      <Package size={32} className="mx-auto text-stone-600 mb-3"/>
                      <p className="font-bold text-stone-400">Şu an aktif siparişiniz yok.</p>
                      <p className="text-xs text-stone-600 mt-1">Mutfakta hazırlıklara devam edebilirsiniz.</p>
                  </div>
              ) : (
                  activeOrders.map(order => (
                    <div key={order.id} className="p-5 rounded-[1.5rem] bg-stone-900 border border-stone-800 mb-3">
                      <div className="flex justify-between items-start mb-3 border-b border-stone-800 pb-3"><div><span className="text-xs font-black text-orange-400 uppercase">{order.orderCode}</span><h4 className="font-bold mt-1 text-white">{order.customerName}</h4></div><div className="font-black text-lg text-white">{order.totalPrice} ₺</div></div>
                      {order.items.map((item, idx) => <div key={idx} className="flex justify-between text-sm text-stone-300 mb-1"><span>{item.qty}x {item.product.name}</span></div>)}
                      <div className="mt-4 pt-3 border-t border-stone-800">{order.status === 'pending' ? <button onClick={() => handleApproveOrder(order.id)} className="w-full bg-orange-500 text-white font-black py-3 rounded-xl shadow-lg">Siparişi Onayla (-1 Kredi)</button> : <button onClick={() => handleMarkReady(order.id)} className="w-full bg-blue-500 text-white font-black py-3 rounded-xl shadow-lg">Hazır ve Teslim Edilecek</button>}</div>
                    </div>
                  ))
              )}
            </div>
          )}

          {sellerView === 'buyCredit' && (
             <div className="animate-in slide-in-from-bottom">
                <div className="flex items-center gap-3 mb-6"><button onClick={() => setSellerView('dashboard')} className="p-2 bg-stone-800 rounded-full text-white"><X size={20}/></button><h2 className="font-black text-xl text-white">Sipariş Kredisi Yükle</h2></div>
                <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex gap-3 items-start mb-6 text-sm">
                    <Info size={24} className="text-blue-400 flex-shrink-0"/>
                    <p className="text-stone-300">Tencere.tr'de satışlardan <strong className="text-white">%20-%30 komisyon kesilmez!</strong> Sipariş aldıkça onaylamak için sadece "1 Kredi" harcarsınız. Kazancınızın tamamı cebinizde kalır.</p>
                </div>

                <div className="space-y-4">
                    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 flex items-center justify-between">
                        <div><h3 className="font-black text-lg text-white">Başlangıç</h3><p className="text-[10px] text-stone-400 mb-3">Yeni başlayanlar için düşük riskli.</p><div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 w-max"><TrendingUp size={14} className="text-stone-500"/><span className="text-xs font-bold text-white">20 Sipariş Hakkı</span></div></div>
                        <div className="text-right"><div className="text-2xl font-black text-white">200 ₺</div><p className="text-[9px] text-stone-500 mb-2 border-b border-stone-800 pb-2">Birim başı: 10.0 ₺</p><button onClick={() => handleRequestCredit(20, 200)} className="bg-white text-stone-900 font-black px-6 py-2.5 rounded-xl shadow-md w-full">Satın Al</button></div>
                    </div>
                    
                    <div className="bg-stone-900 border border-orange-500/50 rounded-3xl p-5 flex items-center justify-between relative shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider">En Popüler</span>
                        <div><h3 className="font-black text-lg text-orange-400">Bereketli Tencere</h3><p className="text-[10px] text-stone-400 mb-3">En çok tercih edilen, avantajlı paket.</p><div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-lg border border-orange-500/20 w-max"><TrendingUp size={14} className="text-orange-500"/><span className="text-xs font-bold text-white">50 Sipariş Hakkı</span></div></div>
                        <div className="text-right"><div className="text-2xl font-black text-white">400 ₺</div><p className="text-[9px] text-stone-500 mb-2 border-b border-stone-800 pb-2">Birim başı: 8.0 ₺</p><button onClick={() => handleRequestCredit(50, 400)} className="bg-orange-500 text-white font-black px-6 py-2.5 rounded-xl shadow-md w-full hover:bg-orange-600">Satın Al</button></div>
                    </div>

                    <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 flex items-center justify-between">
                        <div><h3 className="font-black text-lg text-white">Kaynayan Kazan</h3><p className="text-[10px] text-stone-400 mb-3">Sürekli sipariş alan profesyoneller.</p><div className="flex items-center gap-2 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800 w-max"><TrendingUp size={14} className="text-stone-500"/><span className="text-xs font-bold text-white">150 Sipariş Hakkı</span></div></div>
                        <div className="text-right"><div className="text-2xl font-black text-white">700 ₺</div><p className="text-[9px] text-stone-500 mb-2 border-b border-stone-800 pb-2">Birim başı: 4.7 ₺</p><button onClick={() => handleRequestCredit(150, 700)} className="bg-white text-stone-900 font-black px-6 py-2.5 rounded-xl shadow-md w-full">Satın Al</button></div>
                    </div>
                </div>
             </div>
          )}

          {sellerView === 'products' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex justify-between items-center mb-4"><h2 className="font-black text-xl text-white">Menüm</h2><button onClick={() => setSellerView('addProduct')} className="bg-stone-800 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 text-sm"><Plus size={16}/> Yeni Ürün</button></div>
              {sellerProducts.map(p => (
                <div key={p.id} className="bg-stone-900 p-4 rounded-[1.5rem] border border-stone-800 flex gap-4 items-center">
                  <div className="w-16 h-16 bg-stone-800 rounded-xl overflow-hidden flex-shrink-0"><img src={p.image} className="w-full h-full object-cover" /></div>
                  <div className="flex-1"><h4 className="font-bold text-white mb-1">{p.name}</h4><p className="text-[10px] text-stone-400 flex items-center gap-1 mb-1"><Clock size={10}/> {p.prepTime || 'Hemen Hazır'}</p><p className="text-orange-500 text-sm font-black">{p.price} ₺ • Stok: {p.stockToday}</p></div>
                </div>
              ))}
            </div>
          )}

          {sellerView === 'addProduct' && (
            <div className="animate-in slide-in-from-right">
              <div className="flex items-center gap-3 mb-6"><button onClick={() => setSellerView('products')} className="p-2 bg-stone-800 rounded-full text-white"><X size={20}/></button><h2 className="font-black text-xl text-white">Yeni Ürün Ekle</h2></div>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="bg-stone-900 p-6 rounded-3xl border border-stone-800 space-y-5">
                  <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">ÖZEL GÖRSEL URL (İSTEĞE BAĞLI)</label><input name="customUrl" placeholder="https://resmim.com/foto.jpg" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white text-sm outline-none focus:border-stone-600" /><p className="text-[9px] text-stone-600 mt-1">Boş bırakırsanız seçtiğiniz kategoriye göre otomatik görsel atanır.</p></div>
                  <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">ÜRÜN ADI</label><input name="name" required placeholder="Örn: Ev Yapımı İçli Köfte" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white font-bold outline-none focus:border-stone-600" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">BİRİM FİYAT (₺)</label><input name="price" type="number" required defaultValue={50} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white font-bold outline-none" /></div>
                    <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">PORSİYON / BİRİM</label><select name="unit" className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white font-bold outline-none"><option value="Porsiyon">Porsiyon</option><option value="Adet">Adet</option><option value="KG">KG</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">KATEGORİ</label><select name="category" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white font-bold outline-none">{Object.keys(CATEGORY_IMAGES).filter(k=>k!=='default').map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                    <div><label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">GÜNLÜK STOK</label><input name="stock" type="number" required defaultValue={20} className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-white font-bold outline-none" /></div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase tracking-wider block mb-2">HAZIRLIK SÜRESİ</label>
                    <select name="prepTime" className="w-full bg-stone-950 border border-orange-500/50 rounded-xl p-3 text-white font-bold outline-none ring-1 ring-orange-500/20">
                        <option value="Hemen Hazır (Isıt/Ver)">Hemen Hazır (Isıt/Ver)</option>
                        <option value="15-20 Dakika">15-20 Dakika</option>
                        <option value="Yaklaşık 1 Saat">Yaklaşık 1 Saat</option>
                        <option value="Siparişten Sonra Yapılır">Siparişten Sonra Yapılır</option>
                    </select>
                  </div>
                </div>
                <button type="submit" disabled={isSaving} className="w-full bg-orange-500 disabled:bg-orange-800 text-white font-black py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg">{isSaving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>} {isSaving ? 'Yükleniyor...' : 'Kaydet'}</button>
              </form>
            </div>
          )}

          {sellerView === 'settings' && (
             <div className="space-y-4 animate-in fade-in">
                <h2 className="font-black text-xl text-white mb-4 flex items-center gap-2"><Settings size={20}/> Mağaza Ayarları</h2>
                <div className="bg-stone-900 p-6 rounded-3xl border border-stone-800">
                    <form onSubmit={handleUpdateSettings} className="space-y-5">
                        <div className="flex items-center gap-4 border-b border-stone-800 pb-5">
                           <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl font-black">{currentSeller.brandName.substring(0,2).toUpperCase()}</div>
                           <div className="flex-1"><label className="text-[10px] text-stone-500 font-black uppercase tracking-wider block mb-1">LOGO URL (OPSİYONEL)</label><input name="logoUrl" defaultValue={currentSeller.logoUrl || `https://ui-avatars.com/api/?name=${currentSeller.brandName.substring(0,2)}`} className="w-full bg-stone-950 border border-stone-800 p-2.5 rounded-lg text-stone-300 text-sm outline-none"/></div>
                        </div>
                        <div><label className="text-[10px] text-stone-500 font-black uppercase tracking-wider block mb-2">MAĞAZA / MARKA ADI</label><input name="brandName" defaultValue={currentSeller.brandName} className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-white font-bold outline-none" required/></div>
                        <div><label className="text-[10px] text-stone-500 font-black uppercase tracking-wider block mb-2">ÇALIŞMA SAATLERİ</label><div className="relative"><Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"/><input name="workingHours" defaultValue={currentSeller.workingHours || '08:00 - 19:00'} className="w-full bg-stone-950 border border-stone-800 p-3 pl-10 rounded-xl text-white font-bold outline-none" required/></div></div>
                        <div><label className="text-[10px] text-stone-500 font-black uppercase tracking-wider block mb-2">SLOGAN / AÇIKLAMA</label><textarea name="description" rows="2" defaultValue={currentSeller.description} className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-white font-medium resize-none outline-none" required></textarea><p className="text-[9px] text-stone-600 mt-1">Bu alan müşteri profilinize girdiğinde en üstte görünür.</p></div>
                        <div><label className="text-[10px] text-stone-500 font-black uppercase tracking-wider block mb-2">TAM ADRES (AÇIK ADRES)</label><textarea name="address" rows="2" defaultValue={currentSeller.address} className="w-full bg-stone-950 border border-stone-800 p-3 rounded-xl text-white font-medium resize-none outline-none" required></textarea></div>
                        <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl mt-4 shadow-lg transition-colors flex justify-center gap-2"><Save size={20}/> Bilgileri Güncelle</button>
                    </form>
                </div>
             </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-stone-950 border-t border-stone-800 px-6 py-3 pb-safe flex justify-between items-center z-40">
          <button onClick={() => setSellerView('dashboard')} className={`flex flex-col items-center gap-1 w-1/3 ${sellerView === 'dashboard' || sellerView === 'buyCredit' ? 'text-orange-500' : 'text-stone-500'}`}><LayoutDashboard size={22} /><span className="text-[10px] font-bold">Özet</span></button>
          <button onClick={() => setSellerView('products')} className={`flex flex-col items-center gap-1 w-1/3 ${sellerView === 'products' || sellerView === 'addProduct' ? 'text-orange-500' : 'text-stone-500'}`}><MenuSquare size={22} /><span className="text-[10px] font-bold">Menüm</span></button>
          <button onClick={() => setSellerView('settings')} className={`flex flex-col items-center gap-1 w-1/3 ${sellerView === 'settings' ? 'text-orange-500' : 'text-stone-500'}`}><Settings size={22} /><span className="text-[10px] font-bold">Ayarlar</span></button>
        </div>
      </div>
    );
  };

  return (
    <div className="font-sans antialiased bg-stone-100 min-h-screen">
      <div className="fixed top-4 right-4 z-[100] bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-2xl border text-[10px] font-black uppercase tracking-wider flex flex-col gap-1">
        {(!userData || userData.role === 'customer' || userData.role === 'admin') && <button onClick={() => setRole('customer')} className={`p-2 rounded-lg ${role==='customer'?'bg-orange-500 text-white':'bg-stone-100 text-stone-500'}`}>Müşteri</button>}
        {userData && userData.role === 'seller' && <button onClick={() => setRole('seller')} className={`p-2 rounded-lg ${role==='seller'?'bg-stone-900 text-white':'bg-stone-100 text-stone-500'}`}>Satıcı</button>}
        {userData && userData.role === 'admin' && <button onClick={() => setRole('admin')} className={`p-2 rounded-lg ${role==='admin'?'bg-red-500 text-white':'bg-stone-100 text-stone-500'}`}>Yönetici</button>}
      </div>
      <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-2xl overflow-hidden">
        {role === 'admin' ? renderAdminApp() : (role === 'seller' ? renderSellerApp() : renderCustomerApp())}
      </div>
      {toast && <div className="fixed top-6 left-0 right-0 mx-auto w-max z-[9999] bg-stone-900 text-white px-6 py-3 rounded-full font-black text-sm shadow-xl flex items-center gap-2"><Info size={16}/> {toast.msg}</div>}
      {renderAuthModal()}
      {renderCartDrawer()}
    </div>
  );
}
