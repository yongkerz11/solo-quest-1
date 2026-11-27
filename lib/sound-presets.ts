export type RingtoneCategoryId = 'alarm' | 'entry' | 'accept' | 'skip'

export type RingtoneSelections = Record<RingtoneCategoryId, number>

export const RINGTONE_STORAGE_KEY = 'solo_ringtone_selections_v2'

export const DEFAULT_RINGTONE_SELECTIONS: RingtoneSelections = {
  alarm: 0, // #1 "ARISE" — Shadow Monarch Awakening
  entry: 2, // #3 "DAREDEVIL" — Hell's Kitchen Echolocation
  accept: 5, // #6 "SHADOW DAGGER" — Kasaka Blade Unsheathe
  skip: 7, // #8 "SIGMA PROTOCOL" — Cold Minimalist Drop
}

export interface RingtonePreset {
  name: string
  tag: string
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

interface AudioBus {
  dry: GainNode
  wet: ConvolverNode
  shaperCurve: Float32Array<ArrayBuffer>
}

const busCache = new WeakMap<AudioContext, AudioBus>()

function makeDistortionCurve(amount = 24): Float32Array<ArrayBuffer> {
  const n = 44100
  const curve = new Float32Array(new ArrayBuffer(n * 4))
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x))
  }
  return curve
}

function createDarkReverb(c: AudioContext, duration = 2.2, decay = 2.6): ConvolverNode {
  const length = Math.floor(c.sampleRate * duration)
  const impulse = c.createBuffer(2, length, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    let last = 0
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay)
      const white = Math.random() * 2 - 1
      last = last * 0.72 + white * 0.28
      data[i] = last * env * 0.85
    }
  }
  const convolver = c.createConvolver()
  convolver.buffer = impulse
  return convolver
}

function getBus(c: AudioContext): AudioBus {
  const cached = busCache.get(c)
  if (cached) return cached

  const comp = c.createDynamicsCompressor()
  comp.threshold.setValueAtTime(-14, c.currentTime)
  comp.knee.setValueAtTime(18, c.currentTime)
  comp.ratio.setValueAtTime(6, c.currentTime)
  comp.attack.setValueAtTime(0.004, c.currentTime)
  comp.release.setValueAtTime(0.18, c.currentTime)

  const dry = c.createGain()
  dry.gain.setValueAtTime(0.92, c.currentTime)

  const wet = createDarkReverb(c, 2.2, 2.6)
  const revGain = c.createGain()
  revGain.gain.setValueAtTime(0.42, c.currentTime)

  dry.connect(comp)
  wet.connect(revGain)
  revGain.connect(comp)
  comp.connect(c.destination)

  const bus: AudioBus = {
    dry,
    wet,
    shaperCurve: makeDistortionCurve(24),
  }
  busCache.set(c, bus)
  return bus
}

interface ToneOpts {
  freq: number
  endFreq?: number | null
  offset?: number
  dur?: number
  type?: OscillatorType
  gain?: number
  attack?: number
  filterFreq?: number | null
  filterEnd?: number | null
  Q?: number
  detune?: number
  wet?: number
  saturate?: boolean
}

function tone(c: AudioContext, opts: ToneOpts) {
  const {
    freq,
    endFreq = null,
    offset = 0,
    dur = 0.5,
    type = 'sine',
    gain = 0.22,
    attack = 0.01,
    filterFreq = null,
    filterEnd = null,
    Q = 1.2,
    detune = 0,
    wet = 0.35,
    saturate = false,
  } = opts
  const bus = getBus(c)
  const now = c.currentTime + offset
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  if (detune) osc.detune.setValueAtTime(detune, now)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + dur)

  g.gain.setValueAtTime(0.0001, now)
  g.gain.linearRampToValueAtTime(gain, now + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  let node: AudioNode = osc
  if (saturate) {
    const ws = c.createWaveShaper()
    ws.curve = bus.shaperCurve
    ws.oversample = '2x'
    node.connect(ws)
    node = ws
  }
  if (filterFreq) {
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.Q.setValueAtTime(Q, now)
    f.frequency.setValueAtTime(filterFreq, now)
    if (filterEnd) f.frequency.exponentialRampToValueAtTime(Math.max(40, filterEnd), now + dur)
    node.connect(f)
    node = f
  }
  node.connect(g)
  g.connect(bus.dry)
  if (wet > 0) {
    const send = c.createGain()
    send.gain.setValueAtTime(wet, now)
    g.connect(send)
    send.connect(bus.wet)
  }
  osc.start(now)
  osc.stop(now + dur + 0.05)
}

