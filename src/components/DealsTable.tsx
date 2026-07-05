import { useMemo, useState } from 'react';
import type { Deal, BusinessTab } from '../types';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

interface DealsTableProps {
  deals: Deal[];
  search: string;
  businessTab: BusinessTab;
}

const PAGE_SIZE = 8;

export function DealsTable({ deals, search, businessTab }: DealsTableProps) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let items = deals;
    if (businessTab === 'ml') items = items.filter((d) => d.business === 'МЛ');
    if (businessTab === 'fb') items = items.filter((d) => d.business === 'ФБ');
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (d) =>
          (d.client?.toLowerCase().includes(q) ?? false) ||
          (d.product?.toLowerCase().includes(q) ?? false) ||
          (d.order?.toLowerCase().includes(q) ?? false),
      );
    }
    return items;
  }, [deals, search, businessTab]);

  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="table-section">
      <div className="table-header">
        <div className="table-title">Личные сделки — рентабельность</div>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Контрагент</th>
            <th>Товар / заказ</th>
            <th className="text-right">Кол-во</th>
            <th className="text-right">Сумма</th>
            <th className="text-right">Себест.</th>
            <th className="text-right">Прибыль</th>
            <th className="text-right">Маржа</th>
            <th>ЮЛ</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((d, i) => (
            <tr key={`${d.client}-${d.product}-${i}`}>
              <td className="font-medium">{d.client ?? '—'}</td>
              <td>
                <div>{d.product ?? d.order ?? '—'}</div>
                {d.order && d.product && (
                  <div className="text-muted" style={{ fontSize: 11 }}>{d.order.slice(0, 40)}...</div>
                )}
              </td>
              <td className="text-right">{formatNumber(d.qty)}</td>
              <td className="text-right font-medium">{formatMoney(d.amount)}</td>
              <td className="text-right text-muted">{formatMoney(d.cost)}</td>
              <td className="text-right" style={{ color: (d.profit ?? 0) > 0 ? '#22c55e' : '#ef4444' }}>
                {formatMoney(d.profit)}
              </td>
              <td className="text-right">{formatPercent(d.margin ?? 0, false)}</td>
              <td>
                <span className={`status-pill ${d.business === 'МЛ' ? 'in_progress' : 'pending'}`}>
                  {d.business ?? '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-footer">
        <button className="pagination-btn" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          ← Назад
        </button>
        <span className="pagination-info">
          {page + 1} / {Math.max(totalPages, 1)} · {filtered.length} сделок
        </span>
        <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
          Вперёд →
        </button>
      </div>
    </div>
  );
}
