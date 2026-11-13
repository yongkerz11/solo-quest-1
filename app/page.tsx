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
  TrendingUp,
  Search,
  BookOpen,
  Sparkles,
  FastForward,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import {
  fetchCloudQuests,
  saveCloudQuest,
  deleteCloudQuest,
  saveAllCloudQuests,
  fetchCloudProfile,
  saveCloudProfile,
} from '@/lib/supabase-sync'
import {
  GYM_MUSCLE_CATEGORIES,
  GYM_EXERCISE_LIBRARY,
  GYM_PROGRAM_TEMPLATES,
  searchGymExercises,
  type GymMuscleCategory,
  type GymRoutineSessionTemplate,
  type GymProgramTemplate,
} from '@/lib/gym-library'

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
  reps: number | string
  weight?: number | string
  completed: boolean
}

interface WorkoutExerciseHistory {
  date: string
  weight: number
  reps?: number
  setNumber?: number
  timestamp?: number
}

interface WorkoutExercise {
  id: string
  name: string
  sets: WorkoutSet[]
  restSeconds?: number
  history?: WorkoutExerciseHistory[]
}

interface PersonalTask {
  id: string
  userId: string
  title: string
  category: string
  xp: number
  icon: string
  done: boolean
  skipped?: boolean
  schedule?: string[]
  targetTime?: string
  completedDates?: string[]
  skippedDates?: string[]
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
  targetTime?: string
  completedByUserIds: string[]
  skippedByUserIds?: string[]
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
  { name: 'Ibadah / Sholat', oldName: 'Pray', xp: 25, icon: '🕌' },
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
    (lower.includes('sholat') ||
    lower.includes('shalat') ||
    lower.includes('pray') ||
    lower.includes('ibadah') ||
    lower.includes('doa')
      ? CATEGORIES.find((c) => c.name.includes('Ibadah')) || CATEGORIES[0]
      : CATEGORIES[0])
  )
}

const DAY_CODES_GLOBAL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function isQuestForToday(schedule?: string[]): boolean {
  if (!schedule || schedule.length === 0) return true
  if (schedule.includes('Everyday')) return true
  const todayDayCode = DAY_CODES_GLOBAL[new Date().getDay()]
  return schedule.includes(todayDayCode)
}

