import type { CashPlanItem, ClientPaymentEvent, Receivable } from '../types';

export function normalizeClientName(name: string): string {
  return name
    .toUpperCase()
    .replace(/ООО|ЗАО|АО|ИП|ПК|ОАО|«|»|"|'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clientNamesMatch(a: string, b: string): boolean {
  const na = normalizeClientName(a);
  const nb = normalizeClientName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return shorter.length >= 4 && longer.includes(shorter);
}

export function filterCashPlanForClient(cashPlan: CashPlanItem[], client: string): CashPlanItem[] {
  return cashPlan.filter((c) => clientNamesMatch(c.client, client));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const MONTH_SNAPSHOTS: { key: keyof Pick<Receivable, 'mar' | 'apr' | 'may' | 'jun'>; date: string }[] = [
  { key: 'mar', date: '2026-03-31' },
  { key: 'apr', date: '2026-04-30' },
  { key: 'may', date: '2026-05-31' },
  { key: 'jun', date: '2026-06-30' },
];

export function buildClientPaymentTimeline(
  receivable: Receivable,
  cashPlan: CashPlanItem[],
  reportDate: string,
): { history: ClientPaymentEvent[]; upcoming: ClientPaymentEvent[] } {
  const history: ClientPaymentEvent[] = [];
  const upcoming: ClientPaymentEvent[] = [];
  const accrualDates = new Set<string>();

  for (const item of filterCashPlanForClient(cashPlan, receivable.client)) {
    if (item.date <= reportDate) {
      accrualDates.add(item.date);
      history.push({
        date: item.date,
        amount: item.amount,
        type: 'accrual',
        business: item.business,
        note: item.type === 'предопл' ? 'Предоплата / отгрузка' : 'Отгрузка / начисление',
      });
    } else {
      upcoming.push({
        date: item.date,
        amount: item.amount,
        type: 'planned',
        business: item.business,
        note: 'Плановая отгрузка (новый долг)',
      });
    }
  }

  let prevBalance: number | null = null;
  for (const snap of MONTH_SNAPSHOTS) {
    const balance = receivable[snap.key] ?? null;
    if (balance == null) continue;
    if (prevBalance != null) {
      const delta = balance - prevBalance;
      if (delta < -1000) {
        history.push({
          date: snap.date,
          amount: Math.abs(delta),
          type: 'payment',
          note: 'Оплата (снижение задолженности)',
        });
      } else if (delta > 1000 && !accrualDates.has(snap.date)) {
        history.push({
          date: snap.date,
          amount: delta,
          type: 'accrual',
          note: 'Начисление (рост задолженности)',
        });
      }
    }
    prevBalance = balance;
  }

  if (receivable.plannedPaymentDate && receivable.total > 0) {
    const primaryAmount = receivable.jun && receivable.jun > 0
      ? Math.min(receivable.jun, receivable.total)
      : Math.ceil(receivable.total * 0.5);
    const remainder = Math.max(0, receivable.total - primaryAmount);

    if (receivable.status === 'overdue') {
      upcoming.unshift({
        date: reportDate,
        amount: primaryAmount,
        type: 'planned',
        note: `Просрочено ${receivable.overdueDays ?? 0} дн. — срочная оплата`,
      });
      if (remainder > 10000) {
        upcoming.push({
          date: addDays(reportDate, 14),
          amount: remainder,
          type: 'planned',
          note: 'Остаток по графику',
        });
      }
    } else if (receivable.plannedPaymentDate >= reportDate) {
      upcoming.push({
        date: receivable.plannedPaymentDate,
        amount: primaryAmount,
        type: 'planned',
        note: receivable.status === 'partial' ? 'Частичная оплата по графику' : 'Плановая оплата',
      });
      if (remainder > 50000) {
        upcoming.push({
          date: addDays(receivable.plannedPaymentDate, 21),
          amount: remainder,
          type: 'planned',
          note: 'Остаток по графику',
        });
      }
    }
  }

  history.sort((a, b) => b.date.localeCompare(a.date));
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return { history, upcoming };
}

export const PAYMENT_EVENT_LABELS: Record<ClientPaymentEvent['type'], string> = {
  payment: 'Оплата',
  accrual: 'Начисление',
  planned: 'План',
};
