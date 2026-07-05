import { useMemo, useState } from 'react';
import type { DashboardData } from '../types';
import { DEFAULT_FIXED, fixedCostsTotal } from '../utils/salesPlanner';
import {
  fromMonthly,
  marginPct,
  needFromSales,
  PERIOD_HINTS,
  PERIOD_LABELS,
  spreadFixedCosts,
  spreadPlan,
  toMonthly,
  trucksInPeriod,
  type PlanPeriod,
  type PlanTargets,
} from '../utils/planPeriods';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';
import { ProgressBar } from './Shared';

const PLAN_PERIODS: PlanPeriod[] = ['day', 'week', 'month', 'quarter'];
const DEFAULT_MARGIN_SCENARIOS = [15, 20, 23, 25, 30];

export function PlanBuilder({ data }: { data: DashboardData }) {
  const sp = data.salesPlan;

  const fixedMonthly = fixedCostsTotal(DEFAULT_FIXED);
  const fixedByPeriod = spreadFixedCosts(fixedMonthly);

  const [editPeriod, setEditPeriod] = useState<PlanPeriod>('month');
  const [planMonthly, setPlanMonthly] = useState<PlanTargets>({
    profit: sp.planProfit,
    revenue: sp.planRevenue,
    kg: sp.planKg,
    deals: 8,
  });

  const [tonsPerTruck, setTonsPerTruck] = useState(20);
  const [marginPerKg, setMarginPerKg] = useState(23);
  const [inflowsMonth, setInflowsMonth] = useState(Math.round(data.fundingGap.expectedInflowsWeek * 4.3));

  const allPlans = useMemo(() => spreadPlan(planMonthly, 'month'), [planMonthly]);
  const marginScenarios = useMemo(
    () => Array.from(new Set([...DEFAULT_MARGIN_SCENARIOS, marginPerKg].filter((m) => m > 0))).sort((a, b) => a - b),
    [marginPerKg],
  );

  const factMonthly = {
    profit: sp.factProfit,
    revenue: sp.factRevenue,
    kg: sp.factKg,
    deals: Math.round(sp.factKg / (tonsPerTruck * 1000)) || 0,
  };

  const updatePlan = (field: keyof PlanTargets, value: number) => {
    setPlanMonthly((p) => ({ ...p, [field]: toMonthly(value, editPeriod) }));
  };

  const activePlan = allPlans[editPeriod];
  const activeFixed = fixedByPeriod[editPeriod];
  const activeInflows = fromMonthly(inflowsMonth, editPeriod);
  const needSales = needFromSales(activePlan.profit, activeFixed, activeInflows);
  const trucksNeeded = trucksInPeriod(needSales, tonsPerTruck, marginPerKg, editPeriod);

  const factForPeriod = {
    profit: fromMonthly(factMonthly.profit, editPeriod),
    revenue: fromMonthly(factMonthly.revenue, editPeriod),
    kg: fromMonthly(factMonthly.kg, editPeriod),
  };

  const gapProfit = activePlan.profit - factForPeriod.profit;

  return (
    <div className="plan-builder">
      {/* ШАГ 1 — выбор периода */}
      <div className="plan-step">
        <div className="plan-step-num">1</div>
        <div className="plan-step-body">
          <div className="plan-step-title">Выберите, на какой срок ставите план</div>
          <div className="period-tabs-big">
            {PLAN_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                className={`period-tab-big ${editPeriod === p ? 'active' : ''}`}
                onClick={() => setEditPeriod(p)}
              >
                <span className="period-tab-label">{PERIOD_LABELS[p]}</span>
                <span className="period-tab-hint">{PERIOD_HINTS[p]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ШАГ 2 — ввод плана */}
      <div className="plan-step">
        <div className="plan-step-num">2</div>
        <div className="plan-step-body">
          <div className="plan-step-title">
            План на <strong>{PERIOD_LABELS[editPeriod].toLowerCase()}</strong> — введите цифры
          </div>
          <div className="plan-input-grid">
            <label className="plan-input-card">
              <span>Прибыль (наценка), ₽</span>
              <input
                type="number"
                value={Math.round(activePlan.profit)}
                onChange={(e) => updatePlan('profit', +e.target.value || 0)}
              />
              <small>Главная цифра — сколько хотите заработать</small>
            </label>
            <label className="plan-input-card">
              <span>Выручка, ₽</span>
              <input
                type="number"
                value={Math.round(activePlan.revenue)}
                onChange={(e) => updatePlan('revenue', +e.target.value || 0)}
              />
              <small>Маржа: {formatPercent(marginPct(activePlan.profit, activePlan.revenue), false)}</small>
            </label>
            <label className="plan-input-card">
              <span>Отгрузка, кг</span>
              <input
                type="number"
                value={Math.round(activePlan.kg)}
                onChange={(e) => updatePlan('kg', +e.target.value || 0)}
              />
            </label>
            <label className="plan-input-card">
              <span>Сделок (машин)</span>
              <input
                type="number"
                value={Math.round(activePlan.deals)}
                onChange={(e) => updatePlan('deals', +e.target.value || 0)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ШАГ 3 — расходы */}
      <div className="plan-step">
        <div className="plan-step-num">3</div>
        <div className="plan-step-body">
          <div className="plan-step-title">Постоянные расходы (≈8 млн/мес)</div>
          <div className="plan-expense-row">
            <div className="plan-expense-item">
              <span>На {PERIOD_LABELS[editPeriod].toLowerCase()}</span>
              <strong>{formatMoney(activeFixed, true)}</strong>
            </div>
            <div className="plan-expense-item">
              <span>Поступления (дебиторка)</span>
              <input
                className="plan-inline-input"
                type="number"
                value={Math.round(inflowsMonth)}
                onChange={(e) => setInflowsMonth(+e.target.value || 0)}
              />
              <small>→ {formatMoney(activeInflows, true)} / {PERIOD_LABELS[editPeriod].toLowerCase()}</small>
            </div>
          </div>
        </div>
      </div>

      {/* ГЛАВНЫЙ ОТВЕТ */}
      <div className="plan-answer">
        <div className="plan-answer-title">
          Что нужно сделать за {PERIOD_LABELS[editPeriod].toLowerCase()}?
        </div>
        <div className="plan-answer-grid">
          <div className="plan-answer-card primary">
            <div className="plan-answer-label">Заработать от продаж (прибыль)</div>
            <div className="plan-answer-value">{formatMoney(needSales, true)}</div>
            <div className="plan-answer-formula">
              = план {formatMoney(activePlan.profit, true)} + расходы {formatMoney(activeFixed, true)} − поступления {formatMoney(activeInflows, true)}
            </div>
          </div>
          <div className="plan-answer-card">
            <div className="plan-answer-label">Машин × {tonsPerTruck}т (маржа {marginPerKg} ₽/кг)</div>
            <div className="plan-answer-value">{trucksNeeded}</div>
            <div className="plan-answer-formula">
              1 маш = {formatMoney(tonsPerTruck * 1000 * marginPerKg, true)} прибыли
            </div>
          </div>
          <div className="plan-answer-card">
            <div className="plan-answer-label">Факт vs план (прибыль)</div>
            <div className={`plan-answer-value ${gapProfit > 0 ? 'text-danger' : 'text-success'}`}>
              {gapProfit > 0 ? '−' : '+'}{formatMoney(Math.abs(gapProfit), true)}
            </div>
            <div className="plan-answer-formula">
              Факт: {formatMoney(factForPeriod.profit, true)} / План: {formatMoney(activePlan.profit, true)}
            </div>
          </div>
        </div>

        <div className="plan-truck-params">
          <label><span>Тонн в машине</span><input type="number" value={tonsPerTruck} onChange={(e) => setTonsPerTruck(+e.target.value || 1)} /></label>
          <label><span>Маржа ₽/кг</span><input type="number" value={marginPerKg} onChange={(e) => setMarginPerKg(+e.target.value || 0)} /></label>
        </div>
        <div className="plan-margin-picker">
          <span>Быстрый сценарий маржи:</span>
          {marginScenarios.map((margin) => (
            <button
              key={margin}
              type="button"
              className={margin === marginPerKg ? 'active' : ''}
              onClick={() => setMarginPerKg(margin)}
            >
              {margin} ₽/кг
            </button>
          ))}
        </div>
      </div>

      {/* Сценарии маржи */}
      <div className="chart-card">
        <div className="chart-title">Сценарии по марже ₽/кг — сколько нужно отгрузить</div>
        <table className="data-table plan-table">
          <thead>
            <tr>
              <th>Маржа</th>
              <th className="text-right">Прибыль с 1 машины</th>
              <th className="text-right">Нужно кг</th>
              <th className="text-right">Нужно машин</th>
              <th>Что это значит</th>
            </tr>
          </thead>
          <tbody>
            {marginScenarios.map((margin) => {
              const kgNeeded = margin > 0 ? Math.ceil(needSales / margin) : 0;
              const trucks = trucksInPeriod(needSales, tonsPerTruck, margin, editPeriod);
              const isActive = margin === marginPerKg;
              return (
                <tr key={margin} className={isActive ? 'plan-row-active' : ''}>
                  <td>
                    <button type="button" className="plan-row-btn" onClick={() => setMarginPerKg(margin)}>
                      {margin} ₽/кг {isActive && '← выбран'}
                    </button>
                  </td>
                  <td className="text-right">{formatMoney(tonsPerTruck * 1000 * margin, true)}</td>
                  <td className="text-right font-medium">{formatNumber(kgNeeded)}</td>
                  <td className="text-right"><strong>{trucks}</strong></td>
                  <td className="text-muted">
                    За {PERIOD_LABELS[editPeriod].toLowerCase()} нужно закрыть прибыль {formatMoney(needSales, true)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Таблица — один план во всех периодах */}
      <div className="chart-card">
        <div className="chart-title">Один план — все периоды (пересчёт автоматически)</div>
        <table className="data-table plan-table">
          <thead>
            <tr>
              <th>Период</th>
              <th className="text-right">Прибыль (план)</th>
              <th className="text-right">Выручка</th>
              <th className="text-right">Кг</th>
              <th className="text-right">Расходы</th>
              <th className="text-right">Нужно от продаж</th>
              <th className="text-right">Машин</th>
              <th className="text-right">Факт приб.</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_PERIODS.map((p) => {
              const plan = allPlans[p];
              const fixed = fixedByPeriod[p];
              const inflow = fromMonthly(inflowsMonth, p);
              const need = needFromSales(plan.profit, fixed, inflow);
              const trucks = trucksInPeriod(need, tonsPerTruck, marginPerKg, p);
              const fact = fromMonthly(factMonthly.profit, p);
              const isActive = p === editPeriod;
              return (
                <tr key={p} className={isActive ? 'plan-row-active' : ''}>
                  <td>
                    <button type="button" className="plan-row-btn" onClick={() => setEditPeriod(p)}>
                      {PERIOD_LABELS[p]} {isActive && '← редактируете'}
                    </button>
                  </td>
                  <td className="text-right font-medium">{formatMoney(plan.profit, true)}</td>
                  <td className="text-right">{formatMoney(plan.revenue, true)}</td>
                  <td className="text-right">{formatNumber(plan.kg)}</td>
                  <td className="text-right text-muted">{formatMoney(fixed, true)}</td>
                  <td className="text-right font-medium">{formatMoney(need, true)}</td>
                  <td className="text-right"><strong>{trucks}</strong></td>
                  <td className="text-right">{formatMoney(fact, true)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Факт месяца */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title">Факт мая (из Excel)</div>
          <ProgressBar label="Прибыль" fact={sp.factProfit} plan={planMonthly.profit} />
          <ProgressBar label="Выручка" fact={sp.factRevenue} plan={planMonthly.revenue} />
          <ProgressBar label="Кг" fact={sp.factKg} plan={planMonthly.kg} unit="кг" />
        </div>
        <div className="chart-card">
          <div className="chart-title">Пример на {PERIOD_LABELS[editPeriod].toLowerCase()}</div>
          <div className="plan-example">
            <p>Чтобы выполнить план за <strong>{PERIOD_LABELS[editPeriod].toLowerCase()}</strong>, вам нужно:</p>
            <ul>
              <li>Заработать <strong>{formatMoney(needSales, true)}</strong> прибыли от сделок</li>
              <li>Это примерно <strong>{trucksNeeded} машин</strong> по {tonsPerTruck} тонн с маржой {marginPerKg} ₽/кг</li>
              <li>Или <strong>{formatNumber(activePlan.kg)} кг</strong> отгрузки при вашей марже</li>
              {gapProfit > 0 && (
                <li className="text-danger">Не хватает <strong>{formatMoney(gapProfit, true)}</strong> до плана — ускоряйте или добавьте сделки</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
