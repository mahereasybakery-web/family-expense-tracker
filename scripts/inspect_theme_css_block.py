import sys
sys.stdout.reconfigure(encoding='utf-8')
with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# find data-app-theme section in CSS
pos_theme_css = text.find('[data-app-theme="navy"]')
print("pos_theme_css:", pos_theme_css)
if pos_theme_css != -1:
    print(text[pos_theme_css-50:pos_theme_css+2500])
