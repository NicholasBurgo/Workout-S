// RP Strength "Superman" 5-day split. `reps` is free text so targets like
// "AMRAP" or "near failure" work alongside ranges like "10-15".
const ex = (name, sets, reps) => ({ name, sets, reps });

export const DEFAULT_PROGRAM = [
  {
    name: 'Chest / Delts / Back',
    exercises: [
      ex('Incline DB press', 2, '10-15'),
      ex('Flat machine press', 2, '10-15'),
      ex('DB lateral raise', 2, '10-15'),
      ex('Cable upright row', 2, '10-15'),
      ex('Machine lat pulldown', 1, '10-15'),
    ],
  },
  {
    name: 'Legs / Arms',
    exercises: [
      ex('High bar squat', 2, '10-15'),
      ex('High bar good morning', 2, '10-15'),
      ex('DB skullcrusher', 2, '10-15'),
      ex('Standing DB curl', 2, '10-15'),
    ],
  },
  {
    name: 'Back / Chest / Delts',
    exercises: [
      ex('Overhand pull-ups', 2, 'AMRAP'),
      ex('Assisted pull-up or pulldown', 2, '10-15'),
      ex('Incline DB press', 2, '10-15'),
      ex('Cable chest fly', 2, '10-15'),
      ex('Cable upright row', 1, '10-15'),
    ],
  },
  {
    name: 'Arms / Legs',
    exercises: [
      ex('Cable biceps curl', 2, '10-15'),
      ex('Cable triceps pushdown', 2, '10-15'),
      ex('Lying leg curl', 2, '10-15'),
      ex('Leg press', 2, '10-15'),
    ],
  },
  {
    name: 'Delts / Back / Chest (high reps)',
    exercises: [
      ex('Cable lateral raise', 2, '15-20'),
      ex('DB upright row', 2, '15-20'),
      ex('Machine row or pulldown', 2, '15-20'),
      ex('Straight-arm pulldown', 2, '15-20'),
      ex('Deficit push-ups', 2, 'near failure'),
    ],
  },
];
