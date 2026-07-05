import raw from './dashboard.json';
import chocolateRaw from './chocolate.json';
import { enrichDashboard } from './enrichDashboard';
import { loadSheetConfig, isSheetConfigActive } from '../config/sheets';
import { mergeSheetsIntoDashboard } from './mergeSheets';
import type { BaseDashboardData, ChocolateData, DashboardData } from '../types';

let cached: DashboardData | null = null;

export function getDashboardData(bustCache = false): DashboardData {
  if (!cached || bustCache) {
    cached = enrichDashboard(raw as BaseDashboardData);
  }
  return cached;
}

export function getChocolateData(): ChocolateData {
  return chocolateRaw as ChocolateData;
}

export async function refreshDashboardFromSheets(): Promise<{ data: DashboardData; loaded: string[] }> {
  const config = loadSheetConfig();
  let base = raw as BaseDashboardData;
  let loaded: string[] = [];

  if (isSheetConfigActive(config)) {
    const result = await mergeSheetsIntoDashboard(base, config);
    base = result.base;
    loaded = result.loaded;
  }

  cached = enrichDashboard(base);
  return { data: cached, loaded };
}

export function invalidateDashboardCache(): void {
  cached = null;
}
