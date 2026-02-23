import { useState, useEffect } from 'react'
import { AlertCircle, Search, Filter } from 'lucide-react'
import Loader from '../components/Loader'
import DataTable from '../components/DataTable'


export default function Anomalies({ theme }) {
    const isLight = theme === 'light'
    const [data, setData] = useState(null)
    useEffect(() => { fetch('/api/anomalies').then(r => r.json()).then(setData) }, [])
    if (!data) return <Loader />

    const { supplier_anomalies, total_supplier_flags, invoice_anomalies, total_invoice_flags } = data

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 text-gpg-text-primary">
                        Anomaly Detection
                        <span className="text-xs bg-gpg-accent/20 text-gpg-accent border border-gpg-accent/30 px-2 py-0.5 rounded-full">AI Powered</span>
                    </h1>
                    <p className={`${isLight ? 'text-gpg-text-secondary' : 'text-gpg-text-secondary/40'} text-sm mt-1`}>Cross-referencing transactions for suspicious patterns and AI scoring</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500 p-6 rounded-r-lg">
                    <div className="flex items-start gap-4">
                        <div className="bg-red-500/20 p-2 rounded-lg">
                            <AlertCircle className="text-red-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gpg-text-primary">{total_supplier_flags} Supplier Flags</h3>
                            <p className="text-gpg-text-secondary/70 text-sm mt-1">
                                Unusual spending patterns detected via Isolation Forest.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-6 rounded-r-lg">
                    <div className="flex items-start gap-4">
                        <div className="bg-amber-500/20 p-2 rounded-lg">
                            <AlertCircle className="text-amber-400" size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gpg-text-primary">{total_invoice_flags} Invoice Flags</h3>
                            <p className="text-gpg-text-secondary/70 text-sm mt-1">
                                Potential duplicates or split payments detected.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoice Anomaly Table */}
            <DataTable
                title="Invoice Integrity Alerts"
                data={invoice_anomalies}
                columns={[
                    { key: 'supplier_name', header: 'Supplier', sortable: true },
                    {
                        key: 'type', header: 'Type', sortable: true, render: r => (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.type === 'Potential Split' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {r.type}
                            </span>
                        )
                    },
                    { key: 'transaction_date', header: 'Date', sortable: true },
                    { key: 'amount', header: 'Amount/Total', sortable: true, align: 'right', render: r => <span className="text-gpg-text-primary">R{(r.amount || 0).toLocaleString()}</span> },

                    { key: 'reason', header: 'Reason', render: r => <span className="text-gpg-text-secondary/60 italic">{r.reason}</span> }
                ]}
                rowsPerPage={5}
            />

            {/* Anomaly Table */}
            <DataTable
                title="Pattern Anomalies (Supplier Level)"
                data={supplier_anomalies}
                columns={[
                    { key: 'supplier_name', header: 'Supplier', sortable: true, render: r => <span className="font-medium text-gpg-text-primary">{r.supplier_name}</span> },
                    {
                        key: 'severity', header: 'Severity', sortable: true, render: r => (
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${r.severity === 'Critical' ? 'bg-gpg-red/20 text-gpg-red border-gpg-red/30' :
                                r.severity === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                }`}>
                                {r.severity}
                            </span>
                        )
                    },
                    { key: 'reason', header: 'Detected Pattern (AI Reason)', sortable: true, render: r => <span className="text-gpg-text-secondary">{r.reason}</span> },
                    { key: 'txn_count', header: 'Txn Count', sortable: true, align: 'right', render: r => <span className="text-gpg-text-secondary/60">{r.txn_count}</span> },
                    { key: 'anomaly_score', header: 'Score', sortable: true, align: 'right', render: r => <span className="font-mono text-xs text-gpg-text-secondary/30">{r.anomaly_score.toFixed(4)}</span> }
                ]}
                rowsPerPage={10}
            />
        </div>
    )
}



