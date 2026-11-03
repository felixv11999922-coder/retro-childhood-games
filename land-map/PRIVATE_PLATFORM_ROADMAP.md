# Земельный горизонт: private-first roadmap

## Security gate (must pass before claiming private)
The current GitHub Pages deployment is public. A login overlay is NOT access control. Do not store password or service keys in JavaScript, and do not claim the site is private until verified anonymously inaccessible.

1. Inventory GitHub Pages routes, public assets, Supabase Edge Functions, tables, buckets and credentials.
2. Place the application behind a server-enforced identity gate (e.g. Cloudflare Access with owner-only email policy) on a protected hostname. Configure origin so the github.io URL cannot bypass the gate; GitHub Pages public origin must be retired for the protected application.
3. Enforce JWT validation and owner allowlist in each data API, including nspd-search, nspd-wms, planning-sources, and any caches. Check Supabase RLS and storage policies. Map tiles and GetFeatureInfo must not bypass authentication.
4. Remove sensitive assets from public static hosting. Rotate exposed secrets if any.
5. Verify: anonymous GET HTML/JS/JSON and API calls denied; signed-in owner allowed; other account denied; expired token denied; no registration. Only then announce private launch.

## Russia-wide territorial zones
- Region -> municipality -> official PZZ document/version -> zone geometry -> zone code -> regulation, with provenance, effective date and approval status.
- Spatial storage: PostGIS geometries with SRID normalization, indexing, topology checks and incremental refresh.
- Ingestion: official FGISTP/GISOGD/municipal sources, with license/availability checks and per-municipality coverage indicators.
- Distinguish official vector geometry from digitized/reference and project zones.
- Clicking parcel/point returns intersecting zones and citations to approved PZZ. Never infer permitted uses from zone color alone.
- Support cadastre, settlements, ZOUIT, red lines, GP, PPT, PMT, comparison and candidate screening with explicit uncertainty.
- Coverage dashboards must distinguish missing, outdated, verified, conflicting and under-review datasets.

## Future subscription (disabled until authorized)
Owner-only identity now. Model organizations/users, roles, entitlements, plans and metering without public signup or billing. Enable billing only after explicit owner approval.

## Release criteria
Preserve v0.7 search and independent WMS/planning paths. Unit/integration tests, anonymous access security test, production smoke test, audit log and rollback plan required. No production exposure until access gate passes.
