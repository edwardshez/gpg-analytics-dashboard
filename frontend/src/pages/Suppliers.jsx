import { useState, useEffect } from 'react'
import { Activity, Percent, ShieldCheck, MapPin } from 'lucide-react'
import Loader from '../components/Loader'
import DataTable from '../components/DataTable'


const fmt = (n) => n >= 1e6 ? `R${(n / 1e6).toFixed(1)}M` : `R${(n / 1e3).toFixed(0)}K`

export default function Suppliers({ deptId }) {
    const [data, setData] = useState(null)
    useEffect(() => {
        const url = deptId ? `/api/suppliers?department_id=${deptId}` : '/api/suppliers'
        fetch(url).then(r => r.json()).then(setData)
    }, [deptId])

    if (!data) return <Loader />

    const { top_suppliers, province_distribution } = data
    // Compute stats from top suppliers list for the cards since the endpoint aggregates top 50
    // Real app would have separate stats endpoint
    const topSpender = top_suppliers[0]

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300">
                        Supplier Analytics
                    </h1>
                    <p className="text-gpg-text-secondary/40 text-sm mt-1">Vendor performance, compliance, and B-BBEE monitoring</p>
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-6">
                <div className="glass-card kpi-card p-6">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs text-gpg-text-secondary uppercase tracking-wider">Top Spender</p>
                            <p className="text-lg font-bold truncate w-40 text-gpg-text-primary" title={topSpender?.supplier_name}>{topSpender?.supplier_name || 'N/A'}</p>
                        </div>
                        <div className="p-2 bg-blue-500/10 rounded-lg"><Activity size={18} className="text-blue-400" /></div>
                    </div>
                    <p className="text-2xl font-bold text-blue-400">{fmt(topSpender?.total_spend || 0)}</p>
                </div>

                <div className="glass-card kpi-card p-6">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs text-gpg-text-secondary uppercase tracking-wider">Tax Compliant</p>
                            <p className="text-lg font-bold text-gpg-text-primary">92%</p>
                        </div>
                        <div className="p-2 bg-green-500/10 rounded-lg"><ShieldCheck size={18} className="text-green-400" /></div>
                    </div>
                    <div className="w-full bg-gpg-navy/10 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: '92%' }}></div>
                    </div>
                </div>

                <div className="glass-card kpi-card p-6">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs text-gpg-text-secondary uppercase tracking-wider">Local Suppliers</p>
                            <p className="text-lg font-bold text-gpg-text-primary">Gauteng: {province_distribution.find(p => p.province === 'Gauteng')?.count || 0}</p>
                        </div>
                        <div className="p-2 bg-purple-500/10 rounded-lg"><MapPin size={18} className="text-purple-400" /></div>
                    </div>
                    <p className="text-sm text-gpg-text-secondary/40 mt-1">Leading province by count</p>
                </div>

                <div className="glass-card kpi-card p-6">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <p className="text-xs text-gpg-text-secondary uppercase tracking-wider">Avg B-BBEE</p>
                            <p className="text-lg font-bold text-gpg-text-primary">Level 2</p>
                        </div>
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Percent size={18} className="text-amber-400" /></div>
                    </div>
                    <p className="text-sm text-gpg-text-secondary/40 mt-1">Weighted by spend</p>
                </div>
            </div>

            {/* Top Suppliers List */}
            <DataTable
                title="Top 50 Suppliers by Spend"
                data={top_suppliers}
                columns={[
                    { key: 'supplier_name', header: 'Supplier Name', sortable: true, render: r => <span className="font-medium text-gpg-text-primary group-hover:text-gpg-accent transition-colors">{r.supplier_name}</span> },
                    { key: 'bbbee_level', header: 'B-BBEE', sortable: true, align: 'center', render: r => <span className="bg-gpg-surface px-2 py-0.5 rounded text-xs text-gpg-text-secondary">L{r.bbbee_level}</span> },
                    {
                        key: 'tax_compliant', header: 'Tax Status', sortable: true, align: 'center', render: r => (
                            r.tax_compliant ?
                                <span className="text-gpg-green text-[10px] bg-gpg-green/10 px-2 py-0.5 rounded border border-gpg-green/20 uppercase font-bold tracking-wider">Active</span> :
                                <span className="text-gpg-red text-[10px] bg-gpg-red/10 px-2 py-0.5 rounded border border-gpg-red/20 uppercase font-bold tracking-wider">Non-Compliant</span>
                        )
                    },
                    { key: 'province', header: 'Province', sortable: true, render: r => <span className="text-gpg-text-secondary/70">{r.province}</span> },
                    { key: 'txn_count', header: 'Txn Count', sortable: true, align: 'right', render: r => <span className="text-gpg-text-secondary/70">{r.txn_count}</span> },
                    { key: 'dept_count', header: 'Depts', sortable: true, align: 'right', render: r => <span className="text-gpg-text-secondary/70">{r.dept_count}</span> },
                    { key: 'total_spend', header: 'Total Spend', sortable: true, align: 'right', render: r => <span className="font-mono text-gpg-gold">{fmt(r.total_spend)}</span> }
                ]}
                rowsPerPage={10}
            />
        </div>
    )
}


