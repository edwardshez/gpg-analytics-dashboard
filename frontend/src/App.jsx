import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './index.css'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('gpg_token'))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gpg_user')
    return saved ? JSON.parse(saved) : null
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('gpg_theme') || 'dark')

  useEffect(() => {
    const root = window.document.documentElement
    const body = window.document.body
    root.classList.remove('light', 'dark')
    body.classList.remove('light', 'dark')
    root.classList.add(theme)
    body.classList.add(theme)
    localStorage.setItem('gpg_theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleLogin = (t, u) => {
    localStorage.setItem('gpg_token', t)
    localStorage.setItem('gpg_user', JSON.stringify(u))
    setToken(t)
    setUser(u)
  }

  const handleLogout = () => {
    localStorage.removeItem('gpg_token')
    localStorage.removeItem('gpg_user')
    setToken(null)
    setUser(null)
  }

  const getLandingPage = () => {
    if (!user) return '/'
    if (user.role === 'Auditor') return '/anomalies'
    if (user.role === 'Analyst') return '/suppliers'
    return '/'
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to={getLandingPage()} replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/*" element={token ? <Dashboard onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} user={user} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}
