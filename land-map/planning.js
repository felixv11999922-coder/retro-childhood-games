(() => {
  'use strict';
  const VERSION = '0.7.0';
  const ENDPOINT = 'https://kexfusnwcxqbshpwlshx.supabase.co/functions/v1/planning-sources';
  const CANDIDATES_URL = './data/project-candidates.json?v=0.7.0';
  const $ = id => document.getElementById(id);
  const validCad = v => /^\d{1,2}:\d{1,2}:\d{4,10}:\d+$/.test((v || '').trim());
  let requestSequence = 0;
  let activeController = null;

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
    const hint = data.scope_hint;
    const hintLine = hint
      ? `<div class="planning-note"><b>Резервный ориентир:</b> ${esc(hint.label)}. Используется только если точный контур НСПД не получен; это не координата участка.</div>`
      : '';
    box.innerHTML = `
      <div class="planning-scope"><strong>${esc(data.region_code)}:${esc(data.cadastral_district)}</strong>${municipality}</div>
      <div class="planning-note">Источники определяются по кадастровому району независимо от поиска контура. Сбой одного картографического API не останавливает проверку ПЗЗ, генплана и проектных документов.</div>
      ${hintLine}
      <div class="source-list">${sources.map(s => `
        <a class="source-card" href="${esc(s.base_url)}" target="_blank" rel="noopener">
          <div><b>${esc(s.name)}</b>${sourceBadge(s)}</div>
          <small>${esc(s.source_type)}${s.supports_vector ? ' · вектор' : ''}${s.supports_map ? ' · карта' : ''}</small>
        </a>`).join('')}</div>
    `;
    box.classList.add('show');
  }

  function candidateAccepted(r) {
    if (!r || r.doc_type === 'REVIEW') return false;
    if (r.confidence === 'rejected' || r.confidence === 'review') return false;
    if (typeof r.relevance_score === 'number' && r.relevance_score < 7) return false;
    return ['PZZ','GENPLAN','PPT','PMT','KRT'].includes(r.doc_type);
  }

  function renderCandidates(cn, rows) {
    const box = $('projectCandidates');
    if (!box) return;
    const parts = cn.split(':');
    const region = String(Number(parts[0])).padStart(2, '0');
    const district = String(Number(parts[1]));
    const matches = (Array.isArray(rows) ? rows : []).filter(r =>
      candidateAccepted(r) &&
      String(r.region_code || '').padStart(2, '0') === region &&
      (!r.cadastral_district || String(Number(r.cadastral_district)) === district)
    );
    if (!matches.length) {
      box.innerHTML = '<div class="planning-note">После строгой фильтрации подтверждённых градостроительных документов для этого кадастрового района пока нет. Слабые поисковые совпадения здесь специально не показываются.</div>';
      box.classList.add('show');
      return;
    }
    const cards = matches.slice(0, 12).map(r => {
      const status = r.doc_status === 'draft' ? 'проект / обсуждение' : r.doc_status === 'active_or_approved' ? 'принято / изменено' : 'проверить';
      const confidence = r.confidence === 'high' ? 'высокая релевантность' : 'релевантно';
      return `<a class="candidate-card" href="${esc(r.document_url)}" target="_blank" rel="noopener">
        <div class="candidate-top"><span class="doc-type">${esc(r.doc_type)}</span><span class="doc-status ${r.doc_status === 'draft' ? 'draft' : ''}">${status}</span></div>
        <b>${esc(r.title)}</b>
        <small>${esc(r.published_at || '')}${r.source_name ? ' · ' + esc(r.source_name) : ''} · ${confidence}</small>
      </a>`;
    }).join('');
    box.innerHTML = cards;
    box.classList.add('show');
  }

  async function loadCandidates(cn, requestId) {
    try {
      const r = await fetch(`${CANDIDATES_URL}&t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`candidates_${r.status}`);
      const data = await r.json();
      if (requestId !== requestSequence) return;
      renderCandidates(cn, data.candidates || data);
    } catch (_) {
      if (requestId === requestSequence) renderCandidates(cn, []);
    }
  }

  async function loadPlanning(cn) {
    cn = (cn || '').trim();
    if (!validCad(cn)) return;
    const requestId = ++requestSequence;
    if (activeController) activeController.abort();
    const controller = new AbortController();
    activeController = controller;

    const box = $('planningSources');
    if (box) {
      box.innerHTML = '<div class="planning-loading"><span class="spinner"></span>Определяю ФГИС ТП / ГИСОГД / муниципальные источники…</div>';
      box.classList.add('show');
    }
    loadCandidates(cn, requestId);
    try {
      const u = new URL(ENDPOINT); u.searchParams.set('cn', cn);
      const r = await fetch(u, { cache: 'no-store', signal: controller.signal });
      const data = await r.json();
      if (requestId !== requestSequence) return;
      if (!r.ok || !data.ok) throw new Error(`registry_${r.status}`);
      renderSources(data);
      if (data.scope_hint) {
        window.dispatchEvent(new CustomEvent('landhorizon:scope', { detail: { cn, scope_hint: data.scope_hint } }));
      }
    } catch (error) {
      if (requestId !== requestSequence || error?.name === 'AbortError') return;
      if (box) box.innerHTML = '<div class="planning-note warn">Реестр источников сейчас не ответил. Это отдельный канал: базовая карта и кадастровый поиск продолжают работать. Повторный поиск этим же номером запустит новую попытку.</div>';
    } finally {
      if (requestId === requestSequence && activeController === controller) activeController = null;
    }
  }

  const btn = $('searchBtn'), input = $('query');
  if (btn && input) {
    btn.addEventListener('click', () => loadPlanning(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') loadPlanning(input.value); });
  }
  const initial = new URL(location.href).searchParams.get('cn');
  if (initial && validCad(initial)) setTimeout(() => loadPlanning(initial), 120);
  console.info(`Land Horizon Planning v${VERSION}`);
})();