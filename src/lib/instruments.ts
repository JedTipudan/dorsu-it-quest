// Research instruments embedded in the platform (see Methodology → Research Instruments).

/** System Usability Scale (Brooke, 1996) — wording adapted to DOrSU IT Quest. */
export const SUS_ITEMS = [
  'I think that I would like to use DOrSU IT Quest frequently.',
  'I found DOrSU IT Quest unnecessarily complex.',
  'I thought DOrSU IT Quest was easy to use.',
  'I think that I would need the support of a technical person to be able to use DOrSU IT Quest.',
  'I found the various functions in DOrSU IT Quest were well integrated.',
  'I thought there was too much inconsistency in DOrSU IT Quest.',
  'I would imagine that most people would learn to use DOrSU IT Quest very quickly.',
  'I found DOrSU IT Quest very cumbersome to use.',
  'I felt very confident using DOrSU IT Quest.',
  'I needed to learn a lot of things before I could get going with DOrSU IT Quest.',
]

/** Motivation & Engagement Scale — situational interest, persistence, perceived value, engagement. */
export const MOTIVATION_ITEMS: { dimension: string; text: string }[] = [
  { dimension: 'Situational Interest', text: 'Reviewing with DOrSU IT Quest made the lessons more interesting.' },
  { dimension: 'Situational Interest', text: 'The quests, badges and leaderboards caught my attention.' },
  { dimension: 'Situational Interest', text: 'I looked forward to my review sessions on the platform.' },
  { dimension: 'Persistence', text: 'I kept trying a quest even after getting low scores.' },
  { dimension: 'Persistence', text: 'I reviewed more often than I usually do with handouts or slides.' },
  { dimension: 'Persistence', text: 'Streaks and levels encouraged me to come back regularly.' },
  { dimension: 'Perceived Value', text: 'The quests helped me understand my core major subjects better.' },
  { dimension: 'Perceived Value', text: 'The instant feedback showed me which topics I still need to study.' },
  { dimension: 'Perceived Value', text: 'What I practiced on the platform matched what is taught in class.' },
  { dimension: 'Engagement', text: 'I felt absorbed while completing quests and challenges.' },
  { dimension: 'Engagement', text: 'I actively tried to improve my scores and earn badges.' },
  { dimension: 'Engagement', text: 'I would recommend DOrSU IT Quest to other BSIT students.' },
]

export const LIKERT = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
]
