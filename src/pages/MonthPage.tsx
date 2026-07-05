import type { DashboardData } from '../types';
import { Charts } from '../components/Charts';
import { formatMoney } from '../utils/format';
import { MONTHS } from '../utils/format';

export function MonthPage({ data }: { data: DashboardData }) {
  const date = '2026-05-29';
  const active = data.operBalance2026.totalActive[date];
  const passive = data.operBalance2026.totalPassive[date];

  const topActive = data.operBalance2026.active
    .filter((a) => a.values[date] && a.values[date]! > 500000)
    .sort((a, b) => (b.values[date] ?? 0) - (a.values[date] ?? 0))
    .slice(0, 8);

  const topPassive = data.operBalance2026.passive
    .filter((a) => a.values[date] && a.values[date]! > 500000)
    .sort((a, b) => (b.values[date] ?? 0) - (a.values[date] ?? 0))
    .slice(0, 8);

  return (
    <>
      <h2 className="page-title">Месяц · оперсрез и баланс</h2>
      <Charts data={data} />

      <div className="section-grid" style={{ marginTop: 20 }}>
        <div className="chart-card">
          <div className="chart-title">Опербаланс — Актив</div>
          <div className="big-number purple">{formatMoney(active)}</div>
          <table className="data-table">
            <tbody>
              {topActive.map((item) => (
                <tr key={item.name}><td>{item.name}</td><td className="text-right">{formatMoney(item.values[date])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="chart-card">
          <div className="chart-title">Опербаланс — Пассив</div>
          <div className="big-number violet">{formatMoney(passive)}</div>
          <table className="data-table">
            <tbody>
              {topPassive.map((item) => (
                <tr key={item.name}><td>{item.name}</td><td className="text-right">{formatMoney(item.values[date])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 20 }}>
        <div className="chart-title">Выручка по месяцам (ИТОГО)</div>
        <table className="data-table">
          <thead><tr><th>Месяц</th><th className="text-right">Выручка</th><th className="text-right">Наценка</th></tr></thead>
          <tbody>
            {MONTHS.map((m) => (
              <tr key={m}>
                <td>{m}</td>
                <td className="text-right">{formatMoney(data.operSlice2026['Выручка (отгрузка) ИТОГО']?.[m])}</td>
                <td className="text-right">{formatMoney(data.operSlice2026['Оперативная наценка']?.[m])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-card" style={{ marginTop: 20 }}>
        <div className="chart-title">Расходы собственника (2026)</div>
        <table className="data-table">
          <tbody>
            {Object.entries(data.ownerExpenseTotals).map(([month, total]) => (
              <tr key={month}><td>{month}</td><td className="text-right">{formatMoney(total)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
