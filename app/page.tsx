'use client'

import { useState, useEffect } from 'react'
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

interface PersonalTask {
  id: string
  userId: string
  title: string
  category: string
  xp: number
  icon: string
  done: boolean
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
}

const CATEGORIES = [
  { name: 'Disiplin', xp: 20, icon: '☼' },
  { name: 'Kekuatan', xp: 40, icon: 'ϟ' },
  { name: 'Pengetahuan', xp: 25, icon: '▤' },
  { name: 'Vitalitas', xp: 15, icon: '◒' },
]

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
  { id: 'pt-1', userId: 'u-jinwoo', title: 'Bangun sebelum 06:00', category: 'Disiplin', xp: 20, icon: '☼', done: true },
  { id: 'pt-2', userId: 'u-jinwoo', title: 'Workout 30 menit', category: 'Kekuatan', xp: 40, icon: 'ϟ', done: true },
  { id: 'pt-3', userId: 'u-jinwoo', title: 'Baca 10 halaman', category: 'Pengetahuan', xp: 25, icon: '▤', done: false },
  { id: 'pt-4', userId: 'u-jinwoo', title: 'Minum 2L air putih', category: 'Vitalitas', xp: 15, icon: '◒', done: false },
  // Milik Cha Hae-In (Berbeda dengan Jin-Woo)
  { id: 'pt-5', userId: 'u-cha', title: 'Latihan Swordsmanship 1 Jam', category: 'Kekuatan', xp: 50, icon: 'ϟ', done: true },
  { id: 'pt-6', userId: 'u-cha', title: 'Meditasi Fokus Mana', category: 'Disiplin', xp: 30, icon: '☼', done: false },
  // Milik Igris
  { id: 'pt-7', userId: 'u-igris', title: 'Jaga Gerbang Dungeon Pagi', category: 'Disiplin', xp: 35, icon: '☼', done: true },
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
  onToggle,
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
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className={`task-row ${done ? 'completed' : ''}`}
      style={{ opacity: disabled ? 0.55 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span
        className="check-box"
        onClick={() => !disabled && onToggle()}
        role="button"
        aria-label="Toggle status"
      >
        {done && <Check size={15} strokeWidth={3} />}
      </span>
      <span className="task-symbol" onClick={() => !disabled && onToggle()}>
        {icon}
      </span>
      <span className="task-copy" onClick={() => !disabled && onToggle()}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {title}
          {isEvent && <span className="clan-badge event">EVENT</span>}
        </strong>
        <small>{meta}</small>
      </span>
      {canManage && onEdit && onDelete && (
        <div className="task-actions-inline">
          <button
            type="button"
            className="task-btn-action"
            aria-label={`Edit ${title}`}
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="task-btn-action delete"
            aria-label={`Hapus ${title}`}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      <span className="task-xp" onClick={() => !disabled && onToggle()}>
        {badgeText || (done ? 'DONE' : 'XP')}
      </span>
    </div>
  )
}

// ============================================================================
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

  // Clan UI Navigation State
  const [selectedClanId, setSelectedClanId] = useState<string>('clan-ahjin')
  const [clanViewTab, setClanViewTab] = useState<'quests' | 'leaderboard'>('quests')
  const [rankTab, setRankTab] = useState<'hunters' | 'clans'>('hunters')
  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Modals State
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false)
  const [editingPersonalTask, setEditingPersonalTask] = useState<PersonalTask | null>(null)

  const [isClanQuestModalOpen, setIsClanQuestModalOpen] = useState(false)
  const [editingClanQuest, setEditingClanQuest] = useState<ClanQuest | null>(null)

  const [isCreateClanModalOpen, setIsCreateClanModalOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  // Form states for Personal / Clan Quest Modal
  const [questTitle, setQuestTitle] = useState('')
  const [questCategory, setQuestCategory] = useState(CATEGORIES[0].name)
  const [questXp, setQuestXp] = useState(CATEGORIES[0].xp)
  const [questType, setQuestType] = useState<'daily' | 'event'>('daily')
  const [questDeadline, setQuestDeadline] = useState('')

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
        if (parsed.users?.length) setUsers(parsed.users)
        if (parsed.currentUserId) setCurrentUserId(parsed.currentUserId)
        if (parsed.personalTasks) setPersonalTasks(parsed.personalTasks)
        if (parsed.clans?.length) setClans(parsed.clans)
        if (parsed.clanMembers) setClanMembers(parsed.clanMembers)
        if (parsed.clanQuests) setClanQuests(parsed.clanQuests)
      } catch (e) {
        console.error(e)
      }
    }

    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
          const supaUser = data.session.user
          const uname = supaUser.user_metadata?.username || supaUser.email?.split('@')[0] || 'Hunter'
          setUsers((prev) => {
            if (prev.some((u) => u.id === supaUser.id)) return prev
            return [...prev, { id: supaUser.id, username: uname, email: supaUser.email || '', xp: 100, streak: 1 }]
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

  const currentLevel = getHunterLevel(currentUser.xp)
  const currentRank = getHunterRank(currentUser.xp)
  const nextLevelXp = currentLevel * 100
  const levelProgress = Math.min(100, Math.round(((currentUser.xp % 100) / 100) * 100))

  // ============================================================================
  // PERSONAL QUEST CRUD HANDLERS
  // ============================================================================

  const handleTogglePersonal = (taskId: string) => {
    const target = personalTasks.find((t) => t.id === taskId && t.userId === currentUser.id)
    if (!target) return
    const nextDone = !target.done
    const xpDelta = nextDone ? target.xp : -target.xp

    setPersonalTasks((curr) =>
      curr.map((t) => (t.id === taskId ? { ...t, done: nextDone } : t))
    )
    setUsers((curr) =>
      curr.map((u) =>
        u.id === currentUser.id ? { ...u, xp: Math.max(0, u.xp + xpDelta) } : u
      )
    )
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
    setIsPersonalModalOpen(true)
  }

  const openEditPersonalModal = (task: PersonalTask) => {
    setEditingPersonalTask(task)
    setQuestTitle(task.title)
    setQuestCategory(task.category)
    setQuestXp(task.xp)
    setIsPersonalModalOpen(true)
  }

  const handleSavePersonalQuest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!questTitle.trim()) return
    const catObj = CATEGORIES.find((c) => c.name === questCategory) || CATEGORIES[0]

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
      }
      setPersonalTasks((curr) => [...curr, newTask])
      showToast('Quest pribadi baru ditambahkan!')
    }
    setIsPersonalModalOpen(false)
  }

  // ============================================================================
  // CLAN & COMMUNITY HANDLERS
  // ============================================================================

  const selectedClan = clans.find((c) => c.id === selectedClanId) || clans[0]
  const isMemberOfSelectedClan = userJoinedClanIds.includes(selectedClan?.id)
  const isLeaderOfSelectedClan = selectedClan?.leaderId === currentUser.id
  const selectedClanQuests = clanQuests.filter((cq) => cq.clanId === selectedClan?.id)
  const selectedClanMembers = clanMembers
    .filter((cm) => cm.clanId === selectedClan?.id)
    .sort((a, b) => b.contributedXp - a.contributedXp)

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

  // Toggle Clan Quest Completion (Only allowed if user is a member of the Clan!)
  const handleToggleClanQuest = (quest: ClanQuest) => {
    if (!isMemberOfSelectedClan) {
      showToast('Kamu harus gabung ke Clan ini dulu untuk mengikuti Quest-nya!')
      return
    }
    const alreadyDone = quest.completedByUserIds.includes(currentUser.id)
    const xpDelta = alreadyDone ? -quest.xp : quest.xp

    setClanQuests((curr) =>
      curr.map((cq) =>
        cq.id === quest.id
          ? {
              ...cq,
              completedByUserIds: alreadyDone
                ? cq.completedByUserIds.filter((id) => id !== currentUser.id)
                : [...cq.completedByUserIds, currentUser.id],
            }
          : cq
      )
    )

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

  const openAddClanQuestModal = () => {
    setEditingClanQuest(null)
    setQuestTitle('')
    setQuestCategory(CATEGORIES[1].name)
    setQuestXp(50)
    setQuestType('daily')
    setQuestDeadline('')
    setIsClanQuestModalOpen(true)
  }

  const openEditClanQuestModal = (cq: ClanQuest) => {
    setEditingClanQuest(cq)
    setQuestTitle(cq.title)
    setQuestCategory(cq.category)
    setQuestXp(cq.xp)
    setQuestType(cq.questType)
    setQuestDeadline(cq.deadline || '')
    setIsClanQuestModalOpen(true)
  }

  const handleSaveClanQuest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClan || !isLeaderOfSelectedClan || !questTitle.trim()) return
    const catObj = CATEGORIES.find((c) => c.name === questCategory) || CATEGORIES[0]

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
      }
      setClanQuests((curr) => [...curr, newCq])
      showToast('Quest Clan baru berhasil diterbitkan untuk anggota!')
    }
    setIsClanQuestModalOpen(false)
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
        xp: 100,
        streak: 1,
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
          <button
            type="button"
            className="user-pill"
            onClick={() => setIsAuthModalOpen(true)}
            title="Ganti / Tambah Akun Hunter"
          >
            <UserRound size={12} />
            {currentUser.username}
          </button>
        </header>

        {/* QUICK MULTI-USER ACCOUNT BAR (Memudahkan lihat perbedaan data tiap User) */}
        <div className="account-switcher" aria-label="Pilih Akun User">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              className={`account-chip ${u.id === currentUser.id ? 'active' : ''}`}
              onClick={() => {
                setCurrentUserId(u.id)
                showToast(`Beralih ke akun Hunter: ${u.username}`)
              }}
            >
              <UserRound size={11} />
              {u.username} (Rank {getHunterRank(u.xp)})
            </button>
          ))}
          <button
            type="button"
            className="account-chip"
            onClick={() => {
              setAuthMode('register')
              setIsAuthModalOpen(true)
            }}
          >
            <Plus size={11} /> Akun Baru
          </button>
        </div>

        {/* TOAST NOTIFICATION */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 12px',
              marginBottom: '14px',
              borderRadius: '10px',
              background: '#2b1854',
              border: '1px solid #8b5cf6',
              color: '#f3f1ff',
              fontSize: '11px',
              textAlign: 'center',
            }}
          >
            {statusMessage}
          </div>
        )}

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
              <div className="task-list">
                {userPersonalTasks.map((task) => (
                  <QuestCard
                    key={task.id}
                    title={task.title}
                    meta={`${task.category} • +${task.xp} XP`}
                    icon={task.icon}
                    done={task.done}
                    canManage={true}
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
              <div className="task-list">
                {userPersonalTasks.map((task) => (
                  <QuestCard
                    key={task.id}
                    title={task.title}
                    meta={`${task.category} • +${task.xp} XP`}
                    icon={task.icon}
                    done={task.done}
                    canManage={true}
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
            <section className="quest-heading">
              <div>
                <p className="eyebrow">HUNTER GUILD &amp; COMMUNITY</p>
                <h1>Clan Challenge</h1>
                <p className="quest-date">
                  Gabung ke Clan untuk mengerjakan Quest komunitas bersama.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '11px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => setIsCreateClanModalOpen(true)}
              >
                <Plus size={14} /> Buat Clan
              </button>
            </section>

            {/* INPUT KODE INVITE UNTUK CLAN PRIVAT / CEPAT */}
            <form className="invite-box" onSubmit={handleJoinByInviteCode}>
              <input
                type="text"
                className="modal-input"
                placeholder="Punya Kode Invite Clan? (cth: SHADOW-99)"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
              />
              <button type="submit" className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                <KeyRound size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Gabung Kode
              </button>
            </form>

            {/* DAFTAR PILIHAN CLAN */}
            <div className="section-block" style={{ marginBottom: '18px' }}>
              <span className="modal-label">PILIH / JELAJAHI CLAN ({clans.length})</span>
              {clans.map((clan) => {
                const isJoined = userJoinedClanIds.includes(clan.id)
                const isLeader = clan.leaderId === currentUser.id
                const memberCount = clanMembers.filter((cm) => cm.clanId === clan.id).length
                const leaderUser = users.find((u) => u.id === clan.leaderId)

                return (
                  <div
                    key={clan.id}
                    className={`clan-card ${selectedClan?.id === clan.id ? 'selected' : ''}`}
                    onClick={() => setSelectedClanId(clan.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="clan-header-row">
                      <div>
                        <strong style={{ fontSize: '14px', color: '#f3f1ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {clan.name}
                          {isLeader && (
                            <span className="clan-badge leader">
                              <Crown size={10} /> LEADER
                            </span>
                          )}
                          {!isLeader && isJoined && (
                            <span className="clan-badge public">JOINED</span>
                          )}
                        </strong>
                        <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#9a8fb0' }}>
                          {clan.description}
                        </p>
                      </div>
                      <span className={`clan-badge ${clan.isPrivate ? 'private' : 'public'}`}>
                        {clan.isPrivate ? <Lock size={10} /> : <Globe size={10} />}
                        {clan.isPrivate ? 'PRIVAT' : 'PUBLIK'}
                      </span>
                    </div>

                    <div className="clan-meta-row">
                      <span>
                        Leader: <b style={{ color: '#d5beff' }}>{leaderUser?.username || 'Hunter'}</b> • {memberCount} Anggota
                      </span>
                      <span style={{ color: '#c3a2ff', fontWeight: 700 }}>
                        {clan.totalXp.toLocaleString('id-ID')} XP
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* DETAIL CLAN YANG DIPILIH */}
            {selectedClan && (
              <section className="section-block" style={{ borderTop: '1px solid #262038', paddingTop: '16px' }}>
                <div className="clan-header-row" style={{ marginBottom: '12px' }}>
                  <div>
                    <span className="eyebrow">CLAN AKTIF DIPILIH</span>
                    <h2 style={{ margin: '4px 0', fontSize: '18px' }}>{selectedClan.name}</h2>
                    {(isMemberOfSelectedClan || !selectedClan.isPrivate) && (
                      <small
                        style={{ color: '#9d76f3', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          navigator.clipboard?.writeText(selectedClan.inviteCode)
                          showToast(`Kode Invite ${selectedClan.inviteCode} disalin!`)
                        }}
                      >
                        Kode Invite: <b>{selectedClan.inviteCode}</b> <Copy size={11} />
                      </small>
                    )}
                  </div>
                  {isMemberOfSelectedClan && !isLeaderOfSelectedClan && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: '10px', padding: '5px 10px' }}
                      onClick={() => handleLeaveClan(selectedClan.id)}
                    >
                      Keluar Clan
                    </button>
                  )}
                </div>

                {/* PROTEKSI: HARUS GABUNG CLAN DULU BARU BISA IKUT QUEST */}
                {!isMemberOfSelectedClan ? (
                  <div className="lock-banner">
                    <Lock size={22} style={{ margin: '0 auto', color: '#c084fc' }} />
                    <strong style={{ display: 'block', marginTop: '6px', fontSize: '13px' }}>
                      Quest Clan Terkunci
                    </strong>
                    <p>
                      Kamu harus bergabung ke <b>{selectedClan.name}</b> terlebih dahulu untuk bisa mengerjakan dan mengklaim XP dari Quest di Clan ini.
                    </p>
                    {selectedClan.isPrivate ? (
                      <p style={{ color: '#fcd34d', margin: 0 }}>
                        Clan ini bersifat Privat. Masukkan kode <b>{selectedClan.inviteCode}</b> pada kotak Kode Invite di atas!
                      </p>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleJoinPublicClan(selectedClan)}
                      >
                        Gabung ke {selectedClan.name} Sekarang
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* SUB-TABS DI DALAM CLAN: QUEST CLAN vs LEADERBOARD CLAN */}
                    <div className="sub-tabs">
                      <button
                        type="button"
                        className={`sub-tab ${clanViewTab === 'quests' ? 'active' : ''}`}
                        onClick={() => setClanViewTab('quests')}
                      >
                        Daftar Quest Clan ({selectedClanQuests.length})
                      </button>
                      <button
                        type="button"
                        className={`sub-tab ${clanViewTab === 'leaderboard' ? 'active' : ''}`}
                        onClick={() => setClanViewTab('leaderboard')}
                      >
                        Leaderboard Anggota ({selectedClanMembers.length})
                      </button>
                    </div>

                    {clanViewTab === 'quests' ? (
                      <>
                        <div className="task-list">
                          {selectedClanQuests.length === 0 ? (
                            <p style={{ textAlign: 'center', fontSize: '12px', color: '#7d7291', padding: '16px 0' }}>
                              Belum ada Quest di Clan ini.
                            </p>
                          ) : (
                            selectedClanQuests.map((cq) => {
                              const isDoneByMe = cq.completedByUserIds.includes(currentUser.id)
                              return (
                                <QuestCard
                                  key={cq.id}
                                  title={cq.title}
                                  meta={`${cq.category} • +${cq.xp} XP • ${cq.completedByUserIds.length} Hunter selesai${cq.deadline ? ` • Batas: ${cq.deadline}` : ''}`}
                                  icon={cq.icon}
                                  done={isDoneByMe}
                                  isEvent={cq.questType === 'event'}
                                  canManage={isLeaderOfSelectedClan}
                                  onToggle={() => handleToggleClanQuest(cq)}
                                  onEdit={() => openEditClanQuestModal(cq)}
                                  onDelete={() => handleDeleteClanQuest(cq.id)}
                                />
                              )
                            })
                          )}
                        </div>

                        {isLeaderOfSelectedClan ? (
                          <button className="add-task" onClick={openAddClanQuestModal}>
                            <Plus size={17} /> Tambah Quest Clan (Leader Only)
                          </button>
                        ) : (
                          <p style={{ textAlign: 'center', fontSize: '10px', color: '#756d82', marginTop: '10px' }}>
                            *Hanya Clan Leader yang dapat menambah atau mengubah Quest Clan.
                          </p>
                        )}
                      </>
                    ) : (
                      /* LEADERBOARD INTERNAL CLAN */
                      <div className="rank-list">
                        {selectedClanMembers.map((cm, idx) => {
                          const memberUser = users.find((u) => u.id === cm.userId)
                          const isMe = cm.userId === currentUser.id
                          return (
                            <div
                              key={`${cm.clanId}-${cm.userId}`}
                              className={`rank-row ${isMe ? 'current' : ''}`}
                            >
                              <span>{String(idx + 1).padStart(2, '0')}</span>
                              <div>
                                <strong>
                                  {memberUser?.username || 'Hunter'}{' '}
                                  {cm.role === 'leader' && (
                                    <span className="clan-badge leader" style={{ marginLeft: '4px' }}>
                                      LEADER
                                    </span>
                                  )}
                                </strong>
                                <small>
                                  Level {getHunterLevel(memberUser?.xp || 0)} • Rank {getHunterRank(memberUser?.xp || 0)}
                                </small>
                              </div>
                              <b>{cm.contributedXp.toLocaleString('id-ID')} Clan XP</b>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </section>
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

        {/* BOTTOM NAVIGATION (5 MENU) */}
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
              <label className="modal-label">KATEGORI</label>
              <div className="modal-chips">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    className={`modal-chip ${questCategory === cat.name ? 'active' : ''}`}
                    onClick={() => {
                      setQuestCategory(cat.name)
                      setQuestXp(cat.xp)
                    }}
                  >
                    {cat.icon} {cat.name} (+{cat.xp} XP)
                  </button>
                ))}
              </div>
              <label className="modal-label">REWARD XP</label>
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
          MODAL 2: CLAN QUEST (LEADER ONLY - DAILY & EVENT)
         ================================================================ */}
      {isClanQuestModalOpen && (
        <div className="modal-overlay" onClick={() => setIsClanQuestModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClanQuest ? 'EDIT QUEST CLAN' : 'BUAT QUEST CLAN'}</h3>
              <button type="button" className="modal-close" onClick={() => setIsClanQuestModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
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

              <label className="modal-label">KATEGORI</label>
              <div className="modal-chips">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    className={`modal-chip ${questCategory === cat.name ? 'active' : ''}`}
                    onClick={() => {
                      setQuestCategory(cat.name)
                      setQuestXp(cat.xp * 2)
                    }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>

              <label className="modal-label">REWARD XP (PERSONAL &amp; CLAN)</label>
              <input
                type="number"
                className="modal-input"
                value={questXp}
                onChange={(e) => setQuestXp(Number(e.target.value))}
                min={10}
                max={1000}
              />

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsClanQuestModalOpen(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-primary">
                  Terbitkan ke Clan
                </button>
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
              <input
                type="password"
                className="modal-input"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAuthModalOpen(false)}>
                  Tutup
                </button>
                <button type="submit" className="btn-primary">
                  <LogIn size={13} style={{ display: 'inline', marginRight: '5px' }} />
                  {authMode === 'register' ? 'Buat Akun & Masuk' : 'Masuk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
