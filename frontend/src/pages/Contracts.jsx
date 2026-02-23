import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { AlertTriangle, Calendar, Calculator, ArrowRight } from 'lucide-react'

import Loader from '../components/Loader'
import DataTable from '../components/DataTable'

const fmt = (n) => n >= 1e6 ? `R${(n / 1e6).toFixed(1)}M` : `R${(n / 1e3).toFixed(0)}K`

export default function Contracts({ deptId, theme }) {
    const isLight = theme === 'light'
    const chartTextColor = isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'
    const splitLineColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'

    const [data, setData] = useState(null)
    const [expiring, setExpiring] = useState([])
    const [loading, setLoading] = useState(true)
    const [showWhatIf, setShowWhatIf] = useState(false)

    useEffect(() => {
        if (!loading) setLoading(true)
        const url_contracts = deptId ? `/api/contracts?department_id=${deptId}` : '/api/contracts'
        const url_expiring = '/api/contracts/expiring' // Assume global or filtered later if needed

        Promise.all([
            fetch(url_contracts).then(r => r.json()),
            fetch(url_expiring).then(r => r.json())
        ]).then(([contractsData, expiringData]) => {
            setData(contractsData)
            setExpiring(expiringData)
            setLoading(false)
        }).catch(err => {
            console.error("Failed to fetch contracts data", err)
            setLoading(false)
        })
    }, [deptId])

    if (loading || !data) return <Loader />

    const { contracts, utilisation_buckets } = data
    const overUtilised = contracts.filter(c => c.utilisation_pct > 100)

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={`text-2xl font-bold ${isLight ? 'text-gpg-text-primary' : 'bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-300'}`}>
                        Contracts Register
                    </h1>
                    <p className={`${isLight ? 'text-gpg-text-secondary' : 'text-gpg-text-secondary/40'} text-sm mt-1`}>Active contract performance, expiry management & utilisation</p>
                </div>

                {/* What-If Calculator Button */}
                <button onClick={() => setShowWhatIf(true)} className="flex items-center gap-2 px-4 py-2 bg-gpg-gold text-gpg-navy font-bold rounded-lg hover:bg-white transition-colors shadow-lg shadow-gpg-gold/20">
                    <Calculator size={18} />
                    Consolidation Calculator
                </button>
            </div>

            {/* What-If Modal */}
            {showWhatIf && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in"
                    onClick={() => setShowWhatIf(false)}
                    onKeyDown={e => (e.key === 'Escape') && setShowWhatIf(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="bg-gpg-navy border border-gpg-border p-8 rounded-2xl w-[600px] shadow-2xl relative" onClick={e => e.stopPropagation()} role="document">
                        <button onClick={() => setShowWhatIf(false)} className="absolute top-4 right-4 text-gpg-text-secondary/30 hover:text-gpg-text-primary">✕</button>
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-gpg-text-primary"><Calculator className="text-gpg-gold" /> Scenario Planner</h3>
                        <p className={`${isLight ? 'text-gpg-text-secondary' : 'text-gpg-text-secondary/40'} text-sm mb-6`}>Estimate savings by consolidating similar contracts.</p>

                        <div className="bg-gpg-surface rounded-lg p-4 mb-6 border border-gpg-border">
                            <h4 className="text-sm font-semibold mb-3 text-gpg-text-secondary/70">Selected Contracts (Simulation)</h4>
                            <div className="space-y-2">
                                {[
                                    { name: 'Office Supplies - Dept A', val: 1200000 },
                                    { name: 'Stationery - Dept B', val: 850000 },
                                    { name: 'General Supplies - Dept C', val: 2100000 }
                                ].map((c) => (
                                    <div key={c.name} className="flex justify-between text-sm py-2 border-b border-gpg-border last:border-0" role="listitem">
                                        <span className="text-gpg-text-primary">{c.name}</span>
                                        <span className="font-mono text-gpg-text-secondary/60">{fmt(c.val)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between text-sm font-bold pt-3 mt-1 border-t border-gpg-border">
                                <span className="text-gpg-text-primary">Total Current Spend</span>
                                <span className="text-gpg-text-primary">{fmt(4150000)}</span>
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-gpg-gold/10 to-transparent p-4 rounded-lg border border-gpg-gold/20 flex items-center justify-between">
                            <div>
                                <p className="text-gpg-gold font-bold text-lg">Projected Saving</p>
                                <p className="text-gpg-text-secondary/60 text-xs">Based on 15% volume discount</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-gpg-text-primary mb-1">{fmt(622500)}</p>
                                <p className="text-green-400 text-xs font-bold flex items-center justify-end gap-1">
                                    <ArrowRight size={12} className="rotate-45" /> 15.0%
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setShowWhatIf(false)} className="px-4 py-2 text-gpg-text-secondary/60 hover:text-gpg-text-primary mr-2">Cancel</button>
                            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold">Generate Proposal</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Expiry Widget */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Calendar size={18} className="text-amber-400" />
                        Expiring Soon (90 Days)
                    </h3>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        {expiring.map(c => (
                            <div key={c.id} className="bg-gpg-surface p-3 rounded-lg border-l-2 border-amber-500 hover:bg-gpg-surface-hover transition-colors group">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-xs text-amber-500">{c.contract_number}</span>
                                    <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">{c.end_date}</span>
                                </div>
                                <p className="text-xs text-gpg-text-secondary truncate mb-2">{c.description}</p>
                                <div className="flex items-center justify-between text-[10px] text-gpg-text-secondary/40">
                                    <span>{fmt(c.contract_value)}</span>
                                    <span className={c.utilisation_pct > 80 ? 'text-gpg-red font-bold' : 'text-gpg-green'}>{c.utilisation_pct}% Utilised</span>
                                </div>
                            </div>
                        ))}
                        {expiring.length === 0 && <p className="text-gpg-text-secondary/40 italic text-sm">No expiring contracts found.</p>}
                    </div>
                </div>

                {/* Utilisation gauge/donut chart */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-2">Utilisation Distribution</h3>
                    <ReactECharts key={theme} option={{
                        tooltip: { trigger: 'item' },
                        legend: { top: 'bottom', textStyle: { color: chartTextColor, fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
                        series: [{
                            type: 'pie', radius: ['40%', '65%'], center: ['50%', '45%'],
                            itemStyle: { borderRadius: 4, borderColor: isLight ? '#f8fafc' : '#0a1628', borderWidth: 2 },
                            label: { show: false },
                            data: utilisation_buckets.map(b => ({
                                name: b.bucket, value: b.count,
                                itemStyle: { color: b.bucket === 'Over 100%' ? '#ef4444' : b.bucket === '80-100%' ? '#f59e0b' : b.bucket === '50-80%' ? '#3b82f6' : '#22c55e' }
                            }))
                        }]
                    }} style={{ height: 220 }} />
                </div>

                {/* Critical Alerts */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-500" />
                        Critical: Over-Utilised
                    </h3>
                    <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                        {overUtilised.map(c => (
                            <div key={c.id} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex justify-between items-center hover:bg-red-500/15 transition-colors">
                                <div className="overflow-hidden">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-bold text-xs text-gpg-text-primary">{c.contract_number}</span>
                                    </div>
                                    <p className="text-xs text-gpg-text-secondary/50 truncate w-32">{c.supplier_name}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="text-xs font-bold text-red-500 block">{c.utilisation_pct}%</span>
                                    <span className="text-[10px] text-gpg-text-secondary/30 block">Utilised</span>
                                </div>
                            </div>
                        ))}
                        {overUtilised.length === 0 && <p className="text-gpg-text-secondary/40 italic text-sm">No over-utilised contracts.</p>}
                    </div>
                </div>
            </div>

            {/* Full Contract List */}
            <DataTable
                title="Active Contracts Register"
                data={contracts}
                columns={[
                    { key: 'contract_number', header: 'Contract No', sortable: true, render: r => <span className="font-mono text-gpg-text-secondary">{r.contract_number}</span> },
                    { key: 'description', header: 'Description', sortable: true, render: r => <span className="truncate block max-w-xs text-gpg-text-secondary" title={r.description}>{r.description}</span> },
                    { key: 'supplier_name', header: 'Supplier', sortable: true, render: r => <span className="text-gpg-text-primary">{r.supplier_name}</span> },
                    { key: 'contract_value', header: 'Value', sortable: true, align: 'right', render: r => <span className="text-gpg-text-primary">{fmt(r.contract_value)}</span> },
                    { key: 'spend_to_date', header: 'Spend', sortable: true, align: 'right', render: r => <span className="text-gpg-text-primary">{fmt(r.spend_to_date)}</span> },
                    {
                        key: 'utilisation_pct', header: 'Progress', sortable: true, align: 'right', render: r => (
                            <div className="flex items-center justify-end gap-2">
                                <div className="w-24 bg-gpg-navy/10 h-1.5 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${r.utilisation_pct > 100 ? 'bg-gpg-red' : r.utilisation_pct > 80 ? 'bg-amber-500' : 'bg-gpg-accent'}`}
                                        style={{ width: `${Math.min(r.utilisation_pct, 100)}%` }}></div>
                                </div>
                                <span className={`text-xs w-8 text-right font-mono ${r.utilisation_pct > 90 ? 'text-gpg-red font-bold' : 'text-gpg-text-secondary'}`}>{Math.round(r.utilisation_pct)}%</span>
                            </div>
                        )
                    }
                ]}
                rowsPerPage={10}
            />
        </div>
    )
}
