import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import AntigravityBackground from './components/AntigravityBackground';

const getApiBaseUrl = () => {
  let url = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";
  if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
};

const API_BASE_URL = getApiBaseUrl();

const acidIcon = L.divIcon({
  className: 'custom-acid-icon',
  html: '<div class="acid-marker"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const LocationMarker = ({ position, setPosition }) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  return position.lat === 0 ? null : (
    <Marker position={position} icon={acidIcon}></Marker>
  )
};

const InteractiveBlob = () => {
  const cursorX = useMotionValue(-1000);
  const cursorY = useMotionValue(-1000);

  const springConfig = { damping: 40, stiffness: 150 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="interactive-blob"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
      }}
    />
  );
};

const PRESETS = [
  {
    name: "Luxury Estate",
    icon: "💎",
    config: { area: 8500, bedrooms: 5, bathrooms: 4, latitude: 19.0760, longitude: 72.8777, location: "urban" }
  },
  {
    name: "Suburban Villa",
    icon: "🏡",
    config: { area: 3800, bedrooms: 4, bathrooms: 3, latitude: 19.1500, longitude: 72.9300, location: "suburban" }
  },
  {
    name: "Urban Penthouse",
    icon: "🏙️",
    config: { area: 2400, bedrooms: 3, bathrooms: 2, latitude: 19.0500, longitude: 72.8300, location: "urban" }
  },
  {
    name: "Starter Home",
    icon: "🔑",
    config: { area: 950, bedrooms: 1, bathrooms: 1, latitude: 19.2500, longitude: 72.8500, location: "rural" }
  }
];

