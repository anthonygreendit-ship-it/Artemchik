#!/usr/bin/env python3
"""Extract chocolate production calculator data from Excel."""
import json
import os
import re
import sys

import pandas as pd

DEFAULT_PATH = os.path.expanduser("~/Downloads/выход конфеты заморозка-2.xlsx")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "chocolate.json")


def parse_num(val):
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(" ", "").replace(",", ".")
    m = re.search(r"[\d.]+", s)
    return float(m.group()) if m else None


def extract(path: str) -> dict:
    df = pd.read_excel(path, sheet_name="Sheet1", header=0)
    products = []
    for _, row in df.iterrows():
        name = row.iloc[0]
        if pd.isna(name) or not str(name).strip():
            continue

        raw_kg = parse_num(row.iloc[1])
        coat1 = parse_num(row.iloc[2]) if len(row) > 2 else None
        coat2 = parse_num(row.iloc[3]) if len(row) > 3 else None
        raw_price = parse_num(row.iloc[6]) if len(row) > 6 else None
        choc_price = parse_num(row.iloc[7]) if len(row) > 7 else None
        sell_price = parse_num(row.iloc[8]) if len(row) > 8 else None
        berry_pf_price = parse_num(row.iloc[9]) if len(row) > 9 else None
        choc_cost_1 = parse_num(row.iloc[10]) if len(row) > 10 else None
        choc_cost_2 = parse_num(row.iloc[11]) if len(row) > 11 else None
        material_per_kg = parse_num(row.iloc[12]) if len(row) > 12 else None
        waste_per_kg = parse_num(row.iloc[14]) if len(row) > 14 else None
        packaging_per_kg = parse_num(row.iloc[15]) if len(row) > 15 else None
        labor_per_kg = parse_num(row.iloc[16]) if len(row) > 16 else None
        rent_per_kg = parse_num(row.iloc[17]) if len(row) > 17 else None
        cost_per_kg = parse_num(row.iloc[18]) if len(row) > 18 else None
        cost_per_pack = parse_num(row.iloc[19]) if len(row) > 19 else None

        if cost_per_pack is None and material_per_kg is None and coat1 is None:
            continue

        pack_weight = None
        if cost_per_pack and cost_per_kg and cost_per_kg > 0:
            pack_weight = cost_per_pack / cost_per_kg

        products.append({
            "name": str(name).strip(),
            "rawKgPerPack": raw_kg,
            "coat1KgPerPack": coat1,
            "coat2KgPerPack": coat2,
            "rawPricePerKg": raw_price,
            "chocolatePricePerKg": choc_price,
            "sellPricePerPackRub": sell_price,
            "berryPfPricePerKg": berry_pf_price,
            "chocolateCost1Coat": choc_cost_1,
            "chocolateCost2Coat": choc_cost_2,
            "materialCostPerKgRub": material_per_kg,
            "wastePerKgRub": waste_per_kg,
            "packagingPerKgRub": packaging_per_kg,
            "laborPerKgRub": labor_per_kg,
            "rentPerKgRub": rent_per_kg,
            "costPerKgRub": cost_per_kg,
            "costPerPackRub": cost_per_pack,
            "packWeightKg": pack_weight,
        })

    purchases = []
    df2 = pd.read_excel(path, sheet_name="Лист 2", header=0)
    for _, row in df2.iterrows():
        label = row.iloc[0]
        if pd.isna(label):
            continue
        kg = parse_num(row.iloc[1]) if len(row) > 1 else None
        spent = parse_num(row.iloc[2]) if len(row) > 2 else None
        waste = parse_num(row.iloc[3]) if len(row) > 3 else None
        ready = parse_num(row.iloc[4]) if len(row) > 4 else None
        if kg is None and spent is None:
            continue
        purchases.append({
            "label": str(label).strip(),
            "kg": kg,
            "spentRub": spent,
            "wasteSalesRub": waste,
            "readyRawKg": ready,
        })

    default_product = next((p for p in products if "белый+молоч" in p["name"].lower()), products[0] if products else None)
    default_sell = default_product["sellPricePerPackRub"] if default_product else 333

    return {
        "sourceFile": os.path.basename(path),
        "products": products,
        "purchases": purchases,
        "defaults": {
            "packsPerShift": 1200,
            "shiftsPerDay": 2,
            "sellPricePerPack": default_sell,
            "shipPacksToday": 1800,
        },
    }


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    out = os.path.abspath(OUT_PATH)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    result = extract(src)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out} ({len(result['products'])} products)")
