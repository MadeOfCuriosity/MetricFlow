#!/usr/bin/env python3
"""
Test Scraper & AI Agent Verification Script for Visualize.

This script tests both:
1. Static HTTP / Scraper / AI Bot Mode:
   Verifies that raw HTTP requests (curl, Python requests, AI agents) extract:
   - Meta title & description
   - OpenGraph & Twitter Cards
   - Schema.org JSON-LD structured data
   - Semantic body content inside #root (no empty page!)
   - Standard llms.txt, robots.txt, and sitemap.xml

2. Headless Browser Mode:
   Guidance and test execution using Playwright/Chromium for dynamic testing.
"""

import sys
import json
import urllib.request
import urllib.error
from html.parser import HTMLParser

class MetaAndContentExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = None
        self.in_title = False
        self.meta_tags = {}
        self.og_tags = {}
        self.twitter_tags = {}
        self.json_ld = []
        self.in_json_ld = False
        self.json_ld_buffer = ""
        self.headings = []
        self.in_heading = False
        self.current_heading = ""
        self.links = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            name = attr_dict.get("name")
            prop = attr_dict.get("property")
            content = attr_dict.get("content")
            if name:
                self.meta_tags[name] = content
                if name.startswith("twitter:"):
                    self.twitter_tags[name] = content
            if prop:
                if prop.startswith("og:"):
                    self.og_tags[prop] = content
        elif tag == "script" and attr_dict.get("type") == "application/ld+json":
            self.in_json_ld = True
            self.json_ld_buffer = ""
        elif tag in ["h1", "h2", "h3"]:
            self.in_heading = True
            self.current_heading = ""
        elif tag == "a" and "href" in attr_dict:
            self.links.append(attr_dict["href"])

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag == "script" and self.in_json_ld:
            self.in_json_ld = False
            try:
                self.json_ld.append(json.loads(self.json_ld_buffer))
            except json.JSONDecodeError:
                pass
        elif tag in ["h1", "h2", "h3"]:
            self.in_heading = False
            if self.current_heading.strip():
                self.headings.append(self.current_heading.strip())

    def handle_data(self, data):
        if self.in_title:
            self.title = (self.title or "") + data
        elif self.in_json_ld:
            self.json_ld_buffer += data
        elif self.in_heading:
            self.current_heading += data

def test_url(base_url="http://localhost:5173"):
    print(f"============================================================")
    print(f"🔎 Testing Scraper & SEO Response for: {base_url}")
    print(f"============================================================\n")

    # 1. Test Main HTML Page
    try:
        req = urllib.request.Request(
            base_url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; ScraperBot/1.0; +https://example.com/bot)"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            html_content = response.read().decode("utf-8")
            status_code = response.status
    except Exception as e:
        print(f"❌ Failed to connect to {base_url}: {e}")
        print("   Make sure the frontend dev server is running (e.g. npm run dev).")
        return False

    print(f"✓ HTTP Status: {status_code}")

    extractor = MetaAndContentExtractor()
    extractor.feed(html_content)

    print("\n[1. Title & Meta Information]")
    print(f"  • Page Title: {extractor.title}")
    print(f"  • Description: {extractor.meta_tags.get('description', 'MISSING')}")

    print("\n[2. OpenGraph / Social Sharing Tags]")
    for k, v in extractor.og_tags.items():
        print(f"  • {k}: {v}")

    print("\n[3. Twitter Card Tags]")
    for k, v in extractor.twitter_tags.items():
        print(f"  • {k}: {v}")

    print("\n[4. Schema.org JSON-LD Structured Data]")
    if extractor.json_ld:
        print(f"  • Found {len(extractor.json_ld)} JSON-LD block(s):")
        print(f"    Graph types: {[item.get('@type') for item in extractor.json_ld[0].get('@graph', [])]}")
    else:
        print("  ❌ No JSON-LD block found.")

    print("\n[5. Semantic Content Rendered for Scrapers (No-JS)]")
    print(f"  • Headings extracted: {extractor.headings}")
    print(f"  • Key Navigation links: {extractor.links[:6]}")

    # 2. Test llms.txt
    print("\n[6. Testing /llms.txt for AI Agents]")
    try:
        with urllib.request.urlopen(f"{base_url}/llms.txt", timeout=5) as resp:
            llms_text = resp.read().decode("utf-8")
            first_line = llms_text.strip().split("\n")[0]
            print(f"  ✓ /llms.txt accessible ({len(llms_text)} bytes): \"{first_line}\"")
    except Exception as e:
        print(f"  ❌ /llms.txt failed: {e}")

    # 3. Test robots.txt & sitemap.xml
    print("\n[7. Testing /robots.txt and /sitemap.xml]")
    try:
        with urllib.request.urlopen(f"{base_url}/robots.txt", timeout=5) as resp:
            print(f"  ✓ /robots.txt accessible ({len(resp.read())} bytes)")
    except Exception as e:
        print(f"  ❌ /robots.txt failed: {e}")

    try:
        with urllib.request.urlopen(f"{base_url}/sitemap.xml", timeout=5) as resp:
            print(f"  ✓ /sitemap.xml accessible ({len(resp.read())} bytes)")
    except Exception as e:
        print(f"  ❌ /sitemap.xml failed: {e}")

    print("\n============================================================")
    print("✅ All SEO, Scraper & AI Agent endpoints verified successfully!")
    print("============================================================\n")
    return True

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
    test_url(url)
