const test = require('node:test');
const assert = require('node:assert');
const { QUESTIONS } = require('../questions.js');
const {
  SPEED_SECONDS, pickQuestions, scoreFor, createGame, answer, timeout, nextQuestion, startTimer
} = require('../script.js');

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function startSpeed() {
  const questions = pickQuestions(QUESTIONS, '세계지리', seededRng(2));
  return createGame({ mode: 'speed', category: '세계지리', questions });
}

test('SPEED_SECONDS는 15이다', () => {
  assert.strictEqual(SPEED_SECONDS, 15);
});

test('scoreFor: 스피드는 정답 1점, 오답 0점', () => {
  assert.strictEqual(scoreFor('speed', true, false), 1);
  assert.strictEqual(scoreFor('speed', false, false), 0);
});

test('스피드 정답은 1점이다', () => {
  const game = startSpeed();
  const fb = answer(game, game.questions[0].answer);
  assert.strictEqual(fb.points, 1);
  assert.strictEqual(game.score, 1);
});

test('timeout은 0점 오답이고 timedOut true이며 정답·해설을 돌려준다', () => {
  const game = startSpeed();
  const q = game.questions[0];
  const fb = timeout(game);
  assert.strictEqual(fb.correct, false);
  assert.strictEqual(fb.points, 0);
  assert.strictEqual(fb.timedOut, true);
  assert.strictEqual(fb.correctIndex, q.answer);
  assert.strictEqual(fb.explanation, q.explanation);
  assert.strictEqual(fb.source, q.source);
  assert.strictEqual(game.score, 0);
  assert.strictEqual(game.answered, true);
  assert.deepStrictEqual(game.results, [{ id: q.id, correct: false, hintUsed: false, timedOut: true }]);
});

test('answer 뒤 timeout은 null이고 timeout 뒤 answer는 null이다 (한 문항에 한 번만 채점)', () => {
  const a = startSpeed();
  assert.ok(answer(a, a.questions[0].answer));
  assert.strictEqual(timeout(a), null);
  assert.strictEqual(a.score, 1);
  assert.strictEqual(a.results.length, 1);

  const b = startSpeed();
  assert.ok(timeout(b));
  assert.strictEqual(answer(b, b.questions[0].answer), null);
  assert.strictEqual(timeout(b), null);
  assert.strictEqual(b.score, 0);
  assert.strictEqual(b.results.length, 1);
});

test('timeout 뒤 nextQuestion으로 다음 문항에서 다시 채점할 수 있다', () => {
  const game = startSpeed();
  timeout(game);
  nextQuestion(game);
  assert.strictEqual(game.index, 1);
  assert.ok(answer(game, game.questions[1].answer));
  assert.strictEqual(game.score, 1);
});

test('startTimer: 15초에서 시작해 줄어들고 만료 시 onExpire가 한 번 호출된다', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const ticks = [];
  let expired = 0;
  startTimer(15, (n) => ticks.push(n), () => { expired += 1; });
  assert.strictEqual(ticks[0], 15);
  t.mock.timers.tick(5000);
  assert.strictEqual(ticks[ticks.length - 1], 10);
  assert.strictEqual(expired, 0);
  t.mock.timers.tick(10000);
  assert.strictEqual(expired, 1);
  t.mock.timers.tick(10000);
  assert.strictEqual(expired, 1, '만료는 한 번만');
});

test('startTimer: stop()을 부르면 이후 onTick·onExpire가 호출되지 않는다', (t) => {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const ticks = [];
  let expired = 0;
  const stop = startTimer(15, (n) => ticks.push(n), () => { expired += 1; });
  t.mock.timers.tick(3000);
  stop();
  const count = ticks.length;
  t.mock.timers.tick(20000);
  assert.strictEqual(ticks.length, count);
  assert.strictEqual(expired, 0);
});
