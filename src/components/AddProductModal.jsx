import React, { useState, useEffect, useRef } from 'react';
import { useCash } from '../context/CashContext';
import { 
  Package, 
  X, 
  Plus, 
  Trash2, 
  Smartphone, 
  Headphones, 
  Zap, 
  ShieldAlert, 
  DollarSign, 
  Tag, 
  Palette,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Star,
  Check,
  Link
} from 'lucide-react';

const PALETTE_SWATCHES = [
  { name: 'أسود', hex: '#1e293b' },
  { name: 'أبيض', hex: '#ffffff' },
  { name: 'أزرق ثلجي', hex: '#38bdf8' },
  { name: 'أزرق سماوي', hex: '#60a5fa' },
  { name: 'كحلي داكن', hex: '#1e3a8a' },
  { name: 'أحمر', hex: '#dc2626' },
  { name: 'أخضر نعناعي', hex: '#10b981' },
  { name: 'أخضر زيتي', hex: '#15803d' },
  { name: 'ذهبي / تيتانيوم', hex: '#eab308' },
  { name: 'فضي معدني', hex: '#94a3b8' },
  { name: 'بنفسجي عميق', hex: '#9333ea' },
  { name: 'وردي هادئ', hex: '#f472b6' },
  { name: 'رمادي غامق', hex: '#475569' },
  { name: 'تيتانيوم صحراوي', hex: '#d97706' },
];

const ACCESSORY_CATEGORIES = [
  { id: 'accessories', label: 'إكسسوارات عامة' },
  { id: 'chargers', label: 'شواحن وكابلات' },
  { id: 'earphones', label: 'سماعات وإيربودز' },
  { id: 'cases', label: 'جرابات وكفرات' },
  { id: 'screen_protectors', label: 'اسكرينات حماية' },
  { id: 'powerbanks', label: 'باور بانك وبطاريات' },
  { id: 'memory', label: 'فلاشات وكروت ميموري' },
  { id: 'services', label: 'خطوط وكروت شحن' },
];

