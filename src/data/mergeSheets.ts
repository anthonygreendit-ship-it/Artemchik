import type { BaseDashboardData, SheetSourceConfig } from '../types';
import { loadInTransitFromCsv, loadInventoryFromCsv, loadReceivablesFromCsv } from './googleSheetsLoader';

export async function mergeSheetsIntoDashboard(
  base: BaseDashboardData,
  config: SheetSourceConfig,
): Promise<{ base: BaseDashboardData; loaded: string[] }> {
  const merged: BaseDashboardData = {
    ...base,
    kpi: { ...base.kpi },
    receivables: [...base.receivables],
    inventory: [...base.inventory],
    inTransit: [...base.inTransit],
  };
  const loaded: string[] = [];

  if (config.clientsUrl.trim()) {
    const receivables = await loadReceivablesFromCsv(config.clientsUrl.trim());
    if (receivables.length) {
      merged.receivables = receivables;
      merged.kpi.totalReceivables = receivables.reduce((s, r) => s + r.total, 0);
      loaded.push('клиенты');
    }
  }

  if (config.inventoryUrl.trim()) {
    const inventory = await loadInventoryFromCsv(config.inventoryUrl.trim());
    if (inventory.length) {
      merged.inventory = inventory;
      loaded.push('остатки');
    }
  }

  if (config.purchasesUrl.trim()) {
    const inTransit = await loadInTransitFromCsv(config.purchasesUrl.trim());
    if (inTransit.length) {
      merged.inTransit = inTransit;
      loaded.push('закупки');
    }
  }

  return { base: merged, loaded };
}