function App() {
  const [activePage, setActivePage] = useState("engine");
  const [form, setForm] = useState({
    area: 2500,
    bedrooms: 2,
    bathrooms: 2,
    latitude: 19.076,
    longitude: 72.8777,
    location: "urban",
  });

  const [preds, setPreds] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking"); // checking, online, warming, offline
  const [errorMsg, setErrorMsg] = useState("");

  const checkHealth = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
      if (res.status === 200) {
        setApiStatus("online");
        setErrorMsg("");
      } else {
        setApiStatus("warming");
      }
    } catch (err) {
      setApiStatus("offline");
      setErrorMsg("Backend service offline or waking up on Render. Retrying...");
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset) => {
    setForm(preset.config);
  };

  const predict = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await axios.post(`${API_BASE_URL}/predict`, form, { 
        timeout: 20000,
        headers: { "Content-Type": "application/json" }
      });
      setPreds(res.data);
      setHistory(prev => [...prev, res.data.price]);
      setApiStatus("online");
    } catch (err) {
      console.error(err);
      if (err.code === "ECONNABORTED" || !err.response) {
        setApiStatus("warming");
        setErrorMsg("Render server is warming up (free tier spins down after 15 mins). Please retry in 15 seconds!");
      } else {
        setErrorMsg(err.response?.data?.error || "API calculation failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!preds) return;
    const reportData = {
      timestamp: new Date().toISOString(),
      inputs: form,
      valuation_cr: (preds.price / 10000000).toFixed(4),
      valuation_raw: preds.price,
      model_breakdown: {
        linear: preds.linear,
        ridge: preds.ridge,
        lasso: preds.lasso,
        elastic: preds.elastic,
        tree: preds.tree,
        forest: preds.forest,
        gradient_boosting: preds.gb,
        hist_gradient_boosting: preds.hist_gb
      },
      metrics: preds.metrics || {}
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Valuation_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMaximumBound = () => {
    if (!preds) return 1;
    return Math.max(
      preds.linear || 0,
      preds.ridge || 0,
      preds.lasso || 0,
      preds.elastic || 0,
      preds.tree || 0,
      preds.forest || 0,
      preds.gb || 0,
      preds.hist_gb || 0
    ) || 1;
  };

  const maxPrice = getMaximumBound();

  const HistoryChart = ({ data, large = false }) => {
    if (data.length < 2) return <div className="chart-placeholder">Execute multiple iterations to form a trend line.</div>;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min === 0 ? 1 : max - min;
    const width = large ? 1200 : 400;
    const height = large ? 300 : 100;
    const padding = 20;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
      const y = (height - padding) - ((d - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="history-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" style={large ? {maxHeight: '300px'} : {}}>
          <polyline points={points} className="history-line" />
          {data.map((d, i) => {
             const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
             const y = (height - padding) - ((d - min) / range) * (height - padding * 2);
             return <circle key={i} cx={x} cy={y} r={large ? "6" : "4"} className="history-point" />
          })}
        </svg>
      </div>
    );
  };

  return (
    <>
      <AntigravityBackground />
      <InteractiveBlob />
      <div className="vintage-noise"></div>
      <div className="aurora"></div>
      <div className="aurora right"></div>

      <nav className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className={`nav-btn ${activePage === 'engine' ? 'active' : ''}`}
            onClick={() => setActivePage('engine')}
          >Valuation Engine</button>
          <button 
            className={`nav-btn ${activePage === 'insights' ? 'active' : ''}`}
            onClick={() => setActivePage('insights')}
          >Market Insights</button>
          <button 
            className={`nav-btn ${activePage === 'map' ? 'active' : ''}`}
            onClick={() => setActivePage('map')}
          >Geospatial Radar</button>
        </div>

        {/* Status Indicator */}
        <div className="server-status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: apiStatus === 'online' ? '#00ff88' : apiStatus === 'warming' ? '#ffaa00' : '#ff3366',
            boxShadow: apiStatus === 'online' ? '0 0 8px #00ff88' : 'none'
          }}></span>
          <span style={{ color: apiStatus === 'online' ? 'var(--text)' : apiStatus === 'warming' ? '#ffaa00' : '#ff3366' }}>
            {apiStatus === 'online' ? 'SYSTEM READY' : apiStatus === 'warming' ? 'BACKEND WARMING UP' : 'BACKEND DISCONNECTED'}
          </span>
        </div>
      </nav>

      {/* Backend Warming / Error Banner */}
      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(255, 51, 102, 0.15)',
          border: '1px solid rgba(255, 51, 102, 0.4)',
          color: '#ff6688',
          padding: '0.75rem 1.5rem',
          margin: '1rem auto 0 auto',
          maxWidth: '1200px',
          borderRadius: '8px',
          fontSize: '0.85rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <span>⚠️ {errorMsg}</span>
          <button onClick={checkHealth} style={{
            background: 'transparent',
            border: '1px solid rgba(255, 51, 102, 0.5)',
            color: '#ff6688',
            padding: '0.2rem 0.6rem',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}>Retry Health Check</button>
        </div>
      )}

      <div className="container">
        
        {activePage === "engine" && (
          <div className="page-wrapper" style={{display: 'flex', gap: '6rem'}}>
            {/* LEFT PANEL - STICKY */}
            <div className="left-panel">
              <div>
                <motion.h1 
                  className="massive-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  FUTURE<br/>
                  ESTATE<br/>
                  <span>MODELS.</span>
                </motion.h1>
                <p className="subtitle">Enterprise deep learning regression analytics & real-time valuation engine.</p>
              </div>

              <div className="valuation-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="val-label">ESTIMATED VALUATION</div>
                  {preds && (
                    <button onClick={exportReport} style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-dim)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}>
                      📥 Export Report
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {preds ? (
                    <motion.div 
                      key="result"
                      className="val-massive"
                      initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      transition={{ duration: 0.5 }}
                    >
                      ₹{(preds.price/10000000).toFixed(2)}<span>CR</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      className="val-massive empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      0.00<span>CR</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Chart in Left Panel */}
                <div className="comparison-chart">
                  <div className="chart-title">REGRESSION SPLIT</div>
                  {preds ? (
                    <div className="bars-wrapper" style={{ gap: '0.8rem' }}>
                      {[
                        { label: 'LINEAR', val: preds.linear || 0, color: 'rgba(255,255,255,0.4)' },
                        { label: 'RIDGE', val: preds.ridge || 0, color: 'rgba(255,255,255,0.6)' },
                        { label: 'LASSO', val: preds.lasso || 0, color: 'rgba(255,255,255,0.8)' },
                        { label: 'ELASTIC', val: preds.elastic || 0, color: '#ffffff' },
                        { label: 'TREE', val: preds.tree || 0, color: '#00f0ff' },
                        { label: 'FOREST', val: preds.forest || 0, color: '#8a2be2' },
                        { label: 'GRADIENT', val: preds.gb || 0, color: '#ffaa00' },
                        { label: 'HIST BOOST', val: preds.hist_gb || 0, color: '#00ff88' }
                      ].map(m => (
                        <div className="bar-row" key={m.label} style={{ alignItems: 'flex-start' }}>
                          <div style={{ width: '80px', display: 'flex', flexDirection: 'column' }}>
                            <span>{m.label}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                              {((m.val || 0)/10000000).toFixed(2)}CR
                            </span>
                          </div>
                          <div className="bar-line-bg" style={{ marginTop: '0.5rem' }}>
                            <div 
                              className="bar-line-fill" 
                              style={{ 
                                backgroundColor: m.color,
                                width: `${Math.max(0, ((m.val || 0) / maxPrice) * 100)}%`,
                                transition: 'width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="chart-placeholder">AWAITING EXECUTION...</div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT PANEL - SCROLLING FORM */}
            <div className="right-panel">
              
              {/* Presets Toolbar */}
              <div style={{ marginBottom: '2rem' }}>
                <span className="row-label" style={{ display: 'block', marginBottom: '0.8rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  QUICK PRESETS
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="row-header">
                  <span className="row-label">01 / Floor Space</span>
                  <span className="row-value">{form.area} <span>SQFT</span></span>
                </div>
                <input 
                  type="range" 
                  className="acid-slider"
                  min="500" max="10000" step="50" 
                  value={form.area} 
                  onChange={(e) => setField('area', Number(e.target.value))} 
                />
              </div>

              <div className="form-row">
                <div className="row-header">
                  <span className="row-label">02 / Bedrooms</span>
                </div>
                <div className="pill-group">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button 
                      key={num}
                      className={`acid-pill ${form.bedrooms === num ? 'active' : ''}`}
                      onClick={() => setField('bedrooms', num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="row-header">
                  <span className="row-label">03 / Bathrooms</span>
                </div>
                <div className="pill-group">
                  {[1, 2, 3, 4].map(num => (
                    <button 
                      key={num}
                      className={`acid-pill ${form.bathrooms === num ? 'active' : ''}`}
                      onClick={() => setField('bathrooms', num)}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="row-header">
                  <span className="row-label">04 / Environment</span>
                </div>
                <div className="pill-group">
                  {['urban', 'suburban', 'rural'].map(loc => (
                    <button 
                      key={loc}
                      className={`acid-pill large ${form.location === loc ? 'active' : ''}`}
                      onClick={() => setField('location', loc)}
                    >
                      {loc.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                className={`trigger-btn ${loading ? 'loading' : ''}`}
                onClick={predict}
                disabled={loading}
              >
                {loading ? 'COMPUTING MODEL PIPELINES...' : 'INITIALIZE SEQUENCE'}
              </button>

            </div>
          </div>
        )}
        
        {activePage === "insights" && (
          <div className="page-wrapper" style={{ display: 'block', width: '100%' }}>
            <motion.h1 
               className="massive-title"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
            >
              MARKET<br/>
              <span>ANALYTICS.</span>
            </motion.h1>
            
            <div className="metrics-grid">
              <div className="metric-box">
                <div className="metric-title">TOTAL EXECUTIONS</div>
                <div className="metric-val">{history.length}</div>
              </div>
              
              <div className="metric-box">
                <div className="metric-title">PEAK VALUATION</div>
                <div className="metric-val">
                  {history.length > 0 ? (Math.max(...history) / 10000000).toFixed(2) : '0.00'}
                  <span>CR</span>
                </div>
              </div>
              
              <div className="metric-box">
                <div className="metric-title">AVERAGE VALUATION</div>
                <div className="metric-val">
                  {history.length > 0 ? ((history.reduce((a,b)=>a+b,0)/history.length) / 10000000).toFixed(2) : '0.00'}
                  <span>CR</span>
                </div>
              </div>

              <div className="full-width-chart">
                <div className="metric-title" style={{marginBottom: '2rem'}}>MACRO TRAJECTORY</div>
                <HistoryChart data={history} large={true} />
              </div>
            </div>
          </div>
        )}

        {activePage === "map" && (
          <div className="page-wrapper" style={{display: 'flex', gap: '6rem'}}>
            <div className="left-panel">
              <div>
                <motion.h1 
                   className="massive-title"
                   style={{ margin: 0, marginBottom: '2rem' }}
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                >
                  GEOSPATIAL<br/>
                  <span>RADAR.</span>
                </motion.h1>
                <div style={{ marginBottom: '3rem' }}>
                  <div className="val-label" style={{ color: 'var(--accent)' }}>ACTIVE COORDINATES</div>
                  <div style={{ fontSize: '2rem', fontWeight: 900 }}>{form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}</div>
                </div>
              </div>

              <div className="valuation-block">
                <div className="val-label">ESTIMATED VALUATION</div>
                <AnimatePresence mode="wait">
                  {preds ? (
                    <motion.div 
                      key="result"
                      className="val-massive"
                      style={{ fontSize: '3rem', marginBottom: '1rem' }}
                      initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      transition={{ duration: 0.5 }}
                    >
                      ₹{(preds.price/10000000).toFixed(2)}<span>CR</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="empty"
                      className="val-massive empty"
                      style={{ fontSize: '3rem', marginBottom: '1rem' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      0.00<span>CR</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="comparison-chart" style={{ paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  {preds ? (
                    <div className="bars-wrapper" style={{ gap: '0.8rem' }}>
                      {[
                        { label: 'LINEAR', val: preds.linear || 0, color: 'rgba(255,255,255,0.4)' },
                        { label: 'RIDGE', val: preds.ridge || 0, color: 'rgba(255,255,255,0.6)' },
                        { label: 'LASSO', val: preds.lasso || 0, color: 'rgba(255,255,255,0.8)' },
                        { label: 'ELASTIC', val: preds.elastic || 0, color: '#ffffff' },
                        { label: 'TREE', val: preds.tree || 0, color: '#00f0ff' },
                        { label: 'FOREST', val: preds.forest || 0, color: '#8a2be2' },
                        { label: 'GRADIENT', val: preds.gb || 0, color: '#ffaa00' },
                        { label: 'HIST BOOST', val: preds.hist_gb || 0, color: '#00ff88' }
                      ].map(m => (
                        <div className="bar-row" key={m.label} style={{ alignItems: 'flex-start' }}>
                          <div style={{ width: '80px', display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem' }}>{m.label}</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                              {((m.val || 0)/10000000).toFixed(2)}CR
                            </span>
                          </div>
                          <div className="bar-line-bg" style={{ marginTop: '0.3rem' }}>
                            <div 
                              className="bar-line-fill" 
                              style={{ 
                                backgroundColor: m.color,
                                width: `${Math.max(0, ((m.val || 0) / maxPrice) * 100)}%`,
                                transition: 'width 1s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="chart-placeholder" style={{ padding: '1rem 0' }}>TARGET TO COMPUTE</div>
                  )}
                </div>
              </div>

              <button 
                className={`trigger-btn ${loading ? 'loading' : ''}`}
                onClick={predict}
                disabled={loading}
                style={{ width: '100%', marginTop: 'auto', marginBottom: '2rem' }}
              >
                {loading ? 'COMPUTING...' : 'INITIALIZE SEQUENCE'}
              </button>
            </div>

            <div className="right-panel" style={{ paddingBottom: 0, height: 'calc(100vh - 12rem)' }}>
              <div style={{ width: '100%', height: '100%', border: '1px solid var(--border)', filter: 'contrast(1.1) brightness(0.85) grayscale(0.2)' }}>
                <MapContainer center={[form.latitude, form.longitude]} zoom={12} scrollWheelZoom={true} style={{ height: '100%', width: '100%', background: 'var(--bg)' }}>
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  />
                  <LocationMarker 
                    position={{lat: form.latitude, lng: form.longitude}} 
                    setPosition={(lat, lng) => {
                      setField('latitude', lat);
                      setField('longitude', lng);
                    }}
                  />
                </MapContainer>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default App;