export const PHONE_MODELS_BY_BRAND = {
  'سامسونج (Samsung)': [
    'Samsung Galaxy A55 5G',
    'Samsung Galaxy A35 5G',
    'Samsung Galaxy A25 5G',
    'Samsung Galaxy A15',
    'Samsung Galaxy A05s',
    'Samsung Galaxy A05',
    'Samsung Galaxy A54 5G',
    'Samsung Galaxy A34 5G',
    'Samsung Galaxy A24',
    'Samsung Galaxy A14',
    'Samsung Galaxy S24 Ultra',
    'Samsung Galaxy S24+',
    'Samsung Galaxy S24',
    'Samsung Galaxy S24 FE',
    'Samsung Galaxy S23 Ultra',
    'Samsung Galaxy S23 FE',
    'Samsung Galaxy S23',
    'Samsung Galaxy S22 Ultra',
    'Samsung Galaxy Z Fold 6',
    'Samsung Galaxy Z Flip 6',
    'Samsung Galaxy Z Fold 5',
    'Samsung Galaxy Z Flip 5'
  ],
  'آبل (Apple)': [
    'Apple iPhone 16 Pro Max',
    'Apple iPhone 16 Pro',
    'Apple iPhone 16 Plus',
    'Apple iPhone 16',
    'Apple iPhone 15 Pro Max',
    'Apple iPhone 15 Pro',
    'Apple iPhone 15 Plus',
    'Apple iPhone 15',
    'Apple iPhone 14 Pro Max',
    'Apple iPhone 14 Pro',
    'Apple iPhone 14 Plus',
    'Apple iPhone 14',
    'Apple iPhone 13 Pro Max',
    'Apple iPhone 13 Pro',
    'Apple iPhone 13',
    'Apple iPhone 13 mini',
    'Apple iPhone 12 Pro Max',
    'Apple iPhone 12',
    'Apple iPhone 11 Pro Max',
    'Apple iPhone 11'
  ],
  'شاومي (Xiaomi)': [
    'Xiaomi Redmi Note 13 Pro+ 5G',
    'Xiaomi Redmi Note 13 Pro 4G',
    'Xiaomi Redmi Note 13 4G',
    'Xiaomi Redmi 13C',
    'Xiaomi Redmi 13 4G',
    'Xiaomi Redmi 12',
    'Xiaomi Redmi 10C',
    'Xiaomi Redmi A3',
    'Xiaomi 14T Pro',
    'Xiaomi 14T',
    'Xiaomi 14',
    'Xiaomi 13T Pro',
    'Xiaomi 13T',
    'Poco X6 Pro 5G',
    'Poco X6 5G',
    'Poco M6 Pro',
    'Poco C65'
  ],
  'ريلمي (Realme)': [
    'Realme 12 Pro+ 5G',
    'Realme 12+ 5G',
    'Realme 12 5G',
    'Realme 11 Pro+ 5G',
    'Realme 11 4G',
    'Realme C67 4G',
    'Realme C65',
    'Realme C55',
    'Realme C53',
    'Realme Note 50',
    'Realme GT 6',
    'Realme GT 6T'
  ],
  'أوبو (Oppo)': [
    'Oppo Reno 12 Pro 5G',
    'Oppo Reno 12 5G',
    'Oppo Reno 12F 5G',
    'Oppo Reno 11F 5G',
    'Oppo Reno 11 5G',
    'Oppo Reno 10 5G',
    'Oppo A79 5G',
    'Oppo A78 4G',
    'Oppo A58',
    'Oppo A38',
    'Oppo A18',
    'Oppo A3 Pro 5G',
    'Oppo A60'
  ],
  'إنفينيكس (Infinix)': [
    'Infinix Note 40 Pro',
    'Infinix Note 40',
    'Infinix Hot 40 Pro',
    'Infinix Hot 40',
    'Infinix Hot 40i',
    'Infinix Hot 30',
    'Infinix Smart 8 Pro',
    'Infinix Smart 8',
    'Infinix GT 20 Pro'
  ],
  'تكنو (Tecno)': [
    'Tecno Spark 20 Pro+',
    'Tecno Spark 20 Pro',
    'Tecno Spark 20',
    'Tecno Spark 20C',
    'Tecno Camon 30 Pro 5G',
    'Tecno Camon 30',
    'Tecno Pova 6 Pro 5G',
    'Tecno Pop 8'
  ],
  'هونر (Honor)': [
    'Honor 200 Pro',
    'Honor 200',
    'Honor 90',
    'Honor X9b 5G',
    'Honor X8b',
    'Honor X7b',
    'Honor X6b',
    'Honor Magic 6 Pro'
  ],
  'فيفو (Vivo)': [
    'Vivo V30 5G',
    'Vivo V30e',
    'Vivo V29 5G',
    'Vivo Y100 4G',
    'Vivo Y28',
    'Vivo Y27s',
    'Vivo Y17s',
    'Vivo Y03'
  ]
};

export const ACCESSORY_BRANDS = [
  'أنكر (Anker)',
  'جوي روم (Joyroom)',
  'بيسوس (Baseus)',
  'أورايمو (Oraimo)',
  'سامسونج (Samsung)',
  'آبل (Apple)',
  'شاومي (Xiaomi)',
  'ريلمي (Realme)',
  'هواوي (Huawei)',
  'جي بي إل (JBL)',
  'سوني (Sony)'
];

export const STORAGE_PRESETS = [
  '128GB / 8GB RAM',
  '256GB / 8GB RAM',
  '256GB / 12GB RAM',
  '512GB / 12GB RAM',
  '128GB / 6GB RAM',
  '128GB / 4GB RAM',
  '64GB / 4GB RAM',
  '128GB',
  '256GB',
  '512GB',
  '1TB'
];

