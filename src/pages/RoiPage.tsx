import { useMemo, useState } from 'react';
import type { DashboardData } from '../types';
import { InsightsPanel } from '../components/Shared';
import { RoiDetailPanel } from '../components/RoiDetailPanel';
import { formatMoney, formatPercent, formatNumber } from '../utils/format';
import { buildDetail, type RoiPageSelection } from '../utils/roiBreakdown';

export function RoiPage({ data }: { data: DashboardData }) {
  const { roi, turnover, fundingGap, creditDebt, investorCapital } = data;
  const [selection, setSelection] = useState<RoiPageSelection | null>(null);

  const detail = useMemo(
    () => (selection ? buildDetail(data, selection) : null),
    [data, selection],
  );

  if (detail && selection) {
    return (
      <>
        <h2 className="page-title">ROI и оборачиваемость денег</h2>
        <RoiDetailPanel detail={detail} onBack={() => setSelection(null)} />
      </>
    );
  }

  return (
    <>
      <h2 className="page-title">ROI и оборачиваемость денег</h2>
      <p className="page-subtitle">Нажмите на любую строку или карточку — откроется расчёт и детализация</p>
      <InsightsPanel insights={data.insights.filter((i) => i.text.includes('ROI') || i.text.includes('оборачива'))} />

      <div className="section-grid">
        <div className="chart-card">
          <div className="chart-title">ROI по типам капитала (май 2026)</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Тип денег</th>
                <th className="text-right">Прибыль</th>
                <th className="text-right">Капитал</th>
                <th className="text-right">ROI</th>
                <th className="text-right">Цель</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {roi.map((r) => (
                <tr
                  key={r.id}
                  className="row-clickable"
                  onClick={() => setSelection({ kind: 'roi', id: r.id })}
                >
                  <td className="font-medium">
                    {r.label}
                    <span className="row-drill-hint">Подробнее →</span>
                  </td>
                  <td className="text-right">{formatMoney(r.profit, true)}</td>
                  <td className="text-right">{formatMoney(r.capital, true)}</td>
                  <td className={`text-right font-medium ${r.status === 'good' ? 'text-success' : r.status === 'bad' ? 'text-danger' : ''}`}>{formatPercent(r.roiPct, false)}</td>
                  <td className="text-right text-muted">{formatPercent(r.targetPct, false)}</td>
                  <td><span className={`status-pill ${r.status === 'good' ? 'completed' : r.status === 'warn' ? 'pending' : 'cancelled'}`}>{r.status === 'good' ? 'OK' : r.status === 'warn' ? 'Слабо' : 'Плохо'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="chart-card">
          <div className="chart-title">Структура капитала (оценка)</div>
          <div className="stat-list">
            <button type="button" className="stat-row stat-row-clickable" onClick={() => setSelection({ kind: 'roi', id: 'capital' })}>
              <span>Кредитные обязательства</span>
              <strong>{formatMoney(creditDebt, true)} →</strong>
            </button>
            <button type="button" className="stat-row stat-row-clickable" onClick={() => setSelection({ kind: 'roi', id: 'investor' })}>
              <span>Инвестор / собственник</span>
              <strong>{formatMoney(investorCapital, true)} →</strong>
            </button>
            <button type="button" className="stat-row stat-row-clickable" onClick={() => setSelection({ kind: 'turnover', id: 'receivables' })}>
              <span>Дебиторка</span>
              <strong>{formatMoney(data.kpi.totalReceivables, true)} →</strong>
            </button>
            <button type="button" className="stat-row stat-row-clickable" onClick={() => setSelection({ kind: 'roi', id: 'cash' })}>
              <span>Деньги на счетах</span>
              <strong>{formatMoney(fundingGap.cashOnAccounts, true)} →</strong>
            </button>
          </div>
          <p className="warehouse-storage-note">Клик по строке — как посчитана оценка и из чего складывается сумма.</p>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 20 }}>
        <div className="chart-title">Оборачиваемость (эффективность денег)</div>
        <div className="kpi-grid">
          <button
            type="button"
            className={`kpi-card kpi-card-clickable ${turnover.receivableDays > turnover.receivableNorm ? 'kpi-card-warn' : ''}`}
            onClick={() => setSelection({ kind: 'turnover', id: 'receivables' })}
          >
            <div className="kpi-label">Дебиторка, дней</div>
            <div className={`kpi-value ${turnover.receivableDays > turnover.receivableNorm ? 'text-danger' : ''}`}>{turnover.receivableDays}</div>
            <div className="kpi-change">Норма {turnover.receivableNorm} дн. · подробнее →</div>
          </button>
          <button
            type="button"
            className={`kpi-card kpi-card-clickable ${turnover.stockDays > turnover.stockNorm ? 'kpi-card-warn' : ''}`}
            onClick={() => setSelection({ kind: 'turnover', id: 'stock' })}
          >
            <div className="kpi-label">Склад, дней</div>
            <div className={`kpi-value ${turnover.stockDays > turnover.stockNorm ? 'text-danger' : ''}`}>{turnover.stockDays}</div>
            <div className="kpi-change">Норма {turnover.stockNorm} дн. · подробнее →</div>
          </button>
          <button
            type="button"
            className="kpi-card kpi-card-clickable"
            onClick={() => setSelection({ kind: 'turnover', id: 'in-transit' })}
          >
            <div className="kpi-label">Товар в пути</div>
            <div className="kpi-value">{formatMoney(turnover.inTransitRub, true)}</div>
            <div className="kpi-change">Заморожено в логистике · подробнее →</div>
          </button>
          <button
            type="button"
            className="kpi-card kpi-card-clickable"
            onClick={() => setSelection({ kind: 'turnover', id: 'deal-cycle' })}
          >
            <div className="kpi-label">Цикл сделки</div>
            <div className="kpi-value">{turnover.dealCycleDays} дн.</div>
            <div className="kpi-change">Закупка → оплата клиента · подробнее →</div>
          </button>
        </div>
        {turnover.receivableDays > turnover.receivableNorm && (
          <div className="insight insight-warning" style={{ marginTop: 16 }}>
            Деньги оборачиваются неэффективно: {formatNumber(turnover.receivableDays - turnover.receivableNorm)} лишних дней в дебиторке.
            {' '}<button type="button" className="link-btn" onClick={() => setSelection({ kind: 'turnover', id: 'receivables' })}>Смотреть расчёт →</button>
          </div>
        )}
      </div>
    </>
  );
}
