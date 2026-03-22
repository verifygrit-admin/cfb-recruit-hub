"""
sync_schools.py — Seed the Supabase `schools` table from the GrittyOS DB Google Sheet.

Source: Google Sheet ID 1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo, tab 'GrittyOS DB'
Target: Supabase project https://oeekcafirfxgtdoocael.supabase.co, table `public.schools`
Owner: Patch (gas-engineer)

Compliance: PROTO-GLOBAL-010 — source artifact named above. Verified against
migration 20260319000001_create_schools.sql and live Sheet headers 2026-03-22.

Usage:
    python scripts/sync_schools.py                   # full upsert
    python scripts/sync_schools.py --dry-run         # preview first 5 rows, no insert
    python scripts/sync_schools.py --limit 10        # upsert first 10 rows only
    python scripts/sync_schools.py --dry-run --limit 5

Requirements (install once):
    pip install gspread requests python-dotenv

Connection:
    Reads GOOGLE_SERVICE_ACCOUNT_PATH and SUPABASE_SERVICE_ROLE_KEY from .env.local
    Supabase REST API: https://oeekcafirfxgtdoocael.supabase.co/rest/v1/schools
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

# ── Dependency checks ────────────────────────────────────────────────────────
try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:
    sys.exit("ERROR: gspread not installed. Run: pip install gspread")

try:
    import requests
except ImportError:
    sys.exit("ERROR: requests not installed. Run: pip install requests")

try:
    from dotenv import load_dotenv
except ImportError:
    sys.exit("ERROR: python-dotenv not installed. Run: pip install python-dotenv")

# ── Configuration ─────────────────────────────────────────────────────────────
SHEET_ID     = "1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo"
TAB_NAME     = "GrittyOS DB"
SUPABASE_URL = "https://oeekcafirfxgtdoocael.supabase.co"

# ── Sheet column → Supabase column mapping ───────────────────────────────────
# Key   = exact Sheet header string (case-sensitive, as read live 2026-03-22)
# Value = Supabase column name in public.schools
#
# Source artifact: Sheet ID 1Pc4LOnD1fhQz-9pI_CUEDaAMDfTkUXcCRTVDfoDWvqo
# Schema source:   supabase/migrations/20260319000001_create_schools.sql
#
# Columns intentionally NOT mapped (present in Sheet, not in schools table):
#   unitid2, COA (In-State), Err Margin COA, % Meeting Fin Need,
#   Est_Avg_Merit_Aid_All, Est_Avg_NeedGrants_0-100K,
#   Total_Mens_Recruiting_Budget, Football_Roster_Size,
#   Original_Roster_Size, Adjusted_Roster_Size,
#   Est_Football_Budget_Share_Pct, Est_Football_Budget,
#   Est_Football_Budget_High, Est_Football_Budget_Low,
#   Est_Spend_Per_Player, Est_Ath_Aid, Est_Max_Merit,
#   UG_Enrollment, Net Calculator, Adm Info List Link,
#   Distance_Miles, Academic_Match_Score, Matches_Criteria

SHEET_TO_SUPABASE = {
    "UNITID":                         "unitid",
    "School Name":                    "school_name",
    "State":                          "state",
    "City/Location":                  "city",
    "Control":                        "control",
    "School Type":                    "school_type",
    "Type":                           "type",
    "NCAA Division":                  "ncaa_division",
    "Conference":                     "conference",
    "LATITUDE":                       "latitude",
    "LONGITUDE":                      "longitude",
    "COA (Out-of-State)":             "coa_out_of_state",
    "Est_Avg_Merit":                  "est_avg_merit",
    "Avg Merit Award":                "avg_merit_award",
    "Share_Stu_Any_Aid":              "share_stu_any_aid",
    "Share_Stu_Need_Aid":             "share_stu_need_aid",
    "Need-Blind School":              "need_blind_school",
    "DLTV":                           "dltv",
    "Acad_Rigor_Senior":              "acad_rigor_senior",
    "Acad_Rigor_Junior":              "acad_rigor_junior",
    "Acad_Rigor_Soph":                "acad_rigor_soph",
    "Acad_Rigor_Freshman":            "acad_rigor_freshman",
    "Acad_Rigor_Test_Opt_Senior":     "acad_rigor_test_opt_senior",
    "Acad_Rigor_Test_Opt_Junior":     "acad_rigor_test_opt_junior",
    "Acad_Rigor_Test_Opt_Soph":       "acad_rigor_test_opt_soph",
    "Acad_Rigor_Test_Opt_Freshman":   "acad_rigor_test_opt_freshman",
    "Is_Test_Optional":               "is_test_optional",
    "Graduation Rate":                "graduation_rate",
    "Recruiting Q Link":              "recruiting_q_link",
    "Coach Page":                     "coach_link",
    "Prospect Camp Link":             "prospect_camp_link",
    "Field Level Questionnaire":      "field_level_questionnaire",
    "Avg GPA":                        "avg_gpa",
    "Avg SAT":                        "avg_sat",
    "ADLTV":                          "adltv",
    "ADLTV Rank":                     "adltv_rank",
    "Admissions Rate":                "admissions_rate",
}

# Supabase boolean columns — Sheet values are text ("TRUE"/"FALSE"/empty)
BOOLEAN_COLS = {"need_blind_school", "is_test_optional"}

# Supabase integer columns
INTEGER_COLS = {"unitid", "adltv_rank"}

# Supabase numeric (float) columns — everything else numeric
NUMERIC_COLS = {
    "latitude", "longitude", "coa_out_of_state", "est_avg_merit",
    "avg_merit_award", "share_stu_any_aid", "share_stu_need_aid",
    "dltv", "acad_rigor_senior", "acad_rigor_junior", "acad_rigor_soph",
    "acad_rigor_freshman", "acad_rigor_test_opt_senior",
    "acad_rigor_test_opt_junior", "acad_rigor_test_opt_soph",
    "acad_rigor_test_opt_freshman", "graduation_rate", "avg_gpa",
    "avg_sat", "adltv", "admissions_rate",
}


# ── Value coercion ─────────────────────────────────────────────────────────────
def coerce(value: str, col: str):
    """Convert a Sheet string value to the correct Python type for Supabase."""
    # Treat empty / whitespace-only as NULL
    v = value.strip() if isinstance(value, str) else value
    if v == "" or v is None:
        return None

    if col in BOOLEAN_COLS:
        return v.upper() in ("TRUE", "YES", "1")

    if col in INTEGER_COLS:
        try:
            return int(float(v.replace(",", "")))
        except (ValueError, AttributeError):
            return None

    if col in NUMERIC_COLS:
        try:
            return float(v.replace("$", "").replace(",", "").replace("%", ""))
        except (ValueError, AttributeError):
            return None

    return v  # text columns: return as-is


# ── Sheet reader ───────────────────────────────────────────────────────────────
def read_sheet(sa_path: str) -> tuple[list[str], list[dict]]:
    """Authenticate with gspread and return (headers, list_of_row_dicts)."""
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    creds  = Credentials.from_service_account_file(sa_path, scopes=scopes)
    client = gspread.authorize(creds)

    print(f"[gspread] Opening Sheet: {SHEET_ID} / tab: '{TAB_NAME}'")
    sheet     = client.open_by_key(SHEET_ID).worksheet(TAB_NAME)
    all_values = sheet.get_all_values()

    if not all_values:
        sys.exit("ERROR: Sheet returned no data.")

    headers = all_values[0]
    rows    = all_values[1:]

    print(f"[gspread] Read {len(rows)} data rows, {len(headers)} columns.")
    return headers, rows


# ── Row transformer ────────────────────────────────────────────────────────────
def transform_row(headers: list[str], raw_row: list[str]) -> dict | None:
    """
    Map a Sheet row (list of strings) to a Supabase schools dict.
    Returns None if unitid is missing or non-numeric (skip row).
    """
    # Pad short rows
    row = raw_row + [""] * (len(headers) - len(raw_row))

    record = {}
    for sheet_col, supa_col in SHEET_TO_SUPABASE.items():
        try:
            idx = headers.index(sheet_col)
        except ValueError:
            # Column not found in Sheet — warn once (handled in main)
            record[supa_col] = None
            continue
        record[supa_col] = coerce(row[idx], supa_col)

    # unitid is the PK — skip rows where it didn't parse to an integer
    if record.get("unitid") is None:
        return None

    # last_updated: let the DB default handle it, but set it explicitly on upsert
    record["last_updated"] = datetime.now(timezone.utc).isoformat()

    return record


# ── Supabase upsert ────────────────────────────────────────────────────────────
def upsert_batch(service_role_key: str, records: list[dict], dry_run: bool) -> tuple[int, int]:
    """
    Upsert a list of school record dicts into public.schools via PostgREST.
    Returns (inserted_count, skipped_count).
    Conflict resolution: merge-duplicates on PK (unitid).
    """
    if not records:
        return 0, 0

    if dry_run:
        print(f"\n[DRY RUN] Would upsert {len(records)} row(s). Sample (first row):")
        sample = records[0]
        for k, v in sample.items():
            print(f"  {k}: {v!r}")
        return 0, len(records)

    url = f"{SUPABASE_URL}/rest/v1/schools"
    headers = {
        "apikey":        service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type":  "application/json",
        "Prefer":        "resolution=merge-duplicates",
    }

    try:
        resp = requests.post(url, headers=headers, json=records, timeout=60)
    except requests.RequestException as exc:
        print(f"  [ERROR] HTTP request failed: {exc}")
        return 0, len(records)

    if resp.status_code in (200, 201, 204):
        return len(records), 0

    # PostgREST returns 409 or 4xx/5xx on errors
    print(f"  [WARN] PostgREST returned {resp.status_code}: {resp.text[:200]}")
    return 0, len(records)


# ── Missing header check ───────────────────────────────────────────────────────
def check_headers(headers: list[str]) -> None:
    """Warn about any mapped Sheet column not found in the live Sheet."""
    missing = [sh for sh in SHEET_TO_SUPABASE if sh not in headers]
    if missing:
        print(f"\n[WARN] {len(missing)} mapped Sheet column(s) not found in live header row:")
        for m in missing:
            print(f"  '{m}' → '{SHEET_TO_SUPABASE[m]}' will be NULL")
    else:
        print("[OK] All mapped Sheet columns present in live header row.")


# ── Entry point ────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Sync GrittyOS DB Sheet → Supabase schools table."
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Preview rows without inserting. Shows first row of output."
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Process only the first N data rows (for testing)."
    )
    args = parser.parse_args()

    # ── Load env ──────────────────────────────────────────────────────────────
    # .env.local takes precedence if it exists; fall back to .env
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env.local")
    if not os.path.exists(env_path):
        env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    load_dotenv(env_path)

    sa_path          = os.getenv("GOOGLE_SERVICE_ACCOUNT_PATH", "service-account.json")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    # Resolve service account path relative to repo root
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if not os.path.isabs(sa_path):
        sa_path = os.path.join(repo_root, sa_path)

    if not os.path.exists(sa_path):
        sys.exit(f"ERROR: Service account file not found: {sa_path}")
    if not service_role_key:
        sys.exit("ERROR: SUPABASE_SERVICE_ROLE_KEY not set in .env.local")

    print("=" * 60)
    print("sync_schools.py -- GrittyOS DB -> Supabase schools")
    print(f"Mode:  {'DRY RUN' if args.dry_run else 'LIVE UPSERT'}")
    print(f"Limit: {args.limit if args.limit else 'none (full sync)'}")
    print("=" * 60)

    # ── Read Sheet ─────────────────────────────────────────────────────────────
    headers, rows = read_sheet(sa_path)
    check_headers(headers)

    if args.limit:
        rows = rows[: args.limit]
        print(f"[INFO] Limiting to first {len(rows)} row(s).")

    # ── Transform rows ─────────────────────────────────────────────────────────
    records   = []
    skipped_transform = 0
    for i, raw in enumerate(rows, start=2):  # row 2 is first data row (1-indexed)
        rec = transform_row(headers, raw)
        if rec is None:
            skipped_transform += 1
            print(f"  [SKIP] Row {i}: missing or non-numeric unitid — skipped.")
            continue
        records.append(rec)

    print(f"\n[transform] {len(records)} rows ready, {skipped_transform} skipped (no unitid).")

    if not records:
        print("[INFO] No records to upsert. Exiting.")
        return

    # ── Upsert ─────────────────────────────────────────────────────────────────
    if args.dry_run:
        inserted, preview_count = upsert_batch(service_role_key, records, dry_run=True)
        print(f"\n[DRY RUN] {preview_count} row(s) would be upserted.")
        return

    print(f"\n[API] Target: {SUPABASE_URL}/rest/v1/schools")

    # Upsert in batches of 100 to keep progress visible
    BATCH_SIZE = 100
    total_inserted = 0
    total_skipped  = 0

    for batch_start in range(0, len(records), BATCH_SIZE):
        batch = records[batch_start : batch_start + BATCH_SIZE]
        batch_end = min(batch_start + BATCH_SIZE, len(records))
        print(f"[upsert] Rows {batch_start + 1}–{batch_end} / {len(records)} ...", end=" ")
        ins, skip = upsert_batch(service_role_key, batch, dry_run=False)
        total_inserted += ins
        total_skipped  += skip
        print(f"ok ({ins} upserted, {skip} errored)")

    print("\n" + "=" * 60)
    print(f"DONE — {total_inserted} rows upserted, {total_skipped} rows errored.")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
    print("=" * 60)
    print("\nNext step: David verifies 661 rows, UNITID uniqueness, spot-check.")


if __name__ == "__main__":
    main()
