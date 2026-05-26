import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Receipt, 
  Database, 
  TrendingUp, 
  CreditCard, 
  Users, 
  HelpCircle, 
  AlertTriangle,
  Lightbulb,
  Wifi,
  WifiOff,
  Globe
} from 'lucide-react';
import { useTranslation } from '../utils/i18n.jsx';
import { offlineDB } from '../utils/offline-db';
import axios from 'axios';

export default function HomePortal() {
  const { t, lang, changeLanguage } = useTranslation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [marketPrices, setMarketPrices] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [syncStatus, setSyncStatus] = useState('synced'); // synced, syncing, offline

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial fetch
    fetchMarketPrices();
    fetchSuggestions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchMarketPrices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/market-prices/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMarketPrices(response.data.results || response.data || []);
      // Cache prices offline
      await offlineDB.setCache('market_prices', response.data.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch market prices, loading from cache', error);
      const cached = await offlineDB.getCache('market_prices');
      if (cached) setMarketPrices(cached);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/market-prices/suggestions/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuggestions(response.data || []);
      await offlineDB.setCache('suggestions', response.data || []);
    } catch (error) {
      console.error('Failed to fetch suggestions, loading from cache', error);
      const cached = await offlineDB.getCache('suggestions');
      if (cached) setSuggestions(cached);
    }
  };

  const syncOfflineQueue = async () => {
    const queue = await offlineDB.getQueue();
    if (queue.length === 0) return;

    setSyncStatus('syncing');
    const token = localStorage.getItem('token');

    // Sync queue items sequentially (newest wins / sequential sync)
    for (const item of queue) {
      try {
        await axios({
          url: item.url,
          method: item.method,
          data: item.data,
          headers: { Authorization: `Bearer ${token}` }
        });
        await offlineDB.removeFromQueue(item.id);
      } catch (error) {
        console.error('Sync failed for item', item, error);
      }
    }
    
    setSyncStatus('synced');
    fetchMarketPrices();
    fetchSuggestions();
  };

  // Group market prices by fish for daily widgets
  const groupedPrices = marketPrices.reduce((acc, curr) => {
    const name = curr.fish_name;
    if (!acc[name]) acc[name] = [];
    acc[name].push(curr);
    return acc;
  }, {});

  const actionButtons = [
    { label: t('buy_fish'), path: '/dashboard/purchases', icon: ShoppingBag, color: 'from-emerald-500 to-teal-600' },
    { label: t('sell_fish'), path: '/dashboard/sales', icon: Receipt, color: 'from-blue-500 to-indigo-600' },
    { label: t('stock'), path: '/dashboard/inventory', icon: Database, color: 'from-amber-500 to-orange-600' },
    { label: t('pending_money'), path: '/dashboard/reports', icon: TrendingUp, color: 'from-rose-500 to-pink-600' },
    { label: t('payments'), path: '/dashboard/payments', icon: CreditCard, color: 'from-purple-500 to-violet-600' },
    { label: t('customers'), path: '/dashboard/customers', icon: Users, color: 'from-cyan-500 to-sky-600' },
  ];

  return (
    <div className="home-portal-root" style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fish ERP
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
            {lang === 'ta' ? 'மீன் வியாபாரிகளுக்கான எளிய மென்பொருள்' : 'Ultra Simple Fish Trading Engine'}
          </p>
        </div>

        {/* Sync & Language bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sync status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #334155' }}>
            {isOnline ? (
              <>
                <Wifi size={16} style={{ color: '#10b981' }} />
                <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Online'}</span>
              </>
            ) : (
              <>
                <WifiOff size={16} style={{ color: '#ef4444' }} />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', padding: '4px 8px', borderRadius: '8px', border: '1px solid #334155' }}>
            <Globe size={16} style={{ color: '#94a3b8' }} />
            <select
              value={lang}
              onChange={(e) => changeLanguage(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="en" style={{ backgroundColor: '#1e293b' }}>English</option>
              <option value="ta" style={{ backgroundColor: '#1e293b' }}>தமிழ்</option>
              <option value="hi" style={{ backgroundColor: '#1e293b' }}>हिंदी</option>
            </select>
          </div>

          {/* Mode Switcher */}
          <button
            onClick={() => {
              localStorage.setItem('is_simple_ux', 'false');
              window.location.reload();
            }}
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#38bdf8',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {lang === 'ta' ? 'தொழில்முறைக்கு மாறுக' : 'Pro Mode'}
          </button>
        </div>
      </div>

      {/* Grid Launcher Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1-fraction))', gap: '16px', marginBottom: '32px' }} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {actionButtons.map((btn, index) => (
          <motion.button
            key={index}
            onClick={() => navigate(btn.path)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`bg-gradient-to-br ${btn.color}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              borderRadius: '16px',
              border: 'none',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)',
              cursor: 'pointer',
              minHeight: '120px',
              color: '#ffffff'
            }}
          >
            <btn.icon size={36} style={{ marginBottom: '12px' }} />
            <span style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.5px' }}>{btn.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Analytics, Market Prices & AI advice row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Market Price Telemetry */}
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp style={{ color: '#38bdf8' }} /> {t('market_prices')}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.keys(groupedPrices).length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>No market prices recorded today.</p>
            ) : (
              Object.entries(groupedPrices).map(([fishName, prices], idx) => {
                const avgPrice = prices.reduce((sum, p) => sum + parseFloat(p.price_per_kg), 0) / prices.length;
                return (
                  <div key={idx} style={{ paddingBottom: '12px', borderBottom: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '15px', color: '#38bdf8' }}>{fishName}</span>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                        Avg: <strong style={{ color: '#f8fafc' }}>₹{avgPrice.toFixed(0)}/kg</strong>
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {prices.slice(0, 3).map((p, pIdx) => (
                        <div key={pIdx} style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '6px', textAlign: 'center', fontSize: '12px' }}>
                          <span style={{ textTransform: 'capitalize', color: '#94a3b8', display: 'block', fontSize: '10px' }}>{p.city}</span>
                          <span style={{ fontWeight: '600' }}>₹{parseFloat(p.price_per_kg).toFixed(0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AI suggestions */}
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb style={{ color: '#fbbf24' }} /> {t('smart_suggestions')}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {suggestions.length === 0 ? (
              <div style={{ display: 'flex', gap: '10px', backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px dashed #334155' }}>
                <Lightbulb size={20} style={{ color: '#64748b' }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>Calculating business data. Check back soon for smart suggestions!</span>
              </div>
            ) : (
              suggestions.map((sug, idx) => {
                let alertColor = '#3b82f6';
                if (sug.category === 'risk' || sug.category === 'expiry') alertColor = '#ef4444';
                if (sug.category === 'pricing') alertColor = '#fbbf24';

                return (
                  <div key={idx} style={{ display: 'flex', gap: '12px', backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: `4px solid ${alertColor}` }}>
                    <div style={{ color: alertColor, display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}>
                      {sug.category === 'risk' ? <AlertTriangle size={20} /> : <Lightbulb size={20} />}
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700' }}>{sug.title}</h4>
                      <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>{sug.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
