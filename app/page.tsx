'use client'

import { useState } from 'react'
import { Bell, CalendarDays, Check, ChevronLeft, ChevronRight, Flame, Home, Pencil, Plus, Swords, Trash2, Trophy, UserRound, Zap } from 'lucide-react'

const initialTasks = [
  { id: 1, title: 'Bangun sebelum 06:00', meta: 'Disiplin • +20 XP', icon: '☼', done: true },
  { id: 2, title: 'Workout 30 menit', meta: 'Kekuatan • +40 XP', icon: 'ϟ', done: true },
  { id: 3, title: 'Baca 10 halaman', meta: 'Pengetahuan • +25 XP', icon: '▤', done: false },
  { id: 4, title: 'Minum 2L air putih', meta: 'Vitalitas • +15 XP', icon: '◒', done: false },
]

const days = [
  { day: 'S', date: 26, level: 2 }, { day: 'M', date: 27, level: 3 }, { day: 'T', date: 28, level: 1 },
  { day: 'W', date: 29, level: 3 }, { day: 'T', date: 30, level: 2 }, { day: 'F', date: 31, level: 3 }, { day: 'S', date: 1, level: 0 },
]

function QuestCard({ task, onToggle, onDelete }: { task: typeof initialTasks[number], onToggle: () => void, onDelete: () => void }) {
  const [offset, setOffset] = useState(0)
  const [startX, setStartX] = useState<number | null>(null)
  return <div className="quest-swipe">
    <div className="quest-actions"><button aria-label={`Edit ${task.title}`}><Pencil size={15} /></button><button aria-label={`Delete ${task.title}`} onClick={onDelete}><Trash2 size={15} /></button></div>
    <button className={`task-row ${task.done ? 'completed' : ''}`} style={{ transform: `translateX(${offset}px)` }} onClick={onToggle} onTouchStart={(event) => setStartX(event.touches[0].clientX)} onTouchMove={(event) => { if (startX !== null) setOffset(Math.max(-112, Math.min(0, event.touches[0].clientX - startX))) }} onTouchEnd={() => { if (offset < -55) setOffset(-104); else setOffset(0); setStartX(null) }}>
      <span className="check-box">{task.done && <Check size={15} strokeWidth={3} />}</span><span className="task-symbol">{task.icon}</span><span className="task-copy"><strong>{task.title}</strong><small>{task.meta}</small></span><span className="task-xp">{task.done ? 'DONE' : 'XP'}</span>
    </button>
  </div>
}

function Journey({ tasks, toggleTask, deleteTask }: { tasks: typeof initialTasks, toggleTask: (id: number) => void, deleteTask: (id: number) => void }) {
  const completed = tasks.filter((task) => task.done).length
  return <><section className="section-block quest-calendar"><div className="section-title"><div><span className="eyebrow">MY QUEST</span><h2>Daily progress</h2></div><div className="month-switch"><button aria-label="Bulan sebelumnya"><ChevronLeft size={16} /></button><span>NOV 2024</span><button aria-label="Bulan berikutnya"><ChevronRight size={16} /></button></div></div><div className="calendar-mini">{Array.from({ length: 30 }, (_, index) => <div key={index} className="calendar-cell"><span>{['S','M','T','W','T','F','S'][index % 7]}</span><div className={`day-orb level-${(index * 3) % 4} ${index === 6 ? 'today' : ''}`}>{index + 1}</div></div>)}</div><div className="calendar-legend"><span><i className="legend-dot low" /> Rest</span><span><i className="legend-dot mid" /> Active</span><span><i className="legend-dot high" /> Perfect</span></div></section><section className="section-block quest-list-section"><div className="section-title"><div><span className="eyebrow">FRIDAY, 01 NOV</span><h2>Checklist hari ini</h2></div><span className="completion">{completed}/{tasks.length}</span></div><div className="task-list">{tasks.map((task) => <QuestCard key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => deleteTask(task.id)} />)}</div><button className="add-task"><Plus size={17} /> Tambah quest baru</button></section></>
}

