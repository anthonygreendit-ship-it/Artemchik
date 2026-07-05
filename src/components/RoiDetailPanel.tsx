import type { RoiDetailView } from '../types';
import { formatMoney } from '../utils/format';

interface RoiDetailPanelProps {
  detail: RoiDetailView;
  onBack: () => void;
}

export function RoiDetailPanel({ detail, onBack }: RoiDetailPanelProps) {
  return (
    <div className="client-detail roi-detail">
      <button type="button" className="client-detail-back" onClick={onBack}>
        ← Назад к обзору
      </button>

      <div className="client-detail-header">
        <div>
          <h3 className="client-detail-title">{detail.title}</h3>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>{detail.subtitle}</p>
          <span className="roi-detail-period">Период: {detail.period}</span>
        </div>
        {detail.status && (
          <span className={`status-pill ${detail.status === 'good' ? 'completed' : detail.status === 'warn' ? 'pending' : 'cancelled'}`}>
            {detail.status === 'good' ? 'OK' : detail.status === 'warn' ? 'Внимание' : 'Риск'}
          </span>
        )}
      </div>

      <div className="chart-card roi-formula-card">
        <div className="chart-title">Формула</div>
        <code className="roi-formula">{detail.formula}</code>
        <div className="roi-steps">
          {detail.steps.map((step) => (
            <div key={step.label} className={`roi-step ${step.highlight ? 'roi-step-highlight' : ''}`}>
              <span>{step.label}</span>
              <strong>{step.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {detail.lines.length > 0 && (
        <div className="chart-card">
          <div className="chart-title">Детализация</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Статья</th>
                <th className="text-right">Сумма / значение</th>
                <th className="text-right">Доля</th>
                <th>Примечание</th>
              </tr>
            </thead>
            <tbody>
              {detail.lines.map((line, i) => (
                <tr key={`${line.label}-${i}`} className={line.amount < 0 ? 'row-warn' : ''}>
                  <td className="font-medium">{line.label}</td>
                  <td className={`text-right ${line.amount < 0 ? 'text-danger' : ''}`}>
                    {Math.abs(line.amount) >= 1000 ? formatMoney(line.amount, true) : line.amount.toFixed(1)}
                  </td>
                  <td className="text-right text-muted">
                    {line.sharePct != null ? `${line.sharePct}%` : '—'}
                  </td>
                  <td className="text-muted">{line.meta ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={`roi-result-banner ${detail.status ? `roi-result-${detail.status}` : ''}`}>
        <div className="roi-result-label">{detail.resultLabel}</div>
        <div className="roi-result-value">{detail.resultValue}</div>
        {detail.footnote && <p className="roi-result-footnote">{detail.footnote}</p>}
      </div>
    </div>
  );
}
