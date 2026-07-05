import { getProductHints } from '../utils/productLabels';

export function ProductCell({ name, maxLen = 48 }: { name: string; maxLen?: number }) {
  const hints = getProductHints(name);
  const short = name.length > maxLen ? `${name.slice(0, maxLen)}…` : name;

  return (
    <div className="product-cell">
      <span title={name}>{short}</span>
      {hints.length > 0 && (
        <span className="product-hints">{hints.join(' · ')}</span>
      )}
    </div>
  );
}
