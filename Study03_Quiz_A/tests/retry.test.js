const test = require('node:test');
const assert = require('node:assert');
const { QUESTIONS } = require('../questions.js');
const {
  pickQuestions, createGame, answer, nextQuestion, isFinished, wrongQuestions, retryGame
} = require('../script.js');

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// wrongAt에 든 번호(0부터)의 문항은 틀리게, 나머지는 맞히게 한 판을 끝까지 푼다.
function play(game, wrongAt = []) {
  while (!isFinished(game)) {
    const q = game.questions[game.index];
    answer(game, wrongAt.includes(game.index) ? (q.answer + 1) % 4 : q.answer);
    nextQuestion(game);
  }
  return game;
}

function firstGame(wrongAt) {
  const questions = pickQuestions(QUESTIONS, '한국사', seededRng(5));
  return play(createGame({ mode: 'practice', category: '한국사', questions }), wrongAt);
}

test('wrongQuestions는 틀린 문항을 푼 순서대로 돌려준다', () => {
  const game = firstGame([1, 4, 8]);
  assert.deepStrictEqual(
    wrongQuestions(game).map((q) => q.id),
    [1, 4, 8].map((i) => game.questions[i].id)
  );
});

test('전부 맞힌 판은 retryGame이 null이다', () => {
  const game = firstGame([]);
  assert.strictEqual(wrongQuestions(game).length, 0);
  assert.strictEqual(retryGame(game), null);
});

test('retryGame은 틀린 문항만 담은 연습 판을 만든다', () => {
  const game = firstGame([2, 6]);
  const retry = retryGame(game);
  assert.strictEqual(retry.mode, 'practice');
  assert.strictEqual(retry.category, '한국사');
  assert.strictEqual(retry.isRetry, true);
  assert.strictEqual(retry.index, 0);
  assert.strictEqual(retry.score, 0);
  assert.deepStrictEqual(
    retry.questions.map((q) => q.id).sort(),
    [2, 6].map((i) => game.questions[i].id).sort()
  );
});

test('다시 푸는 판의 보기 구성과 정답은 원본과 같다 (보기는 새로 섞임)', () => {
  const game = firstGame([0, 3, 5]);
  const retry = retryGame(game, seededRng(11));
  for (const q of retry.questions) {
    const orig = game.questions.find((o) => o.id === q.id);
    assert.deepStrictEqual(q.choices.slice().sort(), orig.choices.slice().sort());
    assert.strictEqual(q.choices[q.answer], orig.choices[orig.answer]);
  }
});

test('다시 풀어도 원래 판의 점수와 결과는 바뀌지 않는다', () => {
  const game = firstGame([1, 2]);
  const scoreBefore = game.score;
  const resultsBefore = JSON.stringify(game.results);
  play(retryGame(game));
  assert.strictEqual(scoreBefore, 8);
  assert.strictEqual(game.score, scoreBefore);
  assert.strictEqual(JSON.stringify(game.results), resultsBefore);
});

test('다시 풀다가 또 틀리면 그 문항만으로 다시 풀 수 있고 모두 맞히면 null이다', () => {
  const game = firstGame([0, 1, 2]);
  const retry1 = retryGame(game);
  const stillWrongId = retry1.questions[1].id;
  play(retry1, [1]);
  const retry2 = retryGame(retry1);
  assert.deepStrictEqual(retry2.questions.map((q) => q.id), [stillWrongId]);
  assert.strictEqual(retry2.isRetry, true);
  play(retry2);
  assert.strictEqual(retryGame(retry2), null);
});

test('retryGame은 원래 판 객체를 바꾸지 않는다', () => {
  const game = firstGame([3]);
  const snapshot = JSON.stringify(game);
  retryGame(game);
  assert.strictEqual(JSON.stringify(game), snapshot);
});
