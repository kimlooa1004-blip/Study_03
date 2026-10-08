// 3단계 화면 테스트: NODE_PATH=$(npm root -g) node Study03_Quiz_A/tests/e2e/stage3.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert');

const URL = 'file://' + path.resolve(__dirname, '../../index.html');
const KEY = 'quiz.leaderboard.v1';
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function currentQuestion(page) {
  const text = (await page.locator('#question-text').textContent()).trim();
  return page.evaluate((t) => QUESTIONS.find((q) => q.question === t), text);
}

async function clickChoice(page, text) {
  await page.locator('.choice-btn', { has: page.locator('.choice-text', { hasText: new RegExp('^' + esc(text) + '$') }) }).click();
}

// 앞의 rightCount문제만 맞히고 나머지는 틀려서 10문제를 끝까지 푼다.
async function playGame(page, mode, category, rightCount) {
  await page.locator(`.mode-btn[data-mode="${mode}"]`).click();
  await page.locator(`.category-btn[data-category="${category}"]`).click();
  for (let i = 0; i < 10; i++) {
    const q = await currentQuestion(page);
    await clickChoice(page, q.choices[i < rightCount ? q.answer : (q.answer + 1) % 4]);
    await page.locator('#next-btn').click();
  }
  assert.ok(await page.locator('#view-result').isVisible());
}

async function saveRecord(page, name) {
  await page.locator('#name-input').fill(name);
  await page.locator('#save-btn').click();
}

async function openBoard(page, mode, category) {
  if (!(await page.locator('#view-leaderboard').isVisible())) {
    if (!(await page.locator('#view-mode').isVisible())) await page.locator('#home-btn').click();
    await page.locator('#leaderboard-btn').click();
  }
  await page.locator(`.lb-mode-tab[data-mode="${mode}"]`).click();
  await page.locator(`.lb-category-tab[data-category="${category}"]`).click();
}

async function closeBoard(page) {
  await page.locator('#lb-back-btn').click();
  assert.ok(await page.locator('#view-mode').isVisible());
}

