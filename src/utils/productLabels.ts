/** Расшифровка сокращений в номенклатуре и колонке «ЮЛ» */

export const BUSINESS_LABELS: Record<string, string> = {
  МЛ: 'Микс Логистик — импорт',
  МХ: 'Микс Холод — склад/логистика',
  ФБ: 'ФрутБерри — розница / полный цикл',
};

export function accountBankLabel(acc: { bank?: string; business?: string; name?: string }): string {
  if (acc.bank) return acc.bank;
  if (acc.business === 'МЛ') return 'Сбер';
  if (acc.business === 'ФБ') return 'ВТБ';
  return acc.business ?? '—';
}

/** В таблицах платежей: МЛ/ФБ → банк, где это счёт */
export function paymentPartyLabel(business: string | null | undefined): string {
  if (business === 'МЛ') return 'Сбер';
  if (business === 'ФБ') return 'ВТБ';
  return business ?? '—';
}

export function businessLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return BUSINESS_LABELS[code] ?? code;
}

export function getProductHints(name: string): string[] {
  const hints: string[] = [];
  const n = name.toLowerCase();

  if (/\bкор\b|в кор/.test(n)) hints.push('кор — короб 10 кг');
  if (/\/мл|\(мл\)|кор\/мл/.test(n)) hints.push('МЛ — юрлицо «Микс Логистик» (импорт)');
  if (/\/мх|\(мх\)|кор\/мх/.test(n)) hints.push('МХ — «Микс Холод» (склад, холод)');
  if (/\bрб\b|чистки рб/.test(n)) hints.push('РБ — переработка в Беларуси');
  if (/отход/.test(n)) hints.push('отходы — после сортировки/чистки');

  return [...new Set(hints)];
}

export const GLOSSARY_ITEMS = [
  { term: 'кор', meaning: 'Короб стандартной фасовки 10 кг. «по 72 кор/МЛ» — 72 короба на паллете, отгрузка через Микс Логистик.' },
  { term: 'МЛ', meaning: 'ООО «Микс Логистик» — импортная компания, закупки из Китая, Чили и др.' },
  { term: 'МХ', meaning: '«Микс Холод» — складская / холодовая логистика, другая площадка отгрузки.' },
  { term: 'ФБ', meaning: '«ФрутБерри» — розница и сделки полного цикла в РФ.' },
  { term: 'ЮЛ', meaning: 'Юридическое лицо, через которое прошла сделка или лежит товар.' },
];
