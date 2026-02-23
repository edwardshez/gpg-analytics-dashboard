"""GPG Analytics Dashboard - Synthetic Data Generator
Generates realistic government financial data for prototype demonstration.
"""
import sqlite3, os, random, math
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path

random.seed(42)
np.random.seed(42)

START_DATE = datetime(2024, 1, 1)
END_DATE = datetime(2025, 12, 31)
TOTAL_DAYS = (END_DATE - START_DATE).days
DB_DIR = Path(__file__).resolve().parent.parent / "database"
DB_PATH = DB_DIR / "gpg_analytics.db"

# ─── Precomputed date lookup (perf optimisation) ────────────────────────────
DATE_LOOKUP = {}
for _d in range(TOTAL_DAYS + 1):
    _dt = START_DATE + timedelta(days=_d)
    _fy = _dt.year if _dt.month >= 4 else _dt.year - 1
    DATE_LOOKUP[_d] = (_dt.strftime('%Y-%m-%d'), f"{_fy}/{_fy+1}", (((_dt.month-4)%12)+1), _dt.month, _dt.year, _dt)

# ─── Reference Data ─────────────────────────────────────────────────────────
DEPARTMENTS = [
    (1,  "Gauteng Health",                       "GPG-HLT", 55_000_000_000, 85000),
    (2,  "Gauteng Education",                    "GPG-EDU", 48_000_000_000, 72000),
    (3,  "Gauteng Roads and Transport",          "GPG-TRN", 12_000_000_000, 8500),
    (4,  "Gauteng Human Settlements",            "GPG-HUM", 10_000_000_000, 4200),
    (5,  "Gauteng Social Development",           "GPG-SOC",  6_000_000_000, 5800),
    (6,  "Gauteng Community Safety",             "GPG-SAF",  5_500_000_000, 6200),
    (7,  "Gauteng e-Government",                 "GPG-EGV",  4_800_000_000, 3100),
    (8,  "Gauteng Agriculture and Rural Dev",    "GPG-AGR",  3_200_000_000, 2800),
    (9,  "Gauteng Sport, Arts, Culture and Rec", "GPG-SAC",  2_800_000_000, 2400),
    (10, "Gauteng Infrastructure Development",   "GPG-INF",  8_500_000_000, 3600),
    (11, "Gauteng Economic Development",         "GPG-ECO",  4_200_000_000, 2100),
    (12, "Gauteng COGTA",                        "GPG-COG",  3_000_000_000, 1800),
    (13, "Office of the Premier",                "GPG-OTP",  1_500_000_000, 1200),
    (14, "Gauteng Provincial Legislature",       "GPG-LEG",    900_000_000,  800),
    (15, "Gauteng Provincial Treasury",          "GPG-TRE",  2_100_000_000, 1500),
]
HIGH_MAVERICK_DEPTS = {4, 6, 8, 9, 12}
HIGH_FREQ_COUNT = 8

SCOA_CODES = [
    ("4201","Travel and subsistence"),("4202","Communication"),
    ("4203","Computer services"),("4204","Consultants and professional services"),
    ("4205","Maintenance and repairs"),("4206","Operating leases"),
    ("4207","Advertising"),("4208","Training and development"),
    ("4209","Stationery and office supplies"),("4210","Medical supplies"),
    ("4211","Laboratory supplies"),("4212","Fuel, oil and gas"),
    ("4213","Fleet services"),("4214","Catering and refreshments"),
    ("4215","Uniforms and protective clothing"),
]
UNSPSC_CODES = [
    ("43000000","IT equipment"),("44000000","Office supplies"),
    ("46000000","Security equipment"),("47000000","Cleaning supplies"),
    ("50000000","Food and beverage"),("51000000","Pharmaceuticals"),
    ("72000000","Facility maintenance"),("76000000","Industrial cleaning"),
    ("78000000","Transportation and storage"),("80000000","Business services"),
    ("81000000","Engineering services"),("85000000","Healthcare services"),
    ("86000000","Education and training"),("93000000","Civic affairs services"),
]
SUPPLIER_FIRST = [
    "Tshepo","Mohlala","Vhembe","Kgotso","Lerato","Ndaba","Sipho","Zanele",
    "Mpho","Buhle","Nkosi","Rethabile","Kagiso","Tshwane","Molefe","Mahlangu",
    "Dlamini","Radebe","Maseko","Botha","Joubert","Naidoo","Pillay","Pretorius",
    "Mabaso","Ngwenya","Zulu","Khumalo","Mogale","Sedibe","Motaung","Tau",
    "Phiri","Mashaba","Langa","Khoza","Kubheka","Mathebula","Shongwe","Ntuli",
    "Gumede","Cele","Sithole","Mthembu","Buthelezi","Shabalala","Mkhize",
    "Ngcobo","Majola","Mhlongo","Baloyi","Maluleke","Chauke","Makhubela",
    "Hlongwane","Zwane","Madonsela","Mabuza","Theron","Van Wyk","Coetzee",
    "Oberholzer","Potgieter","Swanepoel",
]
SUPPLIER_SUFFIX = [
    "Holdings","Consulting","IT Solutions","Trading","Enterprise","Projects",
    "Services","Construction","Engineering","Solutions","Logistics","Properties",
    "Investments","Group","Technologies","Supplies","Management","Advisory",
    "Development","Contractors","Security","Cleaning","Catering","Transport",
    "Medical Supplies",
]
JOB_TITLES = [
    ("Director",13,95000),("Deputy Director",12,78000),("Assistant Director",11,62000),
    ("Chief Admin Officer",10,52000),("Senior Admin Officer",9,45000),
    ("Admin Officer",8,38000),("Senior Clerk",7,32000),("Clerk",6,26000),
    ("Data Capturer",5,22000),("General Worker",4,18000),
]
PROVINCES = ["Gauteng","Limpopo","Mpumalanga","North West","KwaZulu-Natal",
             "Free State","Eastern Cape","Western Cape","Northern Cape"]

