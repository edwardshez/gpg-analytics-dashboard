"""GPG Analytics Dashboard - FastAPI Backend"""
import sqlite3
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np

from anomaly_detection import detect_transaction_anomalies, detect_contract_anomalies, detect_invoice_anomalies

# Robust path resolution for database
potential_paths = [
    Path(__file__).resolve().parent.parent / "database" / "gpg_analytics.db", # Root mono-repo
    Path(__file__).resolve().parent / "database" / "gpg_analytics.db",        # Nested in backend
    Path("/opt/render/project/src/database/gpg_analytics.db"),              # Render absolute path
]

# In cloud deployment, the DB might be missing because it's too large for Git.
# Auto-generate a lightweight version if so.
import sys
import os
def init_db():
    try:
        potential_db = next((p for p in potential_paths if p.exists()), None)
        if not potential_db:
            print("[DEBUG] Database not found. Initiating cloud-scale data generation...")
            # Add root to sys.path to find 'data' module
            root_dir = Path(__file__).resolve().parent.parent
            if str(root_dir) not in sys.path:
                sys.path.append(str(root_dir))
            
            from data.generate_data import generate_all_data
            
            # Use small transaction count for Render free tier (Ultra-Fast & low RAM)
            generate_all_data(db_path=potential_paths[0], transactions_n=5000, po_n=1000, supplier_n=100)
            print("[DEBUG] Database generated successfully.")
        else:
            print(f"[DEBUG] Database found at: {potential_db}")
    except Exception as e:
        print(f"[DEBUG] FATAL: Database auto-initialization failed: {e}")

