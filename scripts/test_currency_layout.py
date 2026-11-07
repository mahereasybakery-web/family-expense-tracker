import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

html_content = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
body { font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; }
.amount-cluster {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  font-size: 1.2rem;
  font-weight: 900;
}
.sign-neg { color: #f43f5e; font-size: 1.3rem; }
.sign-pos { color: #10b981; font-size: 1.3rem; }
.num { font-variant-numeric: tabular-nums; }
.curr { font-size: 0.85rem; color: #94a3b8; font-weight: 700; }
</style>
</head>
<body>
  <h2>تجربة موضع العملة والإشارة في RTL:</h2>
  
  <p>المصروف (يجب أن تكون علامة السالب - على اليمين، والرقم بالوسط، والعملة ج.م على اليسار):</p>
  <div class="amount-cluster" id="expCluster">
    <span class="sign-neg" id="signEl">-</span>
    <span class="num" id="numEl">1,550.00</span>
    <span class="curr" id="currEl">ج.م</span>
  </div>
  
  <p>الدخل (يجب أن تكون علامة الموجب + على اليمين، والرقم بالوسط، والعملة ج.م على اليسار):</p>
  <div class="amount-cluster" id="incCluster">
    <span class="sign-pos">+</span>
    <span class="num">8,000.00</span>
    <span class="curr">ج.م</span>
  </div>
</body>
</html>
"""

with open('C:/Users/96656/.gemini/antigravity/scratch/family_expense_tracker_monefy/test_layout.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 412, "height": 915})
        await page.goto('file:///C:/Users/96656/.gemini/antigravity/scratch/family_expense_tracker_monefy/test_layout.html')
        await page.wait_for_timeout(500)
        
        sign_box = await page.evaluate("() => document.getElementById('signEl').getBoundingClientRect()")
        num_box = await page.evaluate("() => document.getElementById('numEl').getBoundingClientRect()")
        curr_box = await page.evaluate("() => document.getElementById('currEl').getBoundingClientRect()")
        
        print("Sign X (Rightmost should have largest X):", sign_box['x'])
        print("Num X (Middle):", num_box['x'])
        print("Curr X (Leftmost should have smallest X):", curr_box['x'])
        
        if sign_box['x'] > num_box['x'] and num_box['x'] > curr_box['x']:
            print("SUCCESS! Sign is on the RIGHT, Number is in the MIDDLE, Currency is on the LEFT!")
        else:
            print("ORDER NOT MATCHED!")
            
        await page.screenshot(path="C:/Users/96656/.gemini/antigravity/brain/0de95090-23a6-4a7f-a9b2-09153ee49670/test_amount_layout.png")
        await browser.close()

asyncio.run(run())
