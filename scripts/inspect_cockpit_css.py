import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Search for topCardBalance markup
m = re.search(r'id=["\']topCardBalance["\']', html)
if m:
    print("=== topCardBalance markup ===")
    print(html[m.start()-150:m.start()+400])

# 2. Search for cockpit CSS
m2 = re.search(r'\.cockpit-hero-value\b', html)
if m2:
    print("=== .cockpit-hero-value CSS ===")
    print(html[m2.start()-50:m2.start()+500])

# 3. Search for .flow-amount CSS
m3 = re.search(r'\.flow-amount\b', html)
if m3:
    print("=== .flow-amount CSS ===")
    print(html[m3.start()-50:m3.start()+500])
