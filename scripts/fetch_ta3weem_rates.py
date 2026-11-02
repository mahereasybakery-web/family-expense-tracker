#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to fetch real-time currency rates (Banque Misr) and gold prices (IDSC)
from ta3weem.com and output a structured market_rates.json for the app.
"""

import json
import os
import re
import ssl
import sys
import urllib.request
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3'
}

def fetch_url(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        return resp.read().decode('utf-8')

def parse_ta3weem_table(html):
    results = []
    trs = re.findall(r'<tr.*?>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
    for tr in trs:
        tds = re.findall(r'<td.*?>(.*?)</td>', tr, re.DOTALL | re.IGNORECASE)
        if len(tds) < 3:
            continue
        
        name = re.sub(r'<.*?>', ' ', tds[0]).strip()
        name = re.sub(r'\s+', ' ', name)
        
        def extract_price_and_chg(td):
            fc = re.search(r'class="flex flex-col">\s*<span>(.*?)</span>.*?<span.*?>(.*?)</span>', td, re.DOTALL)
            if fc:
                raw_p = re.sub(r'<.*?>', '', fc.group(1)).replace(',', '').strip()
                raw_c = re.sub(r'<.*?>', '', fc.group(2)).strip()
                try:
                    price = float(raw_p)
                except:
                    price = None
                return price, raw_c
            return None, None
        
        buy_p, buy_c = extract_price_and_chg(tds[1])
        sell_p, sell_c = extract_price_and_chg(tds[2])
        
        results.append({
            'name': name,
            'buy': buy_p,
            'buy_chg': buy_c,
            'sell': sell_p,
            'sell_chg': sell_c
        })
    return results

def main():
    print("Fetching Banque Misr rates from ta3weem.com...")
    bm_url = 'https://ta3weem.com/ar/banks/banque-misr-bm'
    gold_url = 'https://ta3weem.com/ar/gold-data-sources/information-and-decision-support-center-gold'
    
    bm_html = fetch_url(bm_url)
    gold_html = fetch_url(gold_url)
    
    currencies = parse_ta3weem_table(bm_html)
    gold = parse_ta3weem_table(gold_html)
    
    # Map currencies strictly
    c_map = {}
    for c in currencies:
        n = c['name']
        if '(USD)' in n or 'دولار أمريكي' in n:
            c_map['usd'] = c
        elif '(SAR)' in n or 'سعودي' in n:
            c_map['sar'] = c
        elif '(EUR)' in n or 'يورو' in n:
            c_map['eur'] = c
        elif '(AED)' in n or 'إماراتي' in n:
            c_map['aed'] = c
        elif '(KWD)' in n or 'كويتي' in n:
            c_map['kwd'] = c
        elif '(GBP)' in n or 'إسترليني' in n:
            c_map['gbp'] = c
        elif '(QAR)' in n or 'قطري' in n:
            c_map['qar'] = c

    # Map gold
    g_map = {}
    for g in gold:
        n = g['name']
        if '24' in n:
            g_map['gold24'] = g
        elif '21' in n:
            g_map['gold21'] = g
        elif '18' in n:
            g_map['gold18'] = g
        elif 'جنيه' in n:
            g_map['goldPound'] = g

    now_iso = datetime.now().isoformat()
    now_ar = datetime.now().strftime('%Y-%m-%d %I:%M %p')

    market_data = {
        'source': 'ta3weem.com',
        'sources_urls': {
            'banque_misr': bm_url,
            'gold_idsc': gold_url
        },
        'updated_at': now_iso,
        'updated_at_display': now_ar,
        'currencies': {
            'USD': {
                'code': 'USD',
                'name': 'دولار أمريكي',
                'buy': c_map.get('usd', {}).get('buy', 55.74),
                'sell': c_map.get('usd', {}).get('sell', 55.84),
                'chg': c_map.get('usd', {}).get('sell_chg', '-0.45%'),
                'bank': 'بنك مصر'
            },
            'SAR': {
                'code': 'SAR',
                'name': 'ريال سعودي',
                'buy': c_map.get('sar', {}).get('buy', 14.78),
                'sell': c_map.get('sar', {}).get('sell', 14.87),
                'chg': c_map.get('sar', {}).get('sell_chg', '-0.45%'),
                'bank': 'بنك مصر'
            },
            'EUR': {
                'code': 'EUR',
                'name': 'يورو',
                'buy': c_map.get('eur', {}).get('buy', 62.08),
                'sell': c_map.get('eur', {}).get('sell', 62.62),
                'chg': c_map.get('eur', {}).get('sell_chg', '+0.03%'),
                'bank': 'بنك مصر'
            },
            'AED': {
                'code': 'AED',
                'name': 'درهم إماراتي',
                'buy': c_map.get('aed', {}).get('buy', 15.16),
                'sell': c_map.get('aed', {}).get('sell', 15.20),
                'chg': c_map.get('aed', {}).get('sell_chg', '-0.44%'),
                'bank': 'بنك مصر'
            },
            'KWD': {
                'code': 'KWD',
                'name': 'دينار كويتي',
                'buy': c_map.get('kwd', {}).get('buy', 176.95),
                'sell': c_map.get('kwd', {}).get('sell', 181.50),
                'chg': c_map.get('kwd', {}).get('sell_chg', '-0.45%'),
                'bank': 'بنك مصر'
            }
        },
        'gold': {
            'gold24': {
                'karat': 24,
                'name': 'ذهب عيار 24 (سبائك)',
                'buy': g_map.get('gold24', {}).get('buy', 7280.00),
                'sell': g_map.get('gold24', {}).get('sell', 7308.50),
                'chg': g_map.get('gold24', {}).get('sell_chg', '0%'),
                'source': 'مركز المعلومات ودعم اتخاذ القرار'
            },
            'gold21': {
                'karat': 21,
                'name': 'ذهب عيار 21 (الأكثر طلباً)',
                'buy': g_map.get('gold21', {}).get('buy', 6370.00),
                'sell': g_map.get('gold21', {}).get('sell', 6395.00),
                'chg': g_map.get('gold21', {}).get('sell_chg', '0%'),
                'source': 'مركز المعلومات ودعم اتخاذ القرار'
            },
            'gold18': {
                'karat': 18,
                'name': 'ذهب عيار 18',
                'buy': g_map.get('gold18', {}).get('buy', 5460.00),
                'sell': g_map.get('gold18', {}).get('sell', 5481.50),
                'chg': g_map.get('gold18', {}).get('sell_chg', '0%'),
                'source': 'مركز المعلومات ودعم اتخاذ القرار'
            },
            'goldPound': {
                'karat': 21,
                'weight': 8,
                'name': 'جنيه الذهب (BTC)',
                'buy': g_map.get('goldPound', {}).get('buy', 48920.00),
                'sell': g_map.get('goldPound', {}).get('sell', 49320.00),
                'chg': g_map.get('goldPound', {}).get('sell_chg', '-3.60%'),
                'source': 'مركز المعلومات ودعم اتخاذ القرار'
            },
            'goldOunceUSD': 4043.83
        }
    }

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(repo_root, 'market_rates.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(market_data, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully generated market_rates.json at {out_path}!")
    print(f"USD: Buy={market_data['currencies']['USD']['buy']}, Sell={market_data['currencies']['USD']['sell']} EGP")
    print(f"SAR: Buy={market_data['currencies']['SAR']['buy']}, Sell={market_data['currencies']['SAR']['sell']} EGP")
    print(f"Gold 21k: Buy={market_data['gold']['gold21']['buy']}, Sell={market_data['gold']['gold21']['sell']} EGP")
    print(f"Gold 24k: Buy={market_data['gold']['gold24']['buy']}, Sell={market_data['gold']['gold24']['sell']} EGP")
    print(f"Gold Pound: Buy={market_data['gold']['goldPound']['buy']}, Sell={market_data['gold']['goldPound']['sell']} EGP")

if __name__ == '__main__':
    main()
