// Real FI99 projects. Keep the shape exactly as-is. oneLiner stays under 12
// words. `shots` are imported rather than referenced by path so Astro can
// optimize them and emit the right dimensions at build time.
import krineFeed from '../assets/work/krine-1.png';
import krinePost from '../assets/work/krine-2.png';
import plotonMap from '../assets/work/ploton-1.png';
import plotonMethod from '../assets/work/ploton-2.png';
import writeLibrary from '../assets/work/write-1.png';
import writeEditor from '../assets/work/write-2.png';
import wattsLeftPrediction from '../assets/work/watts-left-1.png';
import wattsLeftLive from '../assets/work/watts-left-2.png';

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
    // Omar's.
    slug: 'watts-left',
    name: "Watt's Left",
    oneLiner: 'EV range, predicted from physics instead of the last few kilometres.',
    status: 'in the lab',
    year: 2026,
    tags: ['app'],
    link: 'https://wattsleft.fi99.ca',
    shots: [
      {
        src: wattsLeftPrediction,
        label: 'PREDICTION',
        alt: "Watt's Left's prediction screen: 304 km of range left at 80% charge, with a breakdown of where the energy goes across air drag, rolling, climbing and climate.",
      },
      {
        src: wattsLeftLive,
        label: 'LIVE',
        alt: "Watt's Left's live navigation screen over a 3D map, showing arrival time, distance left, and battery life at an assumed 110 km/h.",
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
    link: 'https://ploton.fi99.ca',
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
  {
    slug: 'write',
    name: 'WR!TE',
    oneLiner: 'Poems and stories, scanned for rhyme and meter on your machine.',
    status: 'shipped',
    year: 2026,
    tags: ['tool'],
    link: 'https://write.fi99.ca',
    shots: [
      {
        src: writeLibrary,
        label: 'LIBRARY',
        alt: 'WR!TE’s library: a searchable list of poems and stories, each row carrying its form, draft status, tags and date.',
      },
      {
        src: writeEditor,
        label: 'EDITOR',
        alt: 'WR!TE’s editor on Shakespeare’s Sonnet 18, syllable counts down the left margin and rhyme-scheme letters down the right, beside a panel of rhymes for “day”.',
      },
    ],
  },
];
