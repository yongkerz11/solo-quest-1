'use client'

import { useState, useEffect } from 'react'
import { Bell, CalendarDays, Check, Flame, Home, Pencil, Plus, Swords, Trash2, Trophy, UserRound, Zap, X } from 'lucide-react'

interface Task {
  id: number
  title: string
  meta: string
  icon: string
  done: boolean
}

const CATEGORIES = [
  { name: 'Disiplin', xp: 20, icon: '☼' },
  { name: 'Kekuatan', xp: 40, icon: 'ϟ' },
  { name: 'Pengetahuan', xp: 25, icon: '▤' },
  { name: 'Vitalitas', xp: 15, icon: '◒' },
]

const initialTasks: Task[] = [
  { id: 1, title: 'Bangun sebelum 06:00', meta: 'Disiplin • +20 XP', icon: '☼', done: true },
  { id: 2, title: 'Workout 30 menit', meta: 'Kekuatan • +40 XP', icon: 'ϟ', done: true },
  { id: 3, title: 'Baca 10 halaman', meta: 'Pengetahuan • +25 XP', icon: '▤', done: false },
  { id: 4, title: 'Minum 2L air putih', meta: 'Vitalitas • +15 XP', icon: '◒', done: false },
]

function QuestCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={`task-row ${task.done ? 'completed' : ''}`}>
      <span className="check-box" onClick={onToggle} role="button" aria-label="Toggle status">
        {task.done && <Check size={15} strokeWidth={3} />}
      </span>
      <span className="task-symbol" onClick={onToggle}>
        {task.icon}
      </span>
      <span className="task-copy" onClick={onToggle}>
        <strong>{task.title}</strong>
        <small>{task.meta}</small>
      </span>
      <div className="task-actions-inline">
        <button
          type="button"
          className="task-btn-action"
          aria-label={`Edit ${task.title}`}
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
          aria-label={`Hapus ${task.title}`}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <span className="task-xp" onClick={onToggle}>
        {task.done ? 'DONE' : 'XP'}
      </span>
    </div>
  )
}

function QuestModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { title: string; category: string; xp: number; icon: string }) => void
  initialData: Task | null
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0].name)
  const [xp, setXp] = useState(CATEGORIES[0].xp)

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      const matchedCat = CATEGORIES.find((c) => initialData.meta.includes(c.name))
      setCategory(matchedCat ? matchedCat.name : CATEGORIES[0].name)
      const parsedXp = parseInt(initialData.meta.match(/\+(\d+)/)?.[1] || '20', 10)
      setXp(parsedXp)
    } else {
      setTitle('')
      setCategory(CATEGORIES[0].name)
      setXp(CATEGORIES[0].xp)
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const currentCat = CATEGORIES.find((c) => c.name === category) || CATEGORIES[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      category: currentCat.name,
      xp,
      icon: currentCat.icon,
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initialData ? 'EDIT QUEST' : 'TAMBAH QUEST BARU'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="modal-label">NAMA QUEST</label>
          <input
            type="text"
            className="modal-input"
            placeholder="Contoh: Lari pagi 15 menit"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            required
          />

          <label className="modal-label">KATEGORI</label>
          <div className="modal-chips">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                type="button"
                className={`modal-chip ${category === cat.name ? 'active' : ''}`}
                onClick={() => {
                  setCategory(cat.name)
                  setXp(cat.xp)
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
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            min={5}
            max={500}
          />

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-primary">
              {initialData ? 'Simpan Perubahan' : 'Tambah Quest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Rank() {
  return (
    <section className="rank-page">
      <div className="rank-hero">
        <span className="eyebrow">HUNTER RANK</span>
        <strong>A</strong>
        <p>Naikkan rank dengan menyelesaikan quest setiap hari.</p>
      </div>
      <div className="rank-list">
        <div className="rank-row current">
          <span>01</span>
          <div>
            <strong>Shadow Monarch</strong>
            <small>Level 12 • Kamu</small>
          </div>
          <b>1,240 XP</b>
        </div>
        {[
          ['02', 'Cha Hae-In', '1,180 XP'],
          ['03', 'Igris', '980 XP'],
          ['04', 'Beru', '760 XP'],
        ].map(([number, name, score]) => (
          <div className="rank-row" key={name}>
            <span>{number}</span>
            <div>
              <strong>{name}</strong>
              <small>Hunter squad</small>
            </div>
            <b>{score}</b>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTab, setActiveTab] = useState('home')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('solo_tasks')
    if (saved) {
      try {
        setTasks(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('solo_tasks', JSON.stringify(tasks))
    }
  }, [tasks, mounted])

  const completed = tasks.filter((task) => task.done).length
  const xp = 1240 + completed * 15

  const handleToggle = (id: number) => {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task))
    )
  }

  const handleDelete = (id: number) => {
    setTasks((current) => current.filter((task) => task.id !== id))
  }

  const handleOpenAdd = () => {
    setEditingTask(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const handleSaveQuest = ({
    title,
    category,
    xp,
    icon,
  }: {
    title: string
    category: string
    xp: number
    icon: string
  }) => {
    if (editingTask) {
      setTasks((current) =>
        current.map((t) =>
          t.id === editingTask.id
            ? { ...t, title, meta: `${category} • +${xp} XP`, icon }
            : t
        )
      )
    } else {
      const newTask: Task = {
        id: Date.now(),
        title,
        meta: `${category} • +${xp} XP`,
        icon,
        done: false,
      }
      setTasks((current) => [...current, newTask])
    }
  }

  const title =
    activeTab === 'home'
      ? 'Bangun kekuatanmu'
      : activeTab === 'calendar'
      ? 'My Journey'
      : activeTab === 'rank'
      ? 'Hunter Rank'
      : 'Hunter Profile'

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <header className="topbar">
          <div className="brand-mark">
            <Swords size={17} strokeWidth={2.5} />
          </div>
          <div className="brand-name">
            SOLO<span>LEVEL</span>
          </div>
          <button className="icon-button" aria-label="Notifikasi">
            <Bell size={19} />
          </button>
        </header>

        {/* Tab 1: HOME */}
        {activeTab === 'home' && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">Selamat pagi, Arise.</p>
                <h1>
                  {title}
                  <br />
                  <span>setiap hari.</span>
                </h1>
              </div>
              <div className="rank-badge">
                <span>RANK</span>
                <strong>A</strong>
              </div>
            </section>
            <section className="level-card">
              <div className="level-heading">
                <div>
                  <span className="label-muted">CURRENT LEVEL</span>
                  <strong>Level 12</strong>
                </div>
                <div className="xp-count">
                  <Zap size={14} fill="currentColor" /> {xp.toLocaleString('id-ID')} XP
                </div>
              </div>
              <div className="xp-track">
                <span style={{ width: `${Math.min(100, 80 + completed * 5)}%` }} />
              </div>
              <div className="level-footer">
                <span>Ke level 13</span>
                <span>1,500 XP</span>
              </div>
            </section>
            <section className="stats-grid">
              <div className="stat-card accent">
                <Flame size={18} />
                <div>
                  <strong>7 hari</strong>
                  <span>Streak saat ini</span>
                </div>
              </div>
              <div className="stat-card">
                <Trophy size={18} />
                <div>
                  <strong>{tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0}%</strong>
                  <span>Konsistensi</span>
                </div>
              </div>
            </section>
            <section className="section-block">
              <div className="section-title">
                <div>
                  <span className="eyebrow">MY QUEST</span>
                  <h2>Daily checklist</h2>
                </div>
                <span className="completion">
                  {completed}/{tasks.length}
                </span>
              </div>
              <p className="quest-date">Jumat, 1 November 2024</p>
              <div className="task-list">
                {tasks.map((task) => (
                  <QuestCard
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggle(task.id)}
                    onEdit={() => handleOpenEdit(task)}
                    onDelete={() => handleDelete(task.id)}
                  />
                ))}
              </div>
              <button className="add-task" onClick={handleOpenAdd}>
                <Plus size={17} /> Tambah quest baru
              </button>
            </section>
          </>
        )}

        {/* Tab 2: MY QUEST (Calendar removed -> direct checklist) */}
        {activeTab === 'calendar' && (
          <>
            <section className="quest-heading">
              <div>
                <p className="eyebrow">MY QUEST</p>
                <h1>Daily checklist</h1>
                <p className="quest-date">Jumat, 01 November 2024</p>
              </div>
              <div className="quest-count">
                <span>DONE</span>
                <strong>
                  {completed}/{tasks.length}
                </strong>
              </div>
            </section>

            <section className="section-block quest-list-section">
              <div className="section-title">
                <div>
                  <span className="eyebrow">FRIDAY, 01 NOV</span>
                  <h2>Checklist hari ini</h2>
                </div>
                <span className="completion">
                  {completed}/{tasks.length}
                </span>
              </div>
              <div className="task-list">
                {tasks.map((task) => (
                  <QuestCard
                    key={task.id}
                    task={task}
                    onToggle={() => handleToggle(task.id)}
                    onEdit={() => handleOpenEdit(task)}
                    onDelete={() => handleDelete(task.id)}
                  />
                ))}
              </div>
              <button className="add-task" onClick={handleOpenAdd}>
                <Plus size={17} /> Tambah quest baru
              </button>
            </section>
          </>
        )}

        {/* Tab 3: RANK */}
        {activeTab === 'rank' && (
          <>
            <section className="hero compact">
              <div>
                <p className="eyebrow">YOUR PROGRESS</p>
                <h1>{title}</h1>
              </div>
            </section>
            <Rank />
          </>
        )}

        {/* Tab 4: PROFILE */}
        {activeTab === 'profile' && (
          <>
            <section className="hero compact">
              <div>
                <p className="eyebrow">HUNTER PROFILE</p>
                <h1>Shadow Monarch</h1>
              </div>
              <div className="rank-badge">
                <span>RANK</span>
                <strong>A</strong>
              </div>
            </section>
            <section className="level-card profile-card">
              <strong>Level 12 Hunter</strong>
              <span>1,240 total XP</span>
              <div className="profile-stats">
                <div>
                  <b>{completed}</b>
                  <small>Quest selesai</small>
                </div>
                <div>
                  <b>{tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0}%</b>
                  <small>Konsistensi</small>
                </div>
                <div>
                  <b>7</b>
                  <small>Streak</small>
                </div>
              </div>
            </section>
          </>
        )}

        {/* BOTTOM NAVIGATION */}
        <nav className="bottom-nav" aria-label="Navigasi utama">
          {[
            ['home', Home, 'Home'],
            ['calendar', CalendarDays, 'My Quest'],
            ['rank', Trophy, 'Rank'],
            ['profile', UserRound, 'Profile'],
          ].map(([key, Icon, label]) => (
            <button
              key={key as string}
              className={activeTab === key ? 'active' : ''}
              onClick={() => setActiveTab(key as string)}
            >
              <Icon size={19} />
              <span>{label as string}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* CRUD MODAL */}
      <QuestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveQuest}
        initialData={editingTask}
      />
    </main>
  )
}
