import { useState, useEffect } from 'react';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import ELDLogViewer from './components/ELDLogViewer';

const API_BASE = import.meta.env.VITE_API_URL 

fetch(`${API_BASE}/api/trip/plan/`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(data)
});

function useLeaflet() {
  const [ready, setReady] = useState(!!window.L);
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

const TABS = [
  { id: 'form', label: '📋 Trip Input' },
  { id: 'map', label: '🗺 Route Map' },
  { id: 'logs', label: '📄 ELD Logs' },
];

function InfoPanel() {
  const rules = [
    { icon: '🕐', title: '11-Hour Drive Limit', desc: 'Max 11 hrs driving after 10 hrs off duty' },
    { icon: '⏱', title: '14-Hour Window', desc: 'No driving after 14 hrs on-duty window' },
    { icon: '☕', title: '30-Min Break', desc: 'Required after 8 cumulative drive hours' },
    { icon: '😴', title: '10-Hour Rest', desc: 'Min 10 consecutive hrs off between shifts' },
    { icon: '📅', title: '70-Hour / 8-Day', desc: 'Cannot exceed 70 on-duty hrs in 8 days' },
    { icon: '⛽', title: 'Fuel Every 1,000 mi', desc: '30-minute fuel stop per 1,000 miles' },
  ];
  return (
    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'14px', padding:'24px' }}>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', color:'var(--accent)', marginBottom:'16px' }}>
        📘 HOS Rules Applied
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px' }}>
        {rules.map(r => (
          <div key={r.title} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'10px', padding:'12px 14px', border:'1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize:'1.1rem', marginBottom:'4px' }}>{r.icon}</div>
            <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-bright)', marginBottom:'3px' }}>{r.title}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-dim)', lineHeight:1.4 }}>{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultPreview({ result, onViewMap, onViewLogs }) {
  const s = result.trip_summary;
  const fmt = (h) => { const hr=Math.floor(h); const m=Math.round((h-hr)*60); return m>0?`${hr}h ${m}m`:`${hr}h`; };
  return (
    <div style={{ background:'rgba(34,197,94,0.06)', border:'1px solid rgba(34,197,94,0.2)', borderRadius:'14px', padding:'24px', animation:'fadeIn 0.4s ease' }}>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.15em', color:'var(--green)', marginBottom:'16px' }}>✓ Trip Calculated</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'8px', marginBottom:'14px' }}>
        {[['Total Distance',`${s.total_distance_miles.toFixed(0)} mi`],['Drive Time',fmt(s.total_drive_time_hours)],['Trip Duration',fmt(s.total_trip_time_hours)],['Log Days',`${s.num_days} day${s.num_days!==1?'s':''}`]].map(([l,v])=>(
          <div key={l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'10px 12px', textAlign:'center' }}>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'1rem', fontWeight:700, color:'var(--green)' }}>{v}</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-dim)', marginTop:'2px' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:'8px' }}>
        <button onClick={onViewMap} style={{ flex:1, padding:'10px', background:'var(--blue)', color:'white', borderRadius:'8px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer', border:'none' }}>🗺 View Route</button>
        <button onClick={onViewLogs} style={{ flex:1, padding:'10px', background:'rgba(245,158,11,0.15)', color:'var(--accent)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'8px', fontSize:'0.85rem', fontWeight:600, cursor:'pointer' }}>📄 ELD Logs</button>
      </div>
    </div>
  );
}

export default function App() {
  const leafletReady = useLeaflet();
  const [activeTab, setActiveTab] = useState('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (data) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/trip/plan/`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error||`Error ${res.status}`);
      setResult({...json, start_date:data.start_date});
      setActiveTab('map');
    } catch(err) {
      setError(err.message||'Failed to plan trip. Check your inputs.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <header style={{ background:'rgba(15,27,45,0.97)', borderBottom:'1px solid rgba(255,255,255,0.08)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:100, padding:'0 24px' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:'62px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ width:'36px', height:'36px', background:'linear-gradient(135deg,var(--blue) 0%,#1d4ed8 100%)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', boxShadow:'0 0 16px rgba(37,99,235,0.4)' }}>🚛</div>
            <div>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:'0.95rem', fontWeight:700, color:'var(--text-bright)', letterSpacing:'0.04em' }}>ELD Trip Planner</div>
              <div style={{ fontSize:'0.65rem', color:'var(--slate-light)', letterSpacing:'0.06em' }}>FMCSA §395 • HOS Calculator • 70hr/8-day</div>
            </div>
          </div>
          <nav style={{ display:'flex', gap:'4px' }}>
            {TABS.map(tab => {
              const enabled = tab.id==='form' || !!result;
              const isActive = activeTab===tab.id;
              return (
                <button key={tab.id} onClick={()=>enabled&&setActiveTab(tab.id)} disabled={!enabled}
                  style={{ padding:'7px 16px', borderRadius:'7px', background:isActive?'rgba(37,99,235,0.2)':'transparent', color:isActive?'var(--blue-light)':enabled?'var(--text-dim)':'var(--slate)', border:isActive?'1px solid rgba(59,130,246,0.35)':'1px solid transparent', fontSize:'0.82rem', fontWeight:isActive?600:400, cursor:enabled?'pointer':'not-allowed', opacity:enabled?1:0.4, transition:'all 0.2s' }}>
                  {tab.label}
                </button>
              );
            })}
          </nav>
          <div style={{ fontSize:'0.7rem', color:'var(--slate-light)', fontFamily:"'Space Mono',monospace", display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ width:'7px', height:'7px', borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 6px var(--green)' }}/>
            Live
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex:1, maxWidth:'1400px', margin:'0 auto', width:'100%', padding:'28px 24px' }}>
        {activeTab==='form' && (
          <div style={{ display:'grid', gridTemplateColumns:'420px 1fr', gap:'28px', alignItems:'start' }} className="fade-in">
            <TripForm onSubmit={handleSubmit} loading={loading} error={error} />
            <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
              <InfoPanel />
              {result && <ResultPreview result={result} onViewMap={()=>setActiveTab('map')} onViewLogs={()=>setActiveTab('logs')} />}
            </div>
          </div>
        )}
        {activeTab==='map' && result && (
          <div className="fade-in">
            {leafletReady ? <RouteMap data={result} /> : <div style={{ textAlign:'center', padding:'80px', color:'var(--text-dim)' }}>Loading map...</div>}
          </div>
        )}
        {activeTab==='logs' && result && (
          <div className="fade-in"><ELDLogViewer data={result} /></div>
        )}
      </main>

      <footer style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'14px 24px', textAlign:'center', fontSize:'0.68rem', color:'var(--slate)', fontFamily:"'Space Mono',monospace" }}>
        ELD Trip Planner • FMCSA HOS 49 CFR Part 395 • Property-Carrying CMV • 70hr/8-day
      </footer>
    </div>
  );
}
