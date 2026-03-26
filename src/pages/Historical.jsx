import React, { useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import Chart from '../components/Chart.jsx';
import Loader from '../components/Loader.jsx';
import WeatherCard from '../components/WeatherCard.jsx';
import { useHistoricalQuery, useLocation } from '../hooks/useWeather';
import { cToF, round0 } from '../utils/helpers';

function clampDateISO(iso, minISO, maxISO) {
  const d = dayjs(iso);
  if (!d.isValid()) return minISO;
  if (minISO && d.isBefore(dayjs(minISO))) return minISO;
  if (maxISO && d.isAfter(dayjs(maxISO))) return maxISO;
  return d.format('YYYY-MM-DD');
}

function sampleSeries(h, step) {
  const n = h.dateList.length;
  const idxs = [];
  for (let i = 0; i < n; i += step) idxs.push(i);

  return idxs.map((i) => ({
    date: h.dateList[i],
    minC: h.temperatureMinC[i],
    maxC: h.temperatureMaxC[i],
    precipMm: h.precipitationTotalMm[i],
    windSpeedKmh: h.windSpeedKmh[i],
    windDirectionDeg: h.windDirectionDeg[i],
    pm10: h.pm10UgM3[i],
    pm25: h.pm25UgM3[i],
  }));
}

export default function Historical() {
  const { coords, status, error, requestLocation } = useLocation();

  const todayISO = dayjs().format('YYYY-MM-DD');
  const minISO = dayjs().subtract(2, 'year').format('YYYY-MM-DD');

  const [draftFrom, setDraftFrom] = useState(() => dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [draftTo, setDraftTo] = useState(() => todayISO);

  const [unit, setUnit] = useState(() => localStorage.getItem('weatherTempUnit') || 'C');

  const fromInputRef = useRef(null);
  const toInputRef = useRef(null);

  const openDatePicker = (inputRef) => {
    const el = inputRef?.current;
    if (!el) return;
    // Chrome/Edge support `showPicker()` for native inputs.
    if (typeof el.showPicker === 'function') el.showPicker();
    else el.focus();
  };

  const validated = useMemo(() => {
    const from = clampDateISO(draftFrom, minISO, todayISO);
    const to = clampDateISO(draftTo, from, todayISO);
    const diffDays = dayjs(to).diff(dayjs(from), 'day') + 1;
    if (diffDays > 731) {
      const newFrom = dayjs(to).subtract(2, 'year').format('YYYY-MM-DD');
      return { from: newFrom, to };
    }
    return { from, to };
  }, [draftFrom, draftTo, minISO, todayISO]);

  const { data: hist, isLoading } = useHistoricalQuery(coords, validated.from, validated.to);

  const unitSymbol = unit === 'F' ? '°F' : '°C';

  const display = useMemo(() => {
    if (!hist) return null;
    const total = hist.dateList.length;
    const step = total > 180 ? Math.ceil(total / 180) : 1;
    const sampled = sampleSeries(hist, step);
    return { points: sampled, step };
  }, [hist]);

  const minWidth = useMemo(() => {
    if (!display) return 680;
    const points = display.points.length;
    return Math.max(680, points * 14 + 240);
  }, [display]);

  const pointsTemp = useMemo(() => {
    if (!display) return [];
    const points = display.points.map((p) => {
      const min = unit === 'F' ? cToF(p.minC) : p.minC;
      const max = unit === 'F' ? cToF(p.maxC) : p.maxC;
      const mean = (min + max) / 2;
      return { date: p.date, min, max, mean, precipMm: p.precipMm };
    });
    return points;
  }, [display, unit]);

  const tempChartData = pointsTemp;

  const precipChartData = useMemo(() => {
    if (!display) return [];
    return display.points.map((p) => ({ date: p.date, precipitationMm: p.precipMm }));
  }, [display]);

  const windChartData = useMemo(() => {
    if (!display) return [];
    return display.points.map((p) => ({ date: p.date, windSpeedKmh: p.windSpeedKmh, windDirectionDeg: p.windDirectionDeg }));
  }, [display]);

  const pmChartData = useMemo(() => {
    if (!display) return [];
    return display.points.map((p) => ({ date: p.date, pm10: p.pm10, pm25: p.pm25 }));
  }, [display]);

  if (status === 'idle' || status === 'loading') return <Loader text="Getting your location..." />;

  if (status === 'denied') {
    return (
      <div className="alert" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Location permission denied.</div>
        <div className="subtle" style={{ marginBottom: 12 }}>
          Enable location permissions and refresh.
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

  if (!hist || !display) return <Loader text={isLoading ? 'Loading history...' : 'Preparing charts...'} />;

  const pointsCount = display.points.length;
  const coverageLabel = `${validated.from} → ${validated.to} (${pointsCount} points shown)`;

  return (
    <div>
      <div className="pageHeader">
        <h1 className="pageTitle">Historical Weather</h1>
        <div className="subtle">{coords ? `Lat ${coords.lat.toFixed(3)} • Lng ${coords.lng.toFixed(3)}` : ''}</div>
      </div>

      <div className="fieldRow" style={{ marginTop: 0 }}>
        <div
          className="field"
          role="button"
          tabIndex={0}
          onClick={() => openDatePicker(fromInputRef)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') openDatePicker(fromInputRef);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="label">From</div>
          <input
            type="date"
            ref={fromInputRef}
            value={draftFrom}
            min={minISO}
            max={validated.to}
            onChange={(e) => setDraftFrom(e.target.value)}
          />
        </div>
        <div
          className="field"
          role="button"
          tabIndex={0}
          onClick={() => openDatePicker(toInputRef)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') openDatePicker(toInputRef);
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="label">To</div>
          <input
            type="date"
            ref={toInputRef}
            value={draftTo}
            min={validated.from}
            max={todayISO}
            onChange={(e) => setDraftTo(e.target.value)}
          />
        </div>
        <div className="field" style={{ flex: '0 0 auto', maxWidth: 220 }}>
          <div className="label">Temperature Unit</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setUnit('C');
                localStorage.setItem('weatherTempUnit', 'C');
              }}
              style={{
                borderColor: unit === 'C' ? 'rgba(37, 99, 235, 0.6)' : undefined,
                background: unit === 'C' ? 'rgba(37, 99, 235, 0.14)' : undefined,
                fontWeight: 900,
              }}
            >
              °C
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setUnit('F');
                localStorage.setItem('weatherTempUnit', 'F');
              }}
              style={{
                borderColor: unit === 'F' ? 'rgba(37, 99, 235, 0.6)' : undefined,
                background: unit === 'F' ? 'rgba(37, 99, 235, 0.14)' : undefined,
                fontWeight: 900,
              }}
            >
              °F
            </button>
          </div>
          <div className="subtle" style={{ marginTop: 6 }}>
            Current: {unitSymbol}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 6, marginBottom: 8 }} className="subtle">
        {coverageLabel} {isLoading ? '(updating from API)' : '(ready)'}
      </div>

      <div className="gridCards" style={{ marginTop: 10 }}>
        <WeatherCard label="Date range" value={`${validated.from} / ${validated.to}`} unit="" />
        <WeatherCard label="Sampling" value={`${display.step}x`} unit="(every N days)" sublabel="For performance on long ranges." />
        <WeatherCard label="Latest mean temp" value={round0((pointsTemp[pointsTemp.length - 1]?.mean ?? 0))} unit={unitSymbol} />
        <WeatherCard label="Latest total precipitation" value={pointsTemp[pointsTemp.length - 1]?.precipMm == null ? null : round0(pointsTemp[pointsTemp.length - 1].precipMm)} unit="mm" />
        <WeatherCard label="Latest wind speed" value={windChartData[windChartData.length - 1]?.windSpeedKmh == null ? null : round0(windChartData[windChartData.length - 1].windSpeedKmh)} unit="km/h" />
        <WeatherCard label="Latest PM2.5 / PM10" value={pmChartData[pmChartData.length - 1]?.pm25 == null ? null : `${round0(pmChartData[pmChartData.length - 1].pm25)} / ${round0(pmChartData[pmChartData.length - 1].pm10)}`} unit="ug/m3" />
      </div>

      <Chart title={`Temperature (min / max / mean) — ${unitSymbol}`} minWidth={minWidth}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={tempChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format('MM-DD')} minTickGap={48} />
            <YAxis label={{ value: unitSymbol, angle: -90, position: 'insideLeft' }} width={52} />
            <Tooltip
              labelFormatter={(v) => `Date: ${v}`}
              formatter={(value, name) => [`${round0(value)} ${unitSymbol}`, name === 'min' ? 'Min' : name === 'max' ? 'Max' : 'Mean']}
            />
            <Line type="monotone" dataKey="min" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Min" />
            <Line type="monotone" dataKey="max" stroke="#f97316" strokeWidth={2} dot={false} name="Max" />
            <Line type="monotone" dataKey="mean" stroke="#16a34a" strokeWidth={2} dot={false} name="Mean" />
          </LineChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Precipitation Total (daily)" minWidth={minWidth}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={precipChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format('MM-DD')} minTickGap={48} />
            <YAxis label={{ value: 'mm', angle: -90, position: 'insideLeft' }} width={46} />
            <Tooltip labelFormatter={(v) => `Date: ${v}`} formatter={(value) => [`${round0(value)} mm`, 'Precip']} />
            <Bar dataKey="precipitationMm" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="Wind (speed + direction trends)" minWidth={minWidth}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={windChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format('MM-DD')} minTickGap={48} />
            <YAxis
              yAxisId="left"
              label={{ value: 'km/h', angle: -90, position: 'insideLeft' }}
              width={54}
            />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'deg', angle: 90, position: 'insideRight' }} width={54} />
            <Tooltip
              labelFormatter={(v) => `Date: ${v}`}
              formatter={(value, name) =>
                name === 'windSpeedKmh' ? [`${round0(value)} km/h`, 'Speed'] : [`${round0(value)}°`, 'Direction']
              }
            />
            <Line yAxisId="left" type="monotone" dataKey="windSpeedKmh" stroke="#111827" dot={false} strokeWidth={2} name="Speed" />
            <Line yAxisId="right" type="monotone" dataKey="windDirectionDeg" stroke="#7c3aed" dot={false} strokeWidth={2} name="Direction" />
          </ComposedChart>
        </ResponsiveContainer>
      </Chart>

      <Chart title="PM10 & PM2.5 Trends (daily)" minWidth={minWidth}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pmChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format('MM-DD')} minTickGap={48} />
            <YAxis label={{ value: 'ug/m3', angle: -90, position: 'insideLeft' }} width={78} />
            <Tooltip
              labelFormatter={(v) => `Date: ${v}`}
              formatter={(value, name) => [`${round0(value)} ug/m3`, name === 'pm25' ? 'PM2.5' : 'PM10']}
            />
            <Line type="monotone" dataKey="pm10" stroke="#7c3aed" strokeWidth={2} dot={false} name="PM10" />
            <Line type="monotone" dataKey="pm25" stroke="#db2777" strokeWidth={2} dot={false} name="PM2.5" />
          </LineChart>
        </ResponsiveContainer>
      </Chart>
    </div>
  );
}

