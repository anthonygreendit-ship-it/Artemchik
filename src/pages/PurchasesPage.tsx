import { useMemo } from 'react';
import type { DashboardData, InTransitItem } from '../types';
import { formatMoney, formatNumber, formatPercent, formatDate } from '../utils/format';

const STATUS_LABELS: Record<NonNullable<InTransitItem['deliveryStatus']>, string> = {
  planned: 'Плановая привозка',
  in_transit: 'В пути',
  customs: 'На таможне',
  delayed: 'Задержка',
};

const STATUS_CLASS: Record<NonNullable<InTransitItem['deliveryStatus']>, string> = {
  planned: 'delivery-planned',
  in_transit: 'delivery-transit',
  customs: 'delivery-customs',
  delayed: 'delivery-delayed',
};

export function PurchasesPage({ data }: { data: DashboardData }) {
  const inTransit = data.inTransit.filter((t) => t.section === 'in_transit');
  const warehouse = data.inTransit.filter((t) => t.section === 'warehouse');
  const inTransitSum = inTransit.reduce((s, t) => s + (t.cost ?? 0), 0);
  const warehouseSum = warehouse.reduce((s, t) => s + (t.cost ?? 0), 0);

  const deliveryCards = useMemo(() => {
    return [...inTransit]
      .sort((a, b) => (a.plannedArrival ?? '').localeCompare(b.plannedArrival ?? ''))
      .slice(0, 8);
  }, [inTransit]);

  const upcomingByDate = useMemo(() => {
    const map = new Map<string, InTransitItem[]>();
    for (const item of inTransit) {
      const date = item.plannedArrival ?? '—';
      const list = map.get(date) ?? [];
      list.push(item);
      map.set(date, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [inTransit]);

  return (
    <>
      <h2 className="page-title">Закупки · товар в пути</h2>
      <p className="page-subtitle">Плановые даты привоза и статус каждой партии</p>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">В пути (не продано)</div>
          <div className="kpi-value">{formatMoney(inTransitSum, true)}</div>
          <div className="kpi-change">{formatNumber(inTransit.reduce((s, t) => s + t.qty, 0))} кг</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Плановых привозок</div>
          <div className="kpi-value">{inTransit.filter((t) => t.deliveryStatus === 'planned').length}</div>
          <div className="kpi-change">ближайшие 2 недели</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">На таможне / задержка</div>
          <div className="kpi-value text-danger">
            {inTransit.filter((t) => t.deliveryStatus === 'customs' || t.deliveryStatus === 'delayed').length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">На складе (не продано)</div>
          <div className="kpi-value">{formatMoney(warehouseSum, true)}</div>
        </div>
      </div>

      <div className="delivery-cards">
        {deliveryCards.map((t) => (
          <div key={`${t.product}-${t.plannedArrival}`} className={`delivery-card ${STATUS_CLASS[t.deliveryStatus ?? 'in_transit']}`}>
            <div className="delivery-card-top">
              <span className={`delivery-badge ${STATUS_CLASS[t.deliveryStatus ?? 'in_transit']}`}>
                {STATUS_LABELS[t.deliveryStatus ?? 'in_transit']}
              </span>
              <span className="delivery-date">{formatDate(t.plannedArrival)}</span>
            </div>
            <div className="delivery-product">{t.product.slice(0, 42)}</div>
            <div className="delivery-meta">
              <span>{formatNumber(t.qty)} кг</span>
              <span>{t.origin ?? t.supplier ?? '—'}</span>
              <strong>{formatMoney(t.cost ?? t.amount, true)}</strong>
            </div>
            {t.daysToArrival != null && (
              <div className="delivery-days">через {t.daysToArrival} дн.</div>
            )}
          </div>
        ))}
      </div>

      <div className="section-grid">
        <div className="table-section">
          <div className="table-header"><div className="table-title">График привозов</div></div>
          {upcomingByDate.map(([date, items]) => (
            <div key={date} className="delivery-group">
              <div className="delivery-group-date">{formatDate(date)} · {items.length} партий · {formatMoney(items.reduce((s, i) => s + (i.cost ?? 0), 0), true)}</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>Статус</th>
                    <th>Откуда</th>
                    <th className="text-right">Кг</th>
                    <th className="text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => (
                    <tr key={`${date}-${t.product}`}>
                      <td>{t.product}</td>
                      <td><span className={`delivery-badge ${STATUS_CLASS[t.deliveryStatus ?? 'in_transit']}`}>{STATUS_LABELS[t.deliveryStatus ?? 'in_transit']}</span></td>
                      <td>{t.origin ?? t.supplier ?? '—'}</td>
                      <td className="text-right">{formatNumber(t.qty)}</td>
                      <td className="text-right">{formatMoney(t.cost ?? t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="table-section">
          <div className="table-header"><div className="table-title">Незавершённые сделки</div></div>
          <table className="data-table">
            <thead><tr><th>Клиент</th><th>Товар</th><th className="text-right">Сумма</th><th className="text-right">Маржа</th></tr></thead>
            <tbody>
              {data.openDeals.slice(0, 12).map((d, i) => (
                <tr key={i}>
                  <td>{d.client}</td>
                  <td>{(d.product ?? d.order ?? '—').slice(0, 35)}</td>
                  <td className="text-right">{formatMoney(d.amount)}</td>
                  <td className={`text-right ${(d.margin ?? 0) < 10 ? 'text-danger' : 'text-success'}`}>{formatPercent(d.margin ?? 0, false)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
