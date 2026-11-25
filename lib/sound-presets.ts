export type RingtoneCategoryId = 'alarm' | 'entry' | 'accept' | 'skip'

export type RingtoneSelections = Record<RingtoneCategoryId, number>

export const RINGTONE_STORAGE_KEY = 'solo_ringtone_selections_v1'

export const DEFAULT_RINGTONE_SELECTIONS: RingtoneSelections = {
  alarm: 6, // #7 Shadow Monarch Gong
  entry: 1, // #2 System Online Boot
  accept: 4, // #5 Mana Charge Ready
  skip: 1, // #2 Tactical Retreat
}

export interface RingtonePreset {
  name: string
  desc: string
  play: (ctx: AudioContext) => void
}

export interface RingtoneCategory {
  id: RingtoneCategoryId
  eyebrow: string
  eyebrowColor: string
  title: string
  items: RingtonePreset[]
}

interface ToneOptions {
  type?: OscillatorType
  gain?: number
  endFreq?: number | null
  attack?: number
  filterFreq?: number | null
  detune?: number
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  opts: ToneOptions = {}
) {
  const {
    type = 'sine',
    gain = 0.18,
    endFreq = null,
    attack = 0.01,
    filterFreq = null,
    detune = 0,
  } = opts
  const now = ctx.currentTime + startOffset
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (detune) osc.detune.setValueAtTime(detune, now)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration)

  g.gain.setValueAtTime(0.0001, now)
  g.gain.linearRampToValueAtTime(gain, now + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  if (filterFreq) {
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(filterFreq, now)
    osc.connect(f)
    f.connect(g)
  } else {
    osc.connect(g)
  }
  g.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration + 0.03)
}

function playChord(
  ctx: AudioContext,
  freqs: number[],
  startOffset: number,
  duration: number,
  opts: ToneOptions & { stagger?: number } = {}
) {
  const stagger = opts.stagger ?? 0
  freqs.forEach((f, i) => playTone(ctx, f, startOffset + i * stagger, duration, opts))
}

