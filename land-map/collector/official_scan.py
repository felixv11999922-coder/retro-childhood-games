from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
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


def text(html: str) -> str:
    value = TAG_RE.sub(" ", html)
    value = (
        value.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#039;", "'")
        .replace("&laquo;", "«")
        .replace("&raquo;", "»")
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


def fetch(url: str, timeout: float = 12) -> str | None:
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; LandHorizonMapCollector/0.5)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "ru-RU,ru;q=0.9",
        },
    )
    try:
        with urlopen(req, timeout=timeout) as response:
            charset = response.headers.get_content_charset() or "utf-8"
            return response.read().decode(charset, errors="replace")
    except Exception as exc:
        print(f"WARN fetch {url}: {exc}")
        return None


def same_host(base: str, target: str) -> bool:
    return urlparse(base).hostname == urlparse(target).hostname


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
        kind = classify(f"{title} {context}")
        if not kind:
            continue
        dm = DATE_RE.search(context)
        published = f"{dm.group(3)}-{dm.group(2)}-{dm.group(1)}" if dm else None
        yield {
            "region_code": scope["region_code"],
            "cadastral_district": scope["cadastral_district"],
            "municipality": scope.get("municipality"),
            "doc_type": kind,
            "doc_status": status(f"{title} {context}"),
            "title": title[:300],
            "document_url": absolute,
            "published_at": published,
            "source_name": source["name"],
            "source_url": source["base_url"],
            "snippet": context[:700],
            "official": bool(source.get("official", False)),
        }


def scan_source(scope: dict, source: dict) -> list[dict]:
    found: dict[str, dict] = {}
    mode = source.get("search_mode", "wordpress_query")
    urls: list[str] = []
    if mode == "wordpress_query":
        for query in QUERIES:
            urls.append(source["base_url"] + "?" + urlencode({"s": query}))
    else:
        urls.append(source["base_url"])

    for url in urls:
        print(f"GET {url}")
        html = fetch(url)
        if not html:
            continue
        for item in candidates_from_html(html, source, scope):
            old = found.get(item["document_url"])
            if old is None or len(item.get("snippet", "")) > len(old.get("snippet", "")):
                found[item["document_url"]] = item
        time.sleep(0.4)
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
            for item in scan_source(scope, source):
                previous = merged.get(item["document_url"], {})
                item["first_seen_at"] = previous.get("first_seen_at", now)
                item["last_seen_at"] = now
                merged[item["document_url"]] = item

    rows = list(merged.values())
    rows.sort(key=lambda r: (r.get("published_at") or "", r.get("last_seen_at") or ""), reverse=True)
    payload = {
        "generated_at": now,
        "count": len(rows),
        "candidates": rows[:500],
    }
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"Saved {len(payload['candidates'])} candidates to {OUT_FILE}")


if __name__ == "__main__":
    main()
