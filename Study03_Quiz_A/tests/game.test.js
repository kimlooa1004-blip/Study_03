const test = require('node:test');
const assert = require('node:assert');
const { QUESTIONS } = require('../questions.js');
const {
  CATEGORIES, shuffle, pickQuestions, scoreFor, createGame, answer, nextQuestion, isFinished
} = require('../script.js');

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function startPractice(seed = 1) {
  const questions = pickQuestions(QUESTIONS, '과학', seededRng(seed));
  return createGame({ mode: 'practice', category: '과학', questions });
}

test('CATEGORIES는 4개 카테고리이다', () => {
  assert.deepStrictEqual(CATEGORIES, ['한국사', '세계지리', '과학', '예술과 문화']);
});

test('shuffle은 원본을 바꾸지 않고 같은 원소를 가진다', () => {
  const src = [1, 2, 3, 4, 5, 6];
  const copy = src.slice();
  const out = shuffle(src, seededRng(7));
  assert.deepStrictEqual(src, copy);
  assert.deepStrictEqual(out.slice().sort(), copy);
  assert.notStrictEqual(out, src);
});

test('pickQuestions는 그 카테고리 10문항만 돌려준다', () => {
  const picked = pickQuestions(QUESTIONS, '과학', seededRng(3));
  assert.strictEqual(picked.length, 10);
  assert.ok(picked.every((q) => q.category === '과학'));
  assert.deepStrictEqual(
    picked.map((q) => q.id).sort(),
    QUESTIONS.filter((q) => q.category === '과학').map((q) => q.id).sort()
  );
});

test('보기를 섞어도 정답 보기가 같고 구성이 원본과 같다 (50회)', () => {
  const byId = new Map(QUESTIONS.map((q) => [q.id, q]));
  for (let seed = 1; seed <= 50; seed++) {
    for (const q of pickQuestions(QUESTIONS, '한국사', seededRng(seed))) {
      const orig = byId.get(q.id);
      assert.strictEqual(q.choices[q.answer], orig.choices[orig.answer]);
      assert.deepStrictEqual(q.choices.slice().sort(), orig.choices.slice().sort());
    }
  }
});

test('pickQuestions는 원본 QUESTIONS를 바꾸지 않는다', () => {
  const before = JSON.stringify(QUESTIONS);
  pickQuestions(QUESTIONS, '세계지리', seededRng(9));
  assert.strictEqual(JSON.stringify(QUESTIONS), before);
});

test('문항이 9개뿐인 카테고리는 Error', () => {
  const nine = QUESTIONS.filter((q) => q.category === '과학').slice(0, 9);
  assert.throws(() => pickQuestions(nine, '과학'), Error);
  assert.throws(() => pickQuestions([], '과학'), Error);
});

test('scoreFor: 연습은 정답 1점, 오답 0점', () => {
  assert.strictEqual(scoreFor('practice', true, false), 1);
  assert.strictEqual(scoreFor('practice', false, false), 0);
});

test('연습 모드에서 정답은 1점, 오답은 0점이고 점수가 쌓인다', () => {
  const game = startPractice();
  const q0 = game.questions[0];
  const fb = answer(game, q0.answer);
  assert.strictEqual(fb.correct, true);
  assert.strictEqual(fb.points, 1);
  assert.strictEqual(fb.correctIndex, q0.answer);
  assert.strictEqual(fb.explanation, q0.explanation);
  assert.strictEqual(fb.source, q0.source);
  assert.strictEqual(game.score, 1);
  nextQuestion(game);
  const q1 = game.questions[1];
  const wrong = (q1.answer + 1) % 4;
  const fb2 = answer(game, wrong);
  assert.strictEqual(fb2.correct, false);
  assert.strictEqual(fb2.points, 0);
  assert.strictEqual(game.score, 1);
});

test('같은 문항에서 answer를 두 번 호출하면 두 번째는 null이고 점수는 한 번만 반영된다', () => {
  const game = startPractice();
  const right = game.questions[0].answer;
  assert.ok(answer(game, right));
  assert.strictEqual(answer(game, right), null);
  assert.strictEqual(answer(game, (right + 1) % 4), null);
  assert.strictEqual(game.score, 1);
  assert.strictEqual(game.results.length, 1);
});

test('범위 밖 보기 번호는 null이고 채점되지 않는다', () => {
  const game = startPractice();
  assert.strictEqual(answer(game, 4), null);
  assert.strictEqual(answer(game, -1), null);
  assert.strictEqual(game.answered, false);
});

test('answer 전 nextQuestion은 index를 바꾸지 않는다', () => {
  const game = startPractice();
  nextQuestion(game);
  assert.strictEqual(game.index, 0);
});

test('10문제를 모두 풀고 nextQuestion 10번이면 isFinished', () => {
  const game = startPractice();
  assert.strictEqual(isFinished(game), false);
  for (let i = 0; i < 10; i++) {
    assert.strictEqual(isFinished(game), false);
    answer(game, game.questions[i].answer);
    nextQuestion(game);
  }
  assert.strictEqual(isFinished(game), true);
  assert.strictEqual(game.score, 10);
  assert.strictEqual(answer(game, 0), null);
});

test('results에 문항별 결과가 풀이 순서대로 기록된다', () => {
  const game = startPractice();
  answer(game, game.questions[0].answer);
  nextQuestion(game);
  answer(game, (game.questions[1].answer + 1) % 4);
  assert.deepStrictEqual(game.results, [
    { id: game.questions[0].id, correct: true, hintUsed: false, timedOut: false },
    { id: game.questions[1].id, correct: false, hintUsed: false, timedOut: false }
  ]);
});
