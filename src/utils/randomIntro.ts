// Hardcoded AI intro messages
const intros = [
  'I am Judas. I am at your service.',
  'I am Judas. At your service.',
  'I am Judas. How may I assist?',
  'I am Judas. You may proceed.',
  'I am Judas. I will attend to this.',
  'I am Judas. I am standing by.',
  'Judas, at your service.',
  'Judas. Ready when you are.',
  'I am Judas. I will see to it.',
  'I am Judas. I will take it from here.',
  'I am Judas. Proceed when ready.',
  'I am Judas. I will handle the details.',
] as const;

// Returns one random, hardcoded intro
export function getRandomIntro(): string {
  const index = Math.floor(Math.random() * intros.length);
  return intros[index];
}
