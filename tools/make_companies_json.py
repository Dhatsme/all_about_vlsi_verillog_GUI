"""
Build static/data/companies.json (used by static/jobs.html) from a company CSV.

Usage:
    python tools/make_companies_json.py static/data/companies.csv

The CSV just needs a header row. Column names are matched loosely
(see COLUMNS below) — add a name there if your CSV uses a different one.
"""
import csv
import json
import sys
from pathlib import Path

# output field  ->  CSV column names to try, in order
COLUMNS = {
    "name":     ["company name", "company", "name", "company_name"],
    "country":  ["country", "hq_country"],
    "city":     ["city", "location", "canada_site", "hq_city"],
    "category": ["category", "type", "segment"],
    "careers":  ["job website", "careers_url", "career_url", "careers_page", "careers",
                 "url", "website", "official website"],   # falls back to main site
}

OUT = Path(__file__).parent.parent / "static" / "data" / "companies.json"


def pick(row, names):
    """Return the first non-empty value among the given column names."""
    for n in names:
        value = (row.get(n) or "").strip()
        if value:
            return value
    return ""


def main(csv_path):
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        # make header lookup case-insensitive
        reader.fieldnames = [h.strip().lower() for h in reader.fieldnames]
        print("CSV columns:", reader.fieldnames)

        companies, seen = [], set()
        for row in reader:
            c = {field: pick(row, names) for field, names in COLUMNS.items()}
            key = (c["name"].lower(), c["city"].lower(), c["country"].lower())
            if not c["name"] or key in seen:
                continue                      # skip blanks and duplicate offices
            if c["careers"] and not c["careers"].startswith("http"):
                c["careers"] = "https://" + c["careers"]
            seen.add(key)               # same company in another city is kept
            companies.append(c)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(companies, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(companies)} companies to {OUT}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
