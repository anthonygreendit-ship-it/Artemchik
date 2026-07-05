import { DollarSign, ShoppingCart, ClipboardList, TrendingUp, Info } from 'lucide-react';
import type { KPI } from '../types';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

interface KpiCardsProps {
  kpi: KPI;
}

export function KpiCards({ kpi }: KpiCardsProps) {
  const cards = [
    {
      label: 'Выручка (май)',
      value: formatMoney(kpi.revenue, true),
      change: formatPercent(kpi.revenueChange),
      positive: kpi.revenueChange >= 0,
      icon: DollarSign,
      color: 'purple',
      sub: 'от прошлого месяца',
    },
    {
      label: 'Отгрузка, кг',
      value: formatNumber(kpi.totalSales),
      change: '+12%',
      positive: true,
      icon: ShoppingCart,
      color: 'green',
      sub: 'за май 2026',
    },
    {
      label: 'Дебиторка',
      value: formatMoney(kpi.totalReceivables, true),
      change: `${kpi.totalOrders} контраг.`,
      positive: true,
      icon: ClipboardList,
      color: 'blue',
      sub: 'на 29.05.2026',
    },
    {
      label: 'Оперативная наценка',
      value: formatMoney(kpi.profit, true),
      change: formatPercent(11.4),
      positive: true,
      icon: TrendingUp,
      color: 'orange',
      sub: 'прибыль май',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => (
        <div key={card.label} className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">{card.label}</span>
            <div className={`kpi-icon ${card.color}`}>
              <card.icon size={20} />
            </div>
          </div>
          <div className="kpi-value">{card.value}</div>
          <div className={`kpi-change ${card.positive ? 'positive' : 'negative'}`}>
            {card.change} {card.sub}
          </div>
          <Info size={14} color="#cbd5e1" style={{ position: 'absolute', top: 20, right: 20, opacity: 0 }} />
        </div>
      ))}
    </div>
  );
}
