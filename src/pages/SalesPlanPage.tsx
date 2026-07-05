import { useState } from 'react';
import type { DashboardData } from '../types';
import { PlanBuilder } from '../components/PlanBuilder';
import { SalesCalculator } from '../components/SalesCalculator';

type SubTab = 'plan' | 'scenarios';

export function SalesPlanPage({ data }: { data: DashboardData }) {
  const [sub, setSub] = useState<SubTab>('plan');

  return (
    <>
      <h2 className="page-title">План продаж</h2>
      <p className="page-subtitle">
        Ставьте план на день / неделю / месяц / квартал — система сама пересчитает, сколько нужно продать
      </p>

      <div className="sales-sub-tabs">
        <button type="button" className={`sales-sub-tab ${sub === 'plan' ? 'active' : ''}`} onClick={() => setSub('plan')}>
          📅 План (день · неделя · месяц · квартал)
        </button>
        <button type="button" className={`sales-sub-tab sales-sub-tab-calc ${sub === 'scenarios' ? 'active' : ''}`} onClick={() => setSub('scenarios')}>
          🧮 Сценарии (микс клиентов)
        </button>
      </div>

      {sub === 'plan' ? <PlanBuilder data={data} /> : <SalesCalculator data={data} />}
    </>
  );
}
