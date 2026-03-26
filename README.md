# Weather Dashboard (React + Vite)

A production-ready, responsive weather dashboard built with React that uses browser GPS and Open-Meteo APIs to show current and historical weather insights.

## Features

- Automatic GPS location detection on app load
- Current weather overview with reusable weather cards
- Hourly charts for:
  - Temperature (`°C` / `°F`)
  - Humidity
  - Precipitation
  - Visibility
  - Wind Speed
  - PM10 + PM2.5 (combined)
- Historical weather page with date range picker (up to 2 years)
- Historical charts for:
  - Temperature (min/max/mean)
  - Precipitation totals
  - Wind speed + direction
  - PM10 + PM2.5 trends
- React Query caching for fast repeat loads
- Error states for GPS denied and API failures
- Loading states with reusable loader component
- Mobile-first responsive UI
- Dark mode toggle

## Tech Stack

- React (Vite)
- JavaScript (ES modules)
- Axios
- Recharts
- Dayjs
- React Query (`@tanstack/react-query`)
- React Router

## Project Structure

```text
src/
  components/
    Navbar.jsx
    WeatherCard.jsx
    Chart.jsx
    Loader.jsx
  pages/
    CurrentWeather.jsx
    Historical.jsx
  hooks/
    useWeather.js
  utils/
    api.js
    helpers.js
  App.jsx
  main.jsx
```

## Routes

- `/` -> Current weather dashboard
- `/history` -> Historical weather dashboard

## Environment Variables

Create or edit `.env` in project root:

```env
VITE_OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast
VITE_AIR_QUALITY_BASE_URL=https://air-quality-api.open-meteo.com/v1/air-quality
```

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run development server

```bash
npm run dev
```

### 3) Build for production

```bash
npm run build
```

### 4) Preview production build

```bash
npm run preview
```

## API Integration

The app uses Open-Meteo endpoints:

- Forecast: `https://api.open-meteo.com/v1/forecast`
- Air quality: `https://air-quality-api.open-meteo.com/v1/air-quality`

Data requested includes:

- Hourly: `temperature_2m`, `relative_humidity_2m`, `precipitation`, `visibility`, `windspeed_10m`, `uv_index`, `winddirection_10m`
- Daily: `temperature_2m_max`, `temperature_2m_min`, `sunrise`, `sunset`, `precipitation_sum`
- Air quality hourly: `pm10`, `pm2_5`

## Historical Data Behavior

- Attempts to fetch historical-compatible data from Open-Meteo where available
- Falls back to deterministic simulated historical series when range/API limitations apply
- Keeps charts functional and responsive for long date ranges

## Performance Notes

- React Query caching (`staleTime`, `gcTime`) minimizes repeated API calls
- Heavy chart transformations are memoized with `useMemo`
- Route pages are lazy-loaded via `React.lazy` + `Suspense`
- Horizontal chart scrolling prevents expensive compression of dense datasets on small screens

## Error Handling

- GPS denied -> user-friendly retry/error state
- GPS unsupported -> clear browser compatibility message
- API failures -> safe fallback UI and non-crashing rendering path

## UX Notes

- Temperature unit is explicit with two buttons (`°C` and `°F`)
- Date picker fields on historical page are clickable across full field container
- Cards and chart sections adapt from mobile to desktop layouts

## License

Use and modify freely for personal or commercial projects.
