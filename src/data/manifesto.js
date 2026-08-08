// The manifesto. Second person on purpose: it addresses builders rather than
// clients, so every line lands as a consequence for the reader instead of a
// boast about us. "We ship everything" is a brag; "a thing that doesn't ship
// didn't happen" is a rule that binds whoever reads it.
//
// The inversion is the point. The famous version of this form toasts people
// who have already won — every name in it was proven. This one is addressed
// to people who have done nothing yet, the three of us included, which is why
// it opens by conceding that in two words and moves on.
//
// Contractions are deliberate but rationed: the opening and closing speak to
// the reader and take them, the numbered principles stay flat because they
// are meant to read as carved rather than said.
//
// An early draft named two real companies as the unethical example. They are
// deliberately gone: a refusal stated as our own rule (principle 05) carries
// further than one stated as an accusation, and it keeps a legal claim about
// a third party off the site. Do not "restore" them.
export const opening = {
  lead: 'You are early.',
  admission: 'So are we.',
  body: [
    "You came because there's something that won't leave you alone, and you wanted to know whether we'd understand.",
    "We would. Here's what we hold.",
  ],
};

export const principles = [
  'Use every tool there is. Outsource none of the thinking.',
  "A thing that doesn't ship didn't happen.",
  'Pick the idea. Never the category.',
  'Anyone can start. The work begins after the interesting part is over.',
  "If you'd be embarrassed to explain it, don't build it. No fee fixes that.",
];

export const closing = [
  "Manifestos like this are usually written afterward, by people with something to point at. We're writing ours first, and signing it.",
  'You are early. So is this.',
];
