// The manifesto. Second person on purpose: it addresses builders rather than
// clients, so every line lands as a consequence for the reader instead of a
// boast about us.
//
// Rewritten 2026-08-10 in a looser, contraction-heavy voice — a deliberate
// break from the earlier contraction-free draft. Don't "fix" the
// contractions back out; they're the point of this version, not an error.
//
// Each principle now carries a `statement` (the rule, set large) and a
// `body` (the paragraph underneath explaining it) — about.astro renders
// both per numbered row. opening.body[0] is quoted alone on the home page,
// so it has to stand as a single sentence on its own.
export const opening = {
  lead: 'You are early.',
  admission: 'So are we.',
  body: [
    "Everything you'd call living, you got by walking toward someone who could have said no: asking your crush out, applying for your dream job across the world, speaking up when you could've chosen silence. We are builders, so we spend our time deciding how much of that walk to leave in. We had three of you in mind when we wrote this.",
    'We had three people in mind when we wrote this.',
    "The dreamer has renewed the same domain for six years and still opens the file on the subway ride home. The non-believer sat through the prototype, watched it break in the second minute, and clapped along with the room. The defector gets a strong review every cycle for work they can't describe at dinner. You have more in common than you'd admit. Each of you looked at the room you were handed and found it too suffocating.",
  ],
};

export const principles = [
  {
    statement: 'Friction is where you decide.',
    body: "You feel it in the second before you buy, in the effort of typing out a whole name, in a thing that holds still until you push it. Designers spent twenty years sanding that second off and called the result progress. What they removed was the part where you chose. We put it back where the stakes are high, and we won't ever apologize for the extra click.",
  },
  {
    statement:
      "If we're wrong, you lose a second. If they're wrong, you lose the choice of choosing.",
    body: "Price both errors. Ours costs you some patience and costs someone a little revenue. Theirs you can already see: a feed studies you until the people who disagree with you stop sounding human, or you tap once and your savings are gone. Thank you very much but we'll take the patience.",
  },
  {
    statement: "The tool can't answer for us.",
    body: 'Three people with names shipped this. If we hurt someone, we won\'t tell you the model generated it, the algorithm surfaced it, the system optimized for engagement. Founders learned those sentences to put distance between themselves and their own work. We signed the page instead.',
  },
  {
    statement: "We won't build the landlord's software.",
    body: "You can see the other future from here. The product is slick, but you are the inventory, and someone took the door out. Several of the largest firms alive are building toward it and they aren't hiding it. We'd rather build something transparent from the get-go that respects your boundaries and never trades our morals for a marginal bump in metrics. Your parents should be able to use what we make without wondering what it is quietly extracting from them.",
  },
  {
    statement: 'We argue, and we keep the arguments.',
    body: "The three of us met as kids, years before we had a company or a reason. Actually, we disagree about most of what we build, and the work improves in the gap between us. You narrow when nothing pushes back. So does a company, so does a country, and so does a friendship. We'd rather lose an argument in this room than ship a thing none of us even doubted.",
  },
];

export const closing = [
  'Manifestos usually arrive late, written by people with something to point at. We wrote ours first, with everything to prove, and signed it. If we break it, you have this page.',
  'You are early. So are we.',
];
