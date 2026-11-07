export type GymMuscleCategory =
  | 'Chest (Dada)'
  | 'Back (Punggung)'
  | 'Shoulder (Bahu)'
  | 'Biceps'
  | 'Triceps'
  | 'Legs'
  | 'Abs'
  | 'Forearms'

export interface GymExerciseCatalogItem {
  id: string
  name: string
  category: GymMuscleCategory
  shortCategory: string
  keywords: string[]
  defaultSets: number
  defaultReps: number
  targetNote?: string
}

export interface GymTemplateExerciseItem {
  name: string
  sets: number
  reps: number
  note?: string // contoh: "3 × 8–12"
}

export interface GymRoutineSessionTemplate {
  id: string
  title: string // contoh: "Full Body A" atau "Senin – Upper A"
  questTitle: string // nama quest saat diterapkan, contoh: "Upper A"
  recommendedDays: string[] // contoh: ['Mon']
  dayLabel: string // contoh: "Senin"
  exercises: GymTemplateExerciseItem[]
}

export interface GymProgramTemplate {
  id: string
  frequencyLabel: string // contoh: "2x Seminggu"
  title: string // contoh: "Gym 2x seminggu — Full Body"
  subtitle: string
  note?: string
  sessions: GymRoutineSessionTemplate[]
}

export const GYM_MUSCLE_CATEGORIES: {
  id: 'ALL' | GymMuscleCategory
  label: string
  shortLabel: string
  icon: string
}[] = [
  { id: 'ALL', label: 'Semua Otot', shortLabel: 'Semua', icon: '⚡' },
  { id: 'Chest (Dada)', label: 'Chest (Dada)', shortLabel: 'Chest', icon: '🫁' },
  { id: 'Back (Punggung)', label: 'Back (Punggung)', shortLabel: 'Back', icon: '🦅' },
  { id: 'Shoulder (Bahu)', label: 'Shoulder (Bahu)', shortLabel: 'Shoulder', icon: '🛡️' },
  { id: 'Biceps', label: 'Biceps', shortLabel: 'Biceps', icon: '💪' },
  { id: 'Triceps', label: 'Triceps', shortLabel: 'Triceps', icon: '🔥' },
  { id: 'Legs', label: 'Legs (Kaki)', shortLabel: 'Legs', icon: '🦵' },
  { id: 'Abs', label: 'Abs (Perut)', shortLabel: 'Abs', icon: '🎯' },
  { id: 'Forearms', label: 'Forearms', shortLabel: 'Forearms', icon: '✊' },
]

