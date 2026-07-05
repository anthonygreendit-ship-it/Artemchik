import { useMemo, useState } from 'react';
import type { DashboardData, Receivable } from '../types';
import { ReceivableClientDetail } from '../components/ReceivableClientDetail';
import { Pagination } from '../components/Shared';
import { formatMoney, formatDate, STATUS_LABELS } from '../utils/format';

const PAGE = 10;

export function ReceivablesPage({ data, search }: { data: DashboardData; search: string }) {
  const [filter, setFilter] = useState<'all' | 'overdue' | 'on_time'>('all');
  const [page, setPage] = useState(0);
  const [selectedClient, setSelectedClient] = useState<Receivable | null>(null);

  const overdueTotal = data.receivables.filter((r) => r.status === 'overdue').reduce((s, r) => s + r.total, 0);
  const onTimeTotal = data.receivables.filter((r) => r.status !== 'overdue').reduce((s, r) => s + r.total, 0);

  const filtered = useMemo(() => {
    let items = data.receivables;
    if (filter === 'overdue') items = items.filter((r) => r.status === 'overdue');
    if (filter === 'on_time') items = items.filter((r) => r.status !== 'overdue');
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((r) => r.client.toLowerCase().includes(q));
    }
    return items.sort((a, b) => b.total - a.total);
  }, [data.receivables, filter, search]);

  const pageItems = filtered.slice(page * PAGE, (page + 1) * PAGE);

  if (selectedClient) {
    return (
      <>
        <h2 className="page-title">Дебиторская задолженность</h2>
        <ReceivableClientDetail
          client={selectedClient}
          data={data}
          onBack={() => setSelectedClient(null)}
        />
      </>
    );
  }

  return (
    <>
      <h2 className="page-title">Дебиторская задолженность</h2>
      <p className="page-subtitle">Нажмите на клиента, чтобы открыть историю оплат и график следующих платежей</p>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Итого дебиторка</div>
          <div className="kpi-value">{formatMoney(data.kpi.totalReceivables, true)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Просрочено</div>
          <div className="kpi-value text-danger">{formatMoney(overdueTotal, true)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">В графике</div>
          <div className="kpi-value text-success">{formatMoney(onTimeTotal, true)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Контрагентов</div>
          <div className="kpi-value">{data.receivables.length}</div>
        </div>
      </div>

      <div className="inline-tabs">
        <button type="button" className={`inline-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); setPage(0); }}>Все</button>
        <button type="button" className={`inline-tab ${filter === 'overdue' ? 'active' : ''}`} onClick={() => { setFilter('overdue'); setPage(0); }}>Просрочено</button>
        <button type="button" className={`inline-tab ${filter === 'on_time' ? 'active' : ''}`} onClick={() => { setFilter('on_time'); setPage(0); }}>В графике</button>
      </div>

      <div className="table-section">
        <table className="data-table">
          <thead>
            <tr>
              <th>Контрагент</th>
              <th className="text-right">Сумма</th>
              <th className="text-right">Просрочка, дн.</th>
              <th>Дата оплаты (план)</th>
              <th className="text-right">Май</th>
              <th className="text-right">Июнь</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r) => (
              <tr
                key={r.client}
                className={`row-clickable ${r.status === 'overdue' ? 'row-warn' : ''}`}
                onClick={() => setSelectedClient(r)}
              >
                <td className="font-medium">
                  <button type="button" className="client-link">{r.client}</button>
                </td>
                <td className="text-right">{formatMoney(r.total)}</td>
                <td className={`text-right ${(r.overdueDays ?? 0) > 7 ? 'text-danger' : ''}`}>{r.overdueDays ?? 0}</td>
                <td>{formatDate(r.plannedPaymentDate)}</td>
                <td className="text-right">{formatMoney(r.may)}</td>
                <td className="text-right">{formatMoney(r.jun)}</td>
                <td><span className={`status-pill ${r.status === 'overdue' ? 'cancelled' : r.status === 'partial' ? 'pending' : 'completed'}`}>{STATUS_LABELS[r.status ?? 'on_time']}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE)} total={filtered.length} onPage={setPage} />
      </div>

      <div className="chart-card" style={{ marginTop: 20 }}>
        <div className="chart-title">График поступлений (план ДС)</div>
        <table className="data-table">
          <thead><tr><th>Клиент</th><th>Дата</th><th>ЮЛ</th><th className="text-right">Сумма</th></tr></thead>
          <tbody>
            {data.cashPlan.slice(0, 15).map((c, i) => (
              <tr
                key={i}
                className="row-clickable"
                onClick={() => {
                  const match = data.receivables.find((r) =>
                    r.client.toLowerCase().includes(c.client.toLowerCase().slice(0, 4))
                    || c.client.toLowerCase().includes(r.client.split(' ')[0].toLowerCase()),
                  );
                  if (match) setSelectedClient(match);
                }}
              >
                <td><button type="button" className="client-link">{c.client}</button></td>
                <td>{formatDate(c.date)}</td>
                <td>{c.business}</td>
                <td className="text-right">{formatMoney(c.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
