import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { FileText, Users, TrendingUp, Activity, PieChart } from 'lucide-react'

// Custom Rand Icon (Plain Letter R)
const RandIcon = ({ size = 20, className = "" }) => (
    <div
        style={{ width: size, height: size, fontSize: size * 0.75 }}
        className={`${className} flex items-center justify-center font-bold font-sans`}
    >
        R
    </div>
)
import Loader from '../components/Loader'
import KpiCard from '../components/KpiCard'

const fmt = (n) => {
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
    const [chartRange, setChartRange] = useState(12) // Default to 12 months

    useEffect(() => {
        let ignore = false
        const url = deptId ? `/api/overview?department_id=${deptId}` : '/api/overview'
        fetch(url)
            .then(r => r.json())
            .then(d => {
                if (!ignore) {
                    setData(d)
                    setLoading(false)
                }
            })
        return () => { ignore = true }
    }, [deptId])

    const kpiData = useMemo(() => {
        if (!data) return []
        return [
            {
                label: 'Total Expenditure',
                value: fmt(data.kpis.total_spend),
                icon: RandIcon,
                color: 'from-gpg-gold to-amber-600',
                onClick: () => navigate('/contracts') // Navigate to Contracts
            },
            {
                label: 'Transactions',
                value: data.kpis.total_transactions.toLocaleString(),
                icon: FileText,
                color: 'from-gpg-accent to-blue-600',
                onClick: () => navigate('/suppliers') // Navigate to Suppliers
            },
            {
                label: 'Active Suppliers',
                value: data.kpis.active_suppliers.toLocaleString(),
                icon: Users,
                color: 'from-gpg-purple to-violet-600',
                onClick: () => navigate('/suppliers')
            },
            {
                label: 'Budget Variance',
                value: `${data.kpis.budget_variance}%`,
                icon: Activity,
                color: data.kpis.budget_variance > 0 ? 'from-green-500 to-emerald-700' : 'from-red-500 to-rose-700',
                onClick: () => navigate('/maverick') // Navigate to Maverick/anomalies (closest fit)
            },
        ]
    }, [data, navigate])

    const monthly_trend = data?.monthly_trend || []
    const department_spend = data?.department_spend || []
    const scoa_spend = data?.scoa_spend || []

    const actuals = useMemo(() => monthly_trend.filter(m => !m.is_forecast), [monthly_trend])
    const forecast = useMemo(() => monthly_trend.filter(m => m.is_forecast), [monthly_trend])
    const lastActual = actuals[actuals.length - 1]

    const filteredTrend = useMemo(() => {
        const history = actuals.slice(-chartRange)
        return [...history, ...forecast]
    }, [actuals, forecast, chartRange])

    if (loading || !data) return <Loader />

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div>
                <h1 className={`text-2xl font-bold ${isLight ? 'text-gpg-text-primary' : 'bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60'}`}>
                    {deptId ? 'Department Overview' : 'Financial Overview'}
                </h1>
                <p className={`${isLight ? 'text-gpg-text-secondary' : 'text-white/40'} text-sm mt-1`}>
                    24-month expenditure analysis {deptId ? 'for selected department' : 'across all GPG departments'}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map((k) => (
                    <KpiCard key={k.label} {...k} />
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
                                <button
                                    key={r}
                                    onClick={() => setChartRange(r)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${chartRange === r ? 'bg-gpg-gold text-gpg-navy shadow-md' : 'text-gpg-text-secondary hover:text-gpg-text-primary'}`}
                                >
                                    {r}M
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-medium opacity-70">
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Actuals</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400 border border-dashed border-white/30"></span>AI Forecast</span>
                        </div>
                    </div>
                </div>
                <ReactECharts key={theme} option={{
                    tooltip: {
                        trigger: 'axis',
                        backgroundColor: tooltipBg,
                        borderColor: tooltipBorder,
                        textStyle: { color: tooltipText },
                        axisPointer: { type: 'cross', label: { backgroundColor: '#3b82f6' } }
                    },
                    grid: { left: '3%', right: '4%', bottom: '3%', top: '5%', containLabel: true },
                    xAxis: {
                        type: 'category',
                        data: filteredTrend.map(m => m.month),
                        axisLabel: { color: chartTextColor, margin: 15 },
                        axisLine: { lineStyle: { color: chartLineColor } },
                        axisTick: { show: false },
                        boundaryGap: false
                    },
                    yAxis: {
                        type: 'value',
                        axisLabel: { color: chartTextColor, formatter: v => fmt(v) },
                        splitLine: { lineStyle: { color: splitLineColor } }
                    },
                    series: [
                        {
                            name: 'Actual Spend',
                            type: 'line',
                            data: filteredTrend.map(m => m.is_forecast ? null : m.total),
                            smooth: true,
                            symbol: 'circle',
                            symbolSize: 6,
                            itemStyle: { color: '#3b82f6', borderWidth: 2, borderColor: '#fff' },
                            lineStyle: { color: '#3b82f6', width: 3, shadowColor: 'rgba(59,130,246,0.5)', shadowBlur: 10 },
                            areaStyle: {
                                color: {
                                    type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                    colorStops: [
                                        { offset: 0, color: isLight ? 'rgba(37, 99, 235, 0.15)' : 'rgba(59,130,246,0.2)' },
                                        { offset: 1, color: isLight ? 'rgba(37, 99, 235, 0)' : 'rgba(59,130,246,0)' }
                                    ]
                                }
                            }
                        },
                        {
                            name: 'Forecast',
                            type: 'line',
                            data: filteredTrend.map(m => m.is_forecast ? m.total : (m.month === lastActual?.month ? m.total : null)),
                            smooth: true,
                            symbol: 'none',
                            lineStyle: { color: '#22d3ee', width: 3, type: 'dashed' },
                            itemStyle: { color: '#22d3ee' }
                        }
                    ]
                }} style={{ height: 350 }} />
            </div>

            {/* Department Spend Treemap (Hide if dept selected) + SCOA Categories */}
            <div className={`grid ${deptId ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-6`}>
                {!deptId && (
                    <div className="glass-card p-6 h-[500px] flex flex-col">
                        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <PieChart size={18} className="text-gpg-gold" />
                            Spend by Department
                        </h3>
                        <div className="flex-1 min-h-0">
                            <ReactECharts
                                key={theme}
                                option={{
                                    tooltip: {
                                        formatter: p => `
                                            <div class="font-bold mb-1">${p.name}</div>
                                            <div class="text-sm">Spend: <span class="font-mono text-gpg-gold">${fmt(p.value)}</span></div>
                                        `,
                                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        textStyle: { color: '#fff' }
                                    },
                                    series: [{
                                        type: 'treemap',
                                        data: department_spend.map(d => ({
                                            name: d.department.replace('Gauteng ', ''),
                                            value: d.total_spend,
                                            itemStyle: { color: null } // Use auto colors or define palette
                                        })),
                                        leafDepth: 1,
                                        roam: false,
                                        label: {
                                            show: true,
                                            color: '#fff',
                                            fontSize: 12,
                                            formatter: '{b}\n{c}',
                                            fontWeight: 'bold'
                                        },
                                        itemStyle: {
                                            borderColor: '#0f172a',
                                            borderWidth: 2,
                                            gapWidth: 2,
                                            colorSaturation: [0.3, 0.7]
                                        },
                                        levels: [
                                            { itemStyle: { borderColor: '#0f172a', borderWidth: 4, gapWidth: 4 } },
                                            { colorSaturation: [0.3, 0.6], itemStyle: { borderColorSaturation: 0.6, gapWidth: 1 } }
                                        ]
                                    }],
                                }}
                                style={{ height: '100%', width: '100%' }}
                            />
                        </div>
                    </div>
                )}

                <div className="glass-card p-6 h-[500px] flex flex-col">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <FileText size={18} className="text-gpg-gold" />
                        Top Expenditure Categories
                    </h3>
                    <div className="flex-1 min-h-0">
                        <ReactECharts
                            key={theme}
                            option={{
                                tooltip: {
                                    trigger: 'axis',
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    textStyle: { color: '#fff' },
                                    axisPointer: { type: 'shadow' }
                                },
                                grid: { left: '3%', right: '4%', bottom: '3%', top: '3%', containLabel: true },
                                xAxis: {
                                    type: 'value',
                                    axisLabel: { color: 'rgba(255,255,255,0.5)', formatter: v => fmt(v) },
                                    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
                                },
                                yAxis: {
                                    type: 'category',
                                    data: scoa_spend.slice(0, 10).reverse().map(s => s.category.length > 25 ? s.category.slice(0, 22) + '...' : s.category),
                                    axisLabel: { color: '#fff', fontSize: 11, width: 140, overflow: 'truncate' },
                                    axisLine: { show: false },
                                    axisTick: { show: false }
                                },
                                series: [{
                                    type: 'bar',
                                    data: scoa_spend.slice(0, 10).reverse().map(s => s.total),
                                    barWidth: '60%',
                                    itemStyle: {
                                        color: {
                                            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                                            colorStops: [
                                                { offset: 0, color: '#3b82f6' },
                                                { offset: 1, color: '#14b8a6' }
                                            ]
                                        },
                                        borderRadius: [0, 4, 4, 0]
                                    },
                                    label: {
                                        show: true,
                                        position: 'right',
                                        formatter: p => fmt(p.value),
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: 10,
                                        distance: 10
                                    }
                                }],
                            }}
                            style={{ height: '100%', width: '100%' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