export const RINGTONE_CATEGORIES: RingtoneCategory[] = [
  {
    id: 'alarm',
    eyebrow: 'EVENT 1 • RINGTONE NOTIFIKASI',
    eyebrowColor: '#38bdf8',
    title: '1. Quest Masuk Waktunya',
    items: [
      {
        name: 'System Awakening Chime',
        desc: 'Chime kristal biru Solo Leveling + sub-bass',
        play: (c) => {
          playTone(c, 110, 0, 0.5, { type: 'sine', gain: 0.25 })
          playChord(c, [523.25, 659.25, 783.99, 1046.5], 0.02, 0.55, {
            type: 'triangle',
            gain: 0.13,
            stagger: 0.055,
          })
        },
      },
      {
        name: 'Cyber Radar Ping',
        desc: 'Sonar futuristik 2x pulse dengan echo',
        play: (c) => {
          ;[0, 0.24].forEach((t) => {
            playTone(c, 880, t, 0.22, { type: 'sine', gain: 0.2 })
            playTone(c, 1318.5, t + 0.04, 0.24, { type: 'triangle', gain: 0.12 })
          })
        },
      },
      {
        name: 'Dungeon Gate Open',
        desc: 'Dentuman sub dalam + lonceng gerbang',
        play: (c) => {
          playTone(c, 130, 0, 0.6, { endFreq: 55, type: 'sine', gain: 0.3 })
          playChord(c, [293.66, 440, 587.33], 0.06, 0.7, {
            type: 'sawtooth',
            gain: 0.08,
            filterFreq: 1600,
            stagger: 0.04,
          })
        },
      },
      {
        name: 'Hunter Horn Call',
        desc: 'Brass synth heroik nada ke-5',
        play: (c) => {
          playTone(c, 220, 0, 0.22, { type: 'sawtooth', gain: 0.11, filterFreq: 1400 })
          playTone(c, 329.63, 0.16, 0.48, { type: 'sawtooth', gain: 0.14, filterFreq: 1900 })
          playTone(c, 440, 0.16, 0.48, { type: 'triangle', gain: 0.12 })
        },
      },
      {
        name: 'Arcane Crystal Bell',
        desc: 'Arpeggio kristal cepat oktaf tinggi',
        play: (c) => {
          playChord(c, [659.25, 783.99, 987.77, 1318.5, 1567.98], 0, 0.38, {
            type: 'sine',
            gain: 0.14,
            stagger: 0.045,
          })
        },
      },
      {
        name: 'Tactical Alert Pulse',
        desc: '3-note telemetri sci-fi tajam',
        play: (c) => {
          ;[587.33, 739.99, 880].forEach((f, i) =>
            playTone(c, f, i * 0.11, 0.16, { type: 'square', gain: 0.07, filterFreq: 2200 })
          )
        },
      },
      {
        name: 'Shadow Monarch Gong',
        desc: 'Resonansi metalik gelap + shimmer',
        play: (c) => {
          playTone(c, 98, 0, 0.85, { type: 'sine', gain: 0.28 })
          playTone(c, 196, 0, 0.75, { type: 'triangle', gain: 0.15, detune: 8 })
          playTone(c, 293.66, 0.05, 0.65, { type: 'sine', gain: 0.11 })
        },
      },
      {
        name: 'Chrono Trigger Alarm',
        desc: 'Triad naik berulang penuh urgensi',
        play: (c) => {
          ;[0, 0.28].forEach((t) =>
            playChord(c, [440, 554.37, 659.25], t, 0.18, {
              type: 'triangle',
              gain: 0.14,
              stagger: 0.05,
            })
          )
        },
      },
      {
        name: 'Mana Surge Notification',
        desc: 'Filter sweep cair + denting mana',
        play: (c) => {
          playTone(c, 220, 0, 0.28, {
            endFreq: 880,
            type: 'sawtooth',
            gain: 0.1,
            filterFreq: 2400,
          })
          playTone(c, 1046.5, 0.2, 0.45, { type: 'sine', gain: 0.18 })
        },
      },
      {
        name: 'VIP Holo Chime',
        desc: 'Lonceng kaca modern elegan & bersih',
        play: (c) => {
          playChord(c, [587.33, 880, 1174.66], 0, 0.55, {
            type: 'sine',
            gain: 0.16,
            stagger: 0.07,
          })
        },
      },
    ],
  },
  {
    id: 'entry',
    eyebrow: 'EVENT 2 • APP ENTRY REMINDER',
    eyebrowColor: '#a78bfa',
    title: '2. Masuk App & Ada Quest',
    items: [
      {
        name: 'Lobby Briefing Ready',
        desc: 'Chord RPG hangat menyambut Hunter',
        play: (c) => {
          playChord(c, [261.63, 329.63, 392.0, 493.88], 0, 0.5, {
            type: 'triangle',
            gain: 0.11,
            stagger: 0.04,
          })
        },
      },
      {
        name: 'System Online Boot',
        desc: 'Startup HUD futuristik naik halus',
        play: (c) => {
          playTone(c, 180, 0, 0.22, { endFreq: 540, type: 'sine', gain: 0.18 })
          playTone(c, 720, 0.18, 0.32, { type: 'triangle', gain: 0.14 })
        },
      },
      {
        name: 'Guild Board Notice',
        desc: '2-nada lembut papan quest',
        play: (c) => {
          playTone(c, 523.25, 0, 0.18, { type: 'triangle', gain: 0.15 })
          playTone(c, 659.25, 0.1, 0.3, { type: 'sine', gain: 0.17 })
        },
      },
      {
        name: 'Status Window Open',
        desc: 'Shimmer udara kaca saat panel muncul',
        play: (c) => {
          playChord(c, [440, 659.25, 987.77], 0, 0.42, {
            type: 'sine',
            gain: 0.12,
            stagger: 0.035,
          })
        },
      },
      {
        name: 'Hunter Presence Pulse',
        desc: 'Sub lembut + kilau tinggi singkat',
        play: (c) => {
          playTone(c, 85, 0, 0.28, { type: 'sine', gain: 0.24 })
          playTone(c, 1174.66, 0.04, 0.26, { type: 'sine', gain: 0.12 })
        },
      },
      {
        name: 'Daily Mission Sync',
        desc: 'Arpeggio sinkronisasi data cepat',
        play: (c) => {
          playChord(c, [440, 523.25, 659.25, 880], 0, 0.2, {
            type: 'triangle',
            gain: 0.12,
            stagger: 0.04,
          })
        },
      },
      {
        name: 'Aura Resonance',
        desc: 'Pad ambient halus & misterius',
        play: (c) => {
          playChord(c, [220, 293.66, 440], 0, 0.65, {
            type: 'sine',
            gain: 0.12,
            attack: 0.08,
          })
        },
      },
      {
        name: 'Quest Log Unfold',
        desc: 'Bunyi lembut membuka log harian',
        play: (c) => {
          playTone(c, 392, 0, 0.14, { type: 'triangle', gain: 0.14 })
          playTone(c, 587.33, 0.07, 0.24, { type: 'triangle', gain: 0.14 })
        },
      },
      {
        name: 'Command Deck Ready',
        desc: 'Double-blip taktis ringan',
        play: (c) => {
          playTone(c, 740, 0, 0.09, { type: 'sine', gain: 0.15 })
          playTone(c, 987.77, 0.11, 0.16, { type: 'sine', gain: 0.15 })
        },
      },
      {
        name: 'Morning Citadel Bell',
        desc: 'Denting cerah pembuka hari',
        play: (c) => {
          playChord(c, [523.25, 783.99, 1046.5], 0, 0.48, {
            type: 'sine',
            gain: 0.14,
            stagger: 0.05,
          })
        },
      },
    ],
  },
  {
    id: 'accept',
    eyebrow: 'EVENT 3 • TOMBOL TERIMA QUEST',
    eyebrowColor: '#34d399',
    title: '3. Pencet "Terima Quest"',
    items: [
      {
        name: 'Quest Accepted Lock-In',
        desc: 'Punch tegas + chord naik penuh tenaga',
        play: (c) => {
          playTone(c, 140, 0, 0.2, { endFreq: 55, type: 'sine', gain: 0.28 })
          playChord(c, [440, 554.37, 880], 0.03, 0.35, {
            type: 'triangle',
            gain: 0.15,
            stagger: 0.04,
          })
        },
      },
      {
        name: 'Sword Unsheathe Hit',
        desc: 'Kilau tajam pedang + sub punch',
        play: (c) => {
          playTone(c, 160, 0, 0.18, { endFreq: 60, type: 'sine', gain: 0.28 })
          playTone(c, 1200, 0, 0.24, {
            endFreq: 2400,
            type: 'sawtooth',
            gain: 0.07,
            filterFreq: 3200,
          })
          playTone(c, 1567.98, 0.06, 0.3, { type: 'sine', gain: 0.14 })
        },
      },
      {
        name: 'Level-Up Spark',
        desc: 'Arpeggio 4-nada RPG klasik modern',
        play: (c) => {
          playChord(c, [523.25, 659.25, 783.99, 1046.5], 0, 0.26, {
            type: 'triangle',
            gain: 0.15,
            stagger: 0.05,
          })
        },
      },
      {
        name: 'System Confirmed!',
        desc: 'Kunci cyber presisi + ring harmonik',
        play: (c) => {
          playTone(c, 660, 0, 0.08, { type: 'square', gain: 0.08, filterFreq: 2400 })
          playTone(c, 1320, 0.07, 0.28, { type: 'triangle', gain: 0.16 })
        },
      },
      {
        name: 'Mana Charge Ready',
        desc: 'Sweep energi naik lalu snap',
        play: (c) => {
          playTone(c, 220, 0, 0.2, { endFreq: 880, type: 'triangle', gain: 0.14 })
          playTone(c, 1046.5, 0.16, 0.25, { type: 'sine', gain: 0.2 })
        },
      },
      {
        name: 'Shadow Contract Sealed',
        desc: 'Bass berat + denting kontrak',
        play: (c) => {
          playTone(c, 95, 0, 0.35, { type: 'sine', gain: 0.32 })
          playChord(c, [392, 587.33, 783.99], 0.03, 0.38, {
            type: 'sine',
            gain: 0.14,
            stagger: 0.03,
          })
        },
      },
      {
        name: 'Heroic Fanfare Mini',
        desc: 'Hit kemenangan major-9th',
        play: (c) => {
          playChord(c, [392, 493.88, 587.33, 783.99], 0, 0.4, {
            type: 'sawtooth',
            gain: 0.08,
            filterFreq: 2200,
            stagger: 0.045,
          })
        },
      },
      {
        name: 'Laser Stamp Confirm',
        desc: 'Stempel sci-fi cepat + gema',
        play: (c) => {
          playTone(c, 987.77, 0, 0.12, { endFreq: 493.88, type: 'triangle', gain: 0.18 })
          playTone(c, 1479.98, 0.08, 0.24, { type: 'sine', gain: 0.16 })
        },
      },
      {
        name: 'Rankerz Strike',
        desc: 'Synth perkusif tegas + ekor cerah',
        play: (c) => {
          playTone(c, 180, 0, 0.14, { endFreq: 65, type: 'triangle', gain: 0.28 })
          playTone(c, 783.99, 0.02, 0.28, {
            type: 'sawtooth',
            gain: 0.09,
            filterFreq: 2500,
          })
          playTone(c, 1174.66, 0.07, 0.3, { type: 'sine', gain: 0.15 })
        },
      },
      {
        name: 'Emerald Crystal Lock',
        desc: 'Double-tap kaca emerald super bersih',
        play: (c) => {
          playTone(c, 880, 0, 0.1, { type: 'sine', gain: 0.16 })
          playTone(c, 1318.5, 0.08, 0.28, { type: 'sine', gain: 0.2 })
        },
      },
    ],
  },
  {
    id: 'skip',
    eyebrow: 'EVENT 4 • TOMBOL SKIP QUEST',
    eyebrowColor: '#fb7185',
    title: '4. Pencet "Skip Quest"',
    items: [
      {
        name: 'Soft Whoosh Dismiss',
        desc: 'Sweep filter turun yang halus & bersih',
        play: (c) => {
          playTone(c, 520, 0, 0.24, {
            endFreq: 140,
            type: 'triangle',
            gain: 0.16,
            filterFreq: 900,
          })
        },
      },
      {
        name: 'Tactical Retreat',
        desc: '2-nada turun minor yang kalem',
        play: (c) => {
          playTone(c, 440, 0, 0.14, { type: 'sine', gain: 0.15 })
          playTone(c, 329.63, 0.1, 0.22, { type: 'sine', gain: 0.14 })
        },
      },
      {
        name: 'Shadow Fade Out',
        desc: 'Drop gelap low-pass ke bayangan',
        play: (c) => {
          playTone(c, 260, 0, 0.3, {
            endFreq: 85,
            type: 'sawtooth',
            gain: 0.09,
            filterFreq: 600,
          })
        },
      },
      {
        name: 'Card Slide Pass',
        desc: 'Gesekan taktil singkat buang kartu',
        play: (c) => {
          playTone(c, 380, 0, 0.12, { endFreq: 170, type: 'sine', gain: 0.18 })
        },
      },
      {
        name: 'System Bypass Blip',
        desc: 'Nada cyber bypass minimalis',
        play: (c) => {
          playTone(c, 620, 0, 0.08, { type: 'triangle', gain: 0.14 })
          playTone(c, 415, 0.07, 0.16, { type: 'triangle', gain: 0.12 })
        },
      },
      {
        name: 'Cooldown Shift',
        desc: 'Turun mekanis lembut mode istirahat',
        play: (c) => {
          playTone(c, 330, 0, 0.22, { endFreq: 165, type: 'triangle', gain: 0.15 })
        },
      },
      {
        name: 'Mist Vanish',
        desc: 'Shimmer lembut menghilang ke bawah',
        play: (c) => {
          playChord(c, [493.88, 392, 293.66], 0, 0.2, {
            type: 'sine',
            gain: 0.11,
            stagger: 0.045,
          })
        },
      },
      {
        name: 'Holo Minimize',
        desc: 'Pop kaca turun ala tutup jendela UI',
        play: (c) => {
          playTone(c, 680, 0, 0.11, { endFreq: 310, type: 'sine', gain: 0.18 })
        },
      },
      {
        name: 'Silent Guard Skip',
        desc: 'Thud rendah lembut + klik pelan',
        play: (c) => {
          playTone(c, 120, 0, 0.16, { endFreq: 55, type: 'sine', gain: 0.24 })
        },
      },
      {
        name: 'Time Warp Skip',
        desc: 'Efek phase-down sci-fi cepat',
        play: (c) => {
          playTone(c, 740, 0, 0.18, {
            endFreq: 210,
            type: 'sawtooth',
            gain: 0.08,
            filterFreq: 1100,
          })
        },
      },
    ],
  },
]

export function playRingtonePreset(
  ctx: AudioContext,
  categoryId: RingtoneCategoryId,
  index: number
) {
  const cat = RINGTONE_CATEGORIES.find((c) => c.id === categoryId)
  if (!cat || !cat.items.length) return
  const safeIndex = Math.max(0, Math.min(cat.items.length - 1, index))
  const preset = cat.items[safeIndex]
  if (ctx.state === 'suspended') {
    ctx
      .resume()
      .then(() => preset.play(ctx))
      .catch(() => {})
  } else {
    preset.play(ctx)
  }
}
