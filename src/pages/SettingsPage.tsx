import { useState } from 'react';
import { DEFAULT_SHEET_CONFIG, SHEET_SOURCE_LABELS, loadSheetConfig, saveSheetConfig, sheetUrlFromId } from '../config/sheets';
import { loadCrmUrlTemplate, saveCrmUrlTemplate } from '../config/crm';
import { GLOSSARY_ITEMS } from '../utils/productLabels';
import type { SheetSourceConfig } from '../types';

export function SettingsPage() {
  const [planRev, setPlanRev] = useState('90000000');
  const [planMargin, setPlanMargin] = useState('14');
  const [crmUrl, setCrmUrl] = useState(() => loadCrmUrlTemplate());
  const [saved, setSaved] = useState(false);
  const [crmSaved, setCrmSaved] = useState(false);
  const [sheetsSaved, setSheetsSaved] = useState(false);
  const [sheets, setSheets] = useState<SheetSourceConfig>(() => loadSheetConfig());
  const [spreadsheetId, setSpreadsheetId] = useState('');

  const updateSheet = (key: keyof SheetSourceConfig, value: string) => {
    setSheets((prev) => ({ ...prev, [key]: value }));
  };

  const applySpreadsheetId = () => {
    if (!spreadsheetId.trim()) return;
    setSheets({
      upravlenkaUrl: sheetUrlFromId(spreadsheetId.trim(), '0'),
      inventoryUrl: sheetUrlFromId(spreadsheetId.trim(), '1'),
      clientsUrl: sheetUrlFromId(spreadsheetId.trim(), '2'),
      purchasesUrl: sheetUrlFromId(spreadsheetId.trim(), '3'),
      chocolateUrl: sheetUrlFromId(spreadsheetId.trim(), '4'),
    });
  };

  return (
    <>
      <h2 className="page-title">Настройки</h2>
      <p className="page-subtitle">Google Таблицы и параметры dashboard</p>

      <div className="chart-card settings-card">
        <div className="chart-title">Google Таблицы — источник данных</div>
        <p className="settings-note">
          Опубликуйте таблицу: Файл → Поделиться → «Все, у кого есть ссылка» (просмотр).
          Вставьте ID таблицы или CSV-ссылки на каждый лист. Нажмите ↻ в шапке для загрузки.
        </p>

        <label className="form-field">
          <span>ID Google Таблицы (быстрая подстановка URL)</span>
          <div className="settings-row">
            <input value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms" />
            <button type="button" className="promo-btn" onClick={applySpreadsheetId}>Подставить URL</button>
          </div>
        </label>

        {(Object.keys(SHEET_SOURCE_LABELS) as Array<keyof SheetSourceConfig>).map((key) => (
          <label key={key} className="form-field">
            <span>{SHEET_SOURCE_LABELS[key]}</span>
            <input
              value={sheets[key]}
              onChange={(e) => updateSheet(key, e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0"
            />
          </label>
        ))}

        <button
          type="button"
          className="promo-btn"
          style={{ marginTop: 12 }}
          onClick={() => {
            saveSheetConfig(sheets);
            setSheetsSaved(true);
            setTimeout(() => setSheetsSaved(false), 2000);
          }}
        >
          {sheetsSaved ? 'Таблицы сохранены ✓' : 'Сохранить Google Таблицы'}
        </button>

        <button
          type="button"
          className="business-tab"
          style={{ marginTop: 10, marginLeft: 10 }}
          onClick={() => setSheets({ ...DEFAULT_SHEET_CONFIG })}
        >
          Очистить
        </button>
      </div>

      <div className="chart-card settings-card">
        <div className="chart-title">CRM — карточки сделок</div>
        <p className="settings-note">
          URL вашей самописной CRM. При клике на сделку откроется новая вкладка.
          Используйте <code>{'{id}'}</code> как placeholder ID сделки.
        </p>
        <label className="form-field">
          <span>Шаблон URL</span>
          <input
            value={crmUrl}
            onChange={(e) => setCrmUrl(e.target.value)}
            placeholder="https://crm.company.ru/deals/{id}"
          />
        </label>
        <button
          type="button"
          className="promo-btn"
          style={{ marginTop: 12 }}
          onClick={() => {
            saveCrmUrlTemplate(crmUrl);
            setCrmSaved(true);
            setTimeout(() => setCrmSaved(false), 2000);
          }}
        >
          {crmSaved ? 'CRM URL сохранён ✓' : 'Сохранить CRM URL'}
        </button>
      </div>

      <div className="chart-card settings-card">
        <div className="chart-title">Сокращения (кор, МЛ, МХ)</div>
        <ul className="glossary-list">
          {GLOSSARY_ITEMS.map((g) => (
            <li key={g.term}><strong>{g.term}</strong> — {g.meaning}</li>
          ))}
        </ul>
      </div>

      <div className="chart-card settings-card">
        <div className="chart-title">План продаж на месяц</div>
        <label className="form-field">
          <span>План выручки, ₽</span>
          <input value={planRev} onChange={(e) => setPlanRev(e.target.value)} />
        </label>
        <label className="form-field">
          <span>План маржи, %</span>
          <input value={planMargin} onChange={(e) => setPlanMargin(e.target.value)} />
        </label>
        <button
          type="button"
          className="promo-btn"
          style={{ marginTop: 12 }}
          onClick={() => {
            localStorage.setItem('upravlenka-plan-rev', planRev);
            localStorage.setItem('upravlenka-plan-margin', planMargin);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
        >
          {saved ? 'Сохранено ✓' : 'Сохранить план'}
        </button>
      </div>

      <div className="chart-card settings-card">
        <div className="chart-title">Обновление данных</div>
        <p className="settings-note">
          <strong>Google Таблицы:</strong> сохраните URL → нажмите ↻ в шапке<br />
          <strong>Excel управленка:</strong> <code>npm run extract</code><br />
          <strong>Шоколад:</strong> <code>npm run extract:chocolate</code>
        </p>
      </div>
    </>
  );
}
