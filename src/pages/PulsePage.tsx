import type { DashboardData, FxImpactSummary } from '../types';
import { InsightsPanel, ProgressBar } from '../components/Shared';
import { formatMoney, formatPercent, formatDate } from '../utils/format';

export function PulsePage({ data, fx }: { data: DashboardData; fx?: FxImpactSummary | null }) {
  const { fundingGap, yesterday, salesPlan, turnover, roi } = data;

  return (
    <>
      <div className="promo-banner">
        <div>
          <h3>Управленка · {formatDate(data.kpi.reportDate)}</h3>
          <p>Пульс компании: деньги, маржа, план, тревоги</p>
        </div>
        <button type="button" className="promo-btn" onClick={() => alert('Запустите: npm run extract — после авто-выгрузки из 1С')}>
          Обновить из 1С
        </button>
      </div>

      <InsightsPanel insights={data.insights} />

      <div className={`alert-box alert-${fundingGap.status}`}>
        <div className="alert-title">
          {fundingGap.status === 'ok' ? '✓ Денег на ближайшие платежи достаточно' : '⚠ Нужно внимание к деньгам'}
        </div>
        <div className="alert-grid">
          <div><span>На счетах</span><strong>{formatMoney(fundingGap.cashOnAccounts, true)}</strong></div>
          <div><span>Платить сегодня</span><strong>{formatMoney(fundingGap.paymentsToday, true)}</strong></div>
          <div><span>До конца недели</span><strong>{formatMoney(fundingGap.paymentsThisWeek, true)}</strong></div>
          <div><span>До конца месяца</span><strong>{formatMoney(fundingGap.paymentsThisMonth, true)}</strong></div>
          {fundingGap.needAttract > 0 && (
            <div className="alert-critical">
              <span>Привлечь</span><strong>{formatMoney(fundingGap.needAttract, true)}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="kpi-grid">
        {fx && (
          <div className="kpi-card">
            <div className="kpi-label">Курсы ЦБ</div>
            <div className="kpi-value">{fx.rate.usdRub.toFixed(2)} / {fx.rate.eurRub?.toFixed(2) ?? '—'} ₽</div>
            <div className="kpi-change">USD / EUR · {fx.gainLossLabel}</div>
          </div>
        )}
        <div className="kpi-card">
          <div className="kpi-label">Рентабельность вчера ({formatDate(yesterday.date)})</div>
          <div className="kpi-value">{formatMoney(yesterday.profit, true)}</div>
          <div className="kpi-change">Маржа {formatPercent(yesterday.marginPct, false)} · Выручка {formatMoney(yesterday.revenue, true)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">План продаж (месяц)</div>
          <div className="kpi-value">{formatPercent((salesPlan.factRevenue / salesPlan.planRevenue) * 100, false)}</div>
          <div className={`kpi-change ${salesPlan.gapRevenue >= 0 ? 'positive' : 'negative'}`}>
            {salesPlan.gapRevenue >= 0 ? '+' : ''}{formatMoney(salesPlan.gapRevenue, true)} к календарю
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Дебиторка</div>
          <div className="kpi-value">{formatMoney(data.kpi.totalReceivables, true)}</div>
          <div className="kpi-change negative">Оборот {turnover.receivableDays} дн. (норма {turnover.receivableNorm})</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Общий ROI (май)</div>
          <div className="kpi-value">{formatPercent(roi[0].roiPct, false)}</div>
          <div className="kpi-change">Цель {formatPercent(roi[0].targetPct, false)} / мес</div>
        </div>
      </div>

      <div className="section-grid">
        <div className="chart-card">
          <div className="chart-title">План vs факт (кратко)</div>
          <ProgressBar label="Выручка" fact={salesPlan.factRevenue} plan={salesPlan.planRevenue} />
          <ProgressBar label="Отгрузка, кг" fact={salesPlan.factKg} plan={salesPlan.planKg} unit="кг" />
          <ProgressBar label="Маржа" fact={salesPlan.factMarginPct} plan={salesPlan.planMarginPct} unit="%" />
        </div>
        <div className="chart-card">
          <div className="chart-title">ROI по типам денег</div>
          <table className="data-table">
            <thead><tr><th>Тип</th><th className="text-right">ROI</th><th className="text-right">Цель</th><th>Статус</th></tr></thead>
            <tbody>
              {roi.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td className="text-right font-medium">{formatPercent(r.roiPct, false)}</td>
                  <td className="text-right text-muted">{formatPercent(r.targetPct, false)}</td>
                  <td><span className={`status-pill ${r.status === 'good' ? 'completed' : r.status === 'warn' ? 'pending' : 'cancelled'}`}>{r.status === 'good' ? 'OK' : r.status === 'warn' ? 'Внимание' : 'Плохо'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
