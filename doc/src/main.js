import './styles.css';
import mermaid from 'mermaid';
import ptBR from '../content/pt-br.json';
import enUS from '../content/en-us.json';

const CONTENT = { 'pt-br': ptBR, 'en-us': enUS };
const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
};

let lang = store.get('doc-lang', navigator.language?.toLowerCase().startsWith('pt') ? 'pt-br' : 'en-us');
if (!CONTENT[lang]) lang = 'pt-br';
let theme = store.get('doc-theme', 'dark');
let collapsed = store.get('doc-sidebar', 'open') === 'collapsed';

const ICON_ATTRS = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
// Ícones sun e moon do Lucide (lucide.dev), inline para não precisar de dependência
const ICONS = {
  sun: `<svg ${ICON_ATTRS}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg ${ICON_ATTRS}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`
};

const $ = (id) => document.getElementById(id);
const data = () => CONTENT[lang];

const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Markdown inline mínimo: `code`, **negrito**, *itálico*, [texto](url)
function inline(s = '') {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
      const safe = /^(https?:|#|\/|\.)/.test(u) ? u : '#';
      const ext = /^https?:/.test(safe) ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${safe}"${ext}>${t}</a>`;
    });
}

const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const mermaidQueue = [];

function renderBlock(b) {
  switch (b.type) {
    case 'heading': {
      const id = b.id || slug(b.text);
      return `<h3 id="${esc(id)}" data-toc>${inline(b.text)}</h3>`;
    }
    case 'paragraph':
      return `<p>${inline(b.text)}</p>`;
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      return `<${tag}>${(b.items || []).map((i) => `<li>${inline(i)}</li>`).join('')}</${tag}>`;
    }
    case 'code':
      return `<div class="code"><div class="code-head"><span>${esc(b.title || b.language || '')}</span>
        <button class="copy" data-copy>${esc(data().ui.copy)}</button></div>
        <pre><code>${esc(b.code)}</code></pre></div>`;
    case 'table':
      return `<div class="table-wrap"><table><thead><tr>${(b.headers || []).map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>
        <tbody>${(b.rows || []).map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'callout':
      return `<div class="callout callout-${esc(b.variant || 'info')}">${b.title ? `<strong>${inline(b.title)}</strong>` : ''}<p>${inline(b.text)}</p></div>`;
    case 'mermaid': {
      const i = mermaidQueue.push(b.code) - 1;
      return `<figure class="diagram"><div class="mermaid" data-mermaid="${i}"></div>${b.caption ? `<figcaption>${inline(b.caption)}</figcaption>` : ''}</figure>`;
    }
    case 'cards':
      return `<div class="cards">${(b.items || []).map((c) => `<div class="card"><strong>${inline(c.title)}</strong><p>${inline(c.text)}</p></div>`).join('')}</div>`;
    case 'divider':
      return '<hr />';
    default:
      return `<div class="callout callout-warning"><p>Unknown block type: ${esc(b.type)}</p></div>`;
  }
}

function currentId() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('/')[0] || '');
  const secs = data().sections;
  return secs.some((s) => s.id === id) ? id : secs[0]?.id;
}

function renderNav() {
  const d = data();
  const active = currentId();
  const groups = [];
  for (const s of d.sections) {
    const g = s.group || '';
    let grp = groups.find((x) => x.name === g);
    if (!grp) groups.push((grp = { name: g, items: [] }));
    grp.items.push(s);
  }
  $('sidebar').innerHTML = groups.map((g) => `
    <div class="nav-group">${g.name ? `<div class="nav-title">${esc(g.name)}</div>` : ''}
      ${g.items.map((s) => `<a href="#/${esc(s.id)}" class="nav-link${s.id === active ? ' active' : ''}">${esc(s.title)}</a>`).join('')}
    </div>`).join('');
}

function renderSection() {
  const d = data();
  const id = currentId();
  const idx = d.sections.findIndex((s) => s.id === id);
  const s = d.sections[idx];
  if (!s) { $('content').innerHTML = `<p>${esc(d.ui.empty)}</p>`; return; }
  mermaidQueue.length = 0;
  const prev = d.sections[idx - 1];
  const next = d.sections[idx + 1];
  $('content').innerHTML = `
    <article>
      <h1>${inline(s.title)}</h1>
      ${s.summary ? `<p class="lead">${inline(s.summary)}</p>` : ''}
      ${(s.blocks || []).map(renderBlock).join('')}
    </article>
    <div class="pager">
      ${prev ? `<a href="#/${esc(prev.id)}">← ${esc(prev.title)}</a>` : '<span></span>'}
      ${next ? `<a href="#/${esc(next.id)}">${esc(next.title)} →</a>` : '<span></span>'}
    </div>
    <footer class="foot">${esc(d.ui.generated)} ${esc(d.meta.generatedAt || '')}</footer>`;

  // TOC
  const heads = [...$('content').querySelectorAll('[data-toc]')];
  $('toc').innerHTML = heads.length
    ? `<div class="nav-title">${esc(d.ui.onThisPage)}</div>${heads.map((h) => `<a href="#/${esc(id)}/${esc(h.id)}" data-scroll="${esc(h.id)}">${esc(h.textContent)}</a>`).join('')}`
    : '';

  // Mermaid
  const nodes = [...$('content').querySelectorAll('[data-mermaid]')];
  nodes.forEach((n) => { n.textContent = mermaidQueue[Number(n.dataset.mermaid)]; });
  if (nodes.length) mermaid.run({ nodes }).catch((e) => console.warn('Mermaid:', e));

  const anchor = decodeURIComponent(location.hash.split('/')[2] || '');
  if (anchor) document.getElementById(anchor)?.scrollIntoView();
  else window.scrollTo(0, 0);
}

function renderSearch(q) {
  const d = data();
  const term = q.trim().toLowerCase();
  if (!term) return renderAll();
  const hits = d.sections.filter((s) => JSON.stringify(s).toLowerCase().includes(term));
  $('toc').innerHTML = '';
  $('content').innerHTML = `<article><h1>${esc(d.ui.searchResults)}: “${esc(q)}”</h1>
    ${hits.length ? `<ul class="results">${hits.map((s) => `<li><a href="#/${esc(s.id)}">${esc(s.title)}</a>${s.summary ? `<p>${inline(s.summary)}</p>` : ''}</li>`).join('')}</ul>`
    : `<p>${esc(d.ui.noResults)}</p>`}</article>`;
}

function renderChrome() {
  const d = data();
  document.documentElement.lang = lang === 'pt-br' ? 'pt-BR' : 'en-US';
  document.documentElement.dataset.theme = theme;
  document.title = `${d.meta.title} — ${d.ui.docs}`;
  $('brand').textContent = d.meta.title;
  $('version').textContent = d.meta.version ? `v${d.meta.version}` : '';
  $('search').placeholder = d.ui.searchPlaceholder;
  document.body.classList.toggle('sidebar-collapsed', collapsed);
  const label = collapsed ? d.ui.expandSidebar : d.ui.collapseSidebar;
  $('collapseBtn').setAttribute('aria-label', label);
  $('collapseBtn').title = label;
  // Mostra o idioma atual como texto (PTBR / ENUS); clicar alterna
  $('lang').textContent = lang.replace('-', '').toUpperCase();
  $('lang').title = d.meta.languageName || lang;
  // No escuro mostra o sol (ir para claro); no claro mostra a lua
  $('theme').innerHTML = theme === 'dark' ? ICONS.sun : ICONS.moon;
  $('theme').setAttribute('aria-label', theme === 'dark' ? 'Light mode' : 'Dark mode');
}

function renderAll() {
  renderChrome();
  renderNav();
  renderSection();
}

mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'neutral', securityLevel: 'strict' });

$('lang').addEventListener('click', () => {
  const keys = Object.keys(CONTENT);
  lang = keys[(keys.indexOf(lang) + 1) % keys.length];
  store.set('doc-lang', lang);
  $('search').value = '';
  renderAll();
});
$('theme').addEventListener('click', () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  store.set('doc-theme', theme);
  mermaid.initialize({ startOnLoad: false, theme: theme === 'dark' ? 'dark' : 'neutral', securityLevel: 'strict' });
  renderAll();
});
$('search').addEventListener('input', (e) => renderSearch(e.target.value));
$('menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
$('collapseBtn').addEventListener('click', () => {
  collapsed = !collapsed;
  store.set('doc-sidebar', collapsed ? 'collapsed' : 'open');
  renderChrome();
});
$('sidebar').addEventListener('click', (e) => { if (e.target.closest('a')) document.body.classList.remove('nav-open'); });
$('toc').addEventListener('click', (e) => {
  const a = e.target.closest('[data-scroll]');
  if (!a) return;
  e.preventDefault();
  document.getElementById(a.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' });
});
$('content').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  const code = btn.closest('.code').querySelector('code').textContent;
  try { await navigator.clipboard.writeText(code); btn.textContent = data().ui.copied; } catch { /* ignore */ }
  setTimeout(() => { btn.textContent = data().ui.copy; }, 1500);
});
window.addEventListener('hashchange', () => { $('search').value = ''; renderNav(); renderSection(); });

renderAll();
