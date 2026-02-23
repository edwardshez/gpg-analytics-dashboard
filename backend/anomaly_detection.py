"""Anomaly detection using Isolation Forest on financial transaction data."""
import sqlite3
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "database" / "gpg_analytics.db"


def get_connection():
    return sqlite3.connect(str(DB_PATH))


def detect_transaction_anomalies(top_n=50):
    """Run Isolation Forest on transactions to flag suspicious patterns."""
    conn = get_connection()

    # Feature engineering: aggregate by supplier
    df = pd.read_sql("""
        SELECT supplier_id,
               COUNT(*) as txn_count,
               SUM(amount) as total_amount,
               AVG(amount) as avg_amount,
               MAX(amount) as max_amount,
               MIN(amount) as min_amount,
               COUNT(DISTINCT department_id) as dept_count,
               COUNT(DISTINCT scoa_code) as scoa_variety
        FROM transactions
        WHERE supplier_id IS NOT NULL
        GROUP BY supplier_id
    """, conn)

    if df.empty:
        conn.close()
        return []

    features = df[['txn_count', 'total_amount', 'avg_amount', 'max_amount',
                    'min_amount', 'dept_count', 'scoa_variety']].values

    # Normalize
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    features_scaled = scaler.fit_transform(features)

    # Isolation Forest
    model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    df['anomaly_score'] = model.fit_predict(features_scaled)
    df['anomaly_raw_score'] = model.decision_function(features_scaled)

    # Get anomalies (score == -1)
    anomalies = df[df['anomaly_score'] == -1].copy()
    anomalies = anomalies.sort_values('anomaly_raw_score')

    # Enrich with supplier names
    supplier_names = pd.read_sql(
        "SELECT id as supplier_id, supplier_name FROM suppliers", conn
    )
    anomalies = anomalies.merge(supplier_names, on='supplier_id', how='left')

    # Classify severity
    anomalies['severity'] = pd.cut(
        anomalies['anomaly_raw_score'],
        bins=[-np.inf, -0.3, -0.15, 0],
        labels=['Critical', 'High', 'Medium']
    )

    # Determine reason
    reasons = []
    for _, row in anomalies.iterrows():
        r = []
        if row['txn_count'] > df['txn_count'].quantile(0.95):
            r.append('Unusually high transaction frequency')
        if row['total_amount'] > df['total_amount'].quantile(0.95):
            r.append('Exceptionally large total spend')
        if row['avg_amount'] > df['avg_amount'].quantile(0.95):
            r.append('High average transaction value')
        if row['dept_count'] > df['dept_count'].quantile(0.90):
            r.append('Transactions across many departments')
        if not r:
            r.append('Unusual spending pattern detected')
        reasons.append('; '.join(r))
    anomalies['reason'] = reasons

    conn.close()

    result = anomalies.head(top_n).to_dict('records')
    for row in result:
        row['txn_count'] = int(row['txn_count'])
        row['supplier_id'] = int(row['supplier_id'])
        row['dept_count'] = int(row['dept_count'])
        row['scoa_variety'] = int(row['scoa_variety'])
        row['severity'] = str(row['severity'])
    return result


def detect_contract_anomalies():
    """Find contracts with utilisation > 100%."""
    conn = get_connection()
    df = pd.read_sql("""
        SELECT c.id, c.contract_number, c.description,
               s.supplier_name, d.name as department_name,
               c.contract_value, c.spend_to_date,
               ROUND(c.spend_to_date * 100.0 / c.contract_value, 1) as utilisation_pct,
               c.start_date, c.end_date, c.status
        FROM contracts c
        JOIN suppliers s ON c.supplier_id = s.id
        JOIN departments d ON c.department_id = d.id
        WHERE c.spend_to_date > c.contract_value
        ORDER BY utilisation_pct DESC
    """, conn)
    conn.close()
    return df.to_dict('records')


def detect_invoice_anomalies():
    """Detect duplicate and split invoices."""
    conn = get_connection()

    # 1. Duplicate Invoices (Same supplier, date, amount, description)
    duplicates = pd.read_sql("""
        SELECT supplier_id, transaction_date, amount, description, COUNT(*) as occurrence_count,
               GROUP_CONCAT(id) as transaction_ids
        FROM transactions
        GROUP BY supplier_id, transaction_date, amount, description
        HAVING occurrence_count > 1
    """, conn)

    # Enrich duplicates
    if not duplicates.empty:
        supplier_names = pd.read_sql("SELECT id as supplier_id, supplier_name FROM suppliers", conn)
        duplicates = duplicates.merge(supplier_names, on='supplier_id', how='left')
        duplicates['type'] = 'Duplicate Invoice'
        duplicates['severity'] = 'High'
        duplicates['reason'] = duplicates['occurrence_count'].apply(lambda x: f"Found {x} identical transactions")
    else:
        duplicates = pd.DataFrame(columns=['supplier_name', 'transaction_date', 'amount', 'type', 'severity', 'reason'])

    # 2. Split Invoices (Multiple transactions to same supplier on same day summing near R500k threshold)
    splits = pd.read_sql("""
        SELECT supplier_id, transaction_date, SUM(amount) as total_daily_amount, COUNT(*) as txn_count,
               GROUP_CONCAT(id) as transaction_ids
        FROM transactions
        GROUP BY supplier_id, transaction_date
        HAVING txn_count > 1 AND total_daily_amount BETWEEN 450000 AND 500000
    """, conn)

    if not splits.empty:
        supplier_names = pd.read_sql("SELECT id as supplier_id, supplier_name FROM suppliers", conn)
        splits = splits.merge(supplier_names, on='supplier_id', how='left')
        splits['type'] = 'Potential Split'
        splits['severity'] = 'Critical'
        splits['reason'] = splits.apply(lambda r: f"Total R{r['total_daily_amount']:,.0f} across {r['txn_count']} transactions (Near R500k threshold)", axis=1)
    else:
        splits = pd.DataFrame(columns=['supplier_name', 'transaction_date', 'total_daily_amount', 'type', 'severity', 'reason'])

    conn.close()

    # Combine
    combined = pd.concat([
        duplicates[['supplier_name', 'transaction_date', 'amount', 'type', 'severity', 'reason']],
        splits.rename(columns={'total_daily_amount': 'amount'})[['supplier_name', 'transaction_date', 'amount', 'type', 'severity', 'reason']]
    ])
    
    # Fill NaN to avoid JSON serialization issues
    combined = combined.fillna({
        'supplier_name': 'Unknown Supplier',
        'reason': 'Unspecified pattern detected',
        'amount': 0
    })


    return combined.to_dict('records')




if __name__ == "__main__":
    print("Running anomaly detection...")
    txn = detect_transaction_anomalies()
    print(f"Found {len(txn)} supplier anomalies")
    for a in txn[:5]:
        print(f"  {a['supplier_name']}: {a['severity']} - {a['reason']}")

    contracts = detect_contract_anomalies()
    print(f"\nFound {len(contracts)} over-utilised contracts")
    for c in contracts:
        print(f"  {c['contract_number']}: {c['utilisation_pct']}%")

    invoices = detect_invoice_anomalies()
    print(f"\nFound {len(invoices)} invoice anomalies")
    for inv in invoices[:5]:
        print(f"  {inv['supplier_name']}: {inv['type']} - {inv['reason']}")

