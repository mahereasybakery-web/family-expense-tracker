with open('C:/Users/96656/.gemini/antigravity/scratch/family_expense_tracker_monefy/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = list(re.finditer(r'v4\.9\.9', text))
print(f"Found {len(matches)} matches of v4.9.9")

text = re.sub(r'v4\.9\.9', 'v5.0.2', text)
text = re.sub(r'202611071745', '202611071830', text)

with open('C:/Users/96656/.gemini/antigravity/scratch/family_expense_tracker_monefy/index.html', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated index.html to v5.0.2 Build 202611071830")
