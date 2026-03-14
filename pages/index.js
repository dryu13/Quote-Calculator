import React, { useState, useEffect, useMemo, useCallback } from 'react';

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

// Excluded Commodities Popup Component - Мемоизированный компонент
const ExcludedCommoditiesPopup = React.memo(({ isOpen, onClose }) => {
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
          maxHeight: 'calc(80vh - 140px)',
          overflowY: 'auto',
          padding: '30px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '25px'
          }}>
            {Object.entries(EXCLUDED_COMMODITIES).map(([category, items]) => (
              <div key={category} style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  margin: '0 0 15px',
                  color: '#1e293b',
                  fontSize: '16px',
                  fontWeight: '600',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #e2e8f0'
                }}>
                  {category}
                </h3>
                <ul style={{
                  margin: 0,
                  paddingLeft: '20px',
                  color: '#475569',
                  fontSize: '14px',
                  lineHeight: '1.8'
                }}>
                  {items.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '30px',
            padding: '20px',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '12px'
          }}>
            <p style={{
              margin: 0,
              color: '#92400e',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <strong>Note:</strong> Some items may be eligible for coverage with prior authorization. Please contact us at <strong>888-441-4435</strong> for pre-approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

ExcludedCommoditiesPopup.displayName = 'ExcludedCommoditiesPopup';

export default function CargoCalculator() {
  const [step, setStep] = useState('form');
  
  // Form state
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [goodsDescription, setGoodsDescription] = useState('');
  const [transitMethod, setTransitMethod] = useState('Land');
  const [coverageType, setCoverageType] = useState('All Risk');
  const [coverageFor, setCoverageFor] = useState('Full Value');
  const [cargoValue, setCargoValue] = useState('');
  const [additionalValue, setAdditionalValue] = useState('');
  const [carrierInsurance, setCarrierInsurance] = useState('');
  
  // Quote state
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  
  // Email state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Data state - ОПТИМИЗАЦИЯ: загружаем данные только один раз
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [deductibles, setDeductibles] = useState(FALLBACK_DEDUCTIBLES);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Popup state
  const [showExcluded, setShowExcluded] = useState(false);

  // ОПТИМИЗАЦИЯ: Загружаем данные только один раз при монтировании
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        setDataLoaded(true);
        return;
      }

      try {
        const [categoriesRes, ratesRes, deductiblesRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/categories?select=name&order=name`, {
            headers: { apikey: SUPABASE_ANON_KEY }
          }),
          fetch(`${SUPABASE_URL}/rest/v1/rates?select=*`, {
            headers: { apikey: SUPABASE_ANON_KEY }
          }),
          fetch(`${SUPABASE_URL}/rest/v1/deductibles?select=*&order=min_value`, {
            headers: { apikey: SUPABASE_ANON_KEY }
          })
        ]);

        if (!isMounted) return;

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          if (data.length > 0) {
            setCategories(data.map(c => c.name));
          }
        }

        if (ratesRes.ok) {
          const data = await ratesRes.json();
          if (data.length > 0) {
            const ratesObj = {};
            data.forEach(r => {
              if (!ratesObj[r.transit_method]) ratesObj[r.transit_method] = {};
              if (!ratesObj[r.transit_method][r.coverage_type]) {
                ratesObj[r.transit_method][r.coverage_type] = {};
              }
              ratesObj[r.transit_method][r.coverage_type].additional = r.additional_rate;
              ratesObj[r.transit_method][r.coverage_type].fullValue = r.full_value_rate;
              ratesObj[r.transit_method][r.coverage_type].minimum = r.minimum_premium;
            });
            setRates(ratesObj);
          }
        }

        if (deductiblesRes.ok) {
          const data = await deductiblesRes.json();
          if (data.length > 0) {
            setDeductibles(data.map(d => ({
              min: d.min_value,
              max: d.max_value,
              deductible: d.deductible_amount === -1 ? 'quote' : d.deductible_amount
            })));
          }
        }

      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        if (isMounted) {
          setDataLoaded(true);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []); // Пустой массив зависимостей - загружаем только один раз

  // ОПТИМИЗАЦИЯ: Мемоизируем функцию расчета
  const calculateQuote = useCallback(() => {
    setError('');
    const value = parseFloat(cargoValue);

    if (!value || value <= 0) {
      setError('Please enter a valid cargo value');
      return;
    }

    if (value > 15000000) {
      setError('Maximum insurable value is $15,000,000');
      return;
    }

    if (coverageFor === 'Additional') {
      const addValue = parseFloat(additionalValue);
      const carrierValue = parseFloat(carrierInsurance);
      
      if (!addValue || addValue <= 0) {
        setError('Please enter additional value');
        return;
      }
      if (!carrierValue || carrierValue < 0) {
        setError('Please enter carrier insurance amount');
        return;
      }
      if (carrierValue + addValue > value) {
        setError('Total coverage cannot exceed cargo value');
        return;
      }
    }

    const rateConfig = rates[transitMethod]?.[coverageType];
    if (!rateConfig) {
      setError('Rate configuration not found');
      return;
    }

    let insuredAmount = value;
    let calculatedPremium = 0;

    if (coverageFor === 'Full Value') {
      const rate = rateConfig.fullValue;
      calculatedPremium = value * rate;
    } else {
      insuredAmount = parseFloat(additionalValue);
      const rate = rateConfig.additional;
      calculatedPremium = insuredAmount * rate;
    }

    const minPremium = rateConfig.minimum;
    const finalPremium = Math.max(calculatedPremium, minPremium);

    let deductibleAmount = 0;
    if (coverageFor === 'Full Value') {
      const deductibleConfig = deductibles.find(
        d => value >= d.min && value <= d.max
      );
      deductibleAmount = deductibleConfig ? 
        (deductibleConfig.deductible === 'quote' ? 'quote' : deductibleConfig.deductible) : 
        0;
    }

    setQuote({
      rate: coverageFor === 'Full Value' ? rateConfig.fullValue : rateConfig.additional,
      premium: finalPremium,
      deductible: deductibleAmount,
      insuredAmount: insuredAmount
    });
    setStep('results');

    // Сохраняем в Supabase асинхронно (не блокируем UI)
    saveQuoteToSupabase({
      category: category === 'Other' ? customCategory : category,
      goodsDescription,
      transitMethod,
      coverageType,
      coverageFor,
      cargoValue: value,
      additionalValue: coverageFor === 'Additional' ? parseFloat(additionalValue) : null,
      carrierInsurance: coverageFor === 'Additional' ? parseFloat(carrierInsurance) : null,
      rate: coverageFor === 'Full Value' ? rateConfig.fullValue : rateConfig.additional,
      premium: finalPremium,
      deductible: deductibleAmount,
      insuredAmount
    }).catch(err => console.error('Failed to save quote:', err));
  }, [cargoValue, additionalValue, carrierInsurance, coverageFor, category, customCategory, goodsDescription, transitMethod, coverageType, rates, deductibles]);

  // ОПТИМИЗАЦИЯ: Асинхронное сохранение в Supabase
  const saveQuoteToSupabase = useCallback(async (quoteData) => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          category: quoteData.category,
          goods_description: quoteData.goodsDescription,
          transit_method: quoteData.transitMethod,
          coverage_type: quoteData.coverageType,
          coverage_for: quoteData.coverageFor,
          cargo_value: quoteData.cargoValue,
          additional_value: quoteData.additionalValue,
          carrier_insurance: quoteData.carrierInsurance,
          rate: quoteData.rate,
          premium: quoteData.premium,
          deductible: quoteData.deductible === 'quote' ? -1 : quoteData.deductible,
          insured_amount: quoteData.insuredAmount,
          email_sent: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data[0]?.id || null;
      }
    } catch (err) {
      console.error('Supabase error:', err);
    }
    return null;
  }, []);

  // ОПТИМИЗАЦИЯ: Мемоизируем функцию отправки email
  const sendQuoteEmail = useCallback(async () => {
    if (!email) {
      setEmailError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsSendingEmail(true);
    setEmailError('');

    try {
      const quoteId = await saveQuoteToSupabase({
        category: category === 'Other' ? customCategory : category,
        goodsDescription,
        transitMethod,
        coverageType,
        coverageFor,
        cargoValue: parseFloat(cargoValue),
        additionalValue: coverageFor === 'Additional' ? parseFloat(additionalValue) : null,
        carrierInsurance: coverageFor === 'Additional' ? parseFloat(carrierInsurance) : null,
        rate: quote.rate,
        premium: quote.premium,
        deductible: quote.deductible,
        insuredAmount: quote.insuredAmount
      });

      const response = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          quoteId,
          category: category === 'Other' ? customCategory : category,
          goodsDescription,
          transitMethod,
          coverageType,
          coverageFor,
          cargoValue: parseFloat(cargoValue),
          additionalValue: coverageFor === 'Additional' ? parseFloat(additionalValue) : null,
          carrierInsurance: coverageFor === 'Additional' ? parseFloat(carrierInsurance) : null,
          rate: quote.rate,
          premium: quote.premium,
          deductible: quote.deductible,
          insuredAmount: quote.insuredAmount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setEmailSent(true);
    } catch (err) {
      setEmailError('Failed to send quote. Please try again.');
      console.error(err);
    } finally {
      setIsSendingEmail(false);
    }
  }, [email, category, customCategory, goodsDescription, transitMethod, coverageType, coverageFor, cargoValue, additionalValue, carrierInsurance, quote, saveQuoteToSupabase]);

  // ОПТИМИЗАЦИЯ: Мемоизируем функции форматирования
  const formatCurrency = useMemo(() => (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(amount);
  }, []);

  const formatRate = useMemo(() => (r) => {
    const percentage = r * 100;
    let formatted = percentage.toFixed(3);
    while (formatted.endsWith('0') && formatted.split('.')[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
    return formatted + '%';
  }, []);

  // ОПТИМИЗАЦИЯ: Показываем индикатор загрузки только при первой загрузке
  if (!dataLoaded) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}/>
          <p style={{ fontSize: '18px', fontWeight: '500' }}>Loading calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <ExcludedCommoditiesPopup isOpen={showExcluded} onClose={() => setShowExcluded(false)} />

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          animation: 'fadeIn 0.6s ease-out'
        }}>
          {/* ОПТИМИЗАЦИЯ: lazy loading для изображений */}
          <img 
            src="/logo-main.png" 
            alt="FreightInsuranceDirect" 
            loading="lazy"
            style={{ 
              maxWidth: '400px', 
              width: '100%', 
              height: 'auto', 
              marginBottom: '15px' 
            }} 
          />
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '15px',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '12px 24px',
            borderRadius: '50px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <img 
              src="/badge-trusted.png" 
              alt="Trusted Since 1982" 
              loading="lazy"
              style={{ height: '50px', width: 'auto' }} 
            />
            <div style={{ textAlign: 'left' }}>
              <div style={{ color: '#fff', fontSize: '22px', fontWeight: '700' }}>
                Cargo Insurance Calculator
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px' }}>
                Get instant quotes • Up to $15M coverage
              </div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        {step === 'form' && (
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.6s ease-out'
          }}>
            <h2 style={{
              margin: '0 0 30px',
              color: '#1e293b',
              fontSize: '28px',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              Calculate Your Premium
            </h2>

            {/* Category Selection */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#475569',
                fontWeight: '600',
                fontSize: '15px'
              }}>
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  color: '#1e293b',
                  fontSize: '15px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="Other">Other (specify below)</option>
              </select>
            </div>

            {category === 'Other' && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '15px'
                }}>
                  Specify Category *
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter category name"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    color: '#1e293b',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            {/* Goods Description */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#475569',
                fontWeight: '600',
                fontSize: '15px'
              }}>
                Goods Description (Optional)
              </label>
              <input
                type="text"
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                placeholder="e.g., Steel pipes, Electronics"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  color: '#1e293b',
                  fontSize: '15px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Transit Method */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#475569',
                fontWeight: '600',
                fontSize: '15px'
              }}>
                Transit Method *
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['Land', 'Air', 'Ocean'].map(method => (
                  <button
                    key={method}
                    onClick={() => setTransitMethod(method)}
                    style={{
                      flex: '1 1 120px',
                      padding: '14px 20px',
                      background: transitMethod === method 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#f8fafc',
                      border: `2px solid ${transitMethod === method ? '#667eea' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      color: transitMethod === method ? '#fff' : '#64748b',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Coverage Type */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#475569',
                fontWeight: '600',
                fontSize: '15px'
              }}>
                Coverage Type *
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['All Risk', 'Total Loss'].map(type => (
                  <button
                    key={type}
                    onClick={() => setCoverageType(type)}
                    style={{
                      flex: '1 1 140px',
                      padding: '14px 20px',
                      background: coverageType === type 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#f8fafc',
                      border: `2px solid ${coverageType === type ? '#667eea' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      color: coverageType === type ? '#fff' : '#64748b',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Coverage For */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#475569',
                fontWeight: '600',
                fontSize: '15px'
              }}>
                Coverage For *
              </label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['Full Value', 'Additional'].map(type => (
                  <button
                    key={type}
                    onClick={() => setCoverageFor(type)}
                    style={{
                      flex: '1 1 140px',
                      padding: '14px 20px',
                      background: coverageFor === type 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#f8fafc',
                      border: `2px solid ${coverageFor === type ? '#667eea' : '#e2e8f0'}`,
                      borderRadius: '10px',
                      color: coverageFor === type ? '#fff' : '#64748b',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Cargo Value */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#475569',
                fontWeight: '600',
                fontSize: '15px'
              }}>
                Cargo Value * {coverageFor === 'Additional' ? '(Invoice Value)' : ''}
              </label>
              <div style={{ position: 'relative' }}>
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
                  type="number"
                  value={cargoValue}
                  onChange={(e) => setCargoValue(e.target.value)}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 32px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    color: '#1e293b',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {/* Additional Fields for "Additional" Coverage */}
            {coverageFor === 'Additional' && (
              <>
                <div style={{ marginBottom: '25px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#475569',
                    fontWeight: '600',
                    fontSize: '15px'
                  }}>
                    Additional Value to Insure *
                  </label>
                  <div style={{ position: 'relative' }}>
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
                      type="number"
                      value={additionalValue}
                      onChange={(e) => setAdditionalValue(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 32px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        color: '#1e293b',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '25px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    color: '#475569',
                    fontWeight: '600',
                    fontSize: '15px'
                  }}>
                    Carrier Insurance Amount *
                  </label>
                  <div style={{ position: 'relative' }}>
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
                      type="number"
                      value={carrierInsurance}
                      onChange={(e) => setCarrierInsurance(e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 32px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        color: '#1e293b',
                        fontSize: '15px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div style={{
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                color: '#dc2626',
                fontSize: '14px',
                marginBottom: '25px'
              }}>
                {error}
              </div>
            )}

            <button
              onClick={calculateQuote}
              style={{
                width: '100%',
                padding: '18px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.3s'
              }}
            >
              Calculate Premium
            </button>
          </div>
        )}

        {/* Results */}
        {step === 'results' && quote && (
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '40px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.6s ease-out'
          }}>
            <button
              onClick={() => { setStep('form'); setQuote(null); setError(''); setEmail(''); setEmailSent(false); setEmailError(''); }}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                color: '#64748b',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ← Back
            </button>

            <h2 style={{
              margin: '0 0 30px',
              color: '#1e293b',
              fontSize: '28px',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              Your Quote
            </h2>

            {quote.deductible === 'quote' ? (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '25px'
              }}>
                <p style={{ margin: 0, color: '#92400e', fontSize: '15px', lineHeight: '1.6' }}>
                  <strong>Note:</strong> For cargo values above $500,000, a custom quote is required. Please contact us at <strong>888-441-4435</strong> for personalized pricing.
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
                  borderRadius: '16px',
                  padding: '30px',
                  marginBottom: '25px',
                  border: '1px solid #a7f3d0'
                }}>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '14px', color: '#059669', fontWeight: '600', marginBottom: '5px' }}>
                      RATE
                    </div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{formatRate(quote.rate)}</div>
                  </div>

                  <div style={{
                    height: '1px',
                    background: 'rgba(5, 150, 105, 0.2)',
                    margin: '20px 0'
                  }} />

                  <div>
                    <div style={{ fontSize: '14px', color: '#059669', fontWeight: '600', marginBottom: '5px' }}>
                      PREMIUM
                    </div>
                    <div style={{ fontSize: '42px', fontWeight: '700', color: '#059669' }}>{formatCurrency(quote.premium)}</div>
                  </div>

                  {coverageFor === 'Full Value' && quote.deductible !== 'quote' && (
                    <div style={{ marginTop: '20px' }}>
                      <div style={{ fontSize: '14px', color: '#0891b2', fontWeight: '600', marginBottom: '5px' }}>
                        DEDUCTIBLE
                      </div>
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

                {/* Email Section */}
                <div style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '25px',
                  border: '1px solid #e2e8f0'
                }}>
                  {emailSent ? (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                      <p style={{ color: '#059669', fontWeight: '600', margin: 0 }}>
                        Quote sent to {email}!
                      </p>
                      <p style={{ color: '#64748b', fontSize: '14px', margin: '8px 0 0' }}>
                        Check your inbox for the quote details.
                      </p>
                    </div>
                  ) : (
                    <>
                      <h4 style={{ margin: '0 0 15px', color: '#1e293b', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📧</span> Save your quote
                      </h4>
                      <p style={{ margin: '0 0 15px', color: '#64748b', fontSize: '14px' }}>
                        Enter your email to receive this quote and save it for later.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                          placeholder="your@email.com"
                          style={{
                            flex: '1 1 200px',
                            padding: '14px 16px',
                            background: '#f8fafc',
                            border: `1px solid ${emailError ? '#ef4444' : '#e2e8f0'}`,
                            borderRadius: '10px',
                            color: '#1e293b',
                            fontSize: '15px',
                            outline: 'none'
                          }}
                        />
                        <button
                          onClick={sendQuoteEmail}
                          disabled={isSendingEmail}
                          style={{
                            padding: '14px 24px',
                            background: isSendingEmail 
                              ? '#94a3b8'
                              : 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: isSendingEmail ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {isSendingEmail ? (
                            <>
                              <span style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#fff',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}/>
                              Sending...
                            </>
                          ) : (
                            'Save Quote'
                          )}
                        </button>
                      </div>
                      {emailError && (
                        <p style={{ color: '#ef4444', fontSize: '13px', margin: '8px 0 0' }}>{emailError}</p>
                      )}
                    </>
                  )}
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
          background: '#f8fafc',
          borderRadius: '0 0 20px 20px',
          marginTop: step === 'results' ? '20px' : '0'
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
        color: '#fff',
        fontSize: '13px'
      }}>
        <p style={{ margin: '0 0 10px', opacity: 0.9 }}>© 2024 Ramon Inc. All rights reserved.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <a href="https://ramonins-usa.com" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', opacity: 0.9 }}>Website</a>
          <a href="https://ramonins-usa.com/contact-us/" target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', opacity: 0.9 }}>Contact Us</a>
          <button 
            onClick={() => setShowExcluded(true)}
            style={{ 
              color: '#fff', 
              textDecoration: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              padding: 0,
              opacity: 0.9
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
