import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'function switchAppPage\b', html)
if m:
    print("=== switchAppPage ===")
    print(html[m.start():m.start()+1500])
