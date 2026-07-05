import type { SheetSourceConfig } from '../types';

export const SHEET_SOURCE_LABELS: Record<keyof SheetSourceConfig, string> = {
  upravlenkaUrl: 'Управленка (KPI, сделки)',
  inventoryUrl: 'Остатки склада',
  clientsUrl: 'Клиенты / дебиторка',
  purchasesUrl: 'Закупки и в пути',
  chocolateUrl: 'Производство шоколада',
};

export const DEFAULT_SHEET_CONFIG: SheetSourceConfig = {
  upravlenkaUrl: '',
  inventoryUrl: '',
  clientsUrl: '',
  purchasesUrl: '',
  chocolateUrl: '',
};

const STORAGE_KEY = 'upravlenka-sheets';

export function loadSheetConfig(): SheetSourceConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SHEET_CONFIG };
    return { ...DEFAULT_SHEET_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SHEET_CONFIG };
  }
}

export function saveSheetConfig(config: SheetSourceConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function sheetUrlFromId(spreadsheetId: string, gid = '0'): string {
  const id = spreadsheetId.trim();
  if (!id) return '';
  if (id.startsWith('http')) return id;
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

export function isSheetConfigActive(config: SheetSourceConfig): boolean {
  return Object.values(config).some((url) => url.trim().length > 0);
}
