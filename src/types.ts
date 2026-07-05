export interface MonthlyValues {
  [month: string]: number;
}

export interface KPI {
  reportDate: string;
  revenue: number;
  revenueChange: number;
  totalSales: number;
  totalOrders: number;
  profit: number;
  profitChange: number;
  totalReceivables: number;
  totalActive: number;
  totalPassive: number;
}

export interface ClientPaymentEvent {
  date: string;
  amount: number;
  type: 'payment' | 'accrual' | 'planned';
  business?: string;
  note?: string;
}

export interface Receivable {
  client: string;
  total: number;
  mar?: number | null;
  apr?: number | null;
  may?: number | null;
  jun?: number | null;
  overdueDays?: number;
  plannedPaymentDate?: string;
  status?: 'on_time' | 'overdue' | 'partial';
  paymentHistory?: ClientPaymentEvent[];
  upcomingPayments?: ClientPaymentEvent[];
}

export interface Deal {
  client: string | null;
  order?: string;
  product?: string | null;
  qty?: number | null;
  price?: number | null;
  amount: number;
  cost?: number | null;
  profit?: number | null;
  margin?: number | null;
  business?: string | null;
  stage?: string;
  status?: 'open' | 'closed';
}

export interface DealHistoryRow {
  id: string;
  date: string;
  client: string;
  product: string;
  group: string;
  qty: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  business: string;
  status: 'closed' | 'open';
}

export interface InTransitItem {
  section: string | null;
  product: string;
  qty: number;
  price?: number | null;
  amount?: number | null;
  cost?: number | null;
  plannedArrival?: string;
  supplier?: string;
  deliveryStatus?: 'planned' | 'in_transit' | 'customs' | 'delayed';
  daysToArrival?: number;
  origin?: string;
}

export interface InventoryItem {
  product: string;
  qty: number;
  costPerKg?: number | null;
  costTotal: number;
  marketPrice?: number | null;
  marketTotal?: number | null;
  markupPerKg?: number | null;
  group?: string;
  daysOnStock?: number;
  reserved?: number;
  storageRatePerKgDay?: number;
  storagePaidRub?: number;
  marginAfterStorage?: number;
  catalogPricePerKg?: number;
  quickSalePricePerKg?: number;
  marginAtQuickSalePerKg?: number;
  marginAtQuickSaleTotal?: number;
  profitabilityReservePerKg?: number;
  profitabilityReserveTotal?: number;
  daysUntilStorageExceedsCost?: number;
  storageAlreadyExceedsCost?: boolean;
  daysUntilUnprofitable?: number | null;
}

export interface BerryGroupStock {
  group: string;
  qtyKg: number;
  costRub: number;
  marketRub: number;
  daysAvg: number;
  storagePaidRub: number;
  marginAfterStorage: number;
  quickSalePricePerKg?: number;
  catalogPricePerKg?: number;
  profitabilityReserveTotal: number;
}

export interface OwnerExpense {
  date: string;
  description: string;
  amount: number;
}

export interface CashPlanItem {
  client: string;
  type: string;
  date: string;
  amount: number;
  business: string;
  cumulative?: number | null;
}

export interface PayableItem {
  creditor: string;
  date: string;
  amount: number;
  type: string;
  business: string;
  currency?: 'RUB' | 'USD';
}

export interface BankAccount {
  name: string;
  business: string;
  balance: number;
  /** Банк для отображения: Сбер, ВТБ */
  bank?: string;
  currency?: 'RUB' | 'USD';
  /** Сумма на валютном счёте в USD */
  foreignAmount?: number;
}

export interface BusinessLine {
  revenue: MonthlyValues;
  markupPerKg: MonthlyValues;
  shippedKg: MonthlyValues;
}

export interface SalesPlan {
  month: string;
  planRevenue: number;
  factRevenue: number;
  planKg: number;
  factKg: number;
  planMarginPct: number;
  factMarginPct: number;
  planProfit: number;
  factProfit: number;
  calendarProgressPct: number;
  expectedRevenueByDate: number;
  gapRevenue: number;
  forecastRevenue: number;
}

export interface RoiMetrics {
  id: 'overall' | 'credit' | 'investor' | 'cash';
  label: string;
  profit: number;
  capital: number;
  roiPct: number;
  targetPct: number;
  status: 'good' | 'warn' | 'bad';
  profitSharePct?: number;
}

export interface TurnoverMetrics {
  receivableDays: number;
  receivableNorm: number;
  stockDays: number;
  stockNorm: number;
  inTransitRub: number;
  dealCycleDays: number;
  supplierCreditDays?: number;
  stockValueRub?: number;
  monthlyRevenue?: number;
}

export type RoiMetricId = RoiMetrics['id'];
export type TurnoverMetricId = 'receivables' | 'stock' | 'in-transit' | 'deal-cycle';

