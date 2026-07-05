/** Финансовая модель калькулятора: постоянные расходы, налоги, автоплан */

import {
  avgFromHistory,
  calcCycleScenario,
  calcDealProfit,
  type DealScenarioInput,
} from './salesCalculator';

export interface FixedCostsInput {
  salaries: number;
  credit: number;
  rent: number;
  logistics: number;
  other: number;
  /** Рост/изменение расходов каждые 3 месяца, % */
  quarterChangePct: number;
}

export interface MonthContext {
  monthIndex: number; // 1-12
  monthLabel: string;
  isTaxMonth: boolean;
  cashOnAccounts: number;
  expectedInflows: number;
  projectedRevenue: number;
}

export interface MonthlyBreakdown {
  monthLabel: string;
  monthIndex: number;
  fixedCosts: number;
  tax: number;
  totalOutflow: number;
  cashAvailable: number;
  inflows: number;
  needFromSales: number;
  dealsNeeded: number;
  isTaxMonth: boolean;
}

export interface MixedPlanSuggestion {
  id: string;
  title: string;
  summary: string;
  fastClientPct: number;
  slowClientPct: number;
  dealsPerMonth: number;
  tonsPerDeal: number;
  trucksLabel: string;
  marginPerKg: number;
  cycleMonths: number;
  profitPerRound: number;
  profitPerMonth: number;
  revenuePerMonth: number;
  coversFixed: boolean;
  closesGap: boolean;
  score: number;
  recommendation: string;
}

const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

export function totalFixedCosts(f: FixedCostsInput, monthIndex: number): number {
  const base = f.salaries + f.credit + f.rent + f.logistics + f.other;
  const quarter = Math.floor((monthIndex - 1) / 3);
  const multiplier = 1 + (f.quarterChangePct / 100) * quarter;
  return Math.round(base * multiplier);
}

/** Налоговые месяцы: конец квартала (мар, июн, сен, дек) */
export function isTaxMonth(monthIndex: number): boolean {
  return monthIndex % 3 === 0;
}

export function estimateTax(
  monthIndex: number,
  projectedMonthlyProfit: number,
  taxRatePct: number,
  fixedTaxQuarter: number,
): number {
  if (!isTaxMonth(monthIndex)) return 0;
  const fromProfit = Math.max(0, projectedMonthlyProfit * 3) * (taxRatePct / 100);
  return Math.round(Math.max(fixedTaxQuarter, fromProfit));
}

export function buildMonthlyBreakdown(params: {
  fixed: FixedCostsInput;
  startMonth: number;
  monthsCount: number;
  cashOnAccounts: number;
  inflowsPerMonth: number;
  taxRatePct: number;
  fixedTaxQuarter: number;
  projectedMonthlyProfit: number;
  profitPerDeal: number;
  gapProfit: number;
}): MonthlyBreakdown[] {
  const rows: MonthlyBreakdown[] = [];
  let remainingGap = params.gapProfit;

  for (let i = 0; i < params.monthsCount; i++) {
    const monthIndex = ((params.startMonth - 1 + i) % 12) + 1;
    const fixed = totalFixedCosts(params.fixed, monthIndex);
    const tax = estimateTax(monthIndex, params.projectedMonthlyProfit, params.taxRatePct, params.fixedTaxQuarter);
    const totalOutflow = fixed + tax;
    const cashAvailable = params.cashOnAccounts;
    const inflows = params.inflowsPerMonth;
    const monthGap = i === 0 ? remainingGap : 0;
    const needFromSales = Math.max(0, totalOutflow + monthGap - cashAvailable - inflows);
    const dealsNeeded = params.profitPerDeal > 0 ? Math.ceil(needFromSales / params.profitPerDeal) : 0;

    rows.push({
      monthLabel: MONTHS_RU[monthIndex - 1],
      monthIndex,
      fixedCosts: fixed,
      tax,
      totalOutflow,
      cashAvailable,
      inflows,
      needFromSales,
      dealsNeeded,
      isTaxMonth: isTaxMonth(monthIndex),
    });
  }
  return rows;
}

