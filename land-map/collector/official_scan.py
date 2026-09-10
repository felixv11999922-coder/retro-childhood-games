from __future__ import annotations

import html as html_lib
import json
import re
import ssl
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCES_FILE = Path(__file__).with_name('sources.json')
OUT_FILE = ROOT / 'data' / 'project-candidates.json'

QUERIES = {
    'PZZ': 'Правила землепользования и застройки',
    'GENPLAN': 'генеральный план',
    'PPT': 'проект планировки территории',
    'PMT': 'проект межевания территории',
    'KRT': 'комплексное развитие территории',
}

DOC_PHRASES = {
    'PZZ': r'правил(?:а|ам|ами|ах)?\s+землепользования\s+и\s+застройки',
    'GENPLAN': r'генеральн(?:ый|ого|ому|ым|ом)\s+план',
    'PPT': r'проект(?:а|у|ом|е)?\s+планировки\s+территории',
    'PMT': r'проект(?:а|у|ом|е)?\s+межевания\s+территории',
    'KRT': r'комплексн(?:ое|ого|ому|ым|ом)\s+развити(?:е|я|ю|ем)\s+территории',
}

DIRECT_PATTERNS = {
    'PZZ': [
        r'о\s+внесении\s+изменений\s+в\s+правила\s+землепользования\s+и\s+застройки',
        r'внести\s+изменения\s+в\s+правила\s+землепользования\s+и\s+застройки',
        r'об\s+утверждении\s+(?:проекта\s+)?правил\s+землепользования\s+и\s+застройки',
        r'проект(?:у|а)?\s+внесения\s+изменений\s+в\s+правила\s+землепользования\s+и\s+застройки',
        r'предложения\s+о\s+внесении\s+изменений[^.]{0,120}правила\s+землепользования\s+и\s+застройки',
    ],
    'GENPLAN': [
        r'о\s+внесении\s+изменений\s+в\s+генеральный\s+план',
        r'внести\s+изменения\s+в\s+генеральный\s+план',
        r'об\s+утверждении\s+(?:проекта\s+)?генерального\s+плана',
        r'проект(?:у|а)?\s+внесения\s+изменений\s+в\s+генеральный\s+план',
        r'предложения\s+о\s+внесении\s+изменений[^.]{0,120}генеральный\s+план',
    ],
    'PPT': [
        r'об\s+утверждении\s+проекта\s+планировки\s+территории',
        r'о\s+подготовке\s+проекта\s+планировки\s+территории',
        r'о\s+внесении\s+изменений\s+в\s+проект\s+планировки\s+территории',
        r'проект(?:у|а)?\s+планировки\s+территории',
    ],
    'PMT': [
        r'об\s+утверждении\s+проекта\s+межевания\s+территории',
        r'о\s+подготовке\s+проекта\s+межевания\s+территории',
        r'о\s+внесении\s+изменений\s+в\s+проект\s+межевания\s+территории',
        r'проект(?:у|а)?\s+межевания\s+территории',
    ],
    'KRT': [
        r'решени(?:е|я)\s+о\s+комплексном\s+развитии\s+территории',
        r'о\s+комплексном\s+развитии\s+территории',
        r'договор(?:а)?\s+о\s+комплексном\s+развитии\s+территории',
        r'проект(?:а)?\s+решения\s+о\s+комплексном\s+развитии\s+территории',
    ],
}

PROCESS_MARKERS = (
    'общественных обсужден', 'публичных слушан', 'назначении общественных',
    'заключение о результатах', 'экспозиц', 'принимает предложения',
    'проект решения', 'проект постановления',
)
ACTIVE_MARKERS = ('о внесении изменений', 'внести изменения', 'об утверждении', 'утвердить')
TAG_RE = re.compile(r'<[^>]+>')
SPACE_RE = re.compile(r'\s+')
ISO_DATE_RE = re.compile(r'^(20\d{2})-(\d{2})-(\d{2})')


def clean(value: str) -> str:
    value = html_lib.unescape(TAG_RE.sub(' ', value or ''))
    return SPACE_RE.sub(' ', value).strip()


def host_key(url: str) -> str:
    host = (urlparse(url).hostname or '').strip().lower().rstrip('.')
    if not host:
        return ''
    try:
        return host.encode('idna').decode('ascii').lower()
    except UnicodeError:
        return host


def same_host(base: str, target: str) -> bool:
    return bool(host_key(base)) and host_key(base) == host_key(target)