# ─── Schema ──────────────────────────────────────────────────────────────────
def create_tables(conn):
    conn.executescript('''
        DROP TABLE IF EXISTS departments; DROP TABLE IF EXISTS suppliers;
        DROP TABLE IF EXISTS contracts; DROP TABLE IF EXISTS transactions;
        DROP TABLE IF EXISTS purchase_orders; DROP TABLE IF EXISTS personnel_costs;

        CREATE TABLE departments (
            id INTEGER PRIMARY KEY, name TEXT NOT NULL, code TEXT NOT NULL,
            annual_budget REAL, headcount INTEGER);

        CREATE TABLE suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_name TEXT NOT NULL,
            registration_number TEXT, tax_number TEXT, bbbee_level INTEGER,
            bbbee_expiry TEXT, tax_compliant INTEGER DEFAULT 1, csd_number TEXT,
            province TEXT, contact_email TEXT);

        CREATE TABLE contracts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, contract_number TEXT NOT NULL,
            description TEXT, supplier_id INTEGER, department_id INTEGER,
            contract_value REAL, start_date TEXT, end_date TEXT,
            spend_to_date REAL, status TEXT DEFAULT 'Active');

        CREATE TABLE transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_date TEXT,
            posting_date TEXT, document_type TEXT, document_number TEXT,
            department_id INTEGER, supplier_id INTEGER, scoa_code TEXT,
            scoa_description TEXT, amount REAL, description TEXT,
            fiscal_year TEXT, fiscal_period INTEGER);

        CREATE TABLE purchase_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT, po_number TEXT NOT NULL,
            po_date TEXT, department_id INTEGER, supplier_id INTEGER,
            commodity_code TEXT, commodity_description TEXT, quantity INTEGER,
            unit_price REAL, total_value REAL, contract_id INTEGER,
            delivery_date TEXT, status TEXT DEFAULT 'Completed');

        CREATE TABLE personnel_costs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, period_date TEXT,
            department_id INTEGER, employee_number TEXT, job_title TEXT,
            salary_level INTEGER, basic_salary REAL, overtime REAL,
            housing_allowance REAL, transport_allowance REAL, medical_aid REAL,
            total_cost REAL);

        CREATE INDEX idx_txn_dept ON transactions(department_id);
        CREATE INDEX idx_txn_supplier ON transactions(supplier_id);
        CREATE INDEX idx_txn_date ON transactions(transaction_date);
        CREATE INDEX idx_po_dept ON purchase_orders(department_id);
        CREATE INDEX idx_po_date ON purchase_orders(po_date);
        CREATE INDEX idx_po_contract ON purchase_orders(contract_id);
        CREATE INDEX idx_pers_dept ON personnel_costs(department_id);
        CREATE INDEX idx_pers_date ON personnel_costs(period_date);
    ''')
    conn.commit()

# ─── Generators ──────────────────────────────────────────────────────────────
def gen_departments(conn):
    print("  Departments (15)...")
    conn.executemany('INSERT INTO departments VALUES (?,?,?,?,?)', DEPARTMENTS)
    conn.commit()

