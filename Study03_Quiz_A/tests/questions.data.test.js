const test = require('node:test');
const assert = require('node:assert');
const { QUESTIONS } = require('../questions.js');
const { validateQuestions, CATEGORIES } = require('./validateQuestions.js');

test('문항 40개가 문항 규칙을 모두 만족한다', () => {
  assert.deepStrictEqual(validateQuestions(QUESTIONS), []);
});

test('전체 문항은 정확히 40개이다', () => {
  assert.strictEqual(QUESTIONS.length, 40);
});

for (const category of CATEGORIES) {
  test(`${category}는 정확히 10문항이다`, () => {
    assert.strictEqual(QUESTIONS.filter((q) => q.category === category).length, 10);
  });
}
