#!/usr/bin/env python3
"""Validate official territorial-zone GeoJSON and publish a normalized dataset.
No geometry is invented. Only explicit polygon features are accepted.
Usage: python land-map/collector/zones_ingest.py input.geojson --municipality "..." --source-url https://... --document-id "..."
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

def ingest(payload, municipality, source_url, document_id):
    if payload.get("type") != "FeatureCollection" or not isinstance(payload.get("features"), list):
        raise ValueError("Expected GeoJSON FeatureCollection")
    if urlparse(source_url).scheme != "https":
        raise ValueError("Official source URL must be HTTPS")
    if not municipality.strip() or not document_id.strip():
        raise ValueError("Municipality and document identifier are required")
    accepted, rejected = [], []
    for idx, feature in enumerate(payload["features"]):
        g = feature.get("geometry") or {}
        props = feature.get("properties") or {}
        code = str(props.get("zone_code") or props.get("zone") or "").strip()
        if g.get("type") not in ("Polygon", "MultiPolygon") or not code:
            rejected.append({"index": idx, "reason": "missing_polygon_or_zone_code"})
            continue
        coordinates = g.get("coordinates")
        if not isinstance(coordinates, list) or not coordinates:
            rejected.append({"index": idx, "reason": "missing_coordinates"})
            continue
        accepted.append({"type": "Feature", "geometry": g, "properties": {
            "zone_code": code, "zone_name": props.get("zone_name"),
            "municipality": municipality, "document_id": document_id,
            "source_url": source_url, "verification": "source_supplied_unverified",
            "status": props.get("status", "unknown")
        }})
    return {"type": "FeatureCollection", "features": accepted}, rejected

def main():
    p = argparse.ArgumentParser()
    p.add_argument("input", type=Path)
    p.add_argument("--municipality", required=True)
    p.add_argument("--source-url", required=True)
    p.add_argument("--document-id", required=True)
    p.add_argument("--output-dir", type=Path, default=Path("land-map/data/zones"))
    args = p.parse_args()
    raw = args.input.read_bytes()
    features, rejected = ingest(json.loads(raw), args.municipality, args.source_url, args.document_id)
    digest = hashlib.sha256(raw).hexdigest()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    key = digest[:16]
    (args.output_dir / f"{key}.geojson").write_text(json.dumps(features, ensure_ascii=False), encoding="utf-8")
    report = {"generated_at": datetime.now(timezone.utc).isoformat(), "source_sha256": digest,
              "source_url": args.source_url, "municipality": args.municipality,
              "document_id": args.document_id, "accepted": len(features["features"]),
              "rejected": rejected, "coverage_claim": "none",
              "note": "Geometry is unverified until official source and coordinate reference system are confirmed."}
    (args.output_dir / f"{key}.report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))

if __name__ == "__main__":
    main()