def gen_suppliers(conn, n=2100):
    print(f"  Suppliers ({n:,})...")
    used, rows = set(), []
    for _ in range(n):
        while True:
            name = f"{random.choice(SUPPLIER_FIRST)} {random.choice(SUPPLIER_SUFFIX)} {random.choice(['(Pty) Ltd','CC','Inc'])}"
            if name not in used: used.add(name); break
        bbbee = random.choices([1,2,3,4,5,6,7,8], weights=[15,20,25,15,10,8,5,2], k=1)[0]
        rows.append((name,
            f"20{random.randint(0,23):02d}/{random.randint(100000,999999)}/07",
            f"{random.randint(1000000000,9999999999)}",
            bbbee,
            (datetime(2025,1,1)+timedelta(days=random.randint(0,730))).strftime('%Y-%m-%d'),
            1 if random.random()<0.92 else 0,
            f"MAAA{random.randint(100000,999999)}",
            random.choices(PROVINCES, weights=[40,10,10,8,12,5,7,5,3], k=1)[0],
            f"info@{random.choice(SUPPLIER_FIRST).lower()}{random.randint(1,99)}@mail.co.za"))
    conn.executemany('''INSERT INTO suppliers (supplier_name,registration_number,tax_number,
        bbbee_level,bbbee_expiry,tax_compliant,csd_number,province,contact_email)
        VALUES (?,?,?,?,?,?,?,?,?)''', rows)
    conn.commit()
    high_freq = random.sample(range(1, n+1), HIGH_FREQ_COUNT)
    print(f"    High-freq supplier IDs: {high_freq}")
    return n, high_freq

