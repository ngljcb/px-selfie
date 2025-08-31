import { Grade } from '../model/entity/grade.model';

/** Converte "30" | 30 | "passed"/"idoneo" in numero o null (se idoneità) */
export function toNumericGrade(grade: number | string | null | undefined): number | null {
  if (grade == null) return null;
  if (typeof grade === 'number') return Number.isFinite(grade) ? grade : null;
  const s = String(grade).trim().toLowerCase();
  if (s === 'passed' || s === 'idoneo') return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/** dd/MM/yyyy (vuoto se non valida) */
export function formatDate(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Ordina per anno, poi per data, poi per nome corso. Ritorna NUOVO array */
export function normalizeAndSort(list: Grade[]): Grade[] {
  const copy = list.slice();
  copy.sort((a, b) => {
    const ya = (a.year ?? '').localeCompare(b.year ?? '');
    if (ya !== 0) return ya;
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    if (da !== db) return da - db;
    return (a.course_name ?? '').localeCompare(b.course_name ?? '');
  });
  return copy;
}

/** Calcola CFU totali, media ponderata e base di laurea (su 110) */
export function computeTotals(list: Grade[]): { totalCFU: number; average: number; laureaBase: number } {
  const totalCFU = list.reduce((s, g) => s + (Number(g.cfu) || 0), 0);

  let sumWeighted = 0;
  let sumCfu = 0;
  for (const g of list) {
    const nv = toNumericGrade(g.grade);
    if (nv != null) {
      const c = Number(g.cfu) || 0;
      sumWeighted += nv * c;
      sumCfu += c;
    }
  }
  const average = sumCfu > 0 ? +(sumWeighted / sumCfu).toFixed(2) : 0;
  const laureaBase = average ? +((average * 110) / 30).toFixed(2) : 0;

  return { totalCFU, average, laureaBase };
}

/** Raggruppa per anno, mantenendo l'ordine delle chiavi come inserite */
export function groupByYear(list: Grade[]): { years: string[]; byYear: Map<string, Grade[]> } {
  const byYear = new Map<string, Grade[]>();
  for (const g of list) {
    const y = g.year || '—';
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(g);
  }
  const years = Array.from(byYear.keys());
  return { years, byYear };
}