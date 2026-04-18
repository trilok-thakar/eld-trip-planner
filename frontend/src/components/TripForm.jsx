import { useState } from 'react';

const styles = {
  wrapper: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    padding: '28px',
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: {
    fontFamily: "'Space Mono', monospace",
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    color: 'var(--accent)',
    marginBottom: '18px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  locationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dot: (color) => ({
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
    boxShadow: `0 0 8px ${color}`,
  }),
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.07)',
    margin: '20px 0',
  },
  sliderWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sliderValue: {
    fontFamily: "'Space Mono', monospace",
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--accent)',
    minWidth: '52px',
    textAlign: 'right',
  },
  slider: {
    flex: 1,
    WebkitAppearance: 'none',
    appearance: 'none',
    height: '4px',
    borderRadius: '2px',
    background: 'linear-gradient(to right, var(--blue-light) 0%, var(--orange) 60%, var(--red) 100%)',
    outline: 'none',
    cursor: 'pointer',
  },
  statusBar: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.7rem',
    color: 'var(--slate-light)',
    fontFamily: "'Space Mono', monospace",
  },
  submitBtn: {
    width: '100%',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, var(--blue) 0%, #1d4ed8 100%)',
    color: 'white',
    fontSize: '0.95rem',
    fontWeight: 700,
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '8px',
    letterSpacing: '0.02em',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '8px',
    padding: '12px 14px',
    color: '#fca5a5',
    fontSize: '0.85rem',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  hintsBox: {
    background: 'rgba(245,158,11,0.07)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '20px',
  },
  hintsTitle: {
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--accent)',
    marginBottom: '6px',
  },
  hintsList: {
    fontSize: '0.78rem',
    color: 'var(--text-dim)',
    lineHeight: 1.6,
    paddingLeft: '14px',
  },
};

const LOCATION_EXAMPLES = [
  { label: 'Short (1 day)', current: 'Chicago, IL', pickup: 'Indianapolis, IN', dropoff: 'Louisville, KY' },
  { label: 'Medium (2-3 days)', current: 'Los Angeles, CA', pickup: 'Las Vegas, NV', dropoff: 'Salt Lake City, UT' },
  { label: 'Long (3-4 days)', current: 'New York, NY', pickup: 'Pittsburgh, PA', dropoff: 'Kansas City, MO' },
  { label: 'Cross-country', current: 'Los Angeles, CA', pickup: 'Albuquerque, NM', dropoff: 'New York, NY' },
];

export default function TripForm({ onSubmit, loading, error }) {
  const [form, setForm] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_used: 0,
    start_date: new Date().toISOString().split('T')[0],
  });

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, current_cycle_used: Number(form.current_cycle_used) });
  };

  const loadExample = (ex) => {
    setForm(f => ({
      ...f,
      current_location: ex.current,
      pickup_location: ex.pickup,
      dropoff_location: ex.dropoff,
      current_cycle_used: 0,
    }));
  };

  const cycleColor = form.current_cycle_used < 40 ? 'var(--green)'
    : form.current_cycle_used < 60 ? 'var(--accent)'
    : 'var(--red)';

  const remaining = 70 - Number(form.current_cycle_used);

  return (
    <form onSubmit={handleSubmit} style={styles.wrapper}>
      <div style={styles.sectionTitle}>
        <span>▶</span> Trip Details
      </div>

      {/* Quick examples */}
      <div style={styles.hintsBox}>
        <div style={styles.hintsTitle}>⚡ Quick Examples</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
          {LOCATION_EXAMPLES.map(ex => (
            <button
              key={ex.label}
              type="button"
              onClick={() => loadExample(ex)}
              style={{
                padding: '4px 10px',
                fontSize: '0.75rem',
                background: 'rgba(245,158,11,0.12)',
                color: 'var(--accent)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.fieldGroup}>
        {/* Current Location */}
        <div style={styles.field}>
          <label>Current Location</label>
          <div style={styles.locationRow}>
            <div style={styles.dot('#22c55e')} />
            <input
              type="text"
              placeholder="e.g. Chicago, IL"
              value={form.current_location}
              onChange={set('current_location')}
              required
            />
          </div>
        </div>

        {/* Pickup */}
        <div style={styles.field}>
          <label>Pickup Location</label>
          <div style={styles.locationRow}>
            <div style={styles.dot('#3b82f6')} />
            <input
              type="text"
              placeholder="e.g. Indianapolis, IN"
              value={form.pickup_location}
              onChange={set('pickup_location')}
              required
            />
          </div>
        </div>

        {/* Dropoff */}
        <div style={styles.field}>
          <label>Dropoff Location</label>
          <div style={styles.locationRow}>
            <div style={styles.dot('#f97316')} />
            <input
              type="text"
              placeholder="e.g. Nashville, TN"
              value={form.dropoff_location}
              onChange={set('dropoff_location')}
              required
            />
          </div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Cycle Hours */}
      <div style={{ marginBottom: '20px' }}>
        <label>Current Cycle Used (HOS — 70 hr / 8-day rule)</label>
        <div style={styles.sliderWrapper}>
          <div style={styles.sliderRow}>
            <input
              type="range"
              min="0"
              max="70"
              step="0.5"
              value={form.current_cycle_used}
              onChange={set('current_cycle_used')}
              style={{
                ...styles.slider,
                background: `linear-gradient(to right, var(--blue-light) 0%, var(--blue-light) ${(form.current_cycle_used / 70) * 100}%, rgba(255,255,255,0.1) ${(form.current_cycle_used / 70) * 100}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
            <span style={{ ...styles.sliderValue, color: cycleColor }}>
              {Number(form.current_cycle_used).toFixed(1)}h
            </span>
          </div>
          <div style={styles.statusBar}>
            <span>0h used</span>
            <span style={{ color: cycleColor, fontWeight: 700 }}>
              {remaining.toFixed(1)}h remaining
            </span>
            <span>70h max</span>
          </div>
          {Number(form.current_cycle_used) >= 60 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--orange)', marginTop: '4px' }}>
              ⚠ Near cycle limit — 34-hour restart may be required
            </div>
          )}
        </div>
      </div>

      {/* Start Date */}
      <div style={{ marginBottom: '20px' }}>
        <label>Trip Start Date</label>
        <input
          type="date"
          value={form.start_date}
          onChange={set('start_date')}
          style={{ colorScheme: 'dark' }}
        />
      </div>

      {/* HOS Rules reminder */}
      <div style={{ ...styles.hintsBox, background: 'rgba(37,99,235,0.06)', borderColor: 'rgba(59,130,246,0.2)', marginBottom: '18px' }}>
        <div style={{ ...styles.hintsTitle, color: 'var(--blue-light)' }}>📋 Applied HOS Rules (FMCSA §395)</div>
        <ul style={styles.hintsList}>
          <li>11-hr driving limit / 14-hr on-duty window</li>
          <li>30-min break after 8 cumulative driving hours</li>
          <li>10-hr off-duty between shifts</li>
          <li>70-hr / 8-day cycle limit</li>
          <li>Fuel stop every 1,000 miles (30 min)</li>
          <li>1 hour for pickup & 1 hour for dropoff</li>
        </ul>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={styles.submitBtn}
        onMouseOver={e => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
        onMouseOut={e => (e.currentTarget.style.transform = 'none')}
      >
        {loading ? (
          <>
            <div style={styles.spinner} />
            <span>Planning Route...</span>
          </>
        ) : (
          <>
            <span>🗺</span>
            <span>Calculate Trip Plan</span>
          </>
        )}
      </button>
    </form>
  );
}
