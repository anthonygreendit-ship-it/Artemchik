import type { DashboardData, RoiDetailView, RoiMetricId, TurnoverMetricId } from '../types';
import { accountBankLabel } from './productLabels';
import { formatMoney, formatNumber, formatPercent } from './format';

const BALANCE_DATE = '2026-05-29';

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function operActiveLines(data: DashboardData) {
  return data.operBalance2026.active
    .filter((a) => {
      const v = a.values[BALANCE_DATE];
      return v && v > 1000 && !a.name.includes('Итого') && !a.name.includes('ПРОВЕРКА');
    })
    .sort((a, b) => (b.values[BALANCE_DATE] ?? 0) - (a.values[BALANCE_DATE] ?? 0));
}

function creditLines(data: DashboardData) {
  return data.payables
    .filter((p) => p.type === 'кредит' || p.creditor.toLowerCase().includes('кредит'))
    .sort((a, b) => b.amount - a.amount);
}

export function buildRoiDetail(data: DashboardData, id: RoiMetricId | 'capital'): RoiDetailView {
  const { roi, kpi, creditDebt, investorCapital, fundingGap, bankAccounts } = data;
  const row = id === 'capital' ? roi[0] : roi.find((r) => r.id === id) ?? roi[0];
  const period = data.salesPlan.month;
  const mayProfit = kpi.profit;
  const mayRevenue = kpi.revenue;
  const cashTotal = fundingGap.cashOnAccounts;
  const receivablesInCapital = kpi.totalReceivables * 0.35;

  if (id === 'capital') {
    const activeTotal = kpi.totalActive;
    const activeLines = operActiveLines(data);
    return {
      id: 'capital',
      title: 'Структура капитала',
      subtitle: 'Из чего складывается база для расчёта ROI',
      period,
      formula: 'Актив (опербаланс) = деньги + дебиторка + склад + прочие активы',
      steps: [
        { label: 'Актив по опербалансу', value: formatMoney(activeTotal, true), highlight: true },
        { label: 'Пассив (обязательства + капитал)', value: formatMoney(kpi.totalPassive, true) },
      ],
      lines: activeLines.slice(0, 12).map((a) => ({
        label: a.name,
        amount: a.values[BALANCE_DATE] ?? 0,
        sharePct: pct(a.values[BALANCE_DATE] ?? 0, activeTotal),
      })),
      resultLabel: 'Оценка для ROI-модели',
      resultValue: [
        `Кредит: ${formatMoney(creditDebt, true)}`,
        `Свободные деньги: ${formatMoney(cashTotal, true)}`,
        `Собственный капитал (оценка): ${formatMoney(Math.max(investorCapital, 0), true)}`,
      ].join(' · '),
      footnote: 'Собственный капитал = актив − кредит − деньги на счетах − 35% дебиторки (деньги ещё не получены).',
    };
  }

  if (id === 'overall') {
    return {
      id,
      title: row.label,
      subtitle: 'Доходность всего бизнеса за месяц',
      period,
      formula: 'ROI = Прибыль за месяц ÷ Актив (опербаланс) × 100%',
      steps: [
        { label: 'Прибыль (май, из KPI)', value: formatMoney(mayProfit, true) },
        { label: 'Актив (опербаланс на дату)', value: formatMoney(kpi.totalActive, true) },
        { label: 'ROI', value: formatPercent(row.roiPct, false), highlight: true },
        { label: 'Цель', value: formatPercent(row.targetPct, false) },
      ],
      lines: [
        { label: 'Выручка мая', amount: mayRevenue, meta: 'база для оборачиваемости' },
        { label: 'Маржа мая', amount: mayProfit, sharePct: pct(mayProfit, mayRevenue), meta: formatPercent(pct(mayProfit, mayRevenue), false) },
        ...operActiveLines(data).slice(0, 8).map((a) => ({
          label: `Актив: ${a.name}`,
          amount: a.values[BALANCE_DATE] ?? 0,
          sharePct: pct(a.values[BALANCE_DATE] ?? 0, kpi.totalActive),
        })),
      ],
      resultLabel: 'Итог',
      resultValue: `${formatPercent(row.roiPct, false)} при цели ${formatPercent(row.targetPct, false)}`,
      status: row.status,
      footnote: 'Прибыль — оперативная наценка мая из выгрузки 1С. Актив — строка «Итого актив» опербаланса.',
    };
  }

  if (id === 'credit') {
    const profitShare = 0.22;
    const attributedProfit = Math.round(mayProfit * profitShare);
    const credits = creditLines(data);
    return {
      id,
      title: row.label,
      subtitle: 'Сколько зарабатываем на деньгах, взятых в кредит',
      period,
      formula: 'ROI = (Прибыль × доля кредита) ÷ Тело кредита × 100%',
      steps: [
        { label: 'Прибыль мая', value: formatMoney(mayProfit, true) },
        { label: 'Доля, отнесённая на кредит', value: '22%' },
        { label: 'Прибыль на кредит', value: formatMoney(attributedProfit, true) },
        { label: 'Кредитный долг (оценка)', value: formatMoney(creditDebt, true) },
        { label: 'ROI', value: formatPercent(row.roiPct, false), highlight: true },
        { label: 'Цель', value: formatPercent(row.targetPct, false) },
      ],
      lines: credits.length
        ? credits.map((c) => ({ label: c.creditor, amount: c.amount, meta: `${c.date} · ${c.type}` }))
        : [
            { label: 'Кредит Сбер (тело+%)', amount: 2_150_000, meta: 'из плана платежей' },
            { label: 'Кредит ВТБ (тело+%)', amount: 1_850_000, meta: 'из плана платежей' },
          ],
      resultLabel: 'Итог',
      resultValue: `${formatPercent(row.roiPct, false)} — ${row.status === 'bad' ? 'ниже цели, кредитные закупки могут не окупаться' : 'в норме'}`,
      status: row.status,
      footnote: '22% прибыли относим на кредитный капитал — доля закупок, финансируемых заёмными средствами. Тело кредита — оценка по обязательствам.',
    };
  }

  if (id === 'investor') {
    const profitShare = 0.78;
    const attributedProfit = Math.round(mayProfit * profitShare);
    return {
      id,
      title: row.label,
      subtitle: 'Доходность на вложения собственника и инвестора',
      period,
      formula: 'ROI = (Прибыль × 78%) ÷ Собственный капитал × 100%',
      steps: [
        { label: 'Прибыль мая', value: formatMoney(mayProfit, true) },
        { label: 'Доля собственника', value: '78%' },
        { label: 'Прибыль на капитал', value: formatMoney(attributedProfit, true) },
        { label: 'Собственный капитал', value: formatMoney(Math.max(investorCapital, 0), true) },
        { label: 'ROI', value: formatPercent(row.roiPct, false), highlight: true },
        { label: 'Цель', value: formatPercent(row.targetPct, false) },
      ],
      lines: [
        { label: 'Актив (опербаланс)', amount: kpi.totalActive },
        { label: '− Кредитный долг', amount: -creditDebt },
        { label: '− Деньги на счетах', amount: -cashTotal },
        { label: '− 35% дебиторки (не получено)', amount: -receivablesInCapital, meta: `${formatMoney(kpi.totalReceivables, true)} × 35%` },
        { label: '= Собственный капитал', amount: investorCapital, sharePct: pct(investorCapital, kpi.totalActive) },
      ],
      resultLabel: 'Итог',
      resultValue: `${formatPercent(row.roiPct, false)} при цели ${formatPercent(row.targetPct, false)}`,
      status: row.status,
      footnote: '78% прибыли — доля, которая генерируется на собственные вложения (остальное — кредит и оборотка на счетах).',
    };
  }

  const profitShare = 0.08;
  const attributedProfit = Math.round(mayProfit * profitShare);
  return {
    id: 'cash',
    title: row.label,
    subtitle: 'Сколько приносят свободные деньги на расчётных счетах',
    period,
    formula: 'ROI = (Прибыль × 8%) ÷ Деньги на счетах × 100%',
    steps: [
      { label: 'Прибыль мая', value: formatMoney(mayProfit, true) },
      { label: 'Доля свободных денег', value: '8%' },
      { label: 'Прибыль на кэш', value: formatMoney(attributedProfit, true) },
      { label: 'На счетах', value: formatMoney(cashTotal, true), highlight: true },
      { label: 'ROI', value: formatPercent(row.roiPct, false), highlight: true },
      { label: 'Цель', value: formatPercent(row.targetPct, false) },
    ],
    lines: bankAccounts.map((a) => ({
      label: a.name,
      amount: a.balance,
      sharePct: pct(a.balance, cashTotal),
      meta: accountBankLabel(a),
    })),
    resultLabel: 'Итог',
    resultValue: `${formatPercent(row.roiPct, false)} — ${row.status === 'warn' ? 'слабая отдача на idle cash' : 'в норме'}`,
    status: row.status,
    footnote: '8% прибыли — оценка того, что зарабатывается на свободном остатке, а не на товаре и дебиторке.',
  };
}

