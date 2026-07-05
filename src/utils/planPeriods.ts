/** Конвертация планов между периодами */

export type PlanPeriod = 'day' | 'week' | 'month' | 'quarter';

export interface PlanTargets {
  profit: number;
  revenue: number;
  kg: number;
  deals: number;
}

export const PERIOD_LABELS: Record<PlanPeriod, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
  quarter: 'Квартал',
};

export const PERIOD_HINTS: Record<PlanPeriod, string> = {
  day: 'Рабочий день (22 дня в месяце)',
  week: 'Календарная неделя',
  month: 'Календарный месяц',
  quarter: '3 месяца + налоги в конце',
};

const WORK_DAYS = 22;
const WEEKS_IN_MONTH = 4.33;
const MONTHS_IN_QUARTER = 3;

/** Сколько «единиц периода» в месяце */
function periodsInMonth(p: PlanPeriod): number {
  if (p === 'day') return WORK_DAYS;
  if (p === 'week') return WEEKS_IN_MONTH;
  if (p === 'month') return 1;
  return 1 / MONTHS_IN_QUARTER;
}

/** Конвертировать значение из выбранного периода в месячное */
export function toMonthly(value: number, from: PlanPeriod): number {
  return value * periodsInMonth(from);
}

/** Конвертировать месячное значение в целевой период */
export function fromMonthly(monthly: number, to: PlanPeriod): number {
  const n = periodsInMonth(to);
  return n > 0 ? monthly / n : monthly;
}

export function spreadPlan(input: PlanTargets, editedPeriod: PlanPeriod): Record<PlanPeriod, PlanTargets> {
  const monthly: PlanTargets = {
    profit: toMonthly(input.profit, editedPeriod),
    revenue: toMonthly(input.revenue, editedPeriod),
    kg: toMonthly(input.kg, editedPeriod),
    deals: toMonthly(input.deals, editedPeriod),
  };

  const periods: PlanPeriod[] = ['day', 'week', 'month', 'quarter'];
  const result = {} as Record<PlanPeriod, PlanTargets>;

  for (const p of periods) {
    result[p] = {
      profit: fromMonthly(monthly.profit, p),
      revenue: fromMonthly(monthly.revenue, p),
      kg: fromMonthly(monthly.kg, p),
      deals: fromMonthly(monthly.deals, p),
    };
  }
  return result;
}

export function spreadFixedCosts(monthlyFixed: number): Record<PlanPeriod, number> {
  return {
    day: monthlyFixed / WORK_DAYS,
    week: monthlyFixed / WEEKS_IN_MONTH,
    month: monthlyFixed,
    quarter: monthlyFixed * MONTHS_IN_QUARTER,
  };
}

/** Сколько нужно заработать (прибыль от продаж) = план прибыли + расходы − поступления (упрощённо) */
export function needFromSales(
  planProfit: number,
  fixedCosts: number,
  inflows: number,
  cashBuffer = 0,
): number {
  return Math.max(0, planProfit + fixedCosts - inflows - cashBuffer);
}

export function trucksInPeriod(
  needProfit: number,
  tonsPerTruck: number,
  marginPerKg: number,
  _period: PlanPeriod,
): number {
  const profitPerTruck = tonsPerTruck * 1000 * marginPerKg;
  if (profitPerTruck <= 0) return 0;
  return Math.ceil(needProfit / profitPerTruck);
}

export function marginPct(profit: number, revenue: number): number {
  return revenue > 0 ? (profit / revenue) * 100 : 0;
}
