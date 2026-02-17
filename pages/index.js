import React, { useState, useEffect } from 'react';

// Конфигурация Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fallback данные
const FALLBACK_RATES = {
  Land: { 'All Risk': { additional: 0.0011, fullValue: 0.00115, minimum: 75 }, 'Total Loss': { additional: 0.0011, fullValue: 0.00115, minimum: 75 } },
  Air: { 'All Risk': { additional: 0.002, fullValue: 0.002, minimum: 75 }, 'Total Loss': { additional: 0.002, fullValue: 0.002, minimum: 75 } },
  Ocean: { 'All Risk': { additional: 0.0025, fullValue: 0.0025, minimum: 75 }, 'Total Loss': { additional: 0.0025, fullValue: 0.0025, minimum: 75 } }
};

const FALLBACK_DEDUCTIBLES = [
  { min: 0, max: 5000, deductible: 0 },
  { min: 5000.01, max: 50999, deductible: 500 },
  { min: 50999.01, max: 100999, deductible: 750 },
  { min: 100999.01, max: 350999, deductible: 1500 },
  { min: 350999.01, max: 500000, deductible: 2000 },
  { min: 500000.01, max: Infinity, deductible: 'quote' }
];

// Fallback категории (новые 32 категории)
const FALLBACK_CATEGORIES = [
  'Automotive Parts & Accessories',
  'Aviation & Aerospace Equipment',
  'Battery Cells & Modules',
  'Chemicals & Consumables',
  'Construction Vehicles (Off-Road)',
  'Electrical & Control Components',
  'Electrical & Electronic Equipment',
  'Electronics & Consumer Goods',
  'Energy Storage Systems',
  'EV Charging Systems',
  'Food & Agricultural Products',
  'Foodservice & Kitchen Equipment',
  'Furniture & Home Goods',
  'Heavy Machinery & Construction Equipment',
  'Industrial Machinery & Manufacturing Equipment',
  'Machine Parts & Accessories',
  'Marine Vessels & Equipment',
  'Medical & Laboratory Equipment',
  'Metals & Raw Materials',
  'Military & Defense Equipment',
  'Miscellaneous & Consumables',
  'Miscellaneous General Cargo',
  'Oilfield & Mining Equipment',
  'Packaging & Logistics',
  'Packaging & Paper Products',
  'Power Generation & Energy Equipment',
  'Renewable Energy Equipment',
  'Textiles & Apparel',
  'Tools & Workshop Equipment',
  'Trade Show & Display Equipment',
  'Vehicles (Road)',
  'Wood & Building Materials'
];

const COVERAGE_DESCRIPTIONS = {
  'All Risk': {
    text: 'All Risk coverage offers the broadest protection for cargo during transit. It covers physical loss or damage caused by ',
    bold: 'physical external causes',
    textAfter: ', including partial or total loss, small or big damage or loss, theft, and catastrophic events. This is the highest coverage on any freight insurance policy. Coverage applies from the point the goods begin transit through final delivery, including loading and unloading.'
  },
  'Total Loss': {
    text: 'Total loss coverage applies only if the entire shipment is completely lost or destroyed due to catastrophic event. Partial loss is not covered.',
    bold: null,
    textAfter: null
  }
};

// Excluded Commodities grouped by category
const EXCLUDED_COMMODITIES = {
  'High-Value Items': [
    'Jewelry',
    'Watches',
    'Diamonds',
    'Precious Metals',
    'Precious or Semi-Precious Stones',
    'Specie and Bullion',
    'Bronze Statues',
    'Fine Art and Silverware (unless pre-authorized)',
    'Furs'
  ],
  'Electronics (Restricted)': [
    'Cellular or Mobile Telephones / Smartphones',
    'iPads',
    'Laptops and Desktop Computers (Non Business-to-Business)',
    'Computer Memory (SIMMS, DIMMS), CPUs (unless pre-authorized)',
    'Plasma TVs'
  ],
  'Perishables & Live Goods': [
    'Fresh Perishable Goods (ice cream, cheese, butter, milk, eggs)',
    'Fresh Fish',
    'Produce, Fruits, Vegetables',
    'Dairy Products, Eggs',
    'Flowers',
    'Live Plants',
    'Live Animals',
    'Livestock, Animals including Semen'
  ],
  'Documents & Financial Instruments': [
    'Bank Notes',
    'Bonds, Notes, Deeds',
    'Negotiable Securities',
    'Stamps',
    'Non-reconstructable Documents, Records'
  ],
  'Hazardous & Restricted Materials': [
    'Explosives or Flammables; Red Label / Dangerous Goods',
    'Chemicals (certain types)',
    'THC, Marijuana, Marijuana Goods',
    'Pharmaceuticals (Medicine, Vitamins)',
    'Human Organs or Blood',
    'Weapons'
  ],
  'Bulk & Unpackaged Goods': [
    'General Bulk Commodities (steel, ores, petroleum products)',
    'Bagged Goods not in containers',
    'Loose goods not professionally packaged',
    'Non-Containerized Lumber',
    'Unprofessionally Packed Goods'
  ],
  'Other Excluded Items': [
    'Cigarettes and Tobacco Products',
    'Fertilizers',
    'Fishmeal',
    'Household Goods and Personal Effects',
    'Spirits in Bottles (unless pre-authorized)',
    'Waste and/or Garbage',
    'Marble Slabs',
    'Glass',
    'Residence Shipments',
    'Vehicles for Individuals'
  ]
};

