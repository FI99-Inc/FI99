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
import jmawLanding from '../assets/work/jmaw-1.webp';
import jmawReport from '../assets/work/jmaw-2.webp';
import fallowLanding from '../assets/work/fallow-1.png';
import fallowMatch from '../assets/work/fallow-2.png';

// This sequence drives both the complete work index and its three homepage picks.
const projectOrder = ['watts-left', 'jmaw', 'ploton', 'fallow', 'write', 'krine'];

export const projects = [
  {
    slug: 'jmaw',
    name: 'Junior Mining Analyst Workbench',
    oneLiner: 'Junior mining companies, evaluated by evidence instead of market noise.',
    status: 'in the lab',
    year: 2026,
    tags: ['tool'],
    shots: [
      {
        src: jmawLanding,
        label: 'RESEARCH',
        alt: "Junior Mining Analyst Workbench's research landing page, with a ticker search, an explanation of its cited diligence process, and a grid of junior mining companies to explore.",
      },
      {
        src: jmawReport,
        label: 'ANALYSIS',
        alt: "Junior Mining Analyst Workbench's US GoldMining report, showing evidence-adjusted feasibility, market data, diligence categories, and sources.",
      },
    ],
  },
  {
    slug: 'fallow',
    name: 'Fallow',
    oneLiner: 'Hobby discovery matched to your psychology, not your stated interests.',
    status: 'in the lab',
    year: 2026,
    tags: ['tool'],
    link: 'https://fallow.fi99.ca',
    shots: [
      {
        src: fallowLanding,
        label: 'LANDING',
        alt: 'Fallow’s landing page: "Let your mind lie fallow. See what grows." beside a beta callout offering five matched activities from a three-minute assessment.',
      },
      {
        src: fallowMatch,
        label: 'MATCH',
        alt: 'A Fallow swipe card for Axe Throwing Leagues, tagged PHYSICAL/OUTDOOR under the profile traits Absorbing, Involved and Structured, with its first step, cost and match score.',
      },
    ],
  },
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
    status: 'shipped',
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
].sort((a, b) => projectOrder.indexOf(a.slug) - projectOrder.indexOf(b.slug));
