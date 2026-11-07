import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('version.json', 'r', encoding='utf-8') as f:
    print('version.json:', f.read())

with open('sw.js', 'r', encoding='utf-8') as f:
    for line in f.readlines()[:10]:
        print('sw.js:', line.strip())
