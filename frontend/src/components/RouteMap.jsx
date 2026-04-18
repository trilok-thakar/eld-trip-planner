import { useEffect, useRef } from 'react';

const STOP_ICONS = {
  pickup: { color: '#3b82f6', emoji: '📦', label: 'Pickup' },
  dropoff: { color: '#f97316', emoji: '🏁', label: 'Dropoff' },
  rest: { color: '#8b5cf6', emoji: '🛌', label: 'Rest Stop' },
  restart_rest: { color: '#7c3aed', emoji: '⏰', label: '34-hr Restart' },
  '30min_break': { color: '#fbbf24', emoji: '☕', label: '30-min Break' },
  fuel: { color: '#22c55e', emoji: '⛽', label: 'Fuel Stop' },
};

function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime(hours, startDate) {
  const date = new Date(startDate);
  date.setHours(0, 0, 0, 0);
  date.setTime(date.getTime() + hours * 3600000);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function RouteMap({ data }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  const { locations, route, stops, trip_summary } = data;
  const startDate = data.start_date || new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!window.L) return;
    const L = window.L;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap contributors © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    // Clear old layers
    layersRef.current.forEach(l => map.removeLayer(l));
    layersRef.current = [];

    const addLayer = (layer) => {
      layer.addTo(map);
      layersRef.current.push(layer);
      return layer;
    };

    // Route polyline
    if (route.waypoints && route.waypoints.length > 1) {
      const latlngs = route.waypoints.map(w => [w.lat, w.lng]);
      const routeLine = addLayer(L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.85,
        dashArray: null,
      }));

      // Glow effect
      addLayer(L.polyline(latlngs, {
        color: '#60a5fa',
        weight: 8,
        opacity: 0.2,
      }));

      map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    } else {
      const bounds = [
        [locations.current.lat, locations.current.lng],
        [locations.pickup.lat, locations.pickup.lng],
        [locations.dropoff.lat, locations.dropoff.lng],
      ];
      map.fitBounds(bounds, { padding: [60, 60] });
    }

    // Custom marker creator
    const createMarker = (lat, lng, color, emoji, size = 36) => {
      const icon = L.divIcon({
        html: `<div style="
          width:${size}px;height:${size}px;
          background:${color};
          border:3px solid rgba(255,255,255,0.9);
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 3px 12px rgba(0,0,0,0.5);
          position:relative;
        "><span style="transform:rotate(45deg);font-size:${size * 0.42}px;line-height:1;">${emoji}</span></div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size],
      });
      return L.marker([lat, lng], { icon });
    };

    // Main location markers
    const startMarker = createMarker(locations.current.lat, locations.current.lng, '#22c55e', '🚛', 44);
    startMarker.bindPopup(`
      <div style="min-width:160px">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;color:#22c55e">🚛 Start Location</div>
        <div style="font-size:0.82rem;line-height:1.4">${locations.current.name}</div>
      </div>
    `);
    addLayer(startMarker);

    const pickupMarker = createMarker(locations.pickup.lat, locations.pickup.lng, '#3b82f6', '📦', 40);
    pickupMarker.bindPopup(`
      <div style="min-width:160px">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;color:#3b82f6">📦 Pickup</div>
        <div style="font-size:0.82rem;line-height:1.4">${locations.pickup.name}</div>
      </div>
    `);
    addLayer(pickupMarker);

    const dropoffMarker = createMarker(locations.dropoff.lat, locations.dropoff.lng, '#f97316', '🏁', 40);
    dropoffMarker.bindPopup(`
      <div style="min-width:160px">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px;color:#f97316">🏁 Dropoff</div>
        <div style="font-size:0.82rem;line-height:1.4">${locations.dropoff.name}</div>
      </div>
    `);
    addLayer(dropoffMarker);

    // Stop markers along route
    stops.forEach((stop, i) => {
      if (stop.type === 'pickup' || stop.type === 'dropoff') return;
      const info = STOP_ICONS[stop.type] || { color: '#94a3b8', emoji: '●', label: stop.type };

      // Estimate position along route
      let lat, lng;
      const pct = stop.arrival_time / (trip_summary.total_trip_time || 1);
      const wps = route.waypoints;
      if (wps && wps.length > 1) {
        const idx = Math.min(Math.floor(pct * (wps.length - 1)), wps.length - 2);
        const frac = pct * (wps.length - 1) - idx;
        lat = wps[idx].lat + (wps[idx + 1].lat - wps[idx].lat) * frac;
        lng = wps[idx].lng + (wps[idx + 1].lng - wps[idx].lng) * frac;
      } else {
        return;
      }

      const marker = createMarker(lat, lng, info.color, info.emoji, 30);
      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;font-size:0.9rem;margin-bottom:6px;color:${info.color}">
            ${info.emoji} ${info.label}
          </div>
          <div style="font-size:0.8rem;color:#94a3b8;margin-bottom:4px">
            📍 ${stop.location ? stop.location.substring(0, 40) : 'En route'}
          </div>
          <div style="font-size:0.8rem;margin-bottom:2px">
            ⏱ Arrival: ${formatTime(stop.arrival_time, startDate)}
          </div>
          <div style="font-size:0.8rem;margin-bottom:4px">
            ⏳ Duration: ${formatDuration(stop.duration_hours)}
          </div>
          ${stop.notes ? `<div style="font-size:0.75rem;color:#94a3b8;font-style:italic">${stop.notes}</div>` : ''}
        </div>
      `);
      addLayer(marker);
    });

  }, [data]);

  // Stats overlay
  const statItems = [
    { icon: '📏', label: 'Distance', value: `${trip_summary.total_distance_miles.toFixed(0)} mi` },
    { icon: '🚗', label: 'Drive Time', value: formatDuration(trip_summary.total_drive_time_hours) },
    { icon: '📅', label: 'Trip Days', value: `${trip_summary.num_days} day${trip_summary.num_days !== 1 ? 's' : ''}` },
    { icon: '🛑', label: 'Total Stops', value: stops.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      {/* Stats bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
      }}>
        {statItems.map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '12px 14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--accent)',
            }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div style={{
        flex: 1,
        minHeight: '400px',
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
      }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
      </div>

      {/* Stops timeline */}
      {stops.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '16px',
        }}>
          <div style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--accent)',
            marginBottom: '12px',
          }}>
            ⏱ Trip Timeline
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {stops.map((stop, i) => {
              const info = STOP_ICONS[stop.type] || { color: '#94a3b8', emoji: '●', label: stop.type };
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative' }}>
                  {/* Line connector */}
                  {i < stops.length - 1 && (
                    <div style={{
                      position: 'absolute',
                      left: '13px',
                      top: '26px',
                      width: '2px',
                      height: 'calc(100% - 4px)',
                      background: 'rgba(255,255,255,0.06)',
                    }} />
                  )}
                  {/* Icon */}
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: info.color + '22',
                    border: `2px solid ${info.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    flexShrink: 0,
                    zIndex: 1,
                  }}>
                    {info.emoji}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, paddingBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: info.color }}>{info.label}</span>
                        {stop.location && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginLeft: '6px' }}>
                            — {stop.location.substring(0, 35)}
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: '0.72rem',
                        color: 'var(--slate-light)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        whiteSpace: 'nowrap',
                        marginLeft: '8px',
                      }}>
                        {formatDuration(stop.duration_hours)}
                      </span>
                    </div>
                    {stop.notes && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '2px', fontStyle: 'italic' }}>
                        {stop.notes}
                      </div>
                    )}
                    <div style={{ fontSize: '0.72rem', color: 'var(--slate)', marginTop: '2px' }}>
                      {formatTime(stop.arrival_time, startDate)} → {formatTime(stop.departure_time, startDate)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warnings */}
      {trip_summary.warnings && trip_summary.warnings.length > 0 && (
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: '10px',
          padding: '12px 16px',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: '6px' }}>
            ⚠ HOS Notices
          </div>
          {trip_summary.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '4px' }}>• {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