def gen_contracts(conn, n_supp, dept_ids, n=320):
    print(f"  Contracts ({n})...")
    over_util = set(random.sample(range(n), 2))
    rows = []
    for i in range(n):
        dept = random.choice(dept_ids)
        value = round(random.uniform(500_000, 50_000_000), 2)
        start = START_DATE + timedelta(days=random.randint(0, TOTAL_DAYS//2))
        end = start + timedelta(days=random.randint(365,730))
        if i in over_util:
            spend = round(value * random.uniform(1.10, 1.40), 2)
        else:
            spend = round(value * random.uniform(0.15, 0.95), 2)
        rows.append((f"CT-{dept:02d}-{2024+(i%2)}-{i+1:04d}",
            f"Contract for {random.choice(SCOA_CODES)[1].lower()}",
            random.randint(1, n_supp), dept, value,
            start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d'), spend,
            "Active" if i in over_util else random.choice(["Active"]*3+["Closed"])))
    conn.executemany('''INSERT INTO contracts (contract_number,description,supplier_id,
        department_id,contract_value,start_date,end_date,spend_to_date,status)
        VALUES (?,?,?,?,?,?,?,?,?)''', rows)
    conn.commit()
    return n

def gen_transactions(conn, dept_data, n_supp, high_freq, n=510000):
    print(f"  Transactions ({n:,})...")
    dept_ids = [d[0] for d in dept_data]
    bw = np.array([d[3] for d in dept_data], dtype=float); bw /= bw.sum()
    sw = np.ones(n_supp)
    for s in high_freq: sw[s-1] = 12.0
    sw /= sw.sum()

    rdays = np.random.randint(0, TOTAL_DAYS+1, size=n)
    depts = np.random.choice(dept_ids, size=n, p=bw)
    supps = np.random.choice(range(1, n_supp+1), size=n, p=sw)
    amts = np.clip(np.round(np.abs(np.random.lognormal(8.5, 1.8, n)), 2), 50, 50_000_000)
    dtypes = np.random.choice(['Payment Voucher','Journal Entry','Receipt'], n, p=[.6,.25,.15])
    scoa_idx = np.random.randint(0, len(SCOA_CODES), n)

    BS = 50000
    for s in range(0, n, BS):
        e = min(s+BS, n)
        rows = []
        for i in range(s, e):
            dl = DATE_LOOKUP[int(rdays[i])]
            sc = SCOA_CODES[scoa_idx[i]]
            sid = int(supps[i]) if dtypes[i] != 'Journal Entry' else None
            rows.append((dl[0], dl[0], dtypes[i], f"DOC-{i+1:07d}",
                int(depts[i]), sid, sc[0], sc[1], float(amts[i]),
                f"Payment: {sc[1]}", dl[1], dl[2]))
        conn.executemany('''INSERT INTO transactions (transaction_date,posting_date,
            document_type,document_number,department_id,supplier_id,scoa_code,
            scoa_description,amount,description,fiscal_year,fiscal_period)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''', rows)
        print(f"    {e:,} / {n:,}")
    conn.commit()

def gen_purchase_orders(conn, dept_data, n_supp, n_contracts, n=82000):
    print(f"  Purchase orders ({n:,})...")
    dept_ids = [d[0] for d in dept_data]
    bw = np.array([d[3] for d in dept_data], dtype=float); bw /= bw.sum()

    rdays = np.random.randint(0, TOTAL_DAYS+1, size=n)
    depts = np.random.choice(dept_ids, size=n, p=bw)
    supps = np.random.randint(1, n_supp+1, size=n)
    amts = np.clip(np.round(np.abs(np.random.lognormal(9.0, 1.5, n)), 2), 500, 10_000_000)
    unspsc_idx = np.random.randint(0, len(UNSPSC_CODES), n)
    qtys = np.random.randint(1, 500, size=n)

    BS = 20000
    for s in range(0, n, BS):
        e = min(s+BS, n)
        rows = []
        for i in range(s, e):
            dl = DATE_LOOKUP[int(rdays[i])]
            dept_id = int(depts[i])
            u = UNSPSC_CODES[unspsc_idx[i]]
            q = int(qtys[i]); tot = float(amts[i]); up = round(tot/q, 2)
            # Maverick logic with 6-month downward trend
            base = 0.30 if dept_id in HIGH_MAVERICK_DEPTS else 0.12
            if dl[4] == 2025 and dl[3] >= 7:
                base = max(base - (dl[3]-7)*0.025, 0.04)
            is_mav = random.random() < base
            cid = None if is_mav else random.randint(1, n_contracts)
            deliv = (dl[5] + timedelta(days=random.randint(7,90))).strftime('%Y-%m-%d')
            st = random.choices(['Completed','In Progress','Cancelled'], weights=[75,20,5], k=1)[0]
            rows.append((f"PO-{i+1:07d}", dl[0], dept_id, int(supps[i]),
                u[0], u[1], q, up, round(tot,2), cid, deliv, st))
        conn.executemany('''INSERT INTO purchase_orders (po_number,po_date,department_id,
            supplier_id,commodity_code,commodity_description,quantity,unit_price,
            total_value,contract_id,delivery_date,status)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)''', rows)
        print(f"    {e:,} / {n:,}")
    conn.commit()

def gen_personnel(conn, dept_data):
    print("  Personnel costs...")
    total_hc = sum(d[4] for d in dept_data)
    N_EMP = 2200; MONTHS = 24
    employees = []
    eid = 1
    for d in dept_data:
        cnt = max(1, round(N_EMP * d[4] / total_hc))
        for _ in range(cnt):
            employees.append((eid, d[0], random.choice(JOB_TITLES)))
            eid += 1
    rows = []
    for mo in range(MONTHS):
        dt = START_DATE + timedelta(days=mo*30)
        period = dt.strftime('%Y-%m-%d')
        for emp_id, dept_id, (title, level, base) in employees:
            sal = round(base * random.uniform(0.9, 1.15), 2)
            ot = round(sal * random.uniform(0, 0.25), 2) if random.random() < 0.3 else 0
            housing = round(sal * (0.12 if level >= 7 else 0.08), 2)
            transport = round(random.uniform(500, 2500), 2)
            med = round(random.uniform(1800, 4500), 2) if random.random() < 0.7 else 0
            total = sal + ot + housing + transport + med
            rows.append((period, dept_id, f"EMP-{emp_id:05d}", title, level,
                sal, ot, housing, transport, med, round(total, 2)))
    BS = 20000
    for s in range(0, len(rows), BS):
        e = min(s+BS, len(rows))
        conn.executemany('''INSERT INTO personnel_costs (period_date,department_id,
            employee_number,job_title,salary_level,basic_salary,overtime,
            housing_allowance,transport_allowance,medical_aid,total_cost)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)''', rows[s:e])
        print(f"    {e:,} / {len(rows):,}")
    conn.commit()
    return len(rows)

# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    DB_DIR.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists(): os.remove(DB_PATH)
    print(f"Database: {DB_PATH}\n")
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=OFF")
    create_tables(conn)

    gen_departments(conn)
    n_supp, hf = gen_suppliers(conn, 2100)
    dept_ids = [d[0] for d in DEPARTMENTS]
    n_con = gen_contracts(conn, n_supp, dept_ids, 320)
    gen_transactions(conn, DEPARTMENTS, n_supp, hf, 510000)
    gen_purchase_orders(conn, DEPARTMENTS, n_supp, n_con, 82000)
    n_pers = gen_personnel(conn, DEPARTMENTS)

    print("\n═══ Summary ═══")
    cur = conn.cursor()
    for t in ['departments','suppliers','contracts','transactions','purchase_orders','personnel_costs']:
        c = cur.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
        print(f"  {t:25s} {c:>10,}")
    conn.close()
    print(f"\nDone! DB at {DB_PATH}")

if __name__ == "__main__":
    main()
