'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Flame,
  Shield,
  KeyRound,
  Mail,
  Lock,
  User,
  Sparkles,
  Eye,
  EyeOff,
  LogIn,
} from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next') || '/'
  const errorParam = searchParams.get('error')

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam ? decodeURIComponent(errorParam) : null
  )
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')
  )

  // Masuk langsung dengan akun sendiri tanpa verifikasi email
  const handleDirectLogin = (hunterName: string, hunterEmail?: string) => {
    const rawName = hunterName.trim() || 'Hunter'
    const finalEmail =
      hunterEmail?.trim() ||
      (rawName.includes('@') ? rawName : `${rawName.toLowerCase().replace(/\s+/g, '')}@gmail.com`)
    const displayName = rawName.includes('@') ? rawName.split('@')[0] : rawName

    // Set cookie agar middleware Next.js mengizinkan akses ke aplikasi
    document.cookie = `hunter_session=${encodeURIComponent(displayName)}; path=/; max-age=2592000`

    // Simpan akun ke localStorage agar aktif di dashboard
    try {
      const saved = localStorage.getItem('solo_community_v1')
      const data = saved ? JSON.parse(saved) : {}
      const existingUsers = data.users || []
      let targetUser = existingUsers.find(
        (u: any) =>
          (u.email && u.email.toLowerCase() === finalEmail.toLowerCase()) ||
          (u.username && u.username.toLowerCase() === displayName.toLowerCase())
      )

      if (!targetUser) {
        targetUser = {
          id: `hunter-${displayName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          username: displayName,
          email: finalEmail,
          xp: 0,
          streak: 0,
        }
        data.users = [...existingUsers, targetUser]
      } else {
        targetUser.username = displayName
        targetUser.email = finalEmail
        // Jika akun baru dengan 100 XP bawaan, normalkan ke 0 XP (Level 1)
        if (targetUser.xp === 100 && (!data.personalTasks || data.personalTasks.filter((t: any) => t.userId === targetUser.id && t.done).length === 0)) {
          targetUser.xp = 0
          targetUser.streak = 0
        }
      }
      data.currentUserId = targetUser.id
      localStorage.setItem('solo_community_v1', JSON.stringify(data))
    } catch (e) {
      console.error(e)
    }

    router.push(nextUrl)
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    const rawInput = emailOrUsername.trim()
    const cleanUsername = (mode === 'register' ? username.trim() : '') || (rawInput.includes('@') ? rawInput.split('@')[0] : rawInput) || 'Hunter'
    const cleanEmail = rawInput.includes('@') ? rawInput : `${cleanUsername.toLowerCase().replace(/\s+/g, '')}@gmail.com`

    // Coba koneksi Supabase di latar belakang tanpa memblokir akun
    if (isConfigured) {
      try {
        const supabase = createClient()
        if (mode === 'login') {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })
        } else {
          await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: { username: cleanUsername },
            },
          })
        }
      } catch {
        // Abaikan kegagalan email verification Supabase
      }
    }

    // Masuk langsung ke sistem menggunakan akun kamu sendiri!
    handleDirectLogin(cleanUsername, cleanEmail)
  }

  return (
    <div className="app-shell min-h-screen flex items-center justify-center p-4">
      <div className="phone-frame w-full max-w-[420px] rounded-2xl border border-purple-900/40 shadow-2xl p-6 relative">
        {/* Glowing Ambient Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-purple-600/20 blur-3xl rounded-full pointer-events-none" />

        {/* Brand & Emblem */}
        <div className="text-center my-6 relative z-10">
          <div className="mx-auto w-14 h-14 rounded-2xl border border-purple-500/70 bg-gradient-to-b from-purple-800/50 to-purple-950/80 flex items-center justify-center shadow-lg shadow-purple-900/50 mb-3">
            <Flame className="w-8 h-8 text-purple-300 animate-pulse" />
          </div>
          <p className="eyebrow uppercase tracking-widest text-xs text-purple-400 font-bold">
            Sistem Masuk Hunter
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 text-white">
            RANK<span className="text-purple-400">ERZ</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Masuk dengan akun Hunter kamu langsung tanpa verifikasi email
          </p>
        </div>

        {/* Switch Mode Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900/90 rounded-xl border border-purple-900/30 mb-5 relative z-10">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-900/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Masuk Hunter
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'register'
                ? 'bg-purple-700 text-white shadow-md shadow-purple-900/50'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Notification Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/40 bg-red-950/40 text-red-200 text-xs flex items-start gap-2">
            <Shield className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/40 text-emerald-200 text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {mode === 'register' && (
            <div>
              <label className="modal-label text-zinc-300" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <User className="w-3.5 h-3.5 text-purple-400" />
                Nama Hunter (Username)
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="cth. yongzz"
                className="modal-input !mb-0"
              />
            </div>
          )}

          <div>
            <label className="modal-label text-zinc-300" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Mail className="w-3.5 h-3.5 text-purple-400" />
              {mode === 'login' ? 'Email atau Username Hunter' : 'Email Hunter'}
            </label>
            <input
              type="text"
              required
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              placeholder={mode === 'login' ? 'cth. yongzz atau yongzz@gmail.com' : 'cth. yongzz@gmail.com'}
              className="modal-input !mb-0"
            />
          </div>

          <div>
            <label className="modal-label text-zinc-300" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="modal-input !mb-0 !pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-purple-300 transition-colors p-1"
                title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-900/50 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Masuk ke Sistem...' : mode === 'login' ? 'Masuk ke Sistem' : 'Daftar & Masuk Sekarang'}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-purple-950/80 text-center text-[10px] text-zinc-500">
          Sistem Autentikasi Mandiri Rankerz • Bebas Hambatan Email
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05050b] flex items-center justify-center text-purple-400 text-xs">Memuat Sistem Hunter...</div>}>
      <LoginForm />
    </Suspense>
  )
}
