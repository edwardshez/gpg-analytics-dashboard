import { useState } from 'react'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSSO = () => {
        setLoading(true)
        // Simulate Azure AD redirect and callback
        setTimeout(() => {
            const mockUser = {
                id: 'sso_1',
                name: 'John Doe',
                email: 'john.doe@gauteng.gov.za',
                role: 'CFO',
                department: 'Treasury'
            }
            onLogin('mock_sso_token', mockUser)
            setLoading(false)
        }, 1500)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            const data = await res.json()
            const mockUser = {
                id: 'usr_1',
                name: username || 'Default User',
                role: 'Analyst',
                department: 'Department of Health'
            }
            onLogin(data.token, mockUser)
        } catch {
            alert('Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gpg-dark relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gpg-accent/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gpg-gold/5 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_70%)]" />
            </div>

            <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
                {/* Logo area */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 mb-6 mx-auto transform hover:scale-105 transition-transform duration-500">
                        <img src="/gp.sq-img.png" alt="Gauteng Treasury" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gpg-text-primary to-gpg-text-secondary bg-clip-text text-transparent">
                        GPG Financial Analytics
                    </h1>
                    <p className="text-gpg-text-secondary/60 mt-2 text-sm">Gauteng Provincial Government • Treasury Oversight Platform</p>
                </div>

                {/* Login form */}
                <div className="glass-card p-8 space-y-6">
                    <div className="space-y-4">
                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleSSO}
                            className="w-full py-3 px-4 bg-white text-gray-900 font-semibold rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-all border border-gray-200 shadow-sm disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 0h10v10H0z" fill="#f25022" /><path d="M11 0h10v10H11z" fill="#7fbb00" /><path d="M0 11h10v10H0z" fill="#00a4ef" /><path d="M11 11h10v10H11z" fill="#ffb900" />
                            </svg>
                            {loading ? 'Connecting...' : 'Sign in with Microsoft'}
                        </button>

                        <div className="relative flex items-center gap-4 py-2">
                            <div className="flex-1 h-px bg-gpg-border"></div>
                            <span className="text-[10px] text-gpg-text-secondary/40 font-bold uppercase tracking-widest whitespace-nowrap">Or use credentials</span>
                            <div className="flex-1 h-px bg-gpg-border"></div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-[10px] font-bold text-gpg-text-secondary/60 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                            <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gpg-surface/50 border border-gpg-border rounded-lg text-gpg-text-primary placeholder-gpg-text-secondary/20 focus:outline-none focus:border-gpg-gold/50 focus:ring-1 focus:ring-gpg-gold/30 transition-all text-sm"
                                placeholder="Enter your username" required />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-[10px] font-bold text-gpg-text-secondary/60 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                            <div className="relative">
                                <input id="password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gpg-surface/50 border border-gpg-border rounded-lg text-gpg-text-primary placeholder-gpg-text-secondary/20 focus:outline-none focus:border-gpg-gold/50 focus:ring-1 focus:ring-gpg-gold/30 transition-all text-sm pr-12"
                                    placeholder="Enter your password" required />
                                <button type="button" onClick={() => setShowPw(!showPw)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gpg-text-secondary/30 hover:text-gpg-text-primary transition-colors">
                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-gpg-gold to-gpg-accent text-white font-bold rounded-lg hover:shadow-lg hover:shadow-gpg-gold/20 transition-all duration-300 disabled:opacity-50 mt-2">
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                    <p className="text-center text-gpg-text-secondary/40 text-[10px] uppercase font-bold tracking-tighter">Secure Gauteng Government Gateway</p>
                </div>
            </div>
        </div>
    )
}
