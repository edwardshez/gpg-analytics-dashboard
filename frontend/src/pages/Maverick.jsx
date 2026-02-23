import { useState, useEffect } from 'react'
import ReactECharts from 'echarts-for-react'
import { TrendingDown, ArrowDown, AlertTriangle, Settings } from 'lucide-react'
import Loader from '../components/Loader'

const fmt = (n) => n >= 1e9 ? `R${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `R${(n / 1e6).toFixed(1)}M` : `R${(n / 1e3).toFixed(0)}K`

export default function Maverick({ deptId, theme }) {
    const isLight = theme === 'light'
    const chartTextColor = isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'
    const chartLineColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
    const splitLineColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'
    const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.9)' : '#0f2040'
    const tooltipText = isLight ? '#0f172a' : '#fff'

    const [data, setData] = useState(null)
    const [showConfig, setShowConfig] = useState(false)

    useEffect(() => {
        const url = deptId ? `/api/maverick?department_id=${deptId}` : '/api/maverick'
        fetch(url).then(r => r.json()).then(setData)
    }, [deptId])

    if (!data) return <Loader />

    const { overall_maverick_pct, total_maverick_value, by_department, monthly_trend, by_category } = data
    const last6 = monthly_trend.slice(-6)
    const trendDown = last6.length >= 2 && last6[last6.length - 1].maverick_pct < last6[0].maverick_pct

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-amber-300">
                        Maverick Spend Analysis
                    </h1>
                    <p className="text-gpg-text-secondary/60 text-sm mt-1">Off-contract purchasing patterns & compliance</p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Mock Alert Config */}
                    <button onClick={() => setShowConfig(true)} className="flex items-center gap-2 px-4 py-2 bg-gpg-surface hover:bg-gpg-surface-hover border border-gpg-border rounded-lg text-sm transition-colors text-gpg-text-primary">
                        <Settings size={16} />
                        Configure Alerts
                    </button>
                    {showConfig && (
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
                            onClick={() => setShowConfig(false)}
                            onKeyDown={e => (e.key === 'Escape') && setShowConfig(false)}
                            role="dialog"
                            aria-modal="true"
                        >
                            <div className="bg-gpg-navy border border-gpg-border p-6 rounded-xl w-96 shadow-2xl" onClick={e => e.stopPropagation()} role="document">
                                <h3 className="text-lg font-bold mb-4">Alert Configuration</h3>
                                <div className="space-y-4">
                                    <label className="block text-sm" htmlFor="threshold-range">
                                        Maverick Threshold (%)
                                        <input id="threshold-range" type="range" className="w-full mt-2 accent-gpg-gold" />
                                        <div className="flex justify-between text-xs text-gpg-text-secondary/40"><span>0%</span><span>20%</span><span>50%</span></div>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" defaultChecked className="accent-gpg-gold" />
                                        <span className="text-sm">Email CFO on breach</span>
                                    </div>
                                    <button onClick={() => setShowConfig(false)} className="w-full py-2 bg-gpg-gold text-gpg-navy font-bold rounded-lg mt-2">Save Configuration</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gauge Chart & Headline Metrics */}
                <div className="glass-card p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Compliance Score</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-gpg-text-primary">{fmt(total_maverick_value)}</span>
                            <span className="text-sm text-gpg-text-secondary/40">detected violations</span>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center -my-4">
                        <ReactECharts option={{
                            series: [{
                                type: 'gauge',
                                startAngle: 180, endAngle: 0,
                                min: 0, max: 50,
                                splitNumber: 5,
                                itemStyle: { color: '#ef4444' },
                                progress: { show: true, width: 30, itemStyle: { color: overall_maverick_pct > 20 ? '#ef4444' : '#f59e0b' } },
                                pointer: { show: false },
                                axisLine: { lineStyle: { width: 30, color: [[1, isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)']] } },
                                axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                                detail: { valueAnimation: true, offsetCenter: [0, '-10%'], fontSize: 24, fontWeight: 'bold', color: isLight ? '#0f172a' : '#fff', formatter: '{value}%' },
                                data: [{ value: overall_maverick_pct, name: 'Maverick Spend' }]
                            }]
                        }} style={{ height: 200, width: '100%' }} />
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                        <AlertTriangle className="text-red-400 shrink-0" size={18} />
                        <div className="text-sm">
                            <p className="font-semibold text-red-300">Target Exceeded</p>
                            <p className="text-red-300/60 text-xs">Current level is 5% above the 12% tolerance threshold.</p>
                        </div>
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="glass-card p-6 col-span-2">
                    <h3 className="text-lg font-semibold mb-1">Monthly Trend Analysis</h3>
                    <p className="text-gpg-text-secondary/40 text-xs mb-4">6-month trajectory showing {trendDown ? 'positive improvement' : 'mixed results'}</p>
                    <ReactECharts option={{
                        tooltip: { trigger: 'axis', backgroundColor: tooltipBg, borderColor: 'rgba(212,168,67,0.3)', textStyle: { color: tooltipText } },
                        xAxis: { type: 'category', data: monthly_trend.map(m => m.month), axisLabel: { color: chartTextColor }, axisLine: { lineStyle: { color: chartLineColor } } },
                        yAxis: [
                            { type: 'value', name: '%', axisLabel: { color: chartTextColor, formatter: '{value}%' }, splitLine: { lineStyle: { color: splitLineColor } } },
                            { type: 'value', splitLine: { show: false }, show: false }
                        ],
                        series: [
                            {
                                name: 'Maverick %', type: 'line', data: monthly_trend.map(m => m.maverick_pct), smooth: true,
                                lineStyle: { color: '#ef4444', width: 3 }, itemStyle: { color: '#ef4444' },
                                markArea: { silent: true, data: [[{ xAxis: Math.max(0, monthly_trend.length - 6), itemStyle: { color: 'rgba(34,197,94,0.05)' } }, { xAxis: monthly_trend.length - 1 }]] },
                                markLine: { data: [{ yAxis: 15, lineStyle: { color: '#f59e0b', type: 'dashed' }, label: { formatter: 'Tolerance (15%)' } }] }
                            },
                        ],
                        grid: { left: 40, right: 30, top: 40, bottom: 30 },
                    }} style={{ height: 300 }} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold mb-4">Top Maverick Categories</h3>
                    <ReactECharts option={{
                        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: tooltipBg, textStyle: { color: tooltipText } },
                        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
                        xAxis: { type: 'value', axisLabel: { color: chartTextColor, formatter: v => fmt(v) }, splitLine: { lineStyle: { color: splitLineColor } } },
                        yAxis: { type: 'category', data: by_category.map(c => c.category), axisLabel: { color: chartTextColor, width: 120, overflow: 'truncate' } },
                        series: [{
                            name: 'Maverick Value', type: 'bar', data: by_category.map(c => c.value),
                            itemStyle: { color: '#f59e0b', borderRadius: [0, 4, 4, 0] }
                        }]
                    }} style={{ height: 300 }} />
                </div>

                {/* Top Offenders (Departments) */}
                <div className="glass-card p-6 overflow-hidden">
                    <h3 className="text-lg font-semibold mb-4">Department Ranking</h3>
                    <div className="overflow-y-auto max-h-[280px]">
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-gpg-border">
                                {by_department.map((d) => (
                                    <tr key={d.department} className="hover:bg-gpg-surface transition-colors text-gpg-text-primary">
                                        <td className="py-3 font-medium">{d.department.replace('Gauteng ', '')}</td>
                                        <td className="py-3 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <span className="text-gpg-text-secondary/60 text-xs">{fmt(d.maverick_value)}</span>
                                                <span className={`w-12 py-0.5 text-center rounded text-xs font-bold ${d.maverick_pct > 20 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                    {d.maverick_pct}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}


