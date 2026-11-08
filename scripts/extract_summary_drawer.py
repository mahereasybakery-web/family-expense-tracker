import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('function renderSummaryDrawer(')
print("Length of file:", len(text))
print("renderSummaryDrawer at:", pos)
# find end of function
pos_end = text.find('// =========================================================================\n    // نظام المهام والمسؤوليات الذكي المتطور', pos)
print("pos_end at:", pos_end)

chunk = text[pos:pos_end]
with open('scripts/current_renderSummaryDrawer.js', 'w', encoding='utf-8') as f_out:
    f_out.write(chunk)
print("Saved scripts/current_renderSummaryDrawer.js, length:", len(chunk))
