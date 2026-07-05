import { useMemo, useState } from 'react';
import type { DashboardData, DealHistoryRow } from '../types';
import { PeriodTabs, Pagination } from '../components/Shared';
import { ProductCell } from '../components/ProductCell';
import { getCrmDealUrl, isCrmConfigured } from '../config/crm';
import { formatMoney, formatNumber, formatPercent, filterByPeriod } from '../utils/format';
import { businessLabel, GLOSSARY_ITEMS } from '../utils/productLabels';
import { ExternalLink } from 'lucide-react';

const PAGE_SIZE = 10;

interface DealsPageProps {
  data: DashboardData;
  search: string;
}

export function DealsPage({ data, search }: DealsPageProps) {
  const [period, setPeriod] = useState('week');
  const [tab, setTab] = useState<'history' | 'open'>('history');
  const [page, setPage] = useState(0);
  const [showGlossary, setShowGlossary] = useState(false);
  const crmReady = isCrmConfigured();

  const filtered = useMemo((): DealHistoryRow[] => {
    let items: DealHistoryRow[];
    if (tab === 'history') {
      items = data.dealHistory;
    } else {
      items = data.openDeals.map((d, i) => ({
        id: `open-${i}`,
        date: data.kpi.reportDate,
        client: d.client ?? '—',
        product: d.product ?? d.order ?? '—',
        group: '—',
        qty: d.qty ?? 0,
        revenue: d.amount,
        cost: d.cost ?? 0,
        profit: d.profit ?? 0,
        margin: d.margin ?? 0,
        business: d.business ?? 'МЛ',
        status: 'open' as const,
      }));
    }
    items = filterByPeriod(items, period, data.kpi.reportDate);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((d) => d.client.toLowerCase().includes(q) || d.product.toLowerCase().includes(q));
    }
    return items;
  }, [data, search, period, tab]);

  const summary = useMemo(() => {
    const profit = filtered.reduce((s, d) => s + dealProfit(d), 0);
    const rev = filtered.reduce((s, d) => s + d.revenue, 0);
    const m = rev > 0 ? (profit / rev) * 100 : 0;
    return { count: filtered.length, avgMargin: m, revenue: rev, profit };
  }, [filtered]);

  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const openCrm = (deal: DealHistoryRow) => {
    const url = getCrmDealUrl(deal.id);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    alert('Укажите URL CRM в Настройках.\nШаблон: https://crm.company.ru/deals/{id}');
  };

  return (
    <>
      <h2 className="page-title">Сделки и маржа</h2>
      <p className="page-subtitle">
        Клик по строке — открыть карточку в CRM
        {crmReady ? '' : ' (URL CRM задайте в Настройках)'}
        .{' '}
        <button type="button" className="link-btn" onClick={() => setShowGlossary((v) => !v)}>
          {showGlossary ? 'Скрыть' : 'Что значит кор / МЛ?'}
        </button>
      </p>

      {showGlossary && (
        <div className="chart-card glossary-card">
          <div className="chart-title">Сокращения в номенклатуре</div>
          <ul className="glossary-list">
            {GLOSSARY_ITEMS.map((g) => (
              <li key={g.term}><strong>{g.term}</strong> — {g.meaning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="inline-tabs">
        <button type="button" className={`inline-tab ${tab === 'history' ? 'active' : ''}`} onClick={() => { setTab('history'); setPage(0); }}>История</button>
        <button type="button" className={`inline-tab ${tab === 'open' ? 'active' : ''}`} onClick={() => { setTab('open'); setPage(0); }}>Незавершённые ({data.openDeals.length})</button>
      </div>

      {tab === 'history' && <PeriodTabs value={period} onChange={(v) => { setPeriod(v); setPage(0); }} />}

      <div className="kpi-grid deals-summary">
        <div className="kpi-card">
          <div className="kpi-label">Сделок</div>
          <div className="kpi-value">{summary.count}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Выручка</div>
          <div className="kpi-value">{formatMoney(summary.revenue, true)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Прибыль продали</div>
          <div className={`kpi-value ${summary.profit < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(summary.profit, true)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Маржа</div>
          <div className={`kpi-value ${summary.avgMargin < data.salesPlan.planMarginPct ? 'text-danger' : ''}`}>{formatPercent(summary.avgMargin, false)}</div>
          <div className="kpi-change">план {formatPercent(data.salesPlan.planMarginPct, false)}</div>
        </div>
      </div>

      <div className="table-section">
        <table className="data-table">
          <thead>
            <tr>
              <th></th>
              <th>Дата</th><th>Клиент</th><th>Товар</th><th>Группа</th>
              <th className="text-right">Кг</th>
              <th className="text-right">Выручка</th>
              <th className="text-right">Себест.</th>
              <th className="text-right">Прибыль</th>
              <th className="text-right">Маржа</th>
              <th>ЮЛ</th><th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((d) => {
              const profit = dealProfit(d);
              const margin = d.revenue > 0 ? (profit / d.revenue) * 100 : d.margin;
              return (
                <tr
                  key={d.id}
                  className={`row-clickable ${margin < 10 ? 'row-warn' : ''}`}
                  onClick={() => openCrm(d)}
                  title={crmReady ? 'Открыть в CRM' : 'Настройте URL CRM'}
                >
                  <td className="crm-link-cell"><ExternalLink size={14} /></td>
                  <td>{d.date}</td>
                  <td className="font-medium">{d.client}</td>
                  <td><ProductCell name={d.product} maxLen={36} /></td>
                  <td>{d.group}</td>
                  <td className="text-right">{formatNumber(d.qty)}</td>
                  <td className="text-right">{formatMoney(d.revenue)}</td>
                  <td className="text-right text-muted">{formatMoney(d.cost)}</td>
                  <td className={`text-right font-medium ${profit < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(profit)}</td>
                  <td className={`text-right ${margin < 10 ? 'text-danger' : 'text-muted'}`}>{formatPercent(margin, false)}</td>
                  <td title={businessLabel(d.business)}>{d.business}</td>
                  <td><span className={`status-pill ${d.status === 'closed' ? 'completed' : 'in_progress'}`}>{d.status === 'closed' ? 'Закрыта' : 'В работе'}</span></td>
                </tr>
              );
            })}
          </tbody>
          {pageItems.length > 0 && (
            <tfoot>
              <tr className="table-total-row">
                <td colSpan={6}><strong>Итого на странице</strong></td>
                <td className="text-right font-medium">{formatMoney(pageItems.reduce((s, d) => s + d.revenue, 0))}</td>
                <td className="text-right text-muted">{formatMoney(pageItems.reduce((s, d) => s + d.cost, 0))}</td>
                <td className="text-right font-medium text-success">{formatMoney(pageItems.reduce((s, d) => s + dealProfit(d), 0))}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
        <Pagination page={page} totalPages={totalPages} total={filtered.length} onPage={setPage} />
      </div>
    </>
  );
}

function dealProfit(d: DealHistoryRow): number {
  if (d.profit != null) return d.profit;
  return d.revenue - d.cost;
}