interface FmBellOpts {
  carrier: number
  modRatio?: number
  modIndex?: number
  offset?: number
  dur?: number
  gain?: number
  wet?: number
  attack?: number
}

function fmBell(c: AudioContext, opts: FmBellOpts) {
  const {
    carrier,
    modRatio = 1.414,
    modIndex = 360,
    offset = 0,
    dur = 1.1,
    gain = 0.18,
    wet = 0.65,
    attack = 0.006,
  } = opts
  const bus = getBus(c)
  const now = c.currentTime + offset
  const car = c.createOscillator()
  const mod = c.createOscillator()
  const modG = c.createGain()
  const g = c.createGain()

  car.type = 'sine'
  mod.type = 'sine'
  car.frequency.setValueAtTime(carrier, now)
  mod.frequency.setValueAtTime(carrier * modRatio, now)
  modG.gain.setValueAtTime(modIndex, now)
  modG.gain.exponentialRampToValueAtTime(2, now + dur * 0.75)

  g.gain.setValueAtTime(0.0001, now)
  g.gain.linearRampToValueAtTime(gain, now + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  mod.connect(modG)
  modG.connect(car.frequency)
  car.connect(g)
  g.connect(bus.dry)
  if (wet > 0) {
    const send = c.createGain()
    send.gain.setValueAtTime(wet, now)
    g.connect(send)
    send.connect(bus.wet)
  }
  car.start(now)
  mod.start(now)
  car.stop(now + dur + 0.05)
  mod.stop(now + dur + 0.05)
}

interface NoiseSweepOpts {
  offset?: number
  dur?: number
  freqStart?: number
  freqEnd?: number
  Q?: number
  gain?: number
  wet?: number
}

function noiseSweep(c: AudioContext, opts: NoiseSweepOpts) {
  const {
    offset = 0,
    dur = 0.35,
    freqStart = 1200,
    freqEnd = 4200,
    Q = 3.5,
    gain = 0.18,
    wet = 0.45,
  } = opts
  const bus = getBus(c)
  const now = c.currentTime + offset
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI)
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.setValueAtTime(Q, now)
  bp.frequency.setValueAtTime(freqStart, now)
  bp.frequency.exponentialRampToValueAtTime(Math.max(60, freqEnd), now + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  src.connect(bp)
  bp.connect(g)
  g.connect(bus.dry)
  if (wet > 0) {
    const send = c.createGain()
    send.gain.setValueAtTime(wet, now)
    g.connect(send)
    send.connect(bus.wet)
  }
  src.start(now)
}

export const SIGMA_SOUND_PRESETS: RingtonePreset[] = [
  {
    name: '"ARISE" — Shadow Monarch Awakening',
    tag: 'SUNG JIN-WOO',
    desc: 'Sub-drop abyssal dalam + Reese dark fifths + denting kristal dingin bergema.',
    play: (c) => {
      tone(c, {
        freq: 92,
        endFreq: 32,
        dur: 0.95,
        type: 'sine',
        gain: 0.44,
        attack: 0.008,
        wet: 0.25,
        saturate: true,
      })
      ;[73.42, 110.0, 146.83].forEach((f) => {
        ;[-11, 11].forEach((det) => {
          tone(c, {
            freq: f,
            offset: 0.04,
            dur: 1.25,
            type: 'sawtooth',
            gain: 0.075,
            attack: 0.14,
            filterFreq: 950,
            filterEnd: 180,
            Q: 3.2,
            detune: det,
            wet: 0.55,
          })
        })
      })
      fmBell(c, {
        carrier: 1174.66,
        modRatio: 1.414,
        modIndex: 320,
        offset: 0.12,
        dur: 1.15,
        gain: 0.14,
        wet: 0.85,
      })
      fmBell(c, {
        carrier: 587.33,
        modRatio: 2.0,
        modIndex: 120,
        offset: 0.06,
        dur: 1.0,
        gain: 0.12,
        wet: 0.7,
      })
    },
  },
  {
    name: '"THE BATMAN" — Gotham Dark Braaam',
    tag: 'BATMAN',
    desc: 'Brass sinematik berat ala Hans Zimmer / Gotham + hentakan anvil besi dingin.',
    play: (c) => {
      tone(c, {
        freq: 110,
        endFreq: 36,
        dur: 0.5,
        type: 'sine',
        gain: 0.48,
        attack: 0.004,
        saturate: true,
        wet: 0.2,
      })
      ;[65.41, 98.0, 130.81].forEach((f) => {
        ;[-14, 0, 14].forEach((det) => {
          tone(c, {
            freq: f,
            offset: 0.02,
            dur: 1.35,
            type: 'sawtooth',
            gain: 0.075,
            attack: 0.05,
            filterFreq: 1650,
            filterEnd: 240,
            Q: 2.4,
            detune: det,
            saturate: true,
            wet: 0.55,
          })
        })
      })
      fmBell(c, {
        carrier: 392.0,
        modRatio: 2.76,
        modIndex: 520,
        offset: 0,
        dur: 0.65,
        gain: 0.16,
        wet: 0.75,
      })
    },
  },
  {
    name: '"DAREDEVIL" — Hell\'s Kitchen Echolocation',
    tag: 'DAREDEVIL',
    desc: 'Detak jantung sub-bass + pulse sonar radar tajam yang memantul di kegelapan.',
    play: (c) => {
      tone(c, { freq: 62, endFreq: 34, offset: 0, dur: 0.18, type: 'sine', gain: 0.45, attack: 0.005, wet: 0.1 })
      tone(c, { freq: 56, endFreq: 32, offset: 0.18, dur: 0.24, type: 'sine', gain: 0.36, attack: 0.005, wet: 0.1 })
      ;[0.06, 0.34, 0.62].forEach((t, i) => {
        const amp = 0.19 * Math.pow(0.62, i)
        fmBell(c, { carrier: 1975.53, modRatio: 1.5, modIndex: 180, offset: t, dur: 0.45, gain: amp, wet: 0.85 })
        tone(c, { freq: 987.77, offset: t, dur: 0.26, type: 'sine', gain: amp * 0.7, wet: 0.75 })
      })
    },
  },
  {
    name: '"SYSTEM: COLD LOCK" — Lethal HUD Confirm',
    tag: 'SUNG JIN-WOO',
    desc: 'Klik sub presisi + 3-nada kaca dingin tanpa emosi. Bersih, tajam, mematikan.',
    play: (c) => {
      tone(c, { freq: 140, endFreq: 42, offset: 0, dur: 0.14, type: 'sine', gain: 0.42, attack: 0.003, wet: 0.12 })
      noiseSweep(c, { offset: 0, dur: 0.055, freqStart: 2800, freqEnd: 1200, Q: 5, gain: 0.2, wet: 0.3 })
      ;[659.25, 987.77, 1318.51].forEach((f, i) => {
        fmBell(c, {
          carrier: f,
          modRatio: 2.0,
          modIndex: 140,
          offset: 0.04 + i * 0.065,
          dur: 0.48,
          gain: 0.14,
          wet: 0.65,
          attack: 0.004,
        })
      })
    },
  },
  {
    name: '"DARK KNIGHT SONAR" — Bat-Computer Ping',
    tag: 'BATMAN',
    desc: 'Telemetri enkripsi Batcave: double-ping sonar tajam + kunci bass taktis.',
    play: (c) => {
      tone(c, {
        freq: 82.41,
        endFreq: 41.2,
        offset: 0,
        dur: 0.38,
        type: 'triangle',
        gain: 0.36,
        attack: 0.006,
        filterFreq: 420,
        wet: 0.25,
      })
      ;[0, 0.26].forEach((t) => {
        tone(c, { freq: 880, offset: t, dur: 0.16, type: 'sine', gain: 0.18, wet: 0.75 })
        fmBell(c, { carrier: 1760, modRatio: 1.414, modIndex: 220, offset: t + 0.02, dur: 0.38, gain: 0.11, wet: 0.85 })
      })
    },
  },
  {
    name: '"SHADOW DAGGER" — Kasaka Blade Unsheathe',
    tag: 'SUNG JIN-WOO',
    desc: 'Gesekan baja belati tajam ke atas + denting logam dingin + sub punch gelap.',
    play: (c) => {
      tone(c, {
        freq: 155,
        endFreq: 38,
        offset: 0.02,
        dur: 0.24,
        type: 'sine',
        gain: 0.46,
        attack: 0.004,
        saturate: true,
        wet: 0.2,
      })
      noiseSweep(c, { offset: 0, dur: 0.24, freqStart: 1800, freqEnd: 6800, Q: 4.5, gain: 0.26, wet: 0.6 })
      fmBell(c, {
        carrier: 1567.98,
        modRatio: 2.76,
        modIndex: 680,
        offset: 0.06,
        dur: 0.75,
        gain: 0.16,
        wet: 0.85,
        attack: 0.004,
      })
      fmBell(c, { carrier: 783.99, modRatio: 1.414, modIndex: 260, offset: 0.08, dur: 0.65, gain: 0.12, wet: 0.7 })
    },
  },
  {
    name: '"HELL\'S KITCHEN BELL" — Gothic Vigilante Toll',
    tag: 'DAREDEVIL',
    desc: 'Lonceng perunggu gereja gelap yang dingin + drone bass misterius.',
    play: (c) => {
      tone(c, {
        freq: 82.41,
        offset: 0,
        dur: 1.4,
        type: 'sawtooth',
        gain: 0.11,
        attack: 0.06,
        filterFreq: 420,
        filterEnd: 120,
        detune: -8,
        wet: 0.7,
      })
      tone(c, {
        freq: 82.41,
        offset: 0,
        dur: 1.4,
        type: 'sawtooth',
        gain: 0.11,
        attack: 0.06,
        filterFreq: 420,
        filterEnd: 120,
        detune: 8,
        wet: 0.7,
      })
      fmBell(c, {
        carrier: 164.81,
        modRatio: 2.756,
        modIndex: 420,
        offset: 0,
        dur: 1.45,
        gain: 0.26,
        wet: 0.9,
        attack: 0.005,
      })
      fmBell(c, { carrier: 329.63, modRatio: 1.414, modIndex: 240, offset: 0.01, dur: 1.2, gain: 0.16, wet: 0.85 })
    },
  },
  {
    name: '"SIGMA PROTOCOL" — Cold Minimalist Drop',
    tag: 'SIGMA',
    desc: 'Super minimalis & dingin: 2 nada minor jatuh + 808 sub-thump rapat.',
    play: (c) => {
      tone(c, {
        freq: 72,
        endFreq: 36,
        offset: 0,
        dur: 0.34,
        type: 'sine',
        gain: 0.46,
        attack: 0.004,
        saturate: true,
        wet: 0.15,
      })
      tone(c, { freq: 369.99, offset: 0, dur: 0.22, type: 'triangle', gain: 0.18, filterFreq: 1400, wet: 0.55 })
      tone(c, { freq: 277.18, offset: 0.14, dur: 0.42, type: 'triangle', gain: 0.16, filterFreq: 1100, wet: 0.65 })
    },
  },
  {
    name: '"MONARCH\'S DOMAIN" — Abyssal Ice Pulse',
    tag: 'SUNG JIN-WOO',
    desc: 'Desiran angin bayangan gelap + sub-pad dingin + kilau pecahan es.',
    play: (c) => {
      noiseSweep(c, { offset: 0, dur: 0.45, freqStart: 320, freqEnd: 1600, Q: 2.5, gain: 0.16, wet: 0.75 })
      ;[69.3, 103.83].forEach((f) => {
        tone(c, {
          freq: f,
          offset: 0.02,
          dur: 1.15,
          type: 'sawtooth',
          gain: 0.085,
          attack: 0.12,
          filterFreq: 680,
          filterEnd: 140,
          detune: -9,
          wet: 0.65,
        })
        tone(c, {
          freq: f,
          offset: 0.02,
          dur: 1.15,
          type: 'sawtooth',
          gain: 0.085,
          attack: 0.12,
          filterFreq: 680,
          filterEnd: 140,
          detune: 9,
          wet: 0.65,
        })
      })
      fmBell(c, { carrier: 1396.91, modRatio: 1.5, modIndex: 280, offset: 0.22, dur: 0.9, gain: 0.13, wet: 0.9 })
    },
  },
  {
    name: '"VIGILANTE OVERRIDE" — Armor Lock-In',
    tag: 'BATMAN',
    desc: 'Kunci mekanis armor taktis + dark chord naik cepat + segel logam dingin.',
    play: (c) => {
      tone(c, {
        freq: 130,
        endFreq: 40,
        offset: 0,
        dur: 0.22,
        type: 'sine',
        gain: 0.46,
        attack: 0.003,
        saturate: true,
        wet: 0.18,
      })
      noiseSweep(c, { offset: 0, dur: 0.06, freqStart: 2400, freqEnd: 900, Q: 4, gain: 0.24, wet: 0.35 })
      ;[110, 164.81, 220].forEach((f, i) => {
        tone(c, {
          freq: f,
          offset: 0.04 + i * 0.045,
          dur: 0.55,
          type: 'sawtooth',
          gain: 0.1,
          attack: 0.015,
          filterFreq: 1600,
          filterEnd: 320,
          saturate: true,
          wet: 0.55,
        })
      })
      fmBell(c, { carrier: 880, modRatio: 1.414, modIndex: 340, offset: 0.15, dur: 0.72, gain: 0.15, wet: 0.8 })
    },
  },
]

export const RINGTONE_CATEGORIES: RingtoneCategory[] = [
  {
    id: 'alarm',
    eyebrow: 'EVENT 1 • RINGTONE NOTIFIKASI',
    eyebrowColor: '#38bdf8',
    title: '1. Quest Masuk Waktunya',
    items: SIGMA_SOUND_PRESETS,
  },
  {
    id: 'entry',
    eyebrow: 'EVENT 2 • APP ENTRY REMINDER',
    eyebrowColor: '#a78bfa',
    title: '2. Masuk App & Ada Quest',
    items: SIGMA_SOUND_PRESETS,
  },
  {
    id: 'accept',
    eyebrow: 'EVENT 3 • TOMBOL TERIMA QUEST',
    eyebrowColor: '#34d399',
    title: '3. Pencet "Terima Quest"',
    items: SIGMA_SOUND_PRESETS,
  },
  {
    id: 'skip',
    eyebrow: 'EVENT 4 • TOMBOL SKIP QUEST',
    eyebrowColor: '#fb7185',
    title: '4. Pencet "Skip Quest"',
    items: SIGMA_SOUND_PRESETS,
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
