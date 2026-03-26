import React from 'react';

export default function Chart({ title, minWidth = 680, height = 280, children }) {
  return (
    <section style={{ marginTop: 14 }}>
      {title ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
        </div>
      ) : null}

      <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--card)', padding: 10 }}>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <div style={{ width: Math.max(minWidth, 600), height }}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

