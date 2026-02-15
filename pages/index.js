import React, { useState, useEffect } from 'react';

// Конфигурация Supabase - будет браться из environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fallback данные (используются если БД недоступна)
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

const COVERAGE_DESCRIPTIONS = {
  'All Risk': 'All Risk coverage offers the broadest protection for cargo during transit. It covers physical loss or damage caused by physical external causes, including partial or total loss, small or big damage or loss, theft, and catastrophic events. This is the highest coverage on any freight insurance policy. Coverage applies from the point the goods begin transit through final delivery, including loading and unloading.',
  'Total Loss': 'Total Loss coverage protects against complete loss of cargo during transit. This includes situations where the entire shipment is lost, destroyed, or damaged beyond recovery. It does not cover partial damage or loss of individual items within a shipment.'
};

const CATEGORIES = ['Electronics', 'Machinery', 'Textiles', 'Food & Beverages', 'Chemicals', 'Furniture', 'Auto Parts', 'Other'];

export default function FreightInsuranceCalculator() {
  const [category, setCategory] = useState('');
  const [goodsInsured, setGoodsInsured] = useState('');
  const [transitMethod, setTransitMethod] = useState('');
  const [coverageType, setCoverageType] = useState('');
  const [coverageFor, setCoverageFor] = useState('');
  const [cargoValue, setCargoValue] = useState('');
  const [additionalValue, setAdditionalValue] = useState('');
  const [carrierInsurance, setCarrierInsurance] = useState('');
  const [quote, setQuote] = useState(null);
  const [errors, setErrors] = useState({});
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Данные из БД
  const [ratesData, setRatesData] = useState(null);
  const [deductiblesData, setDeductiblesData] = useState(null);
  const [coverageDescriptions, setCoverageDescriptions] = useState(COVERAGE_DESCRIPTIONS);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка данных из Supabase
  useEffect(() => {
    async function loadData() {
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.log('Supabase not configured, using fallback data');
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
          // Преобразуем в удобный формат
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

        // Загружаем описания coverage types
        const coverageResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/coverage_types?is_active=eq.true`,
          { headers }
        );
        
        if (coverageResponse.ok) {
          const coverageTypes = await coverageResponse.json();
          const descriptions = {};
          coverageTypes.forEach(ct => {
            descriptions[ct.name] = ct.description;
          });
          setCoverageDescriptions(descriptions);
        }

      } catch (error) {
        console.error('Error loading data from Supabase:', error);
      }
      
      setIsLoading(false);
    }

    loadData();
  }, []);

  // Используем данные из БД или fallback
  const rates = ratesData || FALLBACK_RATES;
  const deductibles = deductiblesData || FALLBACK_DEDUCTIBLES;

  // Auto-calculate cargo value when additional coverage is selected
  useEffect(() => {
    if (coverageFor === 'Additional') {
      const additional = parseFloat(additionalValue) || 0;
      const carrier = parseFloat(carrierInsurance) || 0;
      if (additional > 0 || carrier > 0) {
        setCargoValue((additional + carrier).toString());
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const formatRate = (rate) => {
    return (rate * 100).toFixed(3) + '%';
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
    setAdditionalValue('');
    setCarrierInsurance('');
    setQuote(null);
    setErrors({});
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1929 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <p>Loading calculator...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a1628 0%, #1a2d4a 50%, #0d1929 100%)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#e8edf5',
      padding: '20px'
    }}>
      {/* Header */}
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
          <div style={{
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #d4380d 0%, #ff6b35 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(212, 56, 13, 0.4)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              margin: 0,
              background: 'linear-gradient(90deg, #ff6b35, #ff8c5a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>FreightInsuranceDirect</h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#8899aa', letterSpacing: '2px' }}>RAMON INC. • SINCE 1982</p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #5a4a2a 0%, #8b7355 100%)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '600',
            textAlign: 'center',
            border: '1px solid #a08050'
          }}>
            <div style={{ color: '#ffd700' }}>TRUSTED</div>
            <div style={{ color: '#fff', fontSize: '10px' }}>SINCE 1982</div>
          </div>
        </div>
        <h2 style={{
          fontSize: '32px',
          fontWeight: '300',
          margin: '20px 0 10px',
          color: '#fff'
        }}>Cargo Insurance Calculator</h2>
        <p style={{ color: '#7a8fa6', margin: 0 }}>Get an instant quote for your freight insurance needs</p>
      </div>

      {/* Main Calculator */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)'
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
              <label style={{ display: 'block', marginBottom: '8px', color: '#8899aa', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Category of Goods
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              >
                <option value="" style={{ background: '#1a2d4a' }}>Select category...</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} style={{ background: '#1a2d4a' }}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Goods Insured */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#8899aa', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Transit Method */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#8899aa', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                        ? 'linear-gradient(135deg, #d4380d 0%, #ff6b35 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: transitMethod === method 
                        ? 'none'
                        : `1px solid ${errors.transitMethod ? '#ff4d4f' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '12px',
                      color: '#fff',
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
              {errors.transitMethod && <p style={{ color: '#ff4d4f', fontSize: '12px', margin: '6px 0 0' }}>{errors.transitMethod}</p>}
            </div>

            {/* Coverage Type */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#8899aa', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                        ? 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: coverageType === type 
                        ? 'none'
                        : `1px solid ${errors.coverageType ? '#ff4d4f' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '12px',
                      color: '#fff',
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
              {errors.coverageType && <p style={{ color: '#ff4d4f', fontSize: '12px', margin: '6px 0 0' }}>{errors.coverageType}</p>}
            </div>

            {/* Coverage For */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#8899aa', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
                        setCarrierInsurance('');
                      }
                    }}
                    style={{
                      padding: '16px 20px',
                      background: coverageFor === type 
                        ? 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: coverageFor === type 
                        ? 'none'
                        : `1px solid ${errors.coverageFor ? '#ff4d4f' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '12px',
                      color: '#fff',
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
              {errors.coverageFor && <p style={{ color: '#ff4d4f', fontSize: '12px', margin: '6px 0 0' }}>{errors.coverageFor}</p>}
            </div>

            {/* Cargo Value */}
            <div style={{ gridColumn: coverageFor === 'Additional' ? 'auto' : '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#8899aa', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Cargo Value (USD) *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#8899aa',
                  fontSize: '16px'
                }}>$</span>
                <input
                  type="number"
                  value={cargoValue}
                  onChange={(e) => { setCargoValue(e.target.value); setErrors({...errors, cargoValue: null}); }}
                  placeholder="0"
                  readOnly={coverageFor === 'Additional'}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 32px',
                    background: coverageFor === 'Additional' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${errors.cargoValue ? '#ff4d4f' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '18px',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {errors.cargoValue && <p style={{ color: '#ff4d4f', fontSize: '12px', margin: '6px 0 0' }}>{errors.cargoValue}</p>}
            </div>

            {/* Additional Coverage Fields */}
            {coverageFor === 'Additional' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#8899aa', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Additional Value (USD) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#8899aa',
                      fontSize: '16px'
                    }}>$</span>
                    <input
                      type="number"
                      value={additionalValue}
                      onChange={(e) => { setAdditionalValue(e.target.value); setErrors({...errors, additionalValue: null}); }}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 32px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${errors.additionalValue ? '#ff4d4f' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {errors.additionalValue && <p style={{ color: '#ff4d4f', fontSize: '12px', margin: '6px 0 0' }}>{errors.additionalValue}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#8899aa', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Carrier&apos;s Insurance (USD) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#8899aa',
                      fontSize: '16px'
                    }}>$</span>
                    <input
                      type="number"
                      value={carrierInsurance}
                      onChange={(e) => { setCarrierInsurance(e.target.value); setErrors({...errors, carrierInsurance: null}); }}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 32px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${errors.carrierInsurance ? '#ff4d4f' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '16px',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  {errors.carrierInsurance && <p style={{ color: '#ff4d4f', fontSize: '12px', margin: '6px 0 0' }}>{errors.carrierInsurance}</p>}
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
                  ? 'rgba(212, 56, 13, 0.5)'
                  : 'linear-gradient(135deg, #d4380d 0%, #ff6b35 100%)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isCalculating ? 'wait' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: '0 4px 20px rgba(212, 56, 13, 0.3)',
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
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#8899aa',
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
            background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.1) 0%, rgba(24, 144, 255, 0.1) 100%)',
            borderTop: '1px solid rgba(82, 196, 26, 0.3)',
            padding: '40px',
            animation: 'fadeIn 0.5s ease'
          }}>
            {quote.needsQuote ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
                <h3 style={{ fontSize: '24px', color: '#ffc53d', margin: '0 0 10px' }}>Custom Quote Required</h3>
                <p style={{ color: '#8899aa', margin: '0 0 20px' }}>
                  For cargo values over $500,000, please contact us for a personalized quote.
                </p>
                <a
                  href="https://ramonins-usa.com/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '14px 30px',
                    background: 'linear-gradient(135deg, #d4380d 0%, #ff6b35 100%)',
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
                <h3 style={{ fontSize: '20px', color: '#52c41a', margin: '0 0 25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>✓</span> Your Quote
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#8899aa', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Rate</div>
                    <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{formatRate(quote.rate)}</div>
                  </div>
                  
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(82, 196, 26, 0.2) 0%, rgba(82, 196, 26, 0.1) 100%)',
                    borderRadius: '16px',
                    padding: '20px',
                    textAlign: 'center',
                    border: '1px solid rgba(82, 196, 26, 0.3)'
                  }}>
                    <div style={{ color: '#52c41a', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Premium</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#52c41a' }}>{formatCurrency(quote.premium)}</div>
                  </div>
                  
                  {coverageFor === 'Full Value' && (
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '20px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: '#8899aa', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Deductible</div>
                      <div style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>{formatCurrency(quote.deductible)}</div>
                    </div>
                  )}
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '25px'
                }}>
                  <h4 style={{ margin: '0 0 10px', color: '#fff', fontSize: '16px' }}>
                    {coverageType} Coverage
                  </h4>
                  <p style={{ margin: 0, color: '#8899aa', fontSize: '14px', lineHeight: '1.6' }}>
                    {coverageDescriptions[coverageType]}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <a
                    href="https://ramonins-usa.com/purchase"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: '1 1 200px',
                      padding: '16px 30px',
                      background: 'linear-gradient(135deg, #d4380d 0%, #ff6b35 100%)',
                      borderRadius: '10px',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: '600',
                      textAlign: 'center',
                      boxShadow: '0 4px 20px rgba(212, 56, 13, 0.3)'
                    }}
                  >
                    Purchase Coverage →
                  </a>
                  <a
                    href="https://ramonins-usa.com/excluded-goods"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: '1 1 200px',
                      padding: '16px 30px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '10px',
                      color: '#8899aa',
                      textDecoration: 'none',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}
                  >
                    View Excluded Goods
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          padding: '20px 40px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <p style={{
            margin: 0,
            color: '#5a6a7a',
            fontSize: '12px',
            lineHeight: '1.6'
          }}>
            <strong>Disclaimer:</strong> All quotes are indicative and non-binding. Coverage, rates, limits, and terms are subject to verification of shipment information, underwriting approval, and policy terms and conditions. Final premium may vary based on complete shipment details. Please review the full policy documentation before purchase.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        maxWidth: '900px',
        margin: '30px auto 0',
        textAlign: 'center',
        color: '#5a6a7a',
        fontSize: '13px'
      }}>
        <p style={{ margin: '0 0 10px' }}>© 2024 Ramon Inc. All rights reserved.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <a href="https://ramonins-usa.com" target="_blank" rel="noopener noreferrer" style={{ color: '#8899aa', textDecoration: 'none' }}>Website</a>
          <a href="https://ramonins-usa.com/contact" target="_blank" rel="noopener noreferrer" style={{ color: '#8899aa', textDecoration: 'none' }}>Contact Us</a>
          <a href="https://ramonins-usa.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#8899aa', textDecoration: 'none' }}>Terms of Service</a>
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
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        select option {
          background: #1a2d4a;
          color: #fff;
        }
        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
}
