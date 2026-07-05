#!/usr/bin/env python3
"""Sync dashboard JSON from Google Sheets published CSV URLs."""
import json
import os
import sys
import urllib.request

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "sheets.config.json")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "dashboard.json")


def fetch_csv(url: str) -> str:
    with urllib.request.urlopen(url, timeout=30) as resp:
        return resp.read().decode("utf-8-sig")


def main():
    if not os.path.exists(CONFIG_PATH):
        print(f"Create {CONFIG_PATH} from sheets.config.example.json")
        sys.exit(1)
    with open(CONFIG_PATH, encoding="utf-8") as f:
        config = json.load(f)
    urls = config.get("urls", {})
    print("Sync Google Sheets...")
    for name, url in urls.items():
        if not url:
            continue
        text = fetch_csv(url)
        out = os.path.join(os.path.dirname(OUT_PATH), "sheets", f"{name}.csv")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  {name}: {len(text.splitlines())} lines")
    print("Done. Run npm run extract or wire parser for full merge.")


if __name__ == "__main__":
    main()
