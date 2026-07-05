import type { InventoryItem } from '../types';

export const STORAGE_RATE_PER_KG_DAY = 4.5;

const BERRY_GROUPS = ['Малина', 'Черника', 'Клубника', 'Ежевика', 'Брусника', 'Клюква', 'Вишня', 'Голубика', 'Облепиха', 'Брокколи', 'Прочее'];

const GROUP_PRICE_DEFAULTS: Record<string, { catalog: number; quick: number }> = {
  Ежевика: { catalog: 80, quick: 50 },
  Клубника: { catalog: 95, quick: 60 },
  Малина: { catalog: 120, quick: 75 },
  Черника: { catalog: 110, quick: 70 },
  Клюква: { catalog: 100, quick: 65 },
  Вишня: { catalog: 90, quick: 55 },
  Брусника: { catalog: 130, quick: 80 },
  Голубика: { catalog: 140, quick: 85 },
  Облепиха: { catalog: 70, quick: 45 },
  Брокколи: { catalog: 60, quick: 40 },
  Прочее: { catalog: 80, quick: 50 },
};

export function detectBerryGroup(name: string): string {
  const n = name.toLowerCase();
  for (const g of BERRY_GROUPS) {
    if (g !== 'Прочее' && n.includes(g.toLowerCase())) return g;
  }
  if (n.includes('брокколи') || n.includes('капуст')) return 'Брокколи';
  return 'Прочее';
}

export interface WarehouseEconomics {
  group: string;
  costPerKg: number;
  storagePaidPerKg: number;
  storageRatePerKgDay: number;
  daysOnStock: number;
  catalogPricePerKg: number;
  quickSalePricePerKg: number;
  marginAtQuickSalePerKg: number;
  marginAtQuickSaleTotal: number;
  profitabilityReservePerKg: number;
  profitabilityReserveTotal: number;
  daysUntilStorageExceedsCost: number;
  storageAlreadyExceedsCost: boolean;
  daysUntilUnprofitable: number | null;
}

function costPerKg(item: Pick<InventoryItem, 'costPerKg' | 'costTotal' | 'qty'>): number {
  if (item.costPerKg && item.costPerKg > 0 && item.costPerKg < 5000) return item.costPerKg;
  return item.qty > 0 ? item.costTotal / item.qty : 0;
}

function looksLikeTotal(value: number, qty: number, cost: number): boolean {
  return value > Math.max(500, cost * qty * 0.25);
}

function looksLikePerKg(value: number, cost: number): boolean {
  return value >= Math.max(20, cost * 0.4) && value <= 2000;
}

export function resolveCatalogPricePerKg(
  item: Pick<InventoryItem, 'marketPrice' | 'marketTotal' | 'qty' | 'costPerKg' | 'costTotal' | 'product'>,
  group?: string,
): number {
  const qty = item.qty || 1;
  const cost = costPerKg(item);
  const g = group ?? detectBerryGroup(item.product);
  const defaults = GROUP_PRICE_DEFAULTS[g] ?? GROUP_PRICE_DEFAULTS.Прочее;
  const candidates: number[] = [];

  for (const raw of [item.marketPrice, item.marketTotal]) {
    if (raw == null || raw <= 0) continue;
    if (looksLikePerKg(raw, cost)) candidates.push(raw);
    else if (looksLikeTotal(raw, qty, cost)) candidates.push(raw / qty);
  }

  const valid = candidates.filter((p) => p >= cost * 0.5 && p <= 5000);
  if (valid.length) return Math.round(Math.max(...valid) * 100) / 100;
  return defaults.catalog;
}

export function resolveQuickSalePricePerKg(catalogPricePerKg: number, group: string): number {
  const defaults = GROUP_PRICE_DEFAULTS[group] ?? GROUP_PRICE_DEFAULTS.Прочее;
  const ratio = defaults.quick / defaults.catalog;
  return Math.round(catalogPricePerKg * ratio * 10) / 10;
}

export function computeWarehouseEconomics(
  item: Pick<InventoryItem, 'product' | 'qty' | 'costPerKg' | 'costTotal' | 'marketPrice' | 'marketTotal' | 'daysOnStock'>,
  daysOnStock = item.daysOnStock ?? 0,
): WarehouseEconomics {
  const group = detectBerryGroup(item.product);
  const cost = costPerKg(item);
  const storagePaidPerKg = daysOnStock * STORAGE_RATE_PER_KG_DAY;
  const catalogPricePerKg = resolveCatalogPricePerKg(item, group);
  const quickSalePricePerKg = resolveQuickSalePricePerKg(catalogPricePerKg, group);
  const marginAtQuickSalePerKg = quickSalePricePerKg - cost - storagePaidPerKg;
  const qty = item.qty || 0;

  const storageAlreadyExceedsCost = storagePaidPerKg >= cost;
  const daysUntilStorageExceedsCost = storageAlreadyExceedsCost
    ? 0
    : Math.ceil((cost - storagePaidPerKg) / STORAGE_RATE_PER_KG_DAY);

  const daysUntilUnprofitable =
    marginAtQuickSalePerKg <= 0
      ? 0
      : Math.floor(marginAtQuickSalePerKg / STORAGE_RATE_PER_KG_DAY);

  return {
    group,
    costPerKg: cost,
    storagePaidPerKg,
    storageRatePerKgDay: STORAGE_RATE_PER_KG_DAY,
    daysOnStock,
    catalogPricePerKg,
    quickSalePricePerKg,
    marginAtQuickSalePerKg,
    marginAtQuickSaleTotal: marginAtQuickSalePerKg * qty,
    profitabilityReservePerKg: marginAtQuickSalePerKg,
    profitabilityReserveTotal: marginAtQuickSalePerKg * qty,
    daysUntilStorageExceedsCost,
    storageAlreadyExceedsCost,
    daysUntilUnprofitable,
  };
}

export function formatReserveDays(econ: Pick<WarehouseEconomics, 'storageAlreadyExceedsCost' | 'daysUntilStorageExceedsCost'>): string {
  if (econ.storageAlreadyExceedsCost) return 'хранение ≥ себест.';
  if (econ.daysUntilStorageExceedsCost <= 0) return 'сегодня';
  return `ещё ${econ.daysUntilStorageExceedsCost} дн.`;
}
