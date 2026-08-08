// Real FI99 projects. Keep the shape exactly as-is. oneLiner stays under 12
// words. `shots` are imported rather than referenced by path so Astro can
// optimize them and emit the right dimensions at build time.
import krineFeed from '../assets/work/krine-1.png';
import krinePost from '../assets/work/krine-2.png';
import plotonMap from '../assets/work/ploton-1.png';
import plotonMethod from '../assets/work/ploton-2.png';

export const projects = [
  {
    slug: 'krine',
    name: 'Krine',
    oneLiner: 'Anonymous confessions, sorted by a machine that reads feelings.',
    status: 'shipped',
    year: 2026,
    tags: ['app'],
    link: 'https://krine.ca',
    shots: [
      {
        src: krineFeed,
        label: 'FEED',
        alt: "Krine's feed: the headline “Honest thoughts, anonymously” above a search field, sort controls, and posts tagged THOUGHT and CONFESSION.",
      },
      {
        src: krinePost,
        label: 'POST',
        alt: 'A single Krine post tagged #SAD, #CONFESSION and #ANGRY, showing 186 likes and an empty comment box.',
      },
    ],
  },
  {
    slug: 'ploton',
    name: 'PlotON',
    oneLiner: 'Ontario cities, ranked by what you actually care about.',
    status: 'in the lab',
    year: 2026,
    tags: ['tool'],
    link: 'https://ploton-zeta.vercel.app',
    shots: [
      {
        src: plotonMap,
        label: 'MAP',
        alt: 'PlotON’s map view: a sidebar of filters for home price, rent, income, crime index and transit, beside an Ontario map of safety-scored city markers.',
      },
      {
        src: plotonMethod,
        label: 'METHOD',
        alt: 'PlotON’s methodology page explaining the livability score, with the seven default category weights laid out in a grid.',
      },
    ],
  },
];
