import json, re

with open(r'C:\Users\96656\.gemini\antigravity\brain\0de95090-23a6-4a7f-a9b2-09153ee49670\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        if 'github.io' in line or 'mahereasybakery' in line or 'https://' in line:
            try:
                data = json.loads(line)
                txt = json.dumps(data, ensure_ascii=False)
                urls = re.findall(r'https?://[a-zA-Z0-9_\-\./]+', txt)
                for u in urls:
                    if 'github.io' in u or 'mahereasybakery' in u or 'web.app' in u:
                        print(u)
            except:
                pass