def fetch(url: str, timeout: float = 15, verify_tls: bool = True) -> str | None:
    req = Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; LandHorizonMapCollector/0.9)',
        'Accept': 'application/json,text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'ru-RU,ru;q=0.9',
    })
    context = None if verify_tls else ssl._create_unverified_context()
    try:
        with urlopen(req, timeout=timeout, context=context) as response:
            raw = response.read()
            charset = response.headers.get_content_charset() or 'utf-8'
            body = raw.decode(charset, errors='replace')
            print(f'HTTP {response.status} {len(raw)} bytes {url}')
            return body
    except Exception as exc:
        print(f'WARN fetch {url}: {exc}')
        return None


def relevance(title: str, body: str) -> tuple[str | None, int, str]:
    title_l = clean(title).lower()
    lead_l = clean(body)[:900].lower()
    scores: dict[str, int] = {}
    basis: dict[str, str] = {}
    for kind, phrase in DOC_PHRASES.items():
        score = 0
        why = []
        if re.search(phrase, title_l, re.I):
            score += 8
            why.append('title')
        direct_title = any(re.search(p, title_l, re.I) for p in DIRECT_PATTERNS[kind])
        direct_lead = any(re.search(p, lead_l, re.I) for p in DIRECT_PATTERNS[kind])
        if direct_title:
            score += 5
            why.append('direct_title')
        if direct_lead:
            score += 7
            why.append('direct_lead')
        if re.search(phrase, lead_l, re.I):
            score += 1
            why.append('lead_phrase')
        scores[kind] = score
        basis[kind] = '+'.join(why) or 'none'

    best = max(scores, key=scores.get)
    best_score = scores[best]
    ties = [k for k, v in scores.items() if v == best_score and v >= 7]
    if best_score < 7:
        return None, best_score, basis[best]
    if len(ties) > 1:
        return 'REVIEW', best_score, 'ambiguous:' + ','.join(ties)
    return best, best_score, basis[best]


def doc_status(title: str, body: str) -> str:
    lead = clean(f'{title} {body}')[:1000].lower()
    if any(m in lead for m in PROCESS_MARKERS):
        return 'draft'
    if any(m in lead for m in ACTIVE_MARKERS):
        return 'active_or_approved'
    return 'candidate'


def transport_fields(source: dict) -> dict:
    return {
        'official': bool(source.get('official', False)),
        'transport_tls_verified': bool(source.get('tls_verify', True)),
        'transport_note': source.get('transport_note'),
    }


def make_candidate(scope: dict, source: dict, title: str, target: str, body: str, published: str | None, query: str) -> dict | None:
    kind, score, basis = relevance(title, body)
    if not kind or kind == 'REVIEW':
        return None
    combined = clean(f'{title} {body}')
    return {
        'region_code': scope['region_code'],
        'cadastral_district': scope['cadastral_district'],
        'municipality': scope.get('municipality'),
        'doc_type': kind,
        'doc_status': doc_status(title, body),
        'classification_basis': basis,
        'relevance_score': score,
        'confidence': 'high' if score >= 12 else 'medium',
        'matched_queries': [query],
        'title': clean(title)[:300] or target,
        'document_url': target,
        'published_at': published,
        'source_name': source['name'],
        'source_url': source['base_url'],
        'snippet': combined[:700],
        **transport_fields(source),
    }


def merge_candidate(found: dict[str, dict], item: dict) -> None:
    old = found.get(item['document_url'])
    if not old:
        found[item['document_url']] = item
        return
    old['matched_queries'] = list(dict.fromkeys([*(old.get('matched_queries') or []), *(item.get('matched_queries') or [])]))
    if item.get('relevance_score', 0) > old.get('relevance_score', 0):
        item['matched_queries'] = old['matched_queries']
        found[item['document_url']] = item


def wordpress_rest(scope: dict, source: dict) -> list[dict]:
    verify_tls = bool(source.get('tls_verify', True))
    found: dict[str, dict] = {}
    for query in QUERIES.values():
        params = urlencode({'search': query, 'per_page': 100, '_fields': 'id,date,link,title,excerpt,content'})
        url = urljoin(source['base_url'], f'wp-json/wp/v2/posts?{params}')
        raw = fetch(url, verify_tls=verify_tls)
        if not raw:
            continue
        try:
            rows = json.loads(raw)
        except Exception as exc:
            print(f'WARN REST JSON {url}: {exc}')
            continue
        if not isinstance(rows, list):
            continue
        print(f'REST results {len(rows)} for {query!r}')
        for row in rows:
            target = str(row.get('link') or '')
            if not target or not same_host(source['base_url'], target):
                continue
            title = clean((row.get('title') or {}).get('rendered', ''))
            excerpt = clean((row.get('excerpt') or {}).get('rendered', ''))
            content = clean((row.get('content') or {}).get('rendered', ''))
            body = f'{excerpt} {content}'.strip()
            dm = ISO_DATE_RE.match(str(row.get('date') or ''))
            published = f'{dm.group(1)}-{dm.group(2)}-{dm.group(3)}' if dm else None
            item = make_candidate(scope, source, title, target, body, published, query)
            if item:
                merge_candidate(found, item)
        time.sleep(0.15)
    return list(found.values())


