"""
Family Expense Tracker - Automated Version Bumper
Usage:
    python scripts/bump_version.py [new_version] [release_notes]
Example:
    python scripts/bump_version.py 4.1.1 "تحسينات في الأداء والتحديث التلقائي"
"""

import sys, os, json, re, time
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSION_FILE = os.path.join(ROOT_DIR, 'version.json')
HTML_FILE = os.path.join(ROOT_DIR, 'index.html')

def bump():
    # Load current version.json
    data = {}
    if os.path.exists(VERSION_FILE):
        with open(VERSION_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)

    current_ver = data.get('version', '4.1.0')
    new_ver = sys.argv[1] if len(sys.argv) > 1 else current_ver
    notes = sys.argv[2] if len(sys.argv) > 2 else "تحديث تلقائي للنظام وتحسين الأداء"

    # Generate sequential or timestamped buildId
    now_dt = datetime.now()
    now_ts = int(time.time() * 1000)
    build_id = int(now_dt.strftime('%Y%m%d%H%M'))

    new_data = {
        "version": new_ver,
        "buildId": build_id,
        "buildTimestamp": now_ts,
        "releaseDate": now_dt.strftime('%Y-%m-%d %H:%M:%S'),
        "commit": "auto-update",
        "notes": notes
    }

    with open(VERSION_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, indent=2, ensure_ascii=False)
    print(f"✓ Updated version.json -> Version: {new_ver}, BuildId: {build_id}")

    # Update index.html
    if os.path.exists(HTML_FILE):
        with open(HTML_FILE, 'r', encoding='utf-8') as f:
            content = f.read()

        # Update APP_BUILD_ID
        content = re.sub(
            r'const APP_BUILD_ID = \d+;',
            f'const APP_BUILD_ID = {build_id};',
            content
        )
        content = re.sub(
            r'currentBuildNum = typeof APP_BUILD_ID !== \'undefined\' \? Number\(APP_BUILD_ID\) : \d+;',
            f'currentBuildNum = typeof APP_BUILD_ID !== \'undefined\' ? Number(APP_BUILD_ID) : {build_id};',
            content
        )

        # Update APP_VERSION if changed
        if new_ver != current_ver:
            content = re.sub(
                r'const APP_VERSION = \'[^\']+\';',
                f"const APP_VERSION = '{new_ver}';",
                content
            )

        with open(HTML_FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✓ Updated index.html with new BuildId: {build_id}")

if __name__ == '__main__':
    bump()
