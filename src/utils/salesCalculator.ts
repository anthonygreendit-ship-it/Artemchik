/** Расчёт сценариев продаж для управленца */

export interface DealScenarioInput {
  dealCount: number;
  tonsPerDeal: number;
  marginPerKg: number;
  profitPerDeal: number | null;
  useProfitPerDeal: boolean;
  costPerKg: number;
  salePricePerKg: number | null;
}

export interface CycleScenarioInput {
  cycleMonths: number;
  marginDiscountPct: number;
  label: string;
}

export interface ScenarioResult {
  label: string;
  cycleMonths: number;
  marginPerKg: number;
  marginPct: number;
  kgTotal: number;
  revenuePerRound: number;
  profitPerRound: number;
  profitPerMonth: number;
  revenuePerMonth: number;
  roundsPerYear: number;
  annualProfit: number;
  annualRevenue: number;
  roiMonthlyPct: number | null;
  capitalInDeal: number;
}

export interface CalculatorOutput {
  slow: ScenarioResult;
  fast: ScenarioResult;
  dealsNeededForPlanProfit: number;
  dealsNeededForPlanRevenue: number;
  gapProfit: number;
  gapRevenue: number;
  recommendation: string;
}

export function calcDealProfit(input: DealScenarioInput, marginDiscountPct = 0): {
  kgTotal: number;
  marginPerKg: number;
  marginPct: number;
  revenue: number;
  profit: number;
  cost: number;
} {
  const kgTotal = input.dealCount * input.tonsPerDeal * 1000;
  let marginPerKg = input.marginPerKg * (1 - marginDiscountPct / 100);

  if (input.useProfitPerDeal && input.profitPerDeal != null && input.dealCount > 0) {
    const profit = input.profitPerDeal * input.dealCount;
    const cost = kgTotal * input.costPerKg;
    const revenue = cost + profit;
    marginPerKg = kgTotal > 0 ? profit / kgTotal : 0;
    return {
      kgTotal,
      marginPerKg,
      marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
      revenue,
      profit,
      cost,
    };
  }

  const cost = kgTotal * input.costPerKg;
  const profit = kgTotal * marginPerKg;
  const revenue = input.salePricePerKg
    ? kgTotal * input.salePricePerKg
    : cost + profit;

  return {
    kgTotal,
    marginPerKg,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    revenue,
    profit,
    cost,
  };
}

export function calcCycleScenario(
  deal: ReturnType<typeof calcDealProfit>,
  cycle: CycleScenarioInput,
  capitalOverride?: number,
): ScenarioResult {
  const roundsPerYear = 12 / cycle.cycleMonths;
  const profitPerMonth = deal.profit / cycle.cycleMonths;
  const revenuePerMonth = deal.revenue / cycle.cycleMonths;
  const capitalInDeal = capitalOverride ?? deal.cost;
  const roiMonthlyPct = capitalInDeal > 0 ? (profitPerMonth / capitalInDeal) * 100 : null;

  return {
    label: cycle.label,
    cycleMonths: cycle.cycleMonths,
    marginPerKg: deal.marginPerKg,
    marginPct: deal.marginPct,
    kgTotal: deal.kgTotal,
    revenuePerRound: deal.revenue,
    profitPerRound: deal.profit,
    profitPerMonth,
    revenuePerMonth,
    roundsPerYear,
    annualProfit: deal.profit * roundsPerYear,
    annualRevenue: deal.revenue * roundsPerYear,
    roiMonthlyPct,
    capitalInDeal,
  };
}

export function runCalculator(params: {
  deal: DealScenarioInput;
  slowCycleMonths: number;
  fastCycleMonths: number;
  fastMarginDiscountPct: number;
  gapProfit: number;
  gapRevenue: number;
  workingCapital?: number;
}): CalculatorOutput {
  const slowDeal = calcDealProfit(params.deal, 0);
  const fastDeal = calcDealProfit(params.deal, params.fastMarginDiscountPct);

  const slow = calcCycleScenario(slowDeal, {
    cycleMonths: params.slowCycleMonths,
    marginDiscountPct: 0,
    label: `Медленные клиенты (${params.slowCycleMonths} мес.)`,
  }, params.workingCapital);

  const fast = calcCycleScenario(fastDeal, {
    cycleMonths: params.fastCycleMonths,
    marginDiscountPct: params.fastMarginDiscountPct,
    label: `Быстрые клиенты (${params.fastCycleMonths} мес., −${params.fastMarginDiscountPct}% маржа)`,
  }, params.workingCapital);

  const dealsNeededForPlanProfit =
    slow.profitPerRound > 0 ? Math.ceil(params.gapProfit / slow.profitPerRound) : 0;
  const dealsNeededForPlanRevenue =
    slow.revenuePerRound > 0 ? Math.ceil(params.gapRevenue / slow.revenuePerRound) : 0;

  let recommendation = '';
  if (fast.profitPerMonth > slow.profitPerMonth) {
    const diff = ((fast.profitPerMonth - slow.profitPerMonth) / slow.profitPerMonth) * 100;
    recommendation = `Быстрый цикл выгоднее: +${diff.toFixed(0)}% прибыли в месяц, несмотря на скидку ${params.fastMarginDiscountPct}% к марже.`;
  } else {
    recommendation = `Медленный цикл даёт больше прибыли с одной сделки — имеет смысл, если клиент платит больше за кг.`;
  }

  if (params.gapProfit > 0) {
    recommendation += ` Чтобы закрыть gap по прибыли (~${(params.gapProfit / 1e6).toFixed(1)} млн), нужно ~${dealsNeededForPlanProfit} таких отгрузок (медленный сценарий).`;
  }

  return {
    slow,
    fast,
    dealsNeededForPlanProfit,
    dealsNeededForPlanRevenue,
    gapProfit: params.gapProfit,
    gapRevenue: params.gapRevenue,
    recommendation,
  };
}

export function avgFromHistory(
  deals: { qty: number; revenue: number; cost: number; margin: number }[],
) {
  if (!deals.length) {
    return { avgKg: 20000, avgMarginPct: 12, avgCostPerKg: 180, avgMarginPerKg: 22 };
  }
  const avgKg = deals.reduce((s, d) => s + d.qty, 0) / deals.length;
  const avgMarginPct = deals.reduce((s, d) => s + d.margin, 0) / deals.length;
  const totalCost = deals.reduce((s, d) => s + d.cost, 0);
  const totalKg = deals.reduce((s, d) => s + d.qty, 0);
  const avgCostPerKg = totalKg > 0 ? totalCost / totalKg : 180;
  const avgMarginPerKg = totalKg > 0 ? deals.reduce((s, d) => s + d.revenue - d.cost, 0) / totalKg : 10;
  return { avgKg, avgMarginPct, avgCostPerKg, avgMarginPerKg };
}

/** Сколько «машин» нужно при заданных параметрах */
export function trucksNeeded(
  gapAmount: number,
  tonsPerTruck: number,
  marginPerKg: number,
): number {
  const kg = tonsPerTruck * 1000;
  const profitPerTruck = kg * marginPerKg;
  if (profitPerTruck <= 0) return 0;
  return Math.ceil(gapAmount / profitPerTruck);
}
