import { useMemo, useState } from 'react';
import { getChocolateData } from '../data/useDashboardData';
import type { ChocolateProduct } from '../types';
import {
  chocolateFixedByPeriod,
  needFromSales,
  packsForProfit,
  shiftsInPeriod,
} from '../utils/chocolatePlanner';
import {
  defaultSellPrice,
  productCostBreakdown,
  productCostPerPack,
} from '../utils/chocolateCalculator';
import {
  marginPct,
  PERIOD_HINTS,
  PERIOD_LABELS,
  spreadPlan,
  toMonthly,
  type PlanPeriod,
  type PlanTargets,
} from '../utils/planPeriods';
import { formatMoney, formatNumber, formatPercent } from '../utils/format';

const PLAN_PERIODS: PlanPeriod[] = ['day', 'week', 'month', 'quarter'];

function berryGroup(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('клубник')) return 'Клубника';
  if (n.includes('малин')) return 'Малина';
  if (n.includes('голубик')) return 'Голубика';
  if (n.includes('жимолост')) return 'Жимолость';
  if (n.includes('клюкв')) return 'Клюква';
  if (n.includes('смородин')) return 'Смородина';
  if (n.includes('ежевик')) return 'Ежевика';
  if (n.includes('вишн')) return 'Вишня';
  return 'Прочее';
}

