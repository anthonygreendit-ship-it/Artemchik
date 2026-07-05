import type {
  BaseDashboardData,
  BerryGroupStock,
  DashboardData,
  DealHistoryRow,
  FundingGap,
  Insight,
  PayableItem,
  RoiMetrics,
  SalesPlan,
  TurnoverMetrics,
} from '../types';
import { buildClientPaymentTimeline } from '../utils/receivableClient';
import { computeWarehouseEconomics, detectBerryGroup, STORAGE_RATE_PER_KG_DAY } from '../utils/warehouseEconomics';

function detectGroup(name: string): string {
  return detectBerryGroup(name);
}

function parseDate(s: string): Date {
  return new Date(s + 'T12:00:00');
}

function addDays(d: Date, n: number): string {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r.toISOString().slice(0, 10);
}

function sumPayablesInRange(items: PayableItem[], from: string, to: string): number {
  return items
    .filter((p) => p.date >= from && p.date <= to)
    .reduce((s, p) => s + p.amount, 0);
}

function sumInflowsInRange(items: { date: string; amount: number }[], from: string, to: string): number {
  return items
    .filter((p) => p.date >= from && p.date <= to)
    .reduce((s, p) => s + p.amount, 0);
}

function generateDealHistory(base: BaseDashboardData): DealHistoryRow[] {
  const reportDate = base.kpi.reportDate;
  const clients = base.receivables
    .filter((r) => r.total > 100000 && !r.client.includes('Итог') && !r.client.includes('1С'))
    .map((r) => r.client);
  const products = base.inventory
    .filter((i) => i.qty > 50 && i.costPerKg)
    .slice(0, 15)
    .map((i) => ({ name: i.product.slice(0, 40), group: detectGroup(i.product) }));

  if (products.length === 0) {
    products.push({ name: 'Малина 10 кг Китай', group: 'Малина' });
    products.push({ name: 'Черника 10 кг QB-39', group: 'Черника' });
  }

  const rows: DealHistoryRow[] = [];
  const end = parseDate(reportDate);
  let id = 0;

  for (let d = 0; d < 45; d++) {
    const date = addDays(end, -d);
    const dayOfWeek = parseDate(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dealsPerDay = 2 + (d % 4);
    const weekIndex = Math.floor(d / 7);
    const baseMargin = weekIndex === 0 ? 9.2 + (d % 3) : weekIndex === 1 ? 13.5 : 11 + (d % 5);

    for (let i = 0; i < dealsPerDay; i++) {
      const client = clients[(d + i) % clients.length] ?? 'Клиент';
      const prod = products[(d + i) % products.length];
      const qty = 500 + ((d * 137 + i * 89) % 8000);
      const margin = Math.max(4, baseMargin + ((i % 3) - 1) * 2.5);
      const costPerKg = 150 + (d % 80);
      const cost = qty * costPerKg;
      const revenue = cost / (1 - margin / 100);
      const profit = revenue - cost;
      const business = (d + i) % 3 === 0 ? 'ФБ' : 'МЛ';

      rows.push({
        id: `deal-${id++}`,
        date,
        client,
        product: prod.name,
        group: prod.group,
        qty,
        revenue: Math.round(revenue),
        cost: Math.round(cost),
        profit: Math.round(profit),
        margin: Math.round(margin * 10) / 10,
        business,
        status: d < 3 ? 'open' : 'closed',
      });
    }
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

function buildBerryGroups(base: BaseDashboardData): BerryGroupStock[] {
  const map = new Map<string, BerryGroupStock>();
  for (const item of base.inventory) {
    if (item.qty <= 0) continue;
    const group = detectGroup(item.product);
    const cur = map.get(group) ?? {
      group, qtyKg: 0, costRub: 0, marketRub: 0, daysAvg: 0,
      storagePaidRub: 0, marginAfterStorage: 0, profitabilityReserveTotal: 0,
      catalogPricePerKg: 0, quickSalePricePerKg: 0,
    };
    cur.qtyKg += item.qty;
    cur.costRub += item.costTotal;
    cur.marketRub += (item.catalogPricePerKg ?? item.marketPrice ?? 0) * item.qty;
    cur.daysAvg = Math.max(cur.daysAvg, item.daysOnStock ?? 0);
    cur.storagePaidRub += item.storagePaidRub ?? 0;
    cur.marginAfterStorage += item.profitabilityReserveTotal ?? item.marginAfterStorage ?? 0;
    cur.profitabilityReserveTotal += item.profitabilityReserveTotal ?? 0;
    if (item.qty > 0) {
      cur.catalogPricePerKg = item.catalogPricePerKg ?? cur.catalogPricePerKg;
      cur.quickSalePricePerKg = item.quickSalePricePerKg ?? cur.quickSalePricePerKg;
    }
    map.set(group, cur);
  }
  for (const item of base.inTransit.filter((t) => t.section === 'warehouse' || t.section === 'in_transit')) {
    const group = detectGroup(item.product);
    const cur = map.get(group) ?? {
      group, qtyKg: 0, costRub: 0, marketRub: 0, daysAvg: 0,
      storagePaidRub: 0, marginAfterStorage: 0, profitabilityReserveTotal: 0,
      catalogPricePerKg: 0, quickSalePricePerKg: 0,
    };
    cur.qtyKg += item.qty ?? 0;
    cur.costRub += item.cost ?? 0;
    cur.marketRub += item.amount ?? 0;
    map.set(group, cur);
  }
  return [...map.values()].sort((a, b) => b.costRub - a.costRub);
}

function buildPayables(base: BaseDashboardData): PayableItem[] {
  const creditors = base.operBalance2026.passive
    .filter((p) => p.values['2026-05-29'] && p.values['2026-05-29']! > 50000)
    .slice(0, 12);

  const reportDate = base.kpi.reportDate;
  const items: PayableItem[] = [];
  let day = 0;
  for (const c of creditors) {
    const total = c.values['2026-05-29'] ?? 0;
    const chunk = total / 3;
    for (let i = 0; i < 3; i++) {
      items.push({
        creditor: c.name,
        date: addDays(parseDate(reportDate), day + i * 3 + 1),
        amount: Math.round(chunk),
        type: 'поставщик',
        business: i % 2 === 0 ? 'МЛ' : 'ФБ',
      });
    }
    day += 2;
  }

  items.push(
    { creditor: 'Кредит Сбер (тело+%)', date: addDays(parseDate(reportDate), 5), amount: 2150000, type: 'кредит', business: 'МЛ' },
    { creditor: 'Кредит ВТБ (тело+%)', date: addDays(parseDate(reportDate), 12), amount: 1850000, type: 'кредит', business: 'ФБ' },
    { creditor: 'Таможня / логистика', date: addDays(parseDate(reportDate), 2), amount: 890000, type: 'логистика', business: 'МЛ' },
    { creditor: 'НДС / налоги', date: addDays(parseDate(reportDate), 28), amount: 3200000, type: 'налог', business: 'МЛ' },
  );

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export function enrichDashboard(base: BaseDashboardData): DashboardData {
  const reportDate = base.kpi.reportDate;
  const mayProfit = base.kpi.profit;
  const mayRevenue = base.kpi.revenue;
  const mayMargin = mayRevenue > 0 ? (mayProfit / mayRevenue) * 100 : 0;
  const workingDaysMay = 22;

  const yesterday: DashboardData['yesterday'] = {
    date: addDays(parseDate(reportDate), -1),
    revenue: Math.round(mayRevenue / workingDaysMay * 0.92),
    cost: 0,
    profit: 0,
    marginPct: 10.8,
  };
  yesterday.cost = Math.round(yesterday.revenue * (1 - yesterday.marginPct / 100));
  yesterday.profit = yesterday.revenue - yesterday.cost;

  const payables = buildPayables(base);
  const dealHistory = generateDealHistory(base);

  const cashTotal = 18500000 + 9200000;
  const bankAccounts = [
    { name: 'Р/с МЛ (Сбер)', bank: 'Сбер', business: 'МЛ', balance: 18500000, currency: 'RUB' as const },
    { name: 'Р/с ФБ (ВТБ)', bank: 'ВТБ', business: 'ФБ', balance: 9200000, currency: 'RUB' as const },
    { name: 'Р/с валютный (импорт)', bank: 'Сбер', business: 'МЛ', balance: 2100000, currency: 'USD' as const, foreignAmount: 22800 },
  ];

  const creditDebt = 42000000;
  const investorCapital = base.kpi.totalActive - creditDebt - cashTotal - base.kpi.totalReceivables * 0.35;

  const salesPlan: SalesPlan = {
    month: 'май 2026',
    planRevenue: 90000000,
    factRevenue: mayRevenue,
    planKg: 320000,
    factKg: base.kpi.totalSales,
    planMarginPct: 14,
    factMarginPct: Math.round(mayMargin * 10) / 10,
    planProfit: 12600000,
    factProfit: mayProfit,
    calendarProgressPct: Math.round((29 / 31) * 100),
    expectedRevenueByDate: Math.round(90000000 * (29 / 31)),
    gapRevenue: Math.round(mayRevenue - 90000000 * (29 / 31)),
    forecastRevenue: Math.round(mayRevenue / (29 / 31)),
  };

  const roi: RoiMetrics[] = [
    {
      id: 'overall',
      label: 'Общий ROI',
      profit: mayProfit,
      capital: base.kpi.totalActive,
      roiPct: Math.round((mayProfit / base.kpi.totalActive) * 1000) / 10,
      targetPct: 5,
      status: mayProfit / base.kpi.totalActive > 0.04 ? 'good' : 'warn',
    },
    {
      id: 'credit',
      label: 'ROI кредитных денег',
      profit: Math.round(mayProfit * 0.22),
      capital: creditDebt,
      roiPct: Math.round(((mayProfit * 0.22) / creditDebt) * 1000) / 10,
      targetPct: 1.5,
      status: ((mayProfit * 0.22) / creditDebt) * 100 < 1.5 ? 'bad' : 'good',
      profitSharePct: 22,
    },
    {
      id: 'investor',
      label: 'ROI инвестор / собственник',
      profit: Math.round(mayProfit * 0.78),
      capital: Math.max(investorCapital, 1),
      roiPct: Math.round(((mayProfit * 0.78) / Math.max(investorCapital, 1)) * 1000) / 10,
      targetPct: 6,
      status: 'good',
      profitSharePct: 78,
    },
    {
      id: 'cash',
      label: 'ROI свободных денег',
      profit: Math.round(mayProfit * 0.08),
      capital: cashTotal,
      roiPct: Math.round(((mayProfit * 0.08) / cashTotal) * 1000) / 10,
      targetPct: 2,
      status: 'warn',
      profitSharePct: 8,
    },
  ];

  const stockValue = base.inventory.reduce((s, i) => s + i.costTotal, 0);
  const inTransitRub = base.inTransit.reduce((s, t) => s + (t.cost ?? 0), 0);

  const supplierCreditDays = 14;
  const receivableDays = Math.round((base.kpi.totalReceivables / mayRevenue) * 30);
  const stockDays = Math.round((stockValue / mayRevenue) * 30);
  const turnover: TurnoverMetrics = {
    receivableDays,
    receivableNorm: 25,
    stockDays,
    stockNorm: 20,
    inTransitRub,
    dealCycleDays: Math.max(1, receivableDays + stockDays - supplierCreditDays),
    supplierCreditDays,
    stockValueRub: stockValue,
    monthlyRevenue: mayRevenue,
  };

  const today = reportDate;
  const weekEnd = addDays(parseDate(reportDate), 7 - parseDate(reportDate).getDay());
  const monthEnd = '2026-05-31';

  const paymentsToday = sumPayablesInRange(payables, today, today);
  const paymentsThisWeek = sumPayablesInRange(payables, today, weekEnd);
  const paymentsThisMonth = sumPayablesInRange(payables, today, monthEnd);
  const inflowProbabilityPct = 70;
  const expectedInflowsWeek = Math.round(sumInflowsInRange(base.cashPlan, today, weekEnd) * (inflowProbabilityPct / 100));

  const gapToday = paymentsToday - cashTotal;
  const gapWeek = paymentsThisWeek - cashTotal - expectedInflowsWeek;
  const gapMonth = paymentsThisMonth - cashTotal - base.cashPlan.reduce((s, c) => s + c.amount, 0) * 0.5;

  const needAttract = Math.max(0, gapWeek);

  const fundingGap: FundingGap = {
    cashOnAccounts: cashTotal,
    paymentsToday,
    paymentsThisWeek,
    paymentsThisMonth,
    expectedInflowsWeek,
    gapToday,
    gapWeek,
    gapMonth,
    needAttract,
    status: needAttract > 5000000 ? 'critical' : needAttract > 0 ? 'warn' : 'ok',
    weekFrom: today,
    weekTo: weekEnd,
    monthTo: monthEnd,
    inflowProbabilityPct,
  };

  const weekDeals = dealHistory.filter((d) => {
    const diff = (parseDate(reportDate).getTime() - parseDate(d.date).getTime()) / 86400000;
    return diff >= 0 && diff < 7;
  });
  const weekMargin = weekDeals.length
    ? weekDeals.reduce((s, d) => s + d.margin, 0) / weekDeals.length
    : 0;

  const insights: Insight[] = [];
  if (needAttract > 0) {
    insights.push({
      type: 'critical',
      text: `Нужно привлечь ~${(needAttract / 1e6).toFixed(1)} млн ₽ до конца недели, иначе не закроем обязательства.`,
    });
  }
  if (weekMargin < salesPlan.planMarginPct) {
    insights.push({
      type: 'warning',
      text: `Маржа недели ${weekMargin.toFixed(1)}% — ниже плана ${salesPlan.planMarginPct}%. Проверьте сделки с низкой маржой.`,
    });
  }
  if (turnover.receivableDays > turnover.receivableNorm) {
    insights.push({
      type: 'warning',
      text: `Деньги оборачиваются медленно: дебиторка ${turnover.receivableDays} дн. (норма ${turnover.receivableNorm}).`,
    });
  }
  if (salesPlan.gapRevenue < 0) {
    insights.push({
      type: 'info',
      text: `Отставание от плана продаж ${(Math.abs(salesPlan.gapRevenue) / 1e6).toFixed(1)} млн ₽ к ${reportDate}. Нужно ~${Math.round((salesPlan.planRevenue - salesPlan.factRevenue) / 2 / 1e6 * 10) / 10} млн/день.`,
    });
  }
  if (roi[1].status === 'bad') {
    insights.push({
      type: 'warning',
      text: `ROI по кредитным деньгам (${roi[1].roiPct}%) ниже цели — закупки в долг на текущей марже могут не окупаться.`,
    });
  }

  const enrichedReceivables = base.receivables
    .filter((r) => !r.client.includes('Итог') && !r.client.includes('1С') && !r.client.includes('данные'))
    .map((r, i) => {
      const enriched = {
        ...r,
        overdueDays: i % 4 === 0 ? 12 + i * 2 : i % 3 === 0 ? 0 : 5,
        plannedPaymentDate: base.cashPlan[i % base.cashPlan.length]?.date ?? addDays(parseDate(reportDate), 7 + i),
        status: (i % 4 === 0 ? 'overdue' : i % 5 === 0 ? 'partial' : 'on_time') as 'overdue' | 'partial' | 'on_time',
      };
      const timeline = buildClientPaymentTimeline(enriched, base.cashPlan, reportDate);
      return {
        ...enriched,
        paymentHistory: timeline.history,
        upcomingPayments: timeline.upcoming,
      };
    });

  const enrichedInventory = base.inventory.map((item, i) => {
    const daysOnStock = 5 + (i * 7) % 55;
    const econ = computeWarehouseEconomics(item, daysOnStock);
    const storagePaidRub = Math.round(item.qty * econ.storagePaidPerKg);
    return {
      ...item,
      group: detectGroup(item.product),
      daysOnStock,
      reserved: Math.round(item.qty * (0.1 + (i % 5) * 0.05)),
      storageRatePerKgDay: STORAGE_RATE_PER_KG_DAY,
      storagePaidRub,
      costPerKg: econ.costPerKg,
      catalogPricePerKg: econ.catalogPricePerKg,
      quickSalePricePerKg: econ.quickSalePricePerKg,
      marginAtQuickSalePerKg: econ.marginAtQuickSalePerKg,
      marginAtQuickSaleTotal: econ.marginAtQuickSaleTotal,
      profitabilityReservePerKg: econ.profitabilityReservePerKg,
      profitabilityReserveTotal: econ.profitabilityReserveTotal,
      daysUntilStorageExceedsCost: econ.daysUntilStorageExceedsCost,
      storageAlreadyExceedsCost: econ.storageAlreadyExceedsCost,
      daysUntilUnprofitable: econ.daysUntilUnprofitable,
      marginAfterStorage: econ.profitabilityReserveTotal,
    };
  });

  const enrichedInTransit = base.inTransit.map((item, i) => {
    const daysToArrival = item.daysToArrival ?? 4 + (i % 4) * 3;
    const statuses: Array<'planned' | 'in_transit' | 'customs' | 'delayed'> = ['planned', 'in_transit', 'customs', 'delayed'];
    return {
      ...item,
      plannedArrival: item.plannedArrival ?? addDays(parseDate(reportDate), daysToArrival),
      supplier: item.supplier ?? ['Китай', 'Чили', 'Перу', 'Россия'][i % 4],
      origin: item.origin ?? ['Китай', 'Чили', 'Перу', 'Россия'][i % 4],
      deliveryStatus: item.deliveryStatus ?? statuses[i % statuses.length],
      daysToArrival,
    };
  });

  const openDeals: DashboardData['openDeals'] = [
    ...base.deals.filter((d) => d.amount > 0).slice(0, 12),
    ...dealHistory
      .filter((d) => d.status === 'open')
      .map((d) => ({
        client: d.client,
        product: d.product,
        qty: d.qty,
        amount: d.revenue,
        cost: d.cost,
        profit: d.profit,
        margin: d.margin,
        business: d.business,
        stage: 'Отгружено, ждём оплату',
        status: 'open' as const,
      })),
  ];

  return {
    ...base,
    receivables: enrichedReceivables,
    inventory: enrichedInventory,
    inTransit: enrichedInTransit,
    payables,
    bankAccounts,
    salesPlan,
    roi,
    turnover,
    fundingGap,
    insights,
    yesterday,
    dealHistory,
    openDeals,
    berryGroups: buildBerryGroups({ ...base, inventory: enrichedInventory }),
    creditDebt,
    investorCapital,
  };
}
