import sys
sys.stdout.reconfigure(encoding='utf-8')

# 1. Bump version.json
v_json = """{
  "version": "5.0.3",
  "buildId": 202611071845,
  "updatedAt": "2026-11-07T18:45:00+03:00",
  "releaseNotes": "ضبط هندسي قطعي لمحاذاة المبالغ (علامة الزائد والناقص إلى يمين الرقم ورمز العملة إلى يسار الرقم)، وإعادة بناء جذرية لنظام المهام والخطوات الفرعية من الصفر مع زر مباشر في الشريط العلوي وقوائم تفاعلية متطورة وتحويل مالي فوري"
}"""
with open('version.json', 'w', encoding='utf-8') as f:
    f.write(v_json)
print("Updated version.json to v5.0.3")

# 2. Bump sw.js
with open('sw.js', 'r', encoding='utf-8') as f:
    sw_content = f.read()

sw_content = sw_content.replace(
    'const CACHE_NAME = "family-expense-tracker-v5.0.2-202611071830";',
    'const CACHE_NAME = "family-expense-tracker-v5.0.3-202611071845";'
)
with open('sw.js', 'w', encoding='utf-8') as f:
    f.write(sw_content)
print("Updated sw.js to v5.0.3")

# 3. Bump index.html version badge / strings if any
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('v5.0.2', 'v5.0.3')
html = html.replace('202611071830', '202611071845')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Updated index.html to v5.0.3")
