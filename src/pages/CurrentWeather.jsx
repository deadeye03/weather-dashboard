import React, { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import dayjs from 'dayjs';
import Chart from '../components/Chart.jsx';
import WeatherCard from '../components/WeatherCard.jsx';
import Loader from '../components/Loader.jsx';
import { useAirQualityQuery, useForecastQuery, useLocation } from '../hooks/useWeather';
import { cToF, findNearestIndexByTime, formatLocalDate, round0, round1 } from '../utils/helpers';

function safeFormatTime(value) {
  if (!value) return '--';
  const d = dayjs(value);
  return d.isValid() ? d.format('HH:mm') : String(value);
}

function displayVisibilityMeters(meters) {
  if (meters === null || meters === undefined) return null;
  const km = meters / 1000;
  return km >= 1 ? round1(km) : round0(meters);
}

export default function CurrentWeather() {
  const { coords, status, error, requestLocation } = useLocation();
  const forecastQuery = useForecastQuery(coords);
  const airQuery = useAirQualityQuery(coords);

  const [unit, setUnit] = useState(() => localStorage.getItem('weatherTempUnit') || 'C');

  const setUnitAndPersist = (next) => {
    setUnit(next);
    localStorage.setItem('weatherTempUnit', next);
  };

  const unitSymbol = unit === 'F' ? '°F' : '°C';
  const unitLabelToggle = unit === 'F' ? 'Switch to °C' : 'Switch to °F';

  const derived = useMemo(() => {
    const hourly = forecastQuery.data?.hourly;
    const daily = forecastQuery.data?.daily;

    const timeArr = hourly?.time || [];
    const nowMs = Date.now();
    const idx = findNearestIndexByTime(timeArr, nowMs);

    const todayIdx = daily?.time ? daily.time.indexOf(formatLocalDate(new Date().toISOString())) : -1;
    const safeDayIdx = todayIdx >= 0 ? todayIdx : 0;

    const currentTempC = hourly?.temperature_2m?.[idx];
    const minC = daily?.temperature_2m_min?.[safeDayIdx];
    const maxC = daily?.temperature_2m_max?.[safeDayIdx];
    const humidity = hourly?.relative_humidity_2m?.[idx];
    const uvIndex = hourly?.uv_index?.[idx];
    const windSpeedKmh = hourly?.windspeed_10m?.[idx];
    const sunrise = daily?.sunrise?.[safeDayIdx];
    const sunset = daily?.sunset?.[safeDayIdx];

    const temperaturePointsC = timeArr.map((t, i) => ({
      time: t,
      tempC: hourly?.temperature_2m?.[i],
    }));

    const temperaturePointsF = temperaturePointsC.map((p) => ({
      time: p.time,
      tempF: cToF(p.tempC),
    }));

    const humidityPoints = timeArr.map((t, i) => ({
      time: t,
      humidity: hourly?.relative_humidity_2m?.[i],
    }));

    const precipitationPoints = timeArr.map((t, i) => ({
      time: t,
      precipitationMmH: hourly?.precipitation?.[i],
    }));

    const visibilityPoints = timeArr.map((t, i) => ({
      time: t,
      visibilityMeters: hourly?.visibility?.[i],
    }));

    const windPoints = timeArr.map((t, i) => ({
      time: t,
      windSpeedKmh: hourly?.windspeed_10m?.[i],
    }));

    const aqHourly = airQuery.data?.hourly;
    const aqTimeArr = aqHourly?.time || [];
    const aqIdx = findNearestIndexByTime(aqTimeArr, nowMs);
    const pm25 = aqHourly?.pm2_5?.[aqIdx];
    const pm10 = aqHourly?.pm10?.[aqIdx];

    const pmPoints = aqTimeArr.map((t, i) => ({
      time: t,
      pm25: aqHourly?.pm2_5?.[i],
      pm10: aqHourly?.pm10?.[i],
    }));

    return {
      idx,
      currentTempC,
      minC,
      maxC,
      humidity,
      uvIndex,
      windSpeedKmh,
      sunrise,
      sunset,
      temperaturePointsC,
      temperaturePointsF,
      humidityPoints,
      precipitationPoints,
      visibilityPoints,
      windPoints,
      pm25,
      pm10,
      pmPoints,
    };
  }, [forecastQuery.data, airQuery.data]);

  const isGPSLoading = status === 'idle' || status === 'loading';
  const isForecastLoading = forecastQuery.isLoading;

  if (isGPSLoading) return <Loader text="Getting your location..." />;

  if (status === 'denied') {
    return (
      <div className="alert" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Location permission denied.</div>
        <div className="subtle" style={{ marginBottom: 12 }}>
          Enable location permissions in your browser settings and try again.
        </div>
        <button className="btn btnPrimary" type="button" onClick={requestLocation}>
          Retry GPS
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="alert" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Could not fetch GPS coordinates.</div>
        <div className="subtle">{error?.message || 'Please check your browser settings and retry.'}</div>
        <div style={{ marginTop: 12 }}>
          <button className="btn btnPrimary" type="button" onClick={requestLocation}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isForecastLoading) return <Loader text="Loading current weather..." />;

  if (forecastQuery.isError) {
    return (
      <div className="alert" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Could not fetch weather data.</div>
        <div className="subtle" style={{ marginBottom: 12 }}>
          {forecastQuery.error?.message || 'Please try again in a moment.'}
        </div>
        <div className="subtle">Refresh the page to retry.</div>
      </div>
    );
  }

  const tempValue = derived.currentTempC == null ? null : unit === 'F' ? cToF(derived.currentTempC) : derived.currentTempC;
  const tempMinValue = derived.minC == null ? null : unit === 'F' ? cToF(derived.minC) : derived.minC;
  const tempMaxValue = derived.maxC == null ? null : unit === 'F' ? cToF(derived.maxC) : derived.maxC;

  const minMaxValue =
    tempMinValue == null || tempMaxValue == null ? null : `${round0(tempMinValue)} / ${round0(tempMaxValue)}`;

  const sunriseSunsetValue =
    derived.sunrise || derived.sunset
      ? `${safeFormatTime(derived.sunrise)} / ${safeFormatTime(derived.sunset)}`
      : null;

  const pmCardValue =
    derived.pm25 == null || derived.pm10 == null ? null : `${round0(derived.pm25)} / ${round0(derived.pm10)}`;

  const temperatureData = unit === 'F'
    ? derived.temperaturePointsF.map((p) => ({ time: p.time, temperature: p.tempF }))
    : derived.temperaturePointsC.map((p) => ({ time: p.time, temperature: p.tempC }));

  const visibilityData = derived.visibilityPoints.map((p) => {
    const v = p.visibilityMeters;
    const display = v == null ? null : displayVisibilityMeters(v);
    const suffix = v == null ? null : v >= 1000 ? 'km' : 'm';
    return { time: p.time, visibility: display, unitSuffix: suffix };
  });

  return (
    <div>
      <div className="pageHeader">
        <h1 className="pageTitle">Current Weather</h1>
        <div className="subtle">
          {coords ? `Lat ${coords.lat.toFixed(3)} • Lng ${coords.lng.toFixed(3)}` : ''}
        </div>
      </div>

      <div className="fieldRow" style={{ marginTop: 0 }}>
        <div className="field" style={{ flex: '1 1 100%', maxWidth: 'none' }}>
          <div className="label">Temperature Unit</div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button
              className={`btn ${unit === 'C' ? 'btnPrimary' : ''}`}
              type="button"
              onClick={() => setUnitAndPersist('C')}
              style={{ flex: 1, minWidth: 0 }}
              aria-pressed={unit === 'C'}
            >
              °C
            </button>
            <button
              className={`btn ${unit === 'F' ? 'btnPrimary' : ''}`}
              type="button"
              onClick={() => setUnitAndPersist('F')}
              style={{ flex: 1, minWidth: 0 }}
              aria-pressed={unit === 'F'}
            >
              °F
            </button>
          </div>
          <div className="subtle" style={{ marginTop: 6 }}>
            Current: {unitSymbol}
          </div>
        </div>
      </div>

      <div className="gridCards" style={{ marginTop: 6 }}>
        <WeatherCard label="Current temperature" value={tempValue == null ? null : round0(tempValue)} unit={unitSymbol} />
        <WeatherCard label="Min / Max temperature" value={minMaxValue} unit={unitSymbol} />
        <WeatherCard label="Humidity" value={derived.humidity == null ? null : round0(derived.humidity)} unit="%" />
        <WeatherCard label="UV Index" value={derived.uvIndex == null ? null : round1(derived.uvIndex)} unit="" />
        <WeatherCard label="Wind speed" value={derived.windSpeedKmh == null ? null : round0(derived.windSpeedKmh)} unit="km/h" />
        <WeatherCard label="Sunrise / Sunset" value={sunriseSunsetValue} unit="" />
        <WeatherCard label="Air Quality (PM2.5 / PM10)" value={pmCardValue} unit="ug/m3" sublabel={airQuery.isLoading ? 'Loading...' : null} />
      </div>

      <Chart title="Temperature (hourly)" minWidth={680}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={temperatureData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickFormatter={(v) => dayjs(v).format('HH:mm')}
              minTickGap={40}
            />
            <YAxis
              label={{ value: unitSymbol, angle: -90, position: 'insideLeft' }}
              width={44}
            />
            <Tooltip
              labelFormatter={(v) => `Time: ${dayjs(v).format('HH:mm')}`}
              formatter={(value) => [round0(value), unitSymbol]}
            />
            <Line type="monotone" dataKey="temperature" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Humidity (hourly)" minWidth={680}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={derived.humidityPoints} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={(v) => dayjs(v).format('HH:mm')} minTickGap={40} />
            <YAxis label={{ value: '%', angle: -90, position: 'insideLeft' }} width={44} />
            <Tooltip labelFormatter={(v) => `Time: ${dayjs(v).format('HH:mm')}`} formatter={(value) => [`${round0(value)}%`, 'Humidity']} />
            <Line type="monotone" dataKey="humidity" stroke="#16a34a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Precipitation (hourly)" minWidth={680}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={derived.precipitationPoints} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={(v) => dayjs(v).format('HH:mm')} minTickGap={40} />
            <YAxis label={{ value: 'mm/h', angle: -90, position: 'insideLeft' }} width={54} />
            <Tooltip labelFormatter={(v) => `Time: ${dayjs(v).format('HH:mm')}`} formatter={(value) => [`${round1(value)} mm/h`, 'Precip']} />
            <Bar dataKey="precipitationMmH" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Visibility (hourly)" minWidth={680}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibilityData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={(v) => dayjs(v).format('HH:mm')} minTickGap={40} />
            <YAxis label={{ value: 'm / km', angle: -90, position: 'insideLeft' }} width={74} />
            <Tooltip
              labelFormatter={(v) => `Time: ${dayjs(v).format('HH:mm')}`}
              formatter={(value, name, props) => {
                const v = value == null ? '--' : value;
                const suffix = props?.payload?.unitSuffix || '';
                return [`${v} ${suffix}`.trim(), 'Visibility'];
              }}
            />
            <Line type="monotone" dataKey="visibility" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Wind Speed (hourly)" minWidth={680}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={derived.windPoints} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={(v) => dayjs(v).format('HH:mm')} minTickGap={40} />
            <YAxis label={{ value: 'km/h', angle: -90, position: 'insideLeft' }} width={54} />
            <Tooltip labelFormatter={(v) => `Time: ${dayjs(v).format('HH:mm')}`} formatter={(value) => [`${round0(value)} km/h`, 'Wind']} />
            <Line type="monotone" dataKey="windSpeedKmh" stroke="#111827" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="PM10 + PM2.5 (hourly)" minWidth={680}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={derived.pmPoints} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tickFormatter={(v) => dayjs(v).format('HH:mm')} minTickGap={40} />
            <YAxis label={{ value: 'ug/m3', angle: -90, position: 'insideLeft' }} width={78} />
            <Tooltip
              labelFormatter={(v) => `Time: ${dayjs(v).format('HH:mm')}`}
              formatter={(value, name) => [`${round0(value)}`, name === 'pm25' ? 'PM2.5' : 'PM10']}
            />
            <Line type="monotone" dataKey="pm10" stroke="#7c3aed" strokeWidth={2} dot={false} name="PM10" />
            <Line type="monotone" dataKey="pm25" stroke="#db2777" strokeWidth={2} dot={false} name="PM2.5" />
          </LineChart>
        </ResponsiveContainer>
      </Chart>
    </div>
  );
}

