function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseCsvLine);
}

function findColumn(headers: string[], variants: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());
  for (const variant of variants) {
    const idx = normalized.findIndex((h) => h.includes(variant));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseNum(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export async function fetchCsv(url: string): Promise<string[][]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось загрузить таблицу (${res.status})`);
  const text = await res.text();
  if (text.includes('<!DOCTYPE html')) throw new Error('Таблица не опубликована или URL неверный');
  return parseCsv(text);
}

export async function loadReceivablesFromCsv(url: string) {
  const rows = await fetchCsv(url);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const clientIdx = findColumn(headers, ['контрагент', 'клиент', 'client']);
  const totalIdx = findColumn(headers, ['итого', 'total', 'сумма', 'долг']);
  const marIdx = findColumn(headers, ['март', 'mar']);
  const aprIdx = findColumn(headers, ['апр', 'apr']);
  const mayIdx = findColumn(headers, ['май', 'may']);
  const junIdx = findColumn(headers, ['июн', 'jun']);
  if (clientIdx < 0 || totalIdx < 0) return [];

  return rows.slice(1).flatMap((row) => {
    const client = row[clientIdx];
    const total = parseNum(row[totalIdx]);
    if (!client || !total || total < 1000) return [];
    return [{
      client,
      total,
      mar: marIdx >= 0 ? parseNum(row[marIdx]) : null,
      apr: aprIdx >= 0 ? parseNum(row[aprIdx]) : null,
      may: mayIdx >= 0 ? parseNum(row[mayIdx]) : null,
      jun: junIdx >= 0 ? parseNum(row[junIdx]) : null,
    }];
  });
}

export async function loadInventoryFromCsv(url: string) {
  const rows = await fetchCsv(url);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const productIdx = findColumn(headers, ['номенклат', 'товар', 'product']);
  const qtyIdx = findColumn(headers, ['кг', 'qty', 'кол']);
  const costIdx = findColumn(headers, ['себест', 'cost']);
  if (productIdx < 0 || qtyIdx < 0) return [];

  return rows.slice(1).flatMap((row) => {
    const product = row[productIdx];
    const qty = parseNum(row[qtyIdx]);
    const costTotal = costIdx >= 0 ? parseNum(row[costIdx]) : null;
    if (!product || !qty) return [];
    return [{
      product,
      qty,
      costPerKg: costTotal && qty ? costTotal / qty : null,
      costTotal: costTotal ?? qty * 100,
      marketPrice: null,
      marketTotal: null,
      markupPerKg: null,
    }];
  });
}

export async function loadInTransitFromCsv(url: string) {
  const rows = await fetchCsv(url);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const productIdx = findColumn(headers, ['товар', 'номенклат', 'product']);
  const qtyIdx = findColumn(headers, ['кг', 'qty']);
  const amountIdx = findColumn(headers, ['сумма', 'amount']);
  const costIdx = findColumn(headers, ['себест', 'cost']);
  const dateIdx = findColumn(headers, ['дата', 'приезд', 'привоз', 'date']);
  const supplierIdx = findColumn(headers, ['постав', 'supplier']);
  const statusIdx = findColumn(headers, ['статус', 'status']);
  if (productIdx < 0 || qtyIdx < 0) return [];

  return rows.slice(1).flatMap((row) => {
    const product = row[productIdx];
    const qty = parseNum(row[qtyIdx]);
    if (!product || !qty) return [];
    const statusRaw = statusIdx >= 0 ? row[statusIdx]?.toLowerCase() ?? '' : '';
    let deliveryStatus: 'planned' | 'in_transit' | 'customs' | 'delayed' = 'in_transit';
    if (statusRaw.includes('план')) deliveryStatus = 'planned';
    if (statusRaw.includes('тамож')) deliveryStatus = 'customs';
    if (statusRaw.includes('задерж')) deliveryStatus = 'delayed';
    return [{
      section: 'in_transit' as const,
      product,
      qty,
      amount: amountIdx >= 0 ? parseNum(row[amountIdx]) : null,
      cost: costIdx >= 0 ? parseNum(row[costIdx]) : null,
      plannedArrival: dateIdx >= 0 ? row[dateIdx] : undefined,
      supplier: supplierIdx >= 0 ? row[supplierIdx] : undefined,
      deliveryStatus,
    }];
  });
}
