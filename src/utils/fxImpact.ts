import type { DashboardData, FxExposureItem, FxImpactSummary, FxRateSnapshot } from '../types';

function rateChangePct(current: number, previous: number | null): number {
  if (!previous || previous <= 0) return 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

/** Валютные позиции и переоценка при изменении курса ЦБ */
export function buildFxImpact(
  data: DashboardData,
  rate: FxRateSnapshot,
  previous: FxRateSnapshot | null,
): FxImpactSummary {
  const prevUsd = previous?.usdRub ?? rate.usdRub;
  const prevEur = previous?.eurRub ?? rate.eurRub ?? prevUsd * 1.08;
  const exposures: FxExposureItem[] = [];

  for (const acc of data.bankAccounts) {
    if (acc.currency === 'USD' && acc.foreignAmount) {
      exposures.push({
        label: acc.name,
        currency: 'USD',
        amountFx: acc.foreignAmount,
        amountRub: acc.foreignAmount * rate.usdRub,
        type: 'asset',
        note: 'Деньги на валютном счёте',
      });
    }
  }

  const importPayablesUsd = data.payables
    .filter((p) => /тамож|импорт|валют|китай|usd|\$/i.test(p.creditor + p.type))
    .reduce((s, p) => s + p.amount, 0);
  if (importPayablesUsd > 0) {
    const usdPart = importPayablesUsd / rate.usdRub;
    exposures.push({
      label: 'Обязательства импорт / таможня',
      currency: 'USD',
      amountFx: Math.round(usdPart),
      amountRub: importPayablesUsd,
      type: 'liability',
      note: 'Оценка: считаем в рублях, часть — валютный контракт',
    });
  }

  const creditUsdShare = data.creditDebt * 0.35;
  exposures.push({
    label: 'Кредиты (доля в валюте, оценка 35%)',
    currency: 'USD',
    amountFx: Math.round(creditUsdShare / rate.usdRub),
    amountRub: creditUsdShare,
    type: 'liability',
    note: 'Тело кредита под импортные закупки',
  });

  const inTransitUsd = data.turnover.inTransitRub * 0.55;
  if (inTransitUsd > 0) {
    exposures.push({
      label: 'Товар в пути (закупки в $, оценка 55%)',
      currency: 'USD',
      amountFx: Math.round(inTransitUsd / rate.usdRub),
      amountRub: inTransitUsd,
      type: 'asset',
      note: 'Пока не приехал — переоценивается по курсу',
    });
  }

  let gainLossRub = 0;
  for (const item of exposures) {
    const delta = item.amountFx * (rate.usdRub - prevUsd);
    gainLossRub += item.type === 'asset' ? delta : -delta;
  }
  gainLossRub = Math.round(gainLossRub);

  const totalUsdAssetsRub = exposures.filter((e) => e.type === 'asset').reduce((s, e) => s + e.amountRub, 0);
  const totalUsdLiabilitiesRub = exposures.filter((e) => e.type === 'liability').reduce((s, e) => s + e.amountRub, 0);

  return {
    rate,
    previousRate: previous,
    rateChangePct: rateChangePct(rate.usdRub, prevUsd),
    eurChangePct: rate.eurRub ? rateChangePct(rate.eurRub, prevEur) : 0,
    exposures,
    totalUsdAssetsRub,
    totalUsdLiabilitiesRub,
    netFxExposureRub: totalUsdAssetsRub - totalUsdLiabilitiesRub,
    gainLossRub,
    gainLossLabel:
      gainLossRub > 0
        ? `Курс ↑ — переоценка дала +${Math.abs(gainLossRub).toLocaleString('ru-RU')} ₽`
        : gainLossRub < 0
          ? `Курс ↓ — переоценка дала −${Math.abs(gainLossRub).toLocaleString('ru-RU')} ₽`
          : 'Курс без изменений — переоценка нулевая',
  };
}

export function rubBalanceForAccount(
  acc: DashboardData['bankAccounts'][0],
  usdRub: number,
): number {
  if (acc.currency === 'USD' && acc.foreignAmount) return Math.round(acc.foreignAmount * usdRub);
  return acc.balance;
}
