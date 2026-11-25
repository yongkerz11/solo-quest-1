import { supabase, isSupabaseConfigured } from './supabase'

export interface WorkoutSet {
  id: string
  setNumber: number
  reps: number | string
  weight?: number | string
  completed: boolean
}

export interface WorkoutExerciseHistory {
  date: string
  weight: number
  reps?: number
  setNumber?: number
  timestamp?: number
}

export interface WorkoutExercise {
  id: string
  name: string
  sets: WorkoutSet[]
  restSeconds?: number
  history?: WorkoutExerciseHistory[]
}

export interface PersonalTask {
  id: string
  userId: string
  title: string
  category: string
  xp: number
  icon: string
  done: boolean
  schedule?: string[]
  targetTime?: string
  completedDates?: string[]
  skippedDates?: string[]
  isSealed?: boolean
  workoutExercises?: WorkoutExercise[]
}

function encodeScheduleForCloud(task: PersonalTask): string[] {
  const cleanSchedule = (task.schedule || []).filter(
    (s) =>
      typeof s === 'string' &&
      !s.startsWith('time:') &&
      !s.startsWith('skip:') &&
      !s.startsWith('unskip:') &&
      !s.startsWith('sealed:')
  )
  const skipTags = (task.skippedDates || []).map((d) =>
    d.startsWith('unskip:') ? d : `skip:${d}`
  )
  return [
    ...cleanSchedule,
    ...(task.targetTime ? [`time:${task.targetTime}`] : []),
    ...(task.isSealed ? ['sealed:true'] : []),
    ...skipTags,
  ]
}

export interface UserProfile {
  id: string
  username: string
  email: string
  xp: number
  streak: number
}

/**
 * Fetch personal quests from Supabase Cloud
 */
export async function fetchCloudQuests(
  userId: string,
  username?: string
): Promise<PersonalTask[] | null> {
  if (!isSupabaseConfigured || !supabase) return null

  try {
    let query = supabase.from('user_quests').select('*')
    if (username) {
      query = query.or(`user_id.eq.${userId},username.eq.${username}`)
    } else {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query
    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('Tabel user_quests belum dibuat di Supabase SQL Editor.')
      } else {
        console.warn('Gagal mengambil quest dari cloud:', error.message)
      }
      return null
    }

    if (!data) return []

    return data
      .filter(
        (row: any) =>
          !(typeof row.category === 'string' && row.category.startsWith('__system_')) &&
          !(typeof row.id === 'string' && row.id.startsWith('__push_'))
      )
      .map((row: any) => {
      const rawSchedule = Array.isArray(row.schedule) ? row.schedule : []
      const timeTag = rawSchedule.find((s: string) => typeof s === 'string' && s.startsWith('time:'))
      const targetTimeFromSchedule = timeTag ? timeTag.replace('time:', '') : undefined
      const skipTags = rawSchedule.filter(
        (s: string) => typeof s === 'string' && (s.startsWith('skip:') || s.startsWith('unskip:'))
      )
      const skippedDatesFromSchedule = skipTags.map((s: string) => s.replace(/^skip:/, ''))
      const isSealed = rawSchedule.includes('sealed:true')
      const cleanSchedule = rawSchedule.filter(
        (s: string) =>
          typeof s === 'string' &&
          !s.startsWith('time:') &&
          !s.startsWith('skip:') &&
          !s.startsWith('unskip:') &&
          !s.startsWith('sealed:')
      )

      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        category: row.category,
        xp: row.xp ?? 20,
        icon: row.icon ?? '🏋️',
        done: Boolean(row.done),
        schedule: cleanSchedule,
        targetTime: row.target_time || targetTimeFromSchedule || undefined,
        completedDates: Array.isArray(row.completed_dates) ? row.completed_dates : [],
        skippedDates: skippedDatesFromSchedule,
        isSealed,
        workoutExercises: Array.isArray(row.workout_exercises) ? row.workout_exercises : [],
      }
    })
  } catch (err) {
    console.error('fetchCloudQuests exception:', err)
    return null
  }
}

/**
 * Save / Upsert a single personal quest to Supabase Cloud
 */