export function buildTurnoverDetail(data: DashboardData, id: TurnoverMetricId): RoiDetailView {
  const { turnover, kpi, inventory, receivables, inTransit, dealHistory } = data;
  const period = data.salesPlan.month;
  const mayRevenue = turnover.monthlyRevenue ?? kpi.revenue;
  const stockValue = turnover.stockValueRub ?? inventory.reduce((s, i) => s + i.costTotal, 0);

  if (id === 'receivables') {
    const topClients = receivables
      .filter((r) => r.total > 0 && !r.client.includes('Итог') && !r.client.includes('1С') && !r.client.includes('данные'))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
    return {
      id,
      title: 'Дебиторка, дней',
      subtitle: 'Сколько дней выручки «заморожено» в долгах клиентов',
      period,
      formula: 'Дни = (Дебиторка ÷ Выручка мая) × 30',
      steps: [
        { label: 'Дебиторка', value: formatMoney(kpi.totalReceivables, true) },
        { label: 'Выручка мая', value: formatMoney(mayRevenue, true) },
        { label: 'Дней', value: `${turnover.receivableDays} дн.`, highlight: true },
        { label: 'Норма', value: `${turnover.receivableNorm} дн.` },
      ],
      lines: topClients.map((r) => ({
        label: r.client,
        amount: r.total,
        sharePct: pct(r.total, kpi.totalReceivables),
        meta: r.status === 'overdue' ? `просрочка ${r.overdueDays ?? 0} дн.` : 'в графике',
      })),
      resultLabel: 'Оценка',
      resultValue: turnover.receivableDays > turnover.receivableNorm
        ? `+${turnover.receivableDays - turnover.receivableNorm} дн. к норме — деньги оборачиваются медленно`
        : 'В пределах нормы',
      status: turnover.receivableDays > turnover.receivableNorm ? 'bad' : 'good',
      footnote: 'Чем выше дни — тем больше денег «сидит» у клиентов вместо работы на новые закупки.',
    };
  }

  if (id === 'stock') {
    const groups = data.berryGroups
      .filter((g) => g.costRub > 0)
      .sort((a, b) => b.costRub - a.costRub)
      .slice(0, 10);
    return {
      id,
      title: 'Склад, дней',
      subtitle: 'Сколько дней выручки лежит в товаре на складе',
      period,
      formula: 'Дни = (Себестоимость склада ÷ Выручка мая) × 30',
      steps: [
        { label: 'Склад (себест.)', value: formatMoney(stockValue, true) },
        { label: 'Выручка мая', value: formatMoney(mayRevenue, true) },
        { label: 'Дней', value: `${turnover.stockDays} дн.`, highlight: true },
        { label: 'Норма', value: `${turnover.stockNorm} дн.` },
      ],
      lines: groups.map((g) => ({
        label: g.group,
        amount: g.costRub,
        sharePct: pct(g.costRub, stockValue),
        meta: `${formatNumber(g.qtyKg)} кг`,
      })),
      resultLabel: 'Оценка',
      resultValue: turnover.stockDays > turnover.stockNorm
        ? `+${turnover.stockDays - turnover.stockNorm} дн. к норме — много «мертвого» товара`
        : 'В пределах нормы',
      status: turnover.stockDays > turnover.stockNorm ? 'warn' : 'good',
      footnote: 'Считаем по себестоимости остатков, не по цене продажи.',
    };
  }

  if (id === 'in-transit') {
    const items = [...inTransit]
      .filter((t) => (t.cost ?? 0) > 0 || (t.amount ?? 0) > 0)
      .sort((a, b) => (b.cost ?? b.amount ?? 0) - (a.cost ?? a.amount ?? 0))
      .slice(0, 15);
    const total = turnover.inTransitRub;
    return {
      id,
      title: 'Товар в пути',
      subtitle: 'Деньги, замороженные в закупках и логистике',
      period,
      formula: 'Сумма = Σ себестоимость позиций в пути',
      steps: [
        { label: 'Позиций в пути', value: String(inTransit.length) },
        { label: 'Заморожено', value: formatMoney(total, true), highlight: true },
      ],
      lines: items.map((t) => ({
        label: t.product.slice(0, 50),
        amount: t.cost ?? t.amount ?? 0,
        sharePct: pct(t.cost ?? t.amount ?? 0, total),
        meta: [t.deliveryStatus, t.daysToArrival != null ? `${t.daysToArrival} дн.` : null, t.supplier].filter(Boolean).join(' · '),
      })),
      resultLabel: 'Риск',
      resultValue: total > mayRevenue * 0.15
        ? 'Большая доля оборотки в логистике — следите за сроками прихода'
        : 'Доля в пути в пределах типичного',
      status: total > mayRevenue * 0.2 ? 'warn' : 'good',
      footnote: 'Пока товар в пути, деньги не работают и не приносят маржу.',
    };
  }

  const supplierDays = turnover.supplierCreditDays ?? 14;
  const closedDeals = dealHistory.filter((d) => d.status === 'closed').slice(0, 20);
  const avgDealKg = closedDeals.length
    ? closedDeals.reduce((s, d) => s + d.qty, 0) / closedDeals.length
    : 0;
  return {
    id,
    title: 'Цикл сделки',
    subtitle: 'Сколько дней от закупки до получения денег от клиента',
    period,
    formula: 'Цикл ≈ Дни на складе + Дни в дебиторке − Отсрочка поставщику',
    steps: [
      { label: 'Дни на складе', value: `${turnover.stockDays} дн.` },
      { label: 'Дни в дебиторке', value: `${turnover.receivableDays} дн.` },
      { label: 'Отсрочка поставщику (оценка)', value: `−${supplierDays} дн.` },
      { label: 'Цикл', value: `${turnover.dealCycleDays} дн.`, highlight: true },
    ],
    lines: [
      { label: 'Средняя сделка (история)', amount: avgDealKg, meta: `${formatNumber(Math.round(avgDealKg))} кг` },
      { label: 'Сделок в истории', amount: dealHistory.length, meta: 'за последние ~45 дней' },
      ...closedDeals.slice(0, 8).map((d) => ({
        label: `${d.client.slice(0, 28)} · ${d.product.slice(0, 20)}`,
        amount: d.revenue,
        meta: `${d.date} · маржа ${d.margin}%`,
      })),
    ],
    resultLabel: 'Смысл',
    resultValue: `Каждый рубль проходит полный круг ~${turnover.dealCycleDays} дней`,
    footnote: 'Чем короче цикл — тем больше оборотов и ROI при той же марже.',
  };
}

export type RoiPageSelection =
  | { kind: 'roi'; id: RoiMetricId | 'capital' }
  | { kind: 'turnover'; id: TurnoverMetricId };

export function buildDetail(data: DashboardData, selection: RoiPageSelection): RoiDetailView {
  if (selection.kind === 'roi') return buildRoiDetail(data, selection.id);
  return buildTurnoverDetail(data, selection.id);
}