app = FastAPI(title="GPG Analytics API", version="1.1.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

@app.get("/api/health")
def health():
    return {"status": "ok", "db_path": str(DB_PATH), "db_exists": DB_PATH.exists()}

@app.get("/api/debug-db")
def debug_db():
    exists = DB_PATH.exists()
    size = DB_PATH.stat().st_size if exists else 0
    return {
        "exists": exists,
        "size_mb": round(size / (1024*1024), 2),
        "path": str(DB_PATH),
        "potential_paths": [str(p) for p in potential_paths],
        "cwd": os.getcwd()
    }

DB_PATH = next((p for p in potential_paths if p.exists()), potential_paths[0])
init_db()

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def query_df(sql, params=None):
    conn = sqlite3.connect(str(DB_PATH))
    df = pd.read_sql(sql, conn, params=params)
    conn.close()
    return df

# ─── Auth ────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
def login(req: LoginRequest):
    return {"token": "mock-jwt-token-gpg-2025", "user": req.username, "role": "analyst"}

@app.get("/api/departments")
def get_departments():
    return query_df("SELECT id, name FROM departments ORDER BY name").to_dict('records')

# ─── Overview ────────────────────────────────────────────────────────────────
@app.get("/api/overview")
def overview(department_id: Optional[int] = None):
    where_clause = "WHERE 1=1"
    params = []
    if department_id:
        where_clause += " AND department_id = ?"
        params.append(department_id)

    conn = get_db()
    c = conn.cursor()
    
    # KPIs
    total_spend = c.execute(f"SELECT SUM(amount) FROM transactions {where_clause}", params).fetchone()[0] or 0
    total_txns = c.execute(f"SELECT COUNT(*) FROM transactions {where_clause}", params).fetchone()[0] or 0
    total_pos = c.execute(f"SELECT COUNT(*) FROM purchase_orders {where_clause}", params).fetchone()[0] or 0
    
    # For active suppliers/contracts, we act slightly differently if filtering
    if department_id:
        # Suppliers used by this dept
        active_suppliers = c.execute(
            "SELECT COUNT(DISTINCT supplier_id) FROM transactions WHERE department_id = ?", 
            (department_id,)
        ).fetchone()[0] or 0
        active_contracts = c.execute(
            "SELECT COUNT(*) FROM contracts WHERE department_id = ? AND status='Active'", 
            (department_id,)
        ).fetchone()[0] or 0
        budget = c.execute("SELECT annual_budget FROM departments WHERE id = ?", (department_id,)).fetchone()[0]
    else:
        active_suppliers = c.execute("SELECT COUNT(*) FROM suppliers").fetchone()[0]
        active_contracts = c.execute("SELECT COUNT(*) FROM contracts WHERE status='Active'").fetchone()[0]
        budget = c.execute("SELECT SUM(annual_budget) FROM departments").fetchone()[0]

    # Monthly spend trend
    monthly = query_df(f"""
        SELECT substr(transaction_date,1,7) as month, SUM(amount) as total,
               COUNT(*) as txn_count
        FROM transactions {where_clause} GROUP BY month ORDER BY month
    """, params).to_dict('records')
    
    # Simple Forecast (Linear Projection for next 6 months)
    forecast = []
    if len(monthly) > 12:
        last_month = monthly[-1]['month']
        # Simple moving average of last 3 months for projection base
        avg_spend = np.mean([m['total'] for m in monthly[-3:]])
        last_date = datetime.strptime(last_month, "%Y-%m")
        
        for i in range(1, 7):
            next_date = last_date + timedelta(days=i*30)
            forecast.append({
                "month": next_date.strftime("%Y-%m"),
                "total": avg_spend * (1 + (i * 0.02)), # Slight inflation trend
                "is_forecast": True
            })

    # Spend by department (if no dept filter)
    dept_spend = []
    if not department_id:
        dept_spend = query_df("""
            SELECT d.name as department, SUM(t.amount) as total_spend,
                   COUNT(t.id) as txn_count
            FROM transactions t JOIN departments d ON t.department_id = d.id
            GROUP BY d.name ORDER BY total_spend DESC
        """).to_dict('records')

    # Spend by SCOA category
    scoa_spend = query_df(f"""
        SELECT scoa_description as category, SUM(amount) as total
        FROM transactions {where_clause} GROUP BY scoa_description ORDER BY total DESC
    """, params).to_dict('records')

    conn.close()
    return {
        "kpis": {
            "total_spend": round(total_spend, 2),
            "total_transactions": total_txns,
            "total_purchase_orders": total_pos,
            "active_suppliers": active_suppliers,
            "active_contracts": active_contracts,
            "budget_variance": round(((budget - total_spend) / budget) * 100, 1) if budget else 0
        },
        "monthly_trend": monthly + forecast,
        "department_spend": dept_spend,
        "scoa_spend": scoa_spend,
    }

# ─── Maverick Spend ─────────────────────────────────────────────────────────
@app.get("/api/maverick")
def maverick(department_id: Optional[int] = None):
    where_clause = ""
    params = []
    if department_id:
        where_clause = "WHERE po.department_id = ?"
        params.append(department_id)

    # Maverick = PO without contract_id
    by_dept = []
    if not department_id:
        by_dept = query_df("""
            SELECT d.name as department,
                   COUNT(*) as total_pos,
                   SUM(CASE WHEN po.contract_id IS NULL THEN 1 ELSE 0 END) as maverick_pos,
                   ROUND(SUM(CASE WHEN po.contract_id IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as maverick_pct,
                   SUM(CASE WHEN po.contract_id IS NULL THEN po.total_value ELSE 0 END) as maverick_value,
                   SUM(po.total_value) as total_value
            FROM purchase_orders po
            JOIN departments d ON po.department_id = d.id
            GROUP BY d.name ORDER BY maverick_pct DESC
        """).to_dict('records')

    # Monthly trend
    monthly = query_df(f"""
        SELECT substr(po_date,1,7) as month,
               COUNT(*) as total_pos,
               SUM(CASE WHEN contract_id IS NULL THEN 1 ELSE 0 END) as maverick_pos,
               ROUND(SUM(CASE WHEN contract_id IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as maverick_pct
        FROM purchase_orders po {where_clause} GROUP BY month ORDER BY month
    """, params).to_dict('records')

    overall = query_df(f"""
        SELECT 
            ROUND(SUM(CASE WHEN contract_id IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as pct,
            SUM(CASE WHEN contract_id IS NULL THEN total_value ELSE 0 END) as val
        FROM purchase_orders po {where_clause}
    """, params).iloc[0]

    # Category breakdown (Maverick only)
    by_category = query_df(f"""
        SELECT commodity_description as category, COUNT(*) as count, SUM(total_value) as value
        FROM purchase_orders po
        WHERE contract_id IS NULL {"AND department_id = ?" if department_id else ""}
        GROUP BY category ORDER BY value DESC LIMIT 10
    """, params).to_dict('records')

    return {
        "overall_maverick_pct": float(overall['pct'] or 0),
        "total_maverick_value": float(overall['val'] or 0),
        "by_department": by_dept,
        "monthly_trend": monthly,
        "by_category": by_category
    }

# ─── Suppliers ───────────────────────────────────────────────────────────────
@app.get("/api/suppliers")
def suppliers(department_id: Optional[int] = None):
    # Base WHERE for transactions join
    txn_where = "" 
    params = []
    if department_id:
        txn_where = "WHERE t.department_id = ?"
        params.append(department_id)

    top_suppliers = query_df(f"""
        SELECT s.id, s.supplier_name, s.bbbee_level, s.tax_compliant, s.province,
               COUNT(t.id) as txn_count, SUM(t.amount) as total_spend,
               COUNT(DISTINCT t.department_id) as dept_count
        FROM suppliers s
        JOIN transactions t ON s.id = t.supplier_id
        {txn_where}
        GROUP BY s.id ORDER BY total_spend DESC LIMIT 50
    """, params).to_dict('records')

    # Distributions (global for now, complex to filter by txn on the fly efficiently for demo)
    bbbee_dist = query_df("""
        SELECT bbbee_level, COUNT(*) as count FROM suppliers GROUP BY bbbee_level ORDER BY bbbee_level
    """).to_dict('records')

    tax_compliance = query_df("""
        SELECT CASE WHEN tax_compliant=1 THEN 'Compliant' ELSE 'Non-Compliant' END as status,
               COUNT(*) as count FROM suppliers GROUP BY tax_compliant
    """).to_dict('records')

    province_dist = query_df("""
        SELECT province, COUNT(*) as count FROM suppliers GROUP BY province ORDER BY count DESC
    """).to_dict('records')

    return {
        "top_suppliers": top_suppliers,
        "bbbee_distribution": bbbee_dist,
        "tax_compliance": tax_compliance,
        "province_distribution": province_dist,
    }

# ─── Contracts ───────────────────────────────────────────────────────────────
@app.get("/api/contracts")
def contracts(department_id: Optional[int] = None, supplier_id: Optional[int] = None):
    where_parts = []
    params = []
    if department_id:
        where_parts.append("c.department_id = ?")
        params.append(department_id)
    if supplier_id:
        where_parts.append("c.supplier_id = ?")
        params.append(supplier_id)
    
    where = "WHERE " + " AND ".join(where_parts) if where_parts else ""

    all_contracts = query_df(f"""
        SELECT c.id, c.contract_number, c.description, s.supplier_name,
               d.name as department_name, c.contract_value, c.spend_to_date,
               ROUND(c.spend_to_date * 100.0 / c.contract_value, 1) as utilisation_pct,
               c.start_date, c.end_date, c.status
        FROM contracts c
        JOIN suppliers s ON c.supplier_id = s.id
        JOIN departments d ON c.department_id = d.id
        {where}
        ORDER BY utilisation_pct DESC
    """, params).to_dict('records')

    util_buckets = query_df(f"""
        SELECT CASE
            WHEN spend_to_date * 100.0 / contract_value > 100 THEN 'Over 100%'
            WHEN spend_to_date * 100.0 / contract_value > 80 THEN '80-100%'
            WHEN spend_to_date * 100.0 / contract_value > 50 THEN '50-80%'
            ELSE 'Under 50%'
        END as bucket, COUNT(*) as count
        FROM contracts c {where} GROUP BY bucket
    """, params).to_dict('records')

    return {"contracts": all_contracts, "utilisation_buckets": util_buckets}

@app.get("/api/contracts/expiring")
def expiring_contracts():
    # Return contracts expiring in next 90 days
    today = datetime.now().strftime("%Y-%m-%d")
    future = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")
    
    expiring = query_df(f"""
        SELECT c.id, c.contract_number, c.description, s.supplier_name,
               c.end_date, c.contract_value,
               ROUND(c.spend_to_date * 100.0 / c.contract_value, 1) as utilisation_pct
        FROM contracts c
        JOIN suppliers s ON c.supplier_id = s.id
        WHERE c.end_date BETWEEN '{today}' AND '{future}' AND c.status = 'Active'
        ORDER BY c.end_date ASC
    """).to_dict('records')
    return expiring

# ─── Search ──────────────────────────────────────────────────────────────────
@app.get("/api/search")
def search(q: str):
    if not q or len(q) < 2: return []
    q_wild = f"%{q}%"
    
    suppliers = query_df("SELECT id, supplier_name as label, 'Supplier' as type FROM suppliers WHERE supplier_name LIKE ? LIMIT 5", [q_wild]).to_dict('records')
    contracts = query_df("SELECT id, contract_number as label, 'Contract' as type FROM contracts WHERE contract_number LIKE ? LIMIT 5", [q_wild]).to_dict('records')
    
    return suppliers + contracts

# ─── Personnel ───────────────────────────────────────────────────────────────
@app.get("/api/personnel")
def personnel():
    by_dept = query_df("""
        SELECT d.name as department,
               COUNT(DISTINCT p.employee_number) as employees,
               SUM(p.basic_salary) as total_salary,
               SUM(p.overtime) as total_overtime,
               SUM(p.total_cost) as total_cost,
               AVG(p.total_cost) as avg_cost
        FROM personnel_costs p
        JOIN departments d ON p.department_id = d.id
        GROUP BY d.name ORDER BY total_cost DESC
    """).to_dict('records')

    monthly = query_df("""
        SELECT substr(period_date,1,7) as month,
               SUM(basic_salary) as salary, SUM(overtime) as overtime,
               SUM(housing_allowance) as housing, SUM(transport_allowance) as transport,
               SUM(medical_aid) as medical, SUM(total_cost) as total
        FROM personnel_costs GROUP BY month ORDER BY month
    """).to_dict('records')

    by_level = query_df("""
        SELECT job_title, salary_level, COUNT(DISTINCT employee_number) as count,
               AVG(basic_salary) as avg_salary, AVG(total_cost) as avg_total
        FROM personnel_costs GROUP BY job_title, salary_level ORDER BY salary_level DESC
    """).to_dict('records')

    return {"by_department": by_dept, "monthly_trend": monthly, "by_level": by_level}

# ─── Anomaly Detection ──────────────────────────────────────────────────────
@app.get("/api/anomalies")
def anomalies():
    txn_anomalies = detect_transaction_anomalies(top_n=50)
    contract_anomalies = detect_contract_anomalies()
    invoice_anomalies = detect_invoice_anomalies()
    return {
        "supplier_anomalies": txn_anomalies,
        "contract_anomalies": contract_anomalies,
        "invoice_anomalies": invoice_anomalies,
        "total_supplier_flags": len(txn_anomalies),
        "total_contract_flags": len(contract_anomalies),
        "total_invoice_flags": len(invoice_anomalies),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
