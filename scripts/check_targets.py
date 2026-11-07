import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

import re
pos = text.find('btnOpenSummaryDrawer')
if pos != -1:
    print("btnOpenSummaryDrawer area:")
    print(repr(text[pos-80:pos+220]))

pos2 = text.find('class="ops-tx-left-cluster"')
if pos2 != -1:
    print("ops-tx-left-cluster area:")
    print(repr(text[pos2-20:pos2+400]))

pos3 = text.find('closeModal(\'incomeHistoryModal\')')
if pos3 != -1:
    print("incomeHistoryModal area:")
    print(repr(text[pos3-150:pos3+250]))
