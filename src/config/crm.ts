const CRM_URL_KEY = 'upravlenka-crm-url';

/** Шаблон: https://crm.company.ru/deals/{id} */
export function loadCrmUrlTemplate(): string {
  try {
    return localStorage.getItem(CRM_URL_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveCrmUrlTemplate(url: string): void {
  localStorage.setItem(CRM_URL_KEY, url.trim());
}

export function isCrmConfigured(): boolean {
  return loadCrmUrlTemplate().length > 0;
}

export function getCrmDealUrl(dealId: string): string | null {
  const template = loadCrmUrlTemplate();
  if (!template) return null;
  if (template.includes('{id}')) return template.replace('{id}', encodeURIComponent(dealId));
  const base = template.replace(/\/$/, '');
  return `${base}/deals/${encodeURIComponent(dealId)}`;
}
