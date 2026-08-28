export const research = [
  {
    slug: 'verdant',
    number: '01',
    name: 'VERDANT',
    version: '0.8',
    title: 'A falsifiable recommendation engine for sparse, subjective preferences.',
    year: 2026,
    field: 'RECOMMENDER SYSTEMS',
    status: 'PAUSED AFTER v0.8 CONFIRMATION',
    path: '/research/verdant',
    abstract:
      'v0.8 completed its preregistered confirmation experiment. Cardinal scoring improved over the historical formulation across all eleven simulated worlds, but the full policy failed six of eleven confirmation screens. The held-out AUDIT was deliberately not run.',
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
];

export const verdant = research[0];
