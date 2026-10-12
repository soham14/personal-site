// All site content in one place. Edit this file to update career info, dialogue, skills, etc.
// Game code imports from here; nothing else should hard-code these strings.

export const PROFILE = {
  name: 'Soham',
  headline: 'Senior Software Engineer at Roblox',
  summary: 'Product-minded engineer with platform depth. From travel booking to ads to social, and the tools behind them.',
  email: 'contact@soham.io',
  linkedin: 'https://www.linkedin.com/in/skudtarkar',
  linkedinLabel: 'linkedin.com/in/skudtarkar'
};

// One entry per map / career stage, in world order (index = map = tier).
export const STAGES = [
  {
    id: 'berkeley', org: 'UC Berkeley', title: 'B.A. Computer Science', jobTitle: 'Student', cls: 'Apprentice',
    dates: 'Aug 2014 – May 2018', years: '2014–2018', team: 'B.A. in Computer Science', highlights: [] as string[],
    outfit: 'Navy tunic, gold piping',
    crest: 'Golden Bear Crest', crestField: '#1d3a6b', crestTrim: '#f2b632',
    quest: 'Graduate from the Academy', rewardExp: '+5000 EXP'
  },
  {
    id: 'sap', org: 'SAP', title: 'Developer', jobTitle: 'Developer', cls: 'Mage',
    dates: 'Jul 2018 – Oct 2019', years: '2018–2019', team: 'Consumer-facing travel team',
    highlights: ['Implemented a new product vertical'],
    outfit: 'Bright blue robe, hex clasp',
    crest: 'Azure Bastion Crest', crestField: '#2f7fd6', crestTrim: '#e8f1ff',
    quest: 'Ship With a Team', rewardExp: '+8000 EXP'
  },
  {
    id: 'yelp', org: 'Yelp', title: 'Software Engineer', jobTitle: 'Software Engineer', cls: 'Wizard',
    dates: 'Oct 2019 – Oct 2022', years: '2019–2022', team: 'Two teams: Ad Discovery, and Web Core',
    highlights: ['Increased revenue for the business', 'Owned systems end to end'],
    outfit: 'Crimson robe, five-star sash',
    crest: 'Five-Star Crest', crestField: '#c8323a', crestTrim: '#f6ecd2',
    quest: 'Own a System End to End', rewardExp: '+12000 EXP'
  },
  {
    id: 'roblox', org: 'Roblox', title: 'Senior Software Engineer', jobTitle: 'Senior Software Engineer', cls: 'Archmage',
    dates: 'Oct 2022 – Present', years: '2022–present', team: 'Two teams: Social, and Internal Tooling',
    highlights: [
      'Upgraded deployment velocity for the entire organization',
      'Project-led the shipment of a large, high-visibility feature spanning 4 teams',
      'Managed an intern'
    ],
    outfit: 'Obsidian robe, silver cape',
    crest: 'Obsidian Block Crest', crestField: '#2b2b2e', crestTrim: '#c9ccd3',
    quest: 'Keep Growing', rewardExp: ''
  }
];

// Visual theme per map (same index as STAGES).
export const MAPS = [
  { name: 'Academy Grounds', short: 'UC Berkeley', a: '#f2b632', tx: '#f2b632', bar: '#1d3a6b', barTx: '#f2b632', port: '#1d3a6b', portHi: '#2a4e8a',
    sky: ['#0b1330', '#101c44', '#172756'], far: '#16264a', mid: '#1d3a6b', midHi: '#2a4e8a', win: '#f2b632',
    g: { top: '#7a86a0', shade: '#56627e', body: '#26345a', deco: '#1b2744' }, p: { t: '#f2b632', s: '#b07d12', b: '#1d3a6b', d: '#14284a' }, lad: '#c9a45a', stars: 24 },
  { name: 'Azure Citadel', short: 'SAP', a: '#2f7fd6', tx: '#7fb8ff', bar: '#1b3d6e', barTx: '#cfe8ff', port: '#1b3d6e', portHi: '#2f6fb5',
    sky: ['#08162c', '#0c2346', '#122f5a'], far: '#17335c', mid: '#1b3d6e', midHi: '#24508f', win: '#cfe8ff',
    g: { top: '#4a86c8', shade: '#2f5f96', body: '#1b3d6e', deco: '#14305a' }, p: { t: '#9fc4ee', s: '#2f7fd6', b: '#24508f', d: '#1b3d6e' }, lad: '#9fc4ee', stars: 24 },
  { name: 'Crimson Grove', short: 'Yelp', a: '#c8323a', tx: '#ff8a8f', bar: '#8f1f27', barTx: '#f6ecd2', port: '#8f1f27', portHi: '#b3333c',
    sky: ['#150c1a', '#22101f', '#321626'], far: '#3a1a2c', mid: '#8f2630', midHi: '#c8323a', win: '#ffd98a',
    g: { top: '#9c7a64', shade: '#6e5444', body: '#3a2a2a', deco: '#2a1d1d' }, p: { t: '#c8323a', s: '#8f1f27', b: '#8a5a3a', d: '#5a3a28' }, lad: '#d9a05a', stars: 24 },
  { name: 'Obsidian Spire', short: 'Roblox', a: '#c9ccd3', tx: '#e8eaf0', bar: '#2b2b2e', barTx: '#e8eaf0', port: '#2b2b2e', portHi: '#4a4a52',
    sky: ['#08080c', '#0f0f14', '#17171d'], far: '#1e1e25', mid: '#2b2b2e', midHi: '#3a3a40', win: '#e8eaf0',
    g: { top: '#5a5a64', shade: '#3a3a40', body: '#2b2b2e', deco: '#1c1c20' }, p: { t: '#c9ccd3', s: '#8d9099', b: '#2b2b2e', d: '#3a3a40' }, lad: '#c9ccd3', stars: 72 }
];

