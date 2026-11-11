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
  workoutExercises?: WorkoutExercise[]
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

    return data.map((row: any) => {
      const rawSchedule = Array.isArray(row.schedule) ? row.schedule : []
      const timeTag = rawSchedule.find((s: string) => typeof s === 'string' && s.startsWith('time:'))
      const targetTimeFromSchedule = timeTag ? timeTag.replace('time:', '') : undefined
      const cleanSchedule = rawSchedule.filter((s: string) => typeof s === 'string' && !s.startsWith('time:'))

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
    const cleanSchedule = (task.schedule || []).filter((s) => typeof s === 'string' && !s.startsWith('time:'))
    const scheduleWithTime = task.targetTime
      ? [...cleanSchedule, `time:${task.targetTime}`]
      : cleanSchedule

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
      const cleanSchedule = (task.schedule || []).filter((s) => typeof s === 'string' && !s.startsWith('time:'))
      const scheduleWithTime = task.targetTime
        ? [...cleanSchedule, `time:${task.targetTime}`]
        : cleanSchedule

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

