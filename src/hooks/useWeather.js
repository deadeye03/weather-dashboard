import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { fetchAirQuality, fetchForecast } from '../utils/api';
import { simulateHistoricalDailySeries } from '../utils/helpers';

const LocationContext = createContext({
  coords: null,
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'denied' | 'error'
  error: null,
  requestLocation: () => {},
});

export function useLocation() {
  return useContext(LocationContext);
}

export function LocationProvider({ children }) {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const requestLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      setStatus('error');
      setError(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    setStatus('loading');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setStatus('ready');
      },
      (err) => {
        if (err?.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else {
          setStatus('error');
        }
        setError(err);
      },
      {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 60_000,
      },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const value = useMemo(
    () => ({
      coords,
      status,
      error,
      requestLocation,
    }),
    [coords, status, error, requestLocation],
  );

  return React.createElement(LocationContext.Provider, { value }, children);
}

export function useForecastQuery(coords) {
  return useQuery({
    queryKey: ['forecast', coords?.lat, coords?.lng],
    enabled: Boolean(coords),
    queryFn: async () => {
      return fetchForecast({ lat: coords.lat, lng: coords.lng, forecastDays: 1 });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function useAirQualityQuery(coords) {
  return useQuery({
    queryKey: ['air-quality', coords?.lat, coords?.lng],
    enabled: Boolean(coords),
    queryFn: async () => {
      return fetchAirQuality({ lat: coords.lat, lng: coords.lng });
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function circularMeanDeg(values) {
  if (!values?.length) return null;
  let sumSin = 0;
  let sumCos = 0;
  for (const v of values) {
    const rad = degToRad(v);
    sumSin += Math.sin(rad);
    sumCos += Math.cos(rad);
  }
  const mean = Math.atan2(sumSin, sumCos);
  const deg = (mean * 180) / Math.PI;
  return (deg + 360) % 360;
}

export function useHistoricalQuery(coords, dateFrom, dateTo) {
  const enabled = Boolean(coords) && Boolean(dateFrom) && Boolean(dateTo);

  const placeholder = useMemo(() => {
    if (!coords || !dateFrom || !dateTo) return null;
    return simulateHistoricalDailySeries({
      lat: coords.lat,
      lng: coords.lng,
      startDate: dateFrom,
      endDate: dateTo,
    });
  }, [coords, dateFrom, dateTo]);

  const rangeDays = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    return dayjs(dateTo).diff(dayjs(dateFrom), 'day') + 1;
  }, [dateFrom, dateTo]);

  return useQuery({
    queryKey: ['historical', coords?.lat, coords?.lng, dateFrom, dateTo],
    enabled,
    placeholderData: placeholder ?? undefined,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      if (!coords) throw new Error('Missing coordinates');
      if (!dateFrom || !dateTo) throw new Error('Missing date range');
      if (!placeholder) throw new Error('Missing placeholder');

      const safeResult = { ...placeholder };

      // Attempt to fetch real daily data. If API cannot serve the range, we keep simulation.
      try {
        const data = await fetchForecast({
          lat: coords.lat,
          lng: coords.lng,
          forecastDays: 7,
          startDate: dateFrom,
          endDate: dateTo,
        });

        const daily = data?.daily;
        if (daily?.time?.length) {
          const apiTime = daily.time;
          // Match by index if possible; otherwise, fall back per field.
          const min = daily.temperature_2m_min;
          const max = daily.temperature_2m_max;
          const precip = daily.precipitation_sum;

          if (min?.length === apiTime.length && max?.length === apiTime.length && precip?.length === apiTime.length) {
            safeResult.dateList = apiTime;
            safeResult.temperatureMinC = min;
            safeResult.temperatureMaxC = max;
            safeResult.precipitationTotalMm = precip;
          }

          // Wind aggregation (mean speed, circular mean direction) from hourly, when available.
          const hourlyTime = data?.hourly?.time;
          const windSpeed = data?.hourly?.windspeed_10m;
          const windDir = data?.hourly?.winddirection_10m;
          if (hourlyTime?.length && windSpeed?.length && windDir?.length && apiTime?.length) {
            // Avoid expensive aggregation on large ranges; simulation is faster.
            if (rangeDays <= 60) {
              const buckets = new Map();
              for (let i = 0; i < hourlyTime.length; i++) {
                const dayKey = dayjs(hourlyTime[i]).format('YYYY-MM-DD');
                if (!buckets.has(dayKey)) buckets.set(dayKey, { speeds: [], dirs: [] });
                buckets.get(dayKey).speeds.push(windSpeed[i]);
                buckets.get(dayKey).dirs.push(windDir[i]);
              }

              const resolvedSpeeds = [];
              const resolvedDirs = [];
              for (const d of apiTime) {
                const bucket = buckets.get(d);
                if (!bucket) {
                  // Keep placeholder.
                  const idx = placeholder.dateList.indexOf(d);
                  resolvedSpeeds.push(idx >= 0 ? placeholder.windSpeedKmh[idx] : null);
                  resolvedDirs.push(idx >= 0 ? placeholder.windDirectionDeg[idx] : null);
                  continue;
                }
                const speedMean = bucket.speeds.reduce((a, b) => a + b, 0) / bucket.speeds.length;
                const dirMean = circularMeanDeg(bucket.dirs);
                resolvedSpeeds.push(speedMean);
                resolvedDirs.push(dirMean);
              }
              safeResult.windSpeedKmh = resolvedSpeeds;
              safeResult.windDirectionDeg = resolvedDirs;
            }
          }
        }
      } catch {
        // Keep simulation
      }

      // Attempt air-quality PM series only for smaller ranges.
      if (rangeDays > 0 && rangeDays <= 30) {
        try {
          const aq = await fetchAirQuality({ lat: coords.lat, lng: coords.lng, startDate: dateFrom, endDate: dateTo });
          const aqTime = aq?.hourly?.time;
          const pm10 = aq?.hourly?.pm10;
          const pm25 = aq?.hourly?.pm2_5;

          if (aqTime?.length && pm10?.length && pm25?.length) {
            const buckets = new Map();
            for (let i = 0; i < aqTime.length; i++) {
              const dayKey = dayjs(aqTime[i]).format('YYYY-MM-DD');
              if (!buckets.has(dayKey)) buckets.set(dayKey, { pm10: [], pm25: [] });
              buckets.get(dayKey).pm10.push(pm10[i]);
              buckets.get(dayKey).pm25.push(pm25[i]);
            }
            const resolvedPm10 = [];
            const resolvedPm25 = [];
            for (const d of safeResult.dateList) {
              const bucket = buckets.get(d);
              if (!bucket) {
                const idx = placeholder.dateList.indexOf(d);
                resolvedPm10.push(idx >= 0 ? placeholder.pm10UgM3[idx] : null);
                resolvedPm25.push(idx >= 0 ? placeholder.pm25UgM3[idx] : null);
                continue;
              }
              const pm10Mean = bucket.pm10.reduce((a, b) => a + b, 0) / bucket.pm10.length;
              const pm25Mean = bucket.pm25.reduce((a, b) => a + b, 0) / bucket.pm25.length;
              resolvedPm10.push(pm10Mean);
              resolvedPm25.push(pm25Mean);
            }
            safeResult.pm10UgM3 = resolvedPm10;
            safeResult.pm25UgM3 = resolvedPm25;
          }
        } catch {
          // Keep simulation
        }
      }

      return safeResult;
    },
  });
}

