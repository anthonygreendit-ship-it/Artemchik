import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardData } from '../types';
import { MONTHS } from '../utils/format';

interface ChartsProps {
  data: DashboardData;
  businessKey?: string;
}

function formatAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function Charts({ data, businessKey }: ChartsProps) {
  const slice = data.operSlice2026;
  const revKey = businessKey
    ? `Выручка (отгрузка) ${businessKey === 'Импорт' ? 'ИМП' : businessKey === 'Полный' ? 'ПОЛ' : businessKey === 'Внутренний' ? 'ВНУТР' : 'ИТОГО'}`
    : 'Выручка (отгрузка) ИТОГО';
  const markupKey = 'Оперативная наценка';
  const kgKey = businessKey
    ? Object.keys(slice).find((k) => k.includes('Отгружено') && (businessKey === 'Импорт' ? k.includes('ИМП') : businessKey === 'Полный' ? k.includes('ПОЛ') : k.includes('ВНУТР')))
    : Object.keys(slice).find((k) => k.includes('Отгружено') && k.includes('ИТОГО'));

  const chartData = MONTHS.map((month) => ({
    month: month.slice(0, 3),
    sales: slice[kgKey ?? '']?.[month] ?? 0,
    revenue: slice[revKey]?.[month] ?? 0,
    profit: slice[markupKey]?.[month] ?? 0,
  }));

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <div className="chart-title">Отгрузка товара, кг</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={formatAxis} />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString('ru-RU'), '']}
              contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Bar dataKey="sales" fill="#6366f1" radius={[6, 6, 0, 0]} name="кг" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-card">
        <div className="chart-title">Выручка и наценка</div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={formatAxis} />
            <Tooltip
              formatter={(value: number) => [value.toLocaleString('ru-RU') + ' ₽', '']}
              contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} name="Выручка" />
            <Line type="monotone" dataKey="profit" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} name="Наценка" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
