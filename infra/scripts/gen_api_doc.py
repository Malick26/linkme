#!/usr/bin/env python3
"""Régénère docs/API.md à partir du contrat OpenAPI (source de vérité)."""
import datetime, io, os, yaml

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = yaml.safe_load(open(os.path.join(ROOT, 'services/api/src/main/resources/openapi/openapi.yaml')))
rows = []
for path, ops in spec['paths'].items():
    for m, op in ops.items():
        if m not in ('get', 'post', 'put', 'delete', 'patch'):
            continue
        rows.append((op.get('tags', ['-'])[0], m.upper(), path, op.get('operationId', ''),
                     op.get('summary', '').strip('"'), 'public' if op.get('security') == [] else 'session'))
rows.sort(key=lambda r: (r[0], r[2], r[1]))
header = open(os.path.join(ROOT, 'docs/API.md')).read().split('\n## ')[0] if os.path.exists(os.path.join(ROOT, 'docs/API.md')) else ''
out = io.StringIO(); out.write(header)
cur = None
for tag, m, path, opid, summary, auth in rows:
    if tag != cur:
        cur = tag
        out.write(f"\n## {tag}\n\n| Méthode | Chemin | operationId | Accès | Description |\n|---|---|---|---|---|\n")
    out.write(f"| `{m}` | `{path}` | `{opid}` | {auth} | {summary} |\n")
out.write(f"\n---\n\n{len(rows)} opérations. Généré depuis le contrat le {datetime.date.today().isoformat()} (`python3 infra/scripts/gen_api_doc.py`).\n")
open(os.path.join(ROOT, 'docs/API.md'), 'w').write(out.getvalue())
print(f"docs/API.md : {len(rows)} opérations")