export default function AddProductModal() {
  const { activeModal, setActiveModal, modalData, addProduct, updateProduct, showToast } = useCash();
  const dialogRef = useRef(null);
  const fileInputRef = useRef(null);

  const isEdit = Boolean(modalData?.product);

  const [category, setCategory] = useState('phones');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('سامسونج (Samsung)');
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [storage, setStorage] = useState('128GB / 8GB RAM');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [minStockAlert, setMinStockAlert] = useState(5);
  const [notes, setNotes] = useState('');

  // Images list: [mainImage, subImage1, subImage2, ...]
  const [images, setImages] = useState([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Variants list: [{ color: 'أزرق', hex: '#2563eb', quantity: 3 }, ...]
  const [variants, setVariants] = useState([
    { color: 'أزرق ثلجي', hex: '#38bdf8', quantity: 3 },
    { color: 'أسود كحلي', hex: '#1e293b', quantity: 2 }
  ]);

  // Models for currently selected brand
  const currentModelsList = PHONE_MODELS_BY_BRAND[brand] || [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (activeModal === 'addProduct') {
      if (!dialog.open) dialog.showModal();

      if (modalData?.product) {
        const p = modalData.product;
        const cat = p.category || 'phones';
        setCategory(cat);
        setName(p.name || '');
        setBrand(p.brand || 'سامسونج (Samsung)');
        setStorage(p.storage || '');
        setCostPrice(p.costPrice || '');
        setSalePrice(p.salePrice || '');
        setMinStockAlert(p.minStockAlert !== undefined ? p.minStockAlert : 5);
        setNotes(p.notes || '');
        setImages(Array.isArray(p.images) ? p.images : []);
        setVariants(
          Array.isArray(p.variants) && p.variants.length > 0 
            ? p.variants.map(v => ({ color: v.color || '', hex: v.hex || '#1e293b', quantity: v.quantity || 0 }))
            : [{ color: 'افتراضي', hex: '#1e293b', quantity: p.totalQuantity || 1 }]
        );

        const knownBrands = cat === 'phones' ? Object.keys(PHONE_MODELS_BY_BRAND) : ACCESSORY_BRANDS;
        setIsCustomBrand(!knownBrands.includes(p.brand));

        const brandModels = PHONE_MODELS_BY_BRAND[p.brand] || [];
        setIsCustomModel(!brandModels.includes(p.name));
      } else {
        // Reset defaults for new item
        setCategory('phones');
        const defaultBrand = 'سامسونج (Samsung)';
        const defaultModels = PHONE_MODELS_BY_BRAND[defaultBrand] || [];
        setBrand(defaultBrand);
        setName(defaultModels[0] || 'Samsung Galaxy A55 5G');
        setIsCustomBrand(false);
        setIsCustomModel(false);
        setStorage('128GB / 8GB RAM');
        setCostPrice('');
        setSalePrice('');
        setMinStockAlert(5);
        setNotes('');
        setImages([]);
        setImageUrlInput('');
        setShowUrlInput(false);
        setVariants([
          { color: 'أزرق ثلجي', hex: '#38bdf8', quantity: 3 },
          { color: 'أسود كحلي', hex: '#1e293b', quantity: 2 }
        ]);
      }
    } else {
      if (dialog.open) dialog.close();
    }
  }, [activeModal, modalData]);

  const handleBrandChange = (newBrand) => {
    if (newBrand === '__custom__') {
      setIsCustomBrand(true);
      setBrand('');
      setIsCustomModel(true);
    } else {
      setIsCustomBrand(false);
      setBrand(newBrand);
      if (category === 'phones') {
        const models = PHONE_MODELS_BY_BRAND[newBrand] || [];
        if (models.length > 0) {
          setName(models[0]);
          setIsCustomModel(false);
          if (newBrand.includes('Apple')) {
            setStorage('128GB');
          } else if (!storage || storage === '128GB') {
            setStorage('128GB / 8GB RAM');
          }
        }
      }
    }
  };

  const handleClose = () => {
    setActiveModal(null);
  };

  // Image Upload handler (supports multi-images via file picker)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        if (dataUrl) {
          setImages(prev => [...prev, dataUrl]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
    showToast(`تم رفع ${files.length} صورة للمنتج`);
  };

  // Add image via URL
  const handleAddUrlImage = () => {
    if (!imageUrlInput.trim()) return;
    setImages(prev => [...prev, imageUrlInput.trim()]);
    setImageUrlInput('');
    setShowUrlInput(false);
    showToast('تمت إضافة رابط الصورة بنجاح');
  };

  // Set any sub-image as the main image (move to index 0)
  const handleSetAsMain = (index) => {
    if (index === 0) return;
    setImages(prev => {
      const copy = [...prev];
      const target = copy.splice(index, 1)[0];
      return [target, ...copy];
    });
    showToast('تم تعيين الصورة كصورة رئيسية للمنتج');
  };

  // Remove image
  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Variants handlers
  const handleAddVariant = () => {
    setVariants(prev => [...prev, { color: '', hex: '#2563eb', quantity: 1 }]);
  };

  const handleUpdateVariant = (index, field, value) => {
    setVariants(prev =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handlePickColorSwatch = (index, swatch) => {
    setVariants(prev =>
      prev.map((v, i) => (i === index ? { ...v, color: swatch.name, hex: swatch.hex } : v))
    );
  };

  const handleRemoveVariant = (index) => {
    if (variants.length <= 1) {
      showToast('يجب تحديد لون واحد على الأقل للمنتج', 'info');
      return;
    }
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const totalQuantity = variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('يرجى كتابة اسم وموديل المنتج', 'error');
      return;
    }

    if (variants.some(v => !v.color.trim())) {
      showToast('يرجى كتابة اسم كل لون أو اختياره من القائمة', 'error');
      return;
    }

    if (totalQuantity <= 0) {
      showToast('يرجى تحديد كمية أكبر من صفر للألوان المضافة', 'error');
      return;
    }

    const payload = {
      category,
      name: name.trim(),
      brand: brand.trim(),
      storage: storage.trim(),
      costPrice: Number(costPrice) || 0,
      salePrice: Number(salePrice) || 0,
      minStockAlert: Number(minStockAlert) || 5,
      notes: notes.trim(),
      images,
      variants: variants.map(v => ({
        color: v.color.trim(),
        hex: v.hex || '#1e293b',
        quantity: Math.max(0, Number(v.quantity) || 0)
      }))
    };

    if (isEdit && modalData?.product?.id) {
      updateProduct(modalData.product.id, payload);
    } else {
      addProduct(payload);
    }

    handleClose();
  };

  if (activeModal !== 'addProduct') return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={(e) => e.target === dialogRef.current && handleClose()}
      aria-labelledby="add-product-title"
      className="fixed inset-0 m-auto z-50 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-0 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop:bg-slate-950/65 overflow-hidden animate-scale-in"
    >
      {/* Header */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
            {category === 'phones' ? <Smartphone className="w-5 h-5" /> : <Package className="w-5 h-5" />}
          </div>
          <div>
            <h2 id="add-product-title" className="text-base sm:text-lg font-black">
              {isEdit ? 'تعديل بيانات الصنف' : 'إضافة هاتف أو منتج جديد'}
            </h2>
            <p className="text-xs text-red-100 mt-0.5">
              تحديد الموديل والمواصفات، الألوان والكميات، وأسعار التكلفة والبيع
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          type="button"
          className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        
        {/* Category Choice */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            نوع الصنف / القسم:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setCategory('phones');
                if (!PHONE_MODELS_BY_BRAND[brand]) {
                  handleBrandChange('سامسونج (Samsung)');
                }
                if (!storage) setStorage('128GB / 8GB RAM');
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                category === 'phones'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-500 text-red-600 dark:text-red-400 ring-2 ring-red-500/20 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>هاتف محمول (موبايل)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCategory('accessories');
                if (!ACCESSORY_BRANDS.includes(brand)) {
                  handleBrandChange('أنكر (Anker)');
                }
                setName('');
                setIsCustomModel(true);
              }}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                category !== 'phones'
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <Headphones className="w-4 h-4" />
              <span>إكسسوارات وملحقات</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* PRODUCT IMAGES (صورة رئيسية + صور فرعية sub) */}
        {/* ======================================================== */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-red-600 shrink-0" />
                <span>صور المنتج (رئيسية + صور فرعية):</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                الصورة الأولى ستكون الرئيسية، وباقي الصور ستظهر كصور فرعية في المعرض
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-interactive flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>رفع من الجهاز</span>
              </button>

              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className={`btn-interactive shrink-0 h-9 w-9 sm:h-auto sm:w-auto p-2 rounded-xl border transition-colors flex items-center justify-center shadow-xs ${
                  showUrlInput
                    ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400'
                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                }`}
                title="إضافة رابط صورة خارجي"
              >
                <Link className="w-3.5 h-3.5" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* URL Input Bar */}
          {showUrlInput && (
            <div className="flex items-center gap-2 animate-fadeIn pt-1">
              <input
                type="url"
                placeholder="الصق رابط الصورة المباشر هنا (https://...)..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
              <button
                type="button"
                onClick={handleAddUrlImage}
                className="btn-interactive shrink-0 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs whitespace-nowrap"
              >
                إضافة
              </button>
            </div>
          )}

          {/* Images Previews Grid */}
          {images.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`group relative rounded-xl border overflow-hidden aspect-square bg-white dark:bg-slate-900 flex items-center justify-center p-1 transition-all ${
                    idx === 0
                      ? 'border-red-500 ring-2 ring-red-500/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  <img src={img} alt={`prod-${idx}`} className="w-full h-full object-contain rounded-lg" />

                  {/* Badge */}
                  <span className={`absolute top-1 right-1 px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                    idx === 0 ? 'bg-red-600 text-white' : 'bg-slate-900/80 text-slate-200'
                  }`}>
                    {idx === 0 ? 'رئيسية' : `فرعية ${idx}`}
                  </span>

                  {/* Hover Overlay Controls */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {idx !== 0 && (
                      <button
                        type="button"
                        onClick={() => handleSetAsMain(idx)}
                        className="p-1 rounded-lg bg-white text-slate-900 hover:bg-red-50 hover:text-red-600 text-[10px] font-bold"
                        title="تعيين هذه الصورة كرئيسية"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 rounded-xl p-4 sm:p-5 text-center cursor-pointer bg-white/60 dark:bg-slate-900/40 transition-colors group"
            >
              <Upload className="w-6 h-6 mx-auto text-slate-400 group-hover:text-red-500 transition-colors mb-1.5" />
              <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                اضغط لاختيار صورة رئيسية وصور فرعية من جهازك
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">يمكنك رفع أكثر من صورة في نفس الوقت</span>
            </div>
          )}
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Brand */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>الماركة / الشركة:</span>
              <button
                type="button"
                onClick={() => {
                  const next = !isCustomBrand;
                  setIsCustomBrand(next);
                  if (!next) {
                    const fallback = category === 'phones' ? 'سامسونج (Samsung)' : 'أنكر (Anker)';
                    handleBrandChange(fallback);
                  }
                }}
                className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-semibold"
              >
                {isCustomBrand ? '📋 اختيار من القائمة' : '✍️ كتابة يدوية'}
              </button>
            </label>
            
            {!isCustomBrand ? (
              <select
                value={brand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
              >
                {category === 'phones' ? (
                  Object.keys(PHONE_MODELS_BY_BRAND).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))
                ) : (
                  ACCESSORY_BRANDS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))
                )}
                <option value="__custom__">✍️ ماركة أخرى (كتابة مخصصة)...</option>
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder={category === 'phones' ? 'مثال: سامسونج، شاومي، آبل...' : 'مثال: أنكر، جوي روم...'}
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            )}
          </div>

          {/* Model / Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{category === 'phones' ? 'موديل الهاتف *' : 'اسم المنتج / الإكسسوار *'}</span>
              {category === 'phones' && (
                <button
                  type="button"
                  onClick={() => setIsCustomModel(!isCustomModel)}
                  className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-semibold flex items-center gap-1"
                >
                  {isCustomModel ? '📋 اختيار من القائمة' : '✍️ كتابة يدوية'}
                </button>
              )}
            </label>

            {category === 'phones' && !isCustomModel && currentModelsList.length > 0 ? (
              <select
                value={currentModelsList.includes(name) ? name : (name ? '__custom__' : '')}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomModel(true);
                  } else {
                    setName(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
                required
              >
                <option value="">-- اضغط لاختيار الموديل ({brand}) --</option>
                {currentModelsList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="__custom__">✍️ موديل آخر (كتابة يدوية مخصصة)...</option>
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder={category === 'phones' ? 'مثال: Galaxy A55 5G' : 'مثال: شاحن سريع 25W Type-C'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
            )}
          </div>

          {/* Specs / Storage (for phones) or category (for accessories) */}
          {category === 'phones' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>المساحة والرام:</span>
                <span className="text-[10px] text-slate-400">اختر من النماذج أو اكتب</span>
              </label>
              <input
                type="text"
                list="storage-presets-list"
                placeholder="مثال: 256GB / 8GB RAM"
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 font-mono"
              />
              <datalist id="storage-presets-list">
                {STORAGE_PRESETS.map(s => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                تصنيف الإكسسوار:
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40 cursor-pointer"
              >
                {ACCESSORY_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Min Stock Alert threshold (Default 5) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>تنبيه النواقص عند أقل من:</span>
              </span>
              <span className="text-[11px] text-amber-600 font-bold">افتراضي: 5 قطع</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                required
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(Math.max(1, Number(e.target.value) || 1))}
                className="w-full pl-12 pr-3.5 py-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                قطع
              </span>
            </div>
          </div>

        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/70">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              سعر الشراء / التكلفة (ج.م):
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-base font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ج.م
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              سعر البيع للجمهور (ج.م):
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 text-base font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ج.م
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLOR & PALETTE MANAGER (مفتوح: كتابة أو اختيار بالـ Palette) */}
        {/* ======================================================== */}
        <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
          
          {/* Header & Total Count Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-red-600 shrink-0" />
                  <span>ألوان المنتج والكميات:</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  اكتب أي اسم لون مخصص أو اختر من النماذج السريعة
                </p>
              </div>

              {/* Mobile Total Badge */}
              <div className="sm:hidden flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
                <span className="text-[10px] text-slate-400">الإجمالي:</span>
                <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                  {totalQuantity} قطع
                </span>
              </div>
            </div>

            {/* Desktop Total Badge */}
            <div className="hidden sm:block text-left bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0">
              <span className="text-[10px] text-slate-400 block">إجمالي القطع</span>
              <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                {totalQuantity} قطع
              </span>
            </div>
          </div>

          {/* Variants Rows */}
          <div className="space-y-2.5">
            {variants.map((variant, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5"
              >
                {/* Responsive Input Group: Stacks on mobile, inline on desktop */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  
                  {/* Top line on mobile: Color Picker + Open Text Color Name */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Visual Color Picker (Native Color Input) */}
                    <div className="relative shrink-0 flex items-center">
                      <input
                        type="color"
                        value={variant.hex || '#1e293b'}
                        onChange={(e) => handleUpdateVariant(idx, 'hex', e.target.value)}
                        className="w-10 h-10 sm:w-9 sm:h-9 p-0.5 rounded-xl border border-slate-300 dark:border-slate-600 cursor-pointer bg-white dark:bg-slate-800 shadow-2xs hover:scale-105 transition-transform shrink-0"
                        title="اضغط لاختيار تدرج اللون من الـ Palette"
                      />
                    </div>

                    {/* Open Text Color Name */}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        required
                        placeholder="اسم اللون (مثال: أزرق ثلجي، أسود...)"
                        value={variant.color}
                        onChange={(e) => handleUpdateVariant(idx, 'color', e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Bottom line on mobile / Right block on desktop: Quantity + Delete button */}
                  <div className="flex items-center gap-2 justify-between sm:justify-start">
                    {/* Quantity for this color */}
                    <div className="flex-1 sm:w-28 relative shrink-0">
                      <input
                        type="number"
                        min="0"
                        required
                        value={variant.quantity}
                        onChange={(e) => handleUpdateVariant(idx, 'quantity', Math.max(0, Number(e.target.value) || 0))}
                        className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-black font-mono text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                        قطع
                      </span>
                    </div>

                    {/* Delete Variant */}
                    {variants.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="btn-interactive h-9 w-9 flex items-center justify-center text-slate-400 hover:text-rose-600 rounded-xl bg-slate-50 dark:bg-slate-800 sm:bg-transparent border border-slate-200 dark:border-slate-700 sm:border-transparent hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                        title="حذف هذا اللون"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="hidden sm:block w-9 shrink-0" />
                    )}
                  </div>

                </div>

                {/* Quick Swatches Bar for this row (No native gray scrollbar on mobile) */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">نماذج سريعة:</span>
                  {PALETTE_SWATCHES.map(sw => (
                    <button
                      key={sw.name}
                      type="button"
                      onClick={() => handlePickColorSwatch(idx, sw)}
                      className="btn-interactive inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: sw.hex }} />
                      <span>{sw.name}</span>
                    </button>
                  ))}
                </div>

              </div>
            ))}
          </div>

          {/* Add Another Color Button & Min Stock Alert */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleAddVariant}
              className="btn-interactive w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-100/80 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold border border-red-200/80 dark:border-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/60 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة لون آخر لهذا الصنف</span>
            </button>

            {totalQuantity < minStockAlert && totalQuantity > 0 && (
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>الكمية الإجمالية أقل من {minStockAlert} (ستظهر كتنبيه نواقص)</span>
              </span>
            )}
          </div>

        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            ملاحظات أو تفاصيل الضمان:
          </label>
          <input
            type="text"
            placeholder="مثال: ضمان محلي معتمد، يشمل جراب واسكرينة هدية..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            إلغاء
          </button>

          <button
            type="submit"
            className="btn-interactive flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-md shadow-red-600/30"
          >
            <span>{isEdit ? 'حفظ التعديلات' : 'إضافة الصنف للمخزون'}</span>
          </button>
        </div>

      </form>
    </dialog>
  );
}