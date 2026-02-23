import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    TrendingDown,
    Users,
    FileText,
    AlertTriangle,
    LogOut,
    Shield,
    Search,
    Bell,
    ChevronDown,
    Menu,
    Sun,
    Moon
} from 'lucide-react'
import Overview from './Overview'
import Maverick from './Maverick'
import Suppliers from './Suppliers'
import Contracts from './Contracts'
import Anomalies from './Anomalies'

const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Overview' },
    { to: '/maverick', icon: TrendingDown, label: 'Maverick Spend' },
    { to: '/suppliers', icon: Users, label: 'Suppliers' },
    { to: '/contracts', icon: FileText, label: 'Contracts' },
    { to: '/anomalies', icon: AlertTriangle, label: 'Anomaly Alerts' },
]

export default function Dashboard({ onLogout, theme, toggleTheme, user }) {
    const location = useLocation()
    const navigate = useNavigate()
    const [departments, setDepartments] = useState([])
    const [selectedDept, setSelectedDept] = useState('')
    const [search, setSearch] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [showResults, setShowResults] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    useEffect(() => {
        fetch('/api/departments').then(r => r.json()).then(setDepartments)
    }, [])

    useEffect(() => {
        if (search.length > 1) {
            const timer = setTimeout(() => {
                fetch(`/api/search?q=${search}`).then(r => r.json()).then(setSearchResults)
                setShowResults(true)
            }, 300)
            return () => clearTimeout(timer)
        } else {
            setSearchResults([])
            setShowResults(false)
        }
    }, [search])

    const handleSearchClick = (res) => {
        setShowResults(false)
        setSearch('')
        if (res.type === 'Supplier') navigate('/suppliers') // In real app, filter to supplier
        if (res.type === 'Contract') navigate('/contracts') // In real app, filter to contract
    }

    const pageTitle = NAV.find(n => n.to === location.pathname)?.label || 'Dashboard'

    return (
        <div className="flex h-screen overflow-hidden bg-gpg-dark text-gpg-text-primary font-sans">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-64 bg-gpg-navy/95 border-r border-gpg-border flex flex-col shrink-0 z-50 
                transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-gpg-border bg-white/5 shadow-inner">
                    <img src="/gp.v-img.png" alt="Gauteng Treasury" className="h-12 w-auto mx-auto drop-shadow-sm filter brightness-110" />
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    {NAV.map(n => (
                        <NavLink key={n.to} to={n.to} end={n.to === '/'}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => `sidebar-link group relative ${isActive ? 'active' : 'hover:bg-white/5'}`}>
                            {({ isActive }) => (
                                <>
                                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gpg-gold rounded-r-md shadow-[0_0_10px_rgba(198,156,58,0.5)]"></div>}
                                    <n.icon size={18} className={`transition-colors ${isActive ? 'text-gpg-gold-light' : 'text-gpg-text-secondary group-hover:text-gpg-text-primary'}`} />
                                    <span className={`font-medium ${isActive ? 'text-gpg-text-primary' : 'text-gpg-text-secondary group-hover:text-gpg-text-primary'}`}>{n.label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gpg-border bg-black/5 dark:bg-black/20">
                    <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gpg-gold to-gpg-accent flex items-center justify-center text-xs font-bold ring-2 ring-black/10 dark:ring-black/50 text-white shadow-lg">
                                {user?.name?.split(' ').map(n => n[0]).join('') || '??'}
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gpg-navy shadow-sm animate-pulse"></div>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-gpg-text-primary group-hover:text-gpg-gold transition-colors truncate">{user?.name || 'Unknown User'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] px-1.5 py-0.5 bg-gpg-gold/10 dark:bg-gpg-gold/20 text-gpg-gold rounded-full font-bold uppercase tracking-widest border border-gpg-gold/10">{user?.role || 'Guest'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 border-b border-gpg-border bg-gpg-navy/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4 text-sm text-gpg-text-secondary">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="p-2 -ml-2 hover:bg-gpg-surface rounded-lg md:hidden text-gpg-text-primary"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="opacity-50 text-gpg-text-secondary">Home</span>
                            <span className="opacity-30 text-gpg-text-secondary">/</span>
                            <span className="text-gpg-text-primary font-medium">{pageTitle}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Department Filter (Enhanced) */}
                        <div className="relative hidden sm:block">
                            <select
                                value={selectedDept}
                                onChange={e => setSelectedDept(e.target.value)}
                                className="appearance-none bg-gpg-blue/50 border border-gpg-border rounded-lg pl-4 pr-10 py-2 text-xs font-medium text-gpg-text-primary focus:outline-none focus:border-gpg-gold/50 cursor-pointer min-w-[180px] hover:bg-gpg-blue/80 transition-colors shadow-sm"
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gpg-text-secondary/50 pointer-events-none" size={14} />
                        </div>

                        {/* Global Search */}
                        <div className="relative w-64 hidden xl:block group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="text-gpg-text-secondary/30 group-focus-within:text-gpg-gold/80 transition-colors" size={15} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search ecosystem..."
                                className="w-full bg-gpg-blue/30 border border-gpg-border rounded-lg pl-9 pr-4 py-2 text-sm text-gpg-text-primary placeholder-gpg-text-secondary/20 focus:outline-none focus:ring-1 focus:ring-gpg-gold/30 focus:bg-gpg-blue/50 transition-all shadow-inner"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />

                            {showResults && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-gpg-navy border border-gpg-border rounded-lg shadow-2xl overflow-hidden animate-fade-in z-50">
                                    <div className="px-3 py-2 text-[10px] uppercase font-bold text-gpg-text-secondary/30 bg-black/20">Search Results</div>
                                    {searchResults.map((r) => (
                                        <button key={r.label} onClick={() => handleSearchClick(r)}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-gpg-surface flex items-center justify-between group border-b border-gpg-border last:border-0">
                                            <span className="text-gpg-text-primary group-hover:text-gpg-gold transition-colors">{r.label}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gpg-surface text-gpg-text-secondary">{r.type}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="h-8 w-px bg-gpg-border"></div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-gpg-text-secondary hover:text-gpg-gold hover:bg-gpg-surface rounded-lg transition-colors"
                                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                            >
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                            <button className="relative p-2 text-gpg-text-secondary hover:text-gpg-text-primary hover:bg-gpg-surface rounded-lg transition-colors">
                                <Bell size={18} />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-gpg-red rounded-full border-2 border-gpg-navy"></span>
                            </button>
                            <button onClick={onLogout} className="p-2 text-gpg-text-secondary hover:text-gpg-red hover:bg-gpg-red/10 rounded-lg transition-colors" title="Sign Out">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 relative">
                    <Routes>
                        <Route path="/" element={<Overview deptId={selectedDept} theme={theme} />} />
                        <Route path="/maverick" element={<Maverick deptId={selectedDept} theme={theme} />} />
                        <Route path="/suppliers" element={<Suppliers deptId={selectedDept} theme={theme} />} />
                        <Route path="/contracts" element={<Contracts deptId={selectedDept} theme={theme} />} />
                        <Route path="/anomalies" element={<Anomalies deptId={selectedDept} theme={theme} />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}
