import type { BusinessUnit, PageId, FxImpactSummary } from '../types';
import { PAGE_LABELS } from '../utils/format';
import { ExchangeRateBar } from './ExchangeRateBar';
import {
  LayoutDashboard,
  Target,
  Handshake,
  Wallet,
  TrendingUp,
  Receipt,
  Package,
  Truck,
  BarChart3,
  Settings,
  MessageSquare,
  Bell,
  LogOut,
  Search,
  HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  page: PageId;
  businessUnit: BusinessUnit;
  onBusinessChange: (unit: BusinessUnit) => void;
  onNavigate: (page: PageId) => void;
  receivablesCount: number;
  dealsCount: number;
}

const BERRIES_NAV: { page: PageId; icon: typeof LayoutDashboard; badge?: boolean }[] = [
  { page: 'pulse', icon: LayoutDashboard },
  { page: 'sales-plan', icon: Target },
  { page: 'deals', icon: Handshake, badge: true },
  { page: 'money', icon: Wallet },
  { page: 'roi', icon: TrendingUp },
  { page: 'receivables', icon: Receipt, badge: true },
  { page: 'warehouse', icon: Package },
  { page: 'purchases', icon: Truck },
  { page: 'month', icon: BarChart3 },
];

const CHOCOLATE_NAV: { page: PageId; icon: typeof Target }[] = [
  { page: 'sales-plan', icon: Target },
];

export function Sidebar({ page, businessUnit, onBusinessChange, onNavigate, receivablesCount, dealsCount }: SidebarProps) {
  const berriesNav = BERRIES_NAV;
  const chocolateNav = CHOCOLATE_NAV;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">У</div>
        <span className="sidebar-logo-text">Управленка</span>
      </div>

      <div className="business-unit-switcher">
        <button
          type="button"
          className={`business-unit-btn ${businessUnit === 'berries' ? 'active' : ''}`}
          onClick={() => onBusinessChange('berries')}
        >
          🫐 Трейдинг ягод
        </button>
        <button
          type="button"
          className={`business-unit-btn ${businessUnit === 'chocolate' ? 'active' : ''}`}
          onClick={() => onBusinessChange('chocolate')}
        >
          🍫 Ягоды в шоколаде
        </button>
      </div>

      <nav className="nav-section">
        <div className="nav-section-title">{businessUnit === 'chocolate' ? 'Производство' : 'Обзор'}</div>
        {businessUnit === 'chocolate' && chocolateNav.map(({ page: p, icon: Icon }) => (
          <button key={p} type="button" className={`nav-item ${page === p ? 'active' : ''}`} onClick={() => onNavigate(p)}>
            <Icon size={18} />
            {PAGE_LABELS[p]}
          </button>
        ))}
        {businessUnit === 'berries' && berriesNav.map(({ page: p, icon: Icon, badge }) => (
          <button key={p} type="button" className={`nav-item ${page === p ? 'active' : ''}`} onClick={() => onNavigate(p)}>
            <Icon size={18} />
            {PAGE_LABELS[p]}
            {badge && p === 'receivables' && receivablesCount > 0 && (
              <span className="nav-badge">{receivablesCount}</span>
            )}
            {badge && p === 'deals' && dealsCount > 0 && (
              <span className="nav-badge">{dealsCount}</span>
            )}
          </button>
        ))}
      </nav>

      <nav className="nav-section">
        <div className="nav-section-title">Профиль</div>
        <button type="button" className="nav-item" onClick={() => alert('Раздел сообщений — в разработке')}>
          <MessageSquare size={18} /> Сообщения
        </button>
        <button type="button" className="nav-item" onClick={() => alert('Уведомления — в разработке')}>
          <Bell size={18} /> Уведомления
        </button>
        <button type="button" className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => onNavigate('settings')}>
          <Settings size={18} /> Настройки
        </button>
        <button type="button" className="nav-item" onClick={() => alert('Выход — демо-режим')}>
          <LogOut size={18} /> Выход
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">АГ</div>
          <div>
            <div className="user-name">Anthony</div>
            <div className="user-email">upravlenka@local</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface HeaderProps {
  page: PageId;
  reportDate: string;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onNavigate: (page: PageId) => void;
  sheetStatus?: string;
  sheetsConnected?: boolean;
  fx?: FxImpactSummary | null;
  fxLoading?: boolean;
  onFxDetail?: () => void;
}

export function Header({ page, reportDate, search, onSearchChange, onRefresh, onNavigate, sheetStatus, sheetsConnected, fx, fxLoading, onFxDetail }: HeaderProps) {
  return (
    <header className="header">
      <div className="breadcrumbs">
        Pages / <span>{PAGE_LABELS[page]}</span>
        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
          Срез на {reportDate}
          {sheetsConnected && <span className="sheet-connected"> · Google Таблицы</span>}
        </div>
        {sheetStatus && <div className="sheet-status">{sheetStatus}</div>}
      </div>
      <div className="header-actions">
        <ExchangeRateBar fx={fx ?? null} loading={fxLoading} onDetail={onFxDetail} />
        <div className="search-bar">
          <Search size={16} color="#94a3b8" />
          <input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button type="button" className="icon-btn" aria-label="Обновить" onClick={onRefresh}>
          ↻
        </button>
        <button type="button" className="icon-btn" aria-label="Помощь" onClick={() => alert('Данные из Google Таблиц или локального JSON. Настройте URL в разделе Настройки.')}>
          <HelpCircle size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label="Настройки" onClick={() => onNavigate('settings')}>
          <Settings size={18} />
        </button>
        <div className="user-avatar" style={{ width: 34, height: 34, fontSize: 12 }}>АГ</div>
      </div>
    </header>
  );
}
