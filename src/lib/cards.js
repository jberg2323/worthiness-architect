// Quick Reset card library and deck builder.
// Each card is one short, doable intervention. Order in a deck follows regulation:
// body first (settle the alarm), then mind (perspective/reframe), kindness, then one small action.

export const RESET_STATES = [
  { id: 'ashamed', label: 'Ashamed', hint: 'Like I am the problem' },
  { id: 'not-enough', label: 'Not enough', hint: 'Like I failed or fell short' },
  { id: 'worried', label: 'Worried what they think', hint: 'Someone is upset or judging' },
  { id: 'rejected', label: 'Rejected', hint: 'Left out, ignored, unwanted' },
  { id: 'guilty-rest', label: 'Guilty for resting', hint: "Like I haven't earned a break" },
  { id: 'overwhelmed', label: 'Overwhelmed', hint: 'Too much, can\'t think' }
];

export const CARD_KINDS = {
  breath: { label: 'Breathe', group: 'body' },
  body: { label: 'Body', group: 'body' },
  perspective: { label: 'Perspective', group: 'mind' },
  reframe: { label: 'Reframe', group: 'mind' },
  kindness: { label: 'Kindness', group: 'kindness' },
  action: { label: 'Small action', group: 'action' },
  yours: { label: 'From you', group: 'yours' }
};

const ALL = ['ashamed', 'not-enough', 'worried', 'rejected', 'guilty-rest', 'overwhelmed'];

