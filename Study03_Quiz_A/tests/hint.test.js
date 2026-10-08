const test = require('node:test');
const assert = require('node:assert');
const { QUESTIONS } = require('../questions.js');
const { pickQuestions, scoreFor, createGame, answer, nextQuestion, useHint } = require('../script.js');

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function startGame(mode, seed = 1) {
  const questions = pickQuestions(QUESTIONS, '과학', seededRng(seed));
  return createGame({ mode, category: '과학', questions });
}

test('scoreFor: 힌트 모드 점수', () => {
  assert.strictEqual(scoreFor('hint', true, true), 0.5);
  assert.strictEqual(scoreFor('hint', true, false), 1);
  assert.strictEqual(scoreFor('hint', false, true), 0);
  assert.strictEqual(scoreFor('hint', false, false), 0);
});

test('힌트는 오답 2개를 지우고 정답 보기는 남긴다 (100회)', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const game = startGame('hint', seed);
    const hidden = useHint(game, seededRng(seed * 7));
    const q = game.questions[0];
    assert.strictEqual(hidden.length, 2);
    assert.strictEqual(new Set(hidden).size, 2);
    assert.ok(!hidden.includes(q.answer), '정답 보기는 지우지 않음');
    assert.ok(hidden.every((i) => i >= 0 && i <= 3));
    assert.deepStrictEqual(game.hidden, hidden);
    assert.strictEqual(game.hintUsed, true);
  }
});

test('힌트를 쓰고 맞히면 0.5점, 힌트 없이 맞히면 1점, 힌트 후 틀리면 0점', () => {
  const game = startGame('hint');
  useHint(game);
  const fb1 = answer(game, game.questions[0].answer);
  assert.strictEqual(fb1.points, 0.5);
  assert.strictEqual(game.score, 0.5);
  nextQuestion(game);
  const fb2 = answer(game, game.questions[1].answer);
  assert.strictEqual(fb2.points, 1);
  assert.strictEqual(game.score, 1.5);
  nextQuestion(game);
  useHint(game);
  const q2 = game.questions[2];
  const visibleWrong = [0, 1, 2, 3].find((i) => i !== q2.answer && !game.hidden.includes(i));
  const fb3 = answer(game, visibleWrong);
  assert.strictEqual(fb3.correct, false);
  assert.strictEqual(fb3.points, 0);
  assert.strictEqual(game.score, 1.5);
  assert.deepStrictEqual(game.results.map((r) => r.hintUsed), [true, false, true]);
});

test('useHint를 두 번 호출하면 두 번째는 null이고 hidden은 바뀌지 않는다', () => {
  const game = startGame('hint');
  const first = useHint(game);
  const snapshot = game.hidden.slice();
  assert.strictEqual(useHint(game), null);
  assert.deepStrictEqual(game.hidden, snapshot);
  assert.deepStrictEqual(first, snapshot);
});

test('지워진 보기를 answer하면 null이고 점수·상태가 그대로이다', () => {
  const game = startGame('hint');
  useHint(game);
  assert.strictEqual(answer(game, game.hidden[0]), null);
  assert.strictEqual(game.answered, false);
  assert.strictEqual(game.score, 0);
  assert.strictEqual(game.results.length, 0);
  assert.ok(answer(game, game.questions[0].answer));
});

test('연습·스피드 모드에서 useHint는 null이다', () => {
  for (const mode of ['practice', 'speed']) {
    const game = startGame(mode);
    assert.strictEqual(useHint(game), null);
    assert.strictEqual(game.hintUsed, false);
    assert.deepStrictEqual(game.hidden, []);
  }
});

test('이미 답한 문항에서 useHint는 null이다', () => {
  const game = startGame('hint');
  answer(game, game.questions[0].answer);
  assert.strictEqual(useHint(game), null);
  assert.strictEqual(game.hintUsed, false);
});

test('다음 문항으로 가면 hidden과 hintUsed가 초기화된다', () => {
  const game = startGame('hint');
  useHint(game);
  answer(game, game.questions[0].answer);
  nextQuestion(game);
  assert.deepStrictEqual(game.hidden, []);
  assert.strictEqual(game.hintUsed, false);
  assert.ok(useHint(game), '새 문항에서는 다시 힌트를 쓸 수 있다');
});
