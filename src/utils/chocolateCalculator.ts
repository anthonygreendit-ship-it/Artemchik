import type { ChocolateData, ChocolateProduct } from '../types';

export interface ChocolateProductionInput {
  packsPerShift: number;
  shiftsPerDay: number;
  shipPacksToday: number;
  sellPricePerPack: number;
  selectedProductIndex: number;
}

export interface CostBreakdown {
  berryRub: number;
  chocolate1Rub: number;
  chocolate2Rub: number;
  wasteRub: number;
  packagingRub: number;
  laborRub: number;
  rentRub: number;
  totalRub: number;
  packWeightKg: number;
  profitPerPack: number;
  marginPct: number;
  markupPct: number;
}

export interface ChocolateProductionResult {
  producedPerShift: number;
  producedToday: number;
  shippedToday: number;
  stockAfterShip: number;
  costPerPack: number;
  revenueToday: number;
  profitToday: number;
  profitPerPack: number;
  marginPct: number;
  markupPct: number;
  rawNeededKg: number;
  rawToBuyKg: number;
  rawStockKg: number;
  breakdown: CostBreakdown;
}

const DEFAULT_PACK_KG = 0.15;

function packWeightKg(product: ChocolateProduct): number {
  if (product.packWeightKg && product.packWeightKg > 0) return product.packWeightKg;
  if (product.costPerPackRub && product.costPerKgRub && product.costPerKgRub > 0) {
    return product.costPerPackRub / product.costPerKgRub;
  }
  return DEFAULT_PACK_KG;
}

/** Себестоимость и разбивка — как в Excel (₽/уп из кол. «с\С 1 уп») */
export function productCostBreakdown(product: ChocolateProduct, sellPrice = 0): CostBreakdown {
  const w = packWeightKg(product);
  const berryRub = (product.berryPfPricePerKg ?? 0) * w;
  const chocolate1Rub = (product.chocolateCost1Coat ?? 0) * w;
  const chocolate2Rub = (product.chocolateCost2Coat ?? 0) * w;
  const wasteRub = (product.wastePerKgRub ?? 0) * w;
  const packagingRub = (product.packagingPerKgRub ?? 0) * w;
  const laborRub = (product.laborPerKgRub ?? 0) * w;
  const rentRub = (product.rentPerKgRub ?? 0) * w;

  const summed = berryRub + chocolate1Rub + chocolate2Rub + wasteRub + packagingRub + laborRub + rentRub;
  const totalRub = product.costPerPackRub ?? summed;

  const sell = sellPrice || product.sellPricePerPackRub || 0;
  const profitPerPack = sell - totalRub;
  const marginPct = sell > 0 ? (profitPerPack / sell) * 100 : 0;
  const markupPct = totalRub > 0 ? (profitPerPack / totalRub) * 100 : 0;

  return {
    berryRub,
    chocolate1Rub,
    chocolate2Rub,
    wasteRub,
    packagingRub,
    laborRub,
    rentRub,
    totalRub,
    packWeightKg: w,
    profitPerPack,
    marginPct,
    markupPct,
  };
}

export function productCostPerPack(product: ChocolateProduct): number {
  return product.costPerPackRub ?? productCostBreakdown(product).totalRub;
}

export function defaultSellPrice(product: ChocolateProduct): number {
  return product.sellPricePerPackRub ?? productCostPerPack(product) * 2;
}

function berryKgPerPack(product: ChocolateProduct, w: number): number {
  if (product.rawKgPerPack && product.rawKgPerPack > 0) {
    return product.rawKgPerPack / 1000;
  }
  if (product.berryPfPricePerKg && product.rawPricePerKg && product.rawPricePerKg > 0) {
    return (product.berryPfPricePerKg / product.rawPricePerKg) * w;
  }
  return w * 0.4;
}

export function calcChocolateProduction(
  data: ChocolateData,
  input: ChocolateProductionInput,
): ChocolateProductionResult {
  const product = data.products[input.selectedProductIndex] ?? data.products[0];
  const producedPerShift = input.packsPerShift;
  const producedToday = producedPerShift * input.shiftsPerDay;
  const shippedToday = input.shipPacksToday;
  const stockAfterShip = Math.max(0, producedToday - shippedToday);
  const breakdown = productCostBreakdown(product, input.sellPricePerPack);
  const costPerPack = breakdown.totalRub;
  const revenueToday = shippedToday * input.sellPricePerPack;
  const profitToday = revenueToday - shippedToday * costPerPack;

  const rawPerPackKg = berryKgPerPack(product, breakdown.packWeightKg);
  const rawNeededKg = producedToday * rawPerPackKg;
  const rawStockKg = totalRawStockKg(data);
  const rawToBuyKg = Math.max(0, rawNeededKg - rawStockKg);

  return {
    producedPerShift,
    producedToday,
    shippedToday,
    stockAfterShip,
    costPerPack,
    revenueToday,
    profitToday,
    profitPerPack: breakdown.profitPerPack,
    marginPct: breakdown.marginPct,
    markupPct: breakdown.markupPct,
    rawNeededKg,
    rawToBuyKg,
    rawStockKg,
    breakdown,
  };
}

export function totalPurchaseSpent(data: ChocolateData): number {
  return data.purchases.reduce((s, p) => s + (p.spentRub ?? 0), 0);
}

export function totalRawStockKg(data: ChocolateData): number {
  const fromPurchases = data.purchases.reduce((s, p) => s + (p.readyRawKg ?? 0), 0);
  return fromPurchases > 0 ? fromPurchases : 4000;
}
