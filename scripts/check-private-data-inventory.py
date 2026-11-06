#!/usr/bin/env python3
"""Read file metadata only; report changes since a private, verified inventory.
This is a quick change detector, not a replacement for content/hash verification.
"""
import json
from pathlib import Path

project = Path(__file__).resolve().parent.parent
index = project / '.private' / 'data-inventory.json'
if not index.is_file():
    raise SystemExit('로컬 자료 인덱스가 없어요. .private/data-locations.md의 인계 상태를 확인하세요.')
data = json.loads(index.read_text())
root = Path(data['root'])
if not root.is_dir():
    raise SystemExit('자료 루트에 접근할 수 없어요. iCloud/경로를 확인하세요. 자료가 삭제됐다고 판단하지 마세요.')
known = {row['path']: row for row in data['files']}
current = {str(p.relative_to(root)): p for p in root.rglob('*') if p.is_file()}
changed, errors = [], []
for name in known.keys() & current.keys():
    try:
        stat = current[name].stat()
        if stat.st_size != known[name]['size'] or stat.st_mtime_ns != known[name]['mtime_ns']:
            changed.append(name)
    except OSError as error:
        errors.append({'path': name, 'error': str(error)})
print(json.dumps({
    'mode': 'metadata_only_not_content_verification',
    'baseline': data['verifiedAt'],
    'knownFiles': len(known), 'currentFiles': len(current),
    'added': sorted(current.keys() - known.keys()),
    'missing': sorted(known.keys() - current.keys()),
    'changedMetadata': sorted(changed), 'errors': errors,
}, ensure_ascii=False, indent=2))
