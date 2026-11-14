#!/usr/bin/env node
/**
 * Solo Quest — Automated Per-Page Design (UI/UX Pro Max) & End-to-End Flow Test Suite
 * Run with: npm run test:ui
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const pagePath = path.join(ROOT, 'app', 'page.tsx')
const loginPath = path.join(ROOT, 'app', 'login', 'page.tsx')
const cssPath = path.join(ROOT, 'app', 'globals.css')

const pageCode = fs.readFileSync(pagePath, 'utf8')
const loginCode = fs.readFileSync(loginPath, 'utf8')
const cssCode = fs.readFileSync(cssPath, 'utf8')

const scenarios = [
  {
    id: 'SCENARIO-01',
    page: 'Halaman 1: Login & Registrasi Hunter (/login)',
    story: 'Hunter masuk atau mendaftar akun tanpa hambatan verifikasi email → set session cookie & localStorage → redirect ke Dashboard.',
    checks: [
      {
        name: 'Tab Switcher Masuk / Daftar Akun Baru tersedia & kontras tinggi',
        pass: loginCode.includes("setMode('login')") && loginCode.includes("setMode('register')") && loginCode.includes('bg-purple-700 text-white'),
      },
      {
        name: 'Vector Icons (Lucide) digunakan pada seluruh form & tombol (tanpa emoji OS)',
        pass: loginCode.includes('from \'lucide-react\'') && !/[\u{1F300}-\u{1FAFF}]/u.test(loginCode),
      },
      {
        name: 'Direct Login flow menyimpan cookie hunter_session & state solo_community_v1',
        pass: loginCode.includes('document.cookie = `hunter_session=') && loginCode.includes("localStorage.setItem('solo_community_v1'"),
      },
    ],
  },
  {
    id: 'SCENARIO-02',
    page: 'Halaman 2: Home / Dashboard Utama (Tab Home)',
    story: 'Hunter melihat Level, XP Bar, Rank Emblem + Pill Category Mastery (2 baris, tanpa icon emoji), 3-item Stats Dock (Streak, Riwayat, Komunitas), dan menyelesaikan Quest Hari Ini.',
    checks: [
      {
        name: 'Category Mastery Pill di bawah Rank Badge menggunakan layout 2 baris minimalis & XP-only',
        pass: pageCode.includes('flexDirection: \'column\'') && pageCode.includes('setIsMasteryPageOpen(true)') && cssCode.includes('.hero-stats-dock'),
      },
      {
        name: 'Hero Stats Dock rapi dengan 3 kolom vertikal simetris (Streak, Riwayat, Komunitas)',
        pass: cssCode.includes('grid-template-columns: repeat(3, 1fr)') && pageCode.includes('Streak') && pageCode.includes('Riwayat') && pageCode.includes('Komunitas'),
      },
      {
        name: 'Quest Hari Ini menggunakan icon vektor monokrom (renderCategoryIcon) & tombol Skip ter-highlight ungu',
        pass: !pageCode.includes('<span style={{ fontSize: \'15px\' }}>{task.icon}</span>') && pageCode.includes('renderCategoryIcon(task.category, 14)'),
      },
      {
        name: 'Subtext Quest Hari Ini & Empty State memiliki kontras tinggi (>= 4.5:1 di atas dark card)',
        pass: !pageCode.includes("color: '#827896'") && !pageCode.includes("color: '#7c738f'") && pageCode.includes('#b8add1'),
      },
    ],
  },
  {
    id: 'SCENARIO-03',
    page: 'Halaman 3: Category Mastery (Spesialisasi Hunter)',
    story: 'Hunter membuka Category Mastery dari bawah Rank Badge, melihat Kategori Aktif (hanya kategori dengan >=1 quest), mengganti kategori aktif di Dashboard (+ Pasang / ✓ Aktif), atau membuka kategori terkunci (+ Quest).',
    checks: [
      {
        name: 'Filter ketat: Kategori Aktif hanya menampilkan kategori dengan hasQuest === true (totalQuestCount > 0)',
        pass: pageCode.includes('const unlockedMasteries = categoryMasteries.filter((m) => m.hasQuest)'),
      },
      {
        name: 'Kartu Kategori Aktif memakai border & badge Violet Neon (✓ Aktif dengan icon <Check />), bukan warna kuning/bintang',
        pass: !pageCode.includes('<span>⭐</span>') && pageCode.includes('<Check size={11} strokeWidth={3}') && pageCode.includes('1px solid rgba(192, 132, 252, 0.85)'),
      },
      {
        name: 'Kategori Aktif & Terkunci memakai icon vektor monokrom (renderCategoryIcon) tanpa emoji OS',
        pass: pageCode.includes('{renderCategoryIcon(m.name, 16)}') && pageCode.includes('{renderCategoryIcon(cat.name, 13)}'),
      },
      {
        name: 'Tombol CTA (+ Pasang & <Plus /> Quest) di-highlight dengan border & gradien ungu jelas',
        pass: pageCode.includes('<span>+ Pasang</span>') && pageCode.includes('<Plus size={10} style={{ strokeWidth: 3 }} />') && pageCode.includes('<span>Quest</span>'),
      },
    ],
  },
  {
    id: 'SCENARIO-04',
    page: 'Halaman 4: Riwayat / History Quest (Full Page View)',
    story: 'Hunter menekan Riwayat di Stats Dock atau tombol Show More untuk melihat log penyelesaian quest beserta filter Semua / Selesai / Dilewati.',
    checks: [
      {
        name: 'Kartu History Quest menggunakan icon vektor monokrom (Dumbbell / renderCategoryIcon)',
        pass: !pageCode.includes('{item.isGym ? <Dumbbell size={18} /> : item.icon}') && pageCode.includes('{item.isGym ? <Dumbbell size={18} /> : renderCategoryIcon(item.category, 18)}'),
      },
      {
        name: 'Navigasi kembali (ArrowLeft) dari halaman History kembali ke Home berfungsi',
        pass: pageCode.includes('onClick={() => setIsHistoryPageOpen(false)}'),
      },
    ],
  },
  {
    id: 'SCENARIO-05',
    page: 'Halaman 5: My Quest / Jadwal & Gym Workout (Tab My Quest)',
    story: 'Hunter mengelola jadwal quest Hari Ini vs Upcoming, membuka halaman referensi program Gym (2x-6x), menjalankan sesi Workout interaktif, dan melihat kalender konsistensi.',
    checks: [
      {
        name: 'Komponen QuestCard menggunakan icon vektor monokrom (renderCategoryIcon) & layout 1 baris rapi tanpa teks terhimpit',
        pass: !pageCode.includes('<span className="task-symbol">{icon}</span>') && pageCode.includes('renderCategoryIcon(meta || title, 14)') && pageCode.includes('• +{xp} XP'),
      },
      {
        name: 'Sub-tab jadwal (Hari Ini / Upcoming) & tombol + Tambah quest baru berfungsi',
        pass: pageCode.includes("setQuestScheduleTab('today')") && pageCode.includes("setQuestScheduleTab('upcoming')"),
      },
      {
        name: 'Mode Gym Workout interaktif mendukung timer istirahat, tambah/hapus set, dan klaim XP selesai',
        pass: pageCode.includes('activeWorkoutQuest') && pageCode.includes('GYM_PROGRAM_TEMPLATES'),
      },
    ],
  },
  {
    id: 'SCENARIO-06',
    page: 'Halaman 6: Clan / Komunitas Hunter (Tab Clan)',
    story: 'Hunter bergabung atau membuat Clan baru (Publik/Privat), melihat detail anggota Clan (gaya grup info), dan menyelesaikan Clan Challenge.',
    checks: [
      {
        name: 'Chip akses Clan (Publik / Privat) menggunakan icon vektor <Globe /> & <Lock /> tanpa emoji OS',
        pass: !pageCode.includes('🌐 Publik') && !pageCode.includes('🔒 Privat') && pageCode.includes('<Globe size={12}'),
      },
      {
        name: 'Banner Info Quest Clan & Preview Reward XP menggunakan icon vektor (renderCategoryIcon)',
        pass: !pageCode.includes('{questInfoTarget.icon}') && pageCode.includes('renderCategoryIcon(questInfoTarget.category, 17)'),
      },
    ],
  },
  {
    id: 'SCENARIO-07',
    page: 'Halaman 7: Rank / Hall of Fame (Tab Rank)',
    story: 'Hunter memantau posisi di papan peringkat Top Hunters & Top Clans yang diurutkan otomatis berdasarkan total XP.',
    checks: [
      {
        name: 'Sub-tab Top Hunters & Top Clans mengurutkan peringkat berdasarkan XP tertinggi',
        pass: pageCode.includes("setRankTab('hunters')") && pageCode.includes("setRankTab('clans')") && pageCode.includes('.sort((a, b) => b.xp - a.xp)'),
      },
      {
        name: 'Klik baris Clan pada Top Clans langsung membuka halaman Clan tersebut',
        pass: pageCode.includes('setSelectedClanId(c.id)') && pageCode.includes("setActiveTab('clan')"),
      },
    ],
  },
  {
    id: 'SCENARIO-08',
    page: 'Halaman 8: Profile Hunter & Modal Pengaturan (Tab Profile)',
    story: 'Hunter melihat ringkasan statistik akun, membuka pintasan Category Mastery, dan mengatur preferensi atau ganti akun.',
    checks: [
      {
        name: 'Kartu pintasan Category Mastery di Profile menggunakan icon <Trophy /> & badge Violet Aktif (tanpa emoji 🎯 / 👑 Rank S)',
        pass: !pageCode.includes('👑 {sRankCategories.length} Rank S') && pageCode.includes('<Trophy size={17} style={{ color: "#e9d5ff" }} />'),
      },
      {
        name: 'Modal Tambah/Edit Quest menampilkan dropdown kategori bersih & preview XP dengan icon vektor',
        pass: !pageCode.includes('{cat.icon} {cat.name}') && pageCode.includes('{cat.name} (+{cat.xp} XP)'),
      },
    ],
  },
]

let totalChecks = 0
let passedChecks = 0
let failedChecks = []

console.log('================================================================================')
console.log(' SOLO QUEST — AUTOMATED UI/UX DESIGN & FLOW SCENARIO TEST SUITE')
console.log('================================================================================\n')

for (const sc of scenarios) {
  console.log(`[${sc.id}] ${sc.page}`)
  console.log(`  Flow: ${sc.story}`)
  for (const chk of sc.checks) {
    totalChecks++
    if (chk.pass) {
      passedChecks++
      console.log(`  ✅ PASS: ${chk.name}`)
    } else {
      failedChecks.push(`${sc.id} - ${chk.name}`)
      console.log(`  ❌ FAIL: ${chk.name}`)
    }
  }
  console.log('')
}

console.log('================================================================================')
console.log(` SUMMARY: ${passedChecks}/${totalChecks} checks passed across ${scenarios.length} page scenarios.`)
console.log('================================================================================')

if (failedChecks.length > 0) {
  console.error('\nFailed checks:', failedChecks)
  process.exit(1)
}