function mixedProfit(params: {
  deals: number;
  tons: number;
  marginPerKg: number;
  costPerKg: number;
  fastPct: number;
  slowMonths: number;
  fastMonths: number;
  fastDiscount: number;
}): { profitPerRound: number; profitPerMonth: number; revenuePerMonth: number; cycle: number; margin: number } {
  const slowWeight = 1 - params.fastPct / 100;
  const fastWeight = params.fastPct / 100;
  const slowMargin = params.marginPerKg;
  const fastMargin = params.marginPerKg * (1 - params.fastDiscount / 100);
  const blendedMargin = slowMargin * slowWeight + fastMargin * fastWeight;
  const blendedCycle = params.slowMonths * slowWeight + params.fastMonths * fastWeight;

  const deal: DealScenarioInput = {
    dealCount: params.deals,
    tonsPerDeal: params.tons,
    marginPerKg: blendedMargin,
    profitPerDeal: null,
    useProfitPerDeal: false,
    costPerKg: params.costPerKg,
    salePricePerKg: null,
  };
  const d = calcDealProfit(deal, 0);
  const cycle = calcCycleScenario(d, {
    cycleMonths: blendedCycle,
    marginDiscountPct: 0,
    label: '',
  });

  return {
    profitPerRound: d.profit,
    profitPerMonth: cycle.profitPerMonth,
    revenuePerMonth: cycle.revenuePerMonth,
    cycle: blendedCycle,
    margin: blendedMargin,
  };
}

export function suggestMixedPlans(params: {
  fixed: FixedCostsInput;
  monthIndex: number;
  cashOnAccounts: number;
  inflowsPerMonth: number;
  taxRatePct: number;
  fixedTaxQuarter: number;
  gapProfit: number;
  gapRevenue: number;
  slowMonths: number;
  fastMonths: number;
  fastDiscount: number;
  history: ReturnType<typeof avgFromHistory>;
}): MixedPlanSuggestion[] {
  const fixedThisMonth = totalFixedCosts(params.fixed, params.monthIndex);
  const tax = estimateTax(params.monthIndex, params.gapProfit / 3, params.taxRatePct, params.fixedTaxQuarter);
  const totalNeed = fixedThisMonth + tax + params.gapProfit - params.cashOnAccounts - params.inflowsPerMonth;

  const tonsOptions = [15, 20, 25];
  const fastPcts = [30, 50, 70];
  const dealCounts = [1, 2, 3, 4, 5];
  const marginBase = Math.max(5, params.history.avgMarginPerKg);

  const suggestions: MixedPlanSuggestion[] = [];

  const templates = [
    { id: 'balanced', title: 'Сбалансированный микс', fastPct: 50, tons: 20, deals: 2, marginAdj: 0 },
    { id: 'turnover', title: 'Быстрая оборачиваемость', fastPct: 70, tons: 20, deals: 3, marginAdj: -1 },
    { id: 'margin', title: 'Максимум маржи', fastPct: 20, tons: 18, deals: 2, marginAdj: 3 },
    { id: 'volume', title: 'Объём + быстрые клиенты', fastPct: 60, tons: 25, deals: 4, marginAdj: -2 },
    { id: 'minimum', title: 'Минимум сделок', fastPct: 40, tons: 20, deals: 1, marginAdj: 2 },
  ];

  for (const t of templates) {
    const margin = marginBase + t.marginAdj;
    const mix = mixedProfit({
      deals: t.deals,
      tons: t.tons,
      marginPerKg: margin,
      costPerKg: params.history.avgCostPerKg,
      fastPct: t.fastPct,
      slowMonths: params.slowMonths,
      fastMonths: params.fastMonths,
      fastDiscount: params.fastDiscount,
    });

    const dealsToCover = mix.profitPerRound > 0 ? Math.ceil(totalNeed / mix.profitPerRound) : 99;
    const coversFixed = mix.profitPerMonth >= fixedThisMonth + tax / (params.fastMonths || 1);
    const closesGap = mix.profitPerMonth * (params.fastMonths || 1) >= totalNeed;

    let score = 0;
    if (coversFixed) score += 40;
    if (closesGap) score += 40;
    score += t.fastPct * 0.1;
    score -= dealsToCover * 2;

    const slowPct = 100 - t.fastPct;
    suggestions.push({
      id: t.id,
      title: t.title,
      summary: `${t.deals} маш. × ${t.tons}т · ${slowPct}% медл. / ${t.fastPct}% быстр.`,
      fastClientPct: t.fastPct,
      slowClientPct: slowPct,
      dealsPerMonth: Math.max(t.deals, dealsToCover),
      tonsPerDeal: t.tons,
      trucksLabel: `${Math.max(t.deals, dealsToCover)} маш × ${t.tons} т`,
      marginPerKg: margin,
      cycleMonths: Math.round(mix.cycle * 10) / 10,
      profitPerRound: mix.profitPerRound,
      profitPerMonth: mix.profitPerMonth,
      revenuePerMonth: mix.revenuePerMonth,
      coversFixed,
      closesGap,
      score,
      recommendation: buildPlanText(t.title, t.fastPct, slowPct, Math.max(t.deals, dealsToCover), t.tons, margin, mix.cycle, totalNeed, coversFixed, closesGap),
    });
  }

  // Grid search top variants
  for (const fastPct of fastPcts) {
    for (const tons of tonsOptions) {
      for (const deals of dealCounts) {
        const mix = mixedProfit({
          deals,
          tons,
          marginPerKg: marginBase,
          costPerKg: params.history.avgCostPerKg,
          fastPct,
          slowMonths: params.slowMonths,
          fastMonths: params.fastMonths,
          fastDiscount: params.fastDiscount,
        });
        if (mix.profitPerRound <= 0) continue;
        const needed = Math.ceil(totalNeed / mix.profitPerRound);
        if (needed > 8) continue;
        const coversFixed = mix.profitPerMonth >= (fixedThisMonth + tax) / mix.cycle;
        const closesGap = needed <= deals * 2;
        if (!coversFixed && !closesGap) continue;

        suggestions.push({
          id: `auto-${fastPct}-${tons}-${deals}`,
          title: `Вариант ${deals}×${tons}т / ${fastPct}% быстр.`,
          summary: `Нужно ~${needed} машин × ${tons} т · маржа ${marginBase.toFixed(0)} ₽/кг`,
          fastClientPct: fastPct,
          slowClientPct: 100 - fastPct,
          dealsPerMonth: needed,
          tonsPerDeal: tons,
          trucksLabel: `${needed} маш × ${tons} т`,
          marginPerKg: marginBase,
          cycleMonths: mix.cycle,
          profitPerRound: mix.profitPerRound,
          profitPerMonth: mix.profitPerMonth,
          revenuePerMonth: mix.revenuePerMonth,
          coversFixed,
          closesGap,
          score: (coversFixed ? 30 : 0) + (closesGap ? 35 : 0) + (100 - needed * 5),
          recommendation: buildPlanText('Авто', fastPct, 100 - fastPct, needed, tons, marginBase, mix.cycle, totalNeed, coversFixed, closesGap),
        });
      }
    }
  }

  return suggestions
    .sort((a, b) => b.score - a.score)
    .filter((s, i, arr) => arr.findIndex((x) => x.title === s.title) === i)
    .slice(0, 6);
}

