import { useMemo, useState } from 'react';
import type { Receivable, TableFilter } from '../types';
import { formatMoney, getReceivableStatus, STATUS_LABELS } from '../utils/format';

interface ReceivablesTableProps {
  receivables: Receivable[];
  search: string;
}

const PAGE_SIZE = 8;

export function ReceivablesTable({ receivables, search }: ReceivablesTableProps) {
  const [filter, setFilter] = useState<TableFilter>('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let items = receivables.map((r) => ({ ...r, status: getReceivableStatus(r) }));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.client.toLowerCase().includes(q));
    }
    if (filter !== 'all') items = items.filter((r) => r.status === filter);
    return items;
  }, [receivables, search, filter]);

  const counts = useMemo(() => {
    const all = receivables.map((r) => getReceivableStatus(r));
    return {
      all: receivables.length,
      completed: all.filter((s) => s === 'completed').length,
      in_progress: all.filter((s) => s === 'in_progress').length,
      pending: all.filter((s) => s === 'pending').length,
      cancelled: all.filter((s) => s === 'cancelled').length,
    };
  }, [receivables]);

  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const tabs: { id: TableFilter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'completed', label: 'Закрытые' },
    { id: 'in_progress', label: 'В работе' },
    { id: 'pending', label: 'Ожидание' },
    { id: 'cancelled', label: 'Отменено' },
  ];

  return (
    <div className="table-section">
      <div className="table-header">
        <div className="table-title">Дебиторская задолженность</div>
      </div>
      <div className="table-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`table-tab ${filter === tab.id ? 'active' : ''}`}
            onClick={() => { setFilter(tab.id); setPage(0); }}
          >
            {tab.label}
            {tab.id === 'pending' && counts.pending > 0 && (
              <span className="count">{counts.pending}</span>
            )}
          </button>
        ))}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Контрагент</th>
            <th className="text-right">Итого</th>
            <th className="text-right">Март</th>
            <th className="text-right">Апрель</th>
            <th className="text-right">Май</th>
            <th className="text-right">Июнь</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((r) => (
            <tr key={r.client}>
              <td className="font-medium">{r.client}</td>
              <td className="text-right font-medium">{formatMoney(r.total)}</td>
              <td className="text-right text-muted">{formatMoney(r.mar)}</td>
              <td className="text-right text-muted">{formatMoney(r.apr)}</td>
              <td className="text-right">{formatMoney(r.may)}</td>
              <td className="text-right">{formatMoney(r.jun)}</td>
              <td>
                <span className={`status-pill ${r.status}`}>
                  {STATUS_LABELS[r.status]}
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
          {page + 1} / {Math.max(totalPages, 1)} · {filtered.length} записей
        </span>
        <button className="pagination-btn" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
          Вперёд →
        </button>
      </div>
    </div>
  );
}
