import { spreadFixedCosts, needFromSales } from './planPeriods';

/** Постоянные расходы цеха (аренда ~700k + ФОТ ~1.5M + прочее) */
export const CHOCOLATE_FIXED_MONTHLY = 2_500_000;

export function chocolateFixedByPeriod() {
  return spreadFixedCosts(CHOCOLATE_FIXED_MONTHLY);
}

/** Сколько смен производства нужно, чтобы закрыть прибыль */
export function shiftsInPeriod(
  needProfit: number,
  packsPerShift: number,
  profitPerPack: number,
  lines: number,
): number {
  const perShift = packsPerShift * profitPerPack * Math.max(1, lines);
  if (perShift <= 0) return 0;
  return Math.ceil(needProfit / perShift);
}

/** Сколько упаковок нужно отгрузить */
export function packsForProfit(needProfit: number, profitPerPack: number): number {
  if (profitPerPack <= 0) return 0;
  return Math.ceil(needProfit / profitPerPack);
}

export { needFromSales };
