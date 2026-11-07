import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

m = re.search(r'function renderActualBalanceAuditLedger\b', html)
if m:
    print("=== renderActualBalanceAuditLedger part 3 ===")
    print(html[m.start()+7000:m.start()+11000])
