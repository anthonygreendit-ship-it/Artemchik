import type { DashboardData, FundingGap, PayableItem, RoiDetailView } from '../types';
import { formatDate, formatMoney } from './format';
import { accountBankLabel, paymentPartyLabel } from './productLabels';

export type FundingMetricId = 'needAttract' | 'paymentsToday' | 'paymentsWeek' | 'inflowsWeek' | 'gapMonth' | 'freeAfterWeek';

function payablesInRange(payables: PayableItem[], from: string, to: string): PayableItem[] {
  return payables.filter((p) => p.date >= from && p.date <= to).sort((a, b) => a.date.localeCompare(b.date));
}

function inflowsInRange(data: DashboardData, from: string, to: string) {
  return data.cashPlan
    .filter((p) => p.date >= from && p.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildFundingDetail(data: DashboardData, metric: FundingMetricId): RoiDetailView {
  const fg = data.fundingGap;
  const reportDate = data.kpi.reportDate;
  const weekFrom = fg.weekFrom ?? reportDate;
  const weekTo = fg.weekTo ?? reportDate;
  const inflowFactor = fg.inflowProbabilityPct ?? 70;
  const totalCash = data.bankAccounts.reduce((s, a) => s + a.balance, 0);

  if (metric === 'needAttract') {
    const weekPayables = payablesInRange(data.payables, weekFrom, weekTo);
    const weekInflowsRaw = inflowsInRange(data, weekFrom, weekTo);
    const inflowsExpected = fg.expectedInflowsWeek;

    return {
      id: 'needAttract',
      title: 'Сколько нужно привлечь',
      subtitle: 'Дефицит денег до конца недели после всех плановых платежей и ожидаемых поступлений',
      period: `${formatDate(weekFrom)} — ${formatDate(weekTo)}`,
      formula: 'Привлечь = MAX(0, Платежи за неделю − На счетах − Ожидаемые поступления)',
      steps: [
        { label: 'Платежи до конца недели', value: formatMoney(fg.paymentsThisWeek, true) },
        { label: 'Минус: на счетах сейчас', value: `− ${formatMoney(fg.cashOnAccounts, true)}` },
        { label: `Минус: поступления (${inflowFactor}% от графика)`, value: `− ${formatMoney(inflowsExpected, true)}` },
        { label: 'Дефицит (gap недели)', value: formatMoney(fg.gapWeek, true) },
        { label: 'Нужно привлечь', value: formatMoney(fg.needAttract, true), highlight: true },
      ],
      lines: [
        ...weekPayables.map((p) => ({
          label: p.creditor,
          amount: p.amount,
          meta: `${formatDate(p.date)} · ${p.type} · ${paymentPartyLabel(p.business)}`,
        })),
        { label: '—', amount: 0, meta: '--- поступления (график) ---' },
        ...weekInflowsRaw.map((c) => ({
          label: c.client,
          amount: Math.round(c.amount * (inflowFactor / 100)),
          meta: `${formatDate(c.date)} · учтено ${inflowFactor}% от ${formatMoney(c.amount, true)}`,
        })),
      ],
      resultLabel: 'Вывод',
      resultValue:
        fg.needAttract > 0
          ? `Не хватает ${formatMoney(fg.needAttract, true)} — нужен кредит, инвестор или ускорение дебиторки`
          : 'Дефицита нет — текущих денег и поступлений хватает на неделю',
      status: fg.needAttract > 5_000_000 ? 'bad' : fg.needAttract > 0 ? 'warn' : 'good',
      footnote: `Поступления берём ${inflowFactor}% от плана ДС (не все клиенты платят в срок). Gap сегодня: ${formatMoney(fg.gapToday, true)}, gap месяца: ${formatMoney(fg.gapMonth, true)}.`,
    };
  }

  if (metric === 'paymentsToday') {
    const items = payablesInRange(data.payables, reportDate, reportDate);
    return buildPayablesDetail('Платежи сегодня', items, fg.paymentsToday, reportDate, fg);
  }

  if (metric === 'paymentsWeek') {
    const items = payablesInRange(data.payables, weekFrom, weekTo);
    return buildPayablesDetail('Платежи до конца недели', items, fg.paymentsThisWeek, `${formatDate(weekFrom)} — ${formatDate(weekTo)}`, fg);
  }

  if (metric === 'inflowsWeek') {
    const raw = inflowsInRange(data, weekFrom, weekTo);
    return {
      id: 'inflowsWeek',
      title: 'Ожидаемые поступления (неделя)',
      subtitle: 'График оплат от клиентов с дисконтом на просрочку',
      period: `${formatDate(weekFrom)} — ${formatDate(weekTo)}`,
      formula: `Ожидание = Σ поступлений из плана ДС × ${inflowFactor}%`,
      steps: [
        { label: 'План поступлений (100%)', value: formatMoney(raw.reduce((s, c) => s + c.amount, 0), true) },
        { label: 'Вероятность оплаты', value: `${inflowFactor}%` },
        { label: 'Учтено в расчёте', value: formatMoney(fg.expectedInflowsWeek, true), highlight: true },
      ],
      lines: raw.map((c) => ({
        label: c.client,
        amount: c.amount,
        sharePct: undefined,
        meta: `${formatDate(c.date)} · ${paymentPartyLabel(c.business)} · с ${inflowFactor}% = ${formatMoney(c.amount * (inflowFactor / 100), true)}`,
      })),
      resultLabel: 'Итог',
      resultValue: formatMoney(fg.expectedInflowsWeek, true),
      footnote: 'Если клиенты платят лучше плана — дефicit будет меньше. Хуже — нужно привлекать больше.',
    };
  }

  if (metric === 'gapMonth') {
    const monthEnd = fg.monthTo ?? '2026-05-31';
    const items = payablesInRange(data.payables, reportDate, monthEnd);
    const planInflows = data.cashPlan.filter((c) => c.date >= reportDate && c.date <= monthEnd);
    return {
      id: 'gapMonth',
      title: 'Платежи до конца месяца',
      subtitle: 'Долгосрочная картина — не путать с «привлечь на неделю»',
      period: `${formatDate(reportDate)} — ${formatDate(monthEnd)}`,
      formula: 'Gap месяца = Платежи − Деньги − 50% плана поступлений',
      steps: [
        { label: 'Платежи до конца месяца', value: formatMoney(fg.paymentsThisMonth, true) },
        { label: 'На счетах', value: formatMoney(fg.cashOnAccounts, true) },
        { label: 'Gap месяца (оценка)', value: formatMoney(fg.gapMonth, true), highlight: true },
      ],
      lines: items.slice(0, 20).map((p) => ({
        label: p.creditor,
        amount: p.amount,
        meta: `${formatDate(p.date)} · ${p.type}`,
      })),
      resultLabel: 'Примечание',
      resultValue: '«Привлечь» считается только на горизонте недели — см. детализацию «Привлечь»',
      footnote: `В расчёт месяца заложено 50% от ${formatMoney(planInflows.reduce((s, c) => s + c.amount, 0), true)} плановых поступлений.`,
    };
  }

  const free = totalCash + fg.expectedInflowsWeek - fg.paymentsThisWeek;
  return {
    id: 'freeAfterWeek',
    title: 'Свободно после недели',
    subtitle: 'Прогноз остатка если всё по плану',
    period: `После ${formatDate(weekTo)}`,
    formula: 'Остаток = На счетах + Поступления − Платежи недели',
    steps: [
      { label: 'На счетах', value: formatMoney(totalCash, true) },
      { label: '+ Поступления', value: formatMoney(fg.expectedInflowsWeek, true) },
      { label: '− Платежи недели', value: formatMoney(fg.paymentsThisWeek, true) },
      { label: 'Прогноз', value: formatMoney(free, true), highlight: true },
    ],
    lines: data.bankAccounts.map((a) => ({
      label: a.name,
      amount: a.balance,
      meta: accountBankLabel(a),
    })),
    resultLabel: 'Итог',
    resultValue: free < 0 ? 'Уйдём в минус — см. «Привлечь»' : `Останется ~${formatMoney(free, true)}`,
    status: free < 0 ? 'bad' : 'good',
  };
}

function buildPayablesDetail(
  title: string,
  items: PayableItem[],
  total: number,
  period: string,
  fg: FundingGap,
): RoiDetailView {
  return {
    id: 'payables',
    title,
    subtitle: 'Каждый исходящий платёж из календаря обязательств',
    period,
    formula: 'Сумма = Σ платежей за период',
    steps: [
      { label: 'Платежей', value: String(items.length) },
      { label: 'Итого', value: formatMoney(total, true), highlight: true },
      { label: 'На счетах для сравнения', value: formatMoney(fg.cashOnAccounts, true) },
    ],
    lines: items.map((p) => ({
      label: p.creditor,
      amount: p.amount,
      meta: `${formatDate(p.date)} · ${p.type} · ${paymentPartyLabel(p.business)}`,
    })),
    resultLabel: 'Статус',
    resultValue: total > fg.cashOnAccounts ? 'Платежи больше остатка — нужны поступления или привлечение' : 'Остатка на счетах хватает на этот период',
    status: total > fg.cashOnAccounts ? 'warn' : 'good',
  };
}
