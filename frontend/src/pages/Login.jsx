import { useState } from 'react'
import { ShieldCheck, Eye, EyeOff, Smartphone, Lock } from 'lucide-react'

export default function Login({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mfaStep, setMfaStep] = useState(false)
    const [mfaCode, setMfaCode] = useState('')
    const [mfaError, setMfaError] = useState('')
    const [pendingUser, setPendingUser] = useState(null)
    const [pendingToken, setPendingToken] = useState(null)

    const goToMFA = (token, user) => {
        setPendingToken(token)
        setPendingUser(user)
        setMfaStep(true)
    }

    const handleSSO = () => {
        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            goToMFA('mock_sso_token', {
                id: 'sso_1', name: 'John Doe',
                email: 'john.doe@gauteng.gov.za',
                role: 'CFO', department: 'Treasury'
            })
        }, 1200)
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
            setLoading(false)
            goToMFA(data.token, {
                id: 'usr_1', name: username || 'Default User',
                role: 'Analyst', department: 'Department of Health'
            })
        } catch {
            alert('Login failed')
            setLoading(false)
        }
    }

    const handleMFA = (e) => {
        e.preventDefault()
        if (mfaCode.replace(/\s/g, '').length < 6) {
            setMfaError('Please enter the 6-digit code shown above')
            return
        }
        setLoading(true)
        setTimeout(() => onLogin(pendingToken, pendingUser), 700)
    }

    const BG = () => (
        <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gpg-accent/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gpg-gold/5 rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_70%)]" />
        </div>
    )

    if (mfaStep) return (
        <div className="min-h-screen flex items-center justify-center bg-gpg-dark relative overflow-hidden">
            <BG />
            <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 mb-4 bg-gpg-gold/10 rounded-2xl border border-gpg-gold/20">
                        <Smartphone size={36} className="text-gpg-gold" />
                    </div>
                    <h1 className="text-2xl font-bold text-gpg-text-primary">Two-Factor Authentication</h1>
                    <p className="text-gpg-text-secondary/60 mt-2 text-sm">Enter the 6-digit code from your Microsoft Authenticator app</p>
                </div>
                <div className="glass-card p-8">
                    <div className="bg-gpg-surface rounded-lg p-4 mb-6 border border-gpg-gold/20 text-center">
                        <p className="text-xs text-gpg-text-secondary/50 mb-2 uppercase tracking-widest font-bold">Demo Authenticator Code</p>
                        <p className="text-3xl font-mono font-bold text-gpg-gold tracking-[0.4em]">482 917</p>
                        <p className="text-[10px] text-gpg-text-secondary/30 mt-2">Valid for 28 seconds • Microsoft Authenticator</p>
                    </div>
                    <form onSubmit={handleMFA} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gpg-text-secondary/60 uppercase tracking-widest mb-2 ml-1">Authentication Code</label>
                            <input
                                type="text" inputMode="numeric" maxLength={7}
                                value={mfaCode}
                                onChange={e => { setMfaCode(e.target.value.replace(/[^\d\s]/g, '')); setMfaError('') }}
                                placeholder="_ _ _ _ _ _"
                                className="w-full px-4 py-3 bg-gpg-surface/50 border border-gpg-border rounded-lg text-gpg-text-primary placeholder-gpg-text-secondary/20 focus:outline-none focus:border-gpg-gold/50 focus:ring-1 focus:ring-gpg-gold/30 transition-all text-center text-2xl tracking-[0.5em] font-mono"
                                autoFocus
                            />
                            {mfaError && <p className="text-red-400 text-xs mt-1 text-center">{mfaError}</p>}
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-gpg-gold to-gpg-accent text-white font-bold rounded-lg hover:shadow-lg hover:shadow-gpg-gold/20 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2">
                            <Lock size={16} />
                            {loading ? 'Verifying...' : 'Verify & Sign In'}
                        </button>
                        <button type="button" onClick={() => { setMfaStep(false); setMfaCode('') }}
                            className="w-full text-center text-xs text-gpg-text-secondary/40 hover:text-gpg-text-primary transition-colors py-2">
                            ← Back to login
                        </button>
                    </form>
                    <div className="mt-4 pt-4 border-t border-gpg-border flex items-center gap-2 justify-center">
                        <ShieldCheck size={12} className="text-gpg-gold/60" />
                        <p className="text-center text-gpg-text-secondary/40 text-[10px] uppercase font-bold tracking-tighter">Secure Gauteng Government Gateway</p>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen flex items-center justify-center bg-gpg-dark relative overflow-hidden">
            <BG />
            <div className="relative z-10 w-full max-w-md px-6 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 mb-6 mx-auto transform hover:scale-105 transition-transform duration-500">
                        <img src="/gp.sq-img.png" alt="Gauteng Treasury" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gpg-text-primary to-gpg-text-secondary bg-clip-text text-transparent">
                        GPG Financial Analytics
                    </h1>
                    <p className="text-gpg-text-secondary/60 mt-2 text-sm">Gauteng Provincial Government • Treasury Oversight Platform</p>
                </div>
                <div className="glass-card p-8 space-y-6">
                    <div className="space-y-4">
                        <button type="button" disabled={loading} onClick={handleSSO}
                            className="w-full py-3 px-4 bg-white text-gray-900 font-semibold rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition-all border border-gray-200 shadow-sm disabled:opacity-50">
                            <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 0h10v10H0z" fill="#f25022" /><path d="M11 0h10v10H11z" fill="#7fbb00" />
                                <path d="M0 11h10v10H0z" fill="#00a4ef" /><path d="M11 11h10v10H11z" fill="#ffb900" />
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
