import React from 'react';

export default function Loader({ text = 'Loading...' }) {
  return (
    <div style={{ padding: 14 , display: 'flex',flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: '3px solid rgba(37, 99, 235, 0.22)',
          borderTopColor: 'rgba(37, 99, 235, 0.85)',
          animation: 'spin 0.9s linear infinite',
          marginBottom: 10,
        }}
      />
      <div className="subtle">{text}</div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

