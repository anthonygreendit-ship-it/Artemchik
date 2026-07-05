import type { Receivable } from '../types';

export function formatMoney(value: number | null | undefined, compact = false): string {
  if (value == null || Number.isNaN(value)) return '—';
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} млн ₽`;
  }
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number | null | undefined, signed = true): string {
  if (value == null || Number.isNaN(value)) return '—';
  const prefix = signed && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getReceivableStatus(client: Receivable): 'completed' | 'in_progress' | 'pending' | 'cancelled' {
  if (client.status === 'overdue') return 'pending';
  if (client.total < 10000) return 'completed';
  if (client.jun && client.jun > 0) return 'in_progress';
  if (client.may && client.may > 0) return 'pending';
  return 'in_progress';
}

export const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май'] as const;

export const STATUS_LABELS: Record<string, string> = {
  completed: 'Завершено',
  in_progress: 'В работе',
  pending: 'Ожидание',
  cancelled: 'Отменено',
  on_time: 'В графике',
  overdue: 'Просрочено',
  partial: 'Частично',
};

export const PAGE_LABELS: Record<string, string> = {
  pulse: 'Пульс',
  'sales-plan': 'План продаж',
  deals: 'Сделки',
  money: 'Деньги и платежи',
  roi: 'ROI и оборот',
  receivables: 'Дебиторка',
  warehouse: 'Склад',
  purchases: 'Закупки и в пути',
  month: 'Месяц',
  chocolate: 'Ягоды в шоколаде',
  settings: 'Настройки',
};

export const BUSINESS_TABS = [
  { id: 'all' as const, label: 'Общая' },
  { id: 'import' as const, label: 'Импорт' },
  { id: 'retail' as const, label: 'Полный цикл' },
  { id: 'internal' as const, label: 'Внутренний' },
  { id: 'ml' as const, label: 'МЛ' },
  { id: 'fb' as const, label: 'ФБ' },
];

export const PERIOD_LABELS: Record<string, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  week: 'Эта неделя',
  prev_week: 'Прошлая неделя',
  month: 'Этот месяц',
  all: 'Вся история',
};

export function filterByBusiness<T extends { business?: string | null }>(
  items: T[],
  tab: string,
): T[] {
  if (tab === 'all' || tab === 'import' || tab === 'retail' || tab === 'internal') return items;
  if (tab === 'ml') return items.filter((i) => i.business === 'МЛ');
  if (tab === 'fb') return items.filter((i) => i.business === 'ФБ');
  return items;
}

export function filterByPeriod<T extends { date: string }>(
  items: T[],
  period: string,
  reportDate: string,
): T[] {
  const end = new Date(reportDate + 'T12:00:00');
  const startOfDay = reportDate;
  const yesterday = new Date(end);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);

  return items.filter((item) => {
    if (period === 'all') return true;
    if (period === 'today') return item.date === startOfDay;
    if (period === 'yesterday') return item.date === yStr;
    const d = new Date(item.date + 'T12:00:00');
    const diff = (end.getTime() - d.getTime()) / 86400000;
    if (period === 'week') return diff >= 0 && diff < 7;
    if (period === 'prev_week') return diff >= 7 && diff < 14;
    if (period === 'month') return diff >= 0 && diff < 31;
    return true;
  });
}
