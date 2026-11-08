import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# search for data-app-theme CSS rules
theme_rules = re.findall(r'\[data-app-theme=[\'\"]\w+[\'\"]\][\s\S]*?\}', text[:150000])
print(f"Found {len(theme_rules)} data-app-theme CSS rules in first 150KB")
for r in theme_rules[:5]:
    print(r[:200])

print("\n--- Card styles in CSS ---")
card_rules = re.findall(r'\[data-card-style=[\'\"]\w+[\'\"]\][\s\S]*?\}', text[:150000])
print(f"Found {len(card_rules)} data-card-style rules")
for r in card_rules[:4]:
    print(r[:200])
