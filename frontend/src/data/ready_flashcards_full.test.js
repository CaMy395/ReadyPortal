import deck from './ready_flashcards_full.json';

test('every study card has unique identity and valid guide page references', () => {
  expect(new Set(deck.map(card => card.id)).size).toBe(deck.length);
  expect(new Set(deck.map(card => card.q)).size).toBe(deck.length);
  for (const card of deck) {
    expect(card.q.trim()).toBeTruthy();
    expect(card.a.trim()).toBeTruthy();
    expect(card.category.trim()).toBeTruthy();
    expect(card.pages.length).toBeGreaterThan(0);
    expect(card.pages.every(p => Number.isInteger(p) && p >= 1 && p <= 53)).toBe(true);
  }
});

test('every question has complete, distinct, authored quiz choices', () => {
  for (const card of deck) {
    const choices = [card.quiz.answer, ...card.quiz.distractors];
    expect([2, 4]).toContain(choices.length);
    expect(choices.every(choice => typeof choice === 'string' && choice.trim().length > 0)).toBe(true);
    expect(new Set(choices.map(choice => choice.toLowerCase().trim())).size).toBe(choices.length);
  }
});

test('numeric questions offer the same kind of numeric answers', () => {
  const checks = {
    'laws-1': /^\d+ years old\.$/,
    'laws-2': /^\d+ years old\.$/,
    'guide-certification-3': /^\d+(\.\d+)?%\.$/,
    'guide-certification-4': /^\d+(\.\d+)?%\.$/,
    'guide-certification-5': /^\d+(\.\d+)?%\.$/,
    'guide-certification-9': /^\$\d+\.$/,
    'guide-wine-beer-1': /^\d+ ounces\.$/,
  };
  for (const [id, pattern] of Object.entries(checks)) {
    const card = deck.find(c => c.id === id);
    for (const choice of [card.quiz.answer, ...card.quiz.distractors]) expect(choice).toMatch(pattern);
  }
});

test('recipe options test the same recipe instead of unrelated facts', () => {
  const normalizeAmounts = text => text.replace(/\d+(?:\.\d+)? oz/g, 'AMOUNT oz');
  for (const card of deck.filter(c => ['Cocktails', 'Shots', 'Sparkling Cocktails'].includes(c.category))) {
    for (const wrong of card.quiz.distractors) expect(normalizeAmounts(wrong)).toBe(normalizeAmounts(card.quiz.answer));
  }
});

test('updated responsible service, safety, and course requirements are included', () => {
  for (const category of ['Certification', 'Refusal of Service', 'Incident Reporting', 'Identification', 'Drug-Free Workplace', 'Alcohol & Impairment', 'Guest Safety', 'Spirits & Liqueurs', 'Wine & Beer', 'Techniques', 'Sparkling Cocktails']) {
    expect(deck.some(card => card.category === category)).toBe(true);
  }
  expect(deck.find(c => c.q.includes('written exam score')).a).toBe('80%.');
  expect(deck.find(c => c.q.includes('practical evaluation score')).a).toContain('85%');
  expect(deck.find(c => c.q.includes('overall score')).a).toContain('82.5%');
  expect(deck.find(c => c.q.includes('automatically clear')).a).toMatch(/^No\./);
  expect(deck.find(c => c.q.includes('meanings standardized')).a).toMatch(/^No\./);
  expect(deck.find(c => c.id === 'cocktails-74').a).toContain('1.5 oz Vodka');
  expect(deck.find(c => c.id === 'cocktails-93').a).toContain('No Triple Sec');
});
