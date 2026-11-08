import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('C:/Users/96656/.gemini/antigravity/scratch/family_expense_tracker_monefy/index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'function renderOperationsList(' in line:
        print(f"renderOperationsList found at line {i+1}")
        for j in range(i, min(len(lines), i + 100)):
            print(f"{j+1}: {lines[j]}", end='')
        break