function Rank() {
  return <section className="rank-page"><div className="rank-hero"><span className="eyebrow">HUNTER RANK</span><strong>A</strong><p>Naikkan rank dengan menyelesaikan quest setiap hari.</p></div><div className="rank-list"><div className="rank-row current"><span>01</span><div><strong>Shadow Monarch</strong><small>Level 12 • Kamu</small></div><b>1,240 XP</b></div>{[['02','Cha Hae-In','1,180 XP'],['03','Igris','980 XP'],['04','Beru','760 XP']].map(([number, name, score]) => <div className="rank-row" key={name}><span>{number}</span><div><strong>{name}</strong><small>Hunter squad</small></div><b>{score}</b></div>)}</div></section>
}

export default function Page() {
  const [tasks, setTasks] = useState(initialTasks)
  const [activeTab, setActiveTab] = useState('home')
  const completed = tasks.filter((task) => task.done).length
  const xp = 1240 + completed * 15
  const toggleTask = (id: number) => setTasks((current) => current.map((task) => task.id === id ? { ...task, done: !task.done } : task))
  const title = activeTab === 'home' ? 'Bangun kekuatanmu' : activeTab === 'calendar' ? 'My Journey' : activeTab === 'rank' ? 'Hunter Rank' : 'Hunter Profile'

  return <main className="app-shell"><div className="phone-frame"><header className="topbar"><div className="brand-mark"><Swords size={17} strokeWidth={2.5} /></div><div className="brand-name">SOLO<span>LEVEL</span></div><button className="icon-button" aria-label="Notifikasi"><Bell size={19} /></button></header>
    {activeTab === 'home' && <><section className="hero"><div><p className="eyebrow">Selamat pagi, Arise.</p><h1>{title}<br /><span>setiap hari.</span></h1></div><div className="rank-badge"><span>RANK</span><strong>A</strong></div></section><section className="level-card"><div className="level-heading"><div><span className="label-muted">CURRENT LEVEL</span><strong>Level 12</strong></div><div className="xp-count"><Zap size={14} fill="currentColor" /> {xp.toLocaleString('id-ID')} XP</div></div><div className="xp-track"><span style={{ width: `${86 + completed * 2}%` }} /></div><div className="level-footer"><span>Ke level 13</span><span>1,500 XP</span></div></section><section className="stats-grid"><div className="stat-card accent"><Flame size={18} /><div><strong>7 hari</strong><span>Streak saat ini</span></div></div><div className="stat-card"><Trophy size={18} /><div><strong>86%</strong><span>Konsistensi</span></div></div></section><section className="section-block"><div className="section-title"><div><span className="eyebrow">MY QUEST</span><h2>Daily checklist</h2></div><span className="completion">{completed}/{tasks.length}</span></div><p className="quest-date">Jumat, 1 November 2024</p><div className="task-list">{tasks.map((task) => <QuestCard key={task.id} task={task} onToggle={() => toggleTask(task.id)} onDelete={() => setTasks((current) => current.filter((item) => item.id !== task.id))} />)}</div><button className="add-task"><Plus size={17} /> Tambah quest baru</button></section></>}
    {activeTab === 'calendar' && <><section className="quest-heading"><div><p className="eyebrow">MY QUEST</p><h1>Daily checklist</h1><p className="quest-date">Jumat, 01 November 2024</p></div><div className="quest-count"><span>DONE</span><strong>{completed}/{tasks.length}</strong></div></section><Journey tasks={tasks} toggleTask={toggleTask} deleteTask={(id) => setTasks((current) => current.filter((item) => item.id !== id))} /></>}
    {activeTab === 'rank' && <><section className="hero compact"><div><p className="eyebrow">YOUR PROGRESS</p><h1>{title}</h1></div></section><Rank /></>}
    {activeTab === 'profile' && <><section className="hero compact"><div><p className="eyebrow">HUNTER PROFILE</p><h1>Shadow Monarch</h1></div><div className="rank-badge"><span>RANK</span><strong>A</strong></div></section><section className="level-card profile-card"><strong>Level 12 Hunter</strong><span>1,240 total XP</span><div className="profile-stats"><div><b>28</b><small>Quest selesai</small></div><div><b>86%</b><small>Konsistensi</small></div><div><b>7</b><small>Streak</small></div></div></section></>}
    <nav className="bottom-nav" aria-label="Navigasi utama">{[["home", Home, 'Home'], ['calendar', CalendarDays, 'My Quest'], ['rank', Trophy, 'Rank'], ['profile', UserRound, 'Profile']].map(([key, Icon, label]) => <button key={key as string} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key as string)}><Icon size={19} /><span>{label as string}</span></button>)}</nav>
  </div></main>
}
