import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

with open('C:/Users/96656/.gemini/antigravity/scratch/family_expense_tracker_monefy/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

start_idx = text.find('id="tasksFullScreenModal"')
if start_idx != -1:
    print(text[start_idx:start_idx+2500])
