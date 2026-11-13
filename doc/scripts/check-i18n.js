// Verifica se pt-br.json e en-us.json têm a mesma estrutura (ids, tipos de bloco, tamanhos de listas)
import { readFileSync } from 'node:fs';

const load = (f) => JSON.parse(readFileSync(new URL(`../content/${f}`, import.meta.url), 'utf8'));
const pt = load('pt-br.json');
const en = load('en-us.json');
const errors = [];

function walk(a, b, path) {
  if (Array.isArray(a) !== Array.isArray(b) || typeof a !== typeof b) {
    errors.push(`${path}: tipos diferentes`);
    return;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) errors.push(`${path}: ${a.length} itens (pt-br) vs ${b.length} (en-us)`);
    a.forEach((x, i) => i < b.length && walk(x, b[i], `${path}[${i}]`));
    return;
  }
  if (a && typeof a === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!(k in a)) errors.push(`${path}.${k}: falta em pt-br`);
      else if (!(k in b)) errors.push(`${path}.${k}: falta em en-us`);
      else if (path !== '$.meta' && ['id', 'type', 'variant', 'ordered', 'language'].includes(k) && a[k] !== b[k]) errors.push(`${path}.${k}: "${a[k]}" vs "${b[k]}"`);
      else walk(a[k], b[k], `${path}.${k}`);
    }
    return;
  }
  if (typeof a === 'string' && (a.trim() === '') !== (b.trim() === '')) errors.push(`${path}: texto vazio em um dos idiomas`);
}

walk(pt, en, '$');
if (errors.length) {
  console.error(`✖ ${errors.length} divergência(s) entre pt-br.json e en-us.json:\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✔ Traduções consistentes (${pt.sections.length} seções).`);
