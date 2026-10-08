const test = require('node:test');
const assert = require('node:assert');
const {
  LEADERBOARD_KEY, addRecord, getTop, formatDate, getStorage
} = require('../script.js');

function fakeStorage(initial) {
  const data = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    raw: () => data.get(LEADERBOARD_KEY)
  };
}

test('LEADERBOARD_KEY', () => {
  assert.strictEqual(LEADERBOARD_KEY, 'quiz.leaderboard.v1');
});

test('6개 기록 후 getTop은 5개이고 최저 점수가 빠진다', () => {
  const st = fakeStorage();
  [3, 9, 7, 5, 8, 1].forEach((score, i) => addRecord(st, 'speed', '과학', '민수', score, 1000 + i));
  const top = getTop(st, 'speed', '과학');
  assert.strictEqual(top.length, 5);
  assert.deepStrictEqual(top.map((r) => r.score), [9, 8, 7, 5, 3]);
});

test('동점이면 먼저 세운 기록이 위, 0.5 단위 점수도 정렬된다', () => {
  const st = fakeStorage();
  addRecord(st, 'hint', '과학', '가', 7.5, 100);
  addRecord(st, 'hint', '과학', '나', 7, 200);
  addRecord(st, 'hint', '과학', '다', 7.5, 300);
  const top = getTop(st, 'hint', '과학');
  assert.deepStrictEqual(top.map((r) => r.name), ['가', '다', '나']);
  assert.deepStrictEqual(top.map((r) => r.score), [7.5, 7.5, 7]);
});

test('기록은 이름·점수·시각을 담고 모드·카테고리가 다르면 섞이지 않는다', () => {
  const st = fakeStorage();
  assert.strictEqual(addRecord(st, 'speed', '과학', '민수', 8, 1000), true);
  assert.deepStrictEqual(getTop(st, 'speed', '과학'), [{ name: '민수', score: 8, at: 1000 }]);
  assert.deepStrictEqual(getTop(st, 'hint', '과학'), []);
  assert.deepStrictEqual(getTop(st, 'speed', '한국사'), []);
});

test('practice 모드는 저장하지 않는다', () => {
  const st = fakeStorage();
  assert.strictEqual(addRecord(st, 'practice', '과학', '민수', 10, 1), false);
  assert.strictEqual(st.raw(), undefined);
});

test('이름: 빈 값·공백뿐·11자는 거부하고, 앞뒤 공백은 자르며, 10자는 통과한다', () => {
  const st = fakeStorage();
  assert.strictEqual(addRecord(st, 'speed', '과학', '', 5, 1), false);
  assert.strictEqual(addRecord(st, 'speed', '과학', '   ', 5, 1), false);
  assert.strictEqual(addRecord(st, 'speed', '과학', '가'.repeat(11), 5, 1), false);
  assert.strictEqual(addRecord(st, 'speed', '과학', 123, 5, 1), false);
  assert.deepStrictEqual(getTop(st, 'speed', '과학'), []);
  assert.strictEqual(addRecord(st, 'speed', '과학', '  민수  ', 5, 1), true);
  assert.strictEqual(addRecord(st, 'speed', '과학', '가'.repeat(10), 4, 2), true);
  assert.deepStrictEqual(getTop(st, 'speed', '과학').map((r) => r.name), ['민수', '가'.repeat(10)]);
});

test('setItem이 예외를 던지면 addRecord는 false이고 던지지 않는다', () => {
  const st = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.strictEqual(addRecord(st, 'speed', '과학', '민수', 5, 1), false);
});

test('저장된 값이 깨졌으면 getTop은 []이고 이후 addRecord가 정상 저장한다', () => {
  for (const bad of ['{깨진', '[]', 'null', '"문자열"', '{"speed|과학": "x"}', '{"speed|과학": [1, null, {"score": "a"}]}']) {
    const st = fakeStorage({ [LEADERBOARD_KEY]: bad });
    assert.deepStrictEqual(getTop(st, 'speed', '과학'), [], `깨진 값: ${bad}`);
    assert.strictEqual(addRecord(st, 'speed', '과학', '민수', 6, 5), true, `복구: ${bad}`);
    assert.deepStrictEqual(getTop(st, 'speed', '과학'), [{ name: '민수', score: 6, at: 5 }]);
  }
});

test('getItem이 예외를 던지거나 storage가 null이면 안전하다', () => {
  const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => {} };
  assert.deepStrictEqual(getTop(throwing, 'speed', '과학'), []);
  assert.strictEqual(addRecord(throwing, 'speed', '과학', '민수', 5, 1), false);
  assert.deepStrictEqual(getTop(null, 'speed', '과학'), []);
  assert.strictEqual(addRecord(null, 'speed', '과학', '민수', 5, 1), false);
});

test('getStorage는 Node처럼 localStorage가 없으면 null이다', () => {
  assert.strictEqual(getStorage(), null);
});

test('formatDate는 YYYY-MM-DD이다', () => {
  assert.strictEqual(formatDate(new Date(2026, 9, 8).getTime()), '2026-10-08');
  assert.strictEqual(formatDate(new Date(2027, 0, 5, 23, 59).getTime()), '2027-01-05');
});
