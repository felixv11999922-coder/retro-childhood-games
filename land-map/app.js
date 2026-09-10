(() => {
  'use strict';

  const VERSION = '0.4';
  const NSPD_PROXY = 'https://kexfusnwcxqbshpwlshx.supabase.co/functions/v1/nspd-search';
  const CACHE_PREFIX = 'land-horizon:nspd:';
  const CACHE_TTL = 12 * 60 * 60 * 1000;

  const $ = (id) => document.getElementById(id);
  const map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([55.75, 37.62], 9);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  const wmsBase = (id) => `https://nspd.gov.ru/api/aeggis/v3/${id}/wms`;
  const makeWms = (id, name) => L.tileLayer.wms(wmsBase(id), {
    layers: String(id),
    format: 'image/png',
    transparent: true,
    version: '1.3.0',
    opacity: 0.72,
    attribution: `НСПД — ${name}`
  });

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
  let currentController = null;

  function setStatus(text, cls = '') {
    $('searchStatus').className = `status ${cls}`;
    $('searchStatus').textContent = text;
  }

  function isCadNumber(q) {
    return /^\d{1,2}:\d{1,2}:\d{4,10}:\d+$/u.test(q.trim());
  }

  function parseCoords(q) {
    const m = q.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/);
    if (!m) return null;
    const a = Number(m[1]), b = Number(m[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [a, b];
    return null;
  }

  function setPoint(lat, lng, title = 'Точка на карте') {
    lastCoords = [lat, lng];
    $('infoTitle').textContent = title;
    $('coords').textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    $('copyCoords').disabled = false;
    $('openNspd').disabled = false;
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);
  }

  function setLayerCheckbox(name, enabled) {
    const cb = document.querySelector(`[data-layer="${name}"]`);
    if (!cb) return;
    cb.checked = enabled;
  }

  function ensureParcelsLayer() {
    if (!map.hasLayer(layers.parcels)) layers.parcels.addTo(map);
    setLayerCheckbox('parcels', true);
  }

  function clearSelectedGeometry() {
    if (selectedGeo) {
      map.removeLayer(selectedGeo);
      selectedGeo = null;
    }
  }

  function centerOfGeometry(geometry) {
    try {
      const temp = L.geoJSON({ type: 'Feature', properties: {}, geometry });
      const bounds = temp.getBounds();
      if (bounds && bounds.isValid()) return bounds.getCenter();
    } catch (_) {}
    return null;
  }

  function sourceLabel(data, fromLocalCache) {
    if (fromLocalCache) return 'кэш iPad';
    if (data.cache_scope === 'server') return 'кэш сервера';
    if (data.cache_scope === 'server-stale') return 'старый кэш';
    if (data.source === 'PKK_LEGACY') return 'резерв';
    return 'НСПД';
  }

  function showParcel(data, fromLocalCache = false) {
    clearSelectedGeometry();
    lastCadNumber = data.cadastral_number || lastCadNumber || null;

    if (data.approximate) ensureParcelsLayer();

    if (data.geometry) {
      const isApprox = !!data.approximate;
      selectedGeo = L.geoJSON({ type: 'Feature', properties: data.properties || {}, geometry: data.geometry }, {
        style: {
          weight: isApprox ? 2 : 4,
          opacity: 1,
          fillOpacity: isApprox ? 0.04 : 0.12,
          dashArray: isApprox ? '4 6' : '8 5'
        },
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
          radius: isApprox ? 9 : 7,
          weight: isApprox ? 2 : 3,
          fillOpacity: isApprox ? 0.12 : 0.25
        })
      }).addTo(map);

      const b = selectedGeo.getBounds();
      if (b && b.isValid()) {
        map.fitBounds(b.pad(data.approximate ? 1.2 : 0.35), { maxZoom: data.approximate ? 17 : 18, animate: true });
        const c = b.getCenter();
        setPoint(c.lat, c.lng, `Участок ${lastCadNumber || ''}`.trim());
      } else {
        const c = centerOfGeometry(data.geometry);
        if (c) {
          map.setView(c, data.approximate ? 17 : 18);
          setPoint(c.lat, c.lng, `Участок ${lastCadNumber || ''}`.trim());
        }
      }
    }

    $('infoPill').textContent = sourceLabel(data, fromLocalCache);
    $('infoPill').className = data.stale || data.approximate ? 'pill future' : 'pill ok';

    if (data.stale) {
      $('hint').textContent = 'НСПД сейчас не ответила, поэтому показана последняя сохранённая сервером версия. Для проверки актуальности используйте онлайн-слои НСПД.';
    } else if (data.approximate) {
      $('hint').textContent = 'НСПД не дала точную геометрию, поэтому использован резервный кадастровый канал. Маркер/рамка ориентировочные; слой «Земельные участки ЕГРН» включён автоматически для визуальной проверки.';
    } else if (fromLocalCache || data.cache_scope === 'server') {
      $('hint').textContent = 'Участок взят из кэша без повторного ожидания НСПД. Онлайн-слои продолжают загружаться непосредственно с НСПД.';
    } else {
      $('hint').textContent = 'Точный контур получен через серверный поиск НСПД и сохранён в общий кэш для следующих запросов.';
    }

    renderProperties(data);
    $('copyLink').disabled = !lastCadNumber;

    if (lastCadNumber) {
      const u = new URL(location.href);
      u.searchParams.set('cn', lastCadNumber);
      history.replaceState(null, '', u);
    }
  }

  function flattenEntries(obj, path = '', out = [], depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 4 || out.length > 500) return out;
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (v && typeof v === 'object') flattenEntries(v, p, out, depth + 1);
      else out.push([p, v]);
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
    const box = $('props');
    box.innerHTML = '';
    const entries = flattenEntries(data.properties || {});
    const source = data.source === 'PKK_LEGACY' ? 'Резервная ПКК' : 'НСПД';
    const accuracy = data.approximate ? 'ориентировочно' : 'точная геометрия источника';
    const rows = [
      ['Кадастровый №', data.cadastral_number],
      ['Адрес', findValue(entries, ['address_readable','readable_address','address','object_address','location'])],
      ['Площадь', findValue(entries, ['specified_area','land_record_area','area','area_value','area_zu'])],
      ['Категория', findValue(entries, ['land_record_category_type','category_type','category','land_category'])],
      ['ВРИ', findValue(entries, ['permitted_use_established_by_document','util_by_doc','permitted_use','util_code','use_type'])],
      ['Статус', findValue(entries, ['status','object_status','state','statecd'])],
      ['Источник поиска', source],
      ['Геометрия', accuracy]
    ].filter(([,v]) => v !== null && v !== undefined && String(v).trim() !== '');

    for (const [k, v] of rows) {
      const row = document.createElement('div');
      row.className = 'prop';
      const key = document.createElement('div'); key.className = 'k'; key.textContent = k;
      const val = document.createElement('div'); val.className = 'v'; val.textContent = String(v);
      row.append(key, val); box.append(row);
    }
    box.classList.toggle('show', rows.length > 0);
  }

  function cacheGet(cn) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + cn);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL) {
        localStorage.removeItem(CACHE_PREFIX + cn);
        return null;
      }
      return parsed.data || null;
    } catch (_) { return null; }
  }

  function cacheSet(cn, data) {
    try { localStorage.setItem(CACHE_PREFIX + cn, JSON.stringify({ savedAt: Date.now(), data })); } catch (_) {}
  }

  async function searchCadNumber(cn, forceLive = false) {
    lastCadNumber = cn;
    const cached = !forceLive ? cacheGet(cn) : null;
    if (cached) {
      showParcel(cached, true);
      setStatus('Найдено мгновенно из локального кэша.', 'ok');
      return;
    }

    if (currentController) currentController.abort();
    currentController = new AbortController();
    const localTimeout = setTimeout(() => currentController.abort(), 9500);
    const started = Date.now();
    const btn = $('searchBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Ищу';
    const timer = setInterval(() => {
      const sec = Math.max(1, Math.round((Date.now() - started) / 1000));
      setStatus(`Проверяю НСПД и резервный кадастровый канал… ${sec} сек.`);
    }, 900);
    setStatus('Проверяю НСПД и резервный кадастровый канал…');

    try {
      const url = new URL(NSPD_PROXY);
      url.searchParams.set('cn', cn);
      if (forceLive) url.searchParams.set('refresh', '1');
      const r = await fetch(url, { method: 'GET', signal: currentController.signal, cache: 'no-store' });
      let data = null;
      try { data = await r.json(); } catch (_) {}
      if (!r.ok || !data?.ok) {
        const message = data?.message || (r.status === 404 ? 'Участок не найден.' : `Источники вернули ошибку ${r.status}.`);
        throw new Error(message);
      }
      cacheSet(cn, data);
      showParcel(data, false);
      const elapsed = ((Date.now() - started) / 1000).toFixed(1);
      const channel = data.cache_scope === 'server' ? 'серверный кэш' : data.source === 'PKK_LEGACY' ? 'резервный канал' : 'НСПД';
      setStatus(`Готово за ${elapsed} сек. Источник: ${channel}.`, data.stale || data.approximate ? 'warn' : 'ok');
      if (window.innerWidth <= 760) $('sidebar').classList.remove('open');
    } catch (e) {
      const aborted = e?.name === 'AbortError';
      const message = aborted
        ? 'Поиск остановлен через 9.5 сек. Все каналы сейчас молчат — можно открыть участок напрямую в НСПД.'
        : (e?.message || 'Не удалось получить участок ни одним каналом.');
      setStatus(message, 'bad');
      $('infoPill').textContent = 'источники недоступны';
      $('infoPill').className = 'pill future';
      $('hint').textContent = 'Карта продолжает работать: территориальные зоны и другие WMS-слои можно смотреть вручную. Кадастровый номер сохранён для кнопки «Открыть НСПД».';
    } finally {
      clearTimeout(localTimeout);
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = 'Найти';
      currentController = null;
    }
  }

  async function runSearch() {
    const q = $('query').value.trim();
    if (!q) return setStatus('Введите кадастровый номер или координаты.', 'warn');
    const coords = parseCoords(q);
    if (coords) {
      clearSelectedGeometry();
      lastCadNumber = null;
      map.setView(coords, 17);
      setPoint(coords[0], coords[1]);
      renderProperties({});
      $('copyLink').disabled = true;
      setStatus('Переход по координатам выполнен.', 'ok');
      return;
    }
    if (!isCadNumber(q)) return setStatus('Не распознал формат. Пример: 25:36:050101:2652', 'warn');
    await searchCadNumber(q);
  }

  function lonLatToMercator(lon, lat) {
    const R = 6378137;
    const x = R * lon * Math.PI / 180;
    const y = R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
    return [x, y];
  }

  document.querySelectorAll('[data-layer]').forEach(cb => cb.addEventListener('change', () => {
    const layer = layers[cb.dataset.layer];
    if (!layer) return;
    cb.checked ? layer.addTo(map) : map.removeLayer(layer);
  }));

  $('opacity').addEventListener('input', (e) => {
    const v = Number(e.target.value) / 100;
    $('opacityValue').textContent = `${e.target.value}%`;
    Object.values(layers).forEach(layer => {
      if (layer.setOpacity) layer.setOpacity(v);
      if (layer.eachLayer) layer.eachLayer(x => x.setOpacity && x.setOpacity(v));
    });
  });

  $('searchBtn').addEventListener('click', runSearch);
  $('query').addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
  map.on('click', e => setPoint(e.latlng.lat, e.latlng.lng));

  $('copyCoords').addEventListener('click', async () => {
    if (!lastCoords) return;
    await navigator.clipboard.writeText(`${lastCoords[0].toFixed(6)}, ${lastCoords[1].toFixed(6)}`);
    setStatus('Координаты скопированы.', 'ok');
  });

  $('copyLink').addEventListener('click', async () => {
    if (!lastCadNumber) return;
    const u = new URL(location.href); u.searchParams.set('cn', lastCadNumber);
    await navigator.clipboard.writeText(u.toString());
    setStatus('Ссылка на этот участок скопирована.', 'ok');
  });

  $('openNspd').addEventListener('click', () => {
    let url = 'https://nspd.gov.ru/map?thematic=PKK';
    if (lastCadNumber) url += `&query=${encodeURIComponent(lastCadNumber)}`;
    if (lastCoords) {
      const [x, y] = lonLatToMercator(lastCoords[1], lastCoords[0]);
      url += `&zoom=18.2&coordinate_x=${encodeURIComponent(x)}&coordinate_y=${encodeURIComponent(y)}&theme_id=1&baseLayerId=235&is_copy_url=true`;
    }
    window.open(url, '_blank', 'noopener');
  });

  $('fitSelected').addEventListener('click', () => {
    if (selectedGeo) {
      const b = selectedGeo.getBounds();
      if (b?.isValid()) map.fitBounds(b.pad(0.35), { maxZoom: 18 });
    }
  });

  $('mobileToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  $('currentMode').addEventListener('click', () => setStatus('Показываю действующие слои НСПД.', 'ok'));
  $('compareMode').addEventListener('click', () => setStatus('Режим сравнения включим после первого автоматического источника проектов ПЗЗ/Генплана.', 'warn'));

  const initial = new URL(location.href).searchParams.get('cn');
  if (initial && isCadNumber(initial)) {
    $('query').value = initial;
    setTimeout(() => searchCadNumber(initial), 250);
  }

  console.info(`Land Horizon Map v${VERSION}`);
})();
