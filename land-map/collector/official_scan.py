from __future__ import annotations

import json
import re
import ssl
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCES_FILE = Path(__file__).with_name("sources.json")
OUT_FILE = ROOT / "data" / "project-candidates.json"

QUERIES = [
    "Правила землепользования и застройки",
    "генеральный план",
    "проект планировки территории",
    "проект межевания территории",
    "комплексное развитие территории",
]

KEYWORDS = {
    "PZZ": ["правил землепользования", "пзз"],
    "GENPLAN": ["генеральный план", "генплан"],
    "PMT": ["проект межевания", "пмт"],
    "PPT": ["проект планировки", "ппт"],
    "KRT": ["комплексное развитие террит", "крт"],
}

TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
LINK_RE = re.compile(r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>([\s\S]*?)</a>', re.I)
DATE_RE = re.compile(r"\b(\d{2})\.(\d{2})\.(20\d{2})\b")
ISO_DATE_RE = re.compile(r"^(20\d{2})-(\d{2})-(\d{2})")


def text(html: str) -> str:
    value = TAG_RE.sub(" ", html or "")
    value = (
        value.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#039;", "'")
        .replace("&laquo;", "«")
        .replace("&raquo;", "»")
        .replace("&#8212;", "—")
        .replace("&#171;", "«")
        .replace("&#187;", "»")
    )
    return SPACE_RE.sub(" ", value).strip()


def classify(value: str) -> str | None:
    low = value.lower()
    for kind, words in KEYWORDS.items():
        if any(word in low for word in words):
            return kind
    return None


def status(value: str) -> str:
    low = value.lower()
    if any(x in low for x in ("общественн", "публичн", "проект", "экспозиц")):
        return "draft"
    if any(x in low for x in ("об утверждении", "о внесении изменений", "внести изменения", "утвердить")):
        return "active_or_approved"
    return "candidate"


def fetch(url: str, timeout: float = 12, verify_tls: bool = True) -> str | None:
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; LandHorizonMapCollector/0.6)",
            "Accept": "application/json,text/html,application/xhtml+xml,application/xml,text/xml,*/*",
            "Accept-Language": "ru-RU,ru;q=0.9",
        },
    )
    context = None if verify_tls else ssl._create_unverified_context()
    try:
        with urlopen(req, timeout=timeout, context=context) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            body = response.read().decode(charset, errors="replace")
            print(f"HTTP {response.status} {len(body)} bytes {url}")
            return body
    except Exception as exc:
        print(f"WARN fetch {url}: {exc}")
        return None


def same_host(base: str, target: str) -> bool:
    return urlparse(base).hostname == urlparse(target).hostname


def transport_fields(source: dict) -> dict:
    return {
        "official": bool(source.get("official", False)),
        "transport_tls_verified": bool(source.get("tls_verify", True)),
        "transport_note": source.get("transport_note"),
    }


def candidate(scope: dict, source: dict, title: str, url: str, combined: str, published: str | None) -> dict | None:
    kind = classify(combined)
    if not kind:
        return None
    return {
        "region_code": scope["region_code"],
        "cadastral_district": scope["cadastral_district"],
        "municipality": scope.get("municipality"),
        "doc_type": kind,
        "doc_status": status(combined),
        "title": title[:300],
        "document_url": url,
        "published_at": published,
        "source_name": source["name"],
        "source_url": source["base_url"],
        "snippet": combined[:700],
        **transport_fields(source),
    }


def candidates_from_html(html: str, source: dict, scope: dict) -> Iterable[dict]:
    for match in LINK_RE.finditer(html):
        href, anchor_html = match.groups()
        absolute = urljoin(source["base_url"], href)
        if not same_host(source["base_url"], absolute):
            continue
        start = max(0, match.start() - 600)
        end = min(len(html), match.end() + 1000)
        context = text(html[start:end])
        title = text(anchor_html)
        if len(title) < 4:
            continue
        combined = f"{title} {context}"
        dm = DATE_RE.search(context)
        published = f"{dm.group(3)}-{dm.group(2)}-{dm.group(1)}" if dm else None
        item = candidate(scope, source, title, absolute, combined, published)
        if item:
            yield item


def wordpress_rest(scope: dict, source: dict) -> list[dict]:
    verify_tls = bool(source.get("tls_verify", True))
    found: dict[str, dict] = {}
    for query in QUERIES:
        params = urlencode({"search": query, "per_page": 100, "_fields": "id,date,link,title,excerpt,content"})
        url = urljoin(source["base_url"], f"wp-json/wp/v2/posts?{params}")
        raw = fetch(url, verify_tls=verify_tls)
        if not raw:
            continue
        try:
            rows = json.loads(raw)
        except Exception as exc:
            print(f"WARN REST JSON {url}: {exc}")
            continue
        if not isinstance(rows, list):
            print(f"WARN REST unexpected payload: {type(rows).__name__}")
            continue
        print(f"REST results {len(rows)} for {query!r}")
        for row in rows:
            target = row.get("link")
            title = text((row.get("title") or {}).get("rendered", ""))
            excerpt = text((row.get("excerpt") or {}).get("rendered", ""))
            content = text((row.get("content") or {}).get("rendered", ""))
            combined = f"{title} {excerpt} {content}"
            if not target or not same_host(source["base_url"], target):
                continue
            published = None
            dm = ISO_DATE_RE.match(str(row.get("date") or ""))
            if dm:
                published = f"{dm.group(1)}-{dm.group(2)}-{dm.group(3)}"
            item = candidate(scope, source, title or combined[:120], target, combined, published)
            if item:
                found[target] = item
        time.sleep(0.2)
    return list(found.values())


