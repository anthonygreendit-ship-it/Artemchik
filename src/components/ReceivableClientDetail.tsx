import type { DashboardData, Receivable } from '../types';
import { formatDate, formatMoney, STATUS_LABELS } from '../utils/format';
import { PAYMENT_EVENT_LABELS } from '../utils/receivableClient';

interface ReceivableClientDetailProps {
  client: Receivable;
  data: DashboardData;
  onBack: () => void;
}

export function ReceivableClientDetail({ client, data, onBack }: ReceivableClientDetailProps) {
  const history = client.paymentHistory ?? [];
  const upcoming = client.upcomingPayments ?? [];
  const payments = history.filter((e) => e.type === 'payment');
  const accruals = history.filter((e) => e.type === 'accrual');
  const nextPayment = upcoming.find((e) => e.note?.includes('оплат'));
  const clientDeals = data.dealHistory.filter((d) =>
    d.client.toLowerCase().includes(client.client.split(' ')[0].toLowerCase()),
  ).slice(0, 5);

  return (
    <div className="client-detail">
      <button type="button" className="client-detail-back" onClick={onBack}>
        ← Назад к списку
      </button>

      <div className="client-detail-header">
        <div>
          <h3 className="client-detail-title">{client.client}</h3>
          <span className={`status-pill ${client.status === 'overdue' ? 'cancelled' : client.status === 'partial' ? 'pending' : 'completed'}`}>
            {STATUS_LABELS[client.status ?? 'on_time']}
          </span>
        </div>
        <div className="client-detail-balance">
          <span>Долг сейчас</span>
          <strong>{formatMoney(client.total)}</strong>
        </div>
      </div>

      <div className="kpi-grid client-detail-kpi">
        <div className="kpi-card">
          <div className="kpi-label">Просрочка</div>
          <div className={`kpi-value ${(client.overdueDays ?? 0) > 0 ? 'text-danger' : ''}`}>
            {(client.overdueDays ?? 0) > 0 ? `${client.overdueDays} дн.` : 'Нет'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Следующая оплата</div>
          <div className="kpi-value">{formatDate(nextPayment?.date ?? client.plannedPaymentDate)}</div>
          <div className="kpi-change">{nextPayment ? formatMoney(nextPayment.amount, true) : '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Оплат получено</div>
          <div className="kpi-value text-success">{formatMoney(payments.reduce((s, p) => s + p.amount, 0), true)}</div>
          <div className="kpi-change">{payments.length} платежей</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Начислено (отгрузки)</div>
          <div className="kpi-value">{formatMoney(accruals.reduce((s, p) => s + p.amount, 0), true)}</div>
          <div className="kpi-change">{accruals.length} начислений</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Когда платили</div>
          {payments.length === 0 ? (
            <p className="text-muted client-detail-empty">Платежей в данных пока нет — видны только начисления</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th className="text-right">Сумма</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((e, i) => (
                  <tr key={`pay-${e.date}-${i}`}>
                    <td>{formatDate(e.date)}</td>
                    <td className="text-right text-success font-medium">{formatMoney(e.amount)}</td>
                    <td className="text-muted">{e.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="chart-card">
          <div className="chart-title">Когда ждём оплату</div>
          {upcoming.length === 0 ? (
            <p className="text-muted client-detail-empty">Ближайших платежей нет</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th className="text-right">Сумма</th>
                  <th>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((e, i) => (
                  <tr key={`plan-${e.date}-${i}`} className={e.note?.includes('Просрочено') ? 'row-warn' : ''}>
                    <td>{formatDate(e.date)}</td>
                    <td className="text-right font-medium">{formatMoney(e.amount)}</td>
                    <td className="text-muted">{e.note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Полная история движений</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Тип</th>
              <th>ЮЛ</th>
              <th className="text-right">Сумма</th>
              <th>Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {[...history, ...upcoming].sort((a, b) => b.date.localeCompare(a.date)).map((e, i) => (
              <tr key={`all-${e.date}-${e.type}-${i}`}>
                <td>{formatDate(e.date)}</td>
                <td>
                  <span className={`status-pill ${e.type === 'payment' ? 'completed' : e.type === 'planned' ? 'pending' : 'in_progress'}`}>
                    {PAYMENT_EVENT_LABELS[e.type]}
                  </span>
                </td>
                <td>{e.business ?? '—'}</td>
                <td className={`text-right font-medium ${e.type === 'payment' ? 'text-success' : ''}`}>{formatMoney(e.amount)}</td>
                <td className="text-muted">{e.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Задолженность по месяцам</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Март</th>
                <th>Апрель</th>
                <th>Май</th>
                <th>Июнь</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatMoney(client.mar)}</td>
                <td>{formatMoney(client.apr)}</td>
                <td>{formatMoney(client.may)}</td>
                <td>{formatMoney(client.jun)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {clientDeals.length > 0 && (
          <div className="chart-card">
            <div className="chart-title">Последние сделки</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Товар</th>
                  <th className="text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {clientDeals.map((d) => (
                  <tr key={d.id}>
                    <td>{formatDate(d.date)}</td>
                    <td>{d.product}</td>
                    <td className="text-right">{formatMoney(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
