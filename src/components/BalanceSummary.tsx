import type { DashboardData } from '../types';
import { formatMoney, formatDate } from '../utils/format';

interface BalanceSummaryProps {
  data: DashboardData;
}

export function BalanceSummary({ data }: BalanceSummaryProps) {
  const { operBalance2026 } = data;
  const date = '2026-05-29';
  const active = operBalance2026.totalActive[date];
  const passive = operBalance2026.totalPassive[date];

  const topActive = operBalance2026.active
    .filter((a) => a.values[date] && a.values[date]! > 100000)
    .sort((a, b) => (b.values[date] ?? 0) - (a.values[date] ?? 0))
    .slice(0, 5);

  const topPassive = operBalance2026.passive
    .filter((a) => a.values[date] && a.values[date]! > 100000)
    .sort((a, b) => (b.values[date] ?? 0) - (a.values[date] ?? 0))
    .slice(0, 5);

  return (
    <div className="section-grid">
      <div className="chart-card">
        <div className="chart-title">Опербаланс — Актив ({formatDate(date)})</div>
        <div style={{ marginBottom: 12, fontSize: 22, fontWeight: 700, color: '#6366f1' }}>
          {formatMoney(active)}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Статья</th>
              <th className="text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {topActive.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td className="text-right">{formatMoney(item.values[date])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="chart-card">
        <div className="chart-title">Опербаланс — Пассив ({formatDate(date)})</div>
        <div style={{ marginBottom: 12, fontSize: 22, fontWeight: 700, color: '#a855f7' }}>
          {formatMoney(passive)}
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Статья</th>
              <th className="text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {topPassive.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td className="text-right">{formatMoney(item.values[date])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
