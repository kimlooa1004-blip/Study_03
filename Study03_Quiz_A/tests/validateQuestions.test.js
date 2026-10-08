const test = require('node:test');
const assert = require('node:assert');
const { validateQuestions } = require('./validateQuestions.js');

const good = () => ({
  id: 'science-01',
  category: '과학',
  question: '물의 끓는점은 1기압에서 몇 도인가?',
  choices: ['50도', '80도', '100도', '120도'],
  answer: 2,
  explanation: '1기압에서 물은 100도에서 끓는다.',
  source: '국가기술표준원 SI 단위 안내'
});

test('유효한 문항은 위반이 없다', () => {
  assert.deepStrictEqual(validateQuestions([good()]), []);
});

test('보기가 3개이면 위반', () => {
  const q = good();
  q.choices = ['a', 'b', 'c'];
  assert.ok(validateQuestions([q]).length >= 1);
});

test('answer가 범위 밖이면 위반', () => {
  const q = good();
  q.answer = 4;
  assert.ok(validateQuestions([q]).length >= 1);
});

test('해설에 줄바꿈이 있으면 위반', () => {
  const q = good();
  q.explanation = '첫째 줄\n둘째 줄';
  assert.ok(validateQuestions([q]).length >= 1);
});

test('출처가 비어 있으면 위반', () => {
  const q = good();
  q.source = '';
  assert.ok(validateQuestions([q]).length >= 1);
});

test('id가 중복되면 위반', () => {
  assert.ok(validateQuestions([good(), good()]).length >= 1);
});

test('카테고리가 4개 밖이면 위반', () => {
  const q = good();
  q.category = '스포츠';
  assert.ok(validateQuestions([q]).length >= 1);
});

test('기준 없는 최상급 문제는 위반', () => {
  const q = good();
  q.question = '가장 큰 나라는?';
  assert.ok(validateQuestions([q]).length >= 1);
});

test('기준이 있는 최상급 문제는 통과', () => {
  const q = good();
  q.question = '2024년 면적 기준 가장 큰 나라는?';
  assert.deepStrictEqual(validateQuestions([q]), []);
});

test('보기 문자열이 중복되면 위반', () => {
  const q = good();
  q.choices = ['a', 'a', 'b', 'c'];
  assert.ok(validateQuestions([q]).length >= 1);
});