def load_existing() -> dict[str, dict]:
    if not OUT_FILE.exists():
        return {}
    try:
        payload = json.loads(OUT_FILE.read_text('utf-8'))
        return {x['document_url']: x for x in payload.get('candidates', []) if x.get('document_url')}
    except Exception:
        return {}


def run_self_test() -> None:
    cases = [
        ('public servitude false positive', 'СООБЩЕНИЕ О ВОЗМОЖНОМ УСТАНОВЛЕНИИ ПУБЛИЧНОГО СЕРВИТУТА',
         'Эксплуатация ЛЭП. В соответствии с генеральным планом городского округа и правилами землепользования и застройки...', None, None),
        ('PZZ amendment', 'Постановление администрации от 16.02.2026 №380',
         'О внесении изменений в Правила землепользования и застройки городского округа Большой Камень, утвержденные постановлением...', 'PZZ', 'active_or_approved'),
        ('PZZ commission is not PZZ amendment', 'Постановление администрации от 17.02.2026 №458',
         'О внесении изменений в постановление администрации «О комиссии по подготовке проекта Правил землепользования и застройки городского округа»', None, None),
        ('PZZ public discussion', 'ЗАКЛЮЧЕНИЕ О РЕЗУЛЬТАТАХ ОБЩЕСТВЕННЫХ ОБСУЖДЕНИЙ',
         'Наименование проекта общественных обсуждений: «О внесении изменений в Правила землепользования и застройки городского округа Большой Камень»', 'PZZ', 'draft'),
        ('Genplan amendment', 'Решение Думы городского округа Большой Камень от 23.01.2026 №341',
         'О внесении изменений в генеральный план городского округа Большой Камень. Руководствуясь Градостроительным кодексом...', 'GENPLAN', 'active_or_approved'),
    ]
    for name, title, body, expected_kind, expected_status in cases:
        kind, score, _ = relevance(title, body)
        actual_kind = None if kind == 'REVIEW' else kind
        if actual_kind != expected_kind:
            raise AssertionError(f'{name}: kind {actual_kind!r} score={score}, expected {expected_kind!r}')
        if expected_status and doc_status(title, body) != expected_status:
            raise AssertionError(f'{name}: status {doc_status(title, body)!r}, expected {expected_status!r}')
    print(f'SELF-TEST OK: {len(cases)} cases')


def main() -> None:
    config = json.loads(SOURCES_FILE.read_text('utf-8'))
    previous = load_existing()
    merged = dict(previous)
    now = datetime.now(timezone.utc).isoformat()

    for scope in config.get('scopes', []):
        for source in scope.get('sources', []):
            for url, item in list(merged.items()):
                if (item.get('source_name') == source.get('name') and
                    str(item.get('region_code')) == str(scope.get('region_code')) and
                    str(item.get('cadastral_district')) == str(scope.get('cadastral_district'))):
                    del merged[url]
            if source.get('search_mode', 'wordpress_rest') != 'wordpress_rest':
                print(f"WARN unsupported mode for {source['name']}: {source.get('search_mode')}")
                continue
            if not source.get('tls_verify', True):
                print(f"WARN TLS verification disabled only for configured source: {source['name']}")
            items = wordpress_rest(scope, source)
            print(f"Accepted candidates from {source['name']}: {len(items)}")
            for item in items:
                old = previous.get(item['document_url'], {})
                item['first_seen_at'] = old.get('first_seen_at', now)
                item['last_seen_at'] = now
                merged[item['document_url']] = item

    rows = sorted(merged.values(), key=lambda r: (r.get('published_at') or '', r.get('relevance_score') or 0), reverse=True)
    payload = {
        'generated_at': now,
        'schema_version': 2,
        'count': len(rows),
        'candidates': rows[:500],
    }
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', 'utf-8')
    print(f"Saved {len(payload['candidates'])} candidates to {OUT_FILE}")


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        run_self_test()
    else:
        run_self_test()
        main()
