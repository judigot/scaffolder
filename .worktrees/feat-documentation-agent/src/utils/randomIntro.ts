// Hardcoded AI intro messages
const intros = [
  'I am at your service.',
  'At your service.',
  'How may I assist?',
  'You may proceed.',
  'I will attend to this.',
  'I am standing by.',
  'Ready when you are.',
  'I will see to it.',
  'I will take it from here.',
  'Proceed when ready.',
  'I will handle the details.',
] as const;

// Returns one random, hardcoded intro
export function getRandomIntro(): string {
  const index = Math.floor(Math.random() * intros.length);
  return intros[index];
}