function isQuestTimeSkipped(_targetTime?: string, _isDone?: boolean, _schedule?: string[]): boolean {
  // Quest tidak lagi diskip otomatis oleh jam (skip manual via tombol Skip)
  return false
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
  { id: 'pt-1', userId: 'u-jinwoo', title: 'Bangun sebelum 06:00', category: 'Disiplin', xp: 20, icon: '☼', done: false, schedule: ['Everyday'] },
  { id: 'pt-2', userId: 'u-jinwoo', title: 'Workout 30 menit', category: 'Kekuatan', xp: 40, icon: 'ϟ', done: false, schedule: ['Everyday'] },
  { id: 'pt-3', userId: 'u-jinwoo', title: 'Baca 10 halaman', category: 'Pengetahuan', xp: 25, icon: '▤', done: false, schedule: ['Mon', 'Wed', 'Fri'] },
  { id: 'pt-4', userId: 'u-jinwoo', title: 'Minum 2L air putih', category: 'Vitalitas', xp: 15, icon: '◒', done: false, schedule: ['Everyday'] },
  // Milik Cha Hae-In (Berbeda dengan Jin-Woo)
  { id: 'pt-5', userId: 'u-cha', title: 'Latihan Swordsmanship 1 Jam', category: 'Kekuatan', xp: 50, icon: 'ϟ', done: false, schedule: ['Mon', 'Tue', 'Thu'] },
  { id: 'pt-6', userId: 'u-cha', title: 'Meditasi Fokus Mana', category: 'Disiplin', xp: 30, icon: '☼', done: false, schedule: ['Everyday'] },
  // Milik Igris
  { id: 'pt-7', userId: 'u-igris', title: 'Jaga Gerbang Dungeon Pagi', category: 'Disiplin', xp: 35, icon: '☼', done: false, schedule: ['Everyday'] },
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

function getHabitYearGrid(
  seedId: string,
  basePct: number = 0,
  isDoneToday?: boolean,
  completedDates?: string[]
) {
  const TOTAL_WEEKS = 42
  const TOTAL_DAYS = TOTAL_WEEKS * 7 // 294 days

  const uniqueDates = new Set<string>(completedDates || [])
  const todayIso = new Date().toISOString().slice(0, 10)
  if (isDoneToday) {
    uniqueDates.add(todayIso)
  } else {
    uniqueDates.delete(todayIso)
  }

  const completed = uniqueDates.size
  const cells: ('active' | 'inactive' | 'future')[] = []

  for (let day = 0; day < TOTAL_DAYS; day++) {
    if (day < completed) {
      cells.push('active')
    } else {
      cells.push('inactive')
    }
  }

  const pct = completed === 0 ? 0 : Math.min(100, Math.max(1, Math.round((completed / TOTAL_DAYS) * 100)))
  return { cells, pct }
}

// ============================================================================
// REUSABLE QUEST CARD
// ============================================================================

function QuestCard({
  questId,
  colorIndex = 0,
  title,
  meta,
  icon,
  done,
  completedDates,
  badgeText,
  isEvent,
  canManage,
  disabled,
  schedule,
  targetTime,
  isSkipped,
  completedCount,
  totalMembers,
  isGym,
  xp,
  onOpenWorkout,
  onToggle,
  onSkip,
  onInfo,
  onEdit,
  onDelete,
}: {
  questId?: string
  colorIndex?: number
  title: string
  meta: string
  icon: string
  done: boolean
  completedDates?: string[]
  badgeText?: string
  isEvent?: boolean
  canManage: boolean
  disabled?: boolean
  schedule?: string[]
  targetTime?: string
  isSkipped?: boolean
  completedCount?: number
  totalMembers?: number
  isGym?: boolean
  xp?: number
  onOpenWorkout?: () => void
  onToggle: () => void
  onSkip?: () => void
  onInfo?: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isConsistencyOpen, setIsConsistencyOpen] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const openedTimestampRef = useRef(0)
  const closedTimestampRef = useRef(0)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const hasMenuOptions = Boolean(onInfo || onSkip || (isGym && onOpenWorkout) || (canManage && (onEdit || onDelete)))

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
    // Saat quest card ditekan, buka/tutup dropdown konsistensi untuk quest tersebut
    setIsConsistencyOpen((prev) => !prev)
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
          opacity: disabled ? 0.55 : isSkipped ? 0.78 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          background: isSkipped && !done ? 'rgba(239, 68, 68, 0.05)' : undefined,
          borderColor: isSkipped && !done
            ? 'rgba(239, 68, 68, 0.45)'
            : isConsistencyOpen
            ? 'rgba(139, 92, 246, 0.55)'
            : undefined,
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
          className={`check-box ${done ? 'completed' : isSkipped ? 'skipped' : ''}`}
          style={
            isSkipped && !done
              ? {
                  borderColor: 'rgba(239, 68, 68, 0.65)',
                  background: 'rgba(239, 68, 68, 0.2)',
                  cursor: 'pointer',
                }
              : undefined
          }
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled) onToggle()
          }}
          role="button"
          aria-label="Toggle status"
          title={done ? 'Batalkan centang selesai' : 'Centang selesai (+XP)'}
        >
          {done ? (
            <Check size={15} strokeWidth={3} />
          ) : isSkipped ? (
            <FastForward size={13} color="#f87171" strokeWidth={2.5} />
          ) : null}
        </span>
        <span className="task-symbol">{icon}</span>
        <span className="task-copy">
          <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {title}
            {isEvent && <span className="clan-badge event">EVENT</span>}
            {isSkipped && !done && (
              <span
                style={{
                  fontSize: '9px',
                  color: '#ffffff',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  padding: '1px 6px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                DILEWATI
              </span>
            )}
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
            <small style={isSkipped && !done ? { color: '#f87171' } : undefined}>
              {isSkipped && !done ? 'Dilewati hari ini • 0 XP' : meta}
            </small>
          </div>
        </span>

        {/* SISI KANAN: TOMBOL START (GYM) + BUTTON CENTANG + BUTTON SKIP + XP BADGE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!isSkipped && !done && isGym && onOpenWorkout && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenWorkout()
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 9px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.03em',
                background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                border: '1px solid rgba(168, 85, 247, 0.6)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(124, 58, 237, 0.35)',
                transition: 'all 0.15s ease',
              }}
              title="Mulai Workout"
              aria-label="Mulai Workout"
            >
              <Play size={10} fill="#ffffff" />
              <span>Start</span>
            </button>
          )}

          {/* BUTTON SKIP (1 TOMBOL TINDAKAN DI KANAN KARENA CENTANG SUDAH ADA DI KOTAK KIRI) */}
          {!done && onSkip && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) onSkip()
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '4px 7px',
                borderRadius: '8px',
                fontSize: '10.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: isSkipped
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(153, 27, 27, 0.4))'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isSkipped
                  ? '1px solid rgba(239, 68, 68, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.18)',
                color: isSkipped ? '#fca5a5' : '#94a3b8',
                boxShadow: isSkipped ? '0 0 10px rgba(239, 68, 68, 0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
              title={isSkipped ? 'Batalkan lewati quest' : 'Lewati quest hari ini (0 XP)'}
              aria-label={isSkipped ? 'Batalkan lewati quest' : 'Lewati quest hari ini (0 XP)'}
            >
              <FastForward size={11} />
              <span>{isSkipped ? 'Dilewati' : 'Skip'}</span>
            </button>
          )}

          {/* XP BADGE */}
          {isSkipped && !done ? (
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 800,
                color: '#f87171',
                padding: '2px 6px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '6px',
                letterSpacing: '0.04em',
              }}
            >
              0 XP
            </span>
          ) : xp !== undefined ? (
            <span
              className="task-xp"
              style={done ? { color: '#4ade80', borderColor: 'rgba(74, 222, 128, 0.4)' } : undefined}
            >
              +{xp} XP
            </span>
          ) : badgeText ? (
            <span className="task-xp">{badgeText}</span>
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

      {/* DROPDOWN KONSISTENSI QUEST (MUNCUL SAAT QUEST DITEKAN) */}
      {isConsistencyOpen && (() => {
        const paletteIdx = colorIndex !== undefined ? colorIndex % HABIT_PALETTES.length : 0
        const colorObj = HABIT_PALETTES[paletteIdx]
        const { cells, pct } = getHabitYearGrid(questId || title, 0, done, completedDates)
        const scheduleText =
          schedule && schedule.length > 0
            ? schedule.includes('Everyday')
              ? 'Everyday'
              : schedule.join(', ')
            : 'Everyday'

        return (
          <div
            style={{
              marginTop: '6px',
              marginBottom: '4px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#0b0a12',
              border: '1px solid #26203a',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.55)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Nama Quest - Jadwal & Persentase Konsistensi */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '7px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#f3f1ff',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  paddingRight: '12px',
                }}
              >
                {title}{' '}
                <span style={{ fontSize: '11.5px', color: '#827896', fontWeight: 400 }}>
                  - {scheduleText}
                </span>
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#f3f1ff',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0,
                }}
              >
                {pct}%
              </div>
            </div>

            {/* Heatmap Grid (42 columns x 7 rows, 100% width) */}
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
                    borderRadius: '1.3px',
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
      })()}

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

            {/* Opsi Skip / Batal Skip Quest */}
            {onSkip && !done && (
              <button
                type="button"
                onClick={() => {
                  closeMenu()
                  onSkip()
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: isSkipped ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                  border: isSkipped ? '1px solid rgba(239, 68, 68, 0.35)' : 0,
                  color: isSkipped ? '#fca5a5' : '#f3f1ff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = isSkipped ? 'rgba(239, 68, 68, 0.2)' : '#251745')}
                onMouseLeave={(e) => (e.currentTarget.style.background = isSkipped ? 'rgba(239, 68, 68, 0.12)' : 'transparent')}
              >
                <FastForward size={14} color={isSkipped ? '#f87171' : '#fb7185'} />
                <span>{isSkipped ? 'Batalkan Lewati Quest' : 'Lewati Quest (Skip)'}</span>
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
// MAIN PAGE COMPONENT
// ============================================================================

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'clan' | 'rank' | 'profile'>('home')
  const [questScheduleTab, setQuestScheduleTab] = useState<'today' | 'upcoming'>('today')

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
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'offline'>('idle')
  const [isHistoryPageOpen, setIsHistoryPageOpen] = useState<boolean>(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'gym' | 'other'>('all')
  const [selectedWeekDay, setSelectedWeekDay] = useState<string | null>(null)

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
  const [questXp, setQuestXp] = useState<number | string>(CATEGORIES[0].xp)
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
  const restEndTimeRef = useRef<number | null>(null)
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [workoutSubPage, setWorkoutSubPage] = useState<'overview' | 'library' | 'programs'>('overview')
  const [replacingExerciseId, setReplacingExerciseId] = useState<string | null>(null)
  const [isQuestProgramPageOpen, setIsQuestProgramPageOpen] = useState<boolean>(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseRest, setNewExerciseRest] = useState<number | string>(60)
  const [newExerciseSetsCount, setNewExerciseSetsCount] = useState<number | string>(3)
  const [newExerciseReps, setNewExerciseReps] = useState<number | string>(10)
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<'ALL' | GymMuscleCategory>('ALL')
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null)
  const [editingExerciseName, setEditingExerciseName] = useState<string>('')
  const [editingExerciseRest, setEditingExerciseRest] = useState<number | string>(60)
  const [showEditLibraryPicker, setShowEditLibraryPicker] = useState<boolean>(false)
  const [editLibraryCategoryFilter, setEditLibraryCategoryFilter] = useState<'ALL' | GymMuscleCategory>('ALL')
  const [isGymLibraryModalOpen, setIsGymLibraryModalOpen] = useState<boolean>(false)
  const [gymModalTab, setGymModalTab] = useState<'programs' | 'exercises'>('programs')
  const [selectedProgramId, setSelectedProgramId] = useState<string>(GYM_PROGRAM_TEMPLATES[0].id)
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>('')
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<'ALL' | GymMuscleCategory>('ALL')
  const [selectedTemplateSessionIdForQuest, setSelectedTemplateSessionIdForQuest] = useState<string>('')
  const [isTimerSettingOpen, setIsTimerSettingOpen] = useState<boolean>(false)
  const [customTimerSeconds, setCustomTimerSeconds] = useState<number | string>(60)
  const [applyTimerToAllExercises, setApplyTimerToAllExercises] = useState<boolean>(false)
  const [isHistoryManagerOpen, setIsHistoryManagerOpen] = useState<boolean>(false)
  const [customHistDate, setCustomHistDate] = useState<string>('')
  const [customHistWeight, setCustomHistWeight] = useState<string>('')
  const [customHistReps, setCustomHistReps] = useState<string>('10')
  const chartScrollRef = useRef<HTMLDivElement>(null)

  const requestNotificationPermission = () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } catch (e) {}
  }

  const sendTimerNotification = () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('⚡ WAKTU ISTIRAHAT SELESAI!', {
          body: 'Waktu rest gym kamu telah selesai. Siap untuk set latihan berikutnya!',
          icon: '/favicon.ico',
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

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
      gain.gain.setValueAtTime(0.25, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.8)
    } catch (e) {
      console.error(e)
    }
  }

  const startRestCountdown = (seconds: number) => {
    requestNotificationPermission()
    const endTime = Date.now() + seconds * 1000
    restEndTimeRef.current = endTime
    setRestDurationPreset(seconds)
    setRestSecondsLeft(seconds)
    setRestTimerActive(true)
    setShowFloatingTimer(true)
    try {
      localStorage.setItem(
        'solo_rest_timer_target',
        JSON.stringify({ endTime, preset: seconds, active: true })
      )
    } catch (e) {
      console.error(e)
    }
  }

  const pauseRestCountdown = () => {
    if (restEndTimeRef.current) {
      const remaining = Math.max(0, Math.ceil((restEndTimeRef.current - Date.now()) / 1000))
      setRestSecondsLeft(remaining)
    }
    restEndTimeRef.current = null
    setRestTimerActive(false)
    try {
      localStorage.removeItem('solo_rest_timer_target')
    } catch (e) {
      console.error(e)
    }
  }

  const resumeRestCountdown = () => {
    const remaining = restSecondsLeft > 0 ? restSecondsLeft : (restDurationPreset || 60)
    startRestCountdown(remaining)
  }

  const extendRestCountdown = (extraSeconds: number) => {
    if (restTimerActive && restEndTimeRef.current) {
      restEndTimeRef.current += extraSeconds * 1000
      const remaining = Math.max(0, Math.ceil((restEndTimeRef.current - Date.now()) / 1000))
      setRestSecondsLeft(remaining)
      try {
        localStorage.setItem(
          'solo_rest_timer_target',
          JSON.stringify({ endTime: restEndTimeRef.current, preset: restDurationPreset, active: true })
        )
      } catch (e) {
        console.error(e)
      }
    } else {
      setRestSecondsLeft((s) => s + extraSeconds)
    }
  }

  const stopRestCountdown = (skipped: boolean = false) => {
    restEndTimeRef.current = null
    setRestTimerActive(false)
    setShowFloatingTimer(false)
    try {
      localStorage.removeItem('solo_rest_timer_target')
    } catch (e) {
      console.error(e)
    }
    if (skipped) {
      setRestSecondsLeft(restDurationPreset)
      showToast('Waktu istirahat dilewati. Siap latihan!')
    }
  }

  // Countdown timer istirahat berbasis Wall-Clock Timestamp
  // (Tetap berjalan akurat saat buka aplikasi lain, lock screen, atau minimize)
  useEffect(() => {
    if (!restTimerActive) return

    const tick = () => {
      if (!restEndTimeRef.current) return
      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((restEndTimeRef.current - now) / 1000))

      if (remaining <= 0) {
        restEndTimeRef.current = null
        setRestSecondsLeft(0)
        setRestTimerActive(false)
        setShowFloatingTimer(false)
        try {
          localStorage.removeItem('solo_rest_timer_target')
        } catch (e) {}

        playTimerBeep()
        sendTimerNotification()
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([300, 150, 300])
        }
        showToast('⚡ WAKTU ISTIRAHAT SELESAI! Siap untuk set berikutnya!')
      } else {
        setRestSecondsLeft(remaining)
      }
    }

    // Jalankan segera 1x saat aktif
    tick()

    // Interval 500ms agar update UI selalu presisi tanpa drift
    const interval = setInterval(tick, 500)

    // Handler ketika user beralih dari / kembali ke tab atau aplikasi lain
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick()
      }
    }
    const handleWindowFocus = () => {
      tick()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }
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
          // Normalisasi akun & sinkronisasi XP riwayat quest yang pernah diselesaikan
          const normalizedUsers = parsed.users.map((u: any) => {
            const userTasks = (parsed.personalTasks || []).filter(
              (t: any) => t.userId === u.id || (u.username && t.id.includes(u.username))
            )
            const userHistoryXp = userTasks.reduce(
              (sum: number, t: any) => sum + ((t.completedDates?.length || (t.done ? 1 : 0)) * (Number(t.xp) || 20)),
              0
            )
            const userDoneClanQuests = (parsed.clanQuests || []).filter((cq: any) => cq.completedByUserIds?.includes(u.id))
            const clanXp = userDoneClanQuests.reduce((sum: number, cq: any) => sum + (Number(cq.xp) || 20), 0)
            const earnedXp = userHistoryXp + clanXp

            return { ...u, xp: Math.max(u.xp || 0, earnedXp) }
          })
          setUsers(normalizedUsers)
        }
        if (parsed.currentUserId) setCurrentUserId(parsed.currentUserId)
        if (parsed.personalTasks) {
          const todayIso = new Date().toISOString().slice(0, 10)
          const migrated = parsed.personalTasks.map((t: any) => {
            const cat = findCategory(t.category)
            let exs = t.workoutExercises
            if (exs && exs.length > 0 && exs[0]?.id === 'ex-1' && exs[0]?.name === 'Bench Press' && !t.done) {
              exs = []
            }
            const compDates = Array.isArray(t.completedDates) ? t.completedDates : []
            const skipDates = Array.isArray(t.skippedDates) ? t.skippedDates : []

            // SINKRONISASI RESET HARIAN:
            // Quest HANYA bernilai done/selesai HARI INI jika tanggal hari ini (todayIso)
            // benar-benar ada di dalam completedDates!
            // Quest yang selesai kemarin (atau hari sebelumnya) otomatis TIDAK tercentang di hari baru.
            const isDoneToday = compDates.includes(todayIso)
            const isSkippedToday = skipDates.includes(todayIso)

            return {
              ...t,
              category: cat.name,
              icon: cat.icon,
              done: isDoneToday,
              skipped: isSkippedToday,
              completedDates: compDates,
              skippedDates: skipDates,
              workoutExercises: exs ?? (cat.name.toLowerCase() === 'gym' ? [] : undefined),
            }
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

    // Pulihkan timer istirahat jika sebelumnya sedang berjalan
    try {
      const savedTimer = localStorage.getItem('solo_rest_timer_target')
      if (savedTimer) {
        const parsedTimer = JSON.parse(savedTimer)
        if (parsedTimer && parsedTimer.active && parsedTimer.endTime) {
          const remaining = Math.max(0, Math.ceil((parsedTimer.endTime - Date.now()) / 1000))
          if (remaining > 0) {
            restEndTimeRef.current = parsedTimer.endTime
            setRestDurationPreset(parsedTimer.preset || 60)
            setRestSecondsLeft(remaining)
            setRestTimerActive(true)
            setShowFloatingTimer(true)
          } else {
            localStorage.removeItem('solo_rest_timer_target')
          }
        }
      }
    } catch (e) {
      console.error(e)
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

  // Derived Current User Data & Today / Upcoming Schedule Helpers
  const [timeTick, setTimeTick] = useState<number>(0)
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(Date.now()), 15000)
    return () => clearInterval(timer)
  }, [])

  const DAY_CODES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
  const todayDayCode = DAY_CODES[new Date().getDay()]
  const isQuestForToday = (schedule?: string[]) => {
    if (!schedule || schedule.length === 0) return true
    if (schedule.includes('Everyday')) return true
    return schedule.includes(todayDayCode)
  }

  const currentUser = users.find((u) => u.id === currentUserId) || users[0]
  const userPersonalTasks = personalTasks.filter(
    (t) =>
      t.userId === currentUser.id ||
      (currentUser.username && (t.userId === currentUser.username || t.id.includes(currentUser.username))) ||
      (!t.userId && currentUser.username === 'yongzz')
  )
  const todayPersonalTasks = userPersonalTasks.filter((t) => isQuestForToday(t.schedule))
  const upcomingPersonalTasks = userPersonalTasks.filter((t) => !isQuestForToday(t.schedule))
  const completedPersonalCount = userPersonalTasks.filter((t) => t.done).length
  const completedTodayPersonalCount = todayPersonalTasks.filter((t) => t.done).length
  const userJoinedMemberships = clanMembers.filter(
    (cm) => cm.userId === currentUser.id || (currentUser.username && cm.userId === currentUser.username)
  )
  const userJoinedClanIds = userJoinedMemberships.map((cm) => cm.clanId)
  const userJoinedClanQuests = clanQuests.filter((cq) => userJoinedClanIds.includes(cq.clanId))
  const completedClanQuestsCount = userJoinedClanQuests.filter(
    (cq) =>
      cq.completedByUserIds.includes(currentUser.id) ||
      (currentUser.username && cq.completedByUserIds.includes(currentUser.username))
  ).length
  const totalConsistencyTasks = userPersonalTasks.length + userJoinedClanQuests.length
  const totalCompletedConsistencyTasks = completedPersonalCount + completedClanQuestsCount
  const consistencyRate = totalConsistencyTasks > 0 ? Math.round((totalCompletedConsistencyTasks / totalConsistencyTasks) * 100) : 100

  // Derive History Quest Logs dari seluruh aktivitas latihan & penyelesaian quest user
  const userHistoryItems = (() => {
    const items: Array<{
      id: string
      questId: string
      title: string
      category: string
      icon: string
      xp: number
      dateLabel: string
      timestamp: number
      isGym: boolean
      exercises: Array<{ name: string; setsCount: number; weight: number; reps: number }>
      totalSets: number
      maxWeight: number
    }> = []

    const todayIso = new Date().toISOString().slice(0, 10)
    const todayShort = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })

    userPersonalTasks.forEach((task) => {
      // HANYA QUEST YANG BENAR-BENAR TELAH SELESAI DIKERJAKAN YANG MASUK KE HISTORY QUEST
      // Jika quest belum selesai (task.done === false dan completedDates kosong / tidak ada),
      // maka quest ini BELUM PERNAH SELESAI dan TIDAK BOLEH masuk ke History Quest!
      const hasCompletedDates = Boolean(task.completedDates && task.completedDates.length > 0)
      if (!task.done && !hasCompletedDates) {
        return
      }

      // Kumpulkan tanggal-tanggal valid di mana quest ini selesai dikerjakan
      const completionDates: string[] = Array.from(
        new Set([
          ...(task.completedDates || []),
          ...(task.done ? [todayIso] : []),
        ])
      )

      if (completionDates.length === 0) return

      const isGym = task.category.toLowerCase() === 'gym' || Boolean(task.workoutExercises && task.workoutExercises.length > 0)

      completionDates.forEach((isoDate) => {
        const parsed = new Date(isoDate)
        const dateLabel = !isNaN(parsed.getTime())
          ? parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
          : todayShort
        const timestamp = !isNaN(parsed.getTime()) ? parsed.getTime() : Date.now()

        if (isGym && task.workoutExercises && task.workoutExercises.length > 0) {
          const exercises = task.workoutExercises.map((ex) => {
            const histOnDate = ex.history?.find((h) => h.date === dateLabel)
            const weights = ex.sets.map((s) => Number(s.weight) || 0)
            const maxW = histOnDate ? histOnDate.weight : weights.length > 0 ? Math.max(...weights) : 0
            const reps = (histOnDate && histOnDate.reps !== undefined) ? histOnDate.reps : (Number(ex.sets[0]?.reps) || 10)
            return {
              name: ex.name,
              setsCount: ex.sets.length,
              weight: maxW,
              reps,
            }
          })

          const totalSets = exercises.reduce((acc, e) => acc + e.setsCount, 0)
          const maxWeight = exercises.reduce((acc, e) => Math.max(acc, e.weight), 0)

          items.push({
            id: `${task.id}-${isoDate}`,
            questId: task.id,
            title: task.title,
            category: task.category,
            icon: task.icon,
            xp: task.xp,
            dateLabel,
            timestamp,
            isGym: true,
            exercises,
            totalSets,
            maxWeight,
          })
        } else {
          items.push({
            id: `${task.id}-${isoDate}`,
            questId: task.id,
            title: task.title,
            category: task.category,
            icon: task.icon,
            xp: task.xp,
            dateLabel,
            timestamp,
            isGym: false,
            exercises: [],
            totalSets: 0,
            maxWeight: 0,
          })
        }
      })
    })

    return items.sort((a, b) => b.timestamp - a.timestamp)
  })()

  const totalHistorySets = userHistoryItems.reduce((acc, item) => acc + item.totalSets, 0)
  const maxHistoryWeight = userHistoryItems.reduce((acc, item) => Math.max(acc, item.maxWeight), 0)

  // Derive Akumulasi XP Valid dari Riwayat Quest & Clan Challenge
  const historyTotalXp = userHistoryItems.reduce((acc, item) => acc + (Number(item.xp) || 0), 0)
  const clanCompletedTotalXp = userJoinedClanQuests
    .filter(
      (cq) =>
        cq.completedByUserIds.includes(currentUser.id) ||
        (currentUser.username && cq.completedByUserIds.includes(currentUser.username))
    )
    .reduce((acc, cq) => acc + (Number(cq.xp) || 0), 0)
  const earnedActivityXp = historyTotalXp + clanCompletedTotalXp
  const effectiveXp = Math.max(currentUser.xp || 0, earnedActivityXp)

  const currentLevel = getHunterLevel(effectiveXp)
  const currentRank = getHunterRank(effectiveXp)
  const nextLevelXp = currentLevel * 100
  const levelProgress = Math.min(100, Math.round(((effectiveXp % 100) / 100) * 100))

  // Derive Personal Records (PR) & Total Volume dari semua gerakan latihan
  const userExerciseRecords = (() => {
    const records: Array<{
      questId: string
      questTitle: string
      exerciseId: string
      name: string
      maxWeight: number
      bestReps: number
      setsCount: number
      volume: number
    }> = []

    userPersonalTasks.forEach((task) => {
      if (!task.workoutExercises) return
      task.workoutExercises.forEach((ex) => {
        const setWeights = ex.sets.map((s) => Number(s.weight) || 0)
        const histWeights = (ex.history || []).map((h) => Number(h.weight) || 0)
        const maxWeight = Math.max(0, ...setWeights, ...histWeights)
        const bestSet = ex.sets.find((s) => (Number(s.weight) || 0) === maxWeight) || ex.sets[0]
        const bestReps = Number(bestSet?.reps) || 10
        const sessionVolume = ex.sets.reduce(
          (sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0),
          0
        )
        const sessionsCount = Math.max(1, ex.history?.length || 1)
        records.push({
          questId: task.id,
          questTitle: task.title,
          exerciseId: ex.id,
          name: ex.name,
          maxWeight,
          bestReps,
          setsCount: ex.sets.length,
          volume: sessionVolume * sessionsCount,
        })
      })
    })

    return records.sort((a, b) => b.maxWeight - a.maxWeight)
  })()

  const totalLiftedVolume = userExerciseRecords.reduce((acc, r) => acc + r.volume, 0)
  const topPrRecord = userExerciseRecords[0] || null

  // Derive 7-Day Weekly Schedule & Activity Strip (Sen - Min)
  const currentWeekDays = (() => {
    const now = new Date()
    const currentDayIdx = now.getDay() // 0 = Sun, 1 = Mon, ...
    const diffToMonday = currentDayIdx === 0 ? -6 : 1 - currentDayIdx
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)

    const order: Array<{ code: string; shortLabel: string; fullName: string }> = [
      { code: 'Mon', shortLabel: 'Sen', fullName: 'Senin' },
      { code: 'Tue', shortLabel: 'Sel', fullName: 'Selasa' },
      { code: 'Wed', shortLabel: 'Rab', fullName: 'Rabu' },
      { code: 'Thu', shortLabel: 'Kam', fullName: 'Kamis' },
      { code: 'Fri', shortLabel: 'Jum', fullName: 'Jumat' },
      { code: 'Sat', shortLabel: 'Sab', fullName: 'Sabtu' },
      { code: 'Sun', shortLabel: 'Min', fullName: 'Minggu' },
    ]

    return order.map((item, idx) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + idx)
      const isoDate = d.toISOString().slice(0, 10)
      const dateNum = String(d.getDate()).padStart(2, '0')
      const dateShortId = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      const isToday = item.code === todayDayCode

      const scheduledTasks = userPersonalTasks.filter((t) => {
        if (!t.schedule || t.schedule.length === 0 || t.schedule.includes('Everyday')) return true
        return t.schedule.includes(item.code)
      })

      const isDone = userPersonalTasks.some((t) => {
        if (t.completedDates?.includes(isoDate)) return true
        return isToday && t.done
      })

      return {
        ...item,
        dateNum,
        isoDate,
        isToday,
        scheduledTasks,
        isDone,
      }
    })
  })()

  const activeScheduleDayCode =
    selectedWeekDay ||
    (todayPersonalTasks.length > 0
      ? todayDayCode
      : currentWeekDays.find((d) => d.scheduledTasks.length > 0)?.code || todayDayCode)
  const activeScheduleDayObj =
    currentWeekDays.find((d) => d.code === activeScheduleDayCode) || currentWeekDays[0]

  // Sinkronisasi otomatis dengan Supabase Cloud (Quest & Progres Beban)
  const syncWithCloud = async (forcePushLocal = false) => {
    if (!currentUser || !isSupabaseConfigured) return
    setCloudSyncStatus('syncing')
    try {
      const [cloudQuests, cloudProfile] = await Promise.all([
        fetchCloudQuests(currentUser.id, currentUser.username),
        fetchCloudProfile(currentUser.id, currentUser.username),
      ])

      if (cloudProfile) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === currentUser.id || (currentUser.username && u.username === currentUser.username)
              ? {
                  ...u,
                  ...cloudProfile,
                  xp: Math.max(u.xp || 0, cloudProfile.xp || 0, effectiveXp),
                  streak: Math.max(u.streak || 0, cloudProfile.streak || 0),
                }
              : u
          )
        )
      } else if (currentUser) {
        saveCloudProfile({ ...currentUser, xp: effectiveXp })
      }

      if (cloudQuests && cloudQuests.length > 0 && !forcePushLocal) {
        const todayIso = new Date().toISOString().slice(0, 10)
        const normalizedCloudQuests = cloudQuests.map((t: any) => {
          const compDates = Array.isArray(t.completedDates) ? t.completedDates : []
          const skipDates = Array.isArray(t.skippedDates) ? t.skippedDates : []
          return {
            ...t,
            done: compDates.includes(todayIso),
            skipped: skipDates.includes(todayIso),
            completedDates: compDates,
            skippedDates: skipDates,
          }
        })
        setPersonalTasks((prev) => {
          const otherTasks = prev.filter(
            (t) => t.userId !== currentUser.id && (!currentUser.username || !t.id.includes(currentUser.username))
          )
          return [...otherTasks, ...normalizedCloudQuests]
        })
        setCloudSyncStatus('synced')
      } else {
        const localTasks = personalTasks.filter((t) => t.userId === currentUser.id)
        if (localTasks.length > 0) {
          await saveAllCloudQuests(localTasks, currentUser.username)
        }
        setCloudSyncStatus('synced')
      }
    } catch (e) {
      console.warn('Supabase sync notice:', e)
      setCloudSyncStatus('offline')
    }
  }

  useEffect(() => {
    if (mounted && currentUser) {
      syncWithCloud()
    }
  }, [mounted, currentUser?.id, currentUser?.username])

  // Reset harian otomatis ketika berganti hari / tengah malam (midnight rollover)
  useEffect(() => {
    if (!mounted) return
    const todayIso = new Date().toISOString().slice(0, 10)
    setPersonalTasks((prev) => {
      let changed = false
      const updated = prev.map((t) => {
        const compDates = Array.isArray(t.completedDates) ? t.completedDates : []
        const skipDates = Array.isArray(t.skippedDates) ? t.skippedDates : []
        const isDoneToday = compDates.includes(todayIso)
        const isSkippedToday = skipDates.includes(todayIso)
        if (t.done !== isDoneToday || t.skipped !== isSkippedToday) {
          changed = true
          return { ...t, done: isDoneToday, skipped: isSkippedToday }
        }
        return t
      })
      return changed ? updated : prev
    })
  }, [timeTick, mounted])

  // Sinkronisasi otomatis XP hunter ke state & profil cloud jika XP riwayat quest lebih tinggi
  useEffect(() => {
    if (mounted && currentUser && effectiveXp > (currentUser.xp || 0)) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id || (currentUser.username && u.username === currentUser.username)
            ? { ...u, xp: effectiveXp }
            : u
        )
      )
      saveCloudProfile({ ...currentUser, xp: effectiveXp })
    }
  }, [mounted, currentUser?.id, currentUser?.username, effectiveXp])

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

  useEffect(() => {
    if (activeExerciseId && chartScrollRef.current) {
      const timer = setTimeout(() => {
        if (chartScrollRef.current) {
          chartScrollRef.current.scrollTo({
            left: chartScrollRef.current.scrollWidth,
            behavior: 'smooth',
          })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [activeExerciseId, activeExercise?.history?.length])

  const handleUpdateWorkoutExercises = (
    questId: string,
    type: 'personal' | 'clan',
    newExercises: WorkoutExercise[]
  ) => {
    if (type === 'personal') {
      setPersonalTasks((curr) =>
        curr.map((t) => (t.id === questId ? { ...t, workoutExercises: newExercises } : t))
      )
      const target = personalTasks.find((t) => t.id === questId)
      if (target) {
        saveCloudQuest({ ...target, workoutExercises: newExercises }, currentUser.username)
      }
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
    let recordedWeight = 0
    let recordedReps = 0
    let recordedSetNum = 1

    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      restTime = ex.restSeconds || 60
      const nextSets = ex.sets.map((s) => {
        if (s.id !== setId) return s
        const nextComp = !s.completed
        if (nextComp) {
          justCompleted = true
          recordedWeight = Number(s.weight) || 0
          recordedReps = Number(s.reps) || 10
          recordedSetNum = s.setNumber
        }
        return { ...s, completed: nextComp }
      })

      let nextHistory = ex.history ? [...ex.history] : undefined
      if (justCompleted) {
        const todayLabel = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        const hist = nextHistory ? [...nextHistory] : []
        const exIdx = hist.findIndex((h) => h.date === todayLabel)
        if (exIdx !== -1) {
          hist[exIdx] = { date: todayLabel, weight: recordedWeight, reps: recordedReps, setNumber: recordedSetNum }
        } else {
          hist.push({ date: todayLabel, weight: recordedWeight, reps: recordedReps, setNumber: recordedSetNum })
        }
        nextHistory = hist
      }

      return {
        ...ex,
        sets: nextSets,
        ...(nextHistory ? { history: nextHistory } : {}),
      }
    })

    handleUpdateWorkoutExercises(questId, type, updatedExs)

    if (justCompleted) {
      startRestCountdown(restTime)
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
        const completedSet = ex.sets[nextIncompleteIdx]
        const nextSets = ex.sets.map((s, idx) =>
          idx === nextIncompleteIdx ? { ...s, completed: true } : s
        )
        completedAfter = nextSets.filter((s) => s.completed).length

        const todayLabel = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        const hist = ex.history ? [...ex.history] : []
        const exIdx = hist.findIndex((h) => h.date === todayLabel)
        const histEntry = {
          date: todayLabel,
          weight: Number(completedSet.weight) || 0,
          reps: Number(completedSet.reps) || 10,
          setNumber: completedSet.setNumber,
        }
        if (exIdx !== -1) {
          hist[exIdx] = histEntry
        } else {
          hist.push(histEntry)
        }

        return { ...ex, sets: nextSets, history: hist }
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
      startRestCountdown(restTime)
      if (completedAfter === totalSets) {
        showToast(`🔥 Semua set (${completedAfter}/${totalSets}) "${exName}" selesai! Istirahat ${restTime}s dimulai ⏳`)
      } else {
        showToast(`⚡ Set ${completedAfter}/${totalSets} "${exName}" selesai! Istirahat ${restTime}s dimulai ⏳`)
      }
    } else {
      stopRestCountdown(false)
      showToast(`Set "${exName}" direset kembali ke 0/${totalSets}.`)
    }
  }

  const handleUpdateSetField = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string,
    setId: string,
    field: 'reps' | 'weight',
    val: number | string
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
    initialSetsCount: number = 3,
    initialReps: number = 10
  ) => {
    if (!name.trim()) return
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const count = Math.max(1, Math.min(10, initialSetsCount))
    const targetReps = Math.max(1, initialReps || 10)
    const sets: WorkoutSet[] = []
    for (let i = 1; i <= count; i++) {
      sets.push({
        id: `set-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        setNumber: i,
        reps: targetReps,
        weight: 20,
        completed: false,
      })
    }
    const newEx: WorkoutExercise = {
      id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      restSeconds: restSeconds > 0 ? restSeconds : 60,
      sets,
    }
    handleUpdateWorkoutExercises(questId, type, [...currentExs, newEx])
    showToast(`Gerakan "${name.trim()}" (${count} × ${targetReps}) berhasil ditambahkan!`)
  }

  // HELPER: KONVERSI TEMPLATE SESI KE WORKOUT EXERCISES (DAPAT DIEDIT BEBAS OLEH USER)
  const buildWorkoutExercisesFromTemplate = (
    session: GymRoutineSessionTemplate
  ): WorkoutExercise[] => {
    const baseTs = Date.now()
    return session.exercises.map((item, exIdx) => {
      const setsCount = Math.max(1, item.sets || 3)
      const repsCount = Math.max(1, item.reps || 10)
      const sets: WorkoutSet[] = []
      for (let i = 1; i <= setsCount; i++) {
        sets.push({
          id: `set-${baseTs}-${exIdx}-${i}`,
          setNumber: i,
          reps: repsCount,
          weight: item.name.toLowerCase() === 'plank' ? 0 : 20,
          completed: false,
        })
      }
      return {
        id: `ex-${baseTs}-${exIdx}`,
        name: item.name,
        restSeconds: 60,
        sets,
      }
    })
  }

  // TERAPKAN TEMPLATE SESI KE WORKOUT YANG SEDANG DIBUKA
  const handleApplySessionToCurrentWorkout = (
    session: GymRoutineSessionTemplate,
    mode: 'replace' | 'append' = 'replace'
  ) => {
    if (!activeWorkoutQuest || !currentWorkoutQuest) return
    const built = buildWorkoutExercisesFromTemplate(session)
    const existing = currentWorkoutQuest.workoutExercises ?? []
    const nextExercises = mode === 'append' ? [...existing, ...built] : built
    handleUpdateWorkoutExercises(currentWorkoutQuest.id, activeWorkoutQuest.type, nextExercises)
    setIsGymLibraryModalOpen(false)
    setWorkoutSubPage('overview')
    showToast(
      `⚡ Referensi "${session.title}" (${built.length} gerakan) diterapkan! Kamu bebas mengubah/mengganti gerakan kapan saja.`
    )
  }

  // BUAT QUEST GYM BARU DARI 1 SESI REFERENSI
  const handleCreateQuestFromSessionTemplate = (session: GymRoutineSessionTemplate) => {
    const gymCat = findCategory('Gym')
    const builtExercises = buildWorkoutExercisesFromTemplate(session)
    const newTask: PersonalTask = {
      id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: currentUser.id,
      title: session.questTitle,
      category: gymCat.name,
      xp: gymCat.xp,
      icon: gymCat.icon,
      done: false,
      schedule: session.recommendedDays.length > 0 ? session.recommendedDays : ['Everyday'],
      workoutExercises: builtExercises,
    }
    setPersonalTasks((curr) => [...curr, newTask])
    saveCloudQuest(newTask, currentUser.username)
    setIsGymLibraryModalOpen(false)
    setIsQuestProgramPageOpen(false)
    setWorkoutSubPage('overview')
    setActiveWorkoutQuest({ type: 'personal', id: newTask.id })
    showToast(
      `🔥 Quest "${session.questTitle}" berhasil dibuat dengan ${builtExercises.length} gerakan referensi! Semua bisa diedit bebas.`
    )
  }

  // TERAPKAN SELURUH JADWAL PROGRAM (2x / 3x / 4x / 5x / 6x SEMINGGU) KE MY QUEST
  const handleApplyFullProgramSchedule = (program: GymProgramTemplate) => {
    const gymCat = findCategory('Gym')
    const baseTs = Date.now()
    const createdTasks: PersonalTask[] = program.sessions.map((session, idx) => ({
      id: `pt-${baseTs}-${idx}`,
      userId: currentUser.id,
      title: session.questTitle,
      category: gymCat.name,
      xp: gymCat.xp,
      icon: gymCat.icon,
      done: false,
      schedule: session.recommendedDays.length > 0 ? session.recommendedDays : ['Everyday'],
      workoutExercises: buildWorkoutExercisesFromTemplate(session),
    }))

    setPersonalTasks((curr) => [...curr, ...createdTasks])
    saveAllCloudQuests(createdTasks, currentUser.username)
    setIsGymLibraryModalOpen(false)
    setIsQuestProgramPageOpen(false)
    setWorkoutSubPage('overview')
    setActiveWorkoutQuest(null)
    setActiveTab('calendar')
    showToast(
      `🎉 Program "${program.frequencyLabel}" (${createdTasks.length} sesi) ditambahkan ke My Quest! Kamu bebas mengubah jadwal & gerakan kapan saja.`
    )
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

  // LOG PROGRES BEBAN KE RIWAYAT TANGGAL (REAL-TIME)
  const handleLogExerciseProgress = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string,
    weight: number,
    reps: number,
    setsCount: number
  ) => {
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const todayLabel = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      const prev = ex.history && ex.history.length > 0 ? [...ex.history] : []
      const existingIdx = prev.findIndex((h) => h.date === todayLabel)
      if (existingIdx !== -1) {
        prev[existingIdx] = { date: todayLabel, weight, reps, setNumber: setsCount, timestamp: Date.now() }
      } else {
        prev.push({ date: todayLabel, weight, reps, setNumber: setsCount, timestamp: Date.now() })
      }
      return { ...ex, history: prev }
    })
    handleUpdateWorkoutExercises(questId, type, updatedExs)
    showToast(`Beban ${weight}kg (${todayLabel}) berhasil dicatat ke riwayat!`)
  }

  // TAMBAH RIWAYAT SESI MANUAL / TANGGAL LAIN
  const handleAddCustomExerciseHistory = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string,
    dateStr: string,
    weight: number,
    reps: number = 10,
    setNum: number = 1
  ) => {
    if (!dateStr.trim() || weight <= 0) {
      showToast('Harap isi tanggal dan beban angka kg yang valid!')
      return
    }
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const cleanDate = dateStr.trim()
    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId) return ex
      const prev = ex.history && ex.history.length > 0 ? [...ex.history] : []
      const existingIdx = prev.findIndex((h) => h.date.toLowerCase() === cleanDate.toLowerCase())
      const entry: WorkoutExerciseHistory = {
        date: cleanDate,
        weight: Number(weight),
        reps: Number(reps) || 10,
        setNumber: Number(setNum) || 1,
        timestamp: Date.now(),
      }
      if (existingIdx !== -1) {
        prev[existingIdx] = entry
      } else {
        prev.push(entry)
      }
      return { ...ex, history: prev }
    })
    handleUpdateWorkoutExercises(questId, type, updatedExs)
    showToast(`Sesi ${cleanDate} (${weight}kg) berhasil ditambahkan ke riwayat!`)
    setCustomHistDate('')
    setCustomHistWeight('')
  }

  // HAPUS RIWAYAT SESI
  const handleDeleteExerciseHistory = (
    questId: string,
    type: 'personal' | 'clan',
    exerciseId: string,
    historyIdx: number
  ) => {
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)
    if (!targetQuest) return

    const currentExs = targetQuest.workoutExercises ?? []
    const updatedExs = currentExs.map((ex) => {
      if (ex.id !== exerciseId || !ex.history) return ex
      const filtered = ex.history.filter((_, idx) => idx !== historyIdx)
      return { ...ex, history: filtered }
    })
    handleUpdateWorkoutExercises(questId, type, updatedExs)
    showToast('Catatan riwayat beban dihapus.')
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
    // Sinkronkan seluruh beban gerakan yang set-nya selesai ke riwayat real-time hari ini
    const targetQuest =
      type === 'personal'
        ? personalTasks.find((t) => t.id === questId)
        : clanQuests.find((cq) => cq.id === questId)

    if (targetQuest && targetQuest.workoutExercises) {
      const todayLabel = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      const updatedExercises = targetQuest.workoutExercises.map((ex) => {
        const completedSets = ex.sets.filter((s) => s.completed)
        if (completedSets.length === 0) return ex
        const lastCompleted = completedSets[completedSets.length - 1]
        const prevHist = ex.history ? [...ex.history] : []
        const exIdx = prevHist.findIndex((h) => h.date === todayLabel)
        const histEntry: WorkoutExerciseHistory = {
          date: todayLabel,
          weight: Number(lastCompleted.weight) || 0,
          reps: Number(lastCompleted.reps) || 10,
          setNumber: lastCompleted.setNumber,
          timestamp: Date.now(),
        }
        if (exIdx !== -1) {
          prevHist[exIdx] = histEntry
        } else {
          prevHist.push(histEntry)
        }
        return { ...ex, history: prevHist }
      })
      handleUpdateWorkoutExercises(questId, type, updatedExercises)
    }

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
    stopRestCountdown(false)
    showToast('🎉 Sesi Workout Selesai! Riwayat beban berhasil diperbarui!')
  }

  // ============================================================================
  // PERSONAL QUEST CRUD HANDLERS
  // ============================================================================

  const handleTogglePersonal = (taskId: string) => {
    const target =
      personalTasks.find(
        (t) =>
          t.id === taskId &&
          (t.userId === currentUser.id ||
            !t.userId ||
            (currentUser.username && t.userId === currentUser.username) ||
            (currentUser.username && t.id.includes(currentUser.username)))
      ) || personalTasks.find((t) => t.id === taskId)
    if (!target) return
    const nextDone = !target.done

    const todayIso = new Date().toISOString().slice(0, 10)
    const nextTasks = personalTasks.map((t) => {
      if (t.id !== taskId) return t
      const prevDates = new Set(t.completedDates || [])
      const prevSkipped = new Set(t.skippedDates || [])
      if (nextDone) {
        prevDates.add(todayIso)
        prevSkipped.delete(todayIso)
      } else {
        prevDates.delete(todayIso)
      }
      return {
        ...t,
        done: nextDone,
        skipped: nextDone ? false : t.skipped,
        completedDates: Array.from(prevDates),
        skippedDates: Array.from(prevSkipped),
      }
    })

    setPersonalTasks(nextTasks)
    const updatedTask = nextTasks.find((t) => t.id === taskId)
    if (updatedTask) {
      saveCloudQuest(updatedTask, currentUser.username)
    }

    // UPDATE XP LANGSUNG PER QUEST
    const taskXp = Number(target.xp) || 20
    const xpDelta = nextDone ? taskXp : -taskXp
    const nextXp = Math.max(0, effectiveXp + xpDelta)
    setUsers((curr) =>
      curr.map((u) =>
        u.id === currentUser.id || (currentUser.username && u.username === currentUser.username)
          ? { ...u, xp: nextXp }
          : u
      )
    )
    saveCloudProfile({ ...currentUser, xp: nextXp })

    if (nextDone) {
      showToast(`Quest "${target.title}" selesai! +${taskXp} XP 🎉`)
    } else {
      showToast(`Quest "${target.title}" dibatalkan. (-${taskXp} XP)`)
    }
  }

  const handleSkipPersonal = (taskId: string) => {
    const target =
      personalTasks.find(
        (t) =>
          t.id === taskId &&
          (t.userId === currentUser.id ||
            !t.userId ||
            (currentUser.username && t.userId === currentUser.username) ||
            (currentUser.username && t.id.includes(currentUser.username)))
      ) || personalTasks.find((t) => t.id === taskId)
    if (!target) return

    const todayIso = new Date().toISOString().slice(0, 10)
    const nextSkipped = !target.skipped
    const wasDone = target.done

    const nextTasks = personalTasks.map((t) => {
      if (t.id !== taskId) return t
      const prevDates = new Set(t.completedDates || [])
      const prevSkipped = new Set(t.skippedDates || [])

      if (nextSkipped) {
        prevSkipped.add(todayIso)
        prevDates.delete(todayIso)
      } else {
        prevSkipped.delete(todayIso)
      }
      return {
        ...t,
        skipped: nextSkipped,
        done: nextSkipped ? false : t.done,
        completedDates: Array.from(prevDates),
        skippedDates: Array.from(prevSkipped),
      }
    })

    setPersonalTasks(nextTasks)
    const updatedTask = nextTasks.find((t) => t.id === taskId)
    if (updatedTask) {
      saveCloudQuest(updatedTask, currentUser.username)
    }

    if (wasDone) {
      const taskXp = Number(target.xp) || 20
      const nextXp = Math.max(0, effectiveXp - taskXp)
      setUsers((curr) =>
        curr.map((u) =>
          u.id === currentUser.id || (currentUser.username && u.username === currentUser.username)
            ? { ...u, xp: nextXp }
            : u
        )
      )
      saveCloudProfile({ ...currentUser, xp: nextXp })
    }

    if (nextSkipped) {
      showToast(`Quest "${target.title}" dilewati (Terskip hari ini) ⏭`)
    } else {
      showToast(`Skip quest "${target.title}" dibatalkan. Siap dikerjakan!`)
    }
  }

  const handleDeletePersonal = (taskId: string) => {
    setPersonalTasks((curr) => curr.filter((t) => t.id !== taskId))
    deleteCloudQuest(taskId)
    showToast('Quest pribadi dihapus.')
  }

  const handleDeleteHistoryItem = (questId: string, dateLabel: string, isoDate?: string) => {
    const todayIso = new Date().toISOString().slice(0, 10)
    setPersonalTasks((prev) =>
      prev.map((t) => {
        if (t.id !== questId) return t
        const updatedDates = (t.completedDates || []).filter((d) => d !== isoDate && d !== dateLabel)
        const isTodayDate =
          isoDate === todayIso ||
          dateLabel === new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        const nextDone = isTodayDate ? false : t.done

        let updatedExs = t.workoutExercises
        if (updatedExs) {
          updatedExs = updatedExs.map((ex) => ({
            ...ex,
            history: (ex.history || []).filter((h) => h.date !== dateLabel && h.date !== isoDate),
          }))
        }

        return {
          ...t,
          done: nextDone,
          completedDates: updatedDates,
          workoutExercises: updatedExs,
        }
      })
    )
    showToast(`Riwayat quest (${dateLabel}) berhasil dihapus.`)
  }

  const openAddPersonalModal = () => {
    setEditingPersonalTask(null)
    setQuestTitle('')
    setQuestCategory(CATEGORIES[0].name)
    setQuestXp(CATEGORIES[0].xp)
    setQuestDays(['Everyday'])
    setSelectedTemplateSessionIdForQuest('')
    setIsPersonalModalOpen(true)
  }

  const openEditPersonalModal = (task: PersonalTask) => {
    setEditingPersonalTask(task)
    setQuestTitle(task.title)
    setQuestCategory(findCategory(task.category).name)
    setQuestXp(task.xp)
    setQuestDays(task.schedule && task.schedule.length > 0 ? task.schedule : ['Everyday'])
    setSelectedTemplateSessionIdForQuest('')
    setIsPersonalModalOpen(true)
  }

  const handleSavePersonalQuest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!questTitle.trim()) return
    const catObj = findCategory(questCategory)
    const isGym = catObj.name.toLowerCase() === 'gym'

    const allSessions = GYM_PROGRAM_TEMPLATES.flatMap((p) => p.sessions)
    const chosenTemplateSession = isGym && selectedTemplateSessionIdForQuest
      ? allSessions.find((s) => s.id === selectedTemplateSessionIdForQuest)
      : undefined
    const templateExercises = chosenTemplateSession
      ? buildWorkoutExercisesFromTemplate(chosenTemplateSession)
      : undefined

    const finalXp =
      typeof questXp === 'number'
        ? (questXp > 0 ? questXp : (catObj.xp || 50))
        : (parseInt(questXp, 10) > 0 ? parseInt(questXp, 10) : (catObj.xp || 50))

    if (editingPersonalTask) {
      const updatedTask: PersonalTask = {
        ...editingPersonalTask,
        title: questTitle.trim(),
        category: catObj.name,
        xp: finalXp,
        icon: catObj.icon,
        schedule: questDays,
        workoutExercises: isGym
          ? templateExercises ?? (editingPersonalTask.workoutExercises ?? [])
          : undefined,
      }
      setPersonalTasks((curr) =>
        curr.map((t) => (t.id === editingPersonalTask.id ? updatedTask : t))
      )
      saveCloudQuest(updatedTask, currentUser.username)
      showToast('Quest pribadi berhasil diperbarui!')
    } else {
      const newTask: PersonalTask = {
        id: `pt-${Date.now()}`,
        userId: currentUser.id,
        title: questTitle.trim(),
        category: catObj.name,
        xp: finalXp,
        icon: catObj.icon,
        done: false,
        schedule: questDays,
        workoutExercises: isGym ? (templateExercises ?? []) : undefined,
      }
      setPersonalTasks((curr) => [...curr, newTask])
      saveCloudQuest(newTask, currentUser.username)
      showToast(
        templateExercises
          ? `Quest "${newTask.title}" dibuat dengan ${templateExercises.length} gerakan referensi!`
          : 'Quest pribadi baru ditambahkan!'
      )
    }
    const scheduledForToday = isQuestForToday(questDays)
    setQuestScheduleTab(scheduledForToday ? 'today' : 'upcoming')
    setSelectedTemplateSessionIdForQuest('')
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
    const nextDone = !alreadyDone

    const nextClanQuests = clanQuests.map((cq) => {
      if (cq.id !== quest.id) return cq
      const nextCompleted = nextDone
        ? [...cq.completedByUserIds, currentUser.id]
        : cq.completedByUserIds.filter((id) => id !== currentUser.id)
      const nextSkipped = (cq.skippedByUserIds || []).filter((id) => id !== currentUser.id)
      return {
        ...cq,
        completedByUserIds: nextCompleted,
        skippedByUserIds: nextSkipped,
      }
    })

    setClanQuests(nextClanQuests)

    const questXp = Number(quest.xp) || 20
    const xpDelta = nextDone ? questXp : -questXp
    const nextXp = Math.max(0, effectiveXp + xpDelta)

    // Update User Personal XP
    setUsers((curr) =>
      curr.map((u) =>
        u.id === currentUser.id || (currentUser.username && u.username === currentUser.username)
          ? { ...u, xp: nextXp }
          : u
      )
    )
    saveCloudProfile({ ...currentUser, xp: nextXp })

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

    if (nextDone) {
      showToast(`Quest Clan "${quest.title}" selesai! +${quest.xp} XP diperoleh! 🎉`)
    } else {
      showToast(`Quest Clan "${quest.title}" dibatalkan. (-${quest.xp} XP)`)
    }
  }

  const handleSkipClanQuest = (quest: ClanQuest) => {
    if (!isMemberOfSelectedClan) {
      showToast('Kamu harus gabung ke Clan ini dulu!')
      return
    }
    const alreadySkipped = (quest.skippedByUserIds || []).includes(currentUser.id)
    const nextSkipped = !alreadySkipped
    const wasDone = quest.completedByUserIds.includes(currentUser.id)

    const nextClanQuests = clanQuests.map((cq) => {
      if (cq.id !== quest.id) return cq
      const nextCompleted = nextSkipped
        ? cq.completedByUserIds.filter((id) => id !== currentUser.id)
        : cq.completedByUserIds
      const nextSkippedList = nextSkipped
        ? [...(cq.skippedByUserIds || []), currentUser.id]
        : (cq.skippedByUserIds || []).filter((id) => id !== currentUser.id)
      return {
        ...cq,
        completedByUserIds: nextCompleted,
        skippedByUserIds: nextSkippedList,
      }
    })

    setClanQuests(nextClanQuests)

    if (wasDone) {
      const questXp = Number(quest.xp) || 20
      const xpDelta = -questXp
      const nextXp = Math.max(0, effectiveXp + xpDelta)
      setUsers((curr) =>
        curr.map((u) =>
          u.id === currentUser.id || (currentUser.username && u.username === currentUser.username)
            ? { ...u, xp: nextXp }
            : u
        )
      )
      saveCloudProfile({ ...currentUser, xp: nextXp })
      setClanMembers((curr) =>
        curr.map((cm) =>
          cm.clanId === quest.clanId && cm.userId === currentUser.id
            ? { ...cm, contributedXp: Math.max(0, cm.contributedXp + xpDelta) }
            : cm
        )
      )
      setClans((curr) =>
        curr.map((c) =>
          c.id === quest.clanId ? { ...c, totalXp: Math.max(0, c.totalXp + xpDelta) } : c
        )
      )
    }

    if (nextSkipped) {
      showToast(`Quest Clan "${quest.title}" dilewati (Terskip hari ini) ⏭`)
    } else {
      showToast(`Skip Quest Clan "${quest.title}" dibatalkan.`)
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

    const finalXp =
      typeof questXp === 'number'
        ? (questXp > 0 ? questXp : (catObj.xp || 50))
        : (parseInt(questXp, 10) > 0 ? parseInt(questXp, 10) : (catObj.xp || 50))

    if (editingClanQuest) {
      setClanQuests((curr) =>
        curr.map((cq) =>
          cq.id === editingClanQuest.id
            ? {
                ...cq,
                title: questTitle.trim(),
                category: catObj.name,
                xp: finalXp,
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
        xp: finalXp,
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
    const matchedCatalogItem = GYM_EXERCISE_LIBRARY.find(
      (item) => item.name.toLowerCase() === exercise.name.trim().toLowerCase()
    )

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div className="modal-label" style={{ marginBottom: 0, color: '#c4b5fd' }}>
                EDIT / GANTI GERAKAN #{exIndex + 1}
              </div>
              <button
                type="button"
                onClick={() => {
                  setReplacingExerciseId(exercise.id)
                  setEditingExerciseId(null)
                  setWorkoutSubPage('library')
                }}
                style={{
                  background: 'rgba(168, 85, 247, 0.16)',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  borderRadius: '8px',
                  color: '#e9d5ff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '4px 9px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Search size={11} color="#c084fc" />
                <span>Pilih Pengganti di Halaman Library</span>
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <input
                type="text"
                value={editingExerciseName}
                onChange={(e) => setEditingExerciseName(e.target.value)}
                placeholder="Ketik nama gerakan kustom..."
                className="modal-input"
                style={{ marginBottom: 0, padding: '8px 10px', fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#8e84a2' }}>Waktu Istirahat:</span>
              <input
                type="number"
                min={5}
                step={5}
                value={editingExerciseRest}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value
                  setEditingExerciseRest(val === '' ? '' : parseInt(val, 10))
                }}
                onBlur={() => {
                  if (editingExerciseRest === '' || Number(editingExerciseRest) < 5) {
                    setEditingExerciseRest(60)
                  }
                }}
                placeholder="60"
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
                onClick={() => {
                  handleUpdateExercise(
                    currentWorkoutQuest.id,
                    activeWorkoutQuest.type,
                    exercise.id,
                    editingExerciseName,
                    Number(editingExerciseRest) || 60
                  )
                }}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
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
                  {matchedCatalogItem && (
                    <span
                      style={{
                        fontSize: '8.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '99px',
                        background: 'rgba(168, 85, 247, 0.14)',
                        border: '1px solid rgba(168, 85, 247, 0.28)',
                        color: '#c4b5fd',
                        flexShrink: 0,
                      }}
                    >
                      {matchedCatalogItem.shortCategory}
                    </span>
                  )}
                </div>

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
                if (restSecondsLeft === 0) {
                  startRestCountdown(restDurationPreset || 60)
                } else if (restTimerActive) {
                  pauseRestCountdown()
                } else {
                  resumeRestCountdown()
                }
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
              onClick={() => extendRestCountdown(15)}
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
              onClick={() => stopRestCountdown(true)}
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
              const isSelected = Number(customTimerSeconds) === secs
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
              onClick={() => setCustomTimerSeconds((s) => Math.max(5, (Number(s) || 0) - 15))}
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
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value
                  setCustomTimerSeconds(val === '' ? '' : parseInt(val, 10))
                }}
                onBlur={() => {
                  if (customTimerSeconds === '' || Number(customTimerSeconds) < 5) {
                    setCustomTimerSeconds(60)
                  }
                }}
                placeholder="60"
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
              <span style={{ fontSize: '11px', color: '#8e84a2', fontWeight: 600 }}>detik ({formatTimer(Number(customTimerSeconds) || 60)})</span>
            </div>

            <button
              type="button"
              onClick={() => setCustomTimerSeconds((s) => (Number(s) || 0) + 15)}
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
                const newSecs = Math.max(5, Number(customTimerSeconds) || 60)
                setRestDurationPreset(newSecs)
                stopRestCountdown(false)
                setRestSecondsLeft(newSecs)
                setShowFloatingTimer(true)

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

  // MODAL KELOLA RIWAYAT BEBAN (REAL-TIME MANAGEMENT & SCROLL TEST)
  const renderHistoryManagerModal = () => {
    if (!isHistoryManagerOpen || !activeExercise || !currentWorkoutQuest || !activeWorkoutQuest) return null

    return (
      <div
        className="modal-overlay"
        onClick={() => setIsHistoryManagerOpen(false)}
        style={{ zIndex: 10000 }}
      >
        <div
          className="modal-content"
          style={{ maxWidth: '400px', maxHeight: '88vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} color="#c084fc" />
              <h3 style={{ textTransform: 'uppercase', fontSize: '13px' }}>
                Riwayat Beban: {activeExercise.name}
              </h3>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsHistoryManagerOpen(false)}
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>

          {/* FORM TAMBAH SESI MANUAL / BACKFILL TANGGAL LAIN */}
          <div
            style={{
              background: '#0a0814',
              border: '1px solid #281f3d',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#a855f7',
                marginBottom: '8px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Plus size={11} />
              <span>Tambah Sesi Manual / Tanggal Lain</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
              <div>
                <label className="modal-label" style={{ fontSize: '9px', marginBottom: '4px' }}>TANGGAL</label>
                <input
                  type="text"
                  className="modal-input"
                  style={{ marginBottom: 0, padding: '7px 9px', fontSize: '11.5px' }}
                  placeholder="Misal: 04 Nov"
                  value={customHistDate}
                  onChange={(e) => setCustomHistDate(e.target.value)}
                />
              </div>
              <div>
                <label className="modal-label" style={{ fontSize: '9px', marginBottom: '4px' }}>BEBAN (KG)</label>
                <input
                  type="number"
                  className="modal-input"
                  style={{ marginBottom: 0, padding: '7px 9px', fontSize: '11.5px' }}
                  placeholder="25"
                  value={customHistWeight}
                  onChange={(e) => setCustomHistWeight(e.target.value)}
                />
              </div>
              <div>
                <label className="modal-label" style={{ fontSize: '9px', marginBottom: '4px' }}>REPS</label>
                <input
                  type="number"
                  className="modal-input"
                  style={{ marginBottom: 0, padding: '7px 9px', fontSize: '11.5px' }}
                  placeholder="10"
                  value={customHistReps}
                  onChange={(e) => setCustomHistReps(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const w = parseFloat(customHistWeight)
                const r = parseInt(customHistReps) || 10
                if (!customHistDate.trim() || isNaN(w) || w <= 0) {
                  showToast('Harap masukkan tanggal (misal: 04 Nov) dan beban angka kg!')
                  return
                }
                handleAddCustomExerciseHistory(
                  currentWorkoutQuest.id,
                  activeWorkoutQuest.type,
                  activeExercise.id,
                  customHistDate.trim(),
                  w,
                  r
                )
              }}
              className="btn-primary"
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '7px 12px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Plus size={12} />
              <span>Simpan ke Riwayat Progres</span>
            </button>
          </div>

          {/* DAFTAR RIWAYAT TERCATAT */}
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: '#8e84a2',
                marginBottom: '8px',
                textTransform: 'uppercase',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Riwayat Real-Time Tersimpan ({(activeExercise.history || []).length})</span>
              <span style={{ fontSize: '9px', color: '#7c7390' }}>Tampil di chart</span>
            </div>

            {(!activeExercise.history || activeExercise.history.length === 0) ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  background: '#0d0a17',
                  borderRadius: '10px',
                  border: '1px dashed #282038',
                  color: '#7f7495',
                  fontSize: '11px',
                  lineHeight: 1.5,
                }}
              >
                Belum ada sesi riwayat yang disimpan secara manual. Beban sesi aktif hari ini otomatis tampil di chart!
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '6px' }}>
                {activeExercise.history.map((hist, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#120e21',
                      border: '1px solid #231b35',
                      borderRadius: '9px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#c084fc',
                          background: 'rgba(168, 85, 247, 0.12)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {hist.date}
                      </span>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#f3f1ff' }}>
                        {hist.weight} <span style={{ fontSize: '10px', color: '#a78bfa' }}>KG</span>
                        {hist.reps && (
                          <span style={{ fontSize: '10px', color: '#8e84a2', marginLeft: '6px' }}>
                            • {hist.reps} Reps
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteExerciseHistory(
                          currentWorkoutQuest.id,
                          activeWorkoutQuest.type,
                          activeExercise.id,
                          idx
                        )
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        borderRadius: '6px',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Hapus sesi ini"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setIsHistoryManagerOpen(false)}
            >
              Tutup
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
          <div
            className="brand-mark"
            onClick={() => {
              setActiveWorkoutQuest(null)
              setActiveExerciseId(null)
              setIsHistoryPageOpen(false)
              setActiveTab('home')
            }}
            title="Beranda"
          >
            <Swords size={17} strokeWidth={2.5} />
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

        {/* MODAL KELOLA RIWAYAT BEBAN (REAL-TIME) */}
        {renderHistoryManagerModal()}

        {/* FLOATING HEADS-UP NOTIFICATION (SEPERTI NOTIF HP, TIDAK MENGGESER KONTEN) */}
        {statusMessage && (
          <div
            style={{
              position: 'fixed',
              top: activeWorkoutQuest && showFloatingTimer ? '104px' : '26px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: 'calc(100% - 40px)',
              maxWidth: '390px',
              padding: '11px 16px',
              borderRadius: '14px',
              background: 'rgba(24, 15, 46, 0.96)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(168, 85, 247, 0.65)',
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.85), 0 0 22px rgba(139, 92, 246, 0.35)',
              color: '#f3f1ff',
              fontSize: '11.5px',
              fontWeight: 600,
              lineHeight: 1.45,
              textAlign: 'center',
              pointerEvents: 'none',
              letterSpacing: '0.01em',
              transition: 'top 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
              animation: 'fadeIn 0.2s ease-out',
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
                        min={5}
                        step={5}
                        value={editingExerciseRest}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value
                          setEditingExerciseRest(val === '' ? '' : parseInt(val, 10))
                        }}
                        onBlur={() => {
                          if (editingExerciseRest === '' || Number(editingExerciseRest) < 5) {
                            setEditingExerciseRest(60)
                          }
                        }}
                        placeholder="60"
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
                            Number(editingExerciseRest) || 60
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


                {/* ============================================================
                    CHART PROGRES BEBAN & INFO SET TERAKHIR (REAL-TIME & SCROLLABLE)
                   ============================================================ */}
                {(() => {
                  const completedSets = activeExercise.sets.filter((s) => s.completed)
                  const latestCompletedSet = completedSets.length > 0 ? completedSets[completedSets.length - 1] : null
                  const workingSet = activeExercise.sets[activeExercise.sets.length - 1] || activeExercise.sets[0]
                  const displaySet = latestCompletedSet || workingSet

                  const latestWeight = displaySet ? (Number(displaySet.weight) || 0) : 0
                  const latestReps = displaySet ? (Number(displaySet.reps) || 10) : 10
                  const latestSetNum = displaySet ? displaySet.setNumber : 1
                  const todayDateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
                  const fullDateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })

                  // REAL-TIME ONLY (NO DUMMY DATA)
                  // Data hanya diambil dari riwayat nyata yang tercatat di activeExercise.history
                  const savedHistory: WorkoutExerciseHistory[] =
                    activeExercise.history && activeExercise.history.length > 0
                      ? activeExercise.history
                      : []

                  let historyList: WorkoutExerciseHistory[] = []
                  if (savedHistory.length > 0) {
                    historyList = [...savedHistory]
                    const todayIdx = historyList.findIndex((h) => h.date === todayDateStr)
                    if (todayIdx !== -1) {
                      // Sinkronkan nilai sesi hari ini dengan beban kerja terbaru secara real-time
                      historyList[todayIdx] = {
                        ...historyList[todayIdx],
                        weight: latestWeight,
                        reps: latestReps,
                        setNumber: latestSetNum,
                      }
                    } else {
                      // Masukkan sesi aktif hari ini sebagai titik live terkini
                      historyList.push({
                        date: todayDateStr,
                        weight: latestWeight,
                        reps: latestReps,
                        setNumber: latestSetNum,
                      })
                    }
                  } else {
                    // Jika belum pernah ada riwayat sebelumnya, hanya tampilkan 1 sesi live hari ini
                    historyList = [
                      {
                        date: todayDateStr,
                        weight: latestWeight,
                        reps: latestReps,
                        setNumber: latestSetNum,
                      },
                    ]
                  }

                  const pointsCount = historyList.length
                  const isMultiPoints = pointsCount > 1
                  const prevWeight = isMultiPoints ? historyList[pointsCount - 2].weight : latestWeight
                  const diffFromPrev = latestWeight - prevWeight

                  // Dimensi SVG & Horizontally Scrollable setup
                  // Jika data lebih dari 4 sesi, per sesi mendapatkan 70px lebar dan container dapat di-scroll secara horizontal
                  const pointSpacing = 72
                  const baseW = 340
                  const svgW = pointsCount > 4 ? Math.max(baseW, 64 + (pointsCount - 1) * pointSpacing) : baseW
                  const svgH = 118
                  const pLeft = pointsCount > 1 ? (pointsCount > 4 ? 36 : 32) : svgW / 2
                  const pRight = pointsCount > 4 ? 36 : 32
                  const pTop = 22
                  const pBottom = 26
                  const plotW = svgW - pLeft - pRight
                  const plotH = svgH - pTop - pBottom

                  const weightsArr = historyList.map((d) => d.weight)
                  let minW = Math.min(...weightsArr)
                  let maxW = Math.max(...weightsArr)
                  if (minW === maxW) {
                    minW = Math.max(0, minW - 5)
                    maxW = maxW + 5
                  } else {
                    const margin = Math.max(2, (maxW - minW) * 0.2)
                    minW = Math.max(0, minW - margin)
                    maxW = maxW + margin
                  }

                  const points = historyList.map((item, idx) => {
                    const x = pointsCount > 1 ? pLeft + (idx / (pointsCount - 1)) * plotW : svgW / 2
                    const y = pTop + plotH - ((item.weight - minW) / (maxW - minW)) * plotH
                    return { ...item, x, y }
                  })

                  const lineD = points.length > 1
                    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
                    : ''
                  const areaD = points.length > 1
                    ? `${lineD} L ${points[points.length - 1].x.toFixed(1)} ${(pTop + plotH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(pTop + plotH).toFixed(1)} Z`
                    : ''

                  return (
                    <div
                      style={{
                        background: 'linear-gradient(145deg, #130f24 0%, #0d0a18 100%)',
                        border: '1px solid #281f3d',
                        borderRadius: '16px',
                        padding: '12px 14px 10px',
                        marginBottom: '16px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
                      }}
                    >
                      {/* STATS HEADER: TO THE POINT */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                          marginBottom: '8px',
                        }}
                      >
                        {/* KIRI: BEBAN TERKINI */}
                        <div>
                          <div
                            style={{
                              fontSize: '9px',
                              fontWeight: 800,
                              letterSpacing: '0.1em',
                              color: '#a855f7',
                              textTransform: 'uppercase',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <TrendingUp size={11} color="#c084fc" />
                            <span>BEBAN</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                            <span
                              style={{
                                fontSize: '24px',
                                fontWeight: 900,
                                color: '#ffffff',
                                letterSpacing: '-0.03em',
                                lineHeight: 1,
                              }}
                            >
                              {latestWeight}{' '}
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#c084fc' }}>KG</span>
                            </span>
                            {isMultiPoints && diffFromPrev !== 0 && (
                              <span
                                style={{
                                  fontSize: '9.5px',
                                  fontWeight: 800,
                                  color: diffFromPrev > 0 ? '#4ade80' : '#f87171',
                                  background: diffFromPrev > 0 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  padding: '2px 5px',
                                  borderRadius: '5px',
                                  lineHeight: 1,
                                }}
                              >
                                {diffFromPrev > 0 ? `+${diffFromPrev.toFixed(1)} kg` : `${diffFromPrev.toFixed(1)} kg`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* KANAN: SET TERAKHIR & TANGGAL */}
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: '8.5px',
                              fontWeight: 700,
                              color: '#8e84a2',
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                            }}
                          >
                            TERAKHIR
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: '#f3f1ff',
                              marginTop: '2px',
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Set #{latestSetNum} • {latestReps} Reps
                          </div>
                          <div
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 600,
                              color: '#a78bfa',
                              marginTop: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '3px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <CalendarDays size={10} color="#c084fc" />
                            <span>{fullDateStr}</span>
                          </div>
                        </div>
                      </div>

                      {/* INDIKATOR SCROLL JIKA DATA BANYAK */}
                      {pointsCount > 4 && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: '4px',
                            marginBottom: '4px',
                            fontSize: '9px',
                            color: '#a78bfa',
                            fontWeight: 600,
                          }}
                        >
                          <span>↔ Scroll</span>
                        </div>
                      )}

                      {/* GRAFIK / CHART PROGRESS (SVG HORIZONTALLY SCROLLABLE) */}
                      <div
                        ref={chartScrollRef}
                        className="custom-scrollbar"
                        style={{
                          background: 'rgba(9, 7, 16, 0.75)',
                          borderRadius: '12px',
                          border: '1px solid #1f1830',
                          padding: '6px 4px 4px',
                          position: 'relative',
                          overflowX: 'auto',
                          overflowY: 'hidden',
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        <svg
                          viewBox={`0 0 ${svgW} ${svgH}`}
                          style={{
                            width: pointsCount > 4 ? `${svgW}px` : '100%',
                            minWidth: pointsCount > 4 ? `${svgW}px` : '100%',
                            height: '118px',
                            display: 'block',
                          }}
                        >
                          <defs>
                            <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines Horizontal */}
                          {[0.15, 0.5, 0.85].map((ratio, i) => {
                            const yPos = pTop + plotH * ratio
                            return (
                              <line
                                key={i}
                                x1={pointsCount > 1 ? pLeft : 20}
                                y1={yPos}
                                x2={pointsCount > 1 ? svgW - pRight : svgW - 20}
                                y2={yPos}
                                stroke="#1e1830"
                                strokeDasharray="3 3"
                                strokeWidth="1"
                              />
                            )
                          })}

                          {/* Area Fill jika multi-point */}
                          {areaD && <path d={areaD} fill="url(#weightAreaGrad)" />}

                          {/* Line Chart jika multi-point */}
                          {lineD && (
                            <path
                              d={lineD}
                              stroke="#c084fc"
                              strokeWidth="2.5"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* Guide Line horizontal jika hanya 1 point */}
                          {!isMultiPoints && points.length === 1 && (
                            <line
                              x1={24}
                              y1={points[0].y}
                              x2={svgW - 24}
                              y2={points[0].y}
                              stroke="#7c3aed"
                              strokeDasharray="4 4"
                              strokeWidth="1.2"
                              opacity="0.5"
                            />
                          )}

                          {/* Points, Weight Labels & Date Labels */}
                          {points.map((p, idx) => {
                            const isLatest = idx === points.length - 1
                            return (
                              <g key={idx}>
                                {/* Titik Circle */}
                                <circle
                                  cx={p.x}
                                  cy={p.y}
                                  r={isLatest ? 4.5 : 3.5}
                                  fill={isLatest ? '#fbbf24' : '#a855f7'}
                                  stroke="#0f0c1d"
                                  strokeWidth="2"
                                />
                                {isLatest && (
                                  <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="8"
                                    fill="none"
                                    stroke="rgba(251, 191, 36, 0.35)"
                                    strokeWidth="1.5"
                                  />
                                )}

                                {/* Nilai Beban (KG) di atas titik */}
                                <text
                                  x={p.x}
                                  y={p.y - 7}
                                  textAnchor="middle"
                                  fontSize="9"
                                  fontWeight="800"
                                  fill={isLatest ? '#fbbf24' : '#e9d5ff'}
                                >
                                  {p.weight}k
                                </text>

                                {/* Tanggal di bawah titik (X-axis) */}
                                <text
                                  x={p.x}
                                  y={svgH - 7}
                                  textAnchor="middle"
                                  fontSize="8.5"
                                  fontWeight={isLatest ? '700' : '500'}
                                  fill={isLatest ? '#d8b4fe' : '#7c728e'}
                                >
                                  {p.date}
                                </text>
                              </g>
                            )
                          })}
                        </svg>
                      </div>

                      {/* ACTIONS: TO THE POINT */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '6px',
                          marginTop: '8px',
                          padding: '0 2px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setIsHistoryManagerOpen(true)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '7px',
                            color: '#c4b5fd',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Buka pengelola riwayat beban"
                        >
                          <Settings size={10} />
                          <span>Riwayat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleLogExerciseProgress(
                              currentWorkoutQuest.id,
                              activeWorkoutQuest.type,
                              activeExercise.id,
                              latestWeight,
                              latestReps,
                              latestSetNum
                            )
                          }}
                          style={{
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.4)',
                            borderRadius: '7px',
                            color: '#e9d5ff',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Simpan beban saat ini ke riwayat progres"
                        >
                          <Plus size={10} />
                          <span>Catat Sesi</span>
                        </button>
                      </div>
                    </div>
                  )
                })()}

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
                            value={set.weight !== undefined && set.weight !== null ? set.weight : ''}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value
                              handleUpdateSetField(
                                currentWorkoutQuest.id,
                                activeWorkoutQuest.type,
                                activeExercise.id,
                                set.id,
                                'weight',
                                raw === '' ? '' : Number(raw)
                              )
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || isNaN(Number(e.target.value))) {
                                handleUpdateSetField(
                                  currentWorkoutQuest.id,
                                  activeWorkoutQuest.type,
                                  activeExercise.id,
                                  set.id,
                                  'weight',
                                  0
                                )
                              }
                            }}
                            placeholder="0"
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
                            value={set.reps !== undefined && set.reps !== null ? set.reps : ''}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const raw = e.target.value
                              handleUpdateSetField(
                                currentWorkoutQuest.id,
                                activeWorkoutQuest.type,
                                activeExercise.id,
                                set.id,
                                'reps',
                                raw === '' ? '' : Number(raw)
                              )
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || isNaN(Number(e.target.value)) || Number(e.target.value) <= 0) {
                                handleUpdateSetField(
                                  currentWorkoutQuest.id,
                                  activeWorkoutQuest.type,
                                  activeExercise.id,
                                  set.id,
                                  'reps',
                                  10
                                )
                              }
                            }}
                            placeholder="10"
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
            ) : workoutSubPage === 'library' ? (
              /* ============================================================
                 HALAMAN PENUH: LIBRARY GERAKAN GYM (TANPA POPUP & TANPA SCROLLBAR)
                 ============================================================ */
              (() => {
                const matchedLibraryItems = searchGymExercises(newExerciseName, libraryCategoryFilter)
                const replacingTarget = replacingExerciseId
                  ? workoutQuestExercises.find((e) => e.id === replacingExerciseId)
                  : null

                return (
                  <div style={{ animation: 'heroCardAppear 0.25s ease' }}>
                    {/* HEADER HALAMAN LIBRARY */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setWorkoutSubPage('overview')
                            setReplacingExerciseId(null)
                            setNewExerciseName('')
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
                          title="Kembali ke Quest Workout"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <div className="eyebrow" style={{ color: '#9d76f3', fontSize: '9px' }}>
                            {replacingTarget ? `GANTI GERAKAN: ${replacingTarget.name.toUpperCase()}` : 'EXERCISE CATALOG'}
                          </div>
                          <h2
                            style={{
                              fontSize: '18px',
                              fontWeight: 800,
                              color: '#ffffff',
                              margin: '2px 0 0',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            Library Gerakan Gym
                          </h2>
                        </div>
                      </div>
                      <span className="completion">{matchedLibraryItems.length} Gerakan</span>
                    </div>

                    {/* INPUT PENCARIAN KEYWORD & FUZZY */}
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <input
                        type="text"
                        value={newExerciseName}
                        onChange={(e) => setNewExerciseName(e.target.value)}
                        placeholder="Ketik gerakan atau otot (cth: bench, incline, dada, row, kaki)..."
                        className="modal-input"
                        style={{ marginBottom: 0, padding: '10px 34px 10px 12px', fontSize: '12.5px' }}
                        autoFocus
                      />
                      {newExerciseName && (
                        <button
                          type="button"
                          onClick={() => setNewExerciseName('')}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'transparent',
                            border: 0,
                            color: '#8e84a2',
                            cursor: 'pointer',
                          }}
                          title="Bersihkan pencarian"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* FILTER KATEGORI OTOT (FLEX WRAP — TANPA HORIZONTAL SCROLLBAR) */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      {GYM_MUSCLE_CATEGORIES.map((cat) => {
                        const isActive = libraryCategoryFilter === cat.id
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setLibraryCategoryFilter(cat.id)}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '99px',
                              fontSize: '10.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: isActive
                                ? 'linear-gradient(135deg, #7c3aed, #9333ea)'
                                : '#120e1f',
                              border: isActive ? '1px solid #d8b4fe' : '1px solid #281f3d',
                              color: isActive ? '#ffffff' : '#a79bc2',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {cat.icon} {cat.shortLabel}
                          </button>
                        )
                      })}
                    </div>

                    {/* PENGATURAN SET, REPS, ISTIRAHAT (UNTUK TAMBAH GERAKAN BARU) */}
                    {!replacingTarget && (
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '13px',
                          background: '#120e1e',
                          border: '1px solid #2b2142',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '9.5px', color: '#9a8fb2', marginBottom: '4px', fontWeight: 700 }}>
                              Jumlah Set
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={newExerciseSetsCount}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value
                                setNewExerciseSetsCount(val === '' ? '' : parseInt(val, 10))
                              }}
                              onBlur={() => {
                                if (newExerciseSetsCount === '' || Number(newExerciseSetsCount) < 1) {
                                  setNewExerciseSetsCount(3)
                                }
                              }}
                              placeholder="3"
                              style={{
                                width: '100%',
                                padding: '6px',
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
                            <label style={{ display: 'block', fontSize: '9.5px', color: '#9a8fb2', marginBottom: '4px', fontWeight: 700 }}>
                              Target Reps
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={newExerciseReps}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value
                                setNewExerciseReps(val === '' ? '' : parseInt(val, 10))
                              }}
                              onBlur={() => {
                                if (newExerciseReps === '' || Number(newExerciseReps) < 1) {
                                  setNewExerciseReps(10)
                                }
                              }}
                              placeholder="10"
                              style={{
                                width: '100%',
                                padding: '6px',
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
                            <label style={{ display: 'block', fontSize: '9.5px', color: '#9a8fb2', marginBottom: '4px', fontWeight: 700 }}>
                              Istirahat (dtk)
                            </label>
                            <input
                              type="number"
                              min={5}
                              step={5}
                              value={newExerciseRest}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value
                                setNewExerciseRest(val === '' ? '' : parseInt(val, 10))
                              }}
                              onBlur={() => {
                                if (newExerciseRest === '' || Number(newExerciseRest) < 5) {
                                  setNewExerciseRest(60)
                                }
                              }}
                              placeholder="60"
                              style={{
                                width: '100%',
                                padding: '6px',
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

                        {newExerciseName.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              handleAddExercise(
                                currentWorkoutQuest.id,
                                activeWorkoutQuest.type,
                                newExerciseName,
                                Number(newExerciseRest) || 60,
                                Number(newExerciseSetsCount) || 3,
                                Number(newExerciseReps) || 10
                              )
                              setNewExerciseName('')
                              setWorkoutSubPage('overview')
                            }}
                            className="btn-primary"
                            style={{
                              width: '100%',
                              marginTop: '10px',
                              padding: '8px 12px',
                              fontSize: '11.5px',
                              fontWeight: 800,
                            }}
                          >
                            + Simpan "{newExerciseName.trim()}" ke Quest Ini
                          </button>
                        )}
                      </div>
                    )}

                    {/* DAFTAR LENGKAP GERAKAN (FULL PAGE LIST — TANPA INNER SCROLLBOX) */}
                    <div style={{ display: 'grid', gap: '7px' }}>
                      {matchedLibraryItems.length === 0 ? (
                        <div
                          style={{
                            padding: '22px 14px',
                            borderRadius: '14px',
                            background: '#110e1d',
                            border: '1px dashed #2d2246',
                            textAlign: 'center',
                            fontSize: '11.5px',
                            color: '#9a8fb2',
                          }}
                        >
                          Tidak ada gerakan yang persis di library untuk <strong>"{newExerciseName}"</strong>.
                          {replacingTarget && newExerciseName.trim() && (
                            <div style={{ marginTop: '10px' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateExercise(
                                    currentWorkoutQuest.id,
                                    activeWorkoutQuest.type,
                                    replacingTarget.id,
                                    newExerciseName.trim(),
                                    replacingTarget.restSeconds || 60
                                  )
                                  setReplacingExerciseId(null)
                                  setNewExerciseName('')
                                  setWorkoutSubPage('overview')
                                }}
                                className="btn-primary"
                                style={{ padding: '7px 14px', fontSize: '11px' }}
                              >
                                Ganti menjadi "{newExerciseName.trim()}"
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        matchedLibraryItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '10px',
                              padding: '10px 12px',
                              borderRadius: '12px',
                              background: '#120f1e',
                              border: '1px solid #261e3a',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '12.5px', color: '#f3f1ff', fontWeight: 700 }}>
                                  {item.name}
                                </strong>
                                <span
                                  style={{
                                    fontSize: '9px',
                                    padding: '1px 7px',
                                    borderRadius: '99px',
                                    background: 'rgba(168, 85, 247, 0.15)',
                                    border: '1px solid rgba(168, 85, 247, 0.3)',
                                    color: '#d8b4fe',
                                    fontWeight: 700,
                                  }}
                                >
                                  {item.category}
                                </span>
                              </div>
                              <span style={{ fontSize: '10px', color: '#8a80a0', display: 'block', marginTop: '2px' }}>
                                Rekomendasi: {item.targetNote || `${item.defaultSets} × ${item.defaultReps}`}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (replacingTarget) {
                                  handleUpdateExercise(
                                    currentWorkoutQuest.id,
                                    activeWorkoutQuest.type,
                                    replacingTarget.id,
                                    item.name,
                                    replacingTarget.restSeconds || 60
                                  )
                                  setReplacingExerciseId(null)
                                  setNewExerciseName('')
                                  setWorkoutSubPage('overview')
                                } else {
                                  handleAddExercise(
                                    currentWorkoutQuest.id,
                                    activeWorkoutQuest.type,
                                    item.name,
                                    Number(newExerciseRest) || 60,
                                    item.defaultSets,
                                    item.defaultReps
                                  )
                                  setNewExerciseName('')
                                  setWorkoutSubPage('overview')
                                }
                              }}
                              style={{
                                padding: '6px 11px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                                border: '1px solid #c084fc',
                                color: '#ffffff',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                flexShrink: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Plus size={11} />
                              <span>{replacingTarget ? 'Ganti' : 'Pilih'}</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })()
            ) : workoutSubPage === 'programs' ? (
              /* ============================================================
                 HALAMAN PENUH: REFERENSI PROGRAM GYM (2X–6X SEMINGGU)
                 ============================================================ */
              (() => {
                const activeProgram =
                  GYM_PROGRAM_TEMPLATES.find((p) => p.id === selectedProgramId) || GYM_PROGRAM_TEMPLATES[0]

                return (
                  <div style={{ animation: 'heroCardAppear 0.25s ease' }}>
                    {/* HEADER HALAMAN REFERENSI PROGRAM */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => setWorkoutSubPage('overview')}
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
                          title="Kembali ke Quest Workout"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <div className="eyebrow" style={{ color: '#9d76f3', fontSize: '9px' }}>
                            WORKOUT TEMPLATES
                          </div>
                          <h2
                            style={{
                              fontSize: '18px',
                              fontWeight: 800,
                              color: '#ffffff',
                              margin: '2px 0 0',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            Referensi Program Latihan
                          </h2>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingExerciseId(null)
                          setWorkoutSubPage('library')
                        }}
                        className="show-more-btn"
                      >
                        <Search size={12} />
                        <span>Library Gerakan</span>
                      </button>
                    </div>

                    {/* PILIHAN FREKUENSI: 2x, 3x, 4x, 5x, 6x Seminggu (FLEX WRAP — TANPA SCROLLBAR) */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      {GYM_PROGRAM_TEMPLATES.map((prog) => {
                        const isSel = prog.id === activeProgram.id
                        return (
                          <button
                            key={prog.id}
                            type="button"
                            onClick={() => setSelectedProgramId(prog.id)}
                            style={{
                              padding: '6px 11px',
                              borderRadius: '99px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              background: isSel
                                ? 'linear-gradient(135deg, #7c3aed, #9333ea)'
                                : '#141024',
                              border: isSel ? '1px solid #d8b4fe' : '1px solid #2b2144',
                              color: isSel ? '#ffffff' : '#b3a7cc',
                            }}
                          >
                            {prog.frequencyLabel}
                          </button>
                        )
                      })}
                    </div>

                    {/* BANNER INFO PROGRAM */}
                    <div
                      style={{
                        padding: '13px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(44, 24, 92, 0.55), rgba(18, 13, 34, 0.9))',
                        border: '1px solid rgba(168, 85, 247, 0.38)',
                        marginBottom: '14px',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '14px', color: '#ffffff', fontWeight: 800 }}>
                        {activeProgram.title}
                      </strong>
                      <span style={{ display: 'block', fontSize: '11px', color: '#d8b4fe', marginTop: '2px' }}>
                        {activeProgram.subtitle}
                      </span>
                      {activeProgram.note && (
                        <p style={{ margin: '6px 0 0', fontSize: '10.5px', color: '#a89ec0', lineHeight: 1.4 }}>
                          📌 {activeProgram.note}
                        </p>
                      )}
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '6px 9px',
                          borderRadius: '8px',
                          background: 'rgba(11, 8, 22, 0.65)',
                          border: '1px solid rgba(168, 85, 247, 0.22)',
                          fontSize: '10px',
                          color: '#c4b5fd',
                        }}
                      >
                        ✨ <strong>Bukan Permanen:</strong> Setelah menerapkan referensi ini, kamu bebas mengganti gerakan, menambah, atau menghapusnya kapan saja.
                      </div>
                    </div>

                    {/* DAFTAR SESI DALAM PROGRAM */}
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {activeProgram.sessions.map((session) => (
                        <div
                          key={session.id}
                          style={{
                            padding: '12px',
                            borderRadius: '14px',
                            background: '#110e1d',
                            border: '1px solid #2b2242',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              marginBottom: '8px',
                            }}
                          >
                            <div>
                              <strong style={{ display: 'block', fontSize: '13px', color: '#f3f1ff', fontWeight: 800 }}>
                                {session.title}
                              </strong>
                              <span style={{ fontSize: '10px', color: '#9388ac' }}>
                                Rekomendasi: {session.dayLabel} • {session.exercises.length} Gerakan
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleApplySessionToCurrentWorkout(session, 'replace')}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                                  border: '1px solid #c084fc',
                                  color: '#ffffff',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                }}
                              >
                                Pakai di Quest Ini
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApplySessionToCurrentWorkout(session, 'append')}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '8px',
                                  background: '#1d1532',
                                  border: '1px solid #453075',
                                  color: '#d8b4fe',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                + Gabung
                              </button>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gap: '4px' }}>
                            {session.exercises.map((ex, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '5px 8px',
                                  borderRadius: '7px',
                                  background: '#0a0813',
                                  border: '1px solid #1e182e',
                                  fontSize: '11px',
                                }}
                              >
                                <span style={{ color: '#e2d9f3', fontWeight: 600 }}>
                                  {idx + 1}. {ex.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: '#c4b5fd',
                                    fontWeight: 700,
                                    background: 'rgba(168, 85, 247, 0.12)',
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  {ex.note || `${ex.sets} × ${ex.reps}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()
            ) : (
              /* ============================================================
                 HALAMAN UTAMA WORKOUT (LIST OF EXERCISES / OVERVIEW)
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
                        setWorkoutSubPage('overview')
                        setReplacingExerciseId(null)
                        stopRestCountdown(false)
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

                {/* SECTION HEADER: PENDING + TOMBOL HALAMAN REFERENSI PROGRAM & HALAMAN LIBRARY */}
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
                    <button
                      type="button"
                      onClick={() => setWorkoutSubPage('programs')}
                      style={{
                        height: '28px',
                        padding: '0 9px',
                        borderRadius: '8px',
                        background: 'rgba(124, 58, 237, 0.16)',
                        border: '1px solid rgba(168, 85, 247, 0.42)',
                        color: '#e9d5ff',
                        fontSize: '10px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Buka Halaman Referensi Program (2x–6x Seminggu)"
                    >
                      <BookOpen size={11} color="#c084fc" />
                      <span>Referensi Program</span>
                    </button>

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

                    <button
                      type="button"
                      onClick={() => {
                        setReplacingExerciseId(null)
                        setWorkoutSubPage('library')
                      }}
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
                      title="Buka Halaman Library Gerakan"
                      aria-label="Tambah Gerakan dari Halaman Library"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* EMPTY STATE: JIKA BELUM ADA GERAKAN SAMA SEKALI */}
                {workoutQuestExercises.length === 0 && (
                  <div className="lock-banner" style={{ padding: '24px 16px', marginBottom: '16px' }}>
                    <Dumbbell size={28} color="#9d70ed" style={{ margin: '0 auto 6px', opacity: 0.85 }} />
                    <strong style={{ display: 'block', fontSize: '13.5px', color: '#f3f1ff' }}>
                      Belum Ada Gerakan Latihan
                    </strong>
                    <p style={{ margin: '5px auto 14px', maxWidth: '280px', fontSize: '11px' }}>
                      Pilih gerakan dari <strong>Halaman Library Gerakan</strong> atau gunakan <strong>Halaman Referensi Program</strong> (2x–6x seminggu) yang bisa diubah kapan saja.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingExerciseId(null)
                          setWorkoutSubPage('library')
                        }}
                        className="btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', padding: '8px 13px' }}
                      >
                        <Search size={12} /> Buka Library Gerakan
                      </button>
                      <button
                        type="button"
                        onClick={() => setWorkoutSubPage('programs')}
                        className="btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          padding: '8px 13px',
                          borderColor: 'rgba(168, 85, 247, 0.45)',
                          color: '#e9d5ff',
                        }}
                      >
                        <BookOpen size={12} color="#c084fc" /> Buka Referensi Program
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

                {/* BOTTOM ACTION: SELESAIKAN WORKOUT */}
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
            {isHistoryPageOpen ? (
              /* ================================================================
                 HALAMAN HISTORY QUEST (FULL PAGE VIEW DARI TOMBOL SHOW MORE)
                 ================================================================ */
              <div style={{ animation: 'heroCardAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                {/* Header History Quest */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '18px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                    <button
                      type="button"
                      onClick={() => setIsHistoryPageOpen(false)}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '11px',
                        background: '#161126',
                        border: '1px solid #352754',
                        color: '#d8b4fe',
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                      title="Kembali ke Home"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <span className="eyebrow">ACTIVITY LOG</span>
                      <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '2px 0 0', color: '#f5f2ff' }}>
                        History Quest
                      </h1>
                    </div>
                  </div>
                  <span className="completion">{userHistoryItems.length} Sesi</span>
                </div>

                {/* Summary Bento Stats (3 Kartu Ringkasan Umum Quest) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      background: 'linear-gradient(145deg, rgba(32, 20, 62, 0.7), rgba(16, 12, 28, 0.9))',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      textAlign: 'center',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '17px', fontWeight: 800, color: '#f5f2ff' }}>
                      {userHistoryItems.length}
                    </strong>
                    <span style={{ fontSize: '10px', color: '#9a8fb3' }}>Quest Selesai</span>
                  </div>
                  <div
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      background: 'linear-gradient(145deg, rgba(32, 20, 62, 0.7), rgba(16, 12, 28, 0.9))',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      textAlign: 'center',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '17px', fontWeight: 800, color: '#d8b4fe' }}>
                      {effectiveXp.toLocaleString('id-ID')} XP
                    </strong>
                    <span style={{ fontSize: '10px', color: '#9a8fb3' }}>Total XP</span>
                  </div>
                  <div
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      background: 'linear-gradient(145deg, rgba(32, 20, 62, 0.7), rgba(16, 12, 28, 0.9))',
                      border: '1px solid rgba(168, 85, 247, 0.25)',
                      textAlign: 'center',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '17px', fontWeight: 800, color: '#fbbf24' }}>
                      {currentUser.streak} Hari
                    </strong>
                    <span style={{ fontSize: '10px', color: '#9a8fb3' }}>Streak Aktif</span>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    padding: '4px',
                    borderRadius: '11px',
                    background: '#0e0b18',
                    border: '1px solid #261f3d',
                    marginBottom: '14px',
                  }}
                >
                  {[
                    { key: 'all', label: 'Semua' },
                    { key: 'gym', label: 'Gym' },
                    { key: 'other', label: 'Quest Lain' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setHistoryFilter(tab.key as 'all' | 'gym' | 'other')}
                      style={{
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border:
                          historyFilter === tab.key
                            ? '1px solid rgba(168, 85, 247, 0.45)'
                            : '1px solid transparent',
                        background:
                          historyFilter === tab.key
                            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(88, 28, 135, 0.45))'
                            : 'transparent',
                        color: historyFilter === tab.key ? '#f3f1ff' : '#827896',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Daftar Lengkap History Quest */}
                <div style={{ display: 'grid', gap: '10px' }}>
                  {(() => {
                    const filteredHistory = userHistoryItems.filter((item) => {
                      if (historyFilter === 'gym') return item.isGym
                      if (historyFilter === 'other') return !item.isGym
                      return true
                    })

                    if (filteredHistory.length === 0) {
                      return (
                        <div
                          style={{
                            padding: '28px 16px',
                            borderRadius: '16px',
                            background: '#0e0c16',
                            border: '1px dashed #2c2342',
                            textAlign: 'center',
                            color: '#827896',
                            fontSize: '12px',
                          }}
                        >
                          Belum ada riwayat pada kategori ini.
                        </div>
                      )
                    }

                    return filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '14px',
                          borderRadius: '16px',
                          background: 'linear-gradient(145deg, rgba(22, 17, 36, 0.94), rgba(14, 11, 24, 0.98))',
                          border: '1px solid rgba(139, 92, 246, 0.24)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                            <div className="history-icon-box">
                              {item.isGym ? <Dumbbell size={18} /> : item.icon}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '13.5px', color: '#f5f2ff', fontWeight: 700 }}>
                                  {item.title}
                                </strong>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    padding: '2px 7px',
                                    borderRadius: '99px',
                                    background: 'rgba(168, 85, 247, 0.14)',
                                    border: '1px solid rgba(168, 85, 247, 0.28)',
                                    color: '#d8b4fe',
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.dateLabel}
                                </span>
                              </div>
                              <span style={{ fontSize: '10.5px', color: '#8a80a0', display: 'block', marginTop: '2px' }}>
                                {item.category} {item.isGym && item.exercises.length > 0 ? `• ${item.exercises.length} Gerakan • ${item.totalSets} Set` : ''}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: '#4ade80',
                                background: 'rgba(74, 222, 128, 0.14)',
                                border: '1px solid rgba(74, 222, 128, 0.32)',
                                padding: '4px 9px',
                                borderRadius: '8px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              +{item.xp} XP
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Hapus riwayat quest "${item.title}" (${item.dateLabel})?`)) {
                                  handleDeleteHistoryItem(item.questId, item.dateLabel, item.id.split('-').slice(1).join('-'))
                                }
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '7px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.28)',
                                color: '#ff85a2',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}
                              title="Hapus dari History Quest"
                              aria-label="Hapus dari History Quest"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Breakdown Gerakan Latihan jika Gym */}
                        {item.isGym && item.exercises.length > 0 && (
                          <div
                            style={{
                              display: 'grid',
                              gap: '6px',
                              padding: '10px',
                              borderRadius: '11px',
                              background: 'rgba(10, 8, 19, 0.7)',
                              border: '1px solid rgba(139, 92, 246, 0.14)',
                            }}
                          >
                            {item.exercises.map((ex, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '11px',
                                }}
                              >
                                <span style={{ color: '#e2d9f3', fontWeight: 600 }}>{ex.name}</span>
                                <span style={{ color: '#b9a6dc', fontWeight: 700 }}>
                                  {ex.setsCount} Set • {ex.weight} kg × {ex.reps} reps
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {item.isGym && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsHistoryPageOpen(false)
                              setActiveWorkoutQuest({ type: 'personal', id: item.questId })
                            }}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '9px',
                              background: 'rgba(124, 58, 237, 0.14)',
                              border: '1px solid rgba(168, 85, 247, 0.3)',
                              color: '#d8b4fe',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                            }}
                          >
                            <span>Buka Detail Workout</span>
                            <ChevronRight size={13} />
                          </button>
                        )}
                      </div>
                    ))
                  })()}
                </div>
              </div>
            ) : (
              /* ================================================================
                 BERANDA UTAMA: UNIFIED HERO BENTO CARD + JADWAL MINGGU INI + HISTORY QUEST
                 (Dirancang umum untuk semua jenis Quest: Belajar, Produktivitas, Kesehatan, Gym, dll.)
                 ================================================================ */
              <>
                <section className="hero-card-unified">
                  <div className="hero-top-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="hunter-status-pill">
                        <span className="hunter-status-dot" />
                        CURRENT LEVEL
                      </div>
                      <h1 className="hero-level-number">Level {currentLevel}</h1>

                      <div className="hero-progress-inline">
                        <div className="hero-progress-meta">
                          <span>
                            <Zap
                              size={11}
                              fill="currentColor"
                              style={{ display: 'inline', color: '#c084fc', marginRight: '4px', verticalAlign: '-1px' }}
                            />
                            {effectiveXp.toLocaleString('id-ID')} / {nextLevelXp.toLocaleString('id-ID')} XP
                          </span>
                          <span style={{ color: '#e9d5ff', fontWeight: 800 }}>{levelProgress}%</span>
                        </div>
                        <div className="hero-xp-track">
                          <span
                            className="hero-xp-fill"
                            style={{ width: `${Math.max(levelProgress > 0 ? levelProgress : (effectiveXp > 0 ? 5 : 0), levelProgress)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SHADOW MONARCH WINGED HEXAGONAL SVG RANK EMBLEM */}
                    <div
                      className="rank-hex-emblem"
                      onClick={() => setActiveTab('rank')}
                      title="Lihat Peringkat Hunter"
                    >
                      <div className="rank-hex-float">
                        <svg
                          className="rank-hex-svg"
                          viewBox="0 0 106 102"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <defs>
                            <linearGradient id="hexOuterGrad" x1="15" y1="6" x2="91" y2="96" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="#e9d5ff" />
                              <stop offset="45%" stopColor="#9333ea" />
                              <stop offset="100%" stopColor="#4c1d95" />
                            </linearGradient>
                            <radialGradient id="hexCoreGrad" cx="50%" cy="28%" r="72%">
                              <stop offset="0%" stopColor="#581c87" stopOpacity="0.88" />
                              <stop offset="65%" stopColor="#170d2b" stopOpacity="0.97" />
                              <stop offset="100%" stopColor="#090514" stopOpacity="0.99" />
                            </radialGradient>
                            <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.85" />
                              <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.2" />
                            </linearGradient>
                          </defs>

                          {/* 1. Cincin Orbit Luar Berputar Halus */}
                          <g className="rank-svg-orbit-cw">
                            <circle
                              cx="53"
                              cy="51"
                              r="47"
                              stroke="rgba(168, 85, 247, 0.25)"
                              strokeWidth="1"
                              strokeDasharray="6 6"
                            />
                            <circle cx="53" cy="4" r="2.2" fill="#e9d5ff" />
                            <circle cx="53" cy="98" r="2.2" fill="#a855f7" />
                          </g>

                          {/* 2. Busur Energi Dalam Berputar Berlawanan */}
                          <g className="rank-svg-orbit-ccw">
                            <circle
                              cx="53"
                              cy="51"
                              r="43"
                              stroke="rgba(216, 180, 254, 0.35)"
                              strokeWidth="1.2"
                              strokeDasharray="24 66"
                              strokeLinecap="round"
                            />
                          </g>

                          {/* 3. Sayap Geometris Kiri & Kanan (Shadow Blades) */}
                          <g className="rank-svg-wings">
                            {/* Sayap Kiri */}
                            <path
                              d="M15 34 L3 25 L8 42 L15 46 Z"
                              fill="url(#wingGrad)"
                            />
                            <path
                              d="M15 50 L1 47 L7 60 L15 62 Z"
                              fill="url(#wingGrad)"
                              opacity="0.75"
                            />
                            {/* Sayap Kanan */}
                            <path
                              d="M91 34 L103 25 L98 42 L91 46 Z"
                              fill="url(#wingGrad)"
                            />
                            <path
                              d="M91 50 L105 47 L99 60 L91 62 Z"
                              fill="url(#wingGrad)"
                              opacity="0.75"
                            />
                          </g>

                          {/* 4. Bingkai Perisai Heksagonal Utama */}
                          <polygon
                            points="53,8 90,28 90,74 53,94 16,74 16,28"
                            fill="url(#hexCoreGrad)"
                            stroke="url(#hexOuterGrad)"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />

                          {/* 5. Aliran Cahaya Laser Mengelilingi Garis Heksagon (Halo + Inti Tanpa CPU Filter) */}
                          <polygon
                            className="rank-svg-laser-glow"
                            pathLength={100}
                            points="53,8 90,28 90,74 53,94 16,74 16,28"
                            fill="none"
                            stroke="rgba(216, 180, 254, 0.42)"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <polygon
                            className="rank-svg-laser-border"
                            pathLength={100}
                            points="53,8 90,28 90,74 53,94 16,74 16,28"
                            fill="none"
                            stroke="#f3e8ff"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* 6. Garis Dalam Heksagon Presisi */}
                          <polygon
                            points="53,13 85,31 85,71 53,89 21,71 21,31"
                            fill="none"
                            stroke="rgba(192, 132, 252, 0.28)"
                            strokeWidth="1"
                          />

                          {/* 7. Ornamen Berlian Puncak & Bawah */}
                          <polygon points="53,4 57,9 53,14 49,9" fill="#e9d5ff" />
                          <polygon points="53,88 56,93 53,98 50,93" fill="#c084fc" />
                        </svg>

                        {/* Teks Rank di Tengah Perisai Heksagon */}
                        <div className="rank-hex-content">
                          <span className="rank-hex-label">RANK</span>
                          <strong className="rank-hex-letter">{currentRank}</strong>
                          <span className="rank-hex-sub">HUNTER</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Integrated 3-Column Bento Stats Dock */}
                  <div className="hero-stats-dock">
                    <div className="hero-dock-item">
                      <div
                        className="hero-dock-icon"
                        style={{
                          background: 'rgba(255, 157, 97, 0.14)',
                          border: '1px solid rgba(255, 157, 97, 0.3)',
                          color: '#ff9d61',
                        }}
                      >
                        <Flame size={14} />
                      </div>
                      <div>
                        <strong>{currentUser.streak} Hari</strong>
                        <span>Streak</span>
                      </div>
                    </div>

                    <div
                      className="hero-dock-item clickable"
                      onClick={() => setIsHistoryPageOpen(true)}
                      title="Buka History Quest"
                    >
                      <div
                        className="hero-dock-icon"
                        style={{
                          background: 'rgba(74, 222, 128, 0.14)',
                          border: '1px solid rgba(74, 222, 128, 0.3)',
                          color: '#4ade80',
                        }}
                      >
                        <Activity size={14} />
                      </div>
                      <div>
                        <strong>{userHistoryItems.length} Quest</strong>
                        <span>History</span>
                      </div>
                    </div>

                    <div
                      className="hero-dock-item clickable"
                      onClick={() => setActiveTab('clan')}
                      title="Buka Komunitas Clan"
                    >
                      <div
                        className="hero-dock-icon"
                        style={{
                          background: 'rgba(168, 85, 247, 0.16)',
                          border: '1px solid rgba(168, 85, 247, 0.34)',
                          color: '#c084fc',
                        }}
                      >
                        <Shield size={14} />
                      </div>
                      <div>
                        <strong>{userJoinedClanIds.length} Clan</strong>
                        <span>Komunitas</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* SECTION 1: JADWAL & KONSISTENSI MINGGU INI (INTERACTIVE 7-DAY STRIP UNTUK SEMUA QUEST) */}
                <section className="weekly-strip-card" style={{ marginBottom: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <div>
                      <span className="eyebrow">WEEKLY SCHEDULE</span>
                      <h2 style={{ fontSize: '15.5px', fontWeight: 800, margin: '2px 0 0', color: '#f5f2ff' }}>
                        Jadwal Minggu Ini
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="show-more-btn"
                      onClick={() => setIsConsistencyModalOpen(true)}
                      title="Lihat Konsistensi Tahunan"
                    >
                      <BarChart2 size={12} />
                      <span>Heatmap</span>
                    </button>
                  </div>

                  {/* 7-Day Interactive Strip (Sen - Min) */}
                  <div className="week-days-grid" style={{ marginBottom: '12px' }}>
                    {currentWeekDays.map((day) => {
                      const isSelected = day.code === activeScheduleDayCode
                      const hasScheduled = day.scheduledTasks.length > 0
                      return (
                        <button
                          key={day.code}
                          type="button"
                          onClick={() => setSelectedWeekDay(day.code)}
                          className={`week-day-pill ${isSelected ? 'selected' : ''} ${day.isToday ? 'today-ring' : ''}`}
                        >
                          <span className="week-day-name">{day.shortLabel}</span>
                          <span className="week-day-num">{day.dateNum}</span>
                          <span
                            className={`week-day-dot ${
                              day.isDone ? 'done' : hasScheduled ? 'scheduled' : ''
                            }`}
                          />
                        </button>
                      )
                    })}
                  </div>

                  {/* Preview Quest pada Hari yang Dipilih */}
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '13px',
                      background: 'rgba(10, 8, 19, 0.72)',
                      border: '1px solid rgba(139, 92, 246, 0.18)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: activeScheduleDayObj.scheduledTasks.length > 0 ? '8px' : '0',
                      }}
                    >
                      <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#c4b5fd' }}>
                        {activeScheduleDayObj.fullName}
                        {activeScheduleDayObj.isToday ? ' (Hari Ini)' : ''}
                      </span>
                      <span style={{ fontSize: '10px', color: '#8a80a0' }}>
                        {activeScheduleDayObj.scheduledTasks.length > 0
                          ? `${activeScheduleDayObj.scheduledTasks.length} Quest Terjadwal`
                          : 'Belum Ada Jadwal'}
                      </span>
                    </div>

                    {activeScheduleDayObj.scheduledTasks.length > 0 && (
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {activeScheduleDayObj.scheduledTasks.slice(0, 4).map((task) => {
                          const isGym = task.category.toLowerCase() === 'gym'
                          const isSkipped = Boolean(task.skipped || task.skippedDates?.includes(new Date().toISOString().slice(0, 10)))
                          return (
                            <div
                              key={task.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px',
                                padding: '7px 9px',
                                borderRadius: '10px',
                                background: isSkipped && !task.done ? 'rgba(45, 18, 28, 0.85)' : 'rgba(24, 18, 42, 0.85)',
                                border: isSkipped && !task.done ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(168, 85, 247, 0.22)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                <span
                                  className={`task-checkbox ${task.done ? 'checked' : ''} ${isSkipped ? 'skipped' : ''}`}
                                  onClick={() => handleTogglePersonal(task.id)}
                                  role="button"
                                  tabIndex={0}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '6px',
                                    border: task.done
                                      ? '1px solid #4ade80'
                                      : isSkipped
                                      ? '1px solid #ef4444'
                                      : '1px solid rgba(168, 85, 247, 0.45)',
                                    background: task.done
                                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 101, 52, 0.5))'
                                      : isSkipped
                                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(153, 27, 27, 0.4))'
                                      : 'rgba(24, 18, 42, 0.7)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    color: task.done ? '#4ade80' : isSkipped ? '#f87171' : 'transparent',
                                    boxShadow: task.done ? '0 0 10px rgba(34, 197, 94, 0.3)' : 'none',
                                    transition: 'all 0.15s ease',
                                  }}
                                  title={task.done ? 'Batalkan selesai' : 'Centang selesai (+XP)'}
                                  aria-label={task.done ? 'Batalkan selesai' : 'Centang selesai (+XP)'}
                                >
                                  {task.done ? (
                                    <Check size={13} strokeWidth={3} />
                                  ) : isSkipped ? (
                                    <FastForward size={11} color="#f87171" strokeWidth={2.5} />
                                  ) : null}
                                </span>
                                <span style={{ fontSize: '15px' }}>{task.icon}</span>
                                <div style={{ minWidth: 0 }}>
                                  <strong
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      fontSize: '12px',
                                      color: '#f3f1ff',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                                    {isSkipped && !task.done && (
                                      <span
                                        style={{
                                          fontSize: '8.5px',
                                          color: '#ffffff',
                                          background: '#ef4444',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          fontWeight: 800,
                                          flexShrink: 0,
                                        }}
                                      >
                                        DILEWATI
                                      </span>
                                    )}
                                  </strong>
                                  <span style={{ fontSize: '9.5px', color: isSkipped && !task.done ? '#fca5a5' : '#8e84a2' }}>
                                    {task.category}
                                    {isSkipped && !task.done ? ' • (Dilewati)' : ` • +${task.xp} XP`}
                                  </span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                {isGym && !task.done && !isSkipped && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWorkoutSubPage('overview')
                                      setActiveWorkoutQuest({ type: 'personal', id: task.id })
                                    }}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '7px',
                                      background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                                      border: '1px solid rgba(168, 85, 247, 0.5)',
                                      color: '#ffffff',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                    title="Mulai Workout"
                                  >
                                    <Play size={9} fill="currentColor" />
                                    <span>Start</span>
                                  </button>
                                )}

                                {!task.done && (
                                  <button
                                    type="button"
                                    onClick={() => handleSkipPersonal(task.id)}
                                    style={{
                                      padding: '4px 7px',
                                      borderRadius: '7px',
                                      background: isSkipped ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                      border: isSkipped ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.15)',
                                      color: isSkipped ? '#fca5a5' : '#94a3b8',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                    title={isSkipped ? 'Batal lewati quest' : 'Lewati quest (0 XP)'}
                                  >
                                    <FastForward size={9} />
                                    <span>{isSkipped ? 'Dilewati' : 'Skip'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </section>

                {/* 3. HISTORY QUEST DENGAN SHOW MORE */}
                <section className="section-block">
                  <div className="section-title">
                    <div>
                      <span className="eyebrow">RECENT ACTIVITY</span>
                      <h2>History Quest</h2>
                    </div>
                    <button
                      type="button"
                      className="show-more-btn"
                      onClick={() => setIsHistoryPageOpen(true)}
                    >
                      <span>Show More</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  <div className="task-list">
                    {userHistoryItems.length === 0 ? (
                      <div
                        style={{
                          padding: '22px 16px',
                          borderRadius: '16px',
                          background: '#0e0c16',
                          border: '1px dashed #28213a',
                          textAlign: 'center',
                          fontSize: '11.5px',
                          color: '#827896',
                        }}
                      >
                        <p style={{ margin: '0 0 10px' }}>Belum ada riwayat quest yang tercatat.</p>
                        <button
                          type="button"
                          className="show-more-btn"
                          onClick={() => setActiveTab('calendar')}
                        >
                          <span>Mulai dari My Quest</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    ) : (
                      userHistoryItems.slice(0, 3).map((item) => {
                        const firstEx = item.exercises[0]
                        const summaryText =
                          item.isGym && firstEx
                            ? `${item.category} • ${firstEx.name} (${firstEx.setsCount} Set)`
                            : item.category

                        return (
                          <div
                            key={item.id}
                            className="history-quest-card"
                            onClick={() => setIsHistoryPageOpen(true)}
                          >
                            <div className="history-icon-box">
                              {item.isGym ? <Dumbbell size={18} /> : item.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <strong
                                  style={{
                                    fontSize: '13px',
                                    color: '#f5f2ff',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {item.title}
                                </strong>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    padding: '1px 6px',
                                    borderRadius: '99px',
                                    background: 'rgba(168, 85, 247, 0.14)',
                                    border: '1px solid rgba(168, 85, 247, 0.28)',
                                    color: '#d8b4fe',
                                    fontWeight: 600,
                                    flexShrink: 0,
                                  }}
                                >
                                  {item.dateLabel}
                                </span>
                              </div>
                              <small
                                style={{
                                  display: 'block',
                                  marginTop: '3px',
                                  fontSize: '10.5px',
                                  color: '#8c82a3',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {summaryText}
                              </small>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <span
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 800,
                                  color: '#4ade80',
                                  background: 'rgba(74, 222, 128, 0.12)',
                                  border: '1px solid rgba(74, 222, 128, 0.28)',
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                }}
                              >
                                +{item.xp} XP
                              </span>
                              <ChevronRight size={15} color="#7c738f" />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        {/* ================================================================
            TAB 2: MY QUEST (Personal Checklist + Full-Page Referensi Program jika dibuka)
           ================================================================ */}
        {activeTab === 'calendar' && (
          <>
            {isQuestProgramPageOpen ? (
              /* ============================================================
                 HALAMAN PENUH: REFERENSI PROGRAM GYM (2X–6X SEMINGGU) DARI MY QUEST
                 ============================================================ */
              (() => {
                const activeProgram =
                  GYM_PROGRAM_TEMPLATES.find((p) => p.id === selectedProgramId) || GYM_PROGRAM_TEMPLATES[0]

                return (
                  <div style={{ animation: 'heroCardAppear 0.25s ease' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px', minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => setIsQuestProgramPageOpen(false)}
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
                          title="Kembali ke My Quest"
                        >
                          <ArrowLeft size={16} />
                        </button>
                        <div style={{ minWidth: 0 }}>
                          <div className="eyebrow" style={{ color: '#9d76f3', fontSize: '9px' }}>
                            QUEST WORKOUT TEMPLATES
                          </div>
                          <h2
                            style={{
                              fontSize: '18px',
                              fontWeight: 800,
                              color: '#ffffff',
                              margin: '2px 0 0',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            Referensi Program Latihan
                          </h2>
                        </div>
                      </div>
                    </div>

                    {/* PILIHAN FREKUENSI: 2x, 3x, 4x, 5x, 6x Seminggu (FLEX WRAP — TANPA SCROLLBAR) */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      {GYM_PROGRAM_TEMPLATES.map((prog) => {
                        const isSel = prog.id === activeProgram.id
                        return (
                          <button
                            key={prog.id}
                            type="button"
                            onClick={() => setSelectedProgramId(prog.id)}
                            style={{
                              padding: '6px 11px',
                              borderRadius: '99px',
                              fontSize: '10.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              background: isSel
                                ? 'linear-gradient(135deg, #7c3aed, #9333ea)'
                                : '#141024',
                              border: isSel ? '1px solid #d8b4fe' : '1px solid #2b2144',
                              color: isSel ? '#ffffff' : '#b3a7cc',
                            }}
                          >
                            {prog.frequencyLabel}
                          </button>
                        )
                      })}
                    </div>

                    {/* BANNER INFO PROGRAM */}
                    <div
                      style={{
                        padding: '13px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(44, 24, 92, 0.55), rgba(18, 13, 34, 0.9))',
                        border: '1px solid rgba(168, 85, 247, 0.38)',
                        marginBottom: '14px',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '14px', color: '#ffffff', fontWeight: 800 }}>
                        {activeProgram.title}
                      </strong>
                      <span style={{ display: 'block', fontSize: '11px', color: '#d8b4fe', marginTop: '2px' }}>
                        {activeProgram.subtitle}
                      </span>
                      {activeProgram.note && (
                        <p style={{ margin: '6px 0 0', fontSize: '10.5px', color: '#a89ec0', lineHeight: 1.4 }}>
                          📌 {activeProgram.note}
                        </p>
                      )}
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '6px 9px',
                          borderRadius: '8px',
                          background: 'rgba(11, 8, 22, 0.65)',
                          border: '1px solid rgba(168, 85, 247, 0.22)',
                          fontSize: '10px',
                          color: '#c4b5fd',
                        }}
                      >
                        ✨ <strong>Fleksibel &amp; Tidak Permanen:</strong> Setelah membuat quest dari referensi ini, kamu bebas mengubah jadwal hari dan mengganti gerakan di halaman Library.
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyFullProgramSchedule(activeProgram)}
                        className="btn-primary"
                        style={{
                          width: '100%',
                          marginTop: '10px',
                          padding: '9px 12px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        <Sparkles size={13} />
                        <span>Terapkan Seluruh {activeProgram.sessions.length} Sesi ke Jadwal Quest</span>
                      </button>
                    </div>

                    {/* DAFTAR SESI DALAM PROGRAM */}
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {activeProgram.sessions.map((session) => (
                        <div
                          key={session.id}
                          style={{
                            padding: '12px',
                            borderRadius: '14px',
                            background: '#110e1d',
                            border: '1px solid #2b2242',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              marginBottom: '8px',
                            }}
                          >
                            <div>
                              <strong style={{ display: 'block', fontSize: '13px', color: '#f3f1ff', fontWeight: 800 }}>
                                {session.title}
                              </strong>
                              <span style={{ fontSize: '10px', color: '#9388ac' }}>
                                Rekomendasi: {session.dayLabel} • {session.exercises.length} Gerakan
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCreateQuestFromSessionTemplate(session)}
                              style={{
                                padding: '6px 11px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
                                border: '1px solid #c084fc',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              + Buat Quest Ini
                            </button>
                          </div>

                          <div style={{ display: 'grid', gap: '4px' }}>
                            {session.exercises.map((ex, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '5px 8px',
                                  borderRadius: '7px',
                                  background: '#0a0813',
                                  border: '1px solid #1e182e',
                                  fontSize: '11px',
                                }}
                              >
                                <span style={{ color: '#e2d9f3', fontWeight: 600 }}>
                                  {idx + 1}. {ex.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    color: '#c4b5fd',
                                    fontWeight: 700,
                                    background: 'rgba(168, 85, 247, 0.12)',
                                    padding: '1px 6px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  {ex.note || `${ex.sets} × ${ex.reps}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()
            ) : (
              <>
                <section className="quest-heading">
                  <div>
                    <p className="eyebrow">MY QUEST • {currentUser.username.toUpperCase()}</p>
                    <h1>Daily checklist</h1>
                    <p className="quest-date">
                      {new Date().toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="quest-count">
                    <span>DONE</span>
                    <strong>
                      {completedTodayPersonalCount}/{todayPersonalTasks.length}
                    </strong>
                  </div>
                </section>

                <section className="section-block quest-list-section">
                  {/* TAB SWITCHER: TODAY & UPCOMING */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px',
                      padding: '4px',
                      borderRadius: '11px',
                      background: '#0e0b18',
                      border: '1px solid #261f3d',
                      marginBottom: '12px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setQuestScheduleTab('today')}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: questScheduleTab === 'today' ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid transparent',
                        background:
                          questScheduleTab === 'today'
                            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(88, 28, 135, 0.45))'
                            : 'transparent',
                        color: questScheduleTab === 'today' ? '#f3f1ff' : '#827896',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>Today</span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          background: questScheduleTab === 'today' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                          color: questScheduleTab === 'today' ? '#e9d5ff' : '#827896',
                          fontWeight: 800,
                        }}
                      >
                        {todayPersonalTasks.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestScheduleTab('upcoming')}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: questScheduleTab === 'upcoming' ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid transparent',
                        background:
                          questScheduleTab === 'upcoming'
                            ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.35), rgba(88, 28, 135, 0.45))'
                            : 'transparent',
                        color: questScheduleTab === 'upcoming' ? '#f3f1ff' : '#827896',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>Upcoming</span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          background: questScheduleTab === 'upcoming' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(255, 255, 255, 0.06)',
                          color: questScheduleTab === 'upcoming' ? '#e9d5ff' : '#827896',
                          fontWeight: 800,
                        }}
                      >
                        {upcomingPersonalTasks.length}
                      </span>
                    </button>
                  </div>

                  {/* Banner Reward List Quest Personal (Khusus Tab Today) */}
                  {questScheduleTab === 'today' && todayPersonalTasks.length > 0 && (() => {
                    const totalPersonalListXp = todayPersonalTasks.reduce((sum, t) => sum + t.xp, 0)
                    const isAllDone = todayPersonalTasks.length > 0 && completedTodayPersonalCount === todayPersonalTasks.length

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
                              ? `Seluruh (${completedTodayPersonalCount}/${todayPersonalTasks.length}) quest selesai • +${totalPersonalListXp} XP aktif`
                              : `Dapatkan XP untuk setiap quest yang kamu selesaikan (${completedTodayPersonalCount}/${todayPersonalTasks.length} selesai)`}
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
                    {(questScheduleTab === 'today' ? todayPersonalTasks : upcomingPersonalTasks).length === 0 ? (
                      <div
                        style={{
                          padding: '18px 14px',
                          borderRadius: '12px',
                          background: '#0e0c16',
                          border: '1px dashed #28213a',
                          textAlign: 'center',
                          fontSize: '11.5px',
                          color: '#7c738f',
                        }}
                      >
                        {questScheduleTab === 'today'
                          ? `Tidak ada quest untuk hari ini (${todayDayCode}). Cek tab Upcoming atau tambah quest baru.`
                          : `Tidak ada quest di jadwal Upcoming. Quest yang dipilih untuk hari selain hari ini (${todayDayCode}) akan tampil di sini.`}
                      </div>
                    ) : (
                      (questScheduleTab === 'today' ? todayPersonalTasks : upcomingPersonalTasks).map((task) => {
                        const globalIdx = userPersonalTasks.findIndex((t) => t.id === task.id)
                        const isSkipped = Boolean(task.skipped || task.skippedDates?.includes(new Date().toISOString().slice(0, 10)))
                        return (
                          <QuestCard
                            key={task.id}
                            questId={task.id}
                            colorIndex={globalIdx >= 0 ? globalIdx : 0}
                            title={task.title}
                            meta={task.category}
                            icon={task.icon}
                            done={task.done}
                            completedDates={task.completedDates}
                            schedule={task.schedule}
                            isSkipped={isSkipped}
                            canManage={true}
                            isGym={task.category.toLowerCase() === 'gym'}
                            xp={task.xp}
                            onOpenWorkout={() => {
                              setWorkoutSubPage('overview')
                              setActiveWorkoutQuest({ type: 'personal', id: task.id })
                            }}
                            onToggle={() => handleTogglePersonal(task.id)}
                            onSkip={() => handleSkipPersonal(task.id)}
                            onEdit={() => openEditPersonalModal(task)}
                            onDelete={() => handleDeletePersonal(task.id)}
                          />
                        )
                      })
                    )}
                  </div>
                  <button className="add-task" onClick={openAddPersonalModal}>
                    <Plus size={16} /> Tambah quest baru
                  </button>
                </section>
              </>
            )}
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
                          const isCqDone = cq.completedByUserIds.includes(currentUser.id)
                          const { cells, pct } = getHabitYearGrid(cq.id, 0, isCqDone)
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
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') {
                            setQuestXp('')
                          } else {
                            const parsed = parseInt(val, 10)
                            setQuestXp(isNaN(parsed) ? '' : parsed)
                          }
                        }}
                        onBlur={() => {
                          if (questXp === '' || Number(questXp) < 5) {
                            setQuestXp(findCategory(questCategory).xp || 50)
                          }
                        }}
                        min={5}
                        max={1000}
                        placeholder="50"
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
                                  : `Dapatkan XP untuk setiap quest clan yang kamu selesaikan (${completedByMeCount}/${selectedClanQuests.length} selesai)`}
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
                          selectedClanQuests.map((cq, cIdx) => {
                            const isDoneByMe = cq.completedByUserIds.includes(currentUser.id)
                            const isSkipped = (cq.skippedByUserIds || []).includes(currentUser.id)
                            return (
                              <QuestCard
                                key={cq.id}
                                questId={cq.id}
                                colorIndex={cIdx}
                                title={cq.title}
                                meta={cq.category}
                                icon={cq.icon}
                                done={isDoneByMe}
                                isEvent={cq.questType === 'event'}
                                schedule={cq.schedule}
                                isSkipped={isSkipped}
                                canManage={isLeaderOfSelectedClan}
                                completedCount={cq.completedByUserIds.length}
                                totalMembers={selectedClanMembers.length}
                                isGym={cq.category.toLowerCase() === 'gym'}
                                xp={cq.xp}
                                onOpenWorkout={() => {
                                  setActiveWorkoutQuest({ type: 'clan', id: cq.id })
                                }}
                                onToggle={() => handleToggleClanQuest(cq)}
                                onSkip={() => handleSkipClanQuest(cq)}
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
                    .map((u) =>
                      u.id === currentUser.id || (currentUser.username && u.username === currentUser.username)
                        ? { ...u, xp: effectiveXp }
                        : u
                    )
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
              <span>{effectiveXp.toLocaleString('id-ID')} total XP</span>
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
            onClick={() => {
              setIsHistoryPageOpen(false)
              setActiveTab(key as typeof activeTab)
            }}
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
              {/* PILIHAN REFERENSI DEFAULT JIKA KATEGORI ADALAH GYM */}
              {questCategory.toLowerCase() === 'gym' && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(124, 58, 237, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label className="modal-label" style={{ marginBottom: 0, color: '#e9d5ff' }}>
                      📋 REFERENSI SESI DEFAULT (OPSIONAL)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPersonalModalOpen(false)
                        setIsQuestProgramPageOpen(true)
                        setActiveTab('calendar')
                      }}
                      style={{
                        background: 'transparent',
                        border: 0,
                        color: '#c084fc',
                        fontSize: '10px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Buka Halaman Referensi (2x–6x) ›
                    </button>
                  </div>
                  <select
                    className="modal-input"
                    value={selectedTemplateSessionIdForQuest}
                    onChange={(e) => {
                      const val = e.target.value
                      setSelectedTemplateSessionIdForQuest(val)
                      if (val) {
                        const allSess = GYM_PROGRAM_TEMPLATES.flatMap((p) => p.sessions)
                        const found = allSess.find((s) => s.id === val)
                        if (found) {
                          setQuestTitle(found.questTitle)
                          if (found.recommendedDays.length > 0) {
                            setQuestDays(found.recommendedDays)
                          }
                        }
                      }
                    }}
                    style={{
                      marginBottom: '6px',
                      background: '#0a0814',
                      border: '1px solid #3d2a63',
                      color: '#f3f1ff',
                      fontSize: '12px',
                      height: '38px',
                    }}
                  >
                    <option value="">— Kosong / Buat Gerakan Sendiri Nanti —</option>
                    {GYM_PROGRAM_TEMPLATES.map((prog) => (
                      <optgroup key={prog.id} label={prog.title}>
                        {prog.sessions.map((sess) => (
                          <option key={sess.id} value={sess.id}>
                            {sess.title} ({sess.exercises.length} gerakan)
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <span style={{ display: 'block', fontSize: '10px', color: '#9a8fb2', lineHeight: 1.35 }}>
                    💡 Semua gerakan dari referensi ini <strong>tidak permanen</strong> — setelah disimpan, kamu bebas mengganti gerakan dari halaman Library, menambah, atau menghapusnya.
                  </span>
                </div>
              )}

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
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '') {
                    setQuestXp('')
                  } else {
                    const parsed = parseInt(val, 10)
                    setQuestXp(isNaN(parsed) ? '' : parsed)
                  }
                }}
                onBlur={() => {
                  if (questXp === '' || Number(questXp) < 5) {
                    setQuestXp(findCategory(questCategory).xp || 50)
                  }
                }}
                min={5}
                max={500}
                placeholder="50"
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
                const { cells, pct } = getHabitYearGrid(task.id, 0, task.done, task.completedDates)
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
                    Rank {currentRank} • Level {currentLevel} • {effectiveXp.toLocaleString('id-ID')} XP
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