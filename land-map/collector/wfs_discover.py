#!/usr/bin/env python3
"""Discover WFS feature types from a configured public OGC service.
Read-only discovery; no claim that any layer contains official PZZ zones.
"""
import argparse
import json
import xml.etree.ElementTree as ET
from urllib.parse import urlencode, urlsplit, urlunsplit, parse_qsl
from urllib.request import Request, urlopen

def capabilities_url(base):
    u = urlsplit(base)
    if u.scheme != "https" or not u.hostname:
        raise ValueError("HTTPS endpoint required")
    params = dict(parse_qsl(u.query))
    params.update({"service":"WFS","request":"GetCapabilities"})
    return urlunsplit((u.scheme,u.netloc,u.path,urlencode(params),""))

def discover(xml_data):
    root = ET.fromstring(xml_data)
    result = []
    for node in root.iter():
        if node.tag.rsplit("}",1)[-1] != "FeatureType":
            continue
        fields = {}
        for child in node:
            name = child.tag.rsplit("}",1)[-1]
            if name in ("Name","Title","DefaultCRS","DefaultSRS"):
                fields[name] = (child.text or "").strip()
        if fields.get("Name"):
            result.append(fields)
    return result

def main():
    p = argparse.ArgumentParser()
    p.add_argument("url")
    p.add_argument("--timeout",type=int,default=12)
    args = p.parse_args()
    req = Request(capabilities_url(args.url),headers={"User-Agent":"LandHorizon-SourceDiscovery/0.1"})
    with urlopen(req,timeout=args.timeout) as response:
        data = response.read(4_000_001)
    if len(data) > 4_000_000:
        raise ValueError("Capabilities document too large")
    print(json.dumps({"endpoint":args.url,"feature_types":discover(data),
                      "verified_pzz":False},ensure_ascii=False,indent=2))

if __name__ == "__main__":
    main()
