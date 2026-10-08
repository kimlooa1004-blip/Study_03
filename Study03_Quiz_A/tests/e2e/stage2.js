// 2단계 화면 테스트: NODE_PATH=$(npm root -g) node Study03_Quiz_A/tests/e2e/stage2.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert');

const URL = 'file://' + path.resolve(__dirname, '../../index.html');
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function currentQuestion(page) {
  const text = (await page.locator('#question-text').textContent()).trim();
  return page.evaluate((t) => QUESTIONS.find((q) => q.question === t), text);
}

async function clickChoice(page, text) {
  await page.locator('.choice-btn', { has: page.locator('.choice-text', { hasText: new RegExp('^' + esc(text) + '$') }) }).click();
}

async function answerRight(page) {
  const q = await currentQuestion(page);
  await clickChoice(page, q.choices[q.answer]);
  return q;
}

async function answerWrong(page) {
  const q = await currentQuestion(page);
  await clickChoice(page, q.choices[(q.answer + 1) % 4]);
  return q;
}

async function start(page, mode, category) {
  await page.locator(`.mode-btn[data-mode="${mode}"]`).click();
  await page.locator(`.category-btn[data-category="${category}"]`).click();
}

async function score(page) {
  return (await page.locator('#score').textContent()).trim();
}

async function timerValue(page) {
  return Number((await page.locator('#timer').textContent()).trim());
}

