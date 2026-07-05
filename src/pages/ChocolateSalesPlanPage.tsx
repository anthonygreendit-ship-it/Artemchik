import { useMemo, useState } from 'react';
import { getChocolateData } from '../data/useDashboardData';
import { ChocolatePlanBuilder } from '../components/ChocolatePlanBuilder';
import { calcChocolateProduction, defaultSellPrice } from '../utils/chocolateCalculator';
import { formatMoney, formatNumber } from '../utils/format';

type SubTab = 'plan' | 'today';

function ChocolateTodayPanel() {
  const data = getChocolateData();
  const defaultIdx = data.products.findIndex((p) => p.name.toLowerCase().includes('белый+молоч'));
  const [selectedProductIndex, setSelectedProductIndex] = useState(defaultIdx >= 0 ? defaultIdx : 0);
  const [packsPerShift, setPacksPerShift] = useState(data.defaults.packsPerShift);
  const [shiftsPerDay, setShiftsPerDay] = useState(data.defaults.shiftsPerDay);
  const [shipPacksToday, setShipPacksToday] = useState(data.defaults.shipPacksToday);
  const [sellPricePerPack, setSellPricePerPack] = useState(
    defaultSellPrice(data.products[defaultIdx >= 0 ? defaultIdx : 0]),
  );

  const result = useMemo(
    () => calcChocolateProduction(data, { packsPerShift, shiftsPerDay, shipPacksToday, sellPricePerPack, selectedProductIndex }),
    [data, packsPerShift, shiftsPerDay, shipPacksToday, sellPricePerPack, selectedProductIndex],
  );

  return (
    <div className="plan-builder">
      <div className="plan-step">
        <div className="plan-step-num">→</div>
        <div className="plan-step-body">
          <div className="plan-step-title">Факт за сегодня</div>
          <label className="form-field" style={{ maxWidth: 400, marginBottom: 14 }}>
            <span>Рецепт</span>
            <select
              value={selectedProductIndex}
              onChange={(e) => {
                const idx = +e.target.value;
                setSelectedProductIndex(idx);
                setSellPricePerPack(defaultSellPrice(data.products[idx]));
              }}
            >
              {data.products.map((p, i) => (
                <option key={p.name} value={i}>{p.name}</option>
              ))}
            </select>
          </label>
          <div className="plan-input-grid">
            <label className="plan-input-card">
              <span>Уп/смена</span>
              <input type="number" value={packsPerShift} onChange={(e) => setPacksPerShift(+e.target.value || 0)} />
            </label>
            <label className="plan-input-card">
              <span>Смен</span>
              <input type="number" value={shiftsPerDay} onChange={(e) => setShiftsPerDay(+e.target.value || 1)} />
            </label>
            <label className="plan-input-card">
              <span>Отгрузили</span>
              <input type="number" value={shipPacksToday} onChange={(e) => setShipPacksToday(+e.target.value || 0)} />
            </label>
            <label className="plan-input-card">
              <span>Цена ₽/уп</span>
              <input type="number" value={Math.round(sellPricePerPack)} onChange={(e) => setSellPricePerPack(+e.target.value || 0)} />
            </label>
          </div>
        </div>
      </div>
      <div className="plan-answer">
        <div className="plan-answer-grid">
          <div className="plan-answer-card">
            <div className="plan-answer-label">Произвели</div>
            <div className="plan-answer-value">{formatNumber(result.producedToday)}</div>
          </div>
          <div className="plan-answer-card">
            <div className="plan-answer-label">Отгрузили</div>
            <div className="plan-answer-value">{formatNumber(result.shippedToday)}</div>
          </div>
          <div className="plan-answer-card primary">
            <div className="plan-answer-label">Прибыль сегодня</div>
            <div className={`plan-answer-value ${result.profitToday < 0 ? 'text-danger' : ''}`}>{formatMoney(result.profitToday, true)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChocolateSalesPlanPage() {
  const [sub, setSub] = useState<SubTab>('plan');

  return (
    <>
      <h2 className="page-title">План продаж · шоколад</h2>
      <p className="page-subtitle">Как в ягодном бизнесе: период → ягода → план → сколько смен и упаковок</p>

      <div className="sales-sub-tabs">
        <button type="button" className={`sales-sub-tab ${sub === 'plan' ? 'active' : ''}`} onClick={() => setSub('plan')}>
          📅 План (день · неделя · месяц · квартал)
        </button>
        <button type="button" className={`sales-sub-tab ${sub === 'today' ? 'active' : ''}`} onClick={() => setSub('today')}>
          📦 Факт за сегодня
        </button>
      </div>

      {sub === 'plan' ? <ChocolatePlanBuilder /> : <ChocolateTodayPanel />}
    </>
  );
}
