import { ArrowDown, ArrowUp } from 'lucide-react'

// Standard KPI Card with Glassmorphism and Hover Effects
export default function KpiCard({
    label,
    value,
    icon: Icon,
    color,
    trend,
    trendLabel,
    onClick
}) {
    return (
        <div
            onClick={onClick}
            onKeyDown={e => onClick && (e.key === 'Enter' || e.key === ' ') && onClick()}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            className={`glass-card kpi-card p-6 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-lg hover:shadow-gpg-gold/5' : ''}`}
        >
            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-xs font-semibold text-gpg-text-secondary/80 uppercase tracking-wider">{label}</span>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg transform group-hover:rotate-3 transition-transform`}>
                    <Icon size={18} className="text-white" />
                </div>
            </div>

            <p className="text-3xl font-bold relative z-10 text-gpg-text-primary">{value}</p>

            {/* Optional Trend Indicator */}
            {trend && (
                <div className={`flex items-center gap-1 text-sm mt-2 relative z-10 ${trend.type === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {trend.type === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    <span>{trend.value}</span>
                    {trendLabel && <span className="text-gpg-text-secondary/40 text-xs ml-1">{trendLabel}</span>}
                </div>
            )}

            {/* Decorative background element */}
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-10 blur-xl group-hover:opacity-20 transition-opacity duration-500`} />
        </div>
    )
}