export function ChocolatePlanBuilder() {
  const data = getChocolateData();
  const fixedByPeriod = chocolateFixedByPeriod();

  const defaultIdx = data.products.findIndex((p) => p.name.toLowerCase().includes('белый+молоч'));
  const [selectedProductIndex, setSelectedProductIndex] = useState(defaultIdx >= 0 ? defaultIdx : 0);
  const [editPeriod, setEditPeriod] = useState<PlanPeriod>('month');
  const [packsPerShift, setPacksPerShift] = useState(data.defaults.packsPerShift);
  const [lines, setLines] = useState(1);
  const [sellPricePerPack, setSellPricePerPack] = useState(
    defaultSellPrice(data.products[selectedProductIndex] ?? data.products[0]),
  );

  const product = data.products[selectedProductIndex];
  const breakdown = useMemo(
    () => productCostBreakdown(product, sellPricePerPack),
    [product, sellPricePerPack],
  );
  const profitPerPack = breakdown.profitPerPack;

  const defaultMonthlyProfit = Math.round(profitPerPack * packsPerShift * 2 * 22);
  const [planMonthly, setPlanMonthly] = useState<PlanTargets>({
    profit: defaultMonthlyProfit,
    revenue: Math.round(defaultMonthlyProfit / 0.25),
    kg: Math.round(packsPerShift * 2 * 22),
    deals: Math.round(packsPerShift * 2 * 22 / packsPerShift),
  });

  const allPlans = useMemo(() => spreadPlan(planMonthly, 'month'), [planMonthly]);

  const updatePlan = (field: keyof PlanTargets, value: number) => {
    setPlanMonthly((p) => ({ ...p, [field]: toMonthly(value, editPeriod) }));
  };

  const selectProduct = (index: number, p: ChocolateProduct) => {
    setSelectedProductIndex(index);
    const sell = defaultSellPrice(p);
    setSellPricePerPack(sell);
  };

  const activePlan = allPlans[editPeriod];
  const activeFixed = fixedByPeriod[editPeriod];
  const needSales = needFromSales(activePlan.profit, activeFixed, 0);
  const shiftsNeeded = shiftsInPeriod(needSales, packsPerShift, profitPerPack, lines);
  const packsNeeded = packsForProfit(needSales, profitPerPack);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, { index: number; product: ChocolateProduct }[]>();
    data.products.forEach((p, i) => {
      const g = berryGroup(p.name);
      const list = map.get(g) ?? [];
      list.push({ index: i, product: p });
      map.set(g, list);
    });
    return [...map.entries()];
  }, [data.products]);

  return (
    <div className="plan-builder">
      {/* ШАГ 1 — период */}
      <div className="plan-step">
        <div className="plan-step-num">1</div>
        <div className="plan-step-body">
          <div className="plan-step-title">На какой срок ставите план?</div>
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

      {/* ШАГ 2 — выбор ягоды / SKU */}
      <div className="plan-step">
        <div className="plan-step-num">2</div>
        <div className="plan-step-body">
          <div className="plan-step-title">Какую ягоду / рецепт считаем?</div>
          {groupedProducts.map(([group, items]) => (
            <div key={group} className="choco-plan-group">
              <div className="choco-plan-group-title">{group}</div>
              <div className="choco-product-grid">
                {items.map(({ index, product: p }) => {
                  const cost = productCostPerPack(p);
                  const sell = defaultSellPrice(p);
                  const profit = sell - cost;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      className={`choco-product-card ${selectedProductIndex === index ? 'active' : ''}`}
                      onClick={() => selectProduct(index, p)}
                    >
                      <span className="choco-product-name">{p.name}</span>
                      <span className="choco-product-cost">с/с {formatMoney(cost)} → {formatMoney(sell)}</span>
                      <span className="choco-product-profit text-success">+{formatMoney(profit)}/уп</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <label className="form-field" style={{ marginTop: 14, maxWidth: 280 }}>
            <span>Цена продажи, ₽/уп (можно изменить)</span>
            <input type="number" value={Math.round(sellPricePerPack)} onChange={(e) => setSellPricePerPack(+e.target.value || 0)} />
          </label>
        </div>
      </div>

      {/* ШАГ 3 — план */}
      <div className="plan-step">
        <div className="plan-step-num">3</div>
        <div className="plan-step-body">
          <div className="plan-step-title">
            План на <strong>{PERIOD_LABELS[editPeriod].toLowerCase()}</strong>
          </div>
          <div className="plan-input-grid">
            <label className="plan-input-card">
              <span>Прибыль, ₽</span>
              <input type="number" value={Math.round(activePlan.profit)} onChange={(e) => updatePlan('profit', +e.target.value || 0)} />
              <small>Главная цифра</small>
            </label>
            <label className="plan-input-card">
              <span>Выручка, ₽</span>
              <input type="number" value={Math.round(activePlan.revenue)} onChange={(e) => updatePlan('revenue', +e.target.value || 0)} />
              <small>Маржа {formatPercent(marginPct(activePlan.profit, activePlan.revenue), false)}</small>
            </label>
            <label className="plan-input-card">
              <span>Упаковок</span>
              <input type="number" value={Math.round(activePlan.kg)} onChange={(e) => updatePlan('kg', +e.target.value || 0)} />
              <small>≈ {formatNumber(packsNeeded)} нужно для плана</small>
            </label>
            <label className="plan-input-card">
              <span>Смен производства</span>
              <input type="number" value={Math.round(activePlan.deals)} onChange={(e) => updatePlan('deals', +e.target.value || 0)} />
              <small>≈ {shiftsNeeded} смен нужно</small>
            </label>
          </div>
        </div>
      </div>

      {/* ШАГ 4 — мощность */}
      <div className="plan-step">
        <div className="plan-step-num">4</div>
        <div className="plan-step-body">
          <div className="plan-step-title">Мощность цеха</div>
          <p className="plan-hint">
            <strong>Смена</strong> — одна рабочая смена (например утро или вечер).
            {' '}<strong>Линия</strong> — один поток производства (отдельная линия упаковки).
            Это не «машина с ягодами» из трейдинга — здесь считаем только производство.
          </p>
          <div className="plan-expense-row">
            <div className="plan-expense-item">
              <span>Упаковок за 1 смену (на 1 линии)</span>
              <input className="plan-inline-input" type="number" value={packsPerShift} onChange={(e) => setPacksPerShift(+e.target.value || 0)} />
            </div>
            <div className="plan-expense-item">
              <span>Сколько линий работает</span>
              <input className="plan-inline-input" type="number" value={lines} onChange={(e) => setLines(+e.target.value || 1)} />
            </div>
            <div className="plan-expense-item">
              <span>Постоянные расходы / {PERIOD_LABELS[editPeriod].toLowerCase()}</span>
              <strong>{formatMoney(activeFixed, true)}</strong>
            </div>
          </div>
          <div className="choco-inline-result">
            За 1 смену все линии сделают: <strong>{formatNumber(packsPerShift * lines)} уп.</strong>
            {' '}· прибыль <strong>{formatMoney(packsPerShift * lines * profitPerPack, true)}</strong>
          </div>
        </div>
      </div>

      {/* ОТВЕТ */}
      <div className="plan-answer">
        <div className="plan-answer-title">Что нужно за {PERIOD_LABELS[editPeriod].toLowerCase()}?</div>
        <div className="plan-answer-grid">
          <div className="plan-answer-card primary">
            <div className="plan-answer-label">Заработать от продаж</div>
            <div className="plan-answer-value">{formatMoney(needSales, true)}</div>
            <div className="plan-answer-formula">
              = план {formatMoney(activePlan.profit, true)} + расходы {formatMoney(activeFixed, true)}
            </div>
          </div>
          <div className="plan-answer-card">
            <div className="plan-answer-label">Смен производства</div>
            <div className="plan-answer-value">{shiftsNeeded}</div>
            <div className="plan-answer-formula">
              {lines} {lines === 1 ? 'линия' : 'линии'} × {formatNumber(packsPerShift)} уп/смена
            </div>
          </div>
          <div className="plan-answer-card">
            <div className="plan-answer-label">Упаковок отгрузить</div>
            <div className="plan-answer-value">{formatNumber(packsNeeded)}</div>
            <div className="plan-answer-formula">{product.name}</div>
          </div>
        </div>
      </div>

      {/* Сценарии по ягодам */}
      <div className="chart-card">
        <div className="chart-title">Сценарии — другие ягоды / рецепты</div>
        <table className="data-table plan-table">
          <thead>
            <tr>
              <th>Рецепт</th>
              <th className="text-right">Прибыль/уп</th>
              <th className="text-right">Упаковок</th>
              <th className="text-right">Смен</th>
            </tr>
          </thead>
          <tbody>
            {data.products.map((p, i) => {
              const sell = defaultSellPrice(p);
              const profit = sell - productCostPerPack(p);
              const packs = packsForProfit(needSales, profit);
              const shifts = shiftsInPeriod(needSales, packsPerShift, profit, lines);
              const isActive = i === selectedProductIndex;
              return (
                <tr key={p.name} className={isActive ? 'plan-row-active' : ''}>
                  <td>
                    <button type="button" className="plan-row-btn" onClick={() => selectProduct(i, p)}>
                      {p.name} {isActive && '← выбран'}
                    </button>
                  </td>
                  <td className="text-right text-success">{formatMoney(profit)}</td>
                  <td className="text-right font-medium">{formatNumber(packs)}</td>
                  <td className="text-right"><strong>{shifts}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Все периоды */}
      <div className="chart-card">
        <div className="chart-title">Один план — все периоды</div>
        <table className="data-table plan-table">
          <thead>
            <tr>
              <th>Период</th>
              <th className="text-right">Прибыль</th>
              <th className="text-right">Упаковок</th>
              <th className="text-right">Расходы</th>
              <th className="text-right">Нужно</th>
              <th className="text-right">Смен</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_PERIODS.map((p) => {
              const plan = allPlans[p];
              const fixed = fixedByPeriod[p];
              const need = needFromSales(plan.profit, fixed, 0);
              const shifts = shiftsInPeriod(need, packsPerShift, profitPerPack, lines);
              const isActive = p === editPeriod;
              return (
                <tr key={p} className={isActive ? 'plan-row-active' : ''}>
                  <td>
                    <button type="button" className="plan-row-btn" onClick={() => setEditPeriod(p)}>
                      {PERIOD_LABELS[p]} {isActive && '←'}
                    </button>
                  </td>
                  <td className="text-right font-medium">{formatMoney(plan.profit, true)}</td>
                  <td className="text-right">{formatNumber(plan.kg)}</td>
                  <td className="text-right text-muted">{formatMoney(fixed, true)}</td>
                  <td className="text-right font-medium">{formatMoney(need, true)}</td>
                  <td className="text-right"><strong>{shifts}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="chart-card">
        <div className="chart-title">Пример на {PERIOD_LABELS[editPeriod].toLowerCase()}</div>
        <div className="plan-example">
          <ul>
            <li>Заработать <strong>{formatMoney(needSales, true)}</strong> прибыли</li>
            <li>Отгрузить <strong>{formatNumber(packsNeeded)} уп.</strong> «{product.name}»</li>
            <li>Отработать <strong>{shiftsNeeded} смен</strong> ({lines} {lines === 1 ? 'линия' : 'линии'}, {formatNumber(packsPerShift)} уп/смена)</li>
            <li>Прибыль с уп.: <strong>{formatMoney(profitPerPack)}</strong> (наценка {formatPercent(breakdown.markupPct, false)})</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
