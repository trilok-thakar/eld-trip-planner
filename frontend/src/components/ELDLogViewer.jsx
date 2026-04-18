import { useState, useRef } from 'react';

const STATUS_COLORS = {
  off_duty: { color: '#94a3b8', label: 'Off Duty', row: 1 },
  sleeper_berth: { color: '#7dd3fc', label: 'Sleeper Berth', row: 2 },
  driving: { color: '#22c55e', label: 'Driving', row: 3 },
  on_duty_not_driving: { color: '#f97316', label: 'On Duty (Not Driving)', row: 4 },
};

function formatHours(h) {
  if (!h && h !== 0) return '0:00';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}

function HoursSummary({ hours }) {
  const total = Object.values(hours).reduce((a, b) => a + b, 0);
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
      marginBottom: '16px',
    }}>
      {Object.entries(STATUS_COLORS).map(([key, info]) => {
        const val = hours[key] || 0;
        const pct = total > 0 ? (val / total) * 100 : 0;
        return (
          <div key={key} style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '8px',
            padding: '10px 12px',
            border: `1px solid ${info.color}30`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '0.75rem', color: info.color, fontWeight: 600 }}>{info.label}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: info.color }}>
                {formatHours(val)}
              </span>
            </div>
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: info.color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '20px', height: '4px', background: color, borderRadius: '2px' }} />
      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{label}</span>
    </div>
  );
}

export default function ELDLogViewer({ data }) {
  const [activeDay, setActiveDay] = useState(0);
  const svgContainerRef = useRef(null);

  const { daily_logs, log_svgs, trip_summary } = data;

  if (!daily_logs || daily_logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
        No log data available
      </div>
    );
  }

  const currentLog = daily_logs[activeDay];
  const currentSvg = log_svgs?.[activeDay] || '';

  const downloadSvg = () => {
    if (!currentSvg) return;
    const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ELD_Log_Day_${activeDay + 1}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllSvgs = () => {
    log_svgs?.forEach((svg, i) => {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ELD_Log_Day_${i + 1}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.72rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--accent)',
        }}>
          📋 ELD Daily Log Sheets — {trip_summary.num_days} Day{trip_summary.num_days !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={downloadSvg}
            style={{
              padding: '7px 14px',
              background: 'rgba(37,99,235,0.15)',
              color: 'var(--blue-light)',
              border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: '7px',
              fontSize: '0.8rem',
              cursor: 'pointer',
            }}
          >
            ↓ Day {activeDay + 1}
          </button>
          {daily_logs.length > 1 && (
            <button
              onClick={downloadAllSvgs}
              style={{
                padding: '7px 14px',
                background: 'rgba(245,158,11,0.12)',
                color: 'var(--accent)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '7px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              ↓ All Logs
            </button>
          )}
        </div>
      </div>

      {/* Day tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px',
        padding: '6px',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {daily_logs.map((log, i) => {
          const hours = log.hours || {};
          const driveH = hours.driving || 0;
          const isActive = activeDay === i;
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              style={{
                padding: '8px 14px',
                borderRadius: '7px',
                background: isActive ? 'var(--blue)' : 'transparent',
                color: isActive ? 'white' : 'var(--text-dim)',
                border: isActive ? '1px solid var(--blue)' : '1px solid transparent',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 400,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minWidth: '72px',
                transition: 'all 0.2s',
              }}
            >
              <span>Day {i + 1}</span>
              <span style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: '0.68rem',
                color: isActive ? 'rgba(255,255,255,0.75)' : 'var(--slate)',
              }}>
                {formatHours(driveH)} dr
              </span>
            </button>
          );
        })}
      </div>

      {/* Hours summary */}
      <HoursSummary hours={currentLog.hours || {}} />

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {Object.entries(STATUS_COLORS).map(([key, info]) => (
          <LegendItem key={key} color={info.color} label={info.label} />
        ))}
      </div>

      {/* SVG Log Sheet */}
      {currentSvg ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '4px',
          border: '1px solid rgba(255,255,255,0.15)',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        }}>
          <div
            ref={svgContainerRef}
            style={{ width: '100%', overflowX: 'auto' }}
            dangerouslySetInnerHTML={{ __html: currentSvg }}
          />
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: 'var(--text-dim)',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          Log sheet not available for this day
        </div>
      )}

      {/* Events detail table */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          fontFamily: "'Space Mono', monospace",
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--accent)',
        }}>
          Duty Status Detail — Day {activeDay + 1}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Status', 'Start', 'End', 'Duration', 'Location'].map(h => (
                  <th key={h} style={{
                    padding: '8px 12px',
                    textAlign: 'left',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--slate-light)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(currentLog.events || []).map((event, i) => {
                const info = STATUS_COLORS[event.type] || { color: '#94a3b8', label: event.type };
                const duration = event.end - event.start;
                const h = Math.floor(event.start);
                const m = Math.round((event.start - h) * 60);
                const eh = Math.floor(event.end);
                const em = Math.round((event.end - eh) * 60);
                return (
                  <tr key={i} style={{
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  }}>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                        <span style={{ color: info.color, fontWeight: 500 }}>{info.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: "'Space Mono', monospace", fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: "'Space Mono', monospace", fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {`${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: "'Space Mono', monospace", fontSize: '0.75rem', color: 'var(--text-bright)', fontWeight: 600 }}>
                      {formatHours(duration)}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontSize: '0.78rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.location || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