export const GYM_EXERCISE_LIBRARY: GymExerciseCatalogItem[] = [
  // ============================================================================
  // 1. CHEST (DADA)
  // ============================================================================
  {
    id: 'chest-bench-press',
    name: 'Bench Press',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada', 'flat bench', 'barbell bench press', 'bb bench', 'push', 'dorong'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 8–12',
  },
  {
    id: 'chest-incline-bench-press',
    name: 'Incline Bench Press',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada atas', 'upper chest', 'incline barbell', 'bench press', 'push'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'chest-decline-bench-press',
    name: 'Decline Bench Press',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada bawah', 'lower chest', 'decline barbell', 'bench press', 'push'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 8–12',
  },
  {
    id: 'chest-dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada', 'db bench press', 'db press', 'flat dumbbell', 'push'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'chest-incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada atas', 'upper chest', 'incline db press', 'db incline', 'push'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'chest-dumbbell-chest-fly',
    name: 'Dumbbell Chest Fly',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada', 'chest fly', 'db fly', 'flyes', 'isolation'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'chest-pec-deck-fly',
    name: 'Pec Deck Fly',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada', 'machine fly', 'butterfly', 'pec deck', 'chest fly'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'chest-cable-crossover',
    name: 'Cable Crossover',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada', 'cable fly', 'kabel', 'crossover', 'high to low'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'chest-push-up',
    name: 'Push Up',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada', 'pushup', 'bodyweight', 'calisthenics', 'push'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 12–15',
  },
  {
    id: 'chest-press-machine',
    name: 'Chest Press Machine',
    category: 'Chest (Dada)',
    shortCategory: 'Chest',
    keywords: ['chest', 'dada', 'machine press', 'mesin dada', 'seated chest press', 'push'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10–12',
  },

  // ============================================================================
  // 2. BACK (PUNGGUNG)
  // ============================================================================
  {
    id: 'back-lat-pulldown',
    name: 'Lat Pulldown',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'sayap', 'lats', 'pulldown', 'tarik atas', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10–12',
  },
  {
    id: 'back-wide-grip-lat-pulldown',
    name: 'Wide Grip Lat Pulldown',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'sayap', 'lats', 'wide pulldown', 'lebar', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10–12',
  },
  {
    id: 'back-close-grip-lat-pulldown',
    name: 'Close Grip Lat Pulldown',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'sayap', 'lats', 'close pulldown', 'v bar', 'neutral grip', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10–12',
  },
  {
    id: 'back-seated-cable-row',
    name: 'Seated Cable Row',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'cable row', 'sout', 'tarik kabel', 'seated row', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10–12',
  },
  {
    id: 'back-bent-over-barbell-row',
    name: 'Bent Over Barbell Row',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'barbell row', 'bb row', 'pendlay row', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 8–10',
  },
  {
    id: 'back-one-arm-dumbbell-row',
    name: 'One Arm Dumbbell Row',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'single arm row', 'db row', 'dumbbell row', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'back-t-bar-row',
    name: 'T-Bar Row',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'tbar', 'landmine row', 'row', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'back-chest-supported-row',
    name: 'Chest Supported Row',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'incline row', 'machine row', 'supported row', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'back-straight-arm-pulldown',
    name: 'Straight Arm Pulldown',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'lats', 'cable pullover', 'rope pulldown', 'pull'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'back-pull-up',
    name: 'Pull Up',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'pullup', 'chin up', 'bodyweight', 'sayap', 'pull'],
    defaultSets: 3,
    defaultReps: 8,
    targetNote: '3 × 8–10',
  },
  {
    id: 'back-assisted-pull-up',
    name: 'Assisted Pull Up',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'pullup machine', 'bantuan', 'sayap', 'pull'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'back-deadlift',
    name: 'Deadlift',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung', 'lower back', 'conventional deadlift', 'barbell deadlift', 'compound'],
    defaultSets: 3,
    defaultReps: 8,
    targetNote: '3 × 5–8',
  },
  {
    id: 'back-extension',
    name: 'Back Extension',
    category: 'Back (Punggung)',
    shortCategory: 'Back',
    keywords: ['back', 'punggung bawah', 'hyperextension', 'lower back', 'pinggang'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12–15',
  },

  // ============================================================================
  // 3. SHOULDER (BAHU)
  // ============================================================================
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu', 'overhead press', 'ohp', 'machine shoulder press', 'push'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'shoulder-dumbbell-press',
    name: 'Dumbbell Shoulder Press',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu', 'db shoulder press', 'seated db press', 'push'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'shoulder-military-press',
    name: 'Military Press',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu', 'barbell overhead press', 'ohp', 'standing press', 'push'],
    defaultSets: 3,
    defaultReps: 8,
    targetNote: '3 × 8–10',
  },
  {
    id: 'shoulder-arnold-press',
    name: 'Arnold Press',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu', 'dumbbell arnold', 'rotation press', 'push'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'shoulder-dumbbell-lateral-raise',
    name: 'Dumbbell Lateral Raise',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu samping', 'side delt', 'lateral raise', 'lat raise', 'vip'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'shoulder-cable-lateral-raise',
    name: 'Cable Lateral Raise',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu samping', 'side delt', 'kabel lateral', 'lateral raise'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'shoulder-front-raise',
    name: 'Front Raise',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu depan', 'front delt', 'dumbbell front raise'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'shoulder-rear-delt-fly',
    name: 'Rear Delt Fly',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu belakang', 'posterior delt', 'bent over fly', 'rear delt'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12–15',
  },
  {
    id: 'shoulder-reverse-pec-deck',
    name: 'Reverse Pec Deck',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu belakang', 'rear delt machine', 'reverse fly', 'pull'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'shoulder-face-pull',
    name: 'Face Pull',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu belakang', 'rear delt', 'rope face pull', 'traps', 'pull'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12–15',
  },
  {
    id: 'shoulder-upright-row',
    name: 'Upright Row',
    category: 'Shoulder (Bahu)',
    shortCategory: 'Shoulder',
    keywords: ['shoulder', 'bahu', 'traps', 'barbell upright row', 'cable upright row'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },

  // ============================================================================
  // 4. BICEPS
  // ============================================================================
  {
    id: 'biceps-dumbbell-curl',
    name: 'Dumbbell Bicep Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'bicep curl', 'lengan depan', 'db curl', 'alternating curl', 'arms'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'biceps-barbell-curl',
    name: 'Barbell Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'bicep curl', 'bb curl', 'lengan depan', 'standing curl', 'arms'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },
  {
    id: 'biceps-ez-bar-curl',
    name: 'EZ Bar Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'bicep curl', 'ez curl', 'zig zag bar', 'lengan', 'arms'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },
  {
    id: 'biceps-hammer-curl',
    name: 'Hammer Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'brachialis', 'neutral grip curl', 'db hammer', 'lengan', 'forearms'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'biceps-incline-dumbbell-curl',
    name: 'Incline Dumbbell Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'long head', 'incline curl', 'db curl', 'lengan'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },
  {
    id: 'biceps-concentration-curl',
    name: 'Concentration Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'peak', 'seated curl', 'dumbbell concentration', 'lengan'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'biceps-preacher-curl',
    name: 'Preacher Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'scott curl', 'ez preacher', 'machine preacher', 'lengan'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },
  {
    id: 'biceps-cable-curl',
    name: 'Cable Bicep Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'kabel curl', 'rope curl', 'straight bar cable curl', 'lengan'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'biceps-reverse-curl',
    name: 'Reverse Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'forearms', 'overhand curl', 'brachioradialis', 'lengan'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'biceps-machine-curl',
    name: 'Machine Bicep Curl',
    category: 'Biceps',
    shortCategory: 'Biceps',
    keywords: ['biceps', 'mesin bicep', 'seated machine curl', 'lengan'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },

  // ============================================================================
  // 5. TRICEPS
  // ============================================================================
  {
    id: 'triceps-pushdown',
    name: 'Triceps Pushdown',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'tricep pushdown', 'pressdown', 'kabel tricep', 'lengan belakang', 'push'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'triceps-rope-pushdown',
    name: 'Rope Pushdown',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'tali', 'rope pressdown', 'tricep rope', 'lengan belakang'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'triceps-straight-bar-pushdown',
    name: 'Straight Bar Pushdown',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'bar pushdown', 'v bar pushdown', 'lengan belakang'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'triceps-overhead-extension',
    name: 'Overhead Triceps Extension',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'triceps extension', 'overhead cable', 'long head', 'lengan belakang'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'triceps-dumbbell-extension',
    name: 'Dumbbell Triceps Extension',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'french press', 'db overhead extension', 'lengan belakang'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'triceps-skull-crusher',
    name: 'Skull Crusher',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'lying triceps extension', 'ez bar skullcrusher', 'lengan belakang'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10–12',
  },
  {
    id: 'triceps-close-grip-bench-press',
    name: 'Close Grip Bench Press',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'chest', 'cgbp', 'narrow bench press', 'lengan belakang'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 8–10',
  },
  {
    id: 'triceps-dip',
    name: 'Triceps Dip',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'dips', 'parallel bar dip', 'bench dip', 'bodyweight'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'triceps-assisted-dip',
    name: 'Assisted Dip',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'machine dip', 'dip bantuan', 'chest dip'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },
  {
    id: 'triceps-single-arm-cable-pushdown',
    name: 'Single Arm Cable Pushdown',
    category: 'Triceps',
    shortCategory: 'Triceps',
    keywords: ['triceps', 'one arm pushdown', 'unilateral tricep', 'kabel satu tangan'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },

  // ============================================================================
  // 6. LEGS (KAKI)
  // ============================================================================
  {
    id: 'legs-squat',
    name: 'Squat',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'paha', 'quads', 'glutes', 'back squat', 'compound'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 8–10',
  },
  {
    id: 'legs-barbell-back-squat',
    name: 'Barbell Back Squat',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'paha', 'bb squat', 'high bar', 'low bar'],
    defaultSets: 3,
    defaultReps: 8,
    targetNote: '3 × 8–10',
  },
  {
    id: 'legs-front-squat',
    name: 'Front Squat',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'quads', 'paha depan', 'barbell front squat'],
    defaultSets: 3,
    defaultReps: 8,
    targetNote: '3 × 8–10',
  },
  {
    id: 'legs-goblet-squat',
    name: 'Goblet Squat',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'dumbbell squat', 'kettlebell squat', 'paha'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },
  {
    id: 'legs-leg-press',
    name: 'Leg Press',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'mesin kaki', 'paha', 'quads', '45 degree leg press'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },
  {
    id: 'legs-hack-squat',
    name: 'Hack Squat',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'machine squat', 'quads', 'paha depan'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'legs-leg-extension',
    name: 'Leg Extension',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'quads', 'paha depan', 'machine extension'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'legs-leg-curl',
    name: 'Leg Curl',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'hamstring', 'paha belakang', 'curl kaki'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'legs-seated-leg-curl',
    name: 'Seated Leg Curl',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'hamstring', 'paha belakang', 'duduk'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'legs-lying-leg-curl',
    name: 'Lying Leg Curl',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'hamstring', 'paha belakang', 'tengkurap', 'prone leg curl'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'legs-romanian-deadlift',
    name: 'Romanian Deadlift',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'rdl', 'hamstring', 'glutes', 'paha belakang', 'deadlift'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'legs-stiff-leg-deadlift',
    name: 'Stiff Leg Deadlift',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'sldl', 'hamstring', 'paha belakang', 'deadlift'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'legs-walking-lunges',
    name: 'Walking Lunges',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'lunges', 'dumbbell lunges', 'glutes', 'quads'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'legs-reverse-lunges',
    name: 'Reverse Lunges',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'lunges belakang', 'step back lunge', 'glutes'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'legs-bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'bss', 'split squat', 'single leg squat', 'glutes', 'quads'],
    defaultSets: 3,
    defaultReps: 10,
    targetNote: '3 × 10',
  },
  {
    id: 'legs-hip-thrust',
    name: 'Hip Thrust',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'glutes', 'bokong', 'barbell hip thrust'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'legs-glute-bridge',
    name: 'Glute Bridge',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'glutes', 'bokong', 'bridge'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'legs-calf-raise',
    name: 'Calf Raise',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'betis', 'calves', 'jinjit'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'legs-seated-calf-raise',
    name: 'Seated Calf Raise',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'betis duduk', 'soleus', 'calves'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'legs-standing-calf-raise',
    name: 'Standing Calf Raise',
    category: 'Legs',
    shortCategory: 'Legs',
    keywords: ['legs', 'kaki', 'betis berdiri', 'gastrocnemius', 'calves'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },

  // ============================================================================
  // 7. ABS (PERUT)
  // ============================================================================
  {
    id: 'abs-crunch',
    name: 'Crunch',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'sixpack', 'core', 'abdominal crunch'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'abs-sit-up',
    name: 'Sit Up',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'situp', 'core', 'sixpack'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'abs-reverse-crunch',
    name: 'Reverse Crunch',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut bawah', 'lower abs', 'core'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'abs-leg-raise',
    name: 'Leg Raise',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut bawah', 'lying leg raise', 'lower abs'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12–15',
  },
  {
    id: 'abs-hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'gantung', 'pull up bar leg raise', 'core'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 10–12',
  },
  {
    id: 'abs-knee-raise',
    name: 'Knee Raise',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'captain chair', 'hanging knee raise', 'core'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 12–15',
  },
  {
    id: 'abs-plank',
    name: 'Plank',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'core', 'isometric', 'tahan perut'],
    defaultSets: 3,
    defaultReps: 60,
    targetNote: '3 set (45–60 detik)',
  },
  {
    id: 'abs-side-plank',
    name: 'Side Plank',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut samping', 'obliques', 'core'],
    defaultSets: 3,
    defaultReps: 45,
    targetNote: '3 set (30–45 detik)',
  },
  {
    id: 'abs-russian-twist',
    name: 'Russian Twist',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut samping', 'obliques', 'putaran perut', 'core'],
    defaultSets: 3,
    defaultReps: 20,
    targetNote: '3 × 20',
  },
  {
    id: 'abs-bicycle-crunch',
    name: 'Bicycle Crunch',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'obliques', 'sepeda', 'core'],
    defaultSets: 3,
    defaultReps: 20,
    targetNote: '3 × 20',
  },
  {
    id: 'abs-mountain-climber',
    name: 'Mountain Climber',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'cardio', 'core', 'hiit'],
    defaultSets: 3,
    defaultReps: 30,
    targetNote: '3 × 30',
  },
  {
    id: 'abs-cable-crunch',
    name: 'Cable Crunch',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'kneeling cable crunch', 'kabel perut', 'sixpack'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'abs-machine-crunch',
    name: 'Abdominal Machine Crunch',
    category: 'Abs',
    shortCategory: 'Abs',
    keywords: ['abs', 'perut', 'mesin perut', 'ab machine', 'sixpack'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },

  // ============================================================================
  // 8. FOREARMS
  // ============================================================================
  {
    id: 'forearms-wrist-curl',
    name: 'Wrist Curl',
    category: 'Forearms',
    shortCategory: 'Forearms',
    keywords: ['forearms', 'lengan bawah', 'pergelangan tangan', 'grip'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'forearms-reverse-wrist-curl',
    name: 'Reverse Wrist Curl',
    category: 'Forearms',
    shortCategory: 'Forearms',
    keywords: ['forearms', 'lengan bawah', 'extensor', 'pergelangan tangan'],
    defaultSets: 3,
    defaultReps: 15,
    targetNote: '3 × 15',
  },
  {
    id: 'forearms-hammer-curl',
    name: 'Hammer Curl (Forearms)',
    category: 'Forearms',
    shortCategory: 'Forearms',
    keywords: ['forearms', 'biceps', 'brachioradialis', 'lengan bawah', 'hammer curl'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'forearms-reverse-barbell-curl',
    name: 'Reverse Barbell Curl',
    category: 'Forearms',
    shortCategory: 'Forearms',
    keywords: ['forearms', 'biceps', 'overhand barbell curl', 'lengan bawah'],
    defaultSets: 3,
    defaultReps: 12,
    targetNote: '3 × 12',
  },
  {
    id: 'forearms-farmers-walk',
    name: "Farmer's Walk",
    category: 'Forearms',
    shortCategory: 'Forearms',
    keywords: ['forearms', 'farmers carry', 'grip', 'traps', 'jalan bawa beban'],
    defaultSets: 3,
    defaultReps: 40,
    targetNote: '3 × 30–45 detik',
  },
  {
    id: 'forearms-dead-hang',
    name: 'Dead Hang',
    category: 'Forearms',
    shortCategory: 'Forearms',
    keywords: ['forearms', 'grip', 'gantung', 'pull up bar hang', 'dekompresi'],
    defaultSets: 3,
    defaultReps: 45,
    targetNote: '3 × 30–60 detik',
  },
]

// ============================================================================
// FUNGSI PENCARIAN CERDAS (KEYWORD + FUZZY SIMILARITY MATCHING)
// ============================================================================

function getBigrams(str: string): string[] {
  const s = str.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (s.length < 2) return [s]
  const out: string[] = []
  for (let i = 0; i < s.length - 1; i++) {
    out.push(s.slice(i, i + 2))
  }
  return out
}

function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const bgA = getBigrams(a)
  const bgB = getBigrams(b)
  if (bgA.length === 0 || bgB.length === 0) return 0
  let matches = 0
  const used = new Array(bgB.length).fill(false)
  for (const x of bgA) {
    for (let j = 0; j < bgB.length; j++) {
      if (!used[j] && x === bgB[j]) {
        matches++
        used[j] = true
        break
      }
    }
  }
  return (2 * matches) / (bgA.length + bgB.length)
}

export function searchGymExercises(
  query: string,
  categoryFilter: 'ALL' | GymMuscleCategory = 'ALL'
): GymExerciseCatalogItem[] {
  const baseList =
    categoryFilter === 'ALL'
      ? GYM_EXERCISE_LIBRARY
      : GYM_EXERCISE_LIBRARY.filter((item) => item.category === categoryFilter)

  const cleanQuery = query.trim().toLowerCase()
  if (!cleanQuery) return baseList

  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean)

  const scored = baseList
    .map((item) => {
      const nameLower = item.name.toLowerCase()
      const catLower = item.category.toLowerCase()
      const allText = `${nameLower} ${catLower} ${item.keywords.join(' ')}`
      const nameWords = nameLower.split(/\s+/)

      let score = 0

      // 1. Exact atau prefix match pada nama gerakan
      if (nameLower === cleanQuery) {
        score += 120
      } else if (nameLower.startsWith(cleanQuery)) {
        score += 95
      } else if (nameLower.includes(cleanQuery)) {
        score += 80
      } else if (allText.includes(cleanQuery)) {
        score += 65
      }

      // 2. Per-token matching (mendukung urutan kata terbalik & typo ringan)
      let matchedTokens = 0
      for (const token of queryTokens) {
        if (nameLower.includes(token)) {
          score += 30
          matchedTokens++
        } else if (allText.includes(token)) {
          score += 22
          matchedTokens++
        } else {
          // Cek kemiripan fuzzy terhadap setiap kata di nama & keyword
          let bestWordSim = diceSimilarity(token, nameLower)
          for (const w of [...nameWords, ...item.keywords]) {
            const sim = diceSimilarity(token, w)
            if (sim > bestWordSim) bestWordSim = sim
          }
          if (bestWordSim >= 0.45) {
            score += Math.round(bestWordSim * 28)
            matchedTokens += bestWordSim
          }
        }
      }

      // Bonus jika semua token memiliki kecocokan
      if (queryTokens.length > 1 && matchedTokens >= queryTokens.length * 0.8) {
        score += 25
      }

      // 3. Kemiripan keseluruhan string
      const overallSim = diceSimilarity(cleanQuery, nameLower)
      if (overallSim >= 0.35) {
        score += Math.round(overallSim * 35)
      }

      return { item, score }
    })
    .filter((entry) => entry.score >= 18)
    .sort((a, b) => b.score - a.score)

  return scored.map((entry) => entry.item)
}

// ============================================================================
// TEMPLATE PROGRAM LATIHAN DEFAULT (2X, 3X, 4X, 5X, 6X SEMINGGU)
// ============================================================================

export const GYM_PROGRAM_TEMPLATES: GymProgramTemplate[] = [
  {
    id: 'gym-2x-full-body',
    frequencyLabel: '2x Seminggu',
    title: 'Gym 2x seminggu — Full Body',
    subtitle: 'Full Body A & Full Body B • Efisien untuk pemula atau jadwal sibuk',
    note: 'Kombinasi gerakan compound & isolasi seluruh tubuh dalam 2 sesi per minggu.',
    sessions: [
      {
        id: '2x-fb-a',
        title: 'Full Body A',
        questTitle: 'Full Body A',
        recommendedDays: ['Mon'],
        dayLabel: 'Senin (atau Hari 1)',
        exercises: [
          { name: 'Bench Press', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Lat Pulldown', sets: 3, reps: 12, note: '3 × 10–12' },
          { name: 'Shoulder Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Leg Press', sets: 3, reps: 12, note: '3 × 10–12' },
          { name: 'Leg Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Dumbbell Bicep Curl', sets: 2, reps: 12, note: '2 × 12' },
          { name: 'Triceps Pushdown', sets: 2, reps: 12, note: '2 × 12' },
        ],
      },
      {
        id: '2x-fb-b',
        title: 'Full Body B',
        questTitle: 'Full Body B',
        recommendedDays: ['Thu'],
        dayLabel: 'Kamis (atau Hari 2)',
        exercises: [
          { name: 'Squat', sets: 3, reps: 10, note: '3 × 8–10' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Seated Cable Row', sets: 3, reps: 12, note: '3 × 10–12' },
          { name: 'Romanian Deadlift', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Dumbbell Lateral Raise', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Hammer Curl', sets: 2, reps: 12, note: '2 × 12' },
          { name: 'Cable Crunch', sets: 3, reps: 15, note: '3 × 15' },
        ],
      },
    ],
  },
  {
    id: 'gym-3x-full-body',
    frequencyLabel: '3x Seminggu',
    title: 'Gym 3x seminggu — Full Body',
    subtitle: 'Senin (Full Body A) • Rabu (Full Body B) • Jumat (Full Body C)',
    note: 'Lakukan masing-masing 2–3 set dengan 8–12 repetisi.',
    sessions: [
      {
        id: '3x-fb-a',
        title: 'Senin – Full Body A',
        questTitle: 'Full Body A',
        recommendedDays: ['Mon'],
        dayLabel: 'Senin',
        exercises: [
          { name: 'Bench Press', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Lat Pulldown', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Leg Press', sets: 3, reps: 12, note: '3 × 8–12' },
          { name: 'Shoulder Press', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Dumbbell Bicep Curl', sets: 2, reps: 12, note: '2–3 × 8–12' },
          { name: 'Triceps Pushdown', sets: 2, reps: 12, note: '2–3 × 8–12' },
        ],
      },
      {
        id: '3x-fb-b',
        title: 'Rabu – Full Body B',
        questTitle: 'Full Body B',
        recommendedDays: ['Wed'],
        dayLabel: 'Rabu',
        exercises: [
          { name: 'Squat', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Seated Cable Row', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Leg Curl', sets: 3, reps: 12, note: '3 × 8–12' },
          { name: 'Dumbbell Lateral Raise', sets: 3, reps: 12, note: '2–3 × 8–12' },
          { name: 'Cable Crunch', sets: 3, reps: 12, note: '2–3 × 8–12' },
        ],
      },
      {
        id: '3x-fb-c',
        title: 'Jumat – Full Body C',
        questTitle: 'Full Body C',
        recommendedDays: ['Fri'],
        dayLabel: 'Jumat',
        exercises: [
          { name: 'Romanian Deadlift', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Chest Press Machine', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'One Arm Dumbbell Row', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Leg Extension', sets: 3, reps: 12, note: '3 × 8–12' },
          { name: 'Hammer Curl', sets: 2, reps: 12, note: '2–3 × 8–12' },
          { name: 'Overhead Triceps Extension', sets: 2, reps: 12, note: '2–3 × 8–12' },
          { name: 'Plank', sets: 3, reps: 60, note: '3 set' },
        ],
      },
    ],
  },
  {
    id: 'gym-4x-upper-lower',
    frequencyLabel: '4x Seminggu',
    title: 'Gym 4x seminggu — Upper / Lower',
    subtitle: 'Senin (Upper A) • Selasa (Lower A) • Kamis (Upper B) • Sabtu (Lower B)',
    note: 'Pembagian seimbang antara otot tubuh atas (Upper) dan kaki (Lower) masing-masing 2x seminggu.',
    sessions: [
      {
        id: '4x-upper-a',
        title: 'Senin – Upper A',
        questTitle: 'Upper A',
        recommendedDays: ['Mon'],
        dayLabel: 'Senin',
        exercises: [
          { name: 'Bench Press', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Lat Pulldown', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Shoulder Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Seated Cable Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Dumbbell Bicep Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Triceps Pushdown', sets: 3, reps: 12, note: '3 × 12' },
        ],
      },
      {
        id: '4x-lower-a',
        title: 'Selasa – Lower A',
        questTitle: 'Lower A',
        recommendedDays: ['Tue'],
        dayLabel: 'Selasa',
        exercises: [
          { name: 'Squat', sets: 3, reps: 10, note: '3 × 8–10' },
          { name: 'Leg Press', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Leg Extension', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Leg Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Standing Calf Raise', sets: 3, reps: 15, note: '3 × 15' },
          { name: 'Crunch', sets: 3, reps: 15, note: '3 × 15' },
        ],
      },
      {
        id: '4x-upper-b',
        title: 'Kamis – Upper B',
        questTitle: 'Upper B',
        recommendedDays: ['Thu'],
        dayLabel: 'Kamis',
        exercises: [
          { name: 'Incline Dumbbell Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'One Arm Dumbbell Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Dumbbell Lateral Raise', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Dumbbell Chest Fly', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Hammer Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Overhead Triceps Extension', sets: 3, reps: 12, note: '3 × 12' },
        ],
      },
      {
        id: '4x-lower-b',
        title: 'Sabtu – Lower B',
        questTitle: 'Lower B',
        recommendedDays: ['Sat'],
        dayLabel: 'Sabtu',
        exercises: [
          { name: 'Romanian Deadlift', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Bulgarian Split Squat', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Hip Thrust', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Seated Leg Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Seated Calf Raise', sets: 3, reps: 15, note: '3 × 15' },
          { name: 'Plank', sets: 3, reps: 60, note: '3 set' },
        ],
      },
    ],
  },
  {
    id: 'gym-5x-ppl-ul',
    frequencyLabel: '5x Seminggu',
    title: 'Gym 5x seminggu — PPL + Upper / Lower',
    subtitle: 'Senin (Push) • Selasa (Pull) • Rabu (Legs) • Jumat (Upper) • Sabtu (Lower)',
    note: 'Kombinasi favorit untuk hipertrofi optimal dengan istirahat di hari Kamis & Minggu.',
    sessions: [
      {
        id: '5x-push',
        title: 'Senin – Push (Dada, Bahu, Triceps)',
        questTitle: 'Push (Dada, Bahu, Triceps)',
        recommendedDays: ['Mon'],
        dayLabel: 'Senin',
        exercises: [
          { name: 'Bench Press', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Shoulder Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Dumbbell Lateral Raise', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Triceps Pushdown', sets: 3, reps: 12, note: '3 × 12' },
        ],
      },
      {
        id: '5x-pull',
        title: 'Selasa – Pull (Punggung, Biceps)',
        questTitle: 'Pull (Punggung, Biceps)',
        recommendedDays: ['Tue'],
        dayLabel: 'Selasa',
        exercises: [
          { name: 'Lat Pulldown', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Seated Cable Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'One Arm Dumbbell Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Face Pull', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Barbell Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Hammer Curl', sets: 3, reps: 12, note: '3 × 12' },
        ],
      },
      {
        id: '5x-legs',
        title: 'Rabu – Legs',
        questTitle: 'Legs Workout',
        recommendedDays: ['Wed'],
        dayLabel: 'Rabu',
        exercises: [
          { name: 'Squat', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Leg Press', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Romanian Deadlift', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Leg Extension', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Leg Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Calf Raise', sets: 3, reps: 15, note: '3 × 15' },
        ],
      },
      {
        id: '5x-upper',
        title: 'Jumat – Upper',
        questTitle: 'Upper Body',
        recommendedDays: ['Fri'],
        dayLabel: 'Jumat',
        exercises: [
          { name: 'Incline Bench Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Chest Supported Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Lat Pulldown', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Dumbbell Lateral Raise', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Dumbbell Bicep Curl', sets: 2, reps: 12, note: '2 × 12' },
          { name: 'Overhead Triceps Extension', sets: 2, reps: 12, note: '2 × 12' },
        ],
      },
      {
        id: '5x-lower',
        title: 'Sabtu – Lower',
        questTitle: 'Lower Body',
        recommendedDays: ['Sat'],
        dayLabel: 'Sabtu',
        exercises: [
          { name: 'Leg Press', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Bulgarian Split Squat', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Hip Thrust', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Seated Leg Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Calf Raise', sets: 3, reps: 15, note: '3 × 15' },
          { name: 'Cable Crunch', sets: 3, reps: 15, note: '3 × 15' },
        ],
      },
    ],
  },
  {
    id: 'gym-6x-ppl',
    frequencyLabel: '6x Seminggu',
    title: 'Gym 6x seminggu — Push / Pull / Legs (PPL)',
    subtitle: 'Push A • Pull A • Legs A • Push B • Pull B • Legs B',
    note: 'Untuk jadwal 6 hari, atur volume setiap sesi supaya tidak terlalu banyak. Tidak perlu memaksakan semua set sampai gagal.',
    sessions: [
      {
        id: '6x-push-a',
        title: 'Push A',
        questTitle: 'Push A',
        recommendedDays: ['Mon'],
        dayLabel: 'Senin',
        exercises: [
          { name: 'Bench Press', sets: 3, reps: 10, note: '3 × 8–12' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Shoulder Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Dumbbell Lateral Raise', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Triceps Pushdown', sets: 3, reps: 12, note: '3 × 12' },
        ],
      },
      {
        id: '6x-pull-a',
        title: 'Pull A',
        questTitle: 'Pull A',
        recommendedDays: ['Tue'],
        dayLabel: 'Selasa',
        exercises: [
          { name: 'Lat Pulldown', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Bent Over Barbell Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Seated Cable Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Face Pull', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Barbell Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Hammer Curl', sets: 3, reps: 12, note: '3 × 12' },
        ],
      },
      {
        id: '6x-legs-a',
        title: 'Legs A',
        questTitle: 'Legs A',
        recommendedDays: ['Wed'],
        dayLabel: 'Rabu',
        exercises: [
          { name: 'Squat', sets: 3, reps: 10, note: '3 × 8–10' },
          { name: 'Leg Press', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Leg Extension', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Leg Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Standing Calf Raise', sets: 3, reps: 15, note: '3 × 15' },
        ],
      },
      {
        id: '6x-push-b',
        title: 'Push B',
        questTitle: 'Push B',
        recommendedDays: ['Thu'],
        dayLabel: 'Kamis',
        exercises: [
          { name: 'Incline Bench Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Chest Press Machine', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Cable Lateral Raise', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Overhead Triceps Extension', sets: 3, reps: 12, note: '3 × 12' },
        ],
      },
      {
        id: '6x-pull-b',
        title: 'Pull B',
        questTitle: 'Pull B',
        recommendedDays: ['Fri'],
        dayLabel: 'Jumat',
        exercises: [
          { name: 'Pull Up', sets: 3, reps: 8, note: '3 × 8–10' },
          { name: 'One Arm Dumbbell Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Chest Supported Row', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Reverse Pec Deck', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Preacher Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Cable Bicep Curl', sets: 3, reps: 12, note: '3 × 12' },
        ],
      },
      {
        id: '6x-legs-b',
        title: 'Legs B',
        questTitle: 'Legs B',
        recommendedDays: ['Sat'],
        dayLabel: 'Sabtu',
        exercises: [
          { name: 'Romanian Deadlift', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Bulgarian Split Squat', sets: 3, reps: 10, note: '3 × 10' },
          { name: 'Hip Thrust', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Seated Leg Curl', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Leg Extension', sets: 3, reps: 12, note: '3 × 12' },
          { name: 'Seated Calf Raise', sets: 3, reps: 15, note: '3 × 15' },
        ],
      },
    ],
  },
]

