import { useMemo, useState } from 'react';
import type { DashboardData } from '../types';
import { formatMoney, formatNumber } from '../utils/format';
import { formatReserveDays } from '../utils/warehouseEconomics';
import { Pagination } from '../components/Shared';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#64748b'];
const STORAGE_RATE = 4.5;

function formatKgPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)} ₽/кг`;
}

export function WarehousePage({ data, search }: { data: DashboardData; search: string }) {
  const [page, setPage] = useState(0);
  const PAGE = 12;

  const totalKg = data.inventory.reduce((s, i) => s + i.qty, 0);
  const totalCost = data.inventory.reduce((s, i) => s + i.costTotal, 0);
  const totalStoragePaid = data.inventory.reduce((s, i) => s + (i.storagePaidRub ?? 0), 0);
  const totalReserve = data.inventory.reduce((s, i) => s + (i.profitabilityReserveTotal ?? 0), 0);
  const lossItems = data.inventory.filter((i) => (i.profitabilityReserveTotal ?? 0) < 0 && i.qty > 0).length;
  const criticalItems = data.inventory.filter(
    (i) => i.qty > 0 && ((i.daysUntilStorageExceedsCost ?? 999) <= 14 || i.storageAlreadyExceedsCost),
  ).length;

  const filtered = useMemo(() => {
    let items = data.inventory.filter((i) => i.qty > 0 && !i.product.match(/^(Брусника|Вишня|Голубика|Ежевика|Клубника|Клюква)$/));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.product.toLowerCase().includes(q));
    }
    return items.sort((a, b) => (a.profitabilityReserveTotal ?? 0) - (b.profitabilityReserveTotal ?? 0));
  }, [data.inventory, search]);

  const pageItems = filtered.slice(page * PAGE, (page + 1) * PAGE);

  return (
    <>
      <h2 className="page-title">Склад · остатки ягод</h2>
      <p className="page-subtitle">
        Маржа считается по цене слива (быстрая продажа), не по справочной рыночной. Рыночная — ориентир, по ней сейчас не продаётся.
      </p>
      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Остаток, кг</div><div className="kpi-value">{formatNumber(totalKg)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Себестоимость</div><div className="kpi-value">{formatMoney(totalCost, true)}</div></div>
        <div className="kpi-card">
          <div className="kpi-label">Заплачено за хранение</div>
          <div className="kpi-value text-danger">{formatMoney(totalStoragePaid, true)}</div>
          <div className="kpi-change">{STORAGE_RATE} ₽/кг/день × дни на складе</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Остаток рентабельности</div>
          <div className={`kpi-value ${totalReserve < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(totalReserve, true)}</div>
          <div className={`kpi-change ${lossItems > 0 ? 'negative' : ''}`}>
            {lossItems > 0 ? `${lossItems} SKU в минусе при сливе` : 'Все позиции в плюсе при сливе'}
            {criticalItems > 0 ? ` · ${criticalItems} скоро съест хранение` : ''}
          </div>
        </div>
      </div>

      <div className="warehouse-charts">
        <div className="chart-card warehouse-chart-card">
          <div className="chart-title">По группам товаров (₽)</div>
          <div className="warehouse-chart-wrap">
            <ResponsiveContainer width="100%" height={380}>
              <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Pie
                  data={data.berryGroups}
                  dataKey="costRub"
                  nameKey="group"
                  cx="50%"
                  cy="46%"
                  outerRadius={145}
                  stroke="none"
                >
                  {data.berryGroups.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="warehouse-legend">
              {data.berryGroups.map((g, i) => (
                <div key={g.group} className="warehouse-legend-item">
                  <span className="warehouse-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="warehouse-legend-name">{g.group}</span>
                  <span className="warehouse-legend-value">{formatMoney(g.costRub, true)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-title">Группы — цены и рентабельность</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Группа</th>
                <th className="text-right">Слив ₽/кг</th>
                <th className="text-right">Рынок ₽/кг</th>
                <th className="text-right">Хранение</th>
                <th className="text-right">Остаток ₽</th>
              </tr>
            </thead>
            <tbody>
              {data.berryGroups.map((g) => {
                const reserve = g.profitabilityReserveTotal ?? g.marginAfterStorage;
                return (
                  <tr key={g.group} className={reserve < 0 ? 'row-warn' : ''}>
                    <td className="font-medium">{g.group}</td>
                    <td className="text-right">{formatKgPrice(g.quickSalePricePerKg)}</td>
                    <td className="text-right text-muted">{formatKgPrice(g.catalogPricePerKg)}</td>
                    <td className="text-right text-danger">{formatMoney(g.storagePaidRub, true)}</td>
                    <td className={`text-right font-medium ${reserve < 0 ? 'text-danger' : 'text-success'}`}>
                      {formatMoney(reserve, true)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="warehouse-storage-note">
            Остаток рентабельности = (цена слива − себест. − хранение) × кг.
            Справочная рыночная цена выше — по ней сейчас не купят, поэтому в расчёте не используется.
          </p>
        </div>
      </div>

      <div className="table-section" style={{ marginTop: 20 }}>
        <div className="table-header"><div className="table-title">Детализация по SKU</div></div>
        <div className="table-scroll-x">
          <table className="data-table warehouse-detail-table">
            <thead>
              <tr>
                <th>Номенклатура</th><th>Группа</th><th className="text-right">Кг</th>
                <th className="text-right">Дней</th>
                <th className="text-right">Себест.</th>
                <th className="text-right">Хран. ₽/кг</th>
                <th className="text-right">Слив</th>
                <th className="text-right">Рынок</th>
                <th className="text-right">Маржа ₽/кг</th>
                <th className="text-right">Остаток ₽</th>
                <th>Когда хранение &gt; себест.</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((i) => {
                const reserve = i.profitabilityReserveTotal ?? 0;
                const marginKg = i.marginAtQuickSalePerKg ?? 0;
                const reserveDays = formatReserveDays({
                  storageAlreadyExceedsCost: i.storageAlreadyExceedsCost ?? false,
                  daysUntilStorageExceedsCost: i.daysUntilStorageExceedsCost ?? 0,
                });
                return (
                  <tr key={i.product} className={(i.daysOnStock ?? 0) > 45 || reserve < 0 ? 'row-warn' : ''}>
                    <td>{i.product.slice(0, 44)}{i.product.length > 44 ? '…' : ''}</td>
                    <td>{i.group}</td>
                    <td className="text-right">{formatNumber(i.qty)}</td>
                    <td className={`text-right ${(i.daysOnStock ?? 0) > 45 ? 'text-danger' : ''}`}>{i.daysOnStock}</td>
                    <td className="text-right">{formatKgPrice(i.costPerKg)}</td>
                    <td className="text-right text-danger">{formatKgPrice(i.storagePaidRub != null && i.qty ? i.storagePaidRub / i.qty : (i.daysOnStock ?? 0) * STORAGE_RATE)}</td>
                    <td className="text-right font-medium">{formatKgPrice(i.quickSalePricePerKg)}</td>
                    <td className="text-right text-muted">{formatKgPrice(i.catalogPricePerKg)}</td>
                    <td className={`text-right font-medium ${marginKg < 0 ? 'text-danger' : 'text-success'}`}>{formatKgPrice(marginKg)}</td>
                    <td className={`text-right font-medium ${reserve < 0 ? 'text-danger' : 'text-success'}`}>{formatMoney(reserve, true)}</td>
                    <td className={`text-right ${i.storageAlreadyExceedsCost ? 'text-danger' : ''}`}>{reserveDays}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE)} total={filtered.length} onPage={setPage} />
      </div>
    </>
  );
}
