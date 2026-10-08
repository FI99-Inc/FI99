// R&D entries. `strip` drives the cell row in both the readout and the
// compact homepage row: PASS/DONE cells read as earned, FAIL as failed, and
// anything else (OPEN, HOLD) as not decided yet.
export const research = [
  {
    slug: 'verdant',
    number: '01',
    name: 'VERDANT',
    version: '0.8',
    title: 'A falsifiable recommendation engine for sparse, subjective preferences.',
    oneLiner: 'A recommender built to tell us when it was wrong. It did.',
    year: 2026,
    field: 'RECOMMENDER SYSTEMS',
    state: 'PAUSED',
    status: 'PAUSED AFTER v0.8 CONFIRMATION',
    path: '/research/verdant',
    abstract:
      'v0.8 ran its preregistered confirmation experiment. Cardinal scoring beat the old formulation in all eleven simulated worlds. The full policy still failed six of eleven screens, so we left the held-out AUDIT unopened, like we said we would.',
    readoutTag: 'CONFIRMATION',
    stripLabel: 'Confirmation screen results',
    readout: [
      { label: 'DEVELOPMENT_08', value: 'COMPLETE' },
      { label: 'SCREENS', value: '05 / 11' },
      { label: 'VALIDITY FAILURES', value: '00' },
      { label: 'AUDIT', value: 'WITHHELD' },
      { label: 'STATE', value: 'PAUSED' },
    ],
    screens: [
      { id: '01', name: 'CARDINAL CORE', state: 'PASS' },
      { id: '02', name: 'RAW IG AUR', state: 'FAIL' },
      { id: '03', name: 'RAW IG Q_EQUIV', state: 'FAIL' },
      { id: '04', name: 'F3 VS F0', state: 'FAIL' },
      { id: '05', name: 'GATE C', state: 'PASS' },
      { id: '06', name: 'MISSPECIFICATION / GATE E', state: 'FAIL' },
      { id: '07', name: 'SIX-ANSWER ONE-SHOT', state: 'FAIL' },
      { id: '08', name: 'DRIFT RECOVERY', state: 'PASS' },
      { id: '09', name: 'D5 DIVERSITY', state: 'FAIL' },
      { id: '10', name: 'SERENDIPITY', state: 'PASS' },
      { id: '11', name: 'INTEGRITY', state: 'PASS' },
    ],
  },
  {
    slug: 'temporal',
    number: '02',
    name: 'TEMPORAL',
    version: '0.2',
    title: 'A deterministic temporal engine that keeps facts, plans, and guesses apart.',
    oneLiner: 'A time engine that knows a deadline from a guess.',
    year: 2026,
    field: 'TEMPORAL ENGINES',
    state: 'IN TRIAL',
    status: 'v0.2 RELEASE · FIRST REAL TRIAL',
    path: '/research/temporal',
    abstract:
      'A Rust engine that evaluates a snapshot of obligations, plans, and declared time against an injected clock, and returns the same bytes every time. Deadlines stay facts, suggestions stay suggestions, and a skipped plan never turns into overdue guilt. v0.2 wraps it in a Windows app built around a compressed timeline called Horizon.',
    readoutTag: 'BUILD GATES',
    stripLabel: 'Build gate status',
    readout: [
      { label: 'GATES PASSED', value: '0 · 1 · 2' },
      { label: 'GATE 4 TASKS', value: '07 / 08' },
      { label: 'SCENARIOS', value: '81' },
      { label: 'TESTS', value: '307' },
      { label: 'STATE', value: 'IN TRIAL' },
    ],
    screens: [
      { id: 'G0', name: 'CONSTITUTION', state: 'PASS' },
      { id: 'G1', name: 'TEMPORAL CORE', state: 'PASS' },
      { id: 'G2', name: 'TRACE-BACKED HORIZON', state: 'PASS' },
      { id: 'G3', name: 'QUERCUS ADAPTER', state: 'HOLD' },
      { id: 'G4', name: 'CALENDAR REPLACEMENT', state: 'OPEN' },
    ],
  },
];

export const verdant = research[0];
export const temporal = research[1];

export function stripTone(state) {
  if (state === 'PASS' || state === 'DONE') return 'is-pass';
  if (state === 'FAIL') return 'is-fail';
  return 'is-open';
}
