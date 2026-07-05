import { useMemo, useState, useCallback, useEffect } from 'react';
import { getDashboardData, refreshDashboardFromSheets } from './data/useDashboardData';
import { loadExchangeRates } from './data/exchangeRate';
import { buildFxImpact } from './utils/fxImpact';
import type { BusinessUnit, PageId, FxImpactSummary } from './types';
import { Sidebar, Header } from './components/Layout';
import { PulsePage } from './pages/PulsePage';
import { SalesPlanPage } from './pages/SalesPlanPage';
import { DealsPage } from './pages/DealsPage';
import { MoneyPage } from './pages/MoneyPage';
import { RoiPage } from './pages/RoiPage';
import { ReceivablesPage } from './pages/ReceivablesPage';
import { WarehousePage } from './pages/WarehousePage';
import { PurchasesPage } from './pages/PurchasesPage';
import { MonthPage } from './pages/MonthPage';
import { ChocolateSalesPlanPage } from './pages/ChocolateSalesPlanPage';
import { SettingsPage } from './pages/SettingsPage';
import { isSheetConfigActive, loadSheetConfig } from './config/sheets';
import type { DashboardData } from './types';

export default function App() {
  const [page, setPage] = useState<PageId>('pulse');
  const [businessUnit, setBusinessUnit] = useState<BusinessUnit>('berries');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<DashboardData>(() => getDashboardData());
  const [sheetStatus, setSheetStatus] = useState<string>('');
  const [fx, setFx] = useState<FxImpactSummary | null>(null);
  const [fxLoading, setFxLoading] = useState(true);

  const refreshFx = useCallback(async (dashboard: DashboardData) => {
    setFxLoading(true);
    try {
      const { current, previous } = await loadExchangeRates();
      setFx(buildFxImpact(dashboard, current, previous));
    } finally {
      setFxLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFx(data);
  }, [data, refreshFx]);

  const sheetsConnected = useMemo(() => isSheetConfigActive(loadSheetConfig()), []);

  const handleRefresh = useCallback(async () => {
    try {
      const { data: refreshed, loaded } = await refreshDashboardFromSheets();
      setData(refreshed);
      await refreshFx(refreshed);
      if (loaded.length) {
        setSheetStatus(`Google Таблицы: ${loaded.join(', ')}`);
      } else if (sheetsConnected) {
        setSheetStatus('Таблицы подключены, но данные не распознаны — проверьте заголовки колонок');
      } else {
        setSheetStatus('Локальные данные. Подключите Google Таблицы в Настройках');
      }
    } catch (e) {
      setSheetStatus(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData(getDashboardData(true));
    }
  }, [sheetsConnected, refreshFx]);

  const handleBusinessChange = (unit: BusinessUnit) => {
    setBusinessUnit(unit);
    setPage(unit === 'chocolate' ? 'sales-plan' : 'pulse');
  };

  return (
    <div className="app">
      <Sidebar
        page={page}
        businessUnit={businessUnit}
        onBusinessChange={handleBusinessChange}
        onNavigate={setPage}
        receivablesCount={data.receivables.length}
        dealsCount={data.openDeals.length}
      />
      <div className="main">
        <Header
          page={page}
          reportDate={data.kpi.reportDate}
          search={search}
          onSearchChange={setSearch}
          onRefresh={handleRefresh}
          onNavigate={setPage}
          sheetStatus={sheetStatus}
          sheetsConnected={sheetsConnected}
          fx={fx}
          fxLoading={fxLoading}
          onFxDetail={() => setPage('money')}
        />
        <main className="content">
          {businessUnit === 'berries' && (
            <>
              {page === 'pulse' && <PulsePage data={data} fx={fx} />}
              {page === 'sales-plan' && <SalesPlanPage data={data} />}
              {page === 'deals' && <DealsPage data={data} search={search} />}
              {page === 'money' && <MoneyPage data={data} fx={fx} />}
              {page === 'roi' && <RoiPage data={data} />}
              {page === 'receivables' && <ReceivablesPage data={data} search={search} />}
              {page === 'warehouse' && <WarehousePage data={data} search={search} />}
              {page === 'purchases' && <PurchasesPage data={data} />}
              {page === 'month' && <MonthPage data={data} />}
              {page === 'settings' && <SettingsPage />}
            </>
          )}

          {businessUnit === 'chocolate' && (
            <>
              {page === 'sales-plan' && <ChocolateSalesPlanPage />}
              {page === 'settings' && <SettingsPage />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