export const CARDS = [
  // Body and breath: settle the nervous system first
  { id: 'sigh', kind: 'breath', states: ALL, seconds: 30, title: 'Double inhale, long exhale', body: 'Two short breaths in through your nose, then one long, slow breath out through your mouth. Three times.' },
  { id: 'four-six', kind: 'breath', states: ALL, seconds: 60, title: 'Make the exhale longer', body: 'In for 4, out for 6. A longer exhale tells your body the threat has passed.' },
  { id: 'feet', kind: 'body', states: ALL, seconds: 30, title: 'Find the floor', body: 'Press both feet into the ground. Feel your heels, your seat, your back against the chair. You are here, and you are held up.' },
  { id: 'unclench', kind: 'body', states: ALL, seconds: 20, title: 'Stop bracing', body: 'Drop your jaw. Lower your shoulders. Open your hands. Notice where you were holding on.' },
  { id: 'cold', kind: 'body', states: ['worried', 'overwhelmed', 'ashamed'], seconds: 30, title: 'Cold reset', body: 'Run cold water over your wrists or hold something cold. The shock helps interrupt the spiral.' },
  { id: 'shake', kind: 'body', states: ['worried', 'overwhelmed'], seconds: 20, title: 'Shake it out', body: 'Stand up and shake your hands and arms loosely. Let the adrenaline go somewhere.' },
  { id: 'senses', kind: 'body', states: ['worried', 'overwhelmed'], seconds: 60, title: '5 · 4 · 3', body: 'Name five things you can see, four you can hear, three you can touch. Come back to the room.' },
  { id: 'tall', kind: 'body', states: ['not-enough', 'rejected', 'ashamed'], seconds: 30, title: 'Take up your space', body: 'Sit or stand tall, chest open, for thirty seconds. Not to perform. Just to be the size you are.' },

  // Mind: create distance from the verdict
  { id: 'noticing', kind: 'perspective', states: ['ashamed', 'not-enough', 'worried', 'rejected'], title: '"I\'m noticing the thought that…"', body: 'Say the critic\'s line, then put "I\'m noticing the thought that" in front of it. Feel the small step back.' },
  { id: 'facts', kind: 'reframe', states: ['ashamed', 'not-enough', 'worried'], title: 'Just the facts', body: 'Finish this in one sentence, with no adjectives about you: "What actually happened is…"' },
  { id: 'did-not-am', kind: 'reframe', states: ['ashamed', 'not-enough'], title: '"I did," not "I am"', body: 'Swap "I am a ___" for "I did ___" or "This happened." Actions can be repaired. You are not broken.' },
  { id: 'rest-maintenance', kind: 'reframe', states: ['guilty-rest', 'overwhelmed'], title: 'Rest isn\'t a reward', body: 'Rest isn\'t something you earn by being productive. It\'s maintenance for a person who already matters.' },
  { id: 'their-moment', kind: 'reframe', states: ['worried', 'rejected'], title: 'Their mood isn\'t your verdict', body: 'Someone\'s reaction tells you about their moment. It isn\'t a ruling on your worth.' },
  { id: 'spotlight', kind: 'perspective', states: ['worried', 'ashamed'], title: 'The spotlight is dimmer than it feels', body: 'People think about you far less than it seems. Most of them are busy worrying about their own spotlight.' },
  { id: 'one-year', kind: 'perspective', states: ['overwhelmed', 'not-enough', 'worried'], title: 'The one-year test', body: 'Will this matter in a year? Name one thing about you that will still be true then, whatever happens today.' },
  { id: 'critic-job', kind: 'perspective', states: ['not-enough', 'guilty-rest', 'ashamed'], title: 'Ask the critic what it fears', body: '"What are you afraid will happen if you stop?" Thank it for trying to protect you. You can take it from here.' },
  { id: 'mistake-data', kind: 'reframe', states: ['not-enough', 'ashamed'], title: 'A mistake is data', body: 'It\'s information, not identity. What is one thing this is teaching you?' },
  { id: 'belonging', kind: 'reframe', states: ['rejected', 'worried', 'ashamed'], title: 'Your place wasn\'t built on this', body: 'Your place with the people who love you was never built on this moment going well.' },

  // Kindness: speak to yourself like someone worth protecting
  { id: 'hand-heart', kind: 'kindness', states: ['ashamed', 'not-enough', 'rejected', 'worried'], seconds: 30, title: 'Hand on your heart', body: 'Place a hand on your chest and feel its warmth for three breaths. It\'s the gesture you\'d offer a friend.' },
  { id: 'friend', kind: 'kindness', states: ALL, title: 'The friend test', body: 'What would you say to a friend who told you this? Say exactly that to yourself, out loud if you can.' },
  { id: 'human', kind: 'kindness', states: ['ashamed', 'not-enough', 'rejected'], title: 'You\'re not the only one', body: 'Right now, thousands of people feel exactly this. You\'re not uniquely broken. You\'re human.' },
  { id: 'enough-now', kind: 'kindness', states: ['guilty-rest', 'overwhelmed', 'not-enough'], title: 'Enough for right now', body: 'Say it slowly: "I\'ve done enough for right now. I\'m allowed to stop here."' },
  { id: 'permission', kind: 'kindness', states: ['guilty-rest', 'not-enough'], title: 'Write a permission slip', body: '"I give myself permission to ___." Rest. Be imperfect. Say no.' },

  // Action: one small move that treats you as worthy
  { id: 'tiny-step', kind: 'action', states: ['overwhelmed', 'not-enough'], title: 'Just the next two minutes', body: 'Pick the smallest next step, something you could do in two minutes. Do only that.' },
  { id: 'brain-dump', kind: 'action', states: ['overwhelmed', 'worried'], seconds: 60, title: 'Empty your head', body: 'Write down everything you\'re carrying for one minute. Don\'t organize it. Just get it out of your head.' },
  { id: 'reach-out', kind: 'action', states: ['rejected', 'ashamed', 'worried'], title: 'Send one message', body: 'Text someone safe. It doesn\'t have to be about this. Connection quiets the alarm.' },
  { id: 'park-it', kind: 'action', states: ['worried', 'overwhelmed'], title: 'Park it for later', body: 'You don\'t have to fix this right now. Pick a time to come back to it and put it on the calendar.' },
  { id: 'water', kind: 'action', states: ['guilty-rest', 'overwhelmed', 'not-enough'], seconds: 60, title: 'One kind thing for your body', body: 'Drink a glass of water, or step outside for a minute. Care doesn\'t have to be earned first.' }
];

const DECK_SHAPE = ['body', 'mind', 'mind', 'kindness', 'action'];

// Weight cards by what has helped this person before, with a little randomness for variety
function pick(pool, stats, used) {
  const candidates = pool.filter(c => !used.has(c.id));
  if (candidates.length === 0) return null;
  const scored = candidates.map(c => {
    const s = stats[c.id] || { helped: 0, skipped: 0 };
    return { c, score: 1 + s.helped * 1.5 - s.skipped * 0.6 + Math.random() * 1.2 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].c;
}

// personal: [{ id, title, body }] drawn from the user's own reframes and evidence
export function buildDeck({ state, stats, personal }) {
  const fits = (c) => state === 'any' || c.states.includes(state);
  const used = new Set();
  const deck = [];

  DECK_SHAPE.forEach(group => {
    // Swap the kindness slot for one of the user's own cards when available
    if (group === 'kindness' && personal.length > 0) {
      const own = personal[Math.floor(Math.random() * personal.length)];
      deck.push({ ...own, kind: 'yours' });
      return;
    }
    const pool = CARDS.filter(c => CARD_KINDS[c.kind].group === group && fits(c));
    const card = pick(pool.length ? pool : CARDS.filter(c => CARD_KINDS[c.kind].group === group), stats, used);
    if (card) {
      used.add(card.id);
      deck.push(card);
    }
  });

  return deck;
}
