import dayjs from 'dayjs';

export function cToF(celsius) {
  return celsius * (9 / 5) + 32;
}

export function fToC(fahrenheit) {
  return (fahrenheit - 32) * (5 / 9);
}

export function round1(value) {
  return Math.round(value * 10) / 10;
}

export function round0(value) {
  return Math.round(value);
}

export function formatHourLabel(timeISO) {
  // Open-Meteo times are ISO strings when timezone=auto.
  return dayjs(timeISO).format('HH:mm');
}

export function formatLocalTime(timeISO) {
  return dayjs(timeISO).format('HH:mm');
}

export function formatLocalDate(timeISO) {
  return dayjs(timeISO).format('YYYY-MM-DD');
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function findNearestIndexByTime(sortedTimeISO, targetMs) {
  // Assumes sortedTimeISO is sorted ascending by time.
  if (!sortedTimeISO?.length) return -1;

  let lo = 0;
  let hi = sortedTimeISO.length - 1;

  const toMs = (iso) => dayjs(iso).valueOf();
  // Binary search for closest index.
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const midMs = toMs(sortedTimeISO[mid]);
    if (midMs === targetMs) return mid;
    if (midMs < targetMs) lo = mid + 1;
    else hi = mid - 1;
  }

  const left = hi;
  const right = lo;
  if (left < 0) return 0;
  if (right >= sortedTimeISO.length) return sortedTimeISO.length - 1;

  const leftMs = toMs(sortedTimeISO[left]);
  const rightMs = toMs(sortedTimeISO[right]);
  return Math.abs(leftMs - targetMs) <= Math.abs(rightMs - targetMs) ? left : right;
}

function hashToSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateHistoricalDailySeries({
  lat,
  lng,
  startDate,
  endDate,
}) {
  // Deterministic pseudo-random historical series (used only when API limits/requests fail).
  const start = dayjs(startDate).startOf('day');
  const end = dayjs(endDate).startOf('day');

  const days = end.diff(start, 'day') + 1;
  const dateList = Array.from({ length: Math.max(0, days) }, (_, i) =>
    start.add(i, 'day').format('YYYY-MM-DD'),
  );

  const seedBase = hashToSeed(`${lat.toFixed(3)},${lng.toFixed(3)}|${startDate}|${endDate}`);
  const rand = mulberry32(seedBase);

  const seasonalPhase = Math.sin((start.add(180, 'day').valueOf() / (1000 * 60 * 60 * 24)) * 0.02);

  const temperatureMinC = [];
  const temperatureMaxC = [];
  const precipitationTotalMm = [];
  const windSpeedKmh = [];
  const windDirectionDeg = [];
  const pm10UgM3 = [];
  const pm25UgM3 = [];

  for (let i = 0; i < dateList.length; i++) {
    const d = dayjs(dateList[i]);
    // Dayjs doesn't include `dayOfYear()` unless the plugin is installed.
    const dayOfYear = d.diff(d.startOf('year'), 'day') + 1;
    // Seasonality: northern hemisphere approximation.
    const season = Math.sin((dayOfYear / 365) * Math.PI * 2 - Math.PI / 2);
    const hemisphere = lat >= 0 ? 1 : -1;

    // Base temperature derived from latitude plus seasonality.
    const base = 28 - Math.abs(lat) * 0.35 + hemisphere * 10 * season;
    const noise = (rand() - 0.5) * 6;
    const mean = base + noise + seasonalPhase;

    const spread = 6 + rand() * 4;
    const minC = mean - spread / 2 - rand() * 2;
    const maxC = mean + spread / 2 + rand() * 2;

    // Precipitation: more likely with "wetness" factor correlated with season.
    const wetness = clamp(0.15 + (season + 1) / 2 * 0.6 + (rand() - 0.5) * 0.2, 0, 0.95);
    const rainChance = rand();
    const rain = rainChance < wetness ? (rand() * rand() * 45) : 0;

    // Wind: speed is related to "activity"; direction is random but stable-ish.
    const windBase = 10 + rand() * 25 + wetness * 10;
    const wind = windBase + (rand() - 0.5) * 8;
    const dir = ((rand() * 360) + windBase * 1.7) % 360;

    // PM: tends to be higher on drier days; precipitation helps washout.
    const washout = rain > 0 ? clamp(rain / 40, 0, 1) : 0;
    const pm25 = (8 + rand() * 28) * (1 - washout * 0.75);
    const pm10 = pm25 * (1.4 + rand() * 1.2);

    temperatureMinC.push(minC);
    temperatureMaxC.push(maxC);
    precipitationTotalMm.push(rain);
    windSpeedKmh.push(wind);
    windDirectionDeg.push(dir);
    pm10UgM3.push(pm10);
    pm25UgM3.push(pm25);
  }

  return {
    dateList,
    temperatureMinC,
    temperatureMaxC,
    precipitationTotalMm,
    windSpeedKmh,
    windDirectionDeg,
    pm10UgM3,
    pm25UgM3,
  };
}

