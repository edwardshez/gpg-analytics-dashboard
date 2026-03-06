import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { FileText, Users, TrendingUp, Activity, PieChart, BarChart2, X, GripVertical } from 'lucide-react'
import Loader from '../components/Loader'
import KpiCard from '../components/KpiCard'

const RandIcon = ({ size = 20, className = "" }) => (
    <div style={{ width: size, height: size, fontSize: size * 0.75 }}
        className={`${className} flex items-center justify-center font-bold font-sans`}>R</div>
)

const fmt = (n) => {
    if (!n && n !== 0) return 'R0'
    if (n >= 1e9) return `R${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `R${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `R${(n / 1e3).toFixed(0)}K`
    return `R${n?.toFixed(0)}`
}

export default function Overview({ deptId, theme }) {
    const isLight = theme === 'light'
    const chartTextColor = isLight ? '#475569' : 'rgba(255,255,255,0.6)'
    const chartLineColor = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'
    const splitLineColor = isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'
    const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(15, 23, 42, 0.9)'
    const tooltipBorder = isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'
    const tooltipText = isLight ? '#1e293b' : '#fff'

    const navigate = useNavigate()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [chartRange, setChartRange] = useState(12)
    const [selectedSupplier, setSelectedSupplier] = useState(null)
    const [supplierTxns, setSupplierTxns] = useState(null)
    const [txnLoading, setTxnLoading] = useState(false)

    // Drag and drop state for KPI cards
    const [kpiItems, setKpiItems] = useState([])
    const [dragOverIdx, setDragOverIdx] = useState(null)
    const dragFromIdx = useRef(null)

    useEffect(() => {
        let ignore = false
        setLoading(true)
        const url = deptId ? `/api/overview?department_id=${deptId}` : '/api/overview'
        fetch(url).then(r => r.json()).then(d => { if (!ignore) { setData(d); setLoading(false) } })
        return () => { ignore = true }
    }, [deptId])

    const monthly_trend = data?.monthly_trend || []
    const department_spend = data?.department_spend || []
    const scoa_spend = data?.scoa_spend || []
    const supplier_concentration = data?.supplier_concentration || []

    const kpiData = useMemo(() => {
        if (!data) return []
        const variance = data.kpis.budget_variance
        return [
            { label: 'Total Expenditure', value: fmt(data.kpis.total_spend), icon: RandIcon, color: 'from-gpg-gold to-amber-600', trafficLight: variance > 0 ? 'green' : 'amber', onClick: () => navigate('/contracts') },
            { label: 'Transactions', value: data.kpis.total_transactions.toLocaleString(), icon: FileText, color: 'from-gpg-accent to-blue-600', trafficLight: 'green', onClick: () => navigate('/suppliers') },
            { label: 'Active Suppliers', value: data.kpis.active_suppliers.toLocaleString(), icon: Users, color: 'from-gpg-purple to-violet-600', trafficLight: 'green', onClick: () => navigate('/suppliers') },
            { label: 'Budget Variance', value: `${data.kpis.budget_variance}%`, icon: Activity, color: variance > 0 ? 'from-green-500 to-emerald-700' : 'from-red-500 to-rose-700', trafficLight: variance > 5 ? 'green' : variance > 0 ? 'amber' : 'red', onClick: () => navigate('/maverick') },
        ]
    }, [data, navigate])

    // Sync kpiItems when kpiData changes (new data or dept filter change)
    useEffect(() => { if (kpiData.length) setKpiItems(kpiData) }, [kpiData])

    const actuals = useMemo(() => monthly_trend.filter(m => !m.is_forecast), [monthly_trend])
    const forecast = useMemo(() => monthly_trend.filter(m => m.is_forecast), [monthly_trend])
    const filteredTrend = useMemo(() => [...actuals.slice(-chartRange), ...forecast], [actuals, forecast, chartRange])

    const handleSupplierClick = useCallback((supplier) => {
        setSelectedSupplier(supplier)
        setTxnLoading(true)
        setSupplierTxns(null)
        fetch(`/api/suppliers/${supplier.id}/transactions`)
            .then(r => r.json())
            .then(d => { setSupplierTxns(d); setTxnLoading(false) })
            .catch(() => setTxnLoading(false))
    }, [])

    // Drag handlers
    const handleDragStart = (i) => { dragFromIdx.current = i }
    const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i) }
    const handleDrop = (i) => {
        if (dragFromIdx.current === null || dragFromIdx.current === i) { setDragOverIdx(null); return }
        const next = [...kpiItems]
        const [moved] = next.splice(dragFromIdx.current, 1)
        next.splice(i, 0, moved)
        setKpiItems(next)
        dragFromIdx.current = null
        setDragOverIdx(null)
    }
    const handleDragEnd = () => { dragFromIdx.current = null; setDragOverIdx(null) }

    if (loading || !data) return <Loader />

    const lastActual = actuals[actuals.length - 1]
    const top20pct = supplier_concentration.reduce((s, c) => s + (c.pct_of_total || 0), 0).toFixed(1)

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div>
                <h1 className={`text-2xl font-bold ${isLight ? 'text-gpg-text-primary' : 'bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60'}`}>
                    {deptId ? 'Department Overview' : 'Financial Overview'}
                </h1>
                <p className={`${isLight ? 'text-gpg-text-secondary' : 'text-white/40'} text-sm mt-1`}>
                    24-month expenditure analysis {deptId ? 'for selected department' : 'across all GPG departments'} • Drag cards to customise
                </p>
            </div>

            {/* KPI Cards — Drag & Drop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiItems.map((k, i) => (
                    <div
                        key={k.label}
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDrop={() => handleDrop(i)}
                        onDragEnd={handleDragEnd}
                        className={`cursor-grab active:cursor-grabbing transition-all duration-200 ${dragOverIdx === i ? 'scale-95 opacity-60 ring-2 ring-gpg-gold/50 rounded-xl' : ''}`}
                    >
                        <div className="relative">
                            <div className="absolute top-2 left-2 z-20 opacity-30 hover:opacity-60 transition-opacity">
                                <GripVertical size={14} className="text-gpg-text-secondary" />
                            </div>
                            <KpiCard {...k} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Monthly Trend with Forecast */}
            <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp size={18} className="text-gpg-gold" />
                        Expenditure Trend & Forecast
                    </h3>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center bg-gpg-blue/30 border border-gpg-border rounded-lg p-0.5 shadow-inner">
                            {[6, 12, 24].map(r => (
                                <button key={r} onClick={() => setChartRange(r)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${chartRange === r ? 'bg-gpg-gold text-gpg-navy shadow-md' : 'text-gpg-text-secondary hover:text-gpg-text-primary'}`}>
                                    {r}M
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-medium opacity-70">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Actuals</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400"></span>AI Forecast</span>
                        </div>
                    </div>
                </div>
                <ReactECharts key={theme} option={{
                    tooltip: { trigger: 'axis', backgroundColor: tooltipBg, borderColor: tooltipBorder, textStyle: { color: tooltipText }, axisPointer: { type: 'cross', label: { backgroundColor: '#3b82f6' } } },
                    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
                    xAxis: { type: 'category', data: filteredTrend.map(m => m.month), axisLabel: { color: chartTextColor, margin: 15 }, axisLine: { lineStyle: { color: chartLineColor } }, axisTick: { show: false }, boundaryGap: false },
                    yAxis: { type: 'value', axisLabel: { color: chartTextColor, formatter: v => fmt(v) }, splitLine: { lineStyle: { color: splitLineColor } } },
                    series: [
                        { name: 'Actual Spend', type: 'line', data: filteredTrend.map(m => m.is_forecast ? null : m.total), smooth: true, symbol: 'circle', symbolSize: 6, itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor: '#fff' }, lineStyle: { color: '#3b82f6', width: 3, shadowColor: 'rgba(59,130,246,0.5)', shadowBlur: 10 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: isLight ? 'rgba(37, 99, 235, 0.15)' : 'rgba(59,130,246,0.2)' }, { offset: 1, color: isLight ? 'rgba(37, 99, 235, 0)' : 'rgba(59,130,246,0)' }] } } },
                        { name: 'Forecast', type: 'line', data: filteredTrend.map(m => m.is_forecast ? m.total : (m.month === lastActual?.month ? m.total : null)), smooth: true, symbol: 'none', lineStyle: { color: '#22d3ee', width: 3, type: 'dashed' }, itemStyle: { color: '#22d3ee' } }
                    ]
                }} style={{ height: 350 }} />
            </div>

            {/* Treemap + SCOA */}
            <div className={`grid ${deptId ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
                {!deptId && (
                    <div className="glass-card p-6 h-[500px] flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <PieChart size={18} className="text-gpg-gold" />Spend by Department
                        </h3>
                        <div className="flex-1 min-h-0">
                            <ReactECharts key={theme} option={{
                                tooltip: { formatter: p => `<div class="font-bold mb-1">${p.name}</div><div class="text-sm">Spend: <span class="font-mono text-gpg-gold">R${p.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`, backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', textStyle: { color: '#fff' } },
                                series: [{ type: 'treemap', data: department_spend.map(d => ({ name: d.department.replace('Gauteng ', ''), value: d.total_spend })), leafDepth: 1, roam: false, label: { show: true, color: '#fff', fontSize: 12, formatter: p => `${p.name}\n${fmt(p.value)}`, fontWeight: 'bold' }, itemStyle: { borderColor: '#0f172a', borderWidth: 2, gapWidth: 2 } }]
                            }} style={{ height: '100%', width: '100%' }} />
                        </div>
                    </div>
                )}
                <div className="glass-card p-6 h-[500px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <FileText size={18} className="text-gpg-gold" />Top Expenditure Categories
                    </h3>
                    <div className="flex-1 min-h-0">
                        <ReactECharts key={theme} option={{
                            tooltip: { trigger: 'axis', backgroundColor: tooltipBg, borderColor: tooltipBorder, textStyle: { color: tooltipText }, axisPointer: { type: 'shadow' } },
                            grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
                            xAxis: { type: 'value', axisLabel: { color: chartTextColor, formatter: v => fmt(v) }, splitLine: { lineStyle: { color: splitLineColor } } },
                            yAxis: { type: 'category', data: scoa_spend.slice(0, 10).reverse().map(s => s.category.length > 25 ? s.category.slice(0, 22) + '...' : s.category), axisLabel: { color: chartTextColor, fontSize: 11, width: 140, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false } },
                            series: [{ type: 'bar', data: scoa_spend.slice(0, 10).reverse().map(s => s.total), barWidth: '60%', itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#14b8a6' }] }, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: 'right', formatter: p => fmt(p.value), color: chartTextColor, fontSize: 10, distance: 10 } }]
                        }} style={{ height: '100%', width: '100%' }} />
                    </div>
                </div>
            </div>

            {/* Supplier Concentration Chart */}
            {!deptId && supplier_concentration.length > 0 && (
                <div className="glass-card p-6">
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <BarChart2 size={18} className="text-gpg-gold" />
                            Supplier Concentration — Top 20
                        </h3>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gpg-gold">{top20pct}%</p>
                            <p className="text-xs text-gpg-text-secondary/60">of total provincial spend</p>
                        </div>
                    </div>
                    <p className="text-xs text-gpg-text-secondary/50 mb-4">Click any supplier to drill into their transaction history</p>
                    <ReactECharts key={theme} option={{
                        tooltip: {
                            trigger: 'axis', axisPointer: { type: 'shadow' },
                            backgroundColor: tooltipBg, borderColor: tooltipBorder, textStyle: { color: tooltipText },
                            formatter: (params) => {
                                const d = supplier_concentration[supplier_concentration.length - 1 - params[0].dataIndex]
                                return `<div style="font-weight:bold;margin-bottom:4px">${d?.supplier_name}</div><div>Spend: <b>${fmt(d?.total_spend)}</b></div><div>% of Total: <b>${d?.pct_of_total}%</b></div>`
                            }
                        },
                        grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
                        xAxis: { type: 'value', axisLabel: { color: chartTextColor, formatter: v => fmt(v) }, splitLine: { lineStyle: { color: splitLineColor } } },
                        yAxis: { type: 'category', data: [...supplier_concentration].reverse().map(s => s.supplier_name.length > 30 ? s.supplier_name.slice(0, 28) + '…' : s.supplier_name), axisLabel: { color: chartTextColor, fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
                        series: [{
                            type: 'bar', data: [...supplier_concentration].reverse().map(s => s.total_spend), barWidth: '60%',
                            itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#7c3aed' }, { offset: 1, color: '#3b82f6' }] }, borderRadius: [0, 4, 4, 0] },
                            label: { show: true, position: 'right', formatter: p => `${supplier_concentration[supplier_concentration.length - 1 - p.dataIndex]?.pct_of_total}%`, color: chartTextColor, fontSize: 9 }
                        }]
                    }} style={{ height: Math.max(300, supplier_concentration.length * 28) }} onEvents={{ click: (params) => handleSupplierClick(supplier_concentration[supplier_concentration.length - 1 - params.dataIndex]) }} />
                </div>
            )}

            {/* Supplier Transaction Drill-down Modal */}
            {selectedSupplier && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in p-4" onClick={() => setSelectedSupplier(null)}>
                    <div className="bg-gpg-navy border border-gpg-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gpg-border flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gpg-text-primary">{supplierTxns?.supplier_name || selectedSupplier.supplier_name}</h3>
                                <p className="text-sm text-gpg-text-secondary/60 mt-0.5">
                                    Total spend: <span className="text-gpg-gold font-bold">{fmt(selectedSupplier.total_spend)}</span> •
                                    {selectedSupplier.pct_of_total}% of provincial spend • {selectedSupplier.txn_count?.toLocaleString()} transactions
                                </p>
                            </div>
                            <button onClick={() => setSelectedSupplier(null)} className="text-gpg-text-secondary/40 hover:text-gpg-text-primary transition-colors p-1">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {txnLoading ? (
                                <div className="flex items-center justify-center h-40 text-gpg-text-secondary/50">Loading transactions...</div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gpg-surface/50 text-gpg-text-secondary text-xs uppercase tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Date</th>
                                            <th className="px-4 py-3 text-left">Department</th>
                                            <th className="px-4 py-3 text-left">Category</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gpg-border/30">
                                        {(supplierTxns?.transactions || []).map((t, i) => (
                                            <tr key={i} className="hover:bg-gpg-surface/30 transition-colors">
                                                <td className="px-4 py-3 text-gpg-text-secondary/70 font-mono text-xs">{t.transaction_date?.slice(0, 10)}</td>
                                                <td className="px-4 py-3 text-gpg-text-primary">{t.department?.replace('Gauteng ', '')}</td>
                                                <td className="px-4 py-3 text-gpg-text-secondary/60 text-xs">{t.category}</td>
                                                <td className="px-4 py-3 text-right font-mono text-gpg-gold font-bold">{fmt(t.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t border-gpg-border text-right">
                            <p className="text-xs text-gpg-text-secondary/40">Showing last 50 transactions</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