async function rows(page) {
  return page.locator('.lb-row').evaluateAll((els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
}

function watch(page, problems, external) {
  page.on('pageerror', (e) => problems.push('pageerror ' + e));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console ' + m.text()); });
  page.on('requestfailed', (r) => problems.push('requestfailed ' + r.url()));
  page.on('request', (r) => { if (/^https?:/.test(r.url())) external.push(r.url()); });
}

(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const external = [];

  // ===== 기본 흐름 =====
  const ctx = await browser.newContext({ viewport: { width: 375, height: 700 } });
  const page = await ctx.newPage();
  watch(page, problems, external);
  await page.goto(URL);

  assert.ok(await page.locator('#leaderboard-btn').isVisible());
  await openBoard(page, 'speed', '한국사');
  assert.ok(await page.locator('#lb-empty').isVisible(), '기록이 없으면 빈 상태');
  assert.strictEqual(await page.locator('.lb-row').count(), 0);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(sw <= 375, `순위표 화면 가로 스크롤 (scrollWidth ${sw})`);
  await closeBoard(page);

  // 3-1 스피드 한 판 후 이름 저장
  await playGame(page, 'speed', '과학', 10);
  assert.ok(await page.locator('#name-input').isVisible());
  assert.strictEqual(await page.locator('#name-input').getAttribute('maxlength'), '10');
  await saveRecord(page, '');
  assert.match(await page.locator('#save-notice').textContent(), /이름을 1~10자로 입력/);
  await page.locator('#name-input').evaluate((el) => { el.removeAttribute('maxlength'); });
  await saveRecord(page, '가나다라마바사아자차카');
  assert.match(await page.locator('#save-notice').textContent(), /이름을 1~10자로 입력/, '11자 이름은 저장되지 않음');
  await saveRecord(page, '   ');
  assert.match(await page.locator('#save-notice').textContent(), /이름을 1~10자로 입력/);
  await saveRecord(page, '민수');
  assert.ok(await page.locator('#save-btn').isDisabled(), '저장 뒤 버튼 비활성');
  assert.ok(await page.locator('#name-input').isDisabled());
  await page.locator('#save-btn').click({ force: true, timeout: 500 }).catch(() => {});

  await openBoard(page, 'speed', '과학');
  let r = await rows(page);
  assert.strictEqual(r.length, 1, '한 판은 한 번만 기록');
  assert.ok(r[0].includes('민수') && r[0].includes('10') && /\d{4}-\d{2}-\d{2}/.test(r[0]), r[0]);
  await page.locator('.lb-mode-tab[data-mode="hint"]').click();
  assert.ok(await page.locator('#lb-empty').isVisible(), '힌트·과학에는 기록이 없음');
  await page.locator('.lb-mode-tab[data-mode="speed"]').click();
  await page.locator('.lb-category-tab[data-category="한국사"]').click();
  assert.ok(await page.locator('#lb-empty').isVisible(), '스피드·한국사에는 기록이 없음');
  await closeBoard(page);

  // 연습과 다시 풀기 라운드에는 이름 입력이 없고 기록도 늘지 않는다
  await playGame(page, 'practice', '과학', 7);
  assert.ok(!(await page.locator('#name-input').isVisible()));
  assert.ok(!(await page.locator('#save-btn').isVisible()));
  await page.locator('#retry-btn').click();
  for (let i = 0; i < 3; i++) {
    const q = await currentQuestion(page);
    await clickChoice(page, q.choices[q.answer]);
    await page.locator('#next-btn').click();
  }
  assert.ok(!(await page.locator('#name-input').isVisible()), '다시 풀기 결과에도 없음');
  await openBoard(page, 'speed', '과학');
  assert.strictEqual((await rows(page)).length, 1);
  await closeBoard(page);

  // 힌트 모드 기록은 힌트 표에만 들어간다
  await playGame(page, 'hint', '과학', 8);
  await saveRecord(page, '지연');
  await openBoard(page, 'hint', '과학');
  r = await rows(page);
  assert.strictEqual(r.length, 1);
  assert.ok(r[0].includes('지연') && r[0].includes('8'));
  await closeBoard(page);

  // 3-3 새로고침 후에도 남는다
  await page.reload();
  await openBoard(page, 'speed', '과학');
  assert.strictEqual((await rows(page)).length, 1);
  await closeBoard(page);

  // 3-2 상위 5건만, 점수 내림차순 (이미 10점 1건 + 9,8,7,6,5점)
  for (const [score, name] of [[9, 'b'], [8, 'c'], [7, 'd'], [6, 'e'], [5, 'f']]) {
    await playGame(page, 'speed', '과학', score);
    await saveRecord(page, name);
    await page.locator('#home-btn').click();
  }
  await openBoard(page, 'speed', '과학');
  r = await rows(page);
  assert.strictEqual(r.length, 5, '상위 5건만 보임');
  assert.deepStrictEqual(r.map((t) => t.includes('민수') ? 10 : null)[0], 10, '1위는 10점');
  const names = await page.locator('.lb-row .lb-name').allTextContents();
  assert.deepStrictEqual(names.map((t) => t.trim()), ['민수', 'b', 'c', 'd', 'e'], '5점 기록은 밀려남');
  await closeBoard(page);

  // 같은 점수면 먼저 세운 기록이 위
  await playGame(page, 'speed', '세계지리', 6);
  await saveRecord(page, '먼저');
  await page.locator('#home-btn').click();
  await playGame(page, 'speed', '세계지리', 6);
  await saveRecord(page, '나중');
  await openBoard(page, 'speed', '세계지리');
  assert.deepStrictEqual(
    (await page.locator('.lb-row .lb-name').allTextContents()).map((t) => t.trim()),
    ['먼저', '나중']
  );
  await ctx.close();

  // ===== 3-4 저장소 문제 =====
  // (a) setItem이 막힌 경우
  const ctxA = await browser.newContext({ viewport: { width: 375, height: 700 } });
  await ctxA.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new Error('blocked'); };
  });
  const pa = await ctxA.newPage();
  watch(pa, problems, external);
  await pa.goto(URL);
  await playGame(pa, 'speed', '과학', 10);
  assert.ok(await pa.locator('#view-result').isVisible(), '게임은 정상 진행');
  assert.strictEqual((await pa.locator('#score').textContent()).trim(), '10 / 10');
  await saveRecord(pa, '민수');
  assert.match(await pa.locator('#save-notice').textContent(), /기록을 저장할 수 없음/);
  await openBoard(pa, 'speed', '과학');
  assert.ok(await pa.locator('#lb-empty').isVisible());
  await ctxA.close();

  // (b) localStorage 접근 자체가 막힌 경우
  const ctxB = await browser.newContext({ viewport: { width: 375, height: 700 } });
  await ctxB.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } });
  });
  const pb = await ctxB.newPage();
  watch(pb, problems, external);
  await pb.goto(URL);
  await playGame(pb, 'hint', '과학', 10);
  assert.ok(await pb.locator('#view-result').isVisible());
  assert.match(await pb.locator('#save-notice').textContent(), /기록을 저장할 수 없음/);
  await openBoard(pb, 'hint', '과학');
  assert.ok(await pb.locator('#lb-empty').isVisible());
  await ctxB.close();

  // (c) 저장된 값이 깨진 경우
  const ctxC = await browser.newContext({ viewport: { width: 375, height: 700 } });
  await ctxC.addInitScript((key) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, '{깨진');
  }, KEY);
  const pc = await ctxC.newPage();
  watch(pc, problems, external);
  await pc.goto(URL);
  await openBoard(pc, 'speed', '과학');
  assert.ok(await pc.locator('#lb-empty').isVisible(), '깨진 값이면 빈 순위표');
  await closeBoard(pc);
  await playGame(pc, 'speed', '과학', 4);
  await saveRecord(pc, '복구');
  await openBoard(pc, 'speed', '과학');
  r = await rows(pc);
  assert.strictEqual(r.length, 1);
  assert.ok(r[0].includes('복구') && r[0].includes('4'));
  await ctxC.close();

  assert.deepStrictEqual(external, [], '외부 요청이 없어야 함');
  assert.deepStrictEqual(problems, [], '콘솔 오류·요청 실패가 없어야 함');
  await browser.close();
  console.log('stage3 OK');
})().catch((e) => {
  console.error('stage3 FAILED:', e && e.message ? e.message : e);
  process.exit(1);
});
