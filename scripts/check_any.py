with open(r'C:\Users\96656\.gemini\antigravity\scratch\family_expense_tracker_monefy\index.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'visibilitychange' in line:
            print(f"Line {i+1}: {line.strip()[:100]}")