function buildPlanText(
  name: string,
  fastPct: number,
  slowPct: number,
  deals: number,
  tons: number,
  margin: number,
  cycle: number,
  need: number,
  coversFixed: boolean,
  closesGap: boolean,
): string {
  const parts = [
    `${name}: ${deals} отгрузок по ${tons} т, маржа ~${margin.toFixed(0)} ₽/кг.`,
    `Клиенты: ${slowPct}% с циклом ~2 мес, ${fastPct}% быстрее (−3% к марже).`,
    `Средний цикл денег ~${cycle.toFixed(1)} мес.`,
  ];
  if (coversFixed) parts.push('Покрывает постоянные расходы и налоги.');
  else parts.push('⚠ Может не хватить на постоянные расходы — добавьте отгрузки или ускорьте сбор дебиторки.');
  if (closesGap) parts.push('Закрывает gap по плану продаж.');
  else if (need > 0) parts.push(`Нужно ещё ~${(need / 1e6).toFixed(1)} млн прибыли от сделок.`);
  return parts.join(' ');
}

export const DEFAULT_FIXED: FixedCostsInput = {
  salaries: 1_900_000,
  credit: 3_500_000,
  rent: 350_000,
  logistics: 200_000,
  other: 2_050_000,
  quarterChangePct: 0,
};

export function fixedCostsTotal(f: FixedCostsInput): number {
  return f.salaries + f.credit + f.rent + f.logistics + f.other;
}
