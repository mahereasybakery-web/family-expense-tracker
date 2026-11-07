import sys, io
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    page.on("console", lambda msg: print(f"Console {msg.type}: {msg.text}") if msg.type in ['error', 'warning'] else None)

    import os
    html_path = os.path.abspath("index.html")
    page.goto(f"file:///{html_path.replace(os.sep, '/')}")
    page.wait_for_timeout(1000)

    print("Page errors found:", len(errors))
    for e in errors:
        print("ERROR:", e)

    browser.close()