async function noHorizontalScroll(page, label) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(w <= 375, `${label}: 가로 스크롤 발생 (scrollWidth ${w})`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
  const problems = [];
  const external = [];
  page.on('pageerror', (e) => problems.push('pageerror ' + e));
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console ' + m.text()); });
  page.on('requestfailed', (r) => problems.push('requestfailed ' + r.url()));
  page.on('request', (r) => { if (/^https?:/.test(r.url())) external.push(r.url()); });

  await page.clock.install();
  await page.goto(URL);

  // ---- 2-1 모드 선택 화면 ----
  assert.ok(await page.locator('#view-mode').isVisible());
  assert.deepStrictEqual(
    await page.locator('.mode-btn').evaluateAll((bs) => bs.map((b) => b.dataset.mode)),
    ['practice', 'speed', 'hint']
  );
  assert.match(await page.locator('#view-mode .no-record-notice').textContent(), /순위표에 기록되지 않음/);
  await noHorizontalScroll(page, '모드 선택 화면');
  await page.locator('.mode-btn[data-mode="speed"]').click();
  assert.ok(await page.locator('#view-start').isVisible(), '모드 다음은 카테고리 선택');
  assert.ok(!(await page.locator('#view-start .no-record-notice').isVisible()), '스피드에서는 기록 안 됨 안내가 없어야 함');
  await page.locator('.category-btn[data-category="세계지리"]').click();

  // ---- 2-2 스피드 타이머 ----
  assert.ok(await page.locator('#timer').isVisible());
  assert.ok(!(await page.locator('#hint-btn').isVisible()));
  assert.strictEqual(await timerValue(page), 15);
  await noHorizontalScroll(page, '스피드 문제 화면');
  await page.clock.runFor(5000);
  assert.ok([9, 10].includes(await timerValue(page)), '5초 뒤 약 10초');
  await answerRight(page);
  const frozen = await timerValue(page);
  await page.clock.runFor(5000);
  assert.strictEqual(await timerValue(page), frozen, '해설이 나오면 타이머가 멈춰야 함');
  await page.locator('#next-btn').click();
  assert.strictEqual(await timerValue(page), 15, '[다음] 후 15초부터 다시');

  // ---- 2-3 시간 초과 ----
  await page.clock.runFor(15500);
  assert.ok(await page.locator('#feedback').isVisible(), '시간 초과 시 해설이 보여야 함');
  assert.match(await page.locator('#feedback').textContent(), /시간 초과/);
  assert.strictEqual(await page.locator('.choice-btn.correct').count(), 1, '정답 표시');
  assert.ok(await page.locator('#next-btn').isVisible(), '[다음]을 기다림');
  assert.strictEqual(await page.locator('.choice-btn:disabled').count(), 4);
  await page.keyboard.press('1'); // 시간 초과 뒤에는 채점되지 않음
  assert.strictEqual(await page.locator('.choice-btn.correct, .choice-btn.wrong').count(), 1);
  const stillFrozen = await timerValue(page);
  await page.clock.runFor(3000);
  assert.strictEqual(await timerValue(page), stillFrozen);
  await page.locator('#next-btn').click();
  for (let i = 2; i < 10; i++) {
    await answerRight(page);
    await page.locator('#next-btn').click();
  }
  assert.strictEqual(await score(page), '9 / 10', '시간 초과 1개는 0점');
  assert.strictEqual(await page.locator('#retry-btn').isVisible(), false, '스피드에는 다시 풀기가 없음');

  // 홈으로 나간 뒤 이전 타이머가 동작하지 않는다 (2-6)
  await page.locator('#home-btn').click();
  assert.ok(await page.locator('#view-mode').isVisible());
  await page.clock.runFor(20000);
  assert.ok(await page.locator('#view-mode').isVisible());
  assert.ok(!(await page.locator('#view-question').isVisible()));

  // ---- 2-4 힌트 ----
  await start(page, 'hint', '과학');
  assert.ok(!(await page.locator('#timer').isVisible()), '힌트 모드에는 타이머가 없음');
  assert.ok(await page.locator('#hint-btn').isVisible());
  assert.ok(await page.locator('#hint-btn').isEnabled());
  await noHorizontalScroll(page, '힌트 문제 화면');
  let q = await currentQuestion(page);
  await page.locator('#hint-btn').click();
  assert.strictEqual(await page.locator('.choice-btn:visible').count(), 2, '보기 2개가 사라져야 함');
  const left = await page.locator('.choice-btn:visible .choice-text').allTextContents();
  assert.ok(left.includes(q.choices[q.answer]), '정답 보기는 남아야 함');
  assert.ok(await page.locator('#hint-btn').isDisabled(), '힌트는 한 번만');
  await clickChoice(page, q.choices[q.answer]);
  assert.ok(await page.locator('#hint-btn').isDisabled(), '답한 뒤에는 힌트 불가');
  await page.locator('#next-btn').click();
  assert.strictEqual(await page.locator('.choice-btn:visible').count(), 4, '다음 문항에서는 보기가 다시 4개');
  assert.ok(await page.locator('#hint-btn').isEnabled(), '다음 문항에서 힌트가 다시 가능');
  for (let i = 1; i < 10; i++) {
    await answerRight(page);
    await page.locator('#next-btn').click();
  }
  assert.strictEqual(await score(page), '9.5 / 10', '힌트 사용 정답은 0.5점');
  await page.locator('#home-btn').click();

  // ---- 2-5 연습: 틀린 문제 다시 풀기 (반복) ----
  await start(page, 'practice', '한국사');
  for (let i = 0; i < 10; i++) {
    if (i < 2) await answerWrong(page); else await answerRight(page);
    await page.locator('#next-btn').click();
  }
  assert.strictEqual(await score(page), '8 / 10');
  assert.ok(await page.locator('#retry-btn').isVisible());
  assert.ok(!(await page.locator('#retry-summary').isVisible()), '첫 판에는 다시 푼 결과가 없음');
  await page.locator('#retry-btn').click();
  assert.strictEqual((await page.locator('#progress').textContent()).trim(), '1 / 2');
  await answerWrong(page); // 일부러 또 틀림
  await page.locator('#next-btn').click();
  await answerRight(page);
  await page.locator('#next-btn').click();
  assert.strictEqual(await score(page), '8 / 10', '다시 풀어도 원래 점수는 그대로');
  assert.match(await page.locator('#retry-summary').textContent(), /다시 맞힌 1 \/ 2/);
  assert.ok(await page.locator('#retry-btn').isVisible(), '또 틀렸으니 다시 풀기가 다시 나옴');
  await page.locator('#retry-btn').click();
  assert.strictEqual((await page.locator('#progress').textContent()).trim(), '1 / 1');
  await answerRight(page);
  await page.locator('#next-btn').click();
  assert.match(await page.locator('#retry-summary').textContent(), /다시 맞힌 1 \/ 1/);
  assert.strictEqual(await score(page), '8 / 10');
  assert.ok(!(await page.locator('#retry-btn').isVisible()), '모두 맞혔으면 버튼이 없음');
  assert.match(await page.locator('#view-result .no-record-notice').textContent(), /순위표에 기록되지 않음/);

  // 같은 설정으로 다시 하기 후 전부 맞히면 다시 풀기 버튼이 없다
  await page.locator('#again-btn').click();
  assert.strictEqual((await page.locator('#progress').textContent()).trim(), '1 / 10');
  for (let i = 0; i < 10; i++) {
    await answerRight(page);
    await page.locator('#next-btn').click();
  }
  assert.strictEqual(await score(page), '10 / 10');
  assert.ok(!(await page.locator('#retry-btn').isVisible()));
  await noHorizontalScroll(page, '결과 화면');
  await page.locator('#home-btn').click();

  assert.deepStrictEqual(external, [], '외부 요청이 없어야 함');
  assert.deepStrictEqual(problems, [], '콘솔 오류·요청 실패가 없어야 함');
  await browser.close();
  console.log('stage2 OK');
})().catch((e) => {
  console.error('stage2 FAILED:', e && e.message ? e.message : e);
  process.exit(1);
});
