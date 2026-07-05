import { useMemo, useState } from 'react';
import type { DashboardData, FxImpactSummary } from '../types';
import { RoiDetailPanel } from '../components/RoiDetailPanel';
import { FxDetailPanel } from '../components/ExchangeRateBar';
import { formatMoney, formatDate } from '../utils/format';
import { accountBankLabel, paymentPartyLabel } from '../utils/productLabels';
import { buildFundingDetail, type FundingMetricId } from '../utils/fundingBreakdown';
import { rubBalanceForAccount } from '../utils/fxImpact';
import { Pagination } from '../components/Shared';

interface MoneyPageProps {
  data: DashboardData;
  fx: FxImpactSummary | null;
}

export function MoneyPage({ data, fx }: MoneyPageProps) {
  const [view, setView] = useState<'accounts' | 'payables' | 'inflows'>('accounts');
  const [page, setPage] = useState(0);
  const [metric, setMetric] = useState<FundingMetricId | 'fx' | null>(null);
  const PAGE = 10;

  const { fundingGap, bankAccounts, payables, cashPlan } = data;
  const usdRub = fx?.rate.usdRub ?? 92.5;
  const totalCash = bankAccounts.reduce((s, a) => s + rubBalanceForAccount(a, usdRub), 0);

  const detail = useMemo(
    () => (metric && metric !== 'fx' ? buildFundingDetail(data, metric) : null),
    [data, metric],
  );

  const payablesFiltered: Array<
    | (typeof payables)[0]
    | (typeof cashPlan)[0] & { creditor: string }
  > = useMemo(() => {
    if (view === 'inflows') {
      return cashPlan.map((c) => ({ ...c, creditor: c.client, type: c.type || 'поступление' }));
    }
    return payables;
  }, [view, payables, cashPlan]);

  const pageItems = payablesFiltered.slice(page * PAGE, (page + 1) * PAGE);

  if (metric === 'fx' && fx) {
    return (
      <>
        <h2 className="page-title">Деньги и платежи</h2>
        <FxDetailPanel fx={fx} onBack={() => setMetric(null)} />
      </>
    );
  }

  if (detail) {
    return (
      <>
        <h2 className="page-title">Деньги и платежи</h2>
        <RoiDetailPanel detail={detail} onBack={() => setMetric(null)} />
      </>
    );
  }

  const openMetric = (id: FundingMetricId) => setMetric(id);

  return (
    <>
      <h2 className="page-title">Деньги и платежи</h2>
      <p className="page-subtitle">Клик по сумме в сводке — полный расчёт. Курс USD подтягивается с сайта ЦБ.</p>

      <div className={`alert-box alert-${fundingGap.status}`}>
        <div className="alert-title">Сводка по деньгам</div>
        <div className="alert-grid alert-grid-clickable">
          <button type="button" className="alert-grid-btn" onClick={() => openMetric('freeAfterWeek')}>
            <span>На счетах</span><strong>{formatMoney(totalCash, true)}</strong>
          </button>
          <button type="button" className="alert-grid-btn" onClick={() => openMetric('paymentsToday')}>
            <span>Сегодня заплатить</span><strong className="text-danger">{formatMoney(fundingGap.paymentsToday, true)}</strong>
          </button>
          <button type="button" className="alert-grid-btn" onClick={() => openMetric('paymentsWeek')}>
            <span>До конца недели</span><strong>{formatMoney(fundingGap.paymentsThisWeek, true)}</strong>
          </button>
          <button type="button" className="alert-grid-btn" onClick={() => openMetric('gapMonth')}>
            <span>До конца месяца</span><strong>{formatMoney(fundingGap.paymentsThisMonth, true)}</strong>
          </button>
          <button type="button" className="alert-grid-btn" onClick={() => openMetric('inflowsWeek')}>
            <span>Ожидаем поступлений (нед.)</span><strong className="text-success">{formatMoney(fundingGap.expectedInflowsWeek, true)}</strong>
          </button>
          {fundingGap.needAttract > 0 && (
            <button type="button" className="alert-grid-btn alert-grid-btn-critical" onClick={() => openMetric('needAttract')}>
              <span>⚠ Привлечь</span><strong>{formatMoney(fundingGap.needAttract, true)} →</strong>
            </button>
          )}
        </div>
        {fundingGap.needAttract > 0 && (
          <p className="warehouse-storage-note" style={{ marginTop: 12 }}>
            <button type="button" className="link-btn" onClick={() => openMetric('needAttract')}>
              Как посчитано «Привлечь»?
            </button>
            {' '}— платежи недели минус деньги на счетах минус {fundingGap.inflowProbabilityPct ?? 70}% ожидаемых поступлений.
          </p>
        )}
      </div>

      {fx && (
        <div className="chart-card" style={{ marginBottom: 20 }}>
          <div className="chart-title">Валютный эффект (ЦБ)</div>
          <div className="fx-summary-row">
            <span>USD {fx.rate.usdRub.toFixed(2)} ₽</span>
            {fx.rate.eurRub != null && <span>EUR {fx.rate.eurRub.toFixed(2)} ₽</span>}
            <span className={fx.gainLossRub >= 0 ? 'text-success' : 'text-danger'}>{fx.gainLossLabel}</span>
            <button type="button" className="link-btn" onClick={() => setMetric('fx')}>Детализация позиций →</button>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        {bankAccounts.map((a) => {
          const rub = rubBalanceForAccount(a, usdRub);
          return (
            <div key={a.name} className="kpi-card">
              <div className="kpi-label">{a.name}</div>
              <div className="kpi-value">{formatMoney(rub, true)}</div>
              <div className="kpi-change">
                {accountBankLabel(a)}
                {a.currency === 'USD' && a.foreignAmount != null && (
                  <> · {a.foreignAmount.toLocaleString('ru-RU')} $ × {usdRub.toFixed(2)}</>
                )}
              </div>
            </div>
          );
        })}
        <button type="button" className="kpi-card kpi-card-clickable" onClick={() => openMetric('freeAfterWeek')}>
          <div className="kpi-label">Свободно после недели</div>
          <div className="kpi-value">{formatMoney(totalCash + fundingGap.expectedInflowsWeek - fundingGap.paymentsThisWeek, true)}</div>
          <div className="kpi-change">Прогноз на 7 дней · подробнее →</div>
        </button>
      </div>

      <div className="inline-tabs">
        <button type="button" className={`inline-tab ${view === 'accounts' ? 'active' : ''}`} onClick={() => { setView('accounts'); setPage(0); }}>Счета</button>
        <button type="button" className={`inline-tab ${view === 'payables' ? 'active' : ''}`} onClick={() => { setView('payables'); setPage(0); }}>Обязательства (исходящие)</button>
        <button type="button" className={`inline-tab ${view === 'inflows' ? 'active' : ''}`} onClick={() => { setView('inflows'); setPage(0); }}>Поступления (график)</button>
      </div>

      {view !== 'accounts' && (
        <div className="table-section">
          <table className="data-table">
            <thead>
              <tr>
                <th>{view === 'inflows' ? 'Клиент' : 'Кредитор'}</th>
                <th>Дата</th>
                <th>Тип</th>
                <th>Банк</th>
                <th className="text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p, i) => (
                <tr key={i}>
                  <td className="font-medium">{('creditor' in p && p.creditor) ? p.creditor : ('client' in p ? p.client : '—')}</td>
                  <td>{formatDate(p.date)}</td>
                  <td>{p.type}</td>
                  <td>{paymentPartyLabel(p.business)}</td>
                  <td className="text-right">{formatMoney(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={Math.ceil(payablesFiltered.length / PAGE)} total={payablesFiltered.length} onPage={setPage} />
        </div>
      )}
    </>
  );
}
