import type { FxRateSnapshot } from '../types';

const SNAPSHOT_KEY = 'upravlenka-fx-current';
const PREVIOUS_KEY = 'upravlenka-fx-previous';

/** Официальный курс ЦБ РФ (JSON-зеркало cbr-xml-daily.ru) */
export async function fetchCbrUsdRate(): Promise<FxRateSnapshot> {
  const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
  if (!res.ok) throw new Error('Не удалось загрузить курс ЦБ');
  const data = await res.json();
  const usd = data.Valute?.USD;
  if (!usd) throw new Error('USD не найден в ответе ЦБ');
  const eur = data.Valute?.EUR;
  return {
    usdRub: Math.round((usd.Value / usd.Nominal) * 10000) / 10000,
    eurRub: eur ? Math.round((eur.Value / eur.Nominal) * 10000) / 10000 : undefined,
    fetchedAt: String(data.Date ?? new Date().toISOString().slice(0, 10)),
    source: 'cbr',
  };
}

export function loadStoredFxSnapshot(): FxRateSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadPreviousFxSnapshot(): FxRateSnapshot | null {
  try {
    const raw = localStorage.getItem(PREVIOUS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistFxSnapshot(rate: FxRateSnapshot): FxRateSnapshot | null {
  const prev = loadStoredFxSnapshot();
  if (prev && prev.fetchedAt !== rate.fetchedAt) {
    localStorage.setItem(PREVIOUS_KEY, JSON.stringify(prev));
  } else if (!prev) {
    localStorage.setItem(PREVIOUS_KEY, JSON.stringify(rate));
  }
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(rate));
  return loadPreviousFxSnapshot();
}

/** Загрузить с ЦБ или вернуть кэш при ошибке сети */
export async function loadExchangeRates(): Promise<{ current: FxRateSnapshot; previous: FxRateSnapshot | null }> {
  try {
    const current = await fetchCbrUsdRate();
    const previous = persistFxSnapshot(current);
    return { current, previous: previous && previous.fetchedAt !== current.fetchedAt ? previous : loadPreviousFxSnapshot() };
  } catch {
    const cached = loadStoredFxSnapshot();
    if (cached) {
      return { current: cached, previous: loadPreviousFxSnapshot() };
    }
    const fallback: FxRateSnapshot = { usdRub: 92.5, fetchedAt: new Date().toISOString().slice(0, 10), source: 'cbr' };
    return { current: fallback, previous: null };
  }
}
