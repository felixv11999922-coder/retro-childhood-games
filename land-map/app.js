(() => {
  'use strict';

  const VERSION = '0.6.1';
  const NSPD_PROXY = 'https://kexfusnwcxqbshpwlshx.supabase.co/functions/v1/nspd-search';
  const CACHE_PREFIX = 'land-horizon:nspd:';
  const CACHE_TTL = 12 * 60 * 60 * 1000;

  const $ = id => document.getElementById(id);
  const map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([55.75, 37.62], 9);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  const wmsHealth = { loads: 0, errors: 0, settled: false };
  function updateWmsHealth(ok) {
    if (ok) wmsHealth.loads += 1; else wmsHealth.errors += 1;
    if (wmsHealth.loads > 0) {
      wmsHealth.settled = true;
      if ($('nspdPill')) { $('nspdPill').textContent = 'онлайн'; $('nspdPill').className = 'pill ok'; }
      if ($('wmsStatus')) $('wmsStatus').textContent = 'отвечает';
    } else if (wmsHealth.errors >= 4) {
      wmsHealth.settled = true;
      if ($('nspdPill')) { $('nspdPill').textContent = 'нет ответа'; $('nspdPill').className = 'pill future'; }
      if ($('wmsStatus')) $('wmsStatus').textContent = 'нет ответа';
    }
  }

  const wmsBase = id => `https://nspd.gov.ru/api/aeggis/v3/${id}/wms`;
  const makeWms = (id, name) => {
    const layer = L.tileLayer.wms(wmsBase(id), {
      layers: String(id),
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      opacity: 0.72,
      attribution: `НСПД — ${name}`
    });
    layer.on('tileload', () => updateWmsHealth(true));
    layer.on('tileerror', () => updateWmsHealth(false));
    return layer;
  };

  const layers = {
    parcels: makeWms(36048, 'земельные участки'),
    zones: makeWms(36315, 'территориальные зоны'),
    redlines: makeWms(37293, 'красные линии'),
    zouit: L.layerGroup([
      makeWms(37577, 'ЗОУИТ ОКН'),
      makeWms(37578, 'ЗОУИТ энергетики, связи, транспорта'),
      makeWms(37579, 'ЗОУИТ безопасности'),
      makeWms(37580, 'ЗОУИТ природных территорий'),
      makeWms(37581, 'иные ЗОУИТ')
    ])
  };
  layers.zones.addTo(map);

  let marker = null;
  let selectedGeo = null;
  let lastCoords = null;
  let lastCadNumber = null;
  let coordsCadNumber = null;
  let currentController = null;
  let activeSearchCn = null;
  let searchSequence = 0;
  const scopeHints = new Map();

  function setStatus(text, cls = '') {
    $('searchStatus').className = `status ${cls}`;
    $('searchStatus').textContent = text;
  }

  function normalizeCadNumber(v) { return String(v || '').trim().replace(/\s+/g, ''); }
  function isCadNumber(q) { return /^\d{1,2}:\d{1,2}:\d{4,10}:\d+$/u.test(normalizeCadNumber(q)); }

  function parseCoords(q) {
    const m = q.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const a = Number(m[1]), b = Number(m[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [a, b];
    return null;
  }

  function setPoint(lat, lng, title = 'Точка на карте', cadNumber = null) {
    lastCoords = [lat, lng];
    coordsCadNumber = cadNumber;
    $('infoTitle').textContent = title;
    $('coords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    $('copyCoords').disabled = false;
    $('openNspd').disabled = false;
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);
  }

  function clearPointAssociation() {
    coordsCadNumber = null;
    lastCoords = null;
    if (marker) { map.removeLayer(marker); marker = null; }
    $('copyCoords').disabled = true;
    $('coords').textContent = 'Точный центр участка пока не определён.';
  }

  function setLayerCheckbox(name, enabled) {
    const cb = document.querySelector(`[data-layer="${name}"]`);
    if (cb) cb.checked = enabled;
  }

  function ensureParcelsLayer() {
    if (!map.hasLayer(layers.parcels)) layers.parcels.addTo(map);
    setLayerCheckbox('parcels', true);
  }

  function clearSelectedGeometry() {
    if (selectedGeo) { map.removeLayer(selectedGeo); selectedGeo = null; }
  }

  function sourceLabel(data, fromLocalCache) {
    if (fromLocalCache) return 'кэш устройства';
    if (data.cache_scope === 'server') return 'кэш сервера';
    if (data.cache_scope === 'server-stale') return 'старый кэш';
    if (data.source === 'PKK_LEGACY') return 'резервная ПКК';
    if (data.source === 'NSPD_DIRECT') return 'НСПД · браузер';
    if (data.source === 'NSPD') return 'НСПД';
    return null;
  }

  function showParcel(data, fromLocalCache = false) {
    clearSelectedGeometry();
    const cn = normalizeCadNumber(data.cadastral_number || lastCadNumber);
    lastCadNumber = cn || lastCadNumber;
    activeSearchCn = null;

    if (data.approximate) ensureParcelsLayer();
    if (data.geometry) {
      const isApprox = !!data.approximate;
      selectedGeo = L.geoJSON({ type: 'Feature', properties: data.properties || {}, geometry: data.geometry }, {
        style: { weight: isApprox ? 2 : 4, opacity: 1, fillOpacity: isApprox ? 0.04 : 0.12, dashArray: isApprox ? '4 6' : '8 5' },
        pointToLayer: (_f, latlng) => L.circleMarker(latlng, { radius: isApprox ? 9 : 7, weight: isApprox ? 2 : 3, fillOpacity: isApprox ? 0.12 : 0.25 })
      }).addTo(map);
      const b = selectedGeo.getBounds();
      if (b?.isValid()) {
        map.fitBounds(b.pad(isApprox ? 1.2 : 0.35), { maxZoom: isApprox ? 17 : 18, animate: true });
        const c = b.getCenter();
        setPoint(c.lat, c.lng, `Участок ${cn}`.trim(), cn);
      }
    }

    $('infoPill').textContent = sourceLabel(data, fromLocalCache) || 'источник';
    $('infoPill').className = data.stale || data.approximate ? 'pill future' : 'pill ok';
    if (data.stale) $('hint').textContent = 'Онлайн-поиск НСПД сейчас не ответил; показана последняя сохранённая версия. Проектные источники проверяются независимо.';
    else if (data.approximate) $('hint').textContent = 'Показан ориентир резервного источника. Для юридически значимой работы точную геометрию нужно подтвердить НСПД/ЕГРН.';
    else if (fromLocalCache || data.cache_scope === 'server') $('hint').textContent = 'Контур получен из проверенного кэша; онлайн-слои НСПД продолжают проверяться отдельно.';
    else $('hint').textContent = 'Точный контур найден по кадастровому номеру. Результат сохранён в кэш, чтобы следующий поиск не зависел от доступности НСПД.';

    renderProperties(data);
    $('copyLink').disabled = !lastCadNumber;
    if (lastCadNumber) {
      const u = new URL(location.href); u.searchParams.set('cn', lastCadNumber); history.replaceState(null, '', u);
    }
  }

  function flattenEntries(obj, path = '', out = [], depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 4 || out.length > 500) return out;
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (v && typeof v === 'object') flattenEntries(v, p, out, depth + 1); else out.push([p, v]);
    }
    return out;
  }

  function findValue(entries, keys) {
    const lowered = keys.map(k => k.toLowerCase());
    for (const [path, value] of entries) {
      const leaf = path.split('.').pop().toLowerCase();
      if (lowered.includes(leaf) && value !== null && value !== undefined && String(value).trim() !== '') return value;
    }
    return null;
  }

  function renderProperties(data) {
    const box = $('props'); box.innerHTML = '';
    const entries = flattenEntries(data.properties || {});
    const rows = [
      ['Кадастровый №', data.cadastral_number],
      ['Адрес', findValue(entries, ['address_readable','readable_address','address','object_address','location'])],
      ['Площадь', findValue(entries, ['specified_area','land_record_area','area','area_value','area_zu'])],
      ['Категория', findValue(entries, ['land_record_category_type','category_type','category','land_category'])],
      ['ВРИ', findValue(entries, ['permitted_use_established_by_document','util_by_doc','permitted_use','util_code','use_type'])],
      ['Статус', findValue(entries, ['status','object_status','state','statecd'])],
      data.source || data.cache_scope ? ['Источник поиска', sourceLabel(data, false)] : null,
      data.geometry || data.geometry_quality ? ['Геометрия', data.approximate ? 'ориентировочная' : 'точная геометрия источника'] : null
    ].filter(Boolean).filter(([,v]) => v !== null && v !== undefined && String(v).trim() !== '');
    for (const [k,v] of rows) {
      const row = document.createElement('div'); row.className = 'prop';
      const key = document.createElement('div'); key.className = 'k'; key.textContent = k;
      const val = document.createElement('div'); val.className = 'v'; val.textContent = String(v);
      row.append(key,val); box.append(row);
    }
    box.classList.toggle('show', rows.length > 0);
  }

  function cacheGet(cn) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + cn); if (!raw) return null;
      const p = JSON.parse(raw);
      if (!p?.savedAt || Date.now() - p.savedAt > CACHE_TTL) { localStorage.removeItem(CACHE_PREFIX + cn); return null; }
      return p.data || null;
    } catch (_) { return null; }
  }
  function cacheSet(cn, data) { try { localStorage.setItem(CACHE_PREFIX + cn, JSON.stringify({ savedAt: Date.now(), data })); } catch (_) {} }

  function mercatorToLonLat(x, y) {
    const R = 6378137;
    return [(x / R) * 180 / Math.PI, (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180 / Math.PI];
  }
  function convertCoords(c) {
    if (!Array.isArray(c)) return c;
    if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
      if (Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90) return [c[0], c[1]];
      return mercatorToLonLat(c[0], c[1]);
    }
    return c.map(convertCoords);
  }
  function convertGeometry(g) { return g?.type && g?.coordinates ? { type: g.type, coordinates: convertCoords(g.coordinates) } : null; }
  function exactNspdFeature(raw, cn) {
    const fs = raw?.data?.features;
    if (!Array.isArray(fs)) return null;
    return fs.find(f => {
      const p = f?.properties || {}, o = p.options || {};
      const found = normalizeCadNumber(o.cad_num || p.descr || p.cad_num || p.label || p.externalKey || '');
      return found === cn;
    }) || null;
  }

  async function directNspdSearch(cn, timeoutMs = 3200) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const u = new URL('https://nspd.gov.ru/api/geoportal/v2/search/geoportal');
      u.searchParams.set('thematicSearchId', '1'); u.searchParams.set('query', cn);
      const r = await fetch(u, { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json, text/plain, */*' } });
      if (!r.ok) throw new Error(`direct_${r.status}`);
      const raw = await r.json(); const f = exactNspdFeature(raw, cn); const geometry = f ? convertGeometry(f.geometry) : null;
      if (!f || !geometry) throw new Error('direct_no_exact');
      const p = f.properties || {}, o = p.options || {};
      return { ok: true, cadastral_number: normalizeCadNumber(o.cad_num || p.descr || cn), geometry, properties: p, source: 'NSPD_DIRECT', approximate: false, geometry_quality: 'official_search_geometry' };
    } finally { clearTimeout(timer); }
  }

  async function proxySearch(cn, forceLive, signal) {
    const u = new URL(NSPD_PROXY); u.searchParams.set('cn', cn); if (forceLive) u.searchParams.set('refresh', '1');
    const r = await fetch(u, { method: 'GET', signal, cache: 'no-store' });
    let data = null; try { data = await r.json(); } catch (_) {}
    if (!r.ok || !data?.ok) { const err = new Error(data?.message || `proxy_${r.status}`); err.details = data; throw err; }
    return data;
  }

  async function firstSuccessful(tasks) {
    return await new Promise((resolve, reject) => {
      let left = tasks.length; const errors = [];
      tasks.forEach(p => p.then(resolve).catch(e => { errors.push(e); if (--left === 0) reject(errors); }));
    });
  }

  function applyScopeFallback(cn, reason = '') {
    const h = scopeHints.get(normalizeCadNumber(cn));
    if (!h || !Number.isFinite(Number(h.lat)) || !Number.isFinite(Number(h.lon))) return false;
    const lat = Number(h.lat), lon = Number(h.lon), zoom = Number(h.zoom) || 12;
    clearSelectedGeometry(); clearPointAssociation(); ensureParcelsLayer(); map.setView([lat, lon], zoom, { animate: true });
    $('infoTitle').textContent = `Район участка ${cn}`;
    $('infoPill').textContent = 'ориентир района'; $('infoPill').className = 'pill future';
    $('hint').textContent = `${h.label || 'Кадастровый район'}: точный контур сейчас не получен, поэтому карта переведена в нужную территорию. Это не координата участка. ${reason}`.trim();
    renderProperties({ cadastral_number: cn, properties: {} });
    $('copyLink').disabled = false;
    return true;
  }

  async function searchCadNumber(rawCn, forceLive = false) {
    const cn = normalizeCadNumber(rawCn);
    const searchId = ++searchSequence;
    lastCadNumber = cn; activeSearchCn = cn;
    clearSelectedGeometry(); clearPointAssociation();
    const cached = !forceLive ? cacheGet(cn) : null;
    if (cached) {
      if (searchId !== searchSequence) return;
      showParcel(cached, true); setStatus('Найдено из локального кэша.', 'ok'); return;
    }

    if (currentController) currentController.abort();
    const controller = new AbortController(); currentController = controller;
    const outerTimer = setTimeout(() => controller.abort(), 7600);
    const started = Date.now(), btn = $('searchBtn'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Ищу';
    const timer = setInterval(() => {
      if (searchId !== searchSequence) return;
      const sec = Math.max(1, Math.round((Date.now() - started) / 1000));
      setStatus(`Ищу точный контур двумя сетевыми путями… ${sec} сек.`);
    }, 900);
    setStatus('Ищу точный контур двумя сетевыми путями…');

    try {
      const data = await firstSuccessful([
        directNspdSearch(cn, 3200),
        proxySearch(cn, forceLive, controller.signal)
      ]);
      if (searchId !== searchSequence) return;
      cacheSet(cn, data); showParcel(data, false);
      setStatus(`Точный контур найден за ${((Date.now() - started) / 1000).toFixed(1)} сек.`, data.stale || data.approximate ? 'warn' : 'ok');
      if (window.innerWidth <= 760) $('sidebar').classList.remove('open');
    } catch (errors) {
      if (searchId !== searchSequence) return;
      const list = Array.isArray(errors) ? errors : [errors];
      const details = list.map(e => e?.details).find(Boolean);
      const reason = details?.error === 'upstream_blocked' ? 'Серверный путь к НСПД сейчас блокируется источником.' : 'Онлайн-поиск точной геометрии временно недоступен.';
      if (!applyScopeFallback(cn, reason)) {
        $('infoTitle').textContent = `Участок ${cn}`;
        $('infoPill').textContent = 'точный контур не получен'; $('infoPill').className = 'pill future';
        $('hint').textContent = `${reason} Это не означает отсутствие участка. Реестр ПЗЗ/генплана и проектные документы продолжают обрабатываться независимо.`;
        renderProperties({ cadastral_number: cn, properties: {} });
      }
      setStatus('Точный контур пока не получен. Работа по территории продолжается — это не блокирующая ошибка.', 'warn');
      $('copyLink').disabled = false;
    } finally {
      clearTimeout(outerTimer); clearInterval(timer);
      if (searchId === searchSequence) {
        btn.disabled = false; btn.textContent = 'Найти';
        if (currentController === controller) currentController = null;
        activeSearchCn = null;
      }
    }
  }

  async function runSearch() {
    const q = $('query').value.trim(); if (!q) return setStatus('Введите кадастровый номер или координаты.', 'warn');
    const coords = parseCoords(q);
    if (coords) {
      ++searchSequence;
      if (currentController) currentController.abort(); currentController = null;
      clearSelectedGeometry(); lastCadNumber = null; activeSearchCn = null;
      map.setView(coords, 17); setPoint(coords[0], coords[1]); renderProperties({}); $('copyLink').disabled = true; setStatus('Переход по координатам выполнен.', 'ok'); return;
    }
    if (!isCadNumber(q)) return setStatus('Не распознал формат. Пример: 25:36:050101:2652', 'warn');
    await searchCadNumber(q);
  }

  function lonLatToMercator(lon, lat) { const R = 6378137; return [R * lon * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))]; }

  window.addEventListener('landhorizon:scope', e => {
    const d = e.detail || {}, cn = normalizeCadNumber(d.cn);
    if (!cn || !d.scope_hint) return;
    scopeHints.set(cn, d.scope_hint);
    if (lastCadNumber === cn && !selectedGeo && !coordsCadNumber && !activeSearchCn) applyScopeFallback(cn);
  });

  document.querySelectorAll('[data-layer]').forEach(cb => cb.addEventListener('change', () => {
    const layer = layers[cb.dataset.layer]; if (!layer) return; cb.checked ? layer.addTo(map) : map.removeLayer(layer);
  }));
  $('opacity').addEventListener('input', e => {
    const v = Number(e.target.value) / 100; $('opacityValue').textContent = `${e.target.value}%`;
    Object.values(layers).forEach(layer => { if (layer.setOpacity) layer.setOpacity(v); if (layer.eachLayer) layer.eachLayer(x => x.setOpacity && x.setOpacity(v)); });
  });
  $('searchBtn').addEventListener('click', runSearch);
  $('query').addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
  map.on('click', e => setPoint(e.latlng.lat, e.latlng.lng));

  $('copyCoords').addEventListener('click', async () => { if (!lastCoords) return; await navigator.clipboard.writeText(`${lastCoords[0].toFixed(6)}, ${lastCoords[1].toFixed(6)}`); setStatus('Координаты скопированы.', 'ok'); });
  $('copyLink').addEventListener('click', async () => { if (!lastCadNumber) return; const u = new URL(location.href); u.searchParams.set('cn', lastCadNumber); await navigator.clipboard.writeText(u.toString()); setStatus('Ссылка на этот кадастровый номер скопирована.', 'ok'); });
  $('openNspd').addEventListener('click', () => {
    let url = 'https://nspd.gov.ru/map?thematic=PKK';
    if (lastCadNumber) url += `&query=${encodeURIComponent(lastCadNumber)}`;
    if (lastCoords && (!lastCadNumber || coordsCadNumber === lastCadNumber)) {
      const [x,y] = lonLatToMercator(lastCoords[1], lastCoords[0]);
      url += `&zoom=18.2&coordinate_x=${encodeURIComponent(x)}&coordinate_y=${encodeURIComponent(y)}&theme_id=1&baseLayerId=235&is_copy_url=true`;
    }
    window.open(url, '_blank', 'noopener');
  });
  $('fitSelected').addEventListener('click', () => {
    if (selectedGeo) { const b = selectedGeo.getBounds(); if (b?.isValid()) map.fitBounds(b.pad(0.35), { maxZoom: 18 }); }
    else if (lastCadNumber) applyScopeFallback(lastCadNumber);
  });
  $('mobileToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  $('currentMode').addEventListener('click', () => setStatus('Показываю действующие доступные слои. Их фактическая доступность проверяется по загрузке тайлов.', 'ok'));
  $('compareMode').addEventListener('click', () => setStatus('Сравнение включим только после фильтрации и геопривязки проектных документов. Ложные совпадения в этот режим не допускаются.', 'warn'));

  const initial = new URL(location.href).searchParams.get('cn');
  if (initial && isCadNumber(initial)) { $('query').value = normalizeCadNumber(initial); setTimeout(() => searchCadNumber(initial), 250); }
  setTimeout(() => { if (!wmsHealth.settled && $('wmsStatus')) $('wmsStatus').textContent = 'нет подтверждения'; }, 7000);
  console.info(`Land Horizon Map v${VERSION}`);
})();