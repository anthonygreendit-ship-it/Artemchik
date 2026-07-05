#!/usr/bin/env python3
"""Extract dashboard data from Управленка Excel file."""
import json
import os
import sys
from datetime import datetime

try:
    import pandas as pd
except ImportError:
    print("Install: pip install pandas openpyxl")
    sys.exit(1)

DEFAULT_PATH = os.path.expanduser("~/Downloads/Управленка на 29.05.2026.xlsx")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "data", "dashboard.json")


def parse_num(val):
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace(" ", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def fmt_date(val):
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val.strftime("%Y-%m-%d")
    return str(val)


def extract(path: str) -> dict:
    data = {}

    df = pd.read_excel(path, sheet_name="Опер срез 2026", header=None)
    month_cols = []
    for c in range(df.shape[1]):
        h = str(df.iloc[0, c]).lower().strip() if not pd.isna(df.iloc[0, c]) else ""
        if h in ("январь", "февраль", "март", "апрель", "май"):
            month_cols.append((c, h))

    metrics_map = {}
    for i in range(df.shape[0]):
        label = str(df.iloc[i, 0]).strip() if not pd.isna(df.iloc[i, 0]) else ""
        if not label or label == "nan":
            continue
        row_data = {}
        for col, mname in month_cols:
            v = parse_num(df.iloc[i, col])
            if v is not None:
                row_data[mname] = v
        if row_data:
            metrics_map[label] = row_data
    data["operSlice2026"] = metrics_map

    df = pd.read_excel(path, sheet_name="Опер баланс 2026г", header=None)
    dates = ["2025-01-01", "2026-01-01", "2026-05-29"]
    balance = {"active": [], "passive": []}
    for i in range(2, df.shape[0]):
        name_a = df.iloc[i, 0]
        if pd.isna(name_a):
            continue
        name_a = str(name_a).strip()
        vals_a = [parse_num(df.iloc[i, c]) for c in [1, 2, 3]]
        name_p = df.iloc[i, 5] if df.shape[1] > 5 else None
        vals_p = [parse_num(df.iloc[i, c]) for c in [6, 7, 8]] if df.shape[1] > 8 else [None, None, None]
        if name_a and name_a != "nan":
            balance["active"].append({"name": name_a, "values": dict(zip(dates, vals_a))})
        if name_p and not pd.isna(name_p) and str(name_p).strip() != "nan":
            balance["passive"].append({"name": str(name_p).strip(), "values": dict(zip(dates, vals_p))})

    data["operBalance2026"] = balance
    data["operBalance2026"]["totalActive"] = {
        "2025-01-01": parse_num(df.iloc[1, 1]),
        "2026-01-01": parse_num(df.iloc[1, 2]),
        "2026-05-29": parse_num(df.iloc[1, 3]),
    }
    data["operBalance2026"]["totalPassive"] = {
        "2025-01-01": parse_num(df.iloc[1, 6]),
        "2026-01-01": parse_num(df.iloc[1, 7]),
        "2026-05-29": parse_num(df.iloc[1, 8]),
    }

    df = pd.read_excel(path, sheet_name="дебит покуп", header=None)
    receivables = []
    for i in range(2, df.shape[0]):
        col0 = df.iloc[i, 1]
        if pd.isna(col0):
            continue
        s = str(col0).strip()
        total = parse_num(df.iloc[i, 2])
        if total and total > 1000 and not s.startswith("202") and "Заказ" not in s and "Договор" not in s:
            receivables.append({
                "client": s,
                "total": total,
                "mar": parse_num(df.iloc[i, 5]),
                "apr": parse_num(df.iloc[i, 6]),
                "may": parse_num(df.iloc[i, 7]),
                "jun": parse_num(df.iloc[i, 8]),
            })
    data["receivables"] = sorted(receivables, key=lambda x: x["total"], reverse=True)[:30]

    df = pd.read_excel(path, sheet_name="рент план", header=None)
    deals = []
    current_client = None
    for i in range(6, df.shape[0]):
        col3 = df.iloc[i, 3]
        if pd.isna(col3):
            continue
        s = str(col3).strip()
        qty = parse_num(df.iloc[i, 4])
        price = parse_num(df.iloc[i, 5])
        amount = parse_num(df.iloc[i, 6])
        cost = parse_num(df.iloc[i, 9])
        ul = str(df.iloc[i, 1]).strip() if not pd.isna(df.iloc[i, 1]) else None
        if ul == "nan":
            ul = None

        if "ООО" in s or "ЗАО" in s or "ИП" in s:
            current_client = s
            if qty and amount:
                profit = amount - cost if cost else None
                margin = (profit / amount * 100) if profit and amount else None
                deals.append({
                    "client": current_client, "product": None, "qty": qty, "price": price,
                    "amount": amount, "cost": cost, "profit": profit, "margin": margin, "business": ul,
                })
        elif s.startswith("Заказ покупателя"):
            order = s
            if i + 1 < df.shape[0]:
                product = str(df.iloc[i + 1, 3]).strip() if not pd.isna(df.iloc[i + 1, 3]) else ""
                qty2 = parse_num(df.iloc[i, 4]) or parse_num(df.iloc[i + 1, 4])
                amount2 = parse_num(df.iloc[i, 6]) or parse_num(df.iloc[i + 1, 6])
                cost2 = parse_num(df.iloc[i, 9]) or parse_num(df.iloc[i + 1, 9])
                price2 = parse_num(df.iloc[i, 5]) or parse_num(df.iloc[i + 1, 5])
                if amount2:
                    profit = amount2 - cost2 if cost2 else None
                    margin = (profit / amount2 * 100) if profit and amount2 else None
                    deals.append({
                        "client": current_client, "order": order, "product": product,
                        "qty": qty2, "price": price2, "amount": amount2, "cost": cost2,
                        "profit": profit, "margin": margin, "business": ul,
                    })
    data["deals"] = deals[:50]

    df = pd.read_excel(path, sheet_name="рент в пути", header=None)
    in_transit = []
    section = None
    for i in range(5, min(35, df.shape[0])):
        name = df.iloc[i, 1]
        if pd.isna(name):
            continue
        s = str(name).strip()
        if "В ПУТИ" in s:
            section = "in_transit"
            continue
        if "СКЛАД" in s:
            section = "warehouse"
            continue
        qty = parse_num(df.iloc[i, 2])
        price = parse_num(df.iloc[i, 5])
        amount = parse_num(df.iloc[i, 6])
        cost = parse_num(df.iloc[i, 9])
        if qty and s != "nan":
            in_transit.append({
                "section": section, "product": s, "qty": qty,
                "price": price, "amount": amount, "cost": cost,
            })
    data["inTransit"] = in_transit

    df = pd.read_excel(path, sheet_name="остатки", header=None)
    inventory = []
    for i in range(2, min(40, df.shape[0])):
        name = df.iloc[i, 1]
        if pd.isna(name):
            continue
        s = str(name).strip()
        qty = parse_num(df.iloc[i, 2])
        cost_per = parse_num(df.iloc[i, 3])
        cost_total = parse_num(df.iloc[i, 4])
        market_price = parse_num(df.iloc[i, 6])
        market_total = parse_num(df.iloc[i, 7])
        markup = parse_num(df.iloc[i, 8])
        if qty and s != "nan" and cost_total:
            inventory.append({
                "product": s, "qty": qty, "costPerKg": cost_per, "costTotal": cost_total,
                "marketPrice": market_price, "marketTotal": market_total, "markupPerKg": markup,
            })
    data["inventory"] = inventory

    df = pd.read_excel(path, sheet_name="расх собств", header=None)
    expenses = []
    monthly_totals = {}
    for i in range(1, df.shape[0]):
        date = df.iloc[i, 0]
        desc = df.iloc[i, 1]
        amount = parse_num(df.iloc[i, 2])
        if pd.isna(desc):
            continue
        s = str(desc).strip()
        if "Итого за" in s:
            month = s.replace("Итого за", "").strip()
            monthly_totals[month] = amount
            continue
        if amount and not pd.isna(date):
            expenses.append({"date": fmt_date(date), "description": s, "amount": amount})
    data["ownerExpenses"] = expenses[:40]
    data["ownerExpenseTotals"] = monthly_totals

    df = pd.read_excel(path, sheet_name="план дс", header=None)
    cash_plan = []
    for i in range(1, min(40, df.shape[0])):
        client = df.iloc[i, 0]
        if pd.isna(client):
            continue
        debt_type = str(df.iloc[i, 1]).strip() if not pd.isna(df.iloc[i, 1]) else ""
        plan_date = fmt_date(df.iloc[i, 2])
        ml = parse_num(df.iloc[i, 3])
        fb = parse_num(df.iloc[i, 4])
        cumulative = parse_num(df.iloc[i, 5])
        amount = ml or fb or 0
        if amount:
            cash_plan.append({
                "client": str(client).strip(), "type": debt_type, "date": plan_date,
                "amount": amount, "business": "МЛ" if ml else "ФБ", "cumulative": cumulative,
            })
    data["cashPlan"] = cash_plan

    slice_data = data["operSlice2026"]
    may_rev = slice_data.get("Выручка (отгрузка) ИТОГО", {}).get("май", 0)
    may_cost = 0
    for k, v in slice_data.items():
        if "ИТОГО" in k and "себестоимость" in k.lower():
            may_cost = v.get("май", may_cost)
    may_markup = slice_data.get("Оперативная наценка", {}).get("май", 0)
    apr_rev = slice_data.get("Выручка (отгрузка) ИТОГО", {}).get("апрель", 0)

    data["kpi"] = {
        "reportDate": "2026-05-29",
        "revenue": may_rev,
        "revenueChange": ((may_rev - apr_rev) / apr_rev * 100) if apr_rev else 0,
        "totalSales": slice_data.get("Отгружено товара, кг", {}).get("май", 0),
        "totalOrders": len(receivables),
        "profit": may_markup,
        "profitChange": 0,
        "totalReceivables": sum(r["total"] for r in receivables),
        "totalActive": data["operBalance2026"]["totalActive"]["2026-05-29"],
        "totalPassive": data["operBalance2026"]["totalPassive"]["2026-05-29"],
    }

    businesses = {}
    for biz_key, biz_label in [("ИМП", "Импорт"), ("ПОЛ", "Полный"), ("ВНУТР", "Внутренний")]:
        rev_key = f"Выручка (отгрузка) {biz_key}"
        businesses[biz_label] = {
            "revenue": slice_data.get(rev_key, {}),
            "markupPerKg": slice_data.get(f"Наценка на кг {biz_key}", {}),
            "shippedKg": {},
        }
        for k, v in slice_data.items():
            if biz_key in k and "Отгружено" in k:
                businesses[biz_label]["shippedKg"] = v
    data["businesses"] = businesses

    return data


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PATH
    out = os.path.abspath(OUT_PATH)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    result = extract(src)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"Extracted → {out}")
    print(f"KPI revenue: {result['kpi']['revenue']:,.0f} ₽")