// Excluded Commodities Popup Component
function ExcludedCommoditiesPopup({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '24px 30px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{ fontSize: '28px' }}>🚫</span>
              Excluded Commodities
            </h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
              The following items are not eligible for coverage
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '40px',
              height: '40px',
              color: '#64748b',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '24px 30px',
          overflowY: 'auto',
          maxHeight: 'calc(80vh - 100px)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {Object.entries(EXCLUDED_COMMODITIES).map(([category, items]) => (
              <div key={category} style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  margin: '0 0 14px',
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#ea580c',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    background: '#ea580c',
                    borderRadius: '50%'
                  }}></span>
                  {category}
                </h3>
                <ul style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none'
                }}>
                  {items.map((item, index) => (
                    <li key={index} style={{
                      padding: '8px 0',
                      borderBottom: index < items.length - 1 ? '1px solid #e2e8f0' : 'none',
                      color: '#475569',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer Note */}
          <div style={{
            marginTop: '24px',
            padding: '16px 20px',
            background: '#fef3c7',
            borderRadius: '10px',
            border: '1px solid #fcd34d'
          }}>
            <p style={{
              margin: 0,
              color: '#92400e',
              fontSize: '13px',
              lineHeight: '1.5'
            }}>
              <strong>Note:</strong> Some items marked "unless pre-authorized" may be eligible for coverage with prior approval. 
              Please contact us for special arrangements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FreightInsuranceCalculator() {
  const [category, setCategory] = useState('');
  const [goodsInsured, setGoodsInsured] = useState('');
  const [transitMethod, setTransitMethod] = useState('');
  const [coverageType, setCoverageType] = useState('');
  const [coverageFor, setCoverageFor] = useState('');
  const [cargoValue, setCargoValue] = useState('');
  const [cargoValueDisplay, setCargoValueDisplay] = useState('');
  const [additionalValue, setAdditionalValue] = useState('');
  const [additionalValueDisplay, setAdditionalValueDisplay] = useState('');
  const [carrierInsurance, setCarrierInsurance] = useState('');
  const [carrierInsuranceDisplay, setCarrierInsuranceDisplay] = useState('');
  const [quote, setQuote] = useState(null);
  const [errors, setErrors] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);
  
  // Данные из БД
  const [ratesData, setRatesData] = useState(null);
  const [deductiblesData, setDeductiblesData] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Форматирование числа с разделителями
  const formatNumberWithCommas = (value) => {
    if (!value) return '';
    const num = value.toString().replace(/[^0-9]/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Парсинг числа из строки с разделителями
  const parseNumberFromDisplay = (value) => {
    return value.replace(/[^0-9]/g, '');
  };

  // Обработчик изменения Cargo Value
  const handleCargoValueChange = (e) => {
    const rawValue = parseNumberFromDisplay(e.target.value);
    setCargoValue(rawValue);
    setCargoValueDisplay(formatNumberWithCommas(rawValue));
    setErrors({...errors, cargoValue: null});
  };

  // Обработчик изменения Additional Value
  const handleAdditionalValueChange = (e) => {
    const rawValue = parseNumberFromDisplay(e.target.value);
    setAdditionalValue(rawValue);
    setAdditionalValueDisplay(formatNumberWithCommas(rawValue));
    setErrors({...errors, additionalValue: null});
  };

  // Обработчик изменения Carrier Insurance
  const handleCarrierInsuranceChange = (e) => {
    const rawValue = parseNumberFromDisplay(e.target.value);
    setCarrierInsurance(rawValue);
    setCarrierInsuranceDisplay(formatNumberWithCommas(rawValue));
    setErrors({...errors, carrierInsurance: null});
  };

  // Загрузка данных из Supabase
  useEffect(() => {
    async function loadData() {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, using fallback data');
        setCategoriesList(FALLBACK_CATEGORIES);
        setIsLoading(false);
        return;
      }

      try {
        const headers = {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        };

        // Загружаем ставки
        const ratesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/rates_overview?is_active=eq.true`,
          { headers }
        );
        
        if (ratesResponse.ok) {
          const rates = await ratesResponse.json();
          const ratesMap = {};
          rates.forEach(r => {
            if (!ratesMap[r.transit_method]) ratesMap[r.transit_method] = {};
            if (!ratesMap[r.transit_method][r.coverage_type]) ratesMap[r.transit_method][r.coverage_type] = {};
            
            const coverageForKey = r.coverage_for === 'Full Value' ? 'fullValue' : 'additional';
            ratesMap[r.transit_method][r.coverage_type][coverageForKey] = r.rate;
            ratesMap[r.transit_method][r.coverage_type].minimum = r.minimum_premium;
          });
          setRatesData(ratesMap);
        }

        // Загружаем deductibles
        const deductiblesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/deductible_tiers?is_active=eq.true&order=display_order`,
          { headers }
        );
        
        if (deductiblesResponse.ok) {
          const deductibles = await deductiblesResponse.json();
          setDeductiblesData(deductibles.map(d => ({
            min: d.min_cargo_value,
            max: d.max_cargo_value || Infinity,
            deductible: d.requires_quote ? 'quote' : d.deductible_amount
          })));
        }

        // Загружаем категории товаров
        const categoriesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/goods_categories?is_active=eq.true&order=display_order`,
          { headers }
        );
        
        if (categoriesResponse.ok) {
          const categories = await categoriesResponse.json();
          if (categories.length > 0) {
            setCategoriesList(categories.map(c => c.name));
          } else {
            setCategoriesList(FALLBACK_CATEGORIES);
          }
        } else {
          setCategoriesList(FALLBACK_CATEGORIES);
        }

      } catch (error) {
        console.error('Error loading data from Supabase:', error);
        setCategoriesList(FALLBACK_CATEGORIES);
      }
      
      setIsLoading(false);
    }

    loadData();
  }, []);

  // Используем данные из БД или fallback
  const rates = ratesData || FALLBACK_RATES;
  const deductibles = deductiblesData || FALLBACK_DEDUCTIBLES;
  const categories = categoriesList.length > 0 ? categoriesList : FALLBACK_CATEGORIES;

  // Auto-calculate cargo value when additional coverage is selected
  useEffect(() => {
    if (coverageFor === 'Additional') {
      const additional = parseFloat(additionalValue) || 0;
      const carrier = parseFloat(carrierInsurance) || 0;
      if (additional > 0 || carrier > 0) {
        const total = (additional + carrier).toString();
        setCargoValue(total);
        setCargoValueDisplay(formatNumberWithCommas(total));
      }
    }
  }, [additionalValue, carrierInsurance, coverageFor]);

  const calculateDeductible = (value) => {
    for (const tier of deductibles) {
      if (value >= tier.min && value <= tier.max) {
        return tier.deductible;
      }
    }
    return 'quote';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  const formatRate = (rate) => {
    const percentage = rate * 100;
    // Минимум 2 знака после запятой, убираем лишние нули
    let formatted = percentage.toFixed(3);
    // Убираем лишние нули в конце, но оставляем минимум 2 знака
    while (formatted.endsWith('0') && formatted.split('.')[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
    return formatted + '%';
  };

  const calculateQuote = () => {
    const newErrors = {};
    if (!transitMethod) newErrors.transitMethod = 'Please select transit method';
    if (!coverageType) newErrors.coverageType = 'Please select coverage type';
    if (!coverageFor) newErrors.coverageFor = 'Please select coverage for';
    
    const cargo = parseFloat(cargoValue);
    if (!cargoValue || isNaN(cargo) || cargo <= 0) {
      newErrors.cargoValue = 'Please enter a valid cargo value';
    }

    if (coverageFor === 'Additional') {
      const additional = parseFloat(additionalValue);
      const carrier = parseFloat(carrierInsurance);
      if (!additionalValue || isNaN(additional) || additional <= 0) {
        newErrors.additionalValue = 'Please enter additional value';
      }
      if (!carrierInsurance || isNaN(carrier) || carrier < 0) {
        newErrors.carrierInsurance = 'Please enter carrier insurance';
      }
      if (additional && carrier && Math.abs((additional + carrier) - cargo) > 0.01) {
        newErrors.cargoValue = 'Cargo value must equal Additional Value + Carrier Insurance';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsCalculating(true);
    
    setTimeout(() => {
      const transitRates = rates[transitMethod]?.[coverageType];
      if (!transitRates) {
        setErrors({ general: 'Rate not found for selected options' });
        setIsCalculating(false);
        return;
      }
      
      const rate = coverageFor === 'Full Value' ? transitRates.fullValue : transitRates.additional;
      const insuredAmount = coverageFor === 'Full Value' ? cargo : parseFloat(additionalValue);
      
      let premium = insuredAmount * rate;
      premium = Math.max(premium, transitRates.minimum || 75);
      
      const deductible = coverageFor === 'Full Value' ? calculateDeductible(cargo) : 0;

      setQuote({
        rate,
        premium: Math.round(premium * 100) / 100,
        deductible,
        minimum: transitRates.minimum || 75,
        insuredAmount,
        needsQuote: deductible === 'quote'
      });
      setIsCalculating(false);
    }, 600);
  };

  const resetForm = () => {
    setCategory('');
    setGoodsInsured('');
    setTransitMethod('');
    setCoverageType('');
    setCoverageFor('');
    setCargoValue('');
    setCargoValueDisplay('');
    setAdditionalValue('');
    setAdditionalValueDisplay('');
    setCarrierInsurance('');
    setCarrierInsuranceDisplay('');
    setQuote(null);
    setErrors({});
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#1e293b' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p>Loading calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#1e293b',
      padding: '20px'
    }}>
      {/* Excluded Commodities Popup */}
      <ExcludedCommoditiesPopup isOpen={showExcluded} onClose={() => setShowExcluded(false)} />

      {/* Header with FreightInsuranceDirect Logo */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto 30px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px',
          marginBottom: '10px',
          flexWrap: 'wrap'
        }}>
          {/* Truck Icon */}
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" rx="2"/>
              <path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          
          {/* Logo Text */}
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              <span style={{ color: '#1e293b' }}>Freight</span>
              <span style={{ color: '#1e293b' }}>Insurance</span>
              <span style={{ color: '#ea580c' }}>Direct</span>
              <span style={{ fontSize: '14px', verticalAlign: 'super', color: '#64748b' }}>®</span>
            </h1>
            <div style={{
              height: '3px',
              background: 'linear-gradient(90deg, #ea580c 0%, #f97316 50%, #fbbf24 100%)',
              borderRadius: '2px',
              marginTop: '4px'
            }}></div>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#64748b', letterSpacing: '1px' }}>
              RAMON INC. • SINCE 1982
            </p>
          </div>
          
          {/* Trusted Badge */}
          <div style={{
            background: 'linear-gradient(135deg, #78350f 0%, #a16207 100%)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '700',
            textAlign: 'center',
            border: '2px solid #ca8a04',
            boxShadow: '0 4px 12px rgba(161, 98, 7, 0.3)'
          }}>
            <div style={{ color: '#fde047', letterSpacing: '1px' }}>TRUSTED</div>
            <div style={{ color: '#fef3c7', fontSize: '13px' }}>SINCE</div>
            <div style={{ color: '#fde047', fontSize: '16px' }}>1982</div>
          </div>
        </div>
        
        <h2 style={{
          fontSize: '32px',
          fontWeight: '600',
          margin: '25px 0 10px',
          color: '#1e3a5f'
        }}>Cargo Insurance Calculator</h2>
        <p style={{ color: '#64748b', margin: 0 }}>Get an instant quote for your freight insurance needs</p>
      </div>

      {/* Main Calculator */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}>
        {/* Form Section */}
        <div style={{ padding: '40px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {/* Category of Goods */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Category of Goods
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: '#1e293b',
                  fontSize: '15px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Goods Insured */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Goods Insured
              </label>
              <input
                type="text"
                value={goodsInsured}
                onChange={(e) => setGoodsInsured(e.target.value)}
                placeholder="Describe your goods..."
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  color: '#1e293b',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Transit Method */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Transit Method *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['Land', 'Air', 'Ocean'].map(method => (
                  <button
                    key={method}
                    onClick={() => { setTransitMethod(method); setErrors({...errors, transitMethod: null}); }}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: transitMethod === method 
                        ? 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)'
                        : '#f8fafc',
                      border: transitMethod === method 
                        ? 'none'
                        : `1px solid ${errors.transitMethod ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      color: transitMethod === method ? '#fff' : '#1e293b',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>
                      {method === 'Land' ? '🚛' : method === 'Air' ? '✈️' : '🚢'}
                    </span>
                    {method}
                  </button>
                ))}
              </div>
              {errors.transitMethod && <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{errors.transitMethod}</p>}
            </div>

            {/* Coverage Type */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Coverage Type *
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['All Risk', 'Total Loss'].map(type => (
                  <button
                    key={type}
                    onClick={() => { setCoverageType(type); setErrors({...errors, coverageType: null}); }}
                    style={{
                      flex: 1,
                      padding: '14px 20px',
                      background: coverageType === type 
                        ? 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)'
                        : '#f8fafc',
                      border: coverageType === type 
                        ? 'none'
                        : `1px solid ${errors.coverageType ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      color: coverageType === type ? '#fff' : '#1e293b',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {errors.coverageType && <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{errors.coverageType}</p>}
            </div>

            {/* Coverage For */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Coverage For *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                {['Full Value', 'Additional'].map(type => (
                  <button
                    key={type}
                    onClick={() => { 
                      setCoverageFor(type); 
                      setErrors({...errors, coverageFor: null});
                      if (type === 'Full Value') {
                        setAdditionalValue('');
                        setAdditionalValueDisplay('');
                        setCarrierInsurance('');
                        setCarrierInsuranceDisplay('');
                      }
                    }}
                    style={{
                      padding: '16px 20px',
                      background: coverageFor === type 
                        ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                        : '#f8fafc',
                      border: coverageFor === type 
                        ? 'none'
                        : `1px solid ${errors.coverageFor ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: '12px',
                      color: coverageFor === type ? '#fff' : '#1e293b',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>{type}</div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      {type === 'Full Value' ? 'Insure entire cargo value' : 'Top-up existing carrier insurance'}
                    </div>
                  </button>
                ))}
              </div>
              {errors.coverageFor && <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{errors.coverageFor}</p>}
            </div>

            {/* Cargo Value */}
            <div style={{ gridColumn: coverageFor === 'Additional' ? 'auto' : '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Cargo Value (USD) *
              </label>
              <div style={{ position: 'relative', maxWidth: coverageFor === 'Additional' ? '100%' : '400px' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>$</span>
                <input
                  type="text"
                  value={cargoValueDisplay}
                  onChange={handleCargoValueChange}
                  placeholder="0"
                  readOnly={coverageFor === 'Additional'}
                  style={{
                    width: '100%',
                    padding: '16px 16px 16px 36px',
                    background: coverageFor === 'Additional' ? '#f1f5f9' : '#f8fafc',
                    border: `1px solid ${errors.cargoValue ? '#ef4444' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    color: '#1e293b',
                    fontSize: '20px',
                    fontWeight: '700',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {errors.cargoValue && <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{errors.cargoValue}</p>}
            </div>

            {/* Additional Coverage Fields */}
            {coverageFor === 'Additional' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Additional Value (USD) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                      fontSize: '16px'
                    }}>$</span>
                    <input
                      type="text"
                      value={additionalValueDisplay}
                      onChange={handleAdditionalValueChange}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 32px',
                        background: '#f8fafc',
                        border: `1px solid ${errors.additionalValue ? '#ef4444' : '#e2e8f0'}`,
                        borderRadius: '12px',
                        color: '#1e293b',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {errors.additionalValue && <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{errors.additionalValue}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#64748b', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Carrier&apos;s Insurance (USD) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                      fontSize: '16px'
                    }}>$</span>
                    <input
                      type="text"
                      value={carrierInsuranceDisplay}
                      onChange={handleCarrierInsuranceChange}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 32px',
                        background: '#f8fafc',
                        border: `1px solid ${errors.carrierInsurance ? '#ef4444' : '#e2e8f0'}`,
                        borderRadius: '12px',
                        color: '#1e293b',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {errors.carrierInsurance && <p style={{ color: '#ef4444', fontSize: '12px', margin: '6px 0 0' }}>{errors.carrierInsurance}</p>}
                </div>
              </>
            )}
          </div>

          {/* Calculate Button */}
          <div style={{ marginTop: '30px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button
              onClick={calculateQuote}
              disabled={isCalculating}
              style={{
                flex: '2 1 200px',
                padding: '18px 40px',
                background: isCalculating 
                  ? '#fdba74'
                  : 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isCalculating ? 'wait' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isCalculating ? (
                <>
                  <span style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}/>
                  Calculating...
                </>
              ) : (
                <>Calculate Quote</>
              )}
            </button>
            <button
              onClick={resetForm}
              style={{
                flex: '1 1 100px',
                padding: '18px 30px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                color: '#64748b',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Quote Result */}
        {quote && (
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
            borderTop: '1px solid #bbf7d0',
            padding: '40px',
            animation: 'fadeIn 0.5s ease'
          }}>
            {quote.needsQuote ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
                <h3 style={{ fontSize: '24px', color: '#d97706', margin: '0 0 10px' }}>Custom Quote Required</h3>
                <p style={{ color: '#64748b', margin: '0 0 20px' }}>
                  For cargo values over $500,000, please contact us for a personalized quote.
                </p>
                <a
                  href="https://ramonins-usa.com/contact-us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '14px 30px',
                    background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                    borderRadius: '10px',
                    color: '#fff',
                    textDecoration: 'none',
                    fontWeight: '600'
                  }}
                >
                  Request a Quote
                </a>
              </div>
            ) : (
              <>
                <h3 style={{ fontSize: '20px', color: '#059669', margin: '0 0 25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>✓</span> Your Quote
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Rate</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>{formatRate(quote.rate)}</div>
                  </div>
                  
                  <div style={{
                    background: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)',
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center',
                    border: '1px solid #86efac'
                  }}>
                    <div style={{ color: '#059669', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Premium</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#059669' }}>{formatCurrency(quote.premium)}</div>
                  </div>
                  
                  {coverageFor === 'Full Value' && (
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '20px',
                      textAlign: 'center',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Deductible</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b' }}>{formatCurrency(quote.deductible)}</div>
                    </div>
                  )}
                </div>

                <div style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '25px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h4 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '16px' }}>
                    {coverageType} Coverage
                  </h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                    {COVERAGE_DESCRIPTIONS[coverageType].text}
                    {COVERAGE_DESCRIPTIONS[coverageType].bold && (
                      <strong style={{ color: '#1e293b' }}>{COVERAGE_DESCRIPTIONS[coverageType].bold}</strong>
                    )}
                    {COVERAGE_DESCRIPTIONS[coverageType].textAfter}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <a
                    href="https://ramonins-usa.com/purchase-now/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: '1 1 200px',
                      padding: '16px 30px',
                      background: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
                      borderRadius: '10px',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: '600',
                      textAlign: 'center',
                      boxShadow: '0 4px 14px rgba(234, 88, 12, 0.3)'
                    }}
                  >
                    Purchase Coverage →
                  </a>
                  <button
                    onClick={() => setShowExcluded(true)}
                    style={{
                      flex: '1 1 200px',
                      padding: '16px 30px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      color: '#64748b',
                      fontWeight: '500',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    View Excluded Goods
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          padding: '20px 40px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: '12px',
            lineHeight: '1.6'
          }}>
            <strong style={{ color: '#1e293b' }}>Disclaimer:</strong> All quotes are indicative and non-binding. Coverage, rates, limits, and terms are subject to verification of shipment information, underwriting approval, and policy issuance. We reserve the rights to modify or withdraw quotations. For support, call <strong style={{ color: '#1e293b' }}>888-441-4435</strong>.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: '900px',
        margin: '30px auto 0',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '13px'
      }}>
        <p style={{ margin: '0 0 10px' }}>© 2024 Ramon Inc. All rights reserved.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <a href="https://ramonins-usa.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1e3a5f', textDecoration: 'none' }}>Website</a>
          <a href="https://ramonins-usa.com/contact-us/" target="_blank" rel="noopener noreferrer" style={{ color: '#1e3a5f', textDecoration: 'none' }}>Contact Us</a>
          <button 
            onClick={() => setShowExcluded(true)}
            style={{ 
              color: '#1e3a5f', 
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              padding: 0
            }}
          >
            Excluded Goods
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
