'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bell,
  CalendarDays,
  Check,
  Copy,
  Crown,
  Flame,
  Globe,
  Home,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  Shield,
  Swords,
  Trash2,
  Trophy,
  UserPlus,
  UserRound,
  Users,
  Zap,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowLeft,
  Clock,
  Settings,
  Activity,
  Sliders,
  BarChart2,
  CheckCircle2,
  Info,
  MoreVertical,
  Dumbbell,
  Timer,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ============================================================================
// TYPES & DATA MODELS
// ============================================================================

interface UserProfile {
  id: string
  username: string
  email: string
  xp: number
  streak: number
}

interface WorkoutSet {
  id: string
  setNumber: number
  reps: number
  weight?: number
  completed: boolean
}

interface WorkoutExercise {
  id: string
  name: string
  sets: WorkoutSet[]
  restSeconds?: number
}

interface PersonalTask {
  id: string
  userId: string
  title: string
  category: string
  xp: number
  icon: string
  done: boolean
  schedule?: string[]
  workoutExercises?: WorkoutExercise[]
}

interface Clan {
  id: string
  name: string
  description: string
  isPrivate: boolean
  inviteCode: string
  leaderId: string
  totalXp: number
}

interface ClanMember {
  clanId: string
  userId: string
  role: 'leader' | 'member'
  contributedXp: number
}

interface ClanQuest {
  id: string
  clanId: string
  createdBy: string
  title: string
  category: string
  xp: number
  icon: string
  questType: 'daily' | 'event'
  deadline?: string
  completedByUserIds: string[]
  schedule?: string[]
  workoutExercises?: WorkoutExercise[]
}

interface QuestCategory {
  name: string
  oldName?: string
  xp: number
  icon: string
}

const DEFAULT_GYM_EXERCISES: WorkoutExercise[] = []

const CATEGORIES: QuestCategory[] = [
  { name: 'Gym', oldName: 'Gym', xp: 50, icon: '🏋️' },
  { name: 'Olahraga', oldName: 'Kekuatan', xp: 40, icon: '⚡' },
  { name: 'Rutinitas', oldName: 'Disiplin', xp: 20, icon: '☀️' },
  { name: 'Belajar', oldName: 'Pengetahuan', xp: 25, icon: '📖' },
  { name: 'Kesehatan', oldName: 'Vitalitas', xp: 15, icon: '💧' },
  { name: 'Fokus', oldName: 'Fokus', xp: 30, icon: '🎯' },
]

function findCategory(catName: string): QuestCategory {
  if (!catName) return CATEGORIES[0]
  const lower = catName.toLowerCase()
  return (
    CATEGORIES.find((c) => c.name.toLowerCase() === lower) ||
    CATEGORIES.find((c) => c.oldName && c.oldName.toLowerCase() === lower) ||
    CATEGORIES.find(
      (c) =>
        lower.includes(c.name.toLowerCase()) ||
        (c.oldName && lower.includes(c.oldName.toLowerCase()))
    ) ||
    CATEGORIES[0]
  )
}

function getHunterRank(xp: number): string {
  if (xp >= 2500) return 'S'
  if (xp >= 1200) return 'A'
  if (xp >= 700) return 'B'
  if (xp >= 350) return 'C'
  if (xp >= 150) return 'D'
  return 'E'
}

function getHunterLevel(xp: number): number {
  return Math.max(1, Math.floor(xp / 100) + 1)
}

// ============================================================================
// INITIAL SEED DATA (MULTI-USER ISOLATED)
// ============================================================================

const INITIAL_USERS: UserProfile[] = [
  { id: 'u-jinwoo', username: 'Sung Jin-Woo', email: 'jinwoo@sololevel.app', xp: 1240, streak: 7 },
  { id: 'u-cha', username: 'Cha Hae-In', email: 'chahaein@sololevel.app', xp: 1180, streak: 5 },
  { id: 'u-igris', username: 'Knight Igris', email: 'igris@sololevel.app', xp: 950, streak: 4 },
]

const INITIAL_PERSONAL_TASKS: PersonalTask[] = [
  // Milik Sung Jin-Woo
  { id: 'pt-1', userId: 'u-jinwoo', title: 'Bangun sebelum 06:00', category: 'Disiplin', xp: 20, icon: '☼', done: true, schedule: ['Everyday'] },
  { id: 'pt-2', userId: 'u-jinwoo', title: 'Workout 30 menit', category: 'Kekuatan', xp: 40, icon: 'ϟ', done: true, schedule: ['Everyday'] },
  { id: 'pt-3', userId: 'u-jinwoo', title: 'Baca 10 halaman', category: 'Pengetahuan', xp: 25, icon: '▤', done: false, schedule: ['Mon', 'Wed', 'Fri'] },
  { id: 'pt-4', userId: 'u-jinwoo', title: 'Minum 2L air putih', category: 'Vitalitas', xp: 15, icon: '◒', done: false, schedule: ['Everyday'] },
  // Milik Cha Hae-In (Berbeda dengan Jin-Woo)
  { id: 'pt-5', userId: 'u-cha', title: 'Latihan Swordsmanship 1 Jam', category: 'Kekuatan', xp: 50, icon: 'ϟ', done: true, schedule: ['Mon', 'Tue', 'Thu'] },
  { id: 'pt-6', userId: 'u-cha', title: 'Meditasi Fokus Mana', category: 'Disiplin', xp: 30, icon: '☼', done: false, schedule: ['Everyday'] },
  // Milik Igris
  { id: 'pt-7', userId: 'u-igris', title: 'Jaga Gerbang Dungeon Pagi', category: 'Disiplin', xp: 35, icon: '☼', done: true, schedule: ['Everyday'] },
]

const INITIAL_CLANS: Clan[] = [
  {
    id: 'clan-ahjin',
    name: 'Ahjin Guild',
    description: 'Clan elit bagi Hunter yang konsisten menembus batas fisik & disiplin setiap hari.',
    isPrivate: false,
    inviteCode: 'AHJIN-01',
    leaderId: 'u-jinwoo',
    totalXp: 1850,
  },
  {
    id: 'clan-hunters',
    name: 'Hunters Guild',
    description: 'Komunitas publik latihan kecepatan, fokus membaca, dan kebugaran bersama.',
    isPrivate: false,
    inviteCode: 'HUNTER-77',
    leaderId: 'u-cha',
    totalXp: 1420,
  },
  {
    id: 'clan-shadow',
    name: 'Shadow Army (VIP)',
    description: 'Clan rahasia khusus pasukan bayangan. Masuk menggunakan kode undangan.',
    isPrivate: true,
    inviteCode: 'SHADOW-99',
    leaderId: 'u-jinwoo',
    totalXp: 2100,
  },
]

const INITIAL_CLAN_MEMBERS: ClanMember[] = [
  { clanId: 'clan-ahjin', userId: 'u-jinwoo', role: 'leader', contributedXp: 640 },
  { clanId: 'clan-ahjin', userId: 'u-igris', role: 'member', contributedXp: 420 },
  { clanId: 'clan-hunters', userId: 'u-cha', role: 'leader', contributedXp: 580 },
  { clanId: 'clan-hunters', userId: 'u-jinwoo', role: 'member', contributedXp: 210 },
  { clanId: 'clan-shadow', userId: 'u-jinwoo', role: 'leader', contributedXp: 900 },
]

const INITIAL_CLAN_QUESTS: ClanQuest[] = [
  {
    id: 'cq-1',
    clanId: 'clan-ahjin',
    createdBy: 'u-jinwoo',
    title: 'Push-up 100x & Sit-up 100x',
    category: 'Kekuatan',
    xp: 60,
    icon: 'ϟ',
    questType: 'daily',
    schedule: ['Everyday'],
    completedByUserIds: ['u-jinwoo', 'u-igris'],
  },
  {
    id: 'cq-2',
    clanId: 'clan-ahjin',
    createdBy: 'u-jinwoo',
    title: 'Lari 10 KM (Raid Boss)',
    category: 'Vitalitas',
    xp: 100,
    icon: '◒',
    questType: 'event',
    deadline: 'Minggu Ini',
    schedule: ['Sat', 'Sun'],
    completedByUserIds: ['u-jinwoo'],
  },
  {
    id: 'cq-3',
    clanId: 'clan-hunters',
    createdBy: 'u-cha',
    title: 'Deep Work Tanpa Distraksi 2 Jam',
    category: 'Pengetahuan',
    xp: 50,
    icon: '▤',
    questType: 'daily',
    schedule: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    completedByUserIds: ['u-cha'],
  },
  {
    id: 'cq-4',
    clanId: 'clan-shadow',
    createdBy: 'u-jinwoo',
    title: 'Zero Sugar & Cold Shower Challenge',
    category: 'Disiplin',
    xp: 80,
    icon: '☼',
    questType: 'daily',
    completedByUserIds: ['u-jinwoo'],
  },
]

// ============================================================================
// REUSABLE QUEST CARD
// ============================================================================

