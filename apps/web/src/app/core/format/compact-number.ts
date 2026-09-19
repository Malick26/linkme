const cache = new Map<string, Intl.NumberFormat>();

function fmt(locale: string): Intl.NumberFormat {
  let f = cache.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
    cache.set(locale, f);
  }
  return f;
}

/**
 * Formatage compact façon maquette : 245000 → « 245K », 8400000 → « 8.4M ».
 * On part de `Intl.NumberFormat` compact (brief §7.2) puis on normalise les suffixes
 * français (« k », « M », « Md ») vers la notation courte des réseaux sociaux (K, M, B)
 * et le séparateur décimal en point, comme sur la maquette.
 */
export function compactNumber(value: number | null | undefined, locale = 'fr'): string {
  if (value == null || !Number.isFinite(value)) return '0';
  const parts = fmt(locale).formatToParts(value);
  let out = '';
  for (const p of parts) {
    switch (p.type) {
      case 'decimal':
        out += '.';
        break;
      case 'group':
      case 'literal':
        break;
      case 'compact': {
        const c = p.value.replace(/ /g, '').trim().toLowerCase();
        out += c === 'k' || c === 'k.' ? 'K' : c.startsWith('md') || c === 'b' ? 'B' : c.startsWith('m') ? 'M' : p.value.toUpperCase();
        break;
      }
      default:
        out += p.value;
    }
  }
  return out;
}

const xof = new Intl.NumberFormat('fr-SN', { maximumFractionDigits: 0 });
/** 15000 → « 15 000 FCFA » (entiers, sans décimales). */
export function formatXof(amount: number): string {
  return `${xof.format(Math.trunc(amount)).replace(/ | /g, ' ')} FCFA`;
}
