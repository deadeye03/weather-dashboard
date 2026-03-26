import axios from 'axios';

const DEFAULT_FORECAST_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_AIR_QUALITY_BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const FORECAST_BASE_URL = import.meta.env.VITE_OPEN_METEO_BASE_URL || DEFAULT_FORECAST_BASE_URL;
const AIR_QUALITY_BASE_URL = import.meta.env.VITE_AIR_QUALITY_BASE_URL || DEFAULT_AIR_QUALITY_BASE_URL;

const HOURLY_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'precipitation',
  'visibility',
  'windspeed_10m',
  'uv_index',
  'winddirection_10m',
];

const DAILY_VARS = ['temperature_2m_max', 'temperature_2m_min', 'sunrise', 'sunset', 'precipitation_sum'];

export async function fetchForecast({
  lat,
  lng,
  forecastDays = 1,
  startDate,
  endDate,
}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    timezone: 'auto',
    hourly: HOURLY_VARS.join(','),
    daily: DAILY_VARS.join(','),
    forecast_days: String(forecastDays),
  });

  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);

  const res = await axios.get(FORECAST_BASE_URL, { params });
  return res.data;
}

export async function fetchAirQuality({
  lat,
  lng,
  startDate,
  endDate,
}) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    timezone: 'auto',
    hourly: ['pm10', 'pm2_5'].join(','),
  });

  // Optional range for smaller historical queries (if supported by the endpoint).
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);

  const res = await axios.get(AIR_QUALITY_BASE_URL, { params });
  return res.data;
}

