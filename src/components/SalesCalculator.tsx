import { useMemo, useState } from 'react';
import type { DashboardData } from '../types';
import {
  avgFromHistory,
  runCalculator,
  trucksNeeded,
  type DealScenarioInput,
} from '../utils/salesCalculator';
import {
  buildMonthlyBreakdown,
  DEFAULT_FIXED,
  fixedCostsTotal,
  suggestMixedPlans,
  totalFixedCosts,
  type FixedCostsInput,
} from '../utils/salesPlanner';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

type CalcMode = 'margin_kg' | 'profit_deal';
type PlannerMode = 'manual' | 'suggest';

export function SalesCalculator({ data }: { data: DashboardData }) {
  const sp = data.salesPlan;
  const hist = useMemo(() => {
    const closed = data.dealHistory.filter((d) => d.status === 'closed').slice(0, 40);
    return avgFromHistory(closed);
  }, [data.dealHistory]);

  const gapProfit = Math.max(0, sp.planProfit - sp.factProfit);
  const gapRevenue = Math.max(0, sp.planRevenue - sp.factRevenue);

  const [plannerMode, setPlannerMode] = useState<PlannerMode>('suggest');
  const [fixed, setFixed] = useState<FixedCostsInput>(DEFAULT_FIXED);
  const [taxRate, setTaxRate] = useState(6);
  const [fixedTaxQuarter, setFixedTaxQuarter] = useState(3_200_000);
  const [quarterChange, setQuarterChange] = useState(0);
  const [inflowsMonth, setInflowsMonth] = useState(Math.round(data.fundingGap.expectedInflowsWeek * 4.3));
  const [currentMonth, setCurrentMonth] = useState(5);

  const [mode, setMode] = useState<CalcMode>('margin_kg');
  const [dealCount, setDealCount] = useState(2);
  const [tonsPerDeal, setTonsPerDeal] = useState(20);
  const [marginPerKg, setMarginPerKg] = useState(10);
  const [profitPerDeal, setProfitPerDeal] = useState(2_000_000);
  const [costPerKg, setCostPerKg] = useState(Math.round(hist.avgCostPerKg));
  const [slowMonths, setSlowMonths] = useState(2);
  const [fastMonths, setFastMonths] = useState(1);
  const [fastDiscount, setFastDiscount] = useState(3);
  const [targetGap, setTargetGap] = useState(gapProfit);

  const cash = data.fundingGap.cashOnAccounts;
  const fixedWithQuarter = { ...fixed, quarterChangePct: quarterChange };

  const profitPerRoundManual = useMemo(() => {
    const d = dealCount * tonsPerDeal * 1000 * marginPerKg;
    return mode === 'profit_deal' ? profitPerDeal * dealCount : d;
  }, [dealCount, tonsPerDeal, marginPerKg, mode, profitPerDeal]);

  const monthlyRows = useMemo(
    () =>
      buildMonthlyBreakdown({
        fixed: fixedWithQuarter,
        startMonth: currentMonth,
        monthsCount: 3,
        cashOnAccounts: cash,
        inflowsPerMonth: inflowsMonth,
        taxRatePct: taxRate,
        fixedTaxQuarter: fixedTaxQuarter,
        projectedMonthlyProfit: sp.factProfit / 5,
        profitPerDeal: profitPerRoundManual,
        gapProfit: targetGap,
      }),
    [fixedWithQuarter, currentMonth, cash, inflowsMonth, taxRate, fixedTaxQuarter, sp.factProfit, profitPerRoundManual, targetGap],
  );

  const suggestions = useMemo(
    () =>
      suggestMixedPlans({
        fixed: fixedWithQuarter,
        monthIndex: currentMonth,
        cashOnAccounts: cash,
        inflowsPerMonth: inflowsMonth,
        taxRatePct: taxRate,
        fixedTaxQuarter: fixedTaxQuarter,
        gapProfit: targetGap,
        gapRevenue: gapRevenue,
        slowMonths,
        fastMonths,
        fastDiscount,
        history: hist,
      }),
    [fixedWithQuarter, currentMonth, cash, inflowsMonth, taxRate, fixedTaxQuarter, targetGap, gapRevenue, slowMonths, fastMonths, fastDiscount, hist],
  );

  const dealInput: DealScenarioInput = useMemo(
    () => ({
      dealCount,
      tonsPerDeal,
      marginPerKg,
      profitPerDeal: mode === 'profit_deal' ? profitPerDeal : null,
      useProfitPerDeal: mode === 'profit_deal',
      costPerKg,
      salePricePerKg: null,
    }),
    [dealCount, tonsPerDeal, marginPerKg, profitPerDeal, mode, costPerKg],
  );

  const result = useMemo(
    () =>
      runCalculator({
        deal: dealInput,
        slowCycleMonths: slowMonths,
        fastCycleMonths: fastMonths,
        fastMarginDiscountPct: fastDiscount,
        gapProfit: targetGap,
        gapRevenue: gapRevenue,
        workingCapital: dealInput.dealCount * dealInput.tonsPerDeal * 1000 * costPerKg,
      }),
    [dealInput, slowMonths, fastMonths, fastDiscount, targetGap, gapRevenue, costPerKg],
  );

  const trucksForGap = trucksNeeded(targetGap, tonsPerDeal, marginPerKg);
  const fixedTotal = fixedCostsTotal(fixed);
  const fixedThisMonth = totalFixedCosts(fixedWithQuarter, currentMonth);

  const updateFixed = (key: keyof FixedCostsInput, val: number) =>
    setFixed((f) => ({ ...f, [key]: val }));

  const applyPreset = (preset: 'trucks' | 'history' | '2m') => {
    if (preset === 'trucks') {
      setDealCount(2); setTonsPerDeal(20); setMarginPerKg(10); setMode('margin_kg');
    }
    if (preset === '2m') {
      setDealCount(2); setTonsPerDeal(20); setMode('profit_deal'); setProfitPerDeal(2_000_000);
    }
    if (preset === 'history') {
      setDealCount(1);
      setTonsPerDeal(Math.round(hist.avgKg / 1000) || 20);
      setMarginPerKg(Math.round(hist.avgMarginPerKg * 10) / 10);
      setCostPerKg(Math.round(hist.avgCostPerKg));
      setMode('margin_kg');
    }
  };

  const applySuggestion = (s: (typeof suggestions)[0]) => {
    setPlannerMode('manual');
    setDealCount(s.dealsPerMonth);
    setTonsPerDeal(s.tonsPerDeal);
    setMarginPerKg(Math.round(s.marginPerKg * 10) / 10);
    setMode('margin_kg');
    setSlowMonths(2);
    setFastMonths(1);
    setFastDiscount(3);
  };

  return (
    <div className="calc-wrap">
      <div className="calc-hero">
        <div>
          <h3>Калькулятор плана продаж + P&L</h3>
          <p>Постоянные расходы → налоги → сколько нужно сделок. Или автопредложение микса клиентов.</p>
        </div>
      </div>

      <div className="planner-mode-tabs">
        <button type="button" className={`planner-mode-tab ${plannerMode === 'suggest' ? 'active suggest' : ''}`} onClick={() => setPlannerMode('suggest')}>
          ✨ Предложи план (я не знаю сколько машин)
        </button>
        <button type="button" className={`planner-mode-tab ${plannerMode === 'manual' ? 'active' : ''}`} onClick={() => setPlannerMode('manual')}>
          🎯 Я знаю параметры (машины, маржа, клиенты)
        </button>
      </div>

      <div className="calc-layout">
        {/* Левая колонка — постоянные расходы (как на референсе) */}
        <aside className="calc-sidebar">
          <div className="calc-sidebar-title">📋 Постоянные расходы / мес</div>
          <label className="calc-field">
            <span>Зарплаты (ФОТ)</span>
            <input type="number" step={50000} value={fixed.salaries} onChange={(e) => updateFixed('salaries', +e.target.value || 0)} />
          </label>
          <label className="calc-field">
            <span>Кредиты (тело + %)</span>
            <input type="number" step={100000} value={fixed.credit} onChange={(e) => updateFixed('credit', +e.target.value || 0)} />
          </label>
          <label className="calc-field">
            <span>Аренда, склад</span>
            <input type="number" value={fixed.rent} onChange={(e) => updateFixed('rent', +e.target.value || 0)} />
          </label>
          <label className="calc-field">
            <span>Логистика, прочее</span>
            <input type="number" value={fixed.logistics} onChange={(e) => updateFixed('logistics', +e.target.value || 0)} />
          </label>
          <label className="calc-field">
            <span>Доп. обязательства</span>
            <input type="number" step={100000} value={fixed.other} onChange={(e) => updateFixed('other', +e.target.value || 0)} />
          </label>
          <div className="calc-sidebar-total">
            <span>Итого / мес</span>
            <strong>{formatMoney(fixedTotal, true)}</strong>
          </div>

          <div className="calc-sidebar-divider" />
          <label className="calc-field">
            <span>Изменение каждые 3 мес, %</span>
            <input type="number" value={quarterChange} onChange={(e) => setQuarterChange(+e.target.value || 0)} />
          </label>
          <label className="calc-field">
            <span>Налог на прибыль, %</span>
            <input type="number" value={taxRate} onChange={(e) => setTaxRate(+e.target.value || 0)} />
          </label>
          <label className="calc-field">
            <span>Налог квартала (мин.), ₽</span>
            <input type="number" step={100000} value={fixedTaxQuarter} onChange={(e) => setFixedTaxQuarter(+e.target.value || 0)} />
          </label>
          <label className="calc-field">
            <span>Текущий месяц (1-12)</span>
            <input type="number" min={1} max={12} value={currentMonth} onChange={(e) => setCurrentMonth(+e.target.value || 5)} />
          </label>
          <label className="calc-field">
            <span>Поступления / мес (план)</span>
            <input type="number" step={100000} value={inflowsMonth} onChange={(e) => setInflowsMonth(+e.target.value || 0)} />
          </label>
          <div className="calc-sidebar-note">
            Деньги на счетах: <strong>{formatMoney(cash, true)}</strong>
            <br />
            Этот месяц расходы: <strong>{formatMoney(fixedThisMonth, true)}</strong>
          </div>
        </aside>

        <div className="calc-main">
          {/* P&L таблица по 3 месяца */}
          <div className="chart-card calc-pl-table">
            <div className="chart-title">Движение денег · 3 месяца (расходы меняются каждый квартал)</div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Месяц</th>
                  <th className="text-right">Постоянные</th>
                  <th className="text-right">Налоги</th>
                  <th className="text-right">Всего расход</th>
                  <th className="text-right">На счетах</th>
                  <th className="text-right">Поступления</th>
                  <th className="text-right">Нужно от продаж</th>
                  <th className="text-right">Машин</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((r) => (
                  <tr key={r.monthLabel} className={r.isTaxMonth ? 'row-tax' : ''}>
                    <td>{r.monthLabel}{r.isTaxMonth ? ' 📋' : ''}</td>
                    <td className="text-right">{formatMoney(r.fixedCosts, true)}</td>
                    <td className="text-right text-danger">{r.tax > 0 ? formatMoney(r.tax, true) : '—'}</td>
                    <td className="text-right font-medium">{formatMoney(r.totalOutflow, true)}</td>
                    <td className="text-right">{formatMoney(r.cashAvailable, true)}</td>
                    <td className="text-right text-success">{formatMoney(r.inflows, true)}</td>
                    <td className="text-right font-medium">{formatMoney(r.needFromSales, true)}</td>
                    <td className="text-right"><strong>{r.dealsNeeded}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="calc-footnote">
              📋 — месяц уплаты налогов (конец квартала). «Нужно от продаж» = постоянные + налоги + gap − деньги − поступления.
            </p>
          </div>

          {plannerMode === 'suggest' ? (
            <>
              <div className="calc-suggest-header">
                <h4>✨ Предложенные схемы (на ваших цифрах + истории сделок)</h4>
                <p>
                  Gap по прибыли: {formatMoney(targetGap, true)} ·
                  Постоянные: {formatMoney(fixedThisMonth, true)}/мес ·
                  Средняя сделка: {formatNumber(hist.avgKg)} кг, маржа ~{formatPercent(hist.avgMarginPct, false)}
                </p>
              </div>
              <div className="suggest-grid">
                {suggestions.map((s, i) => (
                  <div key={s.id} className={`suggest-card ${i === 0 ? 'suggest-best' : ''}`}>
                    {i === 0 && <div className="suggest-badge">Рекомендуем</div>}
                    <div className="suggest-title">{s.title}</div>
                    <div className="suggest-mix">{s.summary}</div>
                    <div className="suggest-stats">
                      <div><span>Машин (отгрузок)</span><strong>{s.trucksLabel}</strong></div>
                      <div><span>Маржа</span><strong>{s.marginPerKg.toFixed(0)} ₽/кг</strong></div>
                      <div><span>Цикл</span><strong>{s.cycleMonths} мес</strong></div>
                      <div><span>Прибыль/мес</span><strong>{formatMoney(s.profitPerMonth, true)}</strong></div>
                    </div>
                    <div className="suggest-tags">
                      {s.coversFixed && <span className="tag tag-ok">Покрывает расходы</span>}
                      {s.closesGap && <span className="tag tag-ok">Закрывает gap</span>}
                      {!s.coversFixed && <span className="tag tag-warn">Мало на расходы</span>}
                    </div>
                    <p className="suggest-text">{s.recommendation}</p>
                    <button type="button" className="suggest-apply" onClick={() => applySuggestion(s)}>
                      Применить в ручной расчёт →
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="calc-presets">
                <button type="button" className="calc-preset-btn" onClick={() => applyPreset('trucks')}>2×20т, 10₽/кг</button>
                <button type="button" className="calc-preset-btn" onClick={() => applyPreset('2m')}>2×2 млн/маш</button>
                <button type="button" className="calc-preset-btn" onClick={() => applyPreset('history')}>Из истории</button>
              </div>

              <div className="calc-grid">
                <div className="calc-panel calc-panel-input">
                  <div className="calc-panel-title">Ваша сделка</div>
                  <div className="calc-mode-tabs">
                    <button type="button" className={mode === 'margin_kg' ? 'active' : ''} onClick={() => setMode('margin_kg')}>₽/кг</button>
                    <button type="button" className={mode === 'profit_deal' ? 'active' : ''} onClick={() => setMode('profit_deal')}>₽/машину</button>
                  </div>
                  <label className="calc-field"><span>Машин</span><input type="number" min={1} value={dealCount} onChange={(e) => setDealCount(+e.target.value || 1)} /></label>
                  <label className="calc-field"><span>Тонн/маш</span><input type="number" min={1} value={tonsPerDeal} onChange={(e) => setTonsPerDeal(+e.target.value || 1)} /></label>
                  {mode === 'margin_kg' ? (
                    <label className="calc-field"><span>Маржа ₽/кг</span><input type="number" value={marginPerKg} onChange={(e) => setMarginPerKg(+e.target.value || 0)} /></label>
                  ) : (
                    <label className="calc-field"><span>Прибыль/маш ₽</span><input type="number" value={profitPerDeal} onChange={(e) => setProfitPerDeal(+e.target.value || 0)} /></label>
                  )}
                  <label className="calc-field"><span>Себест. ₽/кг</span><input type="number" value={costPerKg} onChange={(e) => setCostPerKg(+e.target.value || 1)} /></label>
                  <div className="calc-panel-title" style={{ marginTop: 12 }}>Цикл клиентов</div>
                  <label className="calc-field"><span>Медл., мес</span><input type="number" step={0.5} value={slowMonths} onChange={(e) => setSlowMonths(+e.target.value || 1)} /></label>
                  <label className="calc-field"><span>Быстр., мес</span><input type="number" step={0.5} value={fastMonths} onChange={(e) => setFastMonths(+e.target.value || 1)} /></label>
                  <label className="calc-field"><span>Быстр. −% маржа</span><input type="number" value={fastDiscount} onChange={(e) => setFastDiscount(+e.target.value || 0)} /></label>
                  <label className="calc-field">
                    <span>Gap прибыли ₽</span>
                    <input type="number" value={targetGap} onChange={(e) => setTargetGap(+e.target.value || 0)} />
                  </label>
                </div>
                <div className="calc-panel calc-panel-slow">
                  <div className="calc-panel-title">🐢 Медленные</div>
                  <div className="calc-stat-big">{formatMoney(result.slow.profitPerMonth, true)}<span>/мес</span></div>
                  <div className="calc-stats">
                    <div><span>Прибыль с 1 машины</span><strong>{formatMoney(result.slow.profitPerRound)}</strong></div>
                    <div><span>Маржа</span><strong>{formatPercent(result.slow.marginPct, false)}</strong></div>
                  </div>
                </div>
                <div className="calc-panel calc-panel-fast">
                  <div className="calc-panel-title">⚡ Быстрые</div>
                  <div className="calc-stat-big">{formatMoney(result.fast.profitPerMonth, true)}<span>/мес</span></div>
                  <div className="calc-stats">
                    <div><span>Прибыль с 1 машины</span><strong>{formatMoney(result.fast.profitPerRound)}</strong></div>
                    <div><span>vs медл.</span><strong className={result.fast.profitPerMonth > result.slow.profitPerMonth ? 'text-success' : 'text-danger'}>
                      {result.slow.profitPerMonth > 0 ? formatPercent(((result.fast.profitPerMonth - result.slow.profitPerMonth) / result.slow.profitPerMonth) * 100) : '—'}
                    </strong></div>
                  </div>
                </div>
              </div>

              <div className="calc-result-banner">
                <div className="calc-result-col">
                  <div className="calc-result-label">Машин на gap + расходы</div>
                  <div className="calc-result-value">{monthlyRows[0]?.dealsNeeded ?? trucksForGap}</div>
                </div>
                <div className="calc-result-col">
                  <div className="calc-result-label">Постоянные + налог (этот мес)</div>
                  <div className="calc-result-value">{formatMoney((monthlyRows[0]?.totalOutflow ?? 0), true)}</div>
                </div>
                <div className="calc-result-col calc-result-wide">
                  <div className="calc-result-label">Вывод</div>
                  <p>{result.recommendation}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
