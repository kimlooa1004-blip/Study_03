// 1단계 화면 테스트: NODE_PATH=$(npm root -g) node Study03_Quiz_A/tests/e2e/stage1.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert');

const URL = 'file://' + path.resolve(__dirname, '../../index.html');

async function currentQuestion(page) {
  const text = (await page.locator('#question-text').textContent()).trim();
  return page.evaluate((t) => QUESTIONS.find((q) => q.question === t), text);
}

async function displayedChoices(page) {
  return page.locator('.choice-btn .choice-text').allTextContents();
}

async function clickChoiceByText(page, text) {
  await page.locator('.choice-btn', { has: page.locator('.choice-text', { hasText: new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }).click();
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

  await page.goto(URL);

  // 모드 선택 → 연습 (1단계 기준은 연습 모드 기준으로 계속 확인한다)
  assert.ok(await page.locator('#view-mode').isVisible(), '모드 선택 화면이 먼저 보여야 함');
  await page.locator('.mode-btn[data-mode="practice"]').click();

  // 시작(카테고리 선택) 화면
  assert.ok(await page.locator('#view-start').isVisible(), '시작 화면이 보여야 함');
  assert.strictEqual(await page.locator('.category-btn').count(), 4);
  assert.ok(await page.locator('#view-start .no-record-notice').isVisible(), '시작 화면 안내');
  assert.match(await page.locator('#view-start .no-record-notice').textContent(), /순위표에 기록되지 않음/);
  for (const sel of ['#hint-btn', '#timer', '#retry-btn']) {
    assert.ok(!(await page.locator(sel).isVisible()), `연습 모드에서는 ${sel}가 보이면 안 됨`);
  }
  await noHorizontalScroll(page, '시작 화면');

  // 한 판 진행
  await page.locator('.category-btn[data-category="과학"]').click();
  assert.strictEqual((await page.locator('#progress').textContent()).trim(), '1 / 10');
  await noHorizontalScroll(page, '문제 화면');

  const seenIds = new Set();
  for (let i = 0; i < 10; i++) {
    assert.strictEqual((await page.locator('#progress').textContent()).trim(), `${i + 1} / 10`);
    const q = await currentQuestion(page);
    assert.strictEqual(q.category, '과학');
    seenIds.add(q.id);
    const shown = await displayedChoices(page);
    assert.strictEqual(shown.length, 4);
    assert.deepStrictEqual(shown.slice().sort(), q.choices.slice().sort(), '보기 구성이 원본과 같아야 함');
    const rightText = q.choices[q.answer];
    const wrongText = q.choices[(q.answer + 1) % 4];
    const wantRight = i < 3; // 앞의 3문제만 맞힌다
    const target = wantRight ? rightText : wrongText;

    if (i === 1) {
      // 키보드: 숫자 키로 선택
      await page.keyboard.press(String(shown.indexOf(target) + 1));
    } else {
      await clickChoiceByText(page, target);
    }

    // 곧바로 정답 여부·해설·출처
    assert.ok(await page.locator('#feedback').isVisible(), '해설이 보여야 함');
    const fbText = await page.locator('#feedback').textContent();
    assert.ok(fbText.includes(wantRight ? '정답' : '오답'));
    assert.ok(fbText.includes(q.explanation), '해설 문장');
    assert.ok(fbText.includes('http'), '출처 주소');
    assert.ok(fbText.includes(rightText), '정답 보기 글자');
    assert.strictEqual(await page.locator('.choice-btn:disabled').count(), 4, '보기가 잠겨야 함');
    assert.strictEqual(await page.locator('.choice-btn.correct').count(), 1);
    assert.ok((await page.locator('.choice-btn.correct').textContent()).includes('✓'));
    if (!wantRight) {
      assert.strictEqual(await page.locator('.choice-btn.wrong').count(), 1);
      assert.ok((await page.locator('.choice-btn.wrong').textContent()).includes('✗'));
    }

    const nextText = (await page.locator('#next-btn').textContent()).trim();
    assert.strictEqual(nextText, i === 9 ? '결과 보기' : '다음');
    if (i === 2) {
      await page.keyboard.press('Enter'); // 키보드로 다음
    } else {
      await page.locator('#next-btn').click();
    }
  }
  assert.strictEqual(seenIds.size, 10, '10문항이 모두 달라야 함');

  // 결과 화면
  assert.ok(await page.locator('#view-result').isVisible());
  assert.strictEqual((await page.locator('#score').textContent()).trim(), '3 / 10');
  assert.match(await page.locator('#view-result .no-record-notice').textContent(), /순위표에 기록되지 않음/);
  assert.ok(await page.locator('#retry-btn').isVisible(), '2단계 이후: 틀린 문항이 있으면 다시 풀기 버튼이 보임');
  await noHorizontalScroll(page, '결과 화면');

  await page.locator('#home-btn').click();
  assert.ok(await page.locator('#view-mode').isVisible());
  assert.ok(!(await page.locator('#view-result').isVisible()));

  assert.deepStrictEqual(external, [], '외부 요청이 없어야 함');
  assert.deepStrictEqual(problems, [], '콘솔 오류·요청 실패가 없어야 함');
  await browser.close();
  console.log('stage1 OK');
})().catch((e) => {
  console.error('stage1 FAILED:', e && e.message ? e.message : e);
  process.exit(1);
});
