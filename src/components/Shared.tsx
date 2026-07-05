import type { Insight } from '../types';

export function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (!insights.length) return null;
  return (
    <div className="insights-panel">
      <div className="insights-title">Умные выводы</div>
      {insights.map((item, i) => (
        <div key={i} className={`insight insight-${item.type}`}>
          {item.text}
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({
  label,
  fact,
  plan,
  unit = '₽',
}: {
  label: string;
  fact: number;
  plan: number;
  unit?: string;
}) {
  const pct = plan > 0 ? Math.min(100, (fact / plan) * 100) : 0;
  const status = pct >= 95 ? 'good' : pct >= 80 ? 'warn' : 'bad';
  return (
    <div className="progress-block">
      <div className="progress-header">
        <span>{label}</span>
        <span className={`progress-pct progress-${status}`}>{pct.toFixed(0)}%</span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill progress-${status}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-footer">
        Факт: {fact.toLocaleString('ru-RU')} {unit} / План: {plan.toLocaleString('ru-RU')} {unit}
      </div>
    </div>
  );
}

export function PeriodTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const periods = ['today', 'yesterday', 'week', 'prev_week', 'month', 'all'] as const;
  return (
    <div className="period-tabs">
      {periods.map((p) => (
        <button
          key={p}
          type="button"
          className={`period-tab ${value === p ? 'active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p === 'today' && 'Сегодня'}
          {p === 'yesterday' && 'Вчера'}
          {p === 'week' && 'Неделя'}
          {p === 'prev_week' && 'Пред. неделя'}
          {p === 'month' && 'Месяц'}
          {p === 'all' && 'Вся история'}
        </button>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="table-footer">
      <button type="button" className="pagination-btn" disabled={page === 0} onClick={() => onPage(page - 1)}>
        ← Назад
      </button>
      <span className="pagination-info">
        {page + 1} / {Math.max(totalPages, 1)} · {total} записей
      </span>
      <button
        type="button"
        className="pagination-btn"
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
      >
        Вперёд →
      </button>
    </div>
  );
}
