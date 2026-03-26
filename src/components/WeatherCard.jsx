import React from 'react';

export default function WeatherCard({
  label,
  value,
  unit,
  sublabel,
  emphasize = false,
}) {
  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 12,
        boxShadow: 'var(--shadow)',
        minHeight: 86,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800, letterSpacing: '0.2px' }}>
          {label}
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <div style={{ fontSize: emphasize ? 22 : 18, fontWeight: 900 }}>
          {value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value)) ? '--' : value}
        </div>
        {unit ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 800 }}>
            {unit}
          </div>
        ) : null}
      </div>

      {sublabel ? <div style={{ marginTop: 6, color: 'var(--muted)', fontSize: 12 }}>{sublabel}</div> : null}
    </div>
  );
}