// Mentors: x is the offset within their map, h the surface height they stand on.
export const MENTORS = [
  { name: 'Professor Hug', short: 'Hug', x: 335, h: 0,
    line: 'Every archmage starts as an apprentice. Soham studied Computer Science at UC Berkeley (2014–2018). Finish your studies and the Golden Bear Crest is yours.' },
  { name: 'Ranger Amelia', short: 'Amelia', x: 770, h: 120,
    line: 'Welcome to the SAP guild. First real quests: shipping with a team, and implementing a whole new product vertical for consumer-facing travel (2018–2019).' },
  { name: 'Sky-Sage Tirumal', short: 'Tirumal', x: 760, h: 90,
    line: "The Yelp guild hall. More spells, more responsibility: owning systems end to end across Ad Discovery and Web Core, and increasing the business's revenue along the way (2019–2022)." },
  { name: 'Archivist Darragh', short: 'Darragh', x: 500, h: 80,
    line: 'Present day. Soham is a Senior Software Engineer with the Roblox guild. He sped up deploys for the whole org, shipped a high-visibility feature across four teams, and managed an intern. The portal ahead leads to his contact and résumé.' }
];

export const PORTAL = {
  name: 'Starlight Portal', x: 3640,
  line: 'The portal hums with starlight. Step through to reach contact details and the résumé.'
};

export const SKILLS = [
  { name: 'Product', nodes: ['TypeScript', 'JavaScript', 'React', 'GraphQL', 'Lua'] },
  { name: 'Platform', nodes: ['Frontend infrastructure', 'CI', 'Reliability', 'Deployment velocity', 'Security'] },
  { name: 'Data', nodes: ['SQL', 'Python', 'Data analysis'] },
  { name: 'Leadership', nodes: ['Project leadership', 'Management', 'Mentorship', 'Stakeholder alignment'] }
];

// Trials: one per gate (Hex Lock at Berkeley→SAP, Lantern Match at SAP→Yelp, Five-Star Rush at Yelp→Roblox) plus the endless one at the sealed gate.
export const TRIALS = {
  hex: { name: 'Hex Lock', mentor: 0, gateX: 960, title: 'Seal Breaker', how: 'Earn 5 stars in Hex Lock' },
  lan: { name: 'Lantern Match', mentor: 1, gateX: 1920, title: 'Lamplighter', how: 'Earn 5 stars in Lantern Match' },
  rush: { name: 'Five-Star Rush', mentor: 2, gateX: 2880, title: 'Five-Star Mage', how: 'Earn 5 stars in Five-Star Rush' },
  stk: { name: 'Keep Leveling', mentor: 3, gateX: 3750, title: 'Always Growing', how: 'Reach 20 floors in Keep Leveling' }
} as const;
export type TrialKind = keyof typeof TRIALS;

// World geometry (unchanged from the approved mockup).
export const WORLD = {
  MW: 960, WMIN: 0, WMAX: 3900, WALK: 260, G: 3000, JUMP: 830, CLIMB: 180, LOCKX: 3750, GATES: [960, 1920, 2880],
  // [map, x offset within map, width, top height above ground]
  platforms: [
    [0, 20, 90, 80], [0, 230, 130, 150], [0, 430, 140, 80], [0, 640, 150, 130], [0, 800, 110, 80],
    [1, 90, 110, 70], [1, 210, 100, 110], [1, 330, 150, 170], [1, 540, 140, 80], [1, 720, 130, 120],
    [2, 50, 110, 80], [2, 120, 120, 150], [2, 380, 130, 100], [2, 500, 160, 230], [2, 700, 120, 90], [2, 840, 100, 160],
    [3, 80, 120, 80], [3, 250, 110, 140], [3, 430, 120, 80]
  ].map((p, i) => ({ id: i, map: p[0], x: p[0] * 960 + p[1], w: p[2], top: p[3] })),
  ladders: [{ x: 1340, top: 170, map: 1 }, { x: 2440, top: 230, map: 2 }]
};

export const EXP_BASE = 95; // "To next advancement" percent; Keep Leveling nudges it up to 99.