export async function saveCloudQuest(
  task: PersonalTask,
  username?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  try {
    const scheduleWithTime = encodeScheduleForCloud(task)

    const payload = {
      id: task.id,
      user_id: task.userId,
      username: username || '',
      title: task.title,
      category: task.category,
      xp: task.xp,
      icon: task.icon,
      done: task.done,
      schedule: scheduleWithTime,
      completed_dates: task.completedDates || [],
      workout_exercises: task.workoutExercises || [],
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('user_quests').upsert(payload)
    if (error) {
      console.warn('Gagal menyimpan quest ke cloud:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('saveCloudQuest exception:', err)
    return false
  }
}

/**
 * Delete a personal quest from Supabase Cloud
 */
export async function deleteCloudQuest(taskId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  try {
    const { error } = await supabase.from('user_quests').delete().eq('id', taskId)
    if (error) {
      console.warn('Gagal menghapus quest dari cloud:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('deleteCloudQuest exception:', err)
    return false
  }
}

/**
 * Batch save multiple personal quests to Supabase Cloud
 */
export async function saveAllCloudQuests(
  tasks: PersonalTask[],
  username?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || tasks.length === 0) return false

  try {
    const payload = tasks.map((task) => {
      const scheduleWithTime = encodeScheduleForCloud(task)

      return {
        id: task.id,
        user_id: task.userId,
        username: username || '',
        title: task.title,
        category: task.category,
        xp: task.xp,
        icon: task.icon,
        done: task.done,
        schedule: scheduleWithTime,
        completed_dates: task.completedDates || [],
        workout_exercises: task.workoutExercises || [],
        updated_at: new Date().toISOString(),
      }
    })

    const { error } = await supabase.from('user_quests').upsert(payload)
    if (error) {
      console.warn('Gagal batch-save quests ke cloud:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('saveAllCloudQuests exception:', err)
    return false
  }
}

/**
 * Fetch Hunter profile from Supabase Cloud
 */
export async function fetchCloudProfile(
  userId: string,
  username?: string
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured || !supabase) return null

  try {
    let query = supabase.from('profiles').select('*')
    if (username) {
      query = query.or(`id.eq.${userId},username.eq.${username}`)
    } else {
      query = query.eq('id', userId)
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data) return null

    return {
      id: data.id,
      username: data.username,
      email: data.email || '',
      xp: data.xp ?? 0,
      streak: data.streak ?? 0,
    }
  } catch (err) {
    console.error('fetchCloudProfile exception:', err)
    return null
  }
}

/**
 * Save Hunter profile to Supabase Cloud
 */
export async function saveCloudProfile(profile: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false

  try {
    const payload = {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      xp: profile.xp,
      streak: profile.streak,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(payload)
    if (error) {
      console.warn('Gagal menyimpan profil ke cloud:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('saveCloudProfile exception:', err)
    return false
  }
}

export interface FinanceBudgetBucket {
  id: string
  name: string
  category: 'kebutuhan' | 'hiburan' | 'tabungan' | 'cicilan'
  targetMonthly: number
  color?: string
}

export interface FinanceSavingGoal {
  id: string
  title: string
  targetAmount: number
  savedAmount: number
  monthlyTarget?: number
  isPriority?: boolean
  deadlineDate?: string
  note?: string
}

export interface FinanceLogItem {
  id: string
  type: 'saving' | 'expense' | 'income'
  amount: number
  bucketId?: string
  goalId?: string
  note: string
  dateIso: string
  createdAt: number
}

export interface FinanceVaultState {
  monthlyIncome: number
  buckets: FinanceBudgetBucket[]
  goals: FinanceSavingGoal[]
  logs: FinanceLogItem[]
  updatedAt: number
}

export const DEFAULT_FINANCE_VAULT: FinanceVaultState = {
  monthlyIncome: 3500000,
  buckets: [
    { id: 'b-kebutuhan', name: 'Kebutuhan & Makan', category: 'kebutuhan', targetMonthly: 1500000, color: '#38bdf8' },
    { id: 'b-transport', name: 'Transport & Tagihan', category: 'kebutuhan', targetMonthly: 500000, color: '#a855f7' },
    { id: 'b-hiburan', name: 'Hiburan & Jajan', category: 'hiburan', targetMonthly: 500000, color: '#f59e0b' },
  ],
  goals: [
    { id: 'g-darurat', title: 'Dana Darurat Hunter', targetAmount: 5000000, savedAmount: 0, monthlyTarget: 1000000, isPriority: true, note: 'Benteng pertahanan keuangan' },
    { id: 'g-gear', title: 'Target Impian / Upgrade Gear', targetAmount: 3500000, savedAmount: 0, monthlyTarget: 500000, isPriority: false, note: 'Alat kerja & self-reward' },
  ],
  logs: [],
  updatedAt: 0,
}

/**
 * Fetch Finance Vault configuration & logs from Supabase Cloud
 */
export async function fetchCloudFinanceVault(
  userId: string
): Promise<FinanceVaultState | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null

  try {
    const docId = `__finance_vault__:${userId}`
    const { data, error } = await supabase
      .from('user_quests')
      .select('workout_exercises, updated_at')
      .eq('id', docId)
      .maybeSingle()

    if (error || !data) return null
    const rawArr = Array.isArray(data.workout_exercises) ? data.workout_exercises : []
    const payload = rawArr[0]
    if (!payload || typeof payload !== 'object') return null

    return {
      monthlyIncome: typeof payload.monthlyIncome === 'number' ? payload.monthlyIncome : DEFAULT_FINANCE_VAULT.monthlyIncome,
      buckets: Array.isArray(payload.buckets) ? payload.buckets : DEFAULT_FINANCE_VAULT.buckets,
      goals: Array.isArray(payload.goals) ? payload.goals : DEFAULT_FINANCE_VAULT.goals,
      logs: Array.isArray(payload.logs) ? payload.logs : [],
      updatedAt: typeof payload.updatedAt === 'number' ? payload.updatedAt : Date.parse(data.updated_at || '') || 0,
    }
  } catch (err) {
    console.error('fetchCloudFinanceVault exception:', err)
    return null
  }
}

/**
 * Save Finance Vault configuration & logs to Supabase Cloud
 */
export async function saveCloudFinanceVault(
  userId: string,
  username: string | undefined,
  vault: FinanceVaultState
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase || !userId) return false

  try {
    const payload = {
      id: `__finance_vault__:${userId}`,
      user_id: userId,
      username: username || '',
      title: 'Finance Vault',
      category: '__system_finance_vault__',
      xp: 0,
      icon: '💰',
      done: false,
      schedule: [],
      completed_dates: [],
      workout_exercises: [vault],
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('user_quests').upsert(payload)
    if (error) {
      console.warn('Gagal menyimpan Finance Vault ke cloud:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('saveCloudFinanceVault exception:', err)
    return false
  }
}