function QuestCard({
  title,
  meta,
  icon,
  done,
  badgeText,
  isEvent,
  canManage,
  disabled,
  schedule,
  completedCount,
  totalMembers,
  isGym,
  onOpenWorkout,
  onToggle,
  onInfo,
  onEdit,
  onDelete,
}: {
  title: string
  meta: string
  icon: string
  done: boolean
  badgeText?: string
  isEvent?: boolean
  canManage: boolean
  disabled?: boolean
  schedule?: string[]
  completedCount?: number
  totalMembers?: number
  isGym?: boolean
  onOpenWorkout?: () => void
  onToggle: () => void
  onInfo?: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const openedTimestampRef = useRef(0)
  const closedTimestampRef = useRef(0)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const hasMenuOptions = Boolean(onInfo || (isGym && onOpenWorkout) || (canManage && (onEdit || onDelete)))

  const handleClearHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const closeMenu = () => {
    handleClearHold()
    closedTimestampRef.current = Date.now()
    setIsMenuOpen(false)
  }

  // Pastikan jika mouse/jari dilepas di luar kartu, timer hold selalu dibatalkan
  useEffect(() => {
    const handleGlobalRelease = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
    window.addEventListener('pointerup', handleGlobalRelease, true)
    window.addEventListener('pointercancel', handleGlobalRelease, true)
    window.addEventListener('mouseup', handleGlobalRelease, true)
    window.addEventListener('touchend', handleGlobalRelease, true)
    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease, true)
      window.removeEventListener('pointercancel', handleGlobalRelease, true)
      window.removeEventListener('mouseup', handleGlobalRelease, true)
      window.removeEventListener('touchend', handleGlobalRelease, true)
    }
  }, [])

  // Tutup dropdown seketika saat klik di area mana pun di luar menu (seperti pop-up pada umumnya)
  useEffect(() => {
    if (!isMenuOpen) return

    const handleOutsideClick = (e: MouseEvent | TouchEvent | PointerEvent) => {
      // 1. Jika klik berada di dalam menu dropdown, biarkan tombol bekerja
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return
      }
      // 2. Jika event ini berasal dari pelepasan jari saat hold (< 300ms dari menu terbuka), abaikan!
      if (Date.now() - openedTimestampRef.current < 300) {
        return
      }
      // 3. Sentuhan di area lain mana pun langsung menutup dropdown seketika!
      closeMenu()
    }

    window.addEventListener('pointerdown', handleOutsideClick, true)
    window.addEventListener('click', handleOutsideClick, true)

    return () => {
      window.removeEventListener('pointerdown', handleOutsideClick, true)
      window.removeEventListener('click', handleOutsideClick, true)
    }
  }, [isMenuOpen])

  const handleStartHold = () => {
    if (!hasMenuOptions || isMenuOpen) return
    // Cegah hold timer menyala kembali saat baru saja menutup menu (< 350ms)
    if (Date.now() - closedTimestampRef.current < 350) return
    handleClearHold()
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      openedTimestampRef.current = Date.now()
      setIsMenuOpen(true)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(40)
      }
    }, 450)
  }

  const handleTouchMove = () => {
    handleClearHold()
  }

  const handleCardClick = (e: React.MouseEvent) => {
    // Jika event click ini adalah pelepasan dari hold (< 350ms) atau baru saja menutup menu, jangan toggle quest
    if (
      Date.now() - openedTimestampRef.current < 350 ||
      Date.now() - closedTimestampRef.current < 350
    ) {
      e.stopPropagation()
      return
    }
    if (isMenuOpen) {
      closeMenu()
      return
    }
    if (isGym) {
      // Untuk kategori gym, klik card sementara tidak melakukan apa-apa (masuk ke halaman workout khusus lewat tombol Start)
      return
    }
    if (!disabled) onToggle()
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: isMenuOpen ? 150 : 1,
      }}
    >
      <div
        className={`task-row ${done ? 'completed' : ''}`}
        style={{
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : isGym ? 'default' : 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onClick={handleCardClick}
        onPointerDown={handleStartHold}
        onPointerUp={handleClearHold}
        onPointerLeave={handleClearHold}
        onPointerCancel={handleClearHold}
        onTouchMove={handleTouchMove}
        onContextMenu={(e) => {
          if (hasMenuOptions) {
            e.preventDefault()
            handleClearHold()
            openedTimestampRef.current = Date.now()
            setIsMenuOpen(true)
          }
        }}
      >
        <span
          className="check-box"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled) onToggle()
          }}
          role="button"
          aria-label="Toggle status"
        >
          {done && <Check size={15} strokeWidth={3} />}
        </span>
        <span className="task-symbol">{icon}</span>
        <span className="task-copy">
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {title}
            {isEvent && <span className="clan-badge event">EVENT</span>}
            {schedule && schedule.length > 0 && (
              <span
                style={{
                  fontSize: '9px',
                  color: '#c4b5fd',
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  padding: '1px 6px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontWeight: 500,
                }}
              >
                <Clock size={9} />
                {schedule.includes('Everyday') ? 'Everyday' : schedule.join(', ')}
              </span>
            )}
          </strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
            <small>{meta}</small>
          </div>
        </span>

        {/* Right side: START button (Gym) + XP badge + subtle 3-dots if options exist */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isGym && onOpenWorkout && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenWorkout()
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.04em',
                background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                border: '1px solid rgba(168, 85, 247, 0.6)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(124, 58, 237, 0.35)',
                transition: 'all 0.15s ease',
              }}
              title="Mulai Workout"
              aria-label="Mulai Workout"
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1.0)')}
            >
              <Play size={10} fill="#ffffff" />
              <span>Start</span>
            </button>
          )}
          {badgeText ? (
            <span className="task-xp">{badgeText}</span>
          ) : done ? (
            <span className="task-xp" style={{ color: '#9e72e7', fontWeight: 700 }}>
              DONE
            </span>
          ) : null}

          {hasMenuOptions && (
            <button
              type="button"
              className="task-btn-action"
              title="Tahan quest atau klik untuk menu opsi (Edit, Hapus, Info)"
              aria-label={`Menu opsi ${title}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                handleClearHold()
                if (!isMenuOpen) {
                  openedTimestampRef.current = Date.now()
                  setIsMenuOpen(true)
                } else {
                  closeMenu()
                }
              }}
              style={{
                background: 'transparent',
                border: 0,
                color: '#8e84a2',
                cursor: 'pointer',
                padding: '4px 2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c084fc')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8e84a2')}
            >
              <MoreVertical size={15} />
            </button>
          )}
        </div>
      </div>

      {/* POPUP DROPDOWN MENU (BERADA DI LUAR .task-row AGAR TIDAK MEMICU HOLD BERULANG) */}
      {isMenuOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 140,
              background: 'rgba(0, 0, 0, 0.45)',
              cursor: 'default',
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              if (Date.now() - openedTimestampRef.current < 300) return
              closeMenu()
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (Date.now() - openedTimestampRef.current < 300) return
              closeMenu()
            }}
          />
          <div
            ref={menuRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: '8px',
              zIndex: 160,
              background: '#161128',
              border: '1.5px solid #6b3ca8',
              borderRadius: '14px',
              padding: '6px',
              width: '190px',
              boxShadow: '0 15px 40px rgba(0,0,0,0.95), 0 0 25px rgba(139,92,246,0.35)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Opsi Khusus Gym: Halaman Workout */}
            {isGym && onOpenWorkout && (
              <button
                type="button"
                onClick={() => {
                  closeMenu()
                  onOpenWorkout()
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38bdf8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '6px',
                }}
              >
                <Dumbbell size={14} color="#38bdf8" />
                <span>Buka Halaman Workout</span>
              </button>
            )}

            {/* Opsi 1: Info Hunter (Siapa saja yang sudah selesai) */}
            {onInfo && (
              <button
                type="button"
                onClick={() => {
                  closeMenu()
                  onInfo()
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 0,
                  color: '#f3f1ff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#251745')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Info size={14} color="#a855f7" />
                  <span>Info Hunter</span>
                </div>
                {completedCount !== undefined && totalMembers !== undefined && (
                  <span
                    style={{
                      fontSize: '10px',
                      color: '#c084fc',
                      background: 'rgba(168, 85, 247, 0.15)',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      fontWeight: 700,
                    }}
                  >
                    {completedCount}/{totalMembers}
                  </span>
                )}
              </button>
            )}

            {/* Opsi 2: Edit Quest */}
            {canManage && onEdit && (
              <button
                type="button"
                onClick={() => {
                  closeMenu()
                  onEdit()
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 0,
                  color: '#f3f1ff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#251745')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Pencil size={14} color="#c084fc" />
                <span>Edit Quest</span>
              </button>
            )}

            {/* Opsi 3: Hapus Quest */}
            {canManage && onDelete && (
              <>
                <div style={{ height: '1px', background: '#251a3a', margin: '4px 0' }} />
                <button
                  type="button"
                  onClick={() => {
                    closeMenu()
                    onDelete()
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: 0,
                    color: '#ff6b8b',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <Trash2 size={14} color="#ff6b8b" />
                  <span>Hapus Quest</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// HELLOHABIT CONSISTENCY HEATMAP HELPERS (2026 IN-REVIEW)
// ============================================================================

const HABIT_PALETTES = [
  { color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.45)', name: 'Sky' },
  { color: '#facc15', glow: 'rgba(250, 204, 21, 0.45)', name: 'Amber' },
  { color: '#fb7185', glow: 'rgba(251, 113, 133, 0.45)', name: 'Rose' },
  { color: '#2dd4bf', glow: 'rgba(45, 212, 191, 0.45)', name: 'Teal' },
  { color: '#818cf8', glow: 'rgba(129, 140, 248, 0.45)', name: 'Indigo' },
  { color: '#c084fc', glow: 'rgba(192, 132, 252, 0.45)', name: 'Purple' },
  { color: '#fb923c', glow: 'rgba(251, 146, 60, 0.45)', name: 'Coral' },
  { color: '#34d399', glow: 'rgba(52, 211, 153, 0.45)', name: 'Emerald' },
]

function getHabitYearGrid(seedId: string, basePct: number) {
  const TOTAL_WEEKS = 42
  const TOTAL_DAYS = TOTAL_WEEKS * 7 // 294 days
  const CURRENT_DAY = 265 // Fixed current point in year

  let completed = 0
  const cells: ('active' | 'inactive' | 'future')[] = []

  for (let day = 0; day < TOTAL_DAYS; day++) {
    if (day > CURRENT_DAY) {
      cells.push('future')
    } else {
      let h = 0
      const s = `${seedId}-${day}`
      for (let i = 0; i < s.length; i++) {
        h = (h << 5) - h + s.charCodeAt(i)
        h |= 0
      }
      const score = Math.abs(h % 100)
      const isActive = score < basePct
      if (isActive) {
        cells.push('active')
        completed++
      } else {
        cells.push('inactive')
      }
    }
  }

  const elapsed = CURRENT_DAY + 1
  const pct = Math.round((completed / elapsed) * 100)
  return { cells, pct }
}

// MAIN PAGE COMPONENT
// ============================================================================

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'clan' | 'rank' | 'profile'>('home')

  // Multi-user & Community State
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS)
  const [currentUserId, setCurrentUserId] = useState<string>('u-jinwoo')
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>(INITIAL_PERSONAL_TASKS)
  const [clans, setClans] = useState<Clan[]>(INITIAL_CLANS)
  const [clanMembers, setClanMembers] = useState<ClanMember[]>(INITIAL_CLAN_MEMBERS)
  const [clanQuests, setClanQuests] = useState<ClanQuest[]>(INITIAL_CLAN_QUESTS)

  // Clan UI Navigation State (null = Tampilan Daftar Clan, string = Halaman Khusus Clan Tersebut)
  const [selectedClanId, setSelectedClanId] = useState<string | null>(null)
  const [clanViewTab, setClanViewTab] = useState<'quests' | 'consistency' | 'leaderboard'>('quests')
  const [rankTab, setRankTab] = useState<'hunters' | 'clans'>('hunters')
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Modals State
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false)
  const [editingPersonalTask, setEditingPersonalTask] = useState<PersonalTask | null>(null)

  const [isClanQuestPageOpen, setIsClanQuestPageOpen] = useState(false)
  const [editingClanQuest, setEditingClanQuest] = useState<ClanQuest | null>(null)
  const [questInfoTarget, setQuestInfoTarget] = useState<ClanQuest | null>(null)

  const [isCreateClanModalOpen, setIsCreateClanModalOpen] = useState(false)
  const [isClanInfoPageOpen, setIsClanInfoPageOpen] = useState(false)
  const [isClanConsistencyPageOpen, setIsClanConsistencyPageOpen] = useState(false)
  const [isClanSettingsMenuOpen, setIsClanSettingsMenuOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false)
  const [isConsistencyModalOpen, setIsConsistencyModalOpen] = useState(false)
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false)
  const [consistencyFilterTab, setConsistencyFilterTab] = useState<'all' | 'personal' | 'clan'>('all')
  const [prefUsername, setPrefUsername] = useState('')
  const [prefNotification, setPrefNotification] = useState(true)
  const [prefSound, setPrefSound] = useState(true)

  // Form states for Personal / Clan Quest Modal
  const [questTitle, setQuestTitle] = useState('')
  const [questCategory, setQuestCategory] = useState(CATEGORIES[0].name)
  const [questXp, setQuestXp] = useState(CATEGORIES[0].xp)
  const [questType, setQuestType] = useState<'daily' | 'event'>('daily')
  const [questDeadline, setQuestDeadline] = useState('')
  const [questDays, setQuestDays] = useState<string[]>(['Everyday'])

  const handleToggleDay = (day: string) => {
    if (day === 'Everyday') {
      setQuestDays(['Everyday'])
      return
    }

    let updated = questDays.includes('Everyday') ? [] : [...questDays]

    if (updated.includes(day)) {
      updated = updated.filter((d) => d !== day)
    } else {
      updated.push(day)
    }

    if (updated.length === 0 || updated.length === 7) {
      setQuestDays(['Everyday'])
    } else {
      setQuestDays(updated)
    }
  }

  // Form states for Edit Clan Modal (Leader Only)
  const [isEditClanModalOpen, setIsEditClanModalOpen] = useState(false)
  const [editClanName, setEditClanName] = useState('')
  const [editClanDesc, setEditClanDesc] = useState('')
  const [editClanPrivate, setEditClanPrivate] = useState(false)
  const [editClanCode, setEditClanCode] = useState('')

  // Form states for Create Clan Modal
  const [newClanName, setNewClanName] = useState('')
  const [newClanDesc, setNewClanDesc] = useState('')
  const [newClanPrivate, setNewClanPrivate] = useState(false)
  const [newClanCode, setNewClanCode] = useState('')

  // Form states for Auth (Login / Register) Modal
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')
  const [authUsername, setAuthUsername] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [showAuthPassword, setShowAuthPassword] = useState(false)

  // Gym Workout Session State & Rest Timer
  const [activeWorkoutQuest, setActiveWorkoutQuest] = useState<{
    type: 'personal' | 'clan'
    id: string
  } | null>(null)
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null)
  const [openExerciseDropdownId, setOpenExerciseDropdownId] = useState<string | null>(null)
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(60)
  const [restTimerActive, setRestTimerActive] = useState<boolean>(false)
  const [showFloatingTimer, setShowFloatingTimer] = useState<boolean>(false)
  const [restDurationPreset, setRestDurationPreset] = useState<number>(60)
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseRest, setNewExerciseRest] = useState<number>(60)
  const [newExerciseSetsCount, setNewExerciseSetsCount] = useState<number>(3)
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const [editingExerciseName, setEditingExerciseName] = useState<string>('')
  const [editingExerciseRest, setEditingExerciseRest] = useState<number>(60)
  const [isTimerSettingOpen, setIsTimerSettingOpen] = useState<boolean>(false)
  const [customTimerSeconds, setCustomTimerSeconds] = useState<number>(60)
  const [applyTimerToAllExercises, setApplyTimerToAllExercises] = useState<boolean>(false)

  const playTimerBeep = () => {
    try {
      if (typeof window === 'undefined') return
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.8)
    } catch (e) {
      console.error(e)
    }
  }

  // Countdown timer istirahat
  useEffect(() => {
    if (!restTimerActive) return

    const interval = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) {
          setRestTimerActive(false)
          setShowFloatingTimer(false)
          playTimerBeep()
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
          }
          showToast('⚡ WAKTU ISTIRAHAT SELESAI! Siap untuk set berikutnya!')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [restTimerActive])

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const showToast = (msg: string) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(null), 3200)
  }

  // Load persisted data from localStorage + check Supabase session
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('solo_community_v1')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.users?.length) {
          // Normalisasi akun baru agar mulai dari Level 1 (0 XP) jika belum menyelesaikan quest
          const normalizedUsers = parsed.users.map((u: any) => {
            const userDoneTasks = (parsed.personalTasks || []).filter((t: any) => t.userId === u.id && t.done)
            const userDoneClanQuests = (parsed.clanQuests || []).filter((cq: any) => cq.completedByUserIds?.includes(u.id))
            if (u.xp === 100 && userDoneTasks.length === 0 && userDoneClanQuests.length === 0 && (u.id.startsWith('hunter-') || u.username === 'yongzz')) {
              return { ...u, xp: 0, streak: 0 }
            }
            return u
          })
          setUsers(normalizedUsers)
        }
        if (parsed.currentUserId) setCurrentUserId(parsed.currentUserId)
        if (parsed.personalTasks) {
          const migrated = parsed.personalTasks.map((t: any) => {
            const cat = findCategory(t.category)
            let exs = t.workoutExercises
            if (exs && exs.length > 0 && exs[0]?.id === 'ex-1' && exs[0]?.name === 'Bench Press' && !t.done) {
              exs = []
            }
            return { ...t, category: cat.name, icon: cat.icon, workoutExercises: exs ?? (cat.name.toLowerCase() === 'gym' ? [] : undefined) }
          })
          setPersonalTasks(migrated)
        }
        if (parsed.clans?.length) setClans(parsed.clans)
        if (parsed.clanMembers) setClanMembers(parsed.clanMembers)
        if (parsed.clanQuests) {
          const migrated = parsed.clanQuests.map((cq: any) => {
            const cat = findCategory(cq.category)
            let exs = cq.workoutExercises
            if (exs && exs.length > 0 && exs[0]?.id === 'ex-1' && exs[0]?.name === 'Bench Press') {
              exs = []
            }
            return { ...cq, category: cat.name, icon: cat.icon, workoutExercises: exs ?? (cat.name.toLowerCase() === 'gym' ? [] : undefined) }
          })
          setClanQuests(migrated)
        }
      } catch (e) {
        console.error(e)
      }
    }

    // Periksa cookie sesi login untuk memastikan akun sendiri yang aktif
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(^| )hunter_session=([^;]+)/)
      const sessionUsername = match ? decodeURIComponent(match[2]) : null
      if (sessionUsername) {
        setUsers((prev) => {
          const found = prev.find(
            (u) =>
              u.username.toLowerCase() === sessionUsername.toLowerCase() ||
              u.email?.toLowerCase().includes(sessionUsername.toLowerCase())
          )
          if (found) {
            setCurrentUserId(found.id)
            if (found.xp === 100 && (found.id.startsWith('hunter-') || found.username === 'yongzz')) {
              return prev.map((u) => (u.id === found.id ? { ...u, xp: 0, streak: 0 } : u))
            }
            return prev
          }
          const newUser: UserProfile = {
            id: `hunter-${sessionUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            username: sessionUsername,
            email: sessionUsername.includes('@') ? sessionUsername : `${sessionUsername.toLowerCase()}@gmail.com`,
            xp: 0,
            streak: 0,
          }
          setCurrentUserId(newUser.id)
          return [...prev, newUser]
        })
      }
    }

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          const supaUser = data.session.user
          const uname = supaUser.user_metadata?.username || supaUser.email?.split('@')[0] || 'Hunter'
          setUsers((prev) => {
            if (prev.some((u) => u.id === supaUser.id)) return prev
            return [...prev, { id: supaUser.id, username: uname, email: supaUser.email || '', xp: 0, streak: 0 }]
          })
          setCurrentUserId(supaUser.id)
        }
      })
    }
  }, [])

  // Save state changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        'solo_community_v1',
        JSON.stringify({
          users,
          currentUserId,
          personalTasks,
          clans,
          clanMembers,
          clanQuests,
        })
      )
    }
  }, [users, currentUserId, personalTasks, clans, clanMembers, clanQuests, mounted])

  // Derived Current User Data
  const currentUser = users.find((u) => u.id === currentUserId) || users[0]
  const userPersonalTasks = personalTasks.filter((t) => t.userId === currentUser.id)
  const completedPersonalCount = userPersonalTasks.filter((t) => t.done).length
  const userJoinedMemberships = clanMembers.filter((cm) => cm.userId === currentUser.id)
  const userJoinedClanIds = userJoinedMemberships.map((cm) => cm.clanId)
  const userJoinedClanQuests = clanQuests.filter((cq) => userJoinedClanIds.includes(cq.clanId))
  const completedClanQuestsCount = userJoinedClanQuests.filter((cq) => cq.completedByUserIds.includes(currentUser.id)).length
  const totalConsistencyTasks = userPersonalTasks.length + userJoinedClanQuests.length
  const totalCompletedConsistencyTasks = completedPersonalCount + completedClanQuestsCount
  const consistencyRate = totalConsistencyTasks > 0 ? Math.round((totalCompletedConsistencyTasks / totalConsistencyTasks) * 100) : 100

  const currentLevel = getHunterLevel(currentUser.xp)
  const currentRank = getHunterRank(currentUser.xp)
  const nextLevelXp = currentLevel * 100
  const levelProgress = Math.min(100, Math.round(((currentUser.xp % 100) / 100) * 100))

  const currentWorkoutQuest = activeWorkoutQuest
    ? activeWorkoutQuest.type === 'personal'
      ? personalTasks.find((t) => t.id === activeWorkoutQuest.id)
      : clanQuests.find((cq) => cq.id === activeWorkoutQuest.id)
    : null

  const workoutQuestExercises: WorkoutExercise[] = currentWorkoutQuest?.workoutExercises ?? []
  const pendingWorkoutExercises = workoutQuestExercises.filter(
    (ex) => !(ex.sets.length > 0 && ex.sets.every((s) => s.completed))
  )
  const completedWorkoutExercises = workoutQuestExercises.filter(
    (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completed)
  )

  const totalWorkoutSets = workoutQuestExercises.reduce((acc, ex) => acc + ex.sets.length, 0)
  const completedWorkoutSets = workoutQuestExercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  )
  const workoutProgressPct =
    totalWorkoutSets > 0 ? Math.round((completedWorkoutSets / totalWorkoutSets) * 100) : 0

  const activeExercise = activeExerciseId
    ? workoutQuestExercises.find((ex) => ex.id === activeExerciseId) || null
    : null

  const handleUpdateWorkoutExercises = (
    questId: string,
    type: 'personal' | 'clan',
    newExercises: WorkoutExercise[]
  ) => {
    if (type === 'personal') {
      setPersonalTasks((curr) =>
        curr.map((t) => (t.id === questId ? { ...t, workoutExercises: newExercises } : t))
      )
    } else {
      setClanQuests((curr) =>
        curr.map((cq) => (cq.id === questId ? { ...cq, workoutExercises: newExercises } : cq))
      )
    }
  }

  const handleToggleWorkoutSet = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string,
    setId: string
  ) => {
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    let justCompleted = false
    let restTime = 60

    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      restTime = ex.restSeconds || 60
      return {
        ...ex,
        sets: ex.sets.map((s) => {
          if (s.id !== setId) return s
          const nextComp = !s.completed
          if (nextComp) justCompleted = true
          return { ...s, completed: nextComp }
        }),
      }
    })

    handleUpdateWorkoutExercises(questId, type, updatedExs)

    if (justCompleted) {
      setRestSecondsLeft(restTime)
      setRestDurationPreset(restTime)
      setRestTimerActive(true)
      setShowFloatingTimer(true)
      showToast(`Set selesai! Istirahat ${restTime}s dimulai ⏳`)
    }
  }

  // QUICK ADVANCE SET: Tap 1x = selesaikan 1 set berikutnya & otomatis mulai timer istirahat
  const handleQuickAdvanceSet = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string
  ) => {
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    let triggeredRest = false
    let restTime = 60
    let exName = ''
    let completedAfter = 0
    let totalSets = 0

    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      exName = ex.name
      restTime = ex.restSeconds || 60
      totalSets = ex.sets.length
      const nextIncompleteIdx = ex.sets.findIndex((s) => !s.completed)

      if (nextIncompleteIdx !== -1) {
        triggeredRest = true
        const nextSets = ex.sets.map((s, idx) =>
          idx === nextIncompleteIdx ? { ...s, completed: true } : s
        )
        completedAfter = nextSets.filter((s) => s.completed).length
        return { ...ex, sets: nextSets }
      } else {
        // Jika semua set sudah selesai dan di-tap lagi, reset kembali ke 0
        triggeredRest = false
        completedAfter = 0
        return {
          ...ex,
          sets: ex.sets.map((s) => ({ ...s, completed: false })),
        }
      }
    })

    handleUpdateWorkoutExercises(questId, type, updatedExs)

    if (triggeredRest) {
      setRestSecondsLeft(restTime)
      setRestDurationPreset(restTime)
      setRestTimerActive(true)
      setShowFloatingTimer(true)
      if (completedAfter === totalSets) {
        showToast(`🔥 Semua set (${completedAfter}/${totalSets}) "${exName}" selesai! Istirahat ${restTime}s dimulai ⏳`)
      } else {
        showToast(`⚡ Set ${completedAfter}/${totalSets} "${exName}" selesai! Istirahat ${restTime}s dimulai ⏳`)
      }
    } else {
      setRestTimerActive(false)
      setShowFloatingTimer(false)
      showToast(`Set "${exName}" direset kembali ke 0/${totalSets}.`)
    }
  }

  const handleUpdateSetField = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string,
    setId: string,
    field: 'reps' | 'weight',
    val: number
  ) => {
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      return {
        ...ex,
        sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: val } : s)),
      }
    })
    handleUpdateWorkoutExercises(questId, type, updatedExs)
  }

  const handleAddSetToExercise = (questId: string, type: 'personal' | 'clan', exerciseId: string) => {
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      const nextSetNumber = ex.sets.length + 1
      const lastSet = ex.sets[ex.sets.length - 1]
      const newSet: WorkoutSet = {
        id: `set-${Date.now()}-${nextSetNumber}`,
        setNumber: nextSetNumber,
        reps: lastSet ? lastSet.reps : 10,
        weight: lastSet ? lastSet.weight : 20,
        completed: false,
      }
      return { ...ex, sets: [...ex.sets, newSet] }
    })
    handleUpdateWorkoutExercises(questId, type, updatedExs)
  }

  const handleDeleteSet = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string,
    setId: string
  ) => {
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      if (ex.sets.length <= 1) {
        showToast('Minimal 1 set dalam gerakan!')
        return ex
      }
      const filtered = ex.sets.filter((s) => s.id !== setId)
      const renumbered = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }))
      return { ...ex, sets: renumbered }
    })
    handleUpdateWorkoutExercises(questId, type, updatedExs)
  }

  // CREATE GERAKAN
  const handleAddExercise = (
    questId: string,
    type: 'personal' | 'clan',
    name: string,
    restSeconds: number = 60,
    initialSetsCount: number = 3
  ) => {
    if (!name.trim()) return
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const count = Math.max(1, Math.min(10, initialSetsCount))
    const sets: WorkoutSet[] = []
    for (let i = 1; i <= count; i++) {
      sets.push({
        id: `set-${Date.now()}-${i}`,
        setNumber: i,
        reps: 10,
        weight: 20,
        completed: false,
      })
    }
    const newEx: WorkoutExercise = {
      id: `ex-${Date.now()}`,
      name: name.trim(),
      restSeconds: restSeconds > 0 ? restSeconds : 60,
      sets,
    }
    handleUpdateWorkoutExercises(questId, type, [...currentExs, newEx])
    showToast(`Gerakan "${name.trim()}" berhasil ditambahkan!`)
  }

  // UPDATE GERAKAN (EDIT NAMA & WAKTU ISTIRAHAT)
  const handleUpdateExercise = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string,
    newName: string,
    newRestSeconds: number
  ) => {
    if (!newName.trim()) return
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      return {
        ...ex,
        name: newName.trim(),
        restSeconds: newRestSeconds > 0 ? newRestSeconds : 60,
      }
    })
    handleUpdateWorkoutExercises(questId, type, updatedExs)
    setEditingExerciseId(null)
    showToast(`Gerakan diperbarui: "${newName.trim()}"`)
  }

  // DELETE GERAKAN
  const handleDeleteExercise = (questId: string, type: 'personal' | 'clan', exerciseId: string) => {
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const updatedExs = currentExs.filter((ex) => ex.id !== exerciseId)
    handleUpdateWorkoutExercises(questId, type, updatedExs)
    if (activeExerciseId === exerciseId) {
      setActiveExerciseId(null)
    }
    showToast('Gerakan dihapus dari workout.')
  }

  // CLEAR ALL GERAKAN (KOSONGKAN WORKOUT)
  const handleClearAllExercises = (questId: string, type: 'personal' | 'clan') => {
    handleUpdateWorkoutExercises(questId, type, [])
    setActiveExerciseId(null)
    showToast('Semua gerakan latihan dikosongkan.')
  }

  const handleCompleteWorkout = (questId: string, type: 'personal' | 'clan') => {
    if (type === 'personal') {
      const target = personalTasks.find((t) => t.id === questId)
      if (target && !target.done) {
        handleTogglePersonal(questId)
      }
    } else {
      const target = clanQuests.find((cq) => cq.id === questId)
      if (target && !target.completedByUserIds.includes(currentUser.id)) {
        handleToggleClanQuest(target)
      }
    }
    setActiveWorkoutQuest(null)
    setActiveExerciseId(null)
    setRestTimerActive(false)
    setShowFloatingTimer(false)
    showToast('🎉 Sesi Workout Selesai! Quest Gym berhasil diselesaikan!')
  }

  // ============================================================================
  // PERSONAL QUEST CRUD HANDLERS
  // ============================================================================

  const handleTogglePersonal = (taskId: string) => {
    const target = personalTasks.find((t) => t.id === taskId && t.userId === currentUser.id)
    if (!target) return
    const nextDone = !target.done

    const userTasks = personalTasks.filter((t) => t.userId === currentUser.id)
    const wasAllDone = userTasks.length > 0 && userTasks.every((t) => t.done)

    const nextTasks = personalTasks.map((t) => (t.id === taskId ? { ...t, done: nextDone } : t))
    const nextUserTasks = nextTasks.filter((t) => t.userId === currentUser.id)
    const isAllDone = nextUserTasks.length > 0 && nextUserTasks.every((t) => t.done)

    const totalListXp = nextUserTasks.reduce((sum, t) => sum + t.xp, 0)
    let xpDelta = 0

    if (!wasAllDone && isAllDone) {
      xpDelta = totalListXp
      showToast(`🎉 Seluruh (${nextUserTasks.length}/${nextUserTasks.length}) Quest Harian selesai! +${totalListXp} XP didapatkan!`)
    } else if (wasAllDone && !isAllDone) {
      xpDelta = -totalListXp
      showToast(`Quest dibatalkan. Selesaikan semua quest untuk mempertahankan +${totalListXp} XP.`)
    } else {
      const doneCount = nextUserTasks.filter((t) => t.done).length
      if (nextDone) {
        showToast(`Quest dicentang (${doneCount}/${nextUserTasks.length}). Selesaikan seluruhnya untuk klaim +${totalListXp} XP!`)
      }
    }

    setPersonalTasks(nextTasks)
    if (xpDelta !== 0) {
      setUsers((curr) =>
        curr.map((u) =>
          u.id === currentUser.id ? { ...u, xp: Math.max(0, u.xp + xpDelta) } : u
        )
      )
    }
  }

  const handleDeletePersonal = (taskId: string) => {
    setPersonalTasks((curr) => curr.filter((t) => t.id !== taskId))
    showToast('Quest pribadi dihapus.')
  }

  const openAddPersonalModal = () => {
    setEditingPersonalTask(null)
    setQuestTitle('')
    setQuestCategory(CATEGORIES[0].name)
    setQuestXp(CATEGORIES[0].xp)
    setQuestDays(['Everyday'])
    setIsPersonalModalOpen(true)
  }

  const openEditPersonalModal = (task: PersonalTask) => {
    setEditingPersonalTask(task)
    setQuestTitle(task.title)
    setQuestCategory(findCategory(task.category).name)
    setQuestXp(task.xp)
    setQuestDays(task.schedule && task.schedule.length > 0 ? task.schedule : ['Everyday'])
    setIsPersonalModalOpen(true)
  }

  const handleSavePersonalQuest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!questTitle.trim()) return
    const catObj = findCategory(questCategory)
    const isGym = catObj.name.toLowerCase() === 'gym'

    if (editingPersonalTask) {
      setPersonalTasks((curr) =>
        curr.map((t) =>
          t.id === editingPersonalTask.id
            ? {
                ...t,
                title: questTitle.trim(),
                category: catObj.name,
                xp: questXp,
                icon: catObj.icon,
                schedule: questDays,
                workoutExercises: isGym ? (t.workoutExercises ?? []) : undefined,
              }
            : t
        )
      )
      showToast('Quest pribadi berhasil diperbarui!')
    } else {
      const newTask: PersonalTask = {
        id: `pt-${Date.now()}`,
        userId: currentUser.id,
        title: questTitle.trim(),
        category: catObj.name,
        xp: questXp,
        icon: catObj.icon,
        done: false,
        schedule: questDays,
        workoutExercises: isGym ? [] : undefined,
      }
      setPersonalTasks((curr) => [...curr, newTask])
      showToast('Quest pribadi baru ditambahkan!')
    }
    setIsPersonalModalOpen(false)
  }

  // ============================================================================
  // CLAN & COMMUNITY HANDLERS
  // ============================================================================

  const selectedClan = clans.find((c) => c.id === selectedClanId) || null
  const isMemberOfSelectedClan = selectedClan ? userJoinedClanIds.includes(selectedClan.id) : false
  const isLeaderOfSelectedClan = selectedClan ? selectedClan.leaderId === currentUser.id : false
  const selectedClanLeader = selectedClan ? users.find((u) => u.id === selectedClan.leaderId) : null
  const selectedClanQuests = selectedClan ? clanQuests.filter((cq) => cq.clanId === selectedClan.id) : []
  const selectedClanMembers = selectedClan
    ? clanMembers
        .filter((cm) => cm.clanId === selectedClan.id)
        .sort((a, b) => b.contributedXp - a.contributedXp)
    : []

  const handleJoinPublicClan = (clan: Clan) => {
    if (userJoinedClanIds.includes(clan.id)) {
      setSelectedClanId(clan.id)
      return
    }
    if (clan.isPrivate) {
      showToast('Clan ini Privat! Masukkan Kode Invite untuk bergabung.')
      return
    }
    setClanMembers((curr) => [
      ...curr,
      { clanId: clan.id, userId: currentUser.id, role: 'member', contributedXp: 0 },
    ])
    setSelectedClanId(clan.id)
    showToast(`Berhasil bergabung ke ${clan.name}! Sekarang kamu bisa mengikuti Quest Clan.`)
  }

  const handleJoinByInviteCode = (e: React.FormEvent) => {
    e.preventDefault()
    const code = inviteCodeInput.trim().toUpperCase()
    if (!code) return
    const targetClan = clans.find((c) => c.inviteCode.toUpperCase() === code)
    if (!targetClan) {
      showToast('Kode Invite Clan tidak ditemukan!')
      return
    }
    if (userJoinedClanIds.includes(targetClan.id)) {
      setSelectedClanId(targetClan.id)
      setInviteCodeInput('')
      showToast(`Kamu sudah menjadi anggota di ${targetClan.name}.`)
      return
    }
    setClanMembers((curr) => [
      ...curr,
      { clanId: targetClan.id, userId: currentUser.id, role: 'member', contributedXp: 0 },
    ])
    setSelectedClanId(targetClan.id)
    setInviteCodeInput('')
    showToast(`Berhasil masuk ke Clan ${targetClan.name} lewat Kode Invite!`)
  }

  const handleLeaveClan = (clanId: string) => {
    setClanMembers((curr) =>
      curr.filter((cm) => !(cm.clanId === clanId && cm.userId === currentUser.id))
    )
    showToast('Kamu telah keluar dari Clan.')
  }

  const handleCreateClan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClanName.trim()) return
    const generatedCode =
      newClanCode.trim().toUpperCase() ||
      `${newClanName.trim().slice(0, 5).toUpperCase().replace(/\s+/g, '')}-${Math.floor(10 + Math.random() * 89)}`

    const newClan: Clan = {
      id: `clan-${Date.now()}`,
      name: newClanName.trim(),
      description: newClanDesc.trim() || 'Membangun kekuatan bersama setiap hari.',
      isPrivate: newClanPrivate,
      inviteCode: generatedCode,
      leaderId: currentUser.id,
      totalXp: 100,
    }

    setClans((curr) => [newClan, ...curr])
    setClanMembers((curr) => [
      ...curr,
      { clanId: newClan.id, userId: currentUser.id, role: 'leader', contributedXp: 100 },
    ])
    setSelectedClanId(newClan.id)
    setNewClanName('')
    setNewClanDesc('')
    setNewClanPrivate(false)
    setNewClanCode('')
    setIsCreateClanModalOpen(false)
    showToast(`Clan "${newClan.name}" berhasil dibuat! Kamu adalah Clan Leader.`)
  }

  // Open Edit Clan Modal with existing clan data
  const openEditClanModal = () => {
    if (!selectedClan) return
    setEditClanName(selectedClan.name)
    setEditClanDesc(selectedClan.description)
    setEditClanPrivate(selectedClan.isPrivate)
    setEditClanCode(selectedClan.inviteCode)
    setIsEditClanModalOpen(true)
  }

  // Save changes to Clan (Leader only)
  const handleSaveEditClan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClan || !editClanName.trim()) return

    const updatedName = editClanName.trim()
    const updatedDesc = editClanDesc.trim() || 'Membangun kekuatan bersama setiap hari.'
    const updatedCode = editClanCode.trim().toUpperCase() || selectedClan.inviteCode

    setClans((curr) =>
      curr.map((c) =>
        c.id === selectedClan.id
          ? {
              ...c,
              name: updatedName,
              description: updatedDesc,
              isPrivate: editClanPrivate,
              inviteCode: updatedCode,
            }
          : c
      )
    )

    setIsEditClanModalOpen(false)
    showToast(`Info Clan "${updatedName}" berhasil diperbarui!`)
  }

  // Disband Clan (Leader only)
  const handleDeleteClan = (clanId: string) => {
    if (!selectedClan) return
    const clanName = selectedClan.name
    if (confirm(`Yakin ingin membubarkan Clan "${clanName}"? Semua quest dan riwayat clan ini akan dihapus permanen.`)) {
      setClans((curr) => curr.filter((c) => c.id !== clanId))
      setClanMembers((curr) => curr.filter((cm) => cm.clanId !== clanId))
      setClanQuests((curr) => curr.filter((cq) => cq.clanId !== clanId))
      setSelectedClanId(null)
      setIsClanInfoPageOpen(false)
      setIsClanConsistencyPageOpen(false)
      setIsClanSettingsMenuOpen(false)
      setIsEditClanModalOpen(false)
      showToast(`Clan "${clanName}" telah dibubarkan.`)
    }
  }

  // Toggle Clan Quest Completion (Only allowed if user is a member of the Clan!)
  const handleToggleClanQuest = (quest: ClanQuest) => {
    if (!isMemberOfSelectedClan) {
      showToast('Kamu harus gabung ke Clan ini dulu untuk mengikuti Quest-nya!')
      return
    }
    const alreadyDone = quest.completedByUserIds.includes(currentUser.id)

    const clanQuestsForClan = clanQuests.filter((cq) => cq.clanId === quest.clanId)
    const wasAllDone =
      clanQuestsForClan.length > 0 &&
      clanQuestsForClan.every((cq) => cq.completedByUserIds.includes(currentUser.id))

    const nextClanQuests = clanQuests.map((cq) =>
      cq.id === quest.id
        ? {
            ...cq,
            completedByUserIds: alreadyDone
              ? cq.completedByUserIds.filter((id) => id !== currentUser.id)
              : [...cq.completedByUserIds, currentUser.id],
          }
        : cq
    )

    const nextQuestsForClan = nextClanQuests.filter((cq) => cq.clanId === quest.clanId)
    const isAllDone =
      nextQuestsForClan.length > 0 &&
      nextQuestsForClan.every((cq) => cq.completedByUserIds.includes(currentUser.id))

    const totalClanListXp = nextQuestsForClan.reduce((sum, q) => sum + q.xp, 0)
    let xpDelta = 0

    if (!wasAllDone && isAllDone) {
      xpDelta = totalClanListXp
      showToast(
        `🎉 Luar biasa! Seluruh (${nextQuestsForClan.length}/${nextQuestsForClan.length}) Quest Clan selesai! +${totalClanListXp} XP diperoleh!`
      )
    } else if (wasAllDone && !isAllDone) {
      xpDelta = -totalClanListXp
      showToast(`Quest Clan dibatalkan. Selesaikan semua quest untuk mempertahankan +${totalClanListXp} XP.`)
    } else {
      const doneCount = nextQuestsForClan.filter((cq) => cq.completedByUserIds.includes(currentUser.id)).length
      if (!alreadyDone) {
        showToast(
          `Quest dicentang (${doneCount}/${nextQuestsForClan.length}). Selesaikan seluruh quest clan untuk klaim +${totalClanListXp} XP!`
        )
      }
    }

    setClanQuests(nextClanQuests)

    if (xpDelta !== 0) {
      // Update User Personal XP
      setUsers((curr) =>
        curr.map((u) =>
          u.id === currentUser.id ? { ...u, xp: Math.max(0, u.xp + xpDelta) } : u
        )
      )

      // Update Member Contributed XP in Clan
      setClanMembers((curr) =>
        curr.map((cm) =>
          cm.clanId === quest.clanId && cm.userId === currentUser.id
            ? { ...cm, contributedXp: Math.max(0, cm.contributedXp + xpDelta) }
            : cm
        )
      )

      // Update Clan Total XP
      setClans((curr) =>
        curr.map((c) =>
          c.id === quest.clanId ? { ...c, totalXp: Math.max(0, c.totalXp + xpDelta) } : c
        )
      )
    }
  }

  const openAddClanQuestModal = () => {
    setEditingClanQuest(null)
    setQuestTitle('')
    setQuestCategory(CATEGORIES[0].name)
    setQuestXp(CATEGORIES[0].xp)
    setQuestType('daily')
    setQuestDeadline('')
    setQuestDays(['Everyday'])
    setIsClanQuestPageOpen(true)
  }

  const openEditClanQuestModal = (cq: ClanQuest) => {
    setEditingClanQuest(cq)
    setQuestTitle(cq.title)
    setQuestCategory(findCategory(cq.category).name)
    setQuestXp(cq.xp)
    setQuestType(cq.questType)
    setQuestDeadline(cq.deadline || '')
    setQuestDays(cq.schedule && cq.schedule.length > 0 ? cq.schedule : ['Everyday'])
    setIsClanQuestPageOpen(true)
  }

  const handleSaveClanQuest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClan || !isLeaderOfSelectedClan || !questTitle.trim()) return
    const catObj = findCategory(questCategory)
    const isGym = catObj.name.toLowerCase() === 'gym'

    if (editingClanQuest) {
      setClanQuests((curr) =>
        curr.map((cq) =>
          cq.id === editingClanQuest.id
            ? {
                ...cq,
                title: questTitle.trim(),
                category: catObj.name,
                xp: questXp,
                icon: catObj.icon,
                questType,
                deadline: questType === 'event' ? questDeadline.trim() || 'Terbatas' : undefined,
                schedule: questDays,
                workoutExercises: isGym ? (cq.workoutExercises ?? []) : undefined,
              }
            : cq
        )
      )
      showToast('Quest Clan diperbarui!')
    } else {
      const newCq: ClanQuest = {
        id: `cq-${Date.now()}`,
        clanId: selectedClan.id,
        createdBy: currentUser.id,
        title: questTitle.trim(),
        category: catObj.name,
        xp: questXp,
        icon: catObj.icon,
        questType,
        deadline: questType === 'event' ? questDeadline.trim() || 'Terbatas' : undefined,
        completedByUserIds: [],
        schedule: questDays,
        workoutExercises: isGym ? [] : undefined,
      }
      setClanQuests((curr) => [...curr, newCq])
      showToast('Quest Clan baru berhasil diterbitkan untuk anggota!')
    }
    setIsClanQuestPageOpen(false)
    setEditingClanQuest(null)
  }

  const handleDeleteClanQuest = (questId: string) => {
    if (!isLeaderOfSelectedClan) return
    setClanQuests((curr) => curr.filter((cq) => cq.id !== questId))
    showToast('Quest Clan dihapus.')
  }

  // ============================================================================
  // AUTHENTICATION & MULTI-USER SWITCHING HANDLERS
  // ============================================================================

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authEmail.trim()) return

    if (isSupabaseConfigured && supabase) {
      if (authMode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { data: { username: authUsername.trim() || authEmail.split('@')[0] } },
        })
        if (error) {
          showToast(`Supabase Error: ${error.message}`)
          return
        }
        if (data.user) {
          const newUser: UserProfile = {
            id: data.user.id,
            username: authUsername.trim() || authEmail.split('@')[0],
            email: authEmail.trim(),
            xp: 100,
            streak: 1,
          }
          setUsers((curr) => [...curr, newUser])
          setCurrentUserId(newUser.id)
          setIsAuthModalOpen(false)
          showToast(`Selamat datang Hunter ${newUser.username}!`)
          return
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        })
        if (error) {
          showToast(`Login Gagal: ${error.message}`)
          return
        }
        if (data.user) {
          setCurrentUserId(data.user.id)
          setIsAuthModalOpen(false)
          showToast('Berhasil login via Supabase!')
          return
        }
      }
    }

    // Local / Multi-user immediate auth
    const existing = users.find((u) => u.email.toLowerCase() === authEmail.trim().toLowerCase())
    if (authMode === 'login' && existing) {
      setCurrentUserId(existing.id)
      setIsAuthModalOpen(false)
      showToast(`Login berhasil sebagai ${existing.username}!`)
    } else {
      const uname = authUsername.trim() || authEmail.split('@')[0]
      const newUser: UserProfile = {
        id: `u-${Date.now()}`,
        username: uname,
        email: authEmail.trim(),
        xp: 0,
        streak: 0,
      }
      setUsers((curr) => [...curr, newUser])
      setCurrentUserId(newUser.id)
      // Berikan 2 starter quest pribadi untuk user baru
      setPersonalTasks((curr) => [
        ...curr,
        {
          id: `pt-${Date.now()}-1`,
          userId: newUser.id,
          title: 'Olahraga Pagi 15 Menit',
          category: 'Kekuatan',
          xp: 30,
          icon: 'ϟ',
          done: false,
        },
        {
          id: `pt-${Date.now()}-2`,
          userId: newUser.id,
          title: 'Evaluasi Target Harian',
          category: 'Disiplin',
          xp: 20,
          icon: '☼',
          done: false,
        },
      ])
      setIsAuthModalOpen(false)
      setAuthUsername('')
      setAuthEmail('')
      setAuthPassword('')
      showToast(`Akun Hunter "${newUser.username}" berhasil dibuat & aktif!`)
    }
  }

  const handleGoogleLogin = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signInWithOAuth({ provider: 'google' })
    } else {
      showToast('Isi NEXT_PUBLIC_SUPABASE_URL di .env.local untuk Google OAuth, atau gunakan form di bawah.')
    }
  }

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prefUsername.trim()) {
      showToast('Nama hunter tidak boleh kosong!')
      return
    }
    setUsers((curr) =>
      curr.map((u) => (u.id === currentUser.id ? { ...u, username: prefUsername.trim() } : u))
    )
    setIsPreferencesModalOpen(false)
    showToast('Pengaturan Hunter berhasil disimpan!')
  }

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    }
    document.cookie = 'hunter_session=; path=/; max-age=0'
    showToast('Berhasil keluar dari sistem.')
    window.location.href = '/login'
  }

  const renderWorkoutExerciseCard = (exercise: WorkoutExercise) => {
    if (!currentWorkoutQuest || !activeWorkoutQuest) return null
    const exIndex = workoutQuestExercises.findIndex((e) => e.id === exercise.id)
    const completedSetsCount = exercise.sets.filter((s) => s.completed).length
    const totalSetsCount = exercise.sets.length
    const isExerciseDone = totalSetsCount > 0 && completedSetsCount === totalSetsCount
    const isEditingThis = editingExerciseId === exercise.id

    return (
      <div key={exercise.id}>
        {isEditingThis ? (
          <div
            style={{
              background: '#130f21',
              border: '1px solid #4a2f77',
              borderRadius: '14px',
              padding: '12px',
            }}
          >
            <div className="modal-label" style={{ marginBottom: '6px', color: '#c4b5fd' }}>
              EDIT GERAKAN #{exIndex + 1}
            </div>
            <input
              type="text"
              value={editingExerciseName}
              onChange={(e) => setEditingExerciseName(e.target.value)}
              placeholder="Nama Gerakan"
              className="modal-input"
              style={{ marginBottom: '8px', padding: '8px 10px', fontSize: '12px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#8e84a2' }}>Waktu Istirahat:</span>
              <input
                type="number"
                min={10}
                step={5}
                value={editingExerciseRest}
                onChange={(e) => setEditingExerciseRest(parseInt(e.target.value, 10) || 60)}
                style={{
                  width: '64px',
                  padding: '5px 6px',
                  background: '#0a0814',
                  border: '1px solid #322549',
                  borderRadius: '6px',
                  color: '#f3f1ff',
                  fontSize: '11px',
                  fontWeight: 700,
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '11px', color: '#8e84a2' }}>detik</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setEditingExerciseId(null)}
                className="btn-secondary"
                style={{ padding: '5px 11px', fontSize: '11px' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateExercise(
                    currentWorkoutQuest.id,
                    activeWorkoutQuest.type,
                    exercise.id,
                    editingExerciseName,
                    editingExerciseRest
                  )
                }
                className="btn-primary"
                style={{ padding: '5px 13px', fontSize: '11px' }}
              >
                Simpan
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: isExerciseDone ? 'rgba(34, 24, 56, 0.7)' : '#12101a',
              border: isExerciseDone ? '1px solid #452c75' : '1px solid #252130',
              borderRadius: '13px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              position: 'relative',
              opacity: isExerciseDone ? 0.88 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {/* SISI KIRI: BADGE NOMOR/CHECK + NAMA + VISUAL BAR SET */}
            <div
              onClick={() => {
                setOpenExerciseDropdownId(null)
                setActiveExerciseId(exercise.id)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                minWidth: 0,
                flex: 1,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: isExerciseDone ? '#8a51de' : '#1b152a',
                  border: isExerciseDone ? '1px solid #a974f5' : '1px solid #33274d',
                  color: isExerciseDone ? '#ffffff' : '#b389f3',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isExerciseDone ? '0 0 10px rgba(138, 81, 222, 0.35)' : 'none',
                }}
              >
                {isExerciseDone ? <Check size={13} strokeWidth={3} /> : exIndex + 1}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isExerciseDone ? '#b5a4d4' : '#eeeaf7',
                    textDecoration: isExerciseDone ? 'line-through' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {exercise.name}
                </strong>

                {/* MINI VISUAL SET BARS + COUNTER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '5px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {exercise.sets.map((s) => (
                      <span
                        key={s.id}
                        style={{
                          width: '12px',
                          height: '4px',
                          borderRadius: '99px',
                          background: s.completed ? '#a855f7' : '#282238',
                          boxShadow: s.completed ? '0 0 6px rgba(168, 85, 247, 0.55)' : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: isExerciseDone ? '#b993f7' : '#817b93' }}>
                    {completedSetsCount}/{totalSetsCount} Set
                  </span>
                  <span style={{ fontSize: '10px', color: '#6b637b' }}>
                    • ⏱ {exercise.restSeconds || 60}s
                  </span>
                </div>
              </div>
            </div>

            {/* SISI KANAN: 3 TOMBOL ICON-ONLY (1: QUICK SET, 2: DROPDOWN EDIT/HAPUS, 3: DETAIL) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              {/* BUTTON 1: TOMBOL CEPAT SELESAIKAN SET (ICON-ONLY) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenExerciseDropdownId(null)
                  handleQuickAdvanceSet(currentWorkoutQuest.id, activeWorkoutQuest.type, exercise.id)
                }}
                style={{
                  width: '30px',
                  height: '30px',
                  padding: 0,
                  borderRadius: '8px',
                  background: isExerciseDone
                    ? '#261742'
                    : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                  border: isExerciseDone ? '1px solid #6c3cb8' : '1px solid #a855f7',
                  color: isExerciseDone ? '#d8b4fe' : '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: isExerciseDone ? 'none' : '0 2px 10px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.15s ease',
                }}
                title={
                  isExerciseDone
                    ? 'Semua set selesai (Tap untuk reset kembali ke 0)'
                    : `Selesaikan Set ${completedSetsCount + 1}/${totalSetsCount} & mulai timer`
                }
                aria-label={
                  isExerciseDone
                    ? 'Semua set selesai'
                    : `Selesaikan Set ${completedSetsCount + 1}`
                }
              >
                <Check size={14} strokeWidth={3} />
              </button>

              {/* BUTTON 2: DROPDOWN EDIT & DELETE (TITIK TIGA) */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenExerciseDropdownId(openExerciseDropdownId === exercise.id ? null : exercise.id)
                  }}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    background: openExerciseDropdownId === exercise.id ? '#361c6b' : '#181424',
                    border: openExerciseDropdownId === exercise.id ? '1px solid #a855f7' : '1px solid #2b243d',
                    color: openExerciseDropdownId === exercise.id ? '#ffffff' : '#a497be',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Edit / Hapus Gerakan"
                  aria-label="Edit / Hapus Gerakan"
                >
                  <MoreVertical size={14} />
                </button>

                {openExerciseDropdownId === exercise.id && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 60 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenExerciseDropdownId(null)
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        zIndex: 70,
                        background: '#130f23',
                        border: '1px solid #4a2f77',
                        borderRadius: '11px',
                        padding: '5px',
                        width: '138px',
                        boxShadow: '0 10px 28px rgba(0,0,0,0.85), 0 0 15px rgba(139,92,246,0.25)',
                        animation: 'fadeIn 0.12s ease-out',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenExerciseDropdownId(null)
                          setEditingExerciseId(exercise.id)
                          setEditingExerciseName(exercise.name)
                          setEditingExerciseRest(exercise.restSeconds || 60)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          background: 'transparent',
                          border: 0,
                          color: '#f3f1ff',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#251745')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Pencil size={12} color="#c084fc" />
                        <span>Edit Gerakan</span>
                      </button>

                      <div style={{ height: '1px', background: '#291e45', margin: '3px 0' }} />

                      <button
                        type="button"
                        onClick={() => {
                          setOpenExerciseDropdownId(null)
                          if (confirm(`Hapus gerakan "${exercise.name}"?`)) {
                            handleDeleteExercise(currentWorkoutQuest.id, activeWorkoutQuest.type, exercise.id)
                          }
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '7px 9px',
                          borderRadius: '7px',
                          background: 'transparent',
                          border: 0,
                          color: '#ff9dbb',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#381628')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Trash2 size={12} color="#ff7096" />
                        <span>Hapus Gerakan</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* BUTTON 3: MASUK KE HALAMAN DETAIL */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenExerciseDropdownId(null)
                  setActiveExerciseId(exercise.id)
                }}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  background: '#181424',
                  border: '1px solid #2b243d',
                  color: '#d5beff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                title="Buka Detail Set & Beban"
                aria-label="Buka Detail Set & Beban"
              >
                <ChevronRight size={15} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderFloatingRestTimer = () => {
    if (!activeWorkoutQuest || !showFloatingTimer) return null

    return (
      <div
        style={{
          position: 'fixed',
          top: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          width: 'calc(100% - 32px)',
          maxWidth: '390px',
          padding: '10px 14px 12px',
          borderRadius: '16px',
          background: 'rgba(22, 14, 44, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: restTimerActive
            ? '1px solid rgba(168, 85, 247, 0.75)'
            : '1px solid rgba(234, 179, 8, 0.65)',
          boxShadow: restTimerActive
            ? '0 14px 36px rgba(0, 0, 0, 0.85), 0 0 25px rgba(139, 92, 246, 0.4)'
            : '0 14px 36px rgba(0, 0, 0, 0.85), 0 0 20px rgba(234, 179, 8, 0.25)',
          color: '#f3f1ff',
          animation: 'fadeIn 0.2s ease-out',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {/* SISI KIRI: ICON + TIMER COUNTDOWN */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9px',
                background: restTimerActive ? 'rgba(168, 85, 247, 0.25)' : 'rgba(234, 179, 8, 0.18)',
                border: restTimerActive ? '1px solid #c084fc' : '1px solid #facc15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: restTimerActive ? '#e9d5ff' : '#fef08a',
                flexShrink: 0,
              }}
            >
              <Timer size={16} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: restTimerActive ? '#d8b4fe' : '#fde047',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  marginBottom: '3px',
                }}
              >
                {restTimerActive ? '⏳ WAKTU ISTIRAHAT' : '⏸️ ISTIRAHAT DIJEDA'}
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  letterSpacing: '0.04em',
                  color: restTimerActive ? '#ffffff' : '#fef9c3',
                  lineHeight: 1,
                  textShadow: restTimerActive ? '0 0 14px rgba(192, 132, 252, 0.7)' : 'none',
                }}
              >
                {formatTimer(restSecondsLeft)}
              </div>
            </div>
          </div>

          {/* SISI KANAN: TOMBOL AKSI CEPAT (JEDA/LANJUT, +15s, ATUR, TUTUP/SKIP) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {/* BUTTON JEDA / LANJUT */}
            <button
              type="button"
              onClick={() => {
                if (restSecondsLeft === 0) setRestSecondsLeft(restDurationPreset)
                setRestTimerActive(!restTimerActive)
              }}
              style={{
                height: '28px',
                padding: '0 9px',
                borderRadius: '7px',
                background: restTimerActive
                  ? 'linear-gradient(135deg, #e11d48, #be123c)'
                  : 'linear-gradient(135deg, #7c3aed, #9333ea)',
                border: restTimerActive ? '1px solid #fb7185' : '1px solid #a855f7',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                boxShadow: restTimerActive
                  ? '0 0 10px rgba(225, 29, 72, 0.35)'
                  : '0 0 10px rgba(147, 51, 234, 0.35)',
              }}
            >
              {restTimerActive ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
              <span>{restTimerActive ? 'Jeda' : 'Lanjut'}</span>
            </button>

            {/* BUTTON +15s */}
            <button
              type="button"
              onClick={() => setRestSecondsLeft((s) => s + 15)}
              style={{
                height: '28px',
                padding: '0 7px',
                borderRadius: '7px',
                background: '#23183d',
                border: '1px solid #4a3275',
                color: '#c4b5fd',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Tambah istirahat 15 detik"
            >
              +15s
            </button>

            {/* BUTTON ATUR */}
            <button
              type="button"
              onClick={() => {
                setCustomTimerSeconds(restDurationPreset || restSecondsLeft || 60)
                setIsTimerSettingOpen(true)
              }}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: '#1c1432',
                border: '1px solid #3c2a59',
                color: '#d5beff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Atur durasi istirahat"
            >
              <Sliders size={11} />
            </button>

            {/* BUTTON TUTUP / LEWATI (X) */}
            <button
              type="button"
              onClick={() => {
                setRestTimerActive(false)
                setShowFloatingTimer(false)
                setRestSecondsLeft(restDurationPreset)
                showToast('Waktu istirahat dilewati. Siap latihan!')
              }}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: '#2a1322',
                border: '1px solid #5a1e3d',
                color: '#ff9dbb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Tutup / Lewati Istirahat"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* PROGRESS TRACK DI DASAR FLOATING NOTIF */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, (restSecondsLeft / (restDurationPreset || 60)) * 100))}%`,
              height: '100%',
              background: restTimerActive
                ? 'linear-gradient(90deg, #7a43d8, #c38eff)'
                : '#eab308',
              boxShadow: restTimerActive ? '0 0 8px #9e6aff' : 'none',
              transition: 'width 1s linear',
            }}
          />
        </div>
      </div>
    )
  }

  const renderTimerSettingModal = () => {
    if (!isTimerSettingOpen) return null

    return (
      <div className="modal-overlay" onClick={() => setIsTimerSettingOpen(false)} style={{ zIndex: 10000 }}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>DURASI ISTIRAHAT</h3>
            <button
              type="button"
              onClick={() => setIsTimerSettingOpen(false)}
              className="modal-close"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {[30, 45, 60, 90, 120, 180].map((secs) => {
              const isSelected = customTimerSeconds === secs
              return (
                <button
                  key={secs}
                  type="button"
                  onClick={() => setCustomTimerSeconds(secs)}
                  style={{
                    flex: '1 1 calc(16.66% - 5px)',
                    minWidth: '42px',
                    padding: '6px 4px',
                    borderRadius: '8px',
                    background: isSelected ? '#6d28d9' : '#1a1329',
                    border: isSelected ? '1px solid #a855f7' : '1px solid #382754',
                    color: isSelected ? '#ffffff' : '#b7a4d5',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => setCustomTimerSeconds((s) => Math.max(5, s - 15))}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                background: '#201733',
                border: '1px solid #3c2a59',
                color: '#d5beff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              -15s
            </button>

            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0814',
                border: '1px solid #322549',
                borderRadius: '8px',
                padding: '6px 8px',
              }}
            >
              <input
                type="number"
                min={5}
                max={600}
                step={5}
                value={customTimerSeconds}
                onChange={(e) => setCustomTimerSeconds(Math.max(5, parseInt(e.target.value, 10) || 5))}
                style={{
                  width: '55px',
                  background: 'transparent',
                  border: 0,
                  color: '#d5bdff',
                  fontSize: '16px',
                  fontWeight: 800,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                }}
              />
              <span style={{ fontSize: '11px', color: '#8e84a2', fontWeight: 600 }}>detik ({formatTimer(customTimerSeconds)})</span>
            </div>

            <button
              type="button"
              onClick={() => setCustomTimerSeconds((s) => s + 15)}
              style={{
                padding: '7px 12px',
                borderRadius: '8px',
                background: '#201733',
                border: '1px solid #3c2a59',
                color: '#d5beff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              +15s
            </button>
          </div>

          {workoutQuestExercises.length > 0 && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#c4b5fd',
                marginBottom: '16px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={applyTimerToAllExercises}
                onChange={(e) => setApplyTimerToAllExercises(e.target.checked)}
                style={{ accentColor: '#9333ea', cursor: 'pointer' }}
              />
              <span>Terapkan ke semua gerakan ({workoutQuestExercises.length}) di quest ini</span>
            </label>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setIsTimerSettingOpen(false)}
              className="btn-secondary"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                const newSecs = Math.max(5, customTimerSeconds)
                setRestDurationPreset(newSecs)
                setRestSecondsLeft(newSecs)
                setRestTimerActive(false)

                if (applyTimerToAllExercises && currentWorkoutQuest && activeWorkoutQuest) {
                  const updated = (currentWorkoutQuest.workoutExercises ?? []).map((ex) => ({
                    ...ex,
                    restSeconds: newSecs,
                  }))
                  handleUpdateWorkoutExercises(currentWorkoutQuest.id, activeWorkoutQuest.type, updated)
                }

                setIsTimerSettingOpen(false)
                showToast(`Timer istirahat diatur ke ${newSecs} detik (${formatTimer(newSecs)})!`)
              }}
              className="btn-primary"
            >
              Simpan Timer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="app-shell">
      <div className="phone-frame">
        {/* TOPBAR */}
        <header className="topbar" style={{ marginBottom: '16px' }}>
          <div className="brand-mark">
            <Swords size={17} strokeWidth={2.5} />
          </div>
          <div className="brand-name">
            SOLO<span>LEVEL</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="user-pill"
              onClick={() => setIsAuthModalOpen(true)}
              title="Ganti / Tambah Akun Hunter"
            >
              <UserRound size={12} />
              {currentUser.username}
            </button>
            <button
              type="button"
              className="user-pill"
              onClick={() => setIsSettingsMenuOpen(!isSettingsMenuOpen)}
              title="Pengaturan & Konsistensi"
              style={{
                background: isSettingsMenuOpen ? '#361c6b' : '#1d1433',
                borderColor: isSettingsMenuOpen ? '#a855f7' : '#452e75',
                color: isSettingsMenuOpen ? '#ffffff' : '#d5beff',
              }}
            >
              <Settings size={13} />
            </button>

            {/* POPUP DROPDOWN MENU */}
            {isSettingsMenuOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                  onClick={() => setIsSettingsMenuOpen(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 100,
                    background: '#130f23',
                    border: '1px solid #4a2f77',
                    borderRadius: '14px',
                    padding: '6px',
                    width: '210px',
                    boxShadow: '0 12px 35px rgba(0,0,0,0.85), 0 0 20px rgba(139,92,246,0.3)',
                  }}
                >
                  {/* Menu 1: Consistency */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsMenuOpen(false)
                      setIsConsistencyModalOpen(true)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '9px',
                      background: 'transparent',
                      border: 0,
                      color: '#f3f1ff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#251745')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Activity size={15} color="#c084fc" />
                    <div>
                      <div>Consistency</div>
                      <small style={{ display: 'block', fontSize: '9px', color: '#9382b0', fontWeight: 400 }}>
                        Monitor konsistensi quest
                      </small>
                    </div>
                  </button>

                  {/* Menu 2: Settings */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsMenuOpen(false)
                      setPrefUsername(currentUser.username)
                      setIsPreferencesModalOpen(true)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '9px',
                      background: 'transparent',
                      border: 0,
                      color: '#d1c4e9',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#251745')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Sliders size={15} color="#a855f7" />
                    <div>
                      <div>Settings</div>
                      <small style={{ display: 'block', fontSize: '9px', color: '#9382b0', fontWeight: 400 }}>
                        Pengaturan & profil hunter
                      </small>
                    </div>
                  </button>

                  <div style={{ height: '1px', background: '#291e45', margin: '4px 0' }} />

                  {/* Menu 3: Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsMenuOpen(false)
                      handleSignOut()
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 12px',
                      borderRadius: '9px',
                      background: 'transparent',
                      border: 0,
                      color: '#ff9dbb',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#381628')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={15} color="#ff7096" />
                    <div>
                      <div>Logout</div>
                      <small style={{ display: 'block', fontSize: '9px', color: '#b96c80', fontWeight: 400 }}>
                        Keluar dari sistem hunter
                      </small>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* FLOATING HEADS-UP REST TIMER (DYNAMIC ISLAND STYLE, MUNCUL HANYA SAAT SELESAI SET) */}
        {renderFloatingRestTimer()}

        {/* MODAL PENGATURAN DURASI ISTIRAHAT */}
        {renderTimerSettingModal()}

        {/* FLOATING HEADS-UP NOTIFICATION (SEPERTI NOTIF HP, TIDAK MENGGESER KONTEN) */}
        {statusMessage && (
          <div
            style={{
              position: 'fixed',
              top: activeWorkoutQuest && showFloatingTimer ? '86px' : '18px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: 'calc(100% - 40px)',
              maxWidth: '390px',
              padding: '11px 16px',
              borderRadius: '14px',
              background: 'rgba(24, 15, 46, 0.94)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(168, 85, 247, 0.6)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(139, 92, 246, 0.35)',
              color: '#f3f1ff',
              fontSize: '11.5px',
              fontWeight: 600,
              textAlign: 'center',
              pointerEvents: 'none',
              letterSpacing: '0.01em',
              transition: 'top 0.2s ease',
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* ================================================================
            HALAMAN KHUSUS: DEDICATED GYM WORKOUT SESSION (SOLO LEVELING EDITION)
           ================================================================ */}
        {activeWorkoutQuest && currentWorkoutQuest ? (
          <div style={{ animation: 'fadeIn 0.2s ease-in-out', paddingBottom: '30px' }}>
            {activeExerciseId && activeExercise ? (
              /* ============================================================
                 HALAMAN DETAIL GERAKAN (EXERCISE DETAIL VIEW)
                 Menampilkan nama gerakan, timer, dan tabel set lengkap
                 ============================================================ */
              <div>
                {/* HEADER DETAIL GERAKAN */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => setActiveExerciseId(null)}
                      style={{
                        background: '#171226',
                        border: '1px solid #32254a',
                        borderRadius: '10px',
                        width: '34px',
                        height: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d5beff',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Kembali ke Daftar Gerakan"
                      aria-label="Kembali ke Daftar Gerakan"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div className="eyebrow" style={{ color: '#9d76f3', fontSize: '9px' }}>
                        GERAKAN #{workoutQuestExercises.findIndex((e) => e.id === activeExercise.id) + 1} • ⏱ {activeExercise.restSeconds || 60}S
                      </div>
                      <h2
                        style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: '#ffffff',
                          margin: '3px 0 0',
                          letterSpacing: '-0.02em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {activeExercise.name}
                      </h2>
                    </div>
                  </div>

                  {/* RIGHT ACTIONS: EDIT & DELETE */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (editingExerciseId === activeExercise.id) {
                          setEditingExerciseId(null)
                        } else {
                          setEditingExerciseId(activeExercise.id)
                          setEditingExerciseName(activeExercise.name)
                          setEditingExerciseRest(activeExercise.restSeconds || 60)
                        }
                      }}
                      style={{
                        height: '32px',
                        padding: '0 10px',
                        borderRadius: '9px',
                        background: editingExerciseId === activeExercise.id ? '#3b1d70' : '#191426',
                        border: editingExerciseId === activeExercise.id ? '1px solid #a855f7' : '1px solid #2d2442',
                        color: '#d5beff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                      title="Edit Nama & Durasi Istirahat"
                    >
                      <Pencil size={12} />
                      <span>{editingExerciseId === activeExercise.id ? 'Tutup' : 'Edit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus gerakan "${activeExercise.name}"?`)) {
                          handleDeleteExercise(currentWorkoutQuest.id, activeWorkoutQuest.type, activeExercise.id)
                          setActiveExerciseId(null)
                        }
                      }}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '9px',
                        background: '#241220',
                        border: '1px solid #4a1c36',
                        color: '#ff85a2',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Hapus Gerakan"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* FORM EDIT GERAKAN JIKA SEDANG DIAKTIFKAN */}
                {editingExerciseId === activeExercise.id && (
                  <div
                    style={{
                      background: '#130f21',
                      border: '1px solid #4a2f77',
                      borderRadius: '14px',
                      padding: '14px',
                      marginBottom: '16px',
                    }}
                  >
                    <div className="modal-label" style={{ marginBottom: '8px' }}>
                      EDIT NAMA & ISTIRAHAT GERAKAN
                    </div>
                    <input
                      type="text"
                      value={editingExerciseName}
                      onChange={(e) => setEditingExerciseName(e.target.value)}
                      placeholder="Nama Gerakan"
                      className="modal-input"
                      style={{ marginBottom: '10px', padding: '8px 11px', fontSize: '12px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', color: '#8e84a2' }}>Waktu Istirahat:</span>
                      <input
                        type="number"
                        min={10}
                        step={5}
                        value={editingExerciseRest}
                        onChange={(e) => setEditingExerciseRest(parseInt(e.target.value, 10) || 60)}
                        style={{
                          width: '68px',
                          padding: '6px 8px',
                          background: '#0a0814',
                          border: '1px solid #322549',
                          borderRadius: '7px',
                          color: '#f3f1ff',
                          fontSize: '12px',
                          fontWeight: 700,
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#8e84a2' }}>detik</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setEditingExerciseId(null)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateExercise(
                            currentWorkoutQuest.id,
                            activeWorkoutQuest.type,
                            activeExercise.id,
                            editingExerciseName,
                            editingExerciseRest
                          )
                        }
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '11px' }}
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                )}


                {/* TABEL SET GERAKAN */}
                <div
                  style={{
                    background: '#12101a',
                    border: '1px solid #252130',
                    borderRadius: '15px',
                    padding: '14px 12px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                      padding: '0 2px',
                    }}
                  >
                    <span className="eyebrow" style={{ fontSize: '9px', color: '#9d76f3' }}>
                      DAFTAR SET LATIHAN
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#c7a5ff',
                        background: '#20133b',
                        padding: '3px 9px',
                        borderRadius: '99px',
                      }}
                    >
                      {activeExercise.sets.filter((s) => s.completed).length}/{activeExercise.sets.length} Selesai
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                    {/* TABLE HEADER */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '34px 1fr 1fr 40px 24px',
                        gap: '8px',
                        padding: '0 4px 4px',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        color: '#756d82',
                        textAlign: 'center',
                      }}
                    >
                      <span>SET</span>
                      <span>BEBAN (KG)</span>
                      <span>REPETISI</span>
                      <span>SELESAI</span>
                      <span></span>
                    </div>

                    {/* SET ROWS */}
                    {activeExercise.sets.map((set) => (
                      <div
                        key={set.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '34px 1fr 1fr 40px 24px',
                          gap: '8px',
                          alignItems: 'center',
                          background: set.completed ? 'rgba(34, 24, 56, 0.85)' : '#171422',
                          border: set.completed ? '1px solid #553592' : '1px solid #241f33',
                          borderRadius: '10px',
                          padding: '7px 4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {/* SET NUMBER */}
                        <div
                          style={{
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: 800,
                            color: set.completed ? '#d5bdff' : '#8d829f',
                          }}
                        >
                          #{set.setNumber}
                        </div>

                        {/* WEIGHT (KG) INPUT */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={set.weight ?? 0}
                            onChange={(e) =>
                              handleUpdateSetField(
                                currentWorkoutQuest.id,
                                activeWorkoutQuest.type,
                                activeExercise.id,
                                set.id,
                                'weight',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            style={{
                              width: '100%',
                              maxWidth: '64px',
                              padding: '5px 6px',
                              background: '#0c0a14',
                              border: '1px solid #2e2444',
                              borderRadius: '7px',
                              color: '#f3f1ff',
                              fontSize: '12px',
                              fontWeight: 700,
                              textAlign: 'center',
                            }}
                          />
                        </div>

                        {/* REPS INPUT */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={set.reps}
                            onChange={(e) =>
                              handleUpdateSetField(
                                currentWorkoutQuest.id,
                                activeWorkoutQuest.type,
                                activeExercise.id,
                                set.id,
                                'reps',
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            style={{
                              width: '100%',
                              maxWidth: '64px',
                              padding: '5px 6px',
                              background: '#0c0a14',
                              border: '1px solid #2e2444',
                              borderRadius: '7px',
                              color: '#f3f1ff',
                              fontSize: '12px',
                              fontWeight: 700,
                              textAlign: 'center',
                            }}
                          />
                        </div>

                        {/* COMPLETE BUTTON (CHECK) */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleWorkoutSet(
                                currentWorkoutQuest.id,
                                activeWorkoutQuest.type,
                                activeExercise.id,
                                set.id
                              )
                            }
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '7px',
                              background: set.completed ? '#8a51de' : 'transparent',
                              border: set.completed ? '1px solid #a974f5' : '1px solid #55406f',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: set.completed ? '0 0 10px rgba(138, 81, 222, 0.45)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                            title={set.completed ? 'Batalkan Set' : 'Selesaikan Set & Mulai Timer Istirahat'}
                          >
                            {set.completed && <Check size={13} strokeWidth={3} />}
                          </button>
                        </div>

                        {/* DELETE SET BUTTON */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {activeExercise.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteSet(
                                  currentWorkoutQuest.id,
                                  activeWorkoutQuest.type,
                                  activeExercise.id,
                                  set.id
                                )
                              }
                              style={{
                                background: 'transparent',
                                border: 0,
                                color: '#6b617d',
                                cursor: 'pointer',
                                padding: '3px',
                              }}
                              title="Hapus Set"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* BUTTON ADD SET */}
                  <button
                    type="button"
                    onClick={() => handleAddSetToExercise(currentWorkoutQuest.id, activeWorkoutQuest.type, activeExercise.id)}
                    className="add-task"
                    style={{ marginTop: 0, padding: '9px' }}
                  >
                    <Plus size={12} /> Tambah Set
                  </button>
                </div>

                {/* BUTTON KEMBALI KE DAFTAR GERAKAN */}
                <button
                  type="button"
                  onClick={() => setActiveExerciseId(null)}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '11px',
                    borderRadius: '11px',
                    fontWeight: 700,
                  }}
                >
                  <ArrowLeft size={14} /> Kembali ke Daftar Gerakan
                </button>
              </div>
            ) : (
              /* ============================================================
                 HALAMAN UTAMA WORKOUT (LIST OF EXERCISES / OVERVIEW)
                 Desain Solo Leveling Dark Amethyst + 3 Tombol Aksi Gerakan
                 ============================================================ */
              <div>
                {/* HEADER WORKOUT */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveWorkoutQuest(null)
                        setActiveExerciseId(null)
                        setRestTimerActive(false)
                        setShowFloatingTimer(false)
                        setOpenExerciseDropdownId(null)
                      }}
                      style={{
                        background: '#171226',
                        border: '1px solid #32254a',
                        borderRadius: '10px',
                        width: '34px',
                        height: '34px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d5beff',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Kembali ke Daftar Quest"
                      aria-label="Kembali ke Daftar Quest"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div style={{ minWidth: 0 }}>
                      <div className="eyebrow" style={{ color: '#9d76f3', fontSize: '9px' }}>
                        DUNGEON WORKOUT
                      </div>
                      <h2
                        style={{
                          fontSize: '19px',
                          fontWeight: 800,
                          color: '#ffffff',
                          margin: '3px 0 0',
                          letterSpacing: '-0.02em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {currentWorkoutQuest.title}
                      </h2>
                    </div>
                  </div>

                  {/* PILL TIMER PRESET & PROGRESS SET DI KANAN ATAS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomTimerSeconds(restDurationPreset || 60)
                        setIsTimerSettingOpen(true)
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '99px',
                        background: '#1d1433',
                        border: '1px solid #452e75',
                        color: '#d5beff',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Atur Durasi Istirahat"
                    >
                      <Timer size={11} color="#c084fc" />
                      <span>{restDurationPreset}s</span>
                    </button>
                    <div
                      className="completion"
                      style={{
                        border: '1px solid rgba(149, 94, 255, 0.35)',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}
                    >
                      {completedWorkoutSets}/{totalWorkoutSets} Set
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCompleteWorkout(currentWorkoutQuest.id, activeWorkoutQuest.type)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                        border: '1px solid rgba(168, 85, 247, 0.6)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 2px 10px rgba(124, 58, 237, 0.35)',
                        transition: 'all 0.15s ease',
                      }}
                      title="Selesaikan Workout & Tandai Quest Selesai"
                      aria-label="Selesaikan Workout & Tandai Quest Selesai"
                    >
                      <Trophy size={13} color="#fbbf24" />
                    </button>
                  </div>
                </div>

                {/* SECTION HEADER: PENDING (WAITING) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    padding: '0 2px',
                  }}
                >
                  <span className="eyebrow" style={{ fontSize: '10px', color: '#9d76f3' }}>
                    PENDING ({pendingWorkoutExercises.length})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {workoutQuestExercises.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Yakin ingin mengosongkan semua gerakan di quest workout ini?')) {
                            handleClearAllExercises(currentWorkoutQuest.id, activeWorkoutQuest.type)
                          }
                        }}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#1d1222',
                          border: '1px solid #3d1c31',
                          color: '#ff85a2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Kosongkan Semua Gerakan"
                        aria-label="Kosongkan Semua Gerakan"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    {!isAddingExercise && (
                      <button
                        type="button"
                        onClick={() => setIsAddingExercise(true)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#20153a',
                          border: '1px solid #452e75',
                          color: '#d5beff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Tambah Gerakan Baru"
                        aria-label="Tambah Gerakan Baru"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* EMPTY STATE: JIKA BELUM ADA GERAKAN SAMA SEKALI */}
                {workoutQuestExercises.length === 0 && !isAddingExercise && (
                  <div className="lock-banner" style={{ padding: '28px 16px', marginBottom: '16px' }}>
                    <Dumbbell size={28} color="#9d70ed" style={{ margin: '0 auto 6px', opacity: 0.8 }} />
                    <strong style={{ display: 'block', fontSize: '13px', color: '#f3f1ff' }}>
                      Belum Ada Gerakan Latihan
                    </strong>
                    <p style={{ margin: '5px auto 14px', maxWidth: '240px' }}>
                      Tambahkan gerakan workout beserta jumlah set dan target waktu istirahatmu.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddingExercise(true)}
                      className="btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}
                    >
                      <Plus size={13} /> Tambah Gerakan Pertama
                    </button>
                  </div>
                )}

                {/* FORM TAMBAH GERAKAN BARU */}
                {isAddingExercise && (
                  <div
                    style={{
                      background: '#130f21',
                      border: '1px solid #4a2f77',
                      borderRadius: '15px',
                      padding: '14px',
                      marginBottom: '14px',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span className="modal-label" style={{ marginBottom: 0, color: '#c4b5fd' }}>
                        TAMBAH GERAKAN LATIHAN
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingExercise(false)
                          setNewExerciseName('')
                        }}
                        style={{ background: 'transparent', border: 0, color: '#8e84a2', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newExerciseName}
                      onChange={(e) => setNewExerciseName(e.target.value)}
                      placeholder="Nama Gerakan (cth: Bench Press / Pull Up)"
                      className="modal-input"
                      style={{ marginBottom: '10px', padding: '9px 11px', fontSize: '12px' }}
                      autoFocus
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#8e84a2', marginBottom: '4px', fontWeight: 600 }}>
                          Istirahat (detik)
                        </label>
                        <input
                          type="number"
                          min={10}
                          step={5}
                          value={newExerciseRest}
                          onChange={(e) => setNewExerciseRest(parseInt(e.target.value, 10) || 60)}
                          style={{
                            width: '100%',
                            padding: '7px 8px',
                            background: '#0a0814',
                            border: '1px solid #322549',
                            borderRadius: '8px',
                            color: '#f3f1ff',
                            fontSize: '12px',
                            fontWeight: 700,
                            textAlign: 'center',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#8e84a2', marginBottom: '4px', fontWeight: 600 }}>
                          Jumlah Set
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={newExerciseSetsCount}
                          onChange={(e) => setNewExerciseSetsCount(parseInt(e.target.value, 10) || 3)}
                          style={{
                            width: '100%',
                            padding: '7px 8px',
                            background: '#0a0814',
                            border: '1px solid #322549',
                            borderRadius: '8px',
                            color: '#f3f1ff',
                            fontSize: '12px',
                            fontWeight: 700,
                            textAlign: 'center',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingExercise(false)
                          setNewExerciseName('')
                        }}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '11px' }}
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (newExerciseName.trim()) {
                            handleAddExercise(
                              currentWorkoutQuest.id,
                              activeWorkoutQuest.type,
                              newExerciseName,
                              newExerciseRest,
                              newExerciseSetsCount
                            )
                            setNewExerciseName('')
                            setIsAddingExercise(false)
                          }
                        }}
                        className="btn-primary"
                        style={{ padding: '6px 14px', fontSize: '11px' }}
                      >
                        Simpan Gerakan
                      </button>
                    </div>
                  </div>
                )}

                {/* BAGIAN 1 (ATAS): GERAKAN YANG BELUM DIKERJAKAN */}
                {workoutQuestExercises.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '18px' }}>
                    {pendingWorkoutExercises.length > 0 ? (
                      pendingWorkoutExercises.map((exercise) => renderWorkoutExerciseCard(exercise))
                    ) : (
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: 'rgba(34, 24, 56, 0.35)',
                          border: '1px dashed rgba(149, 94, 255, 0.3)',
                          textAlign: 'center',
                          fontSize: '11px',
                          color: '#b7a4d5',
                          fontWeight: 600,
                        }}
                      >
                        ✨ Semua gerakan latihan sudah selesai dikerjakan!
                      </div>
                    )}
                  </div>
                )}

                {/* BAGIAN 2 (BAWAH): GERAKAN YANG SUDAH SELESAI DIKERJAKAN */}
                {workoutQuestExercises.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '9px',
                        padding: '0 2px',
                      }}
                    >
                      <span className="eyebrow" style={{ fontSize: '10px', color: '#817b93' }}>
                        COMPLETED ({completedWorkoutExercises.length})
                      </span>
                    </div>

                    {completedWorkoutExercises.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        {completedWorkoutExercises.map((exercise) => renderWorkoutExerciseCard(exercise))}
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '11px 14px',
                          borderRadius: '12px',
                          background: '#0f0d17',
                          border: '1px dashed #241f33',
                          textAlign: 'center',
                          fontSize: '10.5px',
                          color: '#6b637b',
                        }}
                      >
                        Gerakan yang semua set-nya selesai akan otomatis pindah ke bawah sini.
                      </div>
                    )}
                  </div>
                )}

                {/* BOTTOM ACTION: SELESAIKAN WORKOUT (BUTTON LOGIN STYLE: WAJAR & TEKS FINISH) */}
                <div style={{ paddingTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleCompleteWorkout(currentWorkoutQuest.id, activeWorkoutQuest.type)}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '12px',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
                      transition: 'all 0.15s ease',
                    }}
                    title="Selesaikan Workout & Tandai Quest Selesai"
                  >
                    Finish
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ================================================================
                TAB 1: HOME
               ================================================================ */}
            {activeTab === 'home' && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">HUNTER: {currentUser.username.toUpperCase()}</p>
                <h1>
                  Bangun kekuatanmu
                  <br />
                  <span>setiap hari.</span>
                </h1>
              </div>
              <div className="rank-badge">
                <span>RANK</span>
                <strong>{currentRank}</strong>
              </div>
            </section>

            <section className="level-card">
              <div className="level-heading">
                <div>
                  <span className="label-muted">CURRENT LEVEL</span>
                  <strong>Level {currentLevel}</strong>
                </div>
                <div className="xp-count">
                  <Zap size={14} fill="currentColor" /> {currentUser.xp.toLocaleString('id-ID')} XP
                </div>
              </div>
              <div className="xp-track">
                <span style={{ width: `${levelProgress}%` }} />
              </div>
              <div className="level-footer">
                <span>Ke level {currentLevel + 1}</span>
                <span>{nextLevelXp.toLocaleString('id-ID')} XP</span>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card accent">
                <Flame size={18} />
                <div>
                  <strong>{currentUser.streak} hari</strong>
                  <span>Streak saat ini</span>
                </div>
              </div>
              <div
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveTab('clan')}
              >
                <Shield size={18} />
                <div>
                  <strong>{userJoinedClanIds.length} Clan</strong>
                  <span>Komunitas diikuti</span>
                </div>
              </div>
            </section>

            <section className="section-block">
              <div className="section-title">
                <div>
                  <span className="eyebrow">PERSONAL QUEST</span>
                  <h2>Quest Pribadi ({currentUser.username})</h2>
                </div>
                <span className="completion">
                  {completedPersonalCount}/{userPersonalTasks.length}
                </span>
              </div>

              {/* Banner Reward List Quest Personal */}
              {userPersonalTasks.length > 0 && (() => {
                const totalPersonalListXp = userPersonalTasks.reduce((sum, t) => sum + t.xp, 0)
                const isAllDone = userPersonalTasks.length > 0 && completedPersonalCount === userPersonalTasks.length

                return (
                  <div
                    style={{
                      background: isAllDone
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(22, 101, 52, 0.2))'
                        : 'linear-gradient(135deg, rgba(37, 20, 68, 0.65), rgba(18, 14, 30, 0.85))',
                      border: isAllDone
                        ? '1px solid rgba(74, 222, 128, 0.35)'
                        : '1px solid rgba(139, 92, 246, 0.25)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isAllDone ? '#86efac' : '#c084fc',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Zap size={13} />
                        {isAllDone ? 'DAILY REWARD DIPEROLEH!' : 'DAILY REWARD LIST'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#8e84a2', marginTop: '2px' }}>
                        {isAllDone
                          ? `Seluruh (${completedPersonalCount}/${userPersonalTasks.length}) quest selesai • +${totalPersonalListXp} XP aktif`
                          : `Selesaikan semua (${completedPersonalCount}/${userPersonalTasks.length}) quest untuk mendapatkan XP`}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: isAllDone ? '#4ade80' : '#d5beff',
                        background: isAllDone ? 'rgba(74, 222, 128, 0.2)' : 'rgba(168, 85, 247, 0.18)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: isAllDone ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(168, 85, 247, 0.3)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      +{totalPersonalListXp} XP
                    </div>
                  </div>
                )
              })()}

              <div className="task-list">
                {userPersonalTasks.map((task) => (
                  <QuestCard
                    key={task.id}
                    title={task.title}
                    meta={task.category}
                    icon={task.icon}
                    done={task.done}
                    canManage={true}
                    isGym={task.category.toLowerCase() === 'gym'}
                    onOpenWorkout={() => setActiveWorkoutQuest({ type: 'personal', id: task.id })}
                    onToggle={() => handleTogglePersonal(task.id)}
                    onEdit={() => openEditPersonalModal(task)}
                    onDelete={() => handleDeletePersonal(task.id)}
                  />
                ))}
              </div>
              <button className="add-task" onClick={openAddPersonalModal}>
                <Plus size={17} /> Tambah quest pribadi
              </button>
            </section>
          </>
        )}

        {/* ================================================================
            TAB 2: MY QUEST (Personal Checklist tanpa Mini Calendar)
           ================================================================ */}
        {activeTab === 'calendar' && (
          <>
            <section className="quest-heading">
              <div>
                <p className="eyebrow">MY QUEST • {currentUser.username.toUpperCase()}</p>
                <h1>Daily checklist</h1>
                <p className="quest-date">Jumat, 01 November 2024</p>
              </div>
              <div className="quest-count">
                <span>DONE</span>
                <strong>
                  {completedPersonalCount}/{userPersonalTasks.length}
                </strong>
              </div>
            </section>

            <section className="section-block quest-list-section">
              {/* Banner Reward List Quest Personal */}
              {userPersonalTasks.length > 0 && (() => {
                const totalPersonalListXp = userPersonalTasks.reduce((sum, t) => sum + t.xp, 0)
                const isAllDone = userPersonalTasks.length > 0 && completedPersonalCount === userPersonalTasks.length

                return (
                  <div
                    style={{
                      background: isAllDone
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(22, 101, 52, 0.2))'
                        : 'linear-gradient(135deg, rgba(37, 20, 68, 0.65), rgba(18, 14, 30, 0.85))',
                      border: isAllDone
                        ? '1px solid rgba(74, 222, 128, 0.35)'
                        : '1px solid rgba(139, 92, 246, 0.25)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isAllDone ? '#86efac' : '#c084fc',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Zap size={13} />
                        {isAllDone ? 'DAILY REWARD DIPEROLEH!' : 'DAILY REWARD LIST'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#8e84a2', marginTop: '2px' }}>
                        {isAllDone
                          ? `Seluruh (${completedPersonalCount}/${userPersonalTasks.length}) quest selesai • +${totalPersonalListXp} XP aktif`
                          : `Selesaikan semua (${completedPersonalCount}/${userPersonalTasks.length}) quest untuk mendapatkan XP`}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: isAllDone ? '#4ade80' : '#d5beff',
                        background: isAllDone ? 'rgba(74, 222, 128, 0.2)' : 'rgba(168, 85, 247, 0.18)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: isAllDone ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(168, 85, 247, 0.3)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      +{totalPersonalListXp} XP
                    </div>
                  </div>
                )
              })()}

              <div className="task-list">
                {userPersonalTasks.map((task) => (
                  <QuestCard
                    key={task.id}
                    title={task.title}
                    meta={task.category}
                    icon={task.icon}
                    done={task.done}
                    canManage={true}
                    isGym={task.category.toLowerCase() === 'gym'}
                    onOpenWorkout={() => setActiveWorkoutQuest({ type: 'personal', id: task.id })}
                    onToggle={() => handleTogglePersonal(task.id)}
                    onEdit={() => openEditPersonalModal(task)}
                    onDelete={() => handleDeletePersonal(task.id)}
                  />
                ))}
              </div>
              <button className="add-task" onClick={openAddPersonalModal}>
                <Plus size={17} /> Tambah quest baru
              </button>
            </section>
          </>
        )}

        {/* ================================================================
            TAB 3: CLAN COMMUNITY (Fitur Utama Komunitas & Challenge Clan)
           ================================================================ */}
        {activeTab === 'clan' && (
          <>
            {selectedClan ? (
              isClanInfoPageOpen ? (
                /* ==============================================================
                   HALAMAN BARU: DETAIL INFO & ANGGOTA CLAN (SEPERTI WA GROUP INFO)
                   ============================================================== */
                <div>
                  {/* WhatsApp Group Info Topbar (Back ke Chat Clan + Judul Info Clan + Edit Clan Button) */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#151026',
                      border: '1px solid #3d2766',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setIsClanInfoPageOpen(false)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#d5beff',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                        title="Kembali ke Clan"
                        aria-label="Kembali"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', color: '#f3f1ff', fontWeight: 700 }}>
                          Info Clan
                        </h3>
                        <p style={{ margin: 0, fontSize: '11px', color: '#8e84a2' }}>
                          Detail grup {selectedClan.name}
                        </p>
                      </div>
                    </div>

                    {isLeaderOfSelectedClan && (
                      <button
                        type="button"
                        onClick={openEditClanModal}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(168, 85, 247, 0.18)',
                          border: '1px solid #7c3aed',
                          borderRadius: '10px',
                          padding: '6px 12px',
                          color: '#f3f1ff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        title="Edit Info Clan"
                      >
                        <Pencil size={13} color="#c084fc" /> Edit Clan
                      </button>
                    )}
                  </div>

                  {/* Full Page Group Info View (Foto Besar, Nama, Badges, Deskripsi, Invite Code, Anggota) */}
                  <div
                    style={{
                      background: '#120f21',
                      border: '1px solid #3d2766',
                      borderRadius: '18px',
                      padding: '20px 16px',
                      marginBottom: '16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* Top Hero: Big Avatar + Clan Name + Badges (Leader, Publik, Total XP) */}
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7c3aed, #4338ca)',
                          border: '2px solid #a855f7',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          boxShadow: '0 0 20px rgba(124, 58, 237, 0.45)',
                          marginBottom: '10px',
                        }}
                      >
                        <Shield size={30} />
                      </div>

                      <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f3f1ff', margin: '0 0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span>{selectedClan.name}</span>
                        {selectedClan.isPrivate && <Lock size={15} color="#8a7e9e" />}
                      </h2>

                      {/* Info XP Clan Minimalis */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span
                          style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.35)',
                            color: '#c084fc',
                            padding: '2px 10px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {selectedClan.totalXp.toLocaleString('id-ID')} XP
                        </span>
                      </div>


                    </div>

                    {/* Button Shortcut to Monitor Konsistensi Clan */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsClanInfoPageOpen(false)
                        setIsClanConsistencyPageOpen(true)
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '11px 14px',
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid #7c3aed',
                        borderRadius: '12px',
                        marginBottom: '16px',
                        cursor: 'pointer',
                        color: '#f3f1ff',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.18)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(168, 85, 247, 0.1)')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Activity size={16} color="#c084fc" />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Pantau Konsistensi Quest Clan</span>
                      </div>
                      <span style={{ color: '#c084fc', fontSize: '13px', fontWeight: 700 }}>Lihat Matrix →</span>
                    </button>

                    {/* Description Section */}
                    <div style={{ marginBottom: '14px' }}>
                      <label className="modal-label">DESKRIPSI GRUP</label>
                      <div
                        style={{
                          background: '#0a0814',
                          border: '1px solid #281d3d',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          fontSize: '12px',
                          color: '#c4b5fd',
                          lineHeight: '1.4',
                        }}
                      >
                        {selectedClan.description || 'Clan elit Hunter untuk menembus batas dungeon dan raid boss bersama.'}
                      </div>
                    </div>

                    {/* Invite Code */}
                    {(isMemberOfSelectedClan || !selectedClan.isPrivate) && (
                      <div style={{ marginBottom: '16px' }}>
                        <label className="modal-label">KODE INVITE CLAN</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            readOnly
                            className="modal-input"
                            value={selectedClan.inviteCode}
                            style={{ marginBottom: 0, fontFamily: 'monospace', letterSpacing: '0.1em' }}
                          />
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '0 14px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => {
                              navigator.clipboard?.writeText(selectedClan.inviteCode)
                              showToast(`Kode invite ${selectedClan.inviteCode} disalin!`)
                            }}
                          >
                            <Copy size={13} /> Salin
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Participant List (Daftar Anggota Clan persis seperti WA Group Info) */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="modal-label" style={{ margin: 0 }}>
                          ANGGOTA ({selectedClanMembers.length})
                        </label>
                        <span style={{ fontSize: '10px', color: '#8e84a2' }}>
                          Leader: {selectedClanLeader?.username || 'Hunter'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {selectedClanMembers.map((cm) => {
                          const memberUser = users.find((u) => u.id === cm.userId)
                          const isMe = cm.userId === currentUser.id
                          const isLeader = cm.role === 'leader'

                          return (
                            <div
                              key={`detail-member-${cm.userId}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 10px',
                                background: isMe ? 'rgba(124, 58, 237, 0.12)' : '#0d0a18',
                                border: isMe ? '1px solid #7c3aed' : '1px solid #231e30',
                                borderRadius: '10px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: isLeader ? 'linear-gradient(135deg, #a855f7, #ec4899)' : '#231d38',
                                    border: isLeader ? '1px solid #f472b6' : '1px solid #3d325a',
                                    color: '#fff',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {(memberUser?.username || 'H').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#f3f1ff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {memberUser?.username || 'Hunter'}
                                    {isMe && <span style={{ fontSize: '9px', color: '#a855f7' }}>(Kamu)</span>}
                                    {isLeader && (
                                      <span className="clan-badge leader" style={{ fontSize: '8px', padding: '1px 4px' }}>
                                        LEADER
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '10px', color: '#8e84a2' }}>
                                    Level {getHunterLevel(memberUser?.xp || 0)} • Rank {getHunterRank(memberUser?.xp || 0)}
                                  </div>
                                </div>
                              </div>

                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#c084fc' }}>
                                {cm.contributedXp.toLocaleString('id-ID')} XP
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action: Keluar dari Clan (Exit Group) */}
                  {isMemberOfSelectedClan && !isLeaderOfSelectedClan && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        width: '100%',
                        color: '#ff9dbb',
                        borderColor: '#5f2038',
                        background: '#26121f',
                        fontSize: '12px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        borderRadius: '12px',
                      }}
                      onClick={() => {
                        setIsClanInfoPageOpen(false)
                        handleLeaveClan(selectedClan.id)
                      }}
                    >
                      <LogOut size={14} /> Keluar dari Clan
                    </button>
                  )}
                </div>
              ) :
              isClanConsistencyPageOpen ? (
                /* ==============================================================
                   HALAMAN BARU: MONITOR KONSISTENSI CLAN (HELLOHABIT VIEW ONLY)
                   ============================================================== */
                <div>
                  {/* Topbar: Tombol Back ke Room Clan + Judul */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 12px',
                      background: '#151026',
                      border: '1px solid #3d2766',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsClanConsistencyPageOpen(false)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d5beff',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'background 0.15s',
                      }}
                      title="Kembali ke Clan"
                      aria-label="Kembali"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', color: '#f3f1ff', fontWeight: 700 }}>
                        Konsistensi Clan
                      </h3>
                      <p style={{ margin: 0, fontSize: '11px', color: '#8e84a2' }}>
                        Pantau kedisiplinan quest {selectedClan.name}
                      </p>
                    </div>
                  </div>

                  {/* HelloHabit 2026 In-Review Clan Heatmap Container */}
                  <div
                    style={{
                      background: '#120f21',
                      border: '1px solid #3d2766',
                      borderRadius: '18px',
                      padding: '20px 16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'rgba(168, 85, 247, 0.12)',
                          border: '1.5px solid #a855f7',
                          color: '#c084fc',
                          marginBottom: '8px',
                        }}
                      >
                        <CheckCircle2 size={20} strokeWidth={2.5} />
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f1ff', letterSpacing: '-0.02em' }}>
                        HelloHabit <span style={{ color: '#a855f7', fontSize: '11px', fontWeight: 700, border: '1px solid #7c3aed', padding: '1px 6px', borderRadius: '6px', verticalAlign: 'middle', marginLeft: '4px' }}>CLAN QUEST</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#7a708a', marginTop: '3px' }}>
                        {selectedClan.name} • 2026 In-Review
                      </div>
                    </div>

                    {/* Clan Quests Heatmap Matrix (View Only) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '6px 0' }}>
                      {selectedClanQuests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '28px 0', color: '#7d7291', fontSize: '12px' }}>
                          Belum ada Quest di Clan ini untuk dimonitor.
                        </div>
                      ) : (
                        selectedClanQuests.map((cq, index) => {
                          const colorObj = HABIT_PALETTES[(index + 3) % HABIT_PALETTES.length]
                          const baseRate = [82, 75, 68, 62][index % 4]
                          const { cells, pct } = getHabitYearGrid(cq.id, baseRate)
                          const scheduleText = cq.schedule && cq.schedule.length > 0
                            ? (cq.schedule.includes('Everyday') ? 'Everyday' : cq.schedule.join(', '))
                            : (cq.questType === 'event' ? 'Event Khusus' : 'Everyday')

                          return (
                            <div key={cq.id} style={{ cursor: 'default' }}>
                              {/* Title + Percentage */}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'baseline',
                                  marginBottom: '6px',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#f3f1ff',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden',
                                    paddingRight: '12px',
                                  }}
                                >
                                  {cq.title}{' '}
                                  <span style={{ fontSize: '11px', color: '#827896', fontWeight: 400 }}>
                                    - {scheduleText}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#f3f1ff',
                                    fontVariantNumeric: 'tabular-nums',
                                    flexShrink: 0,
                                  }}
                                >
                                  {pct}%
                                </div>
                              </div>

                              {/* Heatmap Grid (42 columns x 7 rows, 100% width, NO horizontal scroll) */}
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(42, 1fr)',
                                  gridTemplateRows: 'repeat(7, 1fr)',
                                  gridAutoFlow: 'column',
                                  gap: '2px',
                                  width: '100%',
                                  overflow: 'hidden',
                                }}
                              >
                                {cells.map((status, cIdx) => (
                                  <div
                                    key={cIdx}
                                    style={{
                                      aspectRatio: '1 / 1',
                                      borderRadius: '1.2px',
                                      background:
                                        status === 'active'
                                          ? colorObj.color
                                          : status === 'inactive'
                                          ? '#262430'
                                          : '#16151e',
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) :
              questInfoTarget ? (
                /* ==============================================================
                   HALAMAN BARU: INFO HUNTER QUEST (DEDICATED FULL PAGE - BUKAN POPUP)
                   ============================================================== */
                <div>
                  {/* Topbar: Tombol Back ke Room Clan + Judul Info Hunter */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#151026',
                      border: '1px solid #3d2766',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setQuestInfoTarget(null)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#d5beff',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                        title="Kembali ke Daftar Quest"
                        aria-label="Kembali"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', color: '#f3f1ff', fontWeight: 800 }}>
                          Info Hunter
                        </h3>
                        <p style={{ margin: 0, fontSize: '11px', color: '#8e84a2' }}>
                          Status pengerjaan quest di {selectedClan.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quest Info Banner Card */}
                  <div
                    style={{
                      background: '#161128',
                      border: '1px solid #3d2a63',
                      borderRadius: '16px',
                      padding: '16px',
                      marginBottom: '16px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px' }}>{questInfoTarget.icon}</span>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#f3f1ff' }}>
                        {questInfoTarget.title}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#c084fc',
                          background: 'rgba(168, 85, 247, 0.15)',
                          border: '1px solid rgba(168, 85, 247, 0.35)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}
                      >
                        {questInfoTarget.category}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#e9d5ff',
                          background: '#241a45',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                        }}
                      >
                        +{questInfoTarget.xp} XP
                      </span>
                      {questInfoTarget.questType === 'event' && (
                        <span className="clan-badge event">EVENT</span>
                      )}
                      {questInfoTarget.schedule && questInfoTarget.schedule.length > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#c4b5fd',
                            background: 'rgba(139, 92, 246, 0.15)',
                            border: '1px solid rgba(139, 92, 246, 0.35)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 500,
                          }}
                        >
                          <Clock size={10} />
                          {questInfoTarget.schedule.includes('Everyday') ? 'Everyday' : questInfoTarget.schedule.join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Clan Completion Progress Bar */}
                    {(() => {
                      const total = selectedClanMembers.length
                      const completed = selectedClanMembers.filter((cm) =>
                        questInfoTarget.completedByUserIds.includes(cm.userId)
                      ).length
                      const pct = total > 0 ? Math.round((completed / total) * 100) : 0

                      return (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
                            <span style={{ color: '#9d8eb6' }}>Progres Selesai Clan</span>
                            <strong style={{ color: '#c084fc' }}>
                              {completed} / {total} Hunter ({pct}%)
                            </strong>
                          </div>
                          <div
                            style={{
                              height: '8px',
                              background: '#0d0a17',
                              borderRadius: '999px',
                              overflow: 'hidden',
                              border: '1px solid #2f204c',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: pct === 100 ? '#10b981' : 'linear-gradient(90deg, #7c3aed, #c084fc)',
                                borderRadius: '999px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {/* List Member: Sudah vs Belum Menyelesaikan */}
                  {(() => {
                    const completedMembers = selectedClanMembers.filter((cm) =>
                      questInfoTarget.completedByUserIds.includes(cm.userId)
                    )
                    const pendingMembers = selectedClanMembers.filter(
                      (cm) => !questInfoTarget.completedByUserIds.includes(cm.userId)
                    )

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* SUDAH MENYELESAIKAN */}
                        <div
                          style={{
                            background: '#130e24',
                            border: '1px solid #2d2146',
                            borderRadius: '16px',
                            padding: '14px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#4ade80',
                              marginBottom: '10px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <span>✓ SUDAH MENYELESAIKAN ({completedMembers.length})</span>
                          </div>

                          {completedMembers.length === 0 ? (
                            <div
                              style={{
                                padding: '14px',
                                textAlign: 'center',
                                fontSize: '11px',
                                color: '#716886',
                                background: '#0b0916',
                                borderRadius: '10px',
                                border: '1px dashed #2c2242',
                              }}
                            >
                              Belum ada Hunter yang menyelesaikan quest ini hari ini.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {completedMembers.map((cm) => {
                                const mUser = users.find((u) => u.id === cm.userId)
                                const isMe = cm.userId === currentUser.id
                                const isLeader = cm.role === 'leader'

                                return (
                                  <div
                                    key={`done-${cm.userId}`}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '9px 12px',
                                      background: isMe ? 'rgba(74, 222, 128, 0.08)' : '#0d0a18',
                                      border: isMe ? '1px solid rgba(74, 222, 128, 0.35)' : '1px solid #1f1a2e',
                                      borderRadius: '10px',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          background: isLeader ? 'linear-gradient(135deg, #a855f7, #ec4899)' : '#231d38',
                                          border: isLeader ? '1px solid #f472b6' : '1px solid #3d325a',
                                          color: '#fff',
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {(mUser?.username || 'H').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#f3f1ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {mUser?.username || 'Hunter'}
                                          {isMe && <span style={{ fontSize: '10px', color: '#4ade80' }}>(Kamu)</span>}
                                          {isLeader && (
                                            <span className="clan-badge leader" style={{ fontSize: '8px', padding: '1px 5px' }}>
                                              LEADER
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#8e84a2' }}>
                                          Level {getHunterLevel(mUser?.xp || 0)} • Rank {getHunterRank(mUser?.xp || 0)}
                                        </div>
                                      </div>
                                    </div>

                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        color: '#4ade80',
                                        background: 'rgba(74, 222, 128, 0.12)',
                                        border: '1px solid rgba(74, 222, 128, 0.3)',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                      }}
                                    >
                                      ✓ Selesai
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* BELUM MENYELESAIKAN */}
                        <div
                          style={{
                            background: '#130e24',
                            border: '1px solid #2d2146',
                            borderRadius: '16px',
                            padding: '14px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#9384aa',
                              marginBottom: '10px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            <span>⏳ BELUM MENYELESAIKAN ({pendingMembers.length})</span>
                          </div>

                          {pendingMembers.length === 0 ? (
                            <div
                              style={{
                                padding: '14px',
                                textAlign: 'center',
                                fontSize: '11px',
                                color: '#4ade80',
                                background: 'rgba(74, 222, 128, 0.06)',
                                borderRadius: '10px',
                                border: '1px solid rgba(74, 222, 128, 0.25)',
                                fontWeight: 600,
                              }}
                            >
                              🎉 Luar biasa! Semua anggota clan telah menyelesaikan quest ini!
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {pendingMembers.map((cm) => {
                                const mUser = users.find((u) => u.id === cm.userId)
                                const isMe = cm.userId === currentUser.id
                                const isLeader = cm.role === 'leader'

                                return (
                                  <div
                                    key={`pending-${cm.userId}`}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '9px 12px',
                                      background: '#0b0914',
                                      border: '1px solid #1a1626',
                                      borderRadius: '10px',
                                      opacity: 0.85,
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div
                                        style={{
                                          width: '32px',
                                          height: '32px',
                                          borderRadius: '50%',
                                          background: '#1d1929',
                                          border: '1px solid #302a42',
                                          color: '#8b80a1',
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0,
                                        }}
                                      >
                                        {(mUser?.username || 'H').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#beb5cd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          {mUser?.username || 'Hunter'}
                                          {isMe && <span style={{ fontSize: '10px', color: '#a855f7' }}>(Kamu)</span>}
                                          {isLeader && (
                                            <span className="clan-badge leader" style={{ fontSize: '8px', padding: '1px 5px' }}>
                                              LEADER
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#686077' }}>
                                          Level {getHunterLevel(mUser?.xp || 0)} • Rank {getHunterRank(mUser?.xp || 0)}
                                        </div>
                                      </div>
                                    </div>

                                    <span
                                      style={{
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        color: '#7e7391',
                                        background: '#141021',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                      }}
                                    >
                                      Belum
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  <div style={{ marginTop: '20px', marginBottom: '10px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: '100%', fontSize: '13px', padding: '10px' }}
                      onClick={() => setQuestInfoTarget(null)}
                    >
                      ← Kembali ke Daftar Quest
                    </button>
                  </div>
                </div>
              ) :
              isClanQuestPageOpen ? (
                /* ==============================================================
                   HALAMAN BARU: EDIT / TAMBAH QUEST CLAN (DEDICATED FULL PAGE - BUKAN POPUP)
                   ============================================================== */
                <div>
                  {/* Topbar: Tombol Back ke Room Clan + Judul Edit/Tambah */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#151026',
                      border: '1px solid #3d2766',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsClanQuestPageOpen(false)
                          setEditingClanQuest(null)
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#d5beff',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'background 0.15s',
                        }}
                        title="Kembali ke Daftar Quest"
                        aria-label="Kembali"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '15px', color: '#f3f1ff', fontWeight: 800 }}>
                          {editingClanQuest ? 'Edit Quest Clan' : 'Buat Quest Clan'}
                        </h3>
                        <p style={{ margin: 0, fontSize: '11px', color: '#8e84a2' }}>
                          {selectedClan.name} • {editingClanQuest ? 'Perbarui tantangan clan' : 'Tantangan baru untuk anggota'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form Container Full Page Card */}
                  <div
                    style={{
                      background: '#151026',
                      border: '1px solid #3d2766',
                      borderRadius: '18px',
                      padding: '18px',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    <form onSubmit={handleSaveClanQuest}>
                      <label className="modal-label">JUDUL TANTANGAN CLAN</label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="Contoh: Push-up 100x Bersama"
                        value={questTitle}
                        onChange={(e) => setQuestTitle(e.target.value)}
                        autoFocus
                        required
                      />

                      <label className="modal-label">TIPE JADWAL QUEST</label>
                      <div className="modal-chips">
                        <button
                          type="button"
                          className={`modal-chip ${questType === 'daily' ? 'active' : ''}`}
                          onClick={() => setQuestType('daily')}
                        >
                          Quest Harian (Reset Tiap Hari)
                        </button>
                        <button
                          type="button"
                          className={`modal-chip ${questType === 'event' ? 'active' : ''}`}
                          onClick={() => setQuestType('event')}
                        >
                          Quest Spesial / Event
                        </button>
                      </div>

                      {questType === 'event' && (
                        <>
                          <label className="modal-label">BATAS WAKTU / DEADLINE EVENT</label>
                          <input
                            type="text"
                            className="modal-input"
                            placeholder="Contoh: Minggu Ini / 10 Nov"
                            value={questDeadline}
                            onChange={(e) => setQuestDeadline(e.target.value)}
                          />
                        </>
                      )}

                      <label className="modal-label">KATEGORI TANTANGAN CLAN</label>
                      <div style={{ position: 'relative', marginBottom: '14px' }}>
                        <select
                          className="modal-input"
                          value={questCategory}
                          onChange={(e) => {
                            const selected = findCategory(e.target.value)
                            setQuestCategory(selected.name)
                          }}
                          style={{
                            width: '100%',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            marginBottom: 0,
                            paddingRight: '36px',
                            cursor: 'pointer',
                            background: '#0a0814',
                            border: '1px solid #3d2a63',
                            color: '#f3f1ff',
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            height: '42px',
                            borderRadius: '10px',
                          }}
                        >
                          {CATEGORIES.map((cat) => (
                            <option
                              key={cat.name}
                              value={cat.name}
                              style={{ background: '#130f24', color: '#f3f1ff', padding: '8px' }}
                            >
                              {cat.icon} {cat.name}
                            </option>
                          ))}
                        </select>
                        <div
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#a855f7',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <ChevronDown size={16} />
                        </div>
                      </div>

                      <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={12} /> JADWAL HARI / TIMER
                      </label>
                      <div className="modal-chips" style={{ marginBottom: '14px', gap: '4px' }}>
                        <button
                          type="button"
                          className={`modal-chip ${questDays.includes('Everyday') ? 'active' : ''}`}
                          onClick={() => handleToggleDay('Everyday')}
                          style={{ fontWeight: 600 }}
                        >
                          Everyday
                        </button>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => {
                          const isSelected = !questDays.includes('Everyday') && questDays.includes(d)
                          return (
                            <button
                              key={d}
                              type="button"
                              className={`modal-chip ${isSelected ? 'active' : ''}`}
                              onClick={() => handleToggleDay(d)}
                              style={{ minWidth: '38px', textAlign: 'center', fontWeight: 600 }}
                            >
                              {d}
                            </button>
                          )
                        })}
                      </div>

                      <label className="modal-label">BOBOT XP QUEST (KONTRIBUSI KE TOTAL REWARD LIST)</label>
                      <input
                        type="number"
                        className="modal-input"
                        value={questXp}
                        onChange={(e) => setQuestXp(Number(e.target.value))}
                        min={10}
                        max={1000}
                      />

                      <div className="modal-actions" style={{ marginTop: '20px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setIsClanQuestPageOpen(false)
                            setEditingClanQuest(null)
                          }}
                        >
                          Batal
                        </button>
                        <button type="submit" className="btn-primary">
                          {editingClanQuest ? 'Simpan Perubahan' : 'Terbitkan ke Clan'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) :
              (
                /* ==============================================================
                   HALAMAN CLAN ROOM: LANGSUNG DAFTAR QUEST (TANPA SUB-TAB)
                   ============================================================== */
                <div>
                  {/* WHATSAPP-STYLE CLAN GROUP TOPBAR */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#151026',
                      border: '1px solid #3d2766',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
                      position: 'relative',
                    }}
                  >
                    {/* Left: Back Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClanId(null)
                        setIsClanSettingsMenuOpen(false)
                        setIsClanInfoPageOpen(false)
                        setIsClanConsistencyPageOpen(false)
                        setQuestInfoTarget(null)
                        setIsClanQuestPageOpen(false)
                        setEditingClanQuest(null)
                      }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d5beff',
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginRight: '8px',
                        transition: 'background 0.15s',
                      }}
                      title="Kembali ke Daftar Clan"
                      aria-label="Kembali"
                    >
                      <ArrowLeft size={16} />
                    </button>

                    {/* Center Clickable Area: Foto & Nama Clan (Klik untuk info & anggota grup) */}
                    <div
                      onClick={() => {
                        setIsClanSettingsMenuOpen(false)
                        setIsClanInfoPageOpen(true)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        minWidth: 0,
                        flex: 1,
                        cursor: 'pointer',
                      }}
                      title="Ketuk nama / foto untuk info grup & anggota"
                    >
                      {/* Clan Avatar */}
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7c3aed, #4338ca)',
                          border: '1.5px solid #a855f7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '15px',
                          flexShrink: 0,
                          boxShadow: '0 0 10px rgba(124, 58, 237, 0.4)',
                        }}
                      >
                        <Shield size={18} />
                      </div>

                      {/* Clan Name & Subtitle */}
                      <div style={{ minWidth: 0, overflow: 'hidden' }}>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            color: '#f3f1ff',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            lineHeight: '1.2',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>{selectedClan.name}</span>
                          {selectedClan.isPrivate && <Lock size={12} color="#8a7e9e" />}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#9382b0',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {selectedClanMembers.length} anggota • ketuk untuk info
                        </div>
                      </div>
                    </div>

                    {/* Right: Settings Icon dengan Popup Dropdown */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setIsClanSettingsMenuOpen(!isClanSettingsMenuOpen)}
                        style={{
                          background: isClanSettingsMenuOpen ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                          border: isClanSettingsMenuOpen ? '1px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '50%',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#d5beff',
                          cursor: 'pointer',
                          flexShrink: 0,
                          marginLeft: '6px',
                          transition: 'all 0.15s',
                        }}
                        title="Menu & Pengaturan Clan"
                        aria-label="Pengaturan Clan"
                      >
                        <Settings size={15} />
                      </button>

                      {/* POPUP DROPDOWN PENGATURAN CLAN */}
                      {isClanSettingsMenuOpen && (
                        <>
                          <div
                            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                            onClick={() => setIsClanSettingsMenuOpen(false)}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 8px)',
                              right: 0,
                              zIndex: 100,
                              background: '#130f23',
                              border: '1px solid #4a2f77',
                              borderRadius: '14px',
                              padding: '6px',
                              width: '210px',
                              boxShadow: '0 12px 35px rgba(0,0,0,0.85), 0 0 20px rgba(139,92,246,0.3)',
                            }}
                          >
                            {/* Menu 1: Konsistensi Clan */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsClanSettingsMenuOpen(false)
                                setIsClanConsistencyPageOpen(true)
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 12px',
                                borderRadius: '9px',
                                background: 'transparent',
                                border: 0,
                                color: '#f3f1ff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#251745')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Activity size={15} color="#a855f7" />
                              <span>Konsistensi Clan</span>
                            </button>

                            {/* Menu 2: Info & Anggota Clan */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsClanSettingsMenuOpen(false)
                                setIsClanInfoPageOpen(true)
                              }}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 12px',
                                borderRadius: '9px',
                                background: 'transparent',
                                border: 0,
                                color: '#f3f1ff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#251745')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Shield size={15} color="#c084fc" />
                              <span>Info & Anggota Clan</span>
                            </button>

                            {/* Menu Edit Clan (Khusus Leader) */}
                            {isLeaderOfSelectedClan && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsClanSettingsMenuOpen(false)
                                  openEditClanModal()
                                }}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  padding: '9px 12px',
                                  borderRadius: '9px',
                                  background: 'transparent',
                                  border: 0,
                                  color: '#f3f1ff',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#251745')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Pencil size={15} color="#a855f7" />
                                <span>Edit Info Clan</span>
                              </button>
                            )}

                            {/* Menu 3: Keluar Clan (jika bukan leader) */}
                            {isMemberOfSelectedClan && !isLeaderOfSelectedClan && (
                              <>
                                <div style={{ height: '1px', background: '#261b3d', margin: '4px 0' }} />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsClanSettingsMenuOpen(false)
                                    handleLeaveClan(selectedClan.id)
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '9px 12px',
                                    borderRadius: '9px',
                                    background: 'transparent',
                                    border: 0,
                                    color: '#ff6b8b',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <LogOut size={15} color="#ff6b8b" />
                                  <span>Keluar dari Clan</span>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* KONTEN LANGSUNG: DAFTAR QUEST CLAN */}
                  {!isMemberOfSelectedClan ? (
                    <div style={{ textAlign: 'center', padding: '24px 16px', background: '#13101e', borderRadius: '16px', border: '1px dashed #5a388f' }}>
                      <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#b7a4d5' }}>
                        {selectedClan.isPrivate
                          ? 'Clan ini privat. Silakan masukkan kode invite di halaman awal untuk bergabung.'
                          : 'Gabung ke Clan ini untuk membuka & mengerjakan Quest komunitas.'}
                      </p>
                      {!selectedClan.isPrivate && (
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '8px 20px', fontSize: '12px' }}
                          onClick={() => handleJoinPublicClan(selectedClan)}
                        >
                          Gabung ke {selectedClan.name}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Banner Reward List Quest Clan */}
                      {selectedClanQuests.length > 0 && (() => {
                        const completedByMeCount = selectedClanQuests.filter((cq) =>
                          cq.completedByUserIds.includes(currentUser.id)
                        ).length
                        const totalClanListXp = selectedClanQuests.reduce((sum, cq) => sum + cq.xp, 0)
                        const isAllDone =
                          selectedClanQuests.length > 0 && completedByMeCount === selectedClanQuests.length

                        return (
                          <div
                            style={{
                              background: isAllDone
                                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(22, 101, 52, 0.2))'
                                : 'linear-gradient(135deg, rgba(37, 20, 68, 0.65), rgba(18, 14, 30, 0.85))',
                              border: isAllDone
                                ? '1px solid rgba(74, 222, 128, 0.35)'
                                : '1px solid rgba(139, 92, 246, 0.25)',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: isAllDone ? '#86efac' : '#c084fc',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
                                <Zap size={13} />
                                {isAllDone ? 'REWARD LIST DIPEROLEH!' : 'REWARD LIST QUEST'}
                              </div>
                              <div style={{ fontSize: '10px', color: '#8e84a2', marginTop: '2px' }}>
                                {isAllDone
                                  ? `Seluruh (${completedByMeCount}/${selectedClanQuests.length}) quest selesai • +${totalClanListXp} XP aktif`
                                  : `Selesaikan semua (${completedByMeCount}/${selectedClanQuests.length}) quest untuk mendapatkan XP`}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 800,
                                color: isAllDone ? '#4ade80' : '#d5beff',
                                background: isAllDone ? 'rgba(74, 222, 128, 0.2)' : 'rgba(168, 85, 247, 0.18)',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                border: isAllDone ? '1px solid rgba(74, 222, 128, 0.4)' : '1px solid rgba(168, 85, 247, 0.3)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              +{totalClanListXp} XP
                            </div>
                          </div>
                        )
                      })()}

                      {/* Daftar Quest Clan Langsung Tanpa Sub-Tab */}
                      <div className="task-list">
                        {selectedClanQuests.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '28px 0', color: '#7d7291', fontSize: '12px' }}>
                            Belum ada Quest di Clan ini.
                          </div>
                        ) : (
                          selectedClanQuests.map((cq) => {
                            const isDoneByMe = cq.completedByUserIds.includes(currentUser.id)
                            return (
                              <QuestCard
                                key={cq.id}
                                title={cq.title}
                                meta={cq.category}
                                icon={cq.icon}
                                done={isDoneByMe}
                                isEvent={cq.questType === 'event'}
                                schedule={cq.schedule}
                                canManage={isLeaderOfSelectedClan}
                                completedCount={cq.completedByUserIds.length}
                                totalMembers={selectedClanMembers.length}
                                isGym={cq.category.toLowerCase() === 'gym'}
                                onOpenWorkout={() => setActiveWorkoutQuest({ type: 'clan', id: cq.id })}
                                onToggle={() => handleToggleClanQuest(cq)}
                                onInfo={() => setQuestInfoTarget(cq)}
                                onEdit={() => openEditClanQuestModal(cq)}
                                onDelete={() => handleDeleteClanQuest(cq.id)}
                              />
                            )
                          })
                        )}
                      </div>

                      {/* Tombol Tambah Quest Clan (Hanya Leader) */}
                      {isLeaderOfSelectedClan && (
                        <button
                          className="add-task"
                          onClick={openAddClanQuestModal}
                          style={{ marginTop: '12px' }}
                        >
                          <Plus size={16} /> Tambah Quest Clan
                        </button>
                      )}
                    </>
                  )}
                </div>
              )
            ) : (
              /* ==============================================================
                 HALAMAN UTAMA: DAFTAR SEMUA CLAN (BERSIH & MINIMALIS)
                 ============================================================== */
              <div>
                <section className="quest-heading" style={{ marginBottom: '14px' }}>
                  <div>
                    <h1 style={{ fontSize: '22px' }}>Clan Guild</h1>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ fontSize: '11px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => setIsCreateClanModalOpen(true)}
                  >
                    <Plus size={14} /> Buat Clan
                  </button>
                </section>

                {/* Input Kode Invite */}
                <form className="invite-box" onSubmit={handleJoinByInviteCode} style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Punya kode invite? (cth: SHADOW-99)"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                  />
                  <button type="submit" className="btn-secondary" style={{ whiteSpace: 'nowrap', fontSize: '11px', padding: '8px 12px' }}>
                    <KeyRound size={12} style={{ display: 'inline', marginRight: '3px' }} />
                    Gabung
                  </button>
                </form>

                {/* Daftar Kartu Clan - Klik salah satu untuk buka halamannya */}
                <div style={{ display: 'grid', gap: '8px', marginBottom: '24px' }}>
                  {clans.map((clan) => {
                    const memberCount = clanMembers.filter((cm) => cm.clanId === clan.id).length
                    const leaderUser = users.find((u) => u.id === clan.leaderId)
                    const thisClanQuests = clanQuests.filter((q) => q.clanId === clan.id)

                    return (
                      <div
                        key={clan.id}
                        className="clan-card"
                        onClick={() => setSelectedClanId(clan.id)}
                        style={{
                          cursor: 'pointer',
                          margin: 0,
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid #231f30',
                          background: '#12101a',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div className="clan-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <strong
                            style={{
                              fontSize: '14px',
                              fontWeight: 700,
                              color: '#eeeaf7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>{clan.name}</span>
                            {clan.isPrivate && (
                              <Lock size={12} color="#8a7e9e" style={{ flexShrink: 0 }} />
                            )}
                          </strong>
                          <span style={{ color: '#c084fc', fontWeight: 700, fontSize: '11.5px', letterSpacing: '0.02em', flexShrink: 0 }}>
                            {clan.totalXp.toLocaleString('id-ID')} XP
                          </span>
                        </div>

                        <div className="clan-meta-row" style={{ marginTop: '6px', fontSize: '10.5px', color: '#756d82' }}>
                          <span>
                            Leader: <span style={{ color: '#b9a9d4' }}>{leaderUser?.username || 'Hunter'}</span> • {memberCount} Anggota
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              color: '#a779f0',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {thisClanQuests.length} Quest →
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ================================================================
            TAB 4: RANK (Global Hunter Leaderboard & Global Clan Ranking)
           ================================================================ */}
        {activeTab === 'rank' && (
          <>
            <section className="hero compact">
              <div>
                <p className="eyebrow">GLOBAL RANKING</p>
                <h1>Hall of Fame</h1>
              </div>
            </section>

            <div className="sub-tabs">
              <button
                type="button"
                className={`sub-tab ${rankTab === 'hunters' ? 'active' : ''}`}
                onClick={() => setRankTab('hunters')}
              >
                Top Hunters
              </button>
              <button
                type="button"
                className={`sub-tab ${rankTab === 'clans' ? 'active' : ''}`}
                onClick={() => setRankTab('clans')}
              >
                Top Clans
              </button>
            </div>

            {rankTab === 'hunters' ? (
              <section className="rank-page">
                <div className="rank-hero">
                  <span className="eyebrow">YOUR HUNTER RANK</span>
                  <strong>{currentRank}</strong>
                  <p>Selesaikan Personal Quest &amp; Clan Challenge untuk menaikkan peringkatmu.</p>
                </div>
                <div className="rank-list">
                  {[...users]
                    .sort((a, b) => b.xp - a.xp)
                    .map((u, idx) => (
                      <div
                        className={`rank-row ${u.id === currentUser.id ? 'current' : ''}`}
                        key={u.id}
                      >
                        <span>{String(idx + 1).padStart(2, '0')}</span>
                        <div>
                          <strong>
                            {u.username} {u.id === currentUser.id ? '(Kamu)' : ''}
                          </strong>
                          <small>
                            Level {getHunterLevel(u.xp)} • Rank {getHunterRank(u.xp)}
                          </small>
                        </div>
                        <b>{u.xp.toLocaleString('id-ID')} XP</b>
                      </div>
                    ))}
                </div>
              </section>
            ) : (
              <section className="rank-page">
                <div className="rank-list">
                  {[...clans]
                    .sort((a, b) => b.totalXp - a.totalXp)
                    .map((c, idx) => {
                      const count = clanMembers.filter((cm) => cm.clanId === c.id).length
                      const isJoined = userJoinedClanIds.includes(c.id)
                      return (
                        <div
                          className={`rank-row ${isJoined ? 'current' : ''}`}
                          key={c.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedClanId(c.id)
                            setActiveTab('clan')
                          }}
                        >
                          <span>{String(idx + 1).padStart(2, '0')}</span>
                          <div>
                            <strong>{c.name}</strong>
                            <small>
                              {count} Hunter • {c.isPrivate ? 'Clan Privat' : 'Clan Publik'}
                            </small>
                          </div>
                          <b>{c.totalXp.toLocaleString('id-ID')} XP</b>
                        </div>
                      )
                    })}
                </div>
              </section>
            )}
          </>
        )}

        {/* ================================================================
            TAB 5: PROFILE & SUPABASE AUTH ACCOUNT
           ================================================================ */}
        {activeTab === 'profile' && (
          <>
            <section className="hero compact">
              <div>
                <p className="eyebrow">HUNTER PROFILE</p>
                <h1>{currentUser.username}</h1>
                <p className="quest-date" style={{ marginTop: '4px' }}>{currentUser.email}</p>
              </div>
              <div className="rank-badge">
                <span>RANK</span>
                <strong>{currentRank}</strong>
              </div>
            </section>

            <section className="level-card profile-card" style={{ marginBottom: '18px' }}>
              <strong>Level {currentLevel} Hunter</strong>
              <span>{currentUser.xp.toLocaleString('id-ID')} total XP</span>
              <div className="profile-stats">
                <div>
                  <b>{completedPersonalCount}</b>
                  <small>Quest selesai</small>
                </div>
                <div>
                  <b>{userJoinedClanIds.length}</b>
                  <small>Clan diikuti</small>
                </div>
                <div>
                  <b>{currentUser.streak}</b>
                  <small>Streak</small>
                </div>
              </div>
            </section>

            <section className="clan-card" style={{ marginBottom: '16px' }}>
              <span className="modal-label">STATUS DATABASE SUPABASE</span>
              <p style={{ margin: '4px 0 10px', fontSize: '11px', color: '#b7a4d5', lineHeight: 1.5 }}>
                {isSupabaseConfigured
                  ? '✅ Terhubung ke Supabase Project kamu.'
                  : '⚡ Berjalan dalam Mode Multi-User Aktif. Masukkan URL & Anon Key Supabase kamu di file .env.local dan jalankan supabase/schema.sql untuk sinkronisasi cloud.'}
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setAuthMode('register')
                    setIsAuthModalOpen(true)
                  }}
                >
                  <UserPlus size={13} style={{ display: 'inline', marginRight: '5px' }} />
                  Daftar / Ganti Akun Hunter
                </button>
              </div>
            </section>
          </>
        )}
      </>
    )}

    {/* BOTTOM NAVIGATION (5 MENU) */}
    {!activeWorkoutQuest && (
      <nav className="bottom-nav" aria-label="Navigasi utama">
        {[
          ['home', Home, 'Home'],
          ['calendar', CalendarDays, 'My Quest'],
          ['clan', Users, 'Clan'],
          ['rank', Trophy, 'Rank'],
          ['profile', UserRound, 'Profile'],
        ].map(([key, Icon, label]) => (
          <button
            key={key as string}
            className={activeTab === key ? 'active' : ''}
            onClick={() => setActiveTab(key as typeof activeTab)}
          >
            <Icon size={18} />
            <span>{label as string}</span>
          </button>
        ))}
      </nav>
    )}
  </div>

      {/* ================================================================
          MODAL 1: PERSONAL QUEST (ADD / EDIT)
         ================================================================ */}
      {isPersonalModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPersonalModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPersonalTask ? 'EDIT QUEST PRIBADI' : 'TAMBAH QUEST PRIBADI'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsPersonalModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePersonalQuest}>
              <label className="modal-label">NAMA QUEST</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Contoh: Lari pagi 15 menit"
                value={questTitle}
                onChange={(e) => setQuestTitle(e.target.value)}
                autoFocus
                required
              />
              <label className="modal-label">KATEGORI QUEST</label>
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <select
                  className="modal-input"
                  value={questCategory}
                  onChange={(e) => {
                    const selected = findCategory(e.target.value)
                    setQuestCategory(selected.name)
                  }}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    marginBottom: 0,
                    paddingRight: '36px',
                    cursor: 'pointer',
                    background: '#0a0814',
                    border: '1px solid #3d2a63',
                    color: '#f3f1ff',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    height: '42px',
                    borderRadius: '10px',
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option
                      key={cat.name}
                      value={cat.name}
                      style={{ background: '#130f24', color: '#f3f1ff', padding: '8px' }}
                    >
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#a855f7',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronDown size={16} />
                </div>
              </div>
              <label className="modal-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Clock size={12} /> JADWAL HARI / TIMER
              </label>
              <div className="modal-chips" style={{ marginBottom: '14px', gap: '4px' }}>
                <button
                  type="button"
                  className={`modal-chip ${questDays.includes('Everyday') ? 'active' : ''}`}
                  onClick={() => handleToggleDay('Everyday')}
                  style={{ fontWeight: 600 }}
                >
                  Everyday
                </button>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => {
                  const isSelected = !questDays.includes('Everyday') && questDays.includes(d)
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`modal-chip ${isSelected ? 'active' : ''}`}
                      onClick={() => handleToggleDay(d)}
                      style={{ minWidth: '38px', textAlign: 'center', fontWeight: 600 }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>

              <label className="modal-label">BOBOT XP QUEST (KONTRIBUSI KE TOTAL REWARD LIST)</label>
              <input
                type="number"
                className="modal-input"
                value={questXp}
                onChange={(e) => setQuestXp(Number(e.target.value))}
                min={5}
                max={500}
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsPersonalModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Quest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}





{/* ================================================================
          MODAL: EDIT CLAN (KHUSUS LEADER)
         ================================================================ */}
      {isEditClanModalOpen && selectedClan && (
        <div className="modal-overlay" onClick={() => setIsEditClanModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>EDIT INFO CLAN</h3>
              <button type="button" className="modal-close" onClick={() => setIsEditClanModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEditClan}>
              <label className="modal-label">NAMA CLAN / GUILD</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Nama Clan"
                value={editClanName}
                onChange={(e) => setEditClanName(e.target.value)}
                autoFocus
                required
              />

              <label className="modal-label">DESKRIPSI & MOTTO CLAN</label>
              <textarea
                className="modal-input"
                rows={3}
                placeholder="Deskripsi Clan"
                value={editClanDesc}
                onChange={(e) => setEditClanDesc(e.target.value)}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />

              <label className="modal-label">TIPE AKSES CLAN</label>
              <div className="modal-chips">
                <button
                  type="button"
                  className={`modal-chip ${!editClanPrivate ? 'active' : ''}`}
                  onClick={() => setEditClanPrivate(false)}
                >
                  🌐 Publik (Bisa dicari & langsung gabung)
                </button>
                <button
                  type="button"
                  className={`modal-chip ${editClanPrivate ? 'active' : ''}`}
                  onClick={() => setEditClanPrivate(true)}
                >
                  🔒 Privat (Hanya lewat Kode Invite)
                </button>
              </div>

              <label className="modal-label">KODE INVITE CLAN</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Kode invite (cth: AHJIN-01)"
                value={editClanCode}
                onChange={(e) => setEditClanCode(e.target.value.toUpperCase())}
                style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                required
              />

              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsEditClanModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Perubahan
                </button>
              </div>

              {/* Danger Zone: Bubarkan Clan (Leader Only) */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #4b1e35' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#ff6b8b' }}>
                      Bubarkan Clan
                    </div>
                    <div style={{ fontSize: '10px', color: '#9d8495' }}>
                      Hapus clan ini beserta semua quest & anggotanya.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteClan(selectedClan.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#fca5a5',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Bubarkan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 3: CREATE NEW CLAN
         ================================================================ */}
      {isCreateClanModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateClanModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>DIRIKAN CLAN BARU</h3>
              <button type="button" className="modal-close" onClick={() => setIsCreateClanModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateClan}>
              <label className="modal-label">NAMA CLAN / GUILD</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Contoh: Garuda Hunter Squad"
                value={newClanName}
                onChange={(e) => setNewClanName(e.target.value)}
                autoFocus
                required
              />

              <label className="modal-label">DESKRIPSI &amp; MOTTO TANTANGAN</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Contoh: Komunitas bangun jam 5 pagi & olahraga"
                value={newClanDesc}
                onChange={(e) => setNewClanDesc(e.target.value)}
              />

              <label className="modal-label">TIPE AKSES CLAN</label>
              <div className="modal-chips">
                <button
                  type="button"
                  className={`modal-chip ${!newClanPrivate ? 'active' : ''}`}
                  onClick={() => setNewClanPrivate(false)}
                >
                  🌐 Publik (Bebas Join)
                </button>
                <button
                  type="button"
                  className={`modal-chip ${newClanPrivate ? 'active' : ''}`}
                  onClick={() => setNewClanPrivate(true)}
                >
                  🔒 Privat (Wajib Kode Invite)
                </button>
              </div>

              <label className="modal-label">KODE INVITE UNIK (OPSIONAL)</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Kosongkan untuk generate otomatis (cth: GARUDA-88)"
                value={newClanCode}
                onChange={(e) => setNewClanCode(e.target.value)}
              />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsCreateClanModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Buat Clan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 4: AUTHENTICATION & SWITCH USER (SUPABASE AUTH + MULTI-USER)
         ================================================================ */}
      {isAuthModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{authMode === 'register' ? 'DAFTAR HUNTER BARU' : 'LOGIN HUNTER'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsAuthModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="sub-tabs">
              <button
                type="button"
                className={`sub-tab ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Register Akun Baru
              </button>
              <button
                type="button"
                className={`sub-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login Email
              </button>
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%', marginBottom: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              onClick={handleGoogleLogin}
            >
              <Globe size={14} /> Continue with Google (Supabase Auth)
            </button>

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <>
                  <label className="modal-label">USERNAME HUNTER</label>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="Contoh: Deandra Hunter"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    required
                  />
                </>
              )}
              <label className="modal-label">EMAIL</label>
              <input
                type="email"
                className="modal-input"
                placeholder="hunter@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
              <label className="modal-label">PASSWORD</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  className="modal-input"
                  style={{ paddingRight: '36px' }}
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '38%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#8e84a2',
                    cursor: 'pointer',
                    padding: '2px',
                  }}
                  title={showAuthPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showAuthPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSignOut}
                  style={{ color: '#ff9dbb', borderColor: '#5f2038', background: '#26121f' }}
                >
                  <LogOut size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  Keluar
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsAuthModalOpen(false)}>
                    Tutup
                  </button>
                  <button type="submit" className="btn-primary">
                    <LogIn size={13} style={{ display: 'inline', marginRight: '5px' }} />
                    {authMode === 'register' ? 'Buat Akun & Masuk' : 'Masuk'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ================================================================
          MODAL 5: HELLOHABIT 2026 IN-REVIEW (PERSONAL QUEST ONLY - VIEW ONLY)
         ================================================================ */}
      {isConsistencyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsConsistencyModalOpen(false)}>
          <div
            className="modal-content"
            style={{
              maxWidth: '430px',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#0e0d13',
              border: '1px solid #231f30',
              borderRadius: '22px',
              padding: '24px 20px 28px 20px',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 35px rgba(139, 92, 246, 0.15)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button Top Right */}
            <button
              type="button"
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'none',
                border: 'none',
                color: '#716982',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s',
              }}
              onClick={() => setIsConsistencyModalOpen(false)}
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            {/* Header: HelloHabit 2026 In-Review */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1.5px solid #a855f7',
                  color: '#c084fc',
                  marginBottom: '8px',
                }}
              >
                <CheckCircle2 size={20} strokeWidth={2.5} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f1ff', letterSpacing: '-0.02em' }}>
                HelloHabit
              </div>
              <div style={{ fontSize: '12px', color: '#8e84a2', fontWeight: 500, marginTop: '2px' }}>
                2026 In-Review
              </div>
            </div>

            {/* Personal Habits List (Pure View Only - No Clicks, No Buttons, No Scroll) */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                maxHeight: '68vh',
                overflowY: 'auto',
                paddingRight: '2px',
              }}
            >
              {userPersonalTasks.map((task, index) => {
                const colorObj = HABIT_PALETTES[index % HABIT_PALETTES.length]
                const baseRate = [86, 86, 74, 71, 66, 65, 62][index % 7]
                const { cells, pct } = getHabitYearGrid(task.id, baseRate)
                const scheduleText = task.schedule && task.schedule.length > 0
                  ? (task.schedule.includes('Everyday') ? 'Everyday' : task.schedule.join(', '))
                  : 'Everyday'

                return (
                  <div key={task.id} style={{ cursor: 'default' }}>
                    {/* Habit Title + Schedule & Percentage */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: '6px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#f3f1ff',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          paddingRight: '12px',
                        }}
                      >
                        {task.title}{' '}
                        <span style={{ fontSize: '11px', color: '#827896', fontWeight: 400 }}>
                          - {scheduleText}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#f3f1ff',
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}
                      >
                        {pct}%
                      </div>
                    </div>

                    {/* Heatmap Grid (42 columns x 7 rows, 100% width, NO horizontal scroll) */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(42, 1fr)',
                        gridTemplateRows: 'repeat(7, 1fr)',
                        gridAutoFlow: 'column',
                        gap: '2px',
                        width: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      {cells.map((status, cIdx) => (
                        <div
                          key={cIdx}
                          style={{
                            aspectRatio: '1 / 1',
                            borderRadius: '1.2px',
                            background:
                              status === 'active'
                                ? colorObj.color
                                : status === 'inactive'
                                ? '#262430'
                                : '#16151e',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}

              {userPersonalTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#7d7291', fontSize: '12px' }}>
                  Belum ada Quest Pribadi untuk dimonitor.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          MODAL 6: SETTINGS & HUNTER PREFERENCES (PENGATURAN HUNTER)
         ================================================================ */}
      {isPreferencesModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPreferencesModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(168, 85, 247, 0.15)',
                    border: '1px solid #7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sliders size={18} color="#c084fc" />
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>PENGATURAN HUNTER</h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#8e84a2' }}>
                    Konfigurasi profil dan preferensi sistem
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setIsPreferencesModalOpen(false)}
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePreferences}>
              {/* Profile Card Info */}
              <div
                style={{
                  background: '#0d091a',
                  border: '1px solid #342452',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '16px',
                    boxShadow: '0 0 15px rgba(124, 58, 237, 0.5)',
                  }}
                >
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f3f1ff' }}>
                    {currentUser.username}
                  </div>
                  <div style={{ fontSize: '11px', color: '#a79abf' }}>
                    Rank {currentRank} • Level {currentLevel} • {currentUser.xp} XP
                  </div>
                  <div style={{ fontSize: '10px', color: '#6e6284', marginTop: '2px' }}>
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <label className="modal-label">NAMA HUNTER</label>
              <input
                type="text"
                className="modal-input"
                placeholder="Masukkan nama hunter..."
                value={prefUsername}
                onChange={(e) => setPrefUsername(e.target.value)}
                required
              />

              <label className="modal-label">SISTEM & NOTIFIKASI</label>
              <div
                style={{
                  background: '#0d091a',
                  border: '1px solid #342452',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#d1c4e9',
                  }}
                >
                  <span>Pengingat Quest Harian</span>
                  <input
                    type="checkbox"
                    checked={prefNotification}
                    onChange={(e) => setPrefNotification(e.target.checked)}
                    style={{ accentColor: '#9333ea', cursor: 'pointer' }}
                  />
                </label>
                <div style={{ height: '1px', background: '#24193d' }} />
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#d1c4e9',
                  }}
                >
                  <span>Efek Suara Awakening & Quest</span>
                  <input
                    type="checkbox"
                    checked={prefSound}
                    onChange={(e) => setPrefSound(e.target.checked)}
                    style={{ accentColor: '#9333ea', cursor: 'pointer' }}
                  />
                </label>
              </div>

              <div className="modal-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsPreferencesModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </main>
  )
}