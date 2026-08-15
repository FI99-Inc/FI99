// The three of us. Bios are each person's own words — grammar tidied only,
// and held in first person throughout so three different voices still read as
// one page. Lars wrote his in the third person; the only change was "he
// enjoys" to "I enjoy".
import srihith from '../assets/people/srihith-jarabana.png';
import lars from '../assets/people/lars-fransen-molino.jpeg';
import omar from '../assets/people/omar-badawy.jpeg';

export const people = [
  {
    name: 'Srihith Jarabana',
    school: 'University of Toronto',
    photo: srihith,
    bio: "The name's Jarabana, Srihith Jarabana. You can also call me SJ. I study business, and I'm interested in finance and software — but those are the obvious ones. I also like poetry, Post Malone, train rides, and other stuff that might seem corny, but that's just me.",
    focus: ['vision', 'finance', 'technology'],
    links: [
      { label: 'JARABANA.COM', href: 'https://jarabana.com' },
      { label: 'LINKEDIN', href: 'https://www.linkedin.com/in/srihithjarabana/' },
    ],
  },
  {
    name: 'Lars Fransen-Molino',
    school: 'Laurentian University',
    photo: lars,
    bio: 'Mechanical Engineering student with a strong interest in technology, mining, and entrepreneurship. As a co-founder of FI99, I enjoy tackling new ideas, solving problems, and finding creative ways to bring technology into real-world industries.',
    focus: ['engineering', 'mining', 'operations'],
    links: [
      {
        label: 'LINKEDIN',
        href: 'https://www.linkedin.com/in/lars-fransen-molino-901579287/',
      },
    ],
  },
  {
    name: 'Omar Badawy',
    school: 'Toronto Metropolitan University',
    photo: omar,
    bio: "My name is Omar Ahmed Badawy. I'm from Oakville, Ontario, and I'm studying computer science at TMU. My friends and I love solving global issues through software, and we wanted our work to be seen through FI99.",
    focus: ['software', 'systems', 'cybersecurity'],
    links: [
      {
        label: 'LINKEDIN',
        href: 'https://www.linkedin.com/in/omar-badawy-37834b255/',
      },
    ],
  },
];
