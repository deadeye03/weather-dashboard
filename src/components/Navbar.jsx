import React from 'react';
import { NavLink } from 'react-router-dom';

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid transparent',
        color: 'inherit',
        fontWeight: 700,
        background: isActive ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
        borderColor: isActive ? 'rgba(37, 99, 235, 0.35)' : 'transparent',
      })}
    >
      {label}
    </NavLink>
  );
}

export default function Navbar({ theme, onToggleTheme }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        backdropFilter: 'blur(10px)',
        background: theme === 'dark' ? 'rgb(55 55 55 / 75%)' : 'rgba(255,255,255,0.75)',
        borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
      }}
      
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Weather Dashboard</div>
          <div className="subtle" style={{ marginTop: 1 }}>
            Real-time + historical
          </div>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <NavItem to="/" label="Current Weather" />
          <NavItem to="/history" label="Historical" />
          <button className="btn" type="button" onClick={onToggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </nav>
      </div>
    </header>
  );
}

