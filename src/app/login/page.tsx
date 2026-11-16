'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import {
  ArrowLeft,
  Bookmark,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Sparkle,
  Star,
  User,
} from 'lucide-react'

const STARS = [
  { left: '6%', top: '8%', size: 2, opacity: 0.78, duration: '3.2s' },
  { left: '17%', top: '10%', size: 1, opacity: 0.42, duration: '4.6s' },
  { left: '31%', top: '7%', size: 2, opacity: 0.86, duration: '2.8s' },
  { left: '58%', top: '9%', size: 1, opacity: 0.50, duration: '4.2s' },
  { left: '72%', top: '16%', size: 3, opacity: 0.92, duration: '2.4s' },
  { left: '9%', top: '24%', size: 1, opacity: 0.38, duration: '5s' },
  { left: '24%', top: '30%', size: 2, opacity: 0.64, duration: '3.9s' },
  { left: '46%', top: '28%', size: 1, opacity: 0.74, duration: '2.7s' },
  { left: '80%', top: '31%', size: 2, opacity: 0.56, duration: '4.4s' },
  { left: '5%', top: '41%', size: 2, opacity: 0.58, duration: '3.6s' },
  { left: '18%', top: '47%', size: 1, opacity: 0.80, duration: '2.9s' },
  { left: '54%', top: '44%', size: 1, opacity: 0.48, duration: '4.8s' },
  { left: '77%', top: '48%', size: 2, opacity: 0.84, duration: '2.3s' },
  { left: '12%', top: '59%', size: 1, opacity: 0.50, duration: '4.1s' },
  { left: '31%', top: '64%', size: 2, opacity: 0.68, duration: '3.3s' },
  { left: '59%', top: '58%', size: 1, opacity: 0.92, duration: '2.2s' },
  { left: '83%', top: '65%', size: 1, opacity: 0.56, duration: '4.7s' },
  { left: '7%', top: '79%', size: 1, opacity: 0.46, duration: '4.9s' },
  { left: '22%', top: '82%', size: 2, opacity: 0.76, duration: '3.1s' },
  { left: '63%', top: '77%', size: 1, opacity: 0.62, duration: '3.8s' },
  { left: '89%', top: '82%', size: 2, opacity: 0.42, duration: '4.5s' },
]

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()

    setLoading(false)
    if (data.code === 0) {
      router.push('/admin')
    } else {
      setError(data.err_msg || '登录失败')
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-admin-tint-soft text-admin-ink-strong">
      <Link
        href="/"
        className="fixed left-4 top-4 z-50 inline-flex h-11 items-center gap-2 rounded-full border border-admin-line bg-admin-surface/80 px-4 text-sm font-extrabold text-admin-violet shadow-[0_10px_30px_rgba(90,72,150,0.10)] backdrop-blur-xl transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-x-0.5 hover:bg-admin-surface hover:shadow-[0_14px_34px_rgba(90,72,150,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/55 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-x-0 lg:left-7 lg:top-7 lg:border-white/20 lg:bg-white/10 lg:text-white lg:shadow-[0_12px_34px_rgba(4,2,22,0.18)] lg:hover:bg-white/15 lg:focus-visible:ring-white/70 lg:focus-visible:ring-offset-[#19133f]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>返回主页</span>
      </Link>

      <div className="fixed right-4 top-4 z-50 lg:right-7 lg:top-7">
        <ThemeToggle className="h-11 w-11 rounded-full border border-admin-line bg-admin-surface/80 text-admin-violet shadow-[0_10px_30px_rgba(90,72,150,0.10)] backdrop-blur-xl hover:bg-admin-surface hover:text-admin-accent" />
      </div>

      <div className="flex min-h-screen">
        <section className="relative hidden min-h-screen w-[45%] overflow-hidden bg-[#110b35] lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_36%,rgba(133,105,255,0.30),transparent_30%),radial-gradient(circle_at_72%_70%,rgba(196,181,253,0.16),transparent_30%),linear-gradient(145deg,#211b4f_0%,#242040_45%,#110d34_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_42%,rgba(167,139,250,0.13),transparent_42%)]" />
          {STARS.map((star, index) => (
            <span
              key={index}
              className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.58)] animate-pulse motion-reduce:animate-none"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                animationDuration: star.duration,
              }}
            />
          ))}

          <div className="absolute left-[9%] top-[16%] h-[470px] w-[470px]">
            <svg
              viewBox="0 0 470 470"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <circle
                cx="235"
                cy="235"
                r="192"
                fill="none"
                stroke="rgba(198,184,255,0.18)"
                strokeWidth="1"
              />
              <path
                d="M68 324A192 192 0 0 1 148 62"
                fill="none"
                stroke="rgba(214,204,255,0.28)"
                strokeLinecap="round"
                strokeWidth="1.4"
              />
              <path
                d="M376 150A192 192 0 0 1 410 275"
                fill="none"
                stroke="rgba(214,204,255,0.20)"
                strokeLinecap="round"
                strokeWidth="1.4"
              />
              <circle cx="86" cy="112" r="4.5" fill="rgba(167,143,255,0.64)" />
              <circle cx="397" cy="294" r="4" fill="rgba(167,143,255,0.50)" />
            </svg>

            <svg
              className="absolute left-[66px] top-[72px] h-[270px] w-[270px] overflow-visible drop-shadow-[0_0_34px_rgba(196,181,253,0.5)]"
              viewBox="0 0 230 230"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="lune-crescent-fill" cx="30%" cy="48%" r="72%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="56%" stopColor="#fff2ff" />
                  <stop offset="100%" stopColor="#d5c4ff" />
                </radialGradient>
                <filter id="lune-crescent-glow" x="-70%" y="-70%" width="240%" height="240%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="0 0 0 0 0.77 0 0 0 0 0.71 0 0 0 0 0.99 0 0 0 0.58 0"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Moon disc (r72 @130,113) minus a shadow disc (r54 @163,107): same proportions as the Logo crescent. */}
              <path
                d="M170.6 53.5A72 72 0 1 0 188.9 154.4A54 54 0 1 1 170.6 53.5Z"
                fill="url(#lune-crescent-fill)"
                filter="url(#lune-crescent-glow)"
              />
              <path
                d="M70.8 91.5A63 63 0 0 0 75.4 144.5"
                fill="none"
                stroke="rgba(255,255,255,0.20)"
                strokeLinecap="round"
                strokeWidth="4"
              />
            </svg>

            <Bookmark className="absolute left-[304px] top-[48px] h-5 w-5 text-[#a99cff]/70" strokeWidth={1.6} />
            <Bookmark className="absolute left-[90px] top-[355px] h-5 w-5 text-[#a99cff]/62" strokeWidth={1.6} />
            <Star className="absolute left-[405px] top-[250px] h-5 w-5 text-[#a99cff]/62" strokeWidth={1.6} />
            <Star className="absolute left-[22px] top-[180px] h-5 w-5 text-[#a99cff]/62" strokeWidth={1.6} />
          </div>

          <svg
            className="absolute left-[32%] top-[55%] h-32 w-80 text-[#cabdff]/60 blur-[1px]"
            viewBox="0 0 290 120"
            aria-hidden="true"
          >
            <path
              d="M8 104 C82 58 145 26 260 7"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>

          <div className="absolute inset-x-0 bottom-0 h-[30%]">
            <svg viewBox="0 0 760 260" preserveAspectRatio="none" className="h-full w-full">
              <path
                d="M0 260V118C92 86 145 110 205 142C276 183 359 161 437 125C525 84 607 115 760 72V260Z"
                fill="rgba(34,25,82,0.76)"
              />
              <path
                d="M0 260V153C91 126 143 149 217 178C322 219 418 165 514 149C619 132 683 166 760 149V260Z"
                fill="rgba(20,15,56,0.86)"
              />
              <path
                d="M0 260V196C98 176 168 191 244 207C323 224 409 203 496 194C594 184 662 198 760 178V260Z"
                fill="rgba(11,8,38,0.92)"
              />
            </svg>
          </div>

          <div className="absolute -right-[109px] top-[-8%] h-[116%] w-[222px] rounded-[50%] border-l border-[#a78bfa]/25 shadow-[-18px_0_44px_rgba(167,139,250,0.25)] blur-[2px]" />
          <div className="absolute -right-[108px] top-[-8%] h-[116%] w-[216px] rounded-[50%] bg-admin-tint-soft shadow-[-34px_0_76px_rgba(196,181,253,0.44)]" />

          <div className="absolute bottom-12 left-12 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.24em] text-[#cbc0ff]/78">
            <Sparkle className="h-4 w-4" strokeWidth={1.7} />
            Private Space
          </div>
        </section>

        <section className="relative flex min-h-screen flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:items-start lg:px-14 lg:pt-[15vh]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_36%_22%,rgba(209,196,255,0.32),transparent_36%),radial-gradient(ellipse_at_78%_76%,rgba(137,104,255,0.12),transparent_34%),var(--login-panel-base)]" />
          <div className="absolute inset-y-0 left-0 hidden w-36 bg-gradient-to-r from-admin-line-strong/50 to-transparent blur-xl lg:block" />

          <div className="relative z-10 w-full max-w-[438px] lune-rise-enter">
            <div className="rounded-[26px] border border-admin-glass/70 bg-admin-surface/68 px-7 pb-8 pt-9 shadow-[0_24px_70px_rgba(93,76,160,0.12),inset_0_1px_0_var(--admin-highlight)] backdrop-blur-2xl sm:px-9 sm:pb-9 sm:pt-10">
              <div className="mb-7 flex justify-center">
                <LuneMark />
              </div>

              <div className="mb-8 text-center">
                <h1 className="text-[28px] font-extrabold leading-tight tracking-normal text-admin-ink-strong">
                  欢迎回来
                </h1>
                <p className="mt-3 text-[15px] font-medium text-admin-violet">
                  进入你的 Lune 书签管理空间
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <User className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-admin-violet" strokeWidth={1.9} />
                  <Input
                    placeholder="用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-[54px] rounded-[15px] border-admin-line bg-admin-surface/72 pl-14 pr-5 text-[15px] font-medium text-admin-ink-strong placeholder:text-admin-violet shadow-[inset_0_1px_0_var(--admin-highlight)] transition-all duration-200 hover:border-admin-line-strong hover:bg-admin-surface/88 focus-visible:border-admin-accent focus-visible:bg-admin-surface focus-visible:ring-0 focus-visible:shadow-[0_0_0_4px_rgba(126,101,255,0.12)]"
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-admin-violet" strokeWidth={1.9} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-[54px] rounded-[15px] border-admin-line bg-admin-surface/72 pl-14 pr-14 text-[15px] font-medium text-admin-ink-strong placeholder:text-admin-violet shadow-[inset_0_1px_0_var(--admin-highlight)] transition-all duration-200 hover:border-admin-line-strong hover:bg-admin-surface/88 focus-visible:border-admin-accent focus-visible:bg-admin-surface focus-visible:ring-0 focus-visible:shadow-[0_0_0_4px_rgba(126,101,255,0.12)]"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-admin-violet transition-colors hover:bg-admin-tint hover:text-admin-accent"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {error && (
                  <p className="rounded-[14px] border border-red-100 bg-red-50/70 px-4 py-3 text-center text-[13px] font-medium text-red-500 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-300 lune-fade-enter">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-6 h-[54px] w-full rounded-[15px] bg-gradient-to-r from-[#7868ff] via-[#725df0] to-[#a24eff] text-[15px] font-extrabold tracking-normal text-white shadow-[0_16px_34px_rgba(117,94,244,0.28)] transition-all duration-200 hover:-translate-y-px hover:from-[#8576ff] hover:via-[#7d67f5] hover:to-[#ad5aff] hover:shadow-[0_20px_42px_rgba(117,94,244,0.34)] active:translate-y-0 disabled:opacity-65 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {loading ? (
                    <span className="inline-flex animate-spin motion-reduce:animate-none">
                      <Loader2 className="h-5 w-5" />
                    </span>
                  ) : '进入 Lune'}
                </Button>
              </form>
            </div>

            <p className="mt-7 text-center text-[13px] font-medium tracking-normal text-admin-violet">
              {`© ${new Date().getFullYear()} Lune — 私人数字空间`}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}

function LuneMark() {
  return (
    <div className="relative h-16 w-16">
      {/* Masked crescent (36px cut-out centred at 35px, 22px of the 48px moon); a covering disc would show on the card's glass background. */}
      <div
        className="absolute inset-2 rounded-full bg-gradient-to-br from-[#9a8cff] via-[#725ff3] to-[#aa54ff]"
        style={{
          maskImage: 'radial-gradient(circle at 35px 22px, transparent 17.5px, #000 18px)',
          WebkitMaskImage: 'radial-gradient(circle at 35px 22px, transparent 17.5px, #000 18px)',
        }}
      />
      <Sparkle className="absolute right-1 top-2 h-3.5 w-3.5 text-[#907cff]" strokeWidth={2} />
      <Sparkle className="absolute right-2 top-7 h-2.5 w-2.5 text-[#a775ff]" strokeWidth={2} />
    </div>
  )
}
