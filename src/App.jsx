import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LocationProvider } from './hooks/useWeather';
import Navbar from './components/Navbar.jsx';
import Loader from './components/Loader.jsx';

const CurrentWeather = React.lazy(() => import('./pages/CurrentWeather.jsx'));
const Historical = React.lazy(() => import('./pages/Historical.jsx'));

const css = `
  :root {
    --bg: #ffffff;
    --card: #f6f7fb;
    --text: #0f172a;
    --muted: #475569;
    --border: rgba(15, 23, 42, 0.12);
    --shadow: 0 10px 30px rgba(2, 6, 23, 0.08);
    --accent: #2563eb;
  }
  body[data-theme="dark"] {
    --bg: #070a12;
    --card: #0b1220;
    --text: #e5e7eb;
    --muted: #94a3b8;
    --border: rgba(226, 232, 240, 0.12);
    --shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    --accent: #60a5fa;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
    background: var(--bg);
    color: var(--text);
  }
  a { color: inherit; text-decoration: none; }
  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 14px;
  }
  .pageHeader {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin: 8px 0 14px;
  }
  .pageTitle {
    font-size: 18px;
    font-weight: 800;
    margin: 0;
  }
  .subtle {
    color: var(--muted);
    font-size: 13px;
  }
  .gridCards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  @media (min-width: 720px) {
    .gridCards { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }
  @media (min-width: 980px) {
    .gridCards { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  }
  .btn {
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--text);
    border-radius: 10px;
    padding: 8px 10px;
    cursor: pointer;
    box-shadow: none;
  }
  .btn:hover { border-color: rgba(37, 99, 235, 0.35); }
  .btnPrimary {
    background: rgba(37, 99, 235, 0.12);
    border-color: rgba(37, 99, 235, 0.35);
  }
  .fieldRow {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 12px 0;
  }
  @media (min-width: 720px) {
    .fieldRow { flex-direction: row; align-items: flex-end; justify-content: space-between; }
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }
  .label {
    font-size: 12px;
    color: var(--muted);
  }
  input[type="date"], select {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--card);
    color: var(--text);
    padding: 10px 12px;
    outline: none;
  }
  .alert {
    border: 1px solid rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.08);
    border-radius: 12px;
    padding: 12px;
    color: var(--text);
  }
`;

export default function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('weatherTheme');
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  });

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('weatherTheme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const navbar = useMemo(() => {
    return <Navbar theme={theme} onToggleTheme={toggleTheme} />;
  }, [theme, toggleTheme]);

  return (
    <>
      <style>{css}</style>
      <LocationProvider>
        <BrowserRouter>
          {navbar}
          <div className="container">
            <Suspense fallback={<Loader text="Loading page..." />}>
              <Routes>
                <Route path="/" element={<CurrentWeather />} />
                <Route path="/history" element={<Historical />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </BrowserRouter>
      </LocationProvider>
    </>
  );
}

