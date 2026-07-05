import type { FxImpactSummary } from '../types';
import { formatMoney } from '../utils/format';

interface ExchangeRateBarProps {
  fx: FxImpactSummary | null;
  loading?: boolean;
  onDetail?: () => void;
}

function changeClass(pct: number): string {
  if (pct > 0) return 'text-danger';
  if (pct < 0) return 'text-success';
  return '';
}

function formatChange(pct: number): string {
  if (pct === 0) return '';
  return `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`;
}

export function ExchangeRateBar({ fx, loading, onDetail }: ExchangeRateBarProps) {
  if (loading) {
    return <div className="fx-bar fx-bar-loading">Курс ЦБ: загрузка…</div>;
  }
  if (!fx) return null;

  const { rate, rateChangePct, eurChangePct, gainLossRub, gainLossLabel } = fx;

  return (
    <button type="button" className="fx-bar" onClick={onDetail} title="Клик — детализация валютных позиций">
      <span className="fx-bar-pair">
        <span className="fx-bar-label">USD</span>
        <strong>{rate.usdRub.toFixed(2)} ₽</strong>
        {rateChangePct !== 0 && (
          <span className={`fx-bar-change ${changeClass(rateChangePct)}`}>{formatChange(rateChangePct)}</span>
        )}
      </span>
      {rate.eurRub != null && (
        <>
          <span className="fx-bar-divider">·</span>
          <span className="fx-bar-pair">
            <span className="fx-bar-label">EUR</span>
            <strong>{rate.eurRub.toFixed(2)} ₽</strong>
            {eurChangePct !== 0 && (
              <span className={`fx-bar-change ${changeClass(eurChangePct)}`}>{formatChange(eurChangePct)}</span>
            )}
          </span>
        </>
      )}
      <span className="fx-bar-divider">|</span>
      <span className={`fx-bar-impact ${gainLossRub >= 0 ? 'text-success' : 'text-danger'}`}>
        {gainLossLabel}
      </span>
      {onDetail && <span className="fx-bar-more">→</span>}
    </button>
  );
}

export function FxDetailPanel({ fx, onBack }: { fx: FxImpactSummary; onBack: () => void }) {
  const prevUsd = fx.previousRate?.usdRub;
  const prevEur = fx.previousRate?.eurRub;

  return (
    <div className="client-detail">
      <button type="button" className="client-detail-back" onClick={onBack}>← Назад</button>
      <h3 className="client-detail-title">Курс и валютные позиции</h3>
      <p className="page-subtitle">
        Курсы USD и EUR — официальный ЦБ РФ на {fx.rate.fetchedAt}.
        Переоценка в $ позициях — что изменилось в рублях из‑за курса доллара.
      </p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">USD (ЦБ)</div>
          <div className="kpi-value">{fx.rate.usdRub.toFixed(4)} ₽</div>
          {prevUsd != null && <div className="kpi-change">Было {prevUsd.toFixed(4)} ₽</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">EUR (ЦБ)</div>
          <div className="kpi-value">{fx.rate.eurRub?.toFixed(4) ?? '—'} ₽</div>
          {prevEur != null && fx.rate.eurRub != null && <div className="kpi-change">Было {prevEur.toFixed(4)} ₽</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">USD за период</div>
          <div className={`kpi-value ${changeClass(fx.rateChangePct)}`}>
            {fx.rateChangePct > 0 ? '+' : ''}{fx.rateChangePct.toFixed(2)}%
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">EUR за период</div>
          <div className={`kpi-value ${changeClass(fx.eurChangePct)}`}>
            {fx.eurChangePct > 0 ? '+' : ''}{fx.eurChangePct.toFixed(2)}%
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Переоценка $ позиций</div>
          <div className={`kpi-value ${fx.gainLossRub >= 0 ? 'text-success' : 'text-danger'}`}>
            {formatMoney(fx.gainLossRub, true)}
          </div>
          <div className="kpi-change">{fx.gainLossLabel}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Чистая $ позиция</div>
          <div className="kpi-value">{formatMoney(fx.netFxExposureRub, true)}</div>
          <div className="kpi-change">активы − обязательства в ₽</div>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Что переоцениваем (в долларах)</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Позиция</th>
              <th>Тип</th>
              <th className="text-right">USD</th>
              <th className="text-right">В ₽ по курсу</th>
              <th>Примечание</th>
            </tr>
          </thead>
          <tbody>
            {fx.exposures.map((e) => (
              <tr key={e.label}>
                <td>{e.label}</td>
                <td>{e.type === 'asset' ? 'Актив' : 'Долг'}</td>
                <td className="text-right">{e.amountFx.toLocaleString('ru-RU')} $</td>
                <td className="text-right">{formatMoney(e.amountRub, true)}</td>
                <td className="text-muted">{e.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="warehouse-storage-note">
          Курс USD ↑: валютные деньги и товар в пути дорожают в ₽ (плюс), валютные долги тоже дорожают (минус).
          EUR показываем для закупок и контрактов в евро; переоценка портфеля считается по USD.
        </p>
      </div>
    </div>
  );
}