def sitemap_urls(source: dict, limit: int = 400) -> list[str]:
    verify_tls = bool(source.get("tls_verify", True))
    roots = [
        urljoin(source["base_url"], "wp-sitemap.xml"),
        urljoin(source["base_url"], "sitemap_index.xml"),
    ]
    pages: list[str] = []
    for root in roots:
        raw = fetch(root, verify_tls=verify_tls)
        if not raw:
            continue
        try:
            xml = ET.fromstring(raw)
        except Exception:
            continue
        locs = [e.text.strip() for e in xml.iter() if e.tag.endswith("loc") and e.text]
        if xml.tag.endswith("sitemapindex"):
            for child in locs[:12]:
                child_raw = fetch(child, verify_tls=verify_tls)
                if not child_raw:
                    continue
                try:
                    child_xml = ET.fromstring(child_raw)
                except Exception:
                    continue
                for e in child_xml.iter():
                    if e.tag.endswith("loc") and e.text:
                        u = e.text.strip()
                        if same_host(source["base_url"], u):
                            pages.append(u)
                            if len(pages) >= limit:
                                return pages
        else:
            pages.extend(u for u in locs if same_host(source["base_url"], u))
        if pages:
            break
    return pages[:limit]


def scan_sitemap(scope: dict, source: dict) -> list[dict]:
    verify_tls = bool(source.get("tls_verify", True))
    found: dict[str, dict] = {}
    urls = sitemap_urls(source)
    print(f"Sitemap page URLs: {len(urls)}")
    # First use URL text as a cheap filter; then inspect a bounded number of recent/content pages.
    likely = [u for u in urls if classify(u.replace("-", " ").replace("_", " "))]
    inspect = (likely + [u for u in urls if u not in likely])[-120:]
    for target in inspect:
        html = fetch(target, timeout=8, verify_tls=verify_tls)
        if not html:
            continue
        page_text = text(html)
        kind = classify(page_text)
        if not kind:
            continue
        title_match = re.search(r"<title[^>]*>([\s\S]*?)</title>", html, re.I)
        title = text(title_match.group(1)) if title_match else page_text[:140]
        dm = DATE_RE.search(page_text)
        published = f"{dm.group(3)}-{dm.group(2)}-{dm.group(1)}" if dm else None
        item = candidate(scope, source, title, target, page_text, published)
        if item:
            found[target] = item
        time.sleep(0.08)
    return list(found.values())


def html_search(scope: dict, source: dict) -> list[dict]:
    verify_tls = bool(source.get("tls_verify", True))
    found: dict[str, dict] = {}
    urls = [source["base_url"]]
    for query in QUERIES:
        urls.append(source["base_url"] + "?" + urlencode({"s": query}))
    for url in urls:
        raw = fetch(url, verify_tls=verify_tls)
        if not raw:
            continue
        for item in candidates_from_html(raw, source, scope):
            old = found.get(item["document_url"])
            if old is None or len(item.get("snippet", "")) > len(old.get("snippet", "")):
                found[item["document_url"]] = item
        time.sleep(0.2)
    return list(found.values())


def scan_source(scope: dict, source: dict) -> list[dict]:
    verify_tls = bool(source.get("tls_verify", True))
    if not verify_tls:
        print(f"WARN TLS verification disabled only for configured source: {source['name']}")

    mode = source.get("search_mode", "wordpress_rest")
    found: dict[str, dict] = {}
    if mode == "wordpress_rest":
        for item in wordpress_rest(scope, source):
            found[item["document_url"]] = item
        if not found:
            print("REST returned no classified candidates; trying sitemap")
            for item in scan_sitemap(scope, source):
                found[item["document_url"]] = item
        if not found:
            print("Sitemap returned no classified candidates; trying HTML search")
            for item in html_search(scope, source):
                found[item["document_url"]] = item
    else:
        for item in html_search(scope, source):
            found[item["document_url"]] = item
    return list(found.values())


def load_existing() -> dict[str, dict]:
    if not OUT_FILE.exists():
        return {}
    try:
        payload = json.loads(OUT_FILE.read_text("utf-8"))
        return {item["document_url"]: item for item in payload.get("candidates", []) if item.get("document_url")}
    except Exception:
        return {}


def main() -> None:
    config = json.loads(SOURCES_FILE.read_text("utf-8"))
    merged = load_existing()
    now = datetime.now(timezone.utc).isoformat()

    for scope in config.get("scopes", []):
        for source in scope.get("sources", []):
            items = scan_source(scope, source)
            print(f"Classified candidates from {source['name']}: {len(items)}")
            for item in items:
                previous = merged.get(item["document_url"], {})
                item["first_seen_at"] = previous.get("first_seen_at", now)
                item["last_seen_at"] = now
                merged[item["document_url"]] = item

    rows = list(merged.values())
    rows.sort(key=lambda r: (r.get("published_at") or "", r.get("last_seen_at") or ""), reverse=True)
    payload = {"generated_at": now, "count": len(rows), "candidates": rows[:500]}
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"Saved {len(payload['candidates'])} candidates to {OUT_FILE}")


if __name__ == "__main__":
    main()
