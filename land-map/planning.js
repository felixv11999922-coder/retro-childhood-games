(() => {
  'use strict';
  const ENDPOINT = 'https://kexfusnwcxqbshpwlshx.supabase.co/functions/v1/planning-sources';
  const CANDIDATES_URL = './data/project-candidates.json?v=0.5';
  const $ = id => document.getElementById(id);
  const validCad = v => /^\d{1,2}:\d{1,2}:\d{4,10}:\d+$/.test((v || '').trim());
  let lastRequested = '';

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function sourceBadge(s) {
    if (s.is_official) return '<span class="source-badge official">официальный</span>';
    return '<span class="source-badge reference">справочный</span>';
  }

  function renderSources(data) {
    const box = $('planningSources');
    if (!box) return;
    const municipality = data.municipality ? ` · ${esc(data.municipality)}` : '';
    const sources = Array.isArray(data.sources) ? data.sources : [];
    box.innerHTML = `
      <div class="planning-scope"><strong>${esc(data.region_code)}:${esc(data.cadastral_district)}</strong>${municipality}</div>
      <div class="planning-note">Источники определены по кадастровому району и будут опрашиваться автоматически. Это работает независимо от поиска контура участка в НСПД.</div>
      <div class="source-list">${sources.map(s => `
        <a class="source-card" href="${esc(s.base_url)}" target="_blank" rel="noopener">
          <div><b>${esc(s.name)}</b>${sourceBadge(s)}</div>
          <small>${esc(s.source_type)}${s.supports_vector ? ' · вектор' : ''}${s.supports_map ? ' · карта' : ''}</small>
        </a>`).join('')}</div>
    `;
    box.classList.add('show');
  }

  function renderCandidates(cn, rows) {
    const box = $('projectCandidates');
    if (!box) return;
    const parts = cn.split(':');
    const region = String(Number(parts[0])).padStart(2, '0');
    const district = String(Number(parts[1]));
    const matches = (Array.isArray(rows) ? rows : []).filter(r =>
      String(r.region_code || '').padStart(2, '0') === region &&
      (!r.cadastral_district || String(Number(r.cadastral_district)) === district)
    );
    if (!matches.length) {
      box.innerHTML = '<div class="planning-note">Автосканер ещё не сохранил проектные документы для этого кадастрового района. Источники уже поставлены в очередь.</div>';
      box.classList.add('show');
      return;
    }
    const cards = matches.slice(0, 12).map(r => {
      const status = r.doc_status === 'draft' ? 'проект' : r.doc_status === 'active_or_approved' ? 'принято/изменено' : 'кандидат';
      return `<a class="candidate-card" href="${esc(r.document_url)}" target="_blank" rel="noopener">
        <div class="candidate-top"><span class="doc-type">${esc(r.doc_type)}</span><span class="doc-status ${r.doc_status === 'draft' ? 'draft' : ''}">${status}</span></div>
        <b>${esc(r.title)}</b>
        <small>${esc(r.published_at || '')}${r.source_name ? ' · ' + esc(r.source_name) : ''}</small>
      </a>`;
    }).join('');
    box.innerHTML = cards;
    box.classList.add('show');
  }

  async function loadCandidates(cn) {
    try {
      const r = await fetch(CANDIDATES_URL, { cache: 'no-store' });
      if (!r.ok) throw new Error('no candidates');
      const data = await r.json();
      renderCandidates(cn, data.candidates || data);
    } catch (_) {
      renderCandidates(cn, []);
    }
  }

  async function loadPlanning(cn) {
    cn = (cn || '').trim();
    if (!validCad(cn) || cn === lastRequested) return;
    lastRequested = cn;
    const box = $('planningSources');
    if (box) {
      box.innerHTML = '<div class="planning-loading"><span class="spinner"></span>Определяю ФГИС ТП / ГИСОГД / муниципальные источники…</div>';
      box.classList.add('show');
    }
    loadCandidates(cn);
    try {
      const u = new URL(ENDPOINT);
      u.searchParams.set('cn', cn);
      const r = await fetch(u, { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error('registry');
      renderSources(data);
    } catch (_) {
      if (box) box.innerHTML = '<div class="planning-note warn">Не удалось получить реестр источников. Карта и кадастровый поиск продолжают работать.</div>';
    }
  }

  const btn = $('searchBtn');
  const input = $('query');
  if (btn && input) {
    btn.addEventListener('click', () => loadPlanning(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') loadPlanning(input.value); });
  }
  const initial = new URL(location.href).searchParams.get('cn');
  if (initial && validCad(initial)) setTimeout(() => loadPlanning(initial), 150);
})();
