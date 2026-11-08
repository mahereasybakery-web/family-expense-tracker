import asyncio
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.async_api import async_playwright

async def inspect_expected():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 412, "height": 915})
        page = await context.new_page()
        
        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))
        page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}") if msg.type in ['error', 'warn'] else None)
        
        await page.goto('file:///C:/Users/96656/.gemini/antigravity/scratch/family_expense_tracker_monefy/index.html')
        await page.wait_for_timeout(1000)
        
        # Click on navTabExpected
        nav = page.locator('#navTabExpected')
        await nav.click()
        await page.wait_for_timeout(600)
        
        # Check viewExpected visibility and children
        view_exp = page.locator('#viewExpected')
        print("viewExpected is_visible:", await view_exp.is_visible())
        
        sub_comm = page.locator('#subViewCommitments')
        print("subViewCommitments is_visible:", await sub_comm.is_visible())
        
        panel_list = page.locator('#panelListExpected')
        print("panelListExpected is_visible:", await panel_list.is_visible())
        
        container = page.locator('#expectedListContainer')
        print("expectedListContainer is_visible:", await container.is_visible())
        print("expectedListContainer inner_html:", repr(await container.inner_html()))
        
        # Check what state.expectedExpenses contains
        exp_data = await page.evaluate("() => ({ expectedExpenses: state.expectedExpenses, filter: state.expectedTypeFilter })")
        print("State expected:", exp_data)
        
        await page.screenshot(path="C:/Users/96656/.gemini/antigravity/brain/0de95090-23a6-4a7f-a9b2-09153ee49670/test_expected_page.png")
        await browser.close()

asyncio.run(inspect_expected())