export interface RoiBreakdownStep {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface RoiBreakdownLine {
  label: string;
  amount: number;
  sharePct?: number;
  meta?: string;
}

export interface RoiDetailView {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  formula: string;
  steps: RoiBreakdownStep[];
  lines: RoiBreakdownLine[];
  resultLabel: string;
  resultValue: string;
  status?: 'good' | 'warn' | 'bad';
  footnote?: string;
}

export interface FundingGap {
  cashOnAccounts: number;
  paymentsToday: number;
  paymentsThisWeek: number;
  paymentsThisMonth: number;
  expectedInflowsWeek: number;
  gapToday: number;
  gapWeek: number;
  gapMonth: number;
  needAttract: number;
  status: 'ok' | 'warn' | 'critical';
  weekFrom?: string;
  weekTo?: string;
  monthTo?: string;
  inflowProbabilityPct?: number;
}

export interface FxRateSnapshot {
  usdRub: number;
  eurRub?: number;
  fetchedAt: string;
  source: 'cbr';
}

export interface FxExposureItem {
  label: string;
  currency: 'USD' | 'EUR';
  amountFx: number;
  amountRub: number;
  type: 'asset' | 'liability';
  note?: string;
}

export interface FxImpactSummary {
  rate: FxRateSnapshot;
  previousRate: FxRateSnapshot | null;
  rateChangePct: number;
  eurChangePct: number;
  exposures: FxExposureItem[];
  totalUsdAssetsRub: number;
  totalUsdLiabilitiesRub: number;
  netFxExposureRub: number;
  gainLossRub: number;
  gainLossLabel: string;
}

export interface Insight {
  type: 'critical' | 'warning' | 'info';
  text: string;
}

export interface DayProfit {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  marginPct: number;
}

export interface BaseDashboardData {
  kpi: KPI;
  operSlice2026: Record<string, MonthlyValues>;
  operBalance2026: {
    active: Array<{ name: string; values: Record<string, number | null> }>;
    passive: Array<{ name: string; values: Record<string, number | null> }>;
    totalActive: Record<string, number | null>;
    totalPassive: Record<string, number | null>;
  };
  receivables: Receivable[];
  deals: Deal[];
  inTransit: InTransitItem[];
  inventory: InventoryItem[];
  ownerExpenses: OwnerExpense[];
  ownerExpenseTotals: Record<string, number>;
  cashPlan: CashPlanItem[];
  businesses: Record<string, BusinessLine>;
}

export interface DashboardData extends BaseDashboardData {
  payables: PayableItem[];
  bankAccounts: BankAccount[];
  salesPlan: SalesPlan;
  roi: RoiMetrics[];
  turnover: TurnoverMetrics;
  fundingGap: FundingGap;
  insights: Insight[];
  yesterday: DayProfit;
  dealHistory: DealHistoryRow[];
  openDeals: Deal[];
  berryGroups: BerryGroupStock[];
  creditDebt: number;
  investorCapital: number;
}

export type PageId =
  | 'pulse'
  | 'sales-plan'
  | 'deals'
  | 'money'
  | 'roi'
  | 'receivables'
  | 'warehouse'
  | 'purchases'
  | 'month'
  | 'chocolate'
  | 'settings';

export type BusinessUnit = 'berries' | 'chocolate';

export type BusinessTab = 'all' | 'import' | 'retail' | 'internal' | 'ml' | 'fb';

export type PeriodFilter = 'today' | 'yesterday' | 'week' | 'prev_week' | 'month' | 'all';

export type TableFilter = 'all' | 'completed' | 'in_progress' | 'pending' | 'cancelled';

export interface ChocolateProduct {
  name: string;
  rawKgPerPack: number | null;
  coat1KgPerPack: number | null;
  coat2KgPerPack: number | null;
  rawPricePerKg: number | null;
  chocolatePricePerKg: number | null;
  /** Цена продажи ₽/уп (из Excel «цена пф ягода») */
  sellPricePerPackRub: number | null;
  berryPfPricePerKg: number | null;
  chocolateCost1Coat: number | null;
  chocolateCost2Coat: number | null;
  materialCostPerKgRub: number | null;
  wastePerKgRub: number | null;
  packagingPerKgRub: number | null;
  laborPerKgRub: number | null;
  rentPerKgRub: number | null;
  costPerKgRub: number | null;
  costPerPackRub: number | null;
  packWeightKg: number | null;
  /** @deprecated use sellPricePerPackRub */
  pfPricePerKg?: number | null;
}

export interface ChocolatePurchaseRow {
  label: string;
  kg: number | null;
  spentRub: number | null;
  wasteSalesRub: number | null;
  readyRawKg: number | null;
}

export interface ChocolateData {
  sourceFile: string;
  products: ChocolateProduct[];
  purchases: ChocolatePurchaseRow[];
  defaults: {
    packsPerShift: number;
    shiftsPerDay: number;
    sellPricePerPack: number;
    shipPacksToday: number;
  };
}

export interface SheetSourceConfig {
  upravlenkaUrl: string;
  inventoryUrl: string;
  clientsUrl: string;
  purchasesUrl: string;
  chocolateUrl: string;
}
