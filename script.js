// ===== 로직: DOM을 모르는 순수 함수. Node 테스트에서도 불러온다 =====

const CATEGORIES = ['한국사', '세계지리', '과학', '예술과 문화'];
const QUESTIONS_PER_GAME = 10;
const SPEED_SECONDS = 15;

// 과제 제출용: 페이지 맨 위에 보여 줄 학번과 이름. 여기만 고치면 된다.
const STUDENT = { id: '', name: '' };

function shuffle(arr, rng = Math.random) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 카테고리의 문항을 순서와 보기 모두 섞은 새 객체로 돌려준다. answer는 섞인 choices 기준으로 다시 계산한다.
function pickQuestions(all, category, rng = Math.random) {
  const pool = (all || []).filter((q) => q.category === category);
  if (pool.length < QUESTIONS_PER_GAME) {
    throw new Error(`문항 데이터를 불러올 수 없음: ${category} (${pool.length}개)`);
  }
  return shuffle(pool, rng).slice(0, QUESTIONS_PER_GAME).map((q) => shuffleChoices(q, rng));
}

function shuffleChoices(q, rng) {
  const order = shuffle([0, 1, 2, 3], rng);
  return Object.assign({}, q, {
    choices: order.map((i) => q.choices[i]),
    answer: order.indexOf(q.answer)
  });
}

function scoreFor(mode, correct, hintUsed) {
  if (!correct) return 0;
  return mode === 'hint' && hintUsed ? 0.5 : 1;
}

function createGame({ mode, category, questions, isRetry = false }) {
  return {
    mode,
    category,
    questions,
    index: 0,
    score: 0,
    results: [],
    answered: false,
    hintUsed: false,
    hidden: [],
    isRetry,
    saved: false
  };
}

function isFinished(game) {
  return game.index >= game.questions.length;
}

// 스피드 모드에서 15초가 지났을 때: 오답(0점)으로 처리한다. 이미 답했으면 null.
function timeout(game) {
  if (isFinished(game) || game.answered) return null;
  const q = game.questions[game.index];
  game.answered = true;
  game.results.push({ id: q.id, correct: false, hintUsed: game.hintUsed, timedOut: true });
  return {
    correct: false,
    correctIndex: q.answer,
    explanation: q.explanation,
    source: q.source,
    points: 0,
    timedOut: true
  };
}

function answer(game, choiceIndex) {
  if (isFinished(game) || game.answered) return null;
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) return null;
  if (game.hidden.includes(choiceIndex)) return null;
  const q = game.questions[game.index];
  const correct = choiceIndex === q.answer;
  const points = scoreFor(game.mode, correct, game.hintUsed);
  game.score += points;
  game.answered = true;
  game.results.push({ id: q.id, correct, hintUsed: game.hintUsed, timedOut: false });
  return {
    correct,
    correctIndex: q.answer,
    explanation: q.explanation,
    source: q.source,
    points,
    timedOut: false
  };
}

// 힌트 모드에서 문항마다 한 번, 오답 보기 2개를 지운다. 지운 보기 번호를 돌려주고, 쓸 수 없으면 null.
function useHint(game, rng = Math.random) {
  if (game.mode !== 'hint' || game.hintUsed || game.answered || isFinished(game)) return null;
  const q = game.questions[game.index];
  const wrong = [0, 1, 2, 3].filter((i) => i !== q.answer);
  game.hidden = shuffle(wrong, rng).slice(0, 2).sort((a, b) => a - b);
  game.hintUsed = true;
  return game.hidden.slice();
}

function nextQuestion(game) {
  if (!game.answered) return;
  game.index += 1;
  game.answered = false;
  game.hintUsed = false;
  game.hidden = [];
}

// 틀린 문항(시간 초과 포함)을 푼 순서대로 돌려준다.
function wrongQuestions(game) {
  const wrongIds = new Set(game.results.filter((r) => !r.correct).map((r) => r.id));
  return game.questions.filter((q) => wrongIds.has(q.id));
}

// 틀린 문항만 다시 푸는 연습 판. 틀린 문항이 없으면 null. 원래 판은 바꾸지 않고 보기 순서는 새로 섞는다.
// 다시 푼 판에도 호출할 수 있어 모두 맞힐 때까지 반복된다.
function retryGame(game, rng = Math.random) {
  const wrong = wrongQuestions(game);
  if (wrong.length === 0) return null;
  return createGame({
    mode: 'practice',
    category: game.category,
    questions: wrong.map((q) => shuffleChoices(q, rng)),
    isRetry: true
  });
}

// ===== 순위표: localStorage에 모드×카테고리별 상위 5건을 저장한다 =====

const LEADERBOARD_KEY = 'quiz.leaderboard.v1';
const LEADERBOARD_SIZE = 5;
const NAME_MAX = 10;

function getStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch (e) {
    return null;
  }
}

// 저장소에 접근하지 못하면(getItem 예외) 예외를 그대로 던지고, 값이 깨졌으면 빈 순위표로 복구한다.
function readBoards(storage) {
  const raw = storage.getItem(LEADERBOARD_KEY);
  if (raw === null || raw === undefined) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    return {};
  }
}

function cleanRecords(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((r) => r && typeof r.name === 'string' && Number.isFinite(r.score) && Number.isFinite(r.at))
    .map((r) => ({ name: r.name, score: r.score, at: r.at }));
}

// 점수 내림차순, 동점이면 먼저 세운(at이 작은) 기록이 위
function sortRecords(list) {
  return list.slice().sort((a, b) => b.score - a.score || a.at - b.at);
}

function getTop(storage, mode, category) {
  if (!storage) return [];
  try {
    const boards = readBoards(storage);
    return sortRecords(cleanRecords(boards[mode + '|' + category])).slice(0, LEADERBOARD_SIZE);
  } catch (e) {
    return [];
  }
}

// 저장에 성공하면 true. 연습 모드, 잘못된 이름(trim 후 1~10자가 아님), 저장 실패는 false.
function addRecord(storage, mode, category, name, score, at) {
  if (!storage || (mode !== 'speed' && mode !== 'hint')) return false;
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > NAME_MAX) return false;
  if (!Number.isFinite(score) || !Number.isFinite(at)) return false;
  try {
    const boards = readBoards(storage);
    const key = mode + '|' + category;
    boards[key] = sortRecords(cleanRecords(boards[key]).concat({ name: trimmed, score, at }))
      .slice(0, LEADERBOARD_SIZE);
    storage.setItem(LEADERBOARD_KEY, JSON.stringify(boards));
    return true;
  } catch (e) {
    return false;
  }
}

function formatDate(at) {
  const d = new Date(at);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ===== UI: DOM을 다루는 코드. 브라우저에서만 실행된다 =====

// 마감 시각(Date.now() 기준)으로 남은 초를 계산하는 타이머. 만료 시 onExpire를 한 번만 부르고, 돌려준 stop()으로 멈춘다.
function startTimer(seconds, onTick, onExpire) {
  const deadline = Date.now() + seconds * 1000;
  let last = null;
  let done = false;
  let id = null;
  function stop() {
    done = true;
    if (id !== null) clearInterval(id);
  }
  function check() {
    if (done) return;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (remaining !== last) {
      last = remaining;
      onTick(remaining);
    }
    if (Date.now() >= deadline) {
      stop();
      onExpire();
    }
  }
  check();
  if (!done) id = setInterval(check, 100);
  return stop;
}

function formatScore(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const MODE_LABELS = { practice: '연습', speed: '스피드', hint: '힌트' };

function initUI() {
  const $ = (id) => document.getElementById(id);
  const viewNames = ['start', 'mode', 'question', 'result', 'leaderboard'];
  let lbMode = 'speed';
  let lbCategory = '한국사';
  let mode = null;
  let category = null;
  let rootGame = null; // 처음 10문제 판. 점수는 이 판의 결과만 인정한다
  let game = null;     // 지금 풀고 있는 판(다시 풀기 라운드일 수 있다)
  let stopTimer = () => {};

  // 페이지 맨 위에 학번과 이름을 보여 준다(모든 화면에서 보인다).
  $('student-badge').textContent = STUDENT.id && STUDENT.name
    ? `학번 ${STUDENT.id} 이름 ${STUDENT.name}`
    : '학번 (입력 필요) 이름 (입력 필요)';

  function show(name) {
    viewNames.forEach((v) => { $('view-' + v).hidden = v !== name; });
  }

  function availableQuestions() {
    return typeof QUESTIONS !== 'undefined' ? QUESTIONS : [];
  }

  function checkData() {
    let broken = false;
    document.querySelectorAll('.category-btn').forEach((btn) => {
      try {
        pickQuestions(availableQuestions(), btn.dataset.category);
        btn.disabled = false;
      } catch (e) {
        btn.disabled = true;
        broken = true;
      }
    });
    $('data-error').hidden = !broken;
  }

  // 카테고리를 먼저 고르고, 그다음 모드를 고른다.
  function selectCategory(cat) {
    category = cat;
    $('mode-category-label').textContent = cat;
    show('mode');
  }

  function startGame(m, cat) {
    let questions;
    try {
      questions = pickQuestions(availableQuestions(), cat);
    } catch (e) {
      checkData();
      show('start');
      return;
    }
    mode = m;
    category = cat;
    rootGame = createGame({ mode, category, questions });
    game = rootGame;
    renderQuestion();
    show('question');
  }

  function renderQuestion() {
    stopTimer();
    const q = game.questions[game.index];
    $('progress').textContent = `${game.index + 1} / ${game.questions.length}`;
    $('mode-line').textContent = `${game.category} · ${MODE_LABELS[game.mode]}${game.isRetry ? ' · 다시 풀기' : ''}`;
    $('live-score').textContent = `점수 ${formatScore(rootGame.score)}`;
    $('question-text').textContent = q.question;
    const box = $('choices');
    box.textContent = '';
    q.choices.forEach((text, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn';
      btn.dataset.index = String(i);
      const num = document.createElement('span');
      num.className = 'choice-num';
      num.textContent = String(i + 1);
      const label = document.createElement('span');
      label.className = 'choice-text';
      label.textContent = text;
      const mark = document.createElement('span');
      mark.className = 'mark';
      btn.append(num, label, mark);
      btn.addEventListener('click', () => choose(i));
      box.appendChild(btn);
    });
    $('feedback').hidden = true;
    $('next-btn').hidden = true;

    const hintBtn = $('hint-btn');
    hintBtn.hidden = game.mode !== 'hint';
    hintBtn.disabled = false;

    const timed = game.mode === 'speed';
    $('timer-box').hidden = !timed;
    if (timed) {
      stopTimer = startTimer(
        SPEED_SECONDS,
        (n) => { $('timer').textContent = String(n); },
        () => {
          const fb = timeout(game);
          if (fb) showFeedback(fb, null);
        }
      );
    }
  }

  function appendSource(el, text) {
    el.textContent = '출처: ';
    text.split(/(https?:\/\/[^\s;]+)/).forEach((part) => {
      if (/^https?:\/\//.test(part)) {
        const a = document.createElement('a');
        a.href = part;
        a.textContent = part;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        el.appendChild(a);
      } else if (part) {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  function showFeedback(fb, chosen) {
    stopTimer();
    const q = game.questions[game.index];
    document.querySelectorAll('.choice-btn').forEach((b, idx) => {
      b.disabled = true;
      if (idx === fb.correctIndex) {
        b.classList.add('correct');
        b.querySelector('.mark').textContent = '✓';
      } else if (idx === chosen) {
        b.classList.add('wrong');
        b.querySelector('.mark').textContent = '✗';
      }
    });
    $('hint-btn').disabled = true;
    const label = $('result-label');
    label.textContent = fb.timedOut ? '시간 초과! 오답 처리돼요' : fb.correct ? '정답입니다!' : '오답입니다';
    label.className = 'result-label ' + (fb.correct ? 'ok' : 'bad');
    $('correct-answer').textContent = '정답: ' + q.choices[fb.correctIndex];
    $('explanation').textContent = fb.explanation;
    appendSource($('source'), fb.source);
    $('live-score').textContent = `점수 ${formatScore(rootGame.score)}`;
    $('feedback').hidden = false;
    const next = $('next-btn');
    next.textContent = game.index === game.questions.length - 1 ? '결과 보기' : '다음';
    next.hidden = false;
    next.focus();
  }

  function choose(i) {
    const fb = answer(game, i);
    if (!fb) return;
    showFeedback(fb, i);
  }

  function useHintClick() {
    const hidden = useHint(game);
    if (!hidden) return;
    document.querySelectorAll('.choice-btn').forEach((b, idx) => {
      if (hidden.includes(idx)) b.hidden = true;
    });
    $('hint-btn').disabled = true;
  }

  function renderResult() {
    stopTimer();
    $('score').textContent = `${formatScore(rootGame.score)} / ${rootGame.questions.length}`;
    $('result-notice').hidden = rootGame.mode !== 'practice';
    const summary = $('retry-summary');
    if (game.isRetry) {
      const right = game.results.filter((r) => r.correct).length;
      summary.textContent = `다시 맞힌 ${right} / ${game.questions.length}`;
      summary.hidden = false;
    } else {
      summary.hidden = true;
    }
    $('retry-btn').hidden = !(rootGame.mode === 'practice' && wrongQuestions(game).length > 0);
    renderResultList();
    renderSaveBox();
    show('result');
  }

  // 처음 10문제의 문항별 정답·오답 목록
  function renderResultList() {
    const list = $('result-list');
    list.textContent = '';
    rootGame.results.forEach((r, i) => {
      const q = rootGame.questions.find((x) => x.id === r.id);
      const li = document.createElement('li');
      li.className = 'result-item ' + (r.correct ? 'ok' : 'bad');
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = r.correct ? '정답' : r.timedOut ? '초과' : '오답';
      const body = document.createElement('span');
      body.textContent = `${i + 1}. ${q.question}`;
      const detail = document.createElement('span');
      detail.className = 'detail';
      detail.textContent = `정답: ${q.choices[q.answer]}`;
      body.appendChild(detail);
      li.append(badge, body);
      list.appendChild(li);
    });
  }

  // 스피드·힌트의 처음 판 결과에서만 이름을 받아 기록한다. 연습과 다시 풀기 라운드에는 없다.
  function renderSaveBox() {
    const recordable = !game.isRetry && (rootGame.mode === 'speed' || rootGame.mode === 'hint');
    $('save-box').hidden = !recordable;
    const input = $('name-input');
    const btn = $('save-btn');
    input.value = '';
    input.disabled = rootGame.saved;
    btn.disabled = rootGame.saved;
    setSaveNotice('', null);
    if (recordable && !getStorage()) {
      setSaveNotice('기록을 저장할 수 없음', 'error');
      input.disabled = true;
      btn.disabled = true;
    }
  }

  function setSaveNotice(text, kind) {
    const el = $('save-notice');
    el.textContent = text;
    el.className = 'save-notice' + (kind ? ' ' + kind : '');
    el.hidden = !text;
  }

  function saveRecord() {
    if (!rootGame || rootGame.saved) return;
    const name = $('name-input').value.trim();
    if (name.length < 1 || name.length > NAME_MAX) {
      setSaveNotice('이름을 1~10자로 입력', 'error');
      return;
    }
    const ok = addRecord(getStorage(), rootGame.mode, rootGame.category, name, rootGame.score, Date.now());
    if (!ok) {
      setSaveNotice('기록을 저장할 수 없음', 'error');
      return;
    }
    rootGame.saved = true;
    $('name-input').disabled = true;
    $('save-btn').disabled = true;
    setSaveNotice('기록했어요', 'ok');
  }

  function renderBoard() {
    document.querySelectorAll('.lb-mode-tab').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.mode === lbMode));
    });
    document.querySelectorAll('.lb-category-tab').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.category === lbCategory));
    });
    const list = $('lb-list');
    list.textContent = '';
    const top = getTop(getStorage(), lbMode, lbCategory);
    top.forEach((rec, i) => {
      const li = document.createElement('li');
      li.className = 'lb-row';
      [['lb-rank', `${i + 1}위`], ['lb-name', rec.name], ['lb-score', formatScore(rec.score)], ['lb-date', formatDate(rec.at)]]
        .forEach(([cls, text]) => {
          const span = document.createElement('span');
          span.className = cls;
          span.textContent = text;
          li.appendChild(span);
        });
      list.appendChild(li);
    });
    $('lb-empty').hidden = top.length > 0;
  }

  function goNext() {
    nextQuestion(game);
    if (isFinished(game)) {
      renderResult();
    } else {
      renderQuestion();
    }
  }

  function retry() {
    const next = retryGame(game);
    if (!next) return;
    game = next;
    renderQuestion();
    show('question');
  }

  function goHome() {
    stopTimer();
    stopTimer = () => {};
    game = null;
    rootGame = null;
    checkData();
    show('start');
  }

  document.querySelectorAll('.category-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectCategory(btn.dataset.category));
  });
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => startGame(btn.dataset.mode, category));
  });
  $('mode-back-btn').addEventListener('click', () => show('start'));
  $('next-btn').addEventListener('click', goNext);
  $('hint-btn').addEventListener('click', useHintClick);
  $('retry-btn').addEventListener('click', retry);
  $('again-btn').addEventListener('click', () => startGame(rootGame.mode, rootGame.category));
  $('home-btn').addEventListener('click', goHome);
  $('save-btn').addEventListener('click', saveRecord);
  $('name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRecord();
    }
  });
  $('leaderboard-btn').addEventListener('click', () => {
    renderBoard();
    show('leaderboard');
  });
  $('lb-back-btn').addEventListener('click', () => show('start'));
  document.querySelectorAll('.lb-mode-tab').forEach((b) => {
    b.addEventListener('click', () => { lbMode = b.dataset.mode; renderBoard(); });
  });
  document.querySelectorAll('.lb-category-tab').forEach((b) => {
    b.addEventListener('click', () => { lbCategory = b.dataset.category; renderBoard(); });
  });

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$('view-question').hidden && game && !game.answered && /^[1-4]$/.test(e.key)) {
      choose(Number(e.key) - 1);
    } else if (e.key === 'Enter' && !$('next-btn').hidden && !$('view-question').hidden) {
      e.preventDefault();
      goNext();
    }
  });

  checkData();
  show('start');
}

// ===== 자체 점검: 브라우저 없이 Node에서 실행한다 =====
// 실행: cd Study03_Quiz_A && node -e "const r=require('./script.js').selfCheck(); console.log(r.failures.length ? r.failures.join('\n') : 'OK ' + r.passed + '개 통과'); process.exit(r.failures.length ? 1 : 0)"

const SUPERLATIVE = /가장|최초|최대|최소|최고|최장|최단|제일/;

// 문항 규칙(PRD 1.3) 중 기계가 확인할 수 있는 것을 검사해 위반 메시지 목록을 돌려준다.
function validateQuestions(list) {
  const errors = [];
  const ids = new Set();
  list.forEach((q, i) => {
    const id = q.id || `#${i}`;
    const fail = (msg) => errors.push(`${id}: ${msg}`);
    if (!q.id) fail('id가 없음');
    else if (ids.has(q.id)) fail('id 중복');
    ids.add(q.id);
    if (!CATEGORIES.includes(q.category)) fail('카테고리가 4개 중 하나가 아님');
    if (typeof q.question !== 'string' || !q.question.trim()) fail('문제가 비어 있음');
    if (!Array.isArray(q.choices) || q.choices.length !== 4) fail('보기가 4개가 아님');
    else if (new Set(q.choices).size !== 4) fail('보기 문자열이 중복됨');
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) fail('answer가 0~3이 아님');
    if (typeof q.explanation !== 'string' || !q.explanation.trim()) fail('해설이 비어 있음');
    else if (/[\r\n]/.test(q.explanation)) fail('해설이 한 줄이 아님');
    else if (q.explanation.length > 80) fail('해설이 80자를 넘음');
    if (typeof q.source !== 'string' || q.source.trim().length < 2) fail('출처가 비어 있음');
    else if (!/https?:\/\//.test(q.source)) fail('출처에 주소(URL)가 없음');
    if (typeof q.question === 'string' && SUPERLATIVE.test(q.question) && !q.question.includes('기준')) {
      fail('최상급 표현이 있는데 문제에 "기준"이 없음');
    }
  });
  return errors;
}

// 마감 시각 기반 타이머를 가짜 시계로 점검하기 위한 도우미. fn(tick)에서 tick(ms)로 시간을 흘려보낸다.
function withFakeClock(fn) {
  const realNow = Date.now;
  const realSet = globalThis.setInterval;
  const realClear = globalThis.clearInterval;
  let now = 0;
  const timers = [];
  Date.now = () => now;
  globalThis.setInterval = (f, ms) => { timers.push({ f, ms, next: now + ms, dead: false }); return timers.length; };
  globalThis.clearInterval = (id) => { if (timers[id - 1]) timers[id - 1].dead = true; };
  const tick = (ms) => {
    const end = now + ms;
    for (;;) {
      let due = null;
      for (const t of timers) if (!t.dead && t.next <= end && (due === null || t.next < due.next)) due = t;
      if (!due) break;
      now = due.next;
      due.next += due.ms;
      due.f();
    }
    now = end;
  };
  try { fn(tick); } finally {
    Date.now = realNow;
    globalThis.setInterval = realSet;
    globalThis.clearInterval = realClear;
  }
}

// 모든 점검을 돌려 { passed, failures }를 돌려준다. 브라우저에서는 호출하지 않는다.
function selfCheck(questions, log) {
  const all = questions || (typeof QUESTIONS !== 'undefined' ? QUESTIONS : require('./questions.js').QUESTIONS);
  const failures = [];
  let passed = 0;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function check(name, ok) {
    if (ok) passed += 1; else failures.push('실패: ' + name);
    if (log) log(name, !!ok);
  }
  function seeded(seed) {
    let x = seed;
    return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  }
  function newGame(mode, category, seed) {
    return createGame({ mode, category, questions: pickQuestions(all, category, seeded(seed || 1)) });
  }
  // wrongAt에 든 순번(0부터)은 틀리게, 나머지는 맞히게 끝까지 푼다.
  function play(game, wrongAt) {
    while (!isFinished(game)) {
      const q = game.questions[game.index];
      answer(game, (wrongAt || []).includes(game.index) ? (q.answer + 1) % 4 : q.answer);
      nextQuestion(game);
    }
    return game;
  }
  function fakeStorage(initial) {
    const data = new Map(initial ? Object.entries(initial) : []);
    return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)); }, raw: () => data.get(LEADERBOARD_KEY) };
  }

  // --- 문항 데이터 ---
  check('data: 문항 규칙 위반이 없다', same(validateQuestions(all), []));
  check('data: 문항은 40개', all.length === 40);
  CATEGORIES.forEach((c) => check(`data: ${c}는 10문항`, all.filter((q) => q.category === c).length === 10));
  const good = { id: 'x-01', category: '과학', question: '물은 1기압에서 몇 도에서 끓는가?', choices: ['a', 'b', 'c', 'd'], answer: 2, explanation: '설명', source: '기관 https://example.org' };
  const bad = (patch) => validateQuestions([Object.assign({}, good, patch)]).length >= 1;
  check('data: 검사기가 정상 문항을 통과시킨다', same(validateQuestions([good]), []));
  check('data: 보기 3개는 위반', bad({ choices: ['a', 'b', 'c'] }));
  check('data: answer 범위 밖은 위반', bad({ answer: 4 }));
  check('data: 보기 중복은 위반', bad({ choices: ['a', 'a', 'b', 'c'] }));
  check('data: 줄바꿈 있는 해설은 위반', bad({ explanation: '가\n나' }));
  check('data: 해설 81자는 위반, 80자는 통과', bad({ explanation: '가'.repeat(81) }) && !bad({ explanation: '가'.repeat(80) }));
  check('data: URL 없는 출처는 위반', bad({ source: '기관만' }));
  check('data: 기준 없는 최상급 문제는 위반, 기준이 있으면 통과', bad({ question: '가장 큰 나라는?' }) && !bad({ question: '2024년 면적 기준 가장 큰 나라는?' }));
  check('data: id 중복은 위반', validateQuestions([good, good]).length >= 1);
  check('data: 카테고리가 4개 밖이면 위반', bad({ category: '스포츠' }));

  // --- 게임 기본 (연습) ---
  check('game: CATEGORIES', same(CATEGORIES, ['한국사', '세계지리', '과학', '예술과 문화']));
  const src = [1, 2, 3, 4, 5, 6];
  const shuffled = shuffle(src, seeded(7));
  check('game: shuffle은 원본을 바꾸지 않고 같은 원소를 가진다', same(src, [1, 2, 3, 4, 5, 6]) && same(shuffled.slice().sort(), src));
  const picked = pickQuestions(all, '과학', seeded(3));
  check('game: pickQuestions는 그 카테고리 10문항', picked.length === 10 && picked.every((q) => q.category === '과학'));
  const byId = new Map(all.map((q) => [q.id, q]));
  let choicesOk = true;
  for (let seed = 1; seed <= 50; seed++) {
    for (const q of pickQuestions(all, '한국사', seeded(seed))) {
      const o = byId.get(q.id);
      if (q.choices[q.answer] !== o.choices[o.answer] || !same(q.choices.slice().sort(), o.choices.slice().sort())) choicesOk = false;
    }
  }
  check('game: 보기를 섞어도 정답 보기와 구성이 같다(50회)', choicesOk);
  const before = JSON.stringify(all);
  pickQuestions(all, '세계지리', seeded(9));
  check('game: pickQuestions는 원본을 바꾸지 않는다', JSON.stringify(all) === before);
  let threw = false;
  try { pickQuestions(all.filter((q) => q.category === '과학').slice(0, 9), '과학'); } catch (e) { threw = true; }
  check('game: 문항이 9개뿐이면 Error', threw);
  check('game: scoreFor 연습/스피드', scoreFor('practice', true, false) === 1 && scoreFor('practice', false, false) === 0 && scoreFor('speed', true, false) === 1);
  let g = newGame('practice', '과학');
  const q0 = g.questions[0];
  const fb = answer(g, q0.answer);
  check('game: 정답 피드백(1점, 정답 번호, 해설, 출처)', fb.correct && fb.points === 1 && fb.correctIndex === q0.answer && fb.explanation === q0.explanation && fb.source === q0.source && g.score === 1);
  check('game: 같은 문항을 두 번 채점하지 않는다', answer(g, q0.answer) === null && g.score === 1 && g.results.length === 1);
  nextQuestion(g);
  const fb2 = answer(g, (g.questions[1].answer + 1) % 4);
  check('game: 오답은 0점', fb2.correct === false && fb2.points === 0 && g.score === 1);
  g = newGame('practice', '과학');
  check('game: 범위 밖 보기 번호는 채점 안 함', answer(g, 4) === null && answer(g, -1) === null && g.answered === false);
  nextQuestion(g);
  check('game: 답하기 전 nextQuestion은 이동하지 않는다', g.index === 0);
  g = play(newGame('practice', '과학'));
  check('game: 10문제를 풀면 끝나고 10점', isFinished(g) && g.score === 10 && answer(g, 0) === null);
  g = newGame('practice', '과학');
  answer(g, g.questions[0].answer);
  nextQuestion(g);
  answer(g, (g.questions[1].answer + 1) % 4);
  check('game: results에 풀이 순서대로 기록', same(g.results, [{ id: g.questions[0].id, correct: true, hintUsed: false, timedOut: false }, { id: g.questions[1].id, correct: false, hintUsed: false, timedOut: false }]));

  // --- 힌트 ---
  check('hint: scoreFor', scoreFor('hint', true, true) === 0.5 && scoreFor('hint', true, false) === 1 && scoreFor('hint', false, true) === 0);
  let hintOk = true;
  for (let seed = 1; seed <= 100; seed++) {
    const h = newGame('hint', '과학', seed);
    const hidden = useHint(h, seeded(seed * 7));
    if (hidden.length !== 2 || new Set(hidden).size !== 2 || hidden.includes(h.questions[0].answer) || !same(h.hidden, hidden)) hintOk = false;
  }
  check('hint: 오답 2개를 지우고 정답은 남긴다(100회)', hintOk);
  g = newGame('hint', '과학');
  useHint(g);
  const hf = answer(g, g.questions[0].answer);
  nextQuestion(g);
  const nf = answer(g, g.questions[1].answer);
  check('hint: 힌트 후 정답 0.5점, 힌트 없이 정답 1점', hf.points === 0.5 && nf.points === 1 && g.score === 1.5);
  nextQuestion(g);
  useHint(g);
  const visibleWrong = [0, 1, 2, 3].find((i) => i !== g.questions[2].answer && !g.hidden.includes(i));
  check('hint: 힌트 후 오답은 0점', answer(g, visibleWrong).points === 0 && g.score === 1.5);
  g = newGame('hint', '과학');
  const first = useHint(g);
  const snap = g.hidden.slice();
  check('hint: useHint 두 번째는 null이고 hidden 불변', useHint(g) === null && same(g.hidden, snap) && same(first, snap));
  check('hint: 지워진 보기를 고르면 null이고 상태 불변', answer(g, g.hidden[0]) === null && g.answered === false && g.score === 0);
  check('hint: 연습·스피드 모드에서는 힌트 불가', useHint(newGame('practice', '과학')) === null && useHint(newGame('speed', '과학')) === null);
  g = newGame('hint', '과학');
  answer(g, g.questions[0].answer);
  check('hint: 이미 답한 문항에서는 힌트 불가', useHint(g) === null);
  g = newGame('hint', '과학');
  useHint(g);
  answer(g, g.questions[0].answer);
  nextQuestion(g);
  check('hint: 다음 문항에서 hidden·hintUsed 초기화', g.hidden.length === 0 && g.hintUsed === false && useHint(g) !== null);

  // --- 스피드 ---
  check('speed: SPEED_SECONDS는 15', SPEED_SECONDS === 15);
  g = newGame('speed', '세계지리', 2);
  const sq = g.questions[0];
  const tf = timeout(g);
  check('speed: timeout은 0점 오답(timedOut)이고 정답·해설을 준다', tf.correct === false && tf.points === 0 && tf.timedOut === true && tf.correctIndex === sq.answer && tf.explanation === sq.explanation && g.score === 0 && g.answered === true && same(g.results, [{ id: sq.id, correct: false, hintUsed: false, timedOut: true }]));
  check('speed: timeout 뒤 answer는 null', answer(g, sq.answer) === null && timeout(g) === null && g.results.length === 1);
  g = newGame('speed', '세계지리', 2);
  answer(g, g.questions[0].answer);
  check('speed: answer 뒤 timeout은 null', timeout(g) === null && g.score === 1 && g.results.length === 1);
  g = newGame('speed', '세계지리', 2);
  timeout(g);
  nextQuestion(g);
  check('speed: timeout 뒤 다음 문항에서 다시 채점', g.index === 1 && answer(g, g.questions[1].answer) !== null && g.score === 1);
  withFakeClock((tick) => {
    const ticks = [];
    let expired = 0;
    startTimer(15, (n) => ticks.push(n), () => { expired += 1; });
    check('speed: 타이머는 15에서 시작', ticks[0] === 15);
    tick(5000);
    check('speed: 5초 뒤 10', ticks[ticks.length - 1] === 10 && expired === 0);
    tick(10000);
    check('speed: 15초 뒤 만료 한 번', expired === 1);
    tick(10000);
    check('speed: 만료는 한 번만', expired === 1);
  });
  withFakeClock((tick) => {
    const ticks = [];
    let expired = 0;
    const stop = startTimer(15, (n) => ticks.push(n), () => { expired += 1; });
    tick(3000);
    stop();
    const count = ticks.length;
    tick(20000);
    check('speed: stop() 뒤에는 틱·만료가 없다', ticks.length === count && expired === 0);
  });

  // --- 틀린 문제 다시 풀기 ---
  g = play(newGame('practice', '한국사', 5), [1, 4, 8]);
  check('retry: wrongQuestions는 틀린 순서대로', same(wrongQuestions(g).map((q) => q.id), [1, 4, 8].map((i) => g.questions[i].id)));
  check('retry: 전부 맞히면 retryGame은 null', retryGame(play(newGame('practice', '한국사', 5))) === null);
  g = play(newGame('practice', '한국사', 5), [2, 6]);
  const r1 = retryGame(g, seeded(11));
  check('retry: 틀린 문항만 담은 연습 판', r1.mode === 'practice' && r1.isRetry === true && r1.index === 0 && r1.score === 0 && same(r1.questions.map((q) => q.id).sort(), [2, 6].map((i) => g.questions[i].id).sort()));
  check('retry: 보기 구성과 정답은 같고 새로 섞인다', r1.questions.every((q) => { const o = g.questions.find((x) => x.id === q.id); return q.choices[q.answer] === o.choices[o.answer] && same(q.choices.slice().sort(), o.choices.slice().sort()); }));
  const scoreBefore = g.score;
  const resultsBefore = JSON.stringify(g.results);
  play(r1);
  check('retry: 다시 풀어도 원래 점수·결과는 그대로', scoreBefore === 8 && g.score === 8 && JSON.stringify(g.results) === resultsBefore);
  g = play(newGame('practice', '한국사', 5), [0, 1, 2]);
  const ra = retryGame(g);
  const stillWrong = ra.questions[1].id;
  play(ra, [1]);
  const rb = retryGame(ra);
  check('retry: 또 틀리면 그 문항만으로 반복하고 모두 맞히면 null', same(rb.questions.map((q) => q.id), [stillWrong]) && rb.isRetry === true && retryGame(play(rb)) === null);
  g = play(newGame('practice', '한국사', 5), [3]);
  const snapshot = JSON.stringify(g);
  retryGame(g);
  check('retry: 원래 판 객체를 바꾸지 않는다', JSON.stringify(g) === snapshot);

  // --- 순위표 ---
  check('board: 저장 키', LEADERBOARD_KEY === 'quiz.leaderboard.v1');
  let st = fakeStorage();
  [3, 9, 7, 5, 8, 1].forEach((sc, i) => addRecord(st, 'speed', '과학', '민수', sc, 1000 + i));
  check('board: 상위 5건만, 점수 내림차순', same(getTop(st, 'speed', '과학').map((r) => r.score), [9, 8, 7, 5, 3]));
  st = fakeStorage();
  addRecord(st, 'hint', '과학', '가', 7.5, 100);
  addRecord(st, 'hint', '과학', '나', 7, 200);
  addRecord(st, 'hint', '과학', '다', 7.5, 300);
  check('board: 동점이면 먼저 세운 기록이 위', same(getTop(st, 'hint', '과학').map((r) => r.name), ['가', '다', '나']));
  st = fakeStorage();
  check('board: 기록은 이름·점수·시각, 모드·카테고리별로 분리', addRecord(st, 'speed', '과학', '민수', 8, 1000) === true && same(getTop(st, 'speed', '과학'), [{ name: '민수', score: 8, at: 1000 }]) && getTop(st, 'hint', '과학').length === 0 && getTop(st, 'speed', '한국사').length === 0);
  st = fakeStorage();
  check('board: 연습은 저장하지 않는다', addRecord(st, 'practice', '과학', '민수', 10, 1) === false && st.raw() === undefined);
  st = fakeStorage();
  check('board: 빈 이름·공백·11자·숫자 이름은 거부', !addRecord(st, 'speed', '과학', '', 5, 1) && !addRecord(st, 'speed', '과학', '   ', 5, 1) && !addRecord(st, 'speed', '과학', '가'.repeat(11), 5, 1) && !addRecord(st, 'speed', '과학', 123, 5, 1) && getTop(st, 'speed', '과학').length === 0);
  check('board: 앞뒤 공백은 자르고 10자는 통과', addRecord(st, 'speed', '과학', '  민수  ', 5, 1) && addRecord(st, 'speed', '과학', '가'.repeat(10), 4, 2) && same(getTop(st, 'speed', '과학').map((r) => r.name), ['민수', '가'.repeat(10)]));
  check('board: setItem 예외면 false', addRecord({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, 'speed', '과학', '민수', 5, 1) === false);
  let recovered = true;
  ['{깨진', '[]', 'null', '"문자열"', '{"speed|과학": "x"}', '{"speed|과학": [1, null, {"score": "a"}]}'].forEach((badValue) => {
    const s2 = fakeStorage({ [LEADERBOARD_KEY]: badValue });
    if (getTop(s2, 'speed', '과학').length !== 0 || addRecord(s2, 'speed', '과학', '민수', 6, 5) !== true || !same(getTop(s2, 'speed', '과학'), [{ name: '민수', score: 6, at: 5 }])) recovered = false;
  });
  check('board: 깨진 저장값은 빈 순위표로 복구되고 다시 저장된다', recovered);
  const denied = { getItem: () => { throw new Error('denied'); }, setItem: () => {} };
  check('board: getItem 예외·null 저장소는 안전', getTop(denied, 'speed', '과학').length === 0 && addRecord(denied, 'speed', '과학', '민수', 5, 1) === false && getTop(null, 'speed', '과학').length === 0 && addRecord(null, 'speed', '과학', '민수', 5, 1) === false);
  check('board: localStorage가 없는 환경(Node)에서 getStorage는 null', typeof localStorage !== 'undefined' || getStorage() === null);
  check('board: formatDate는 YYYY-MM-DD', formatDate(new Date(2026, 9, 8).getTime()) === '2026-10-08' && formatDate(new Date(2027, 0, 5, 23, 59).getTime()) === '2027-01-05');

  return { passed, failures };
}

// 주소 끝에 ?test를 붙이면 브라우저 콘솔에 자체 점검 결과를 찍는다.
function runBrowserSelfCheck() {
  const r = selfCheck(undefined, (name, ok) => (ok ? console.log('통과: ' + name) : console.error('실패: ' + name)));
  const summary = `자체 점검 결과: 통과 ${r.passed}, 실패 ${r.failures.length}`;
  if (r.failures.length) console.error(summary); else console.log(summary);
}

if (typeof document !== 'undefined') {
  initUI();
  if (/[?&]test(?:&|=|$)/.test(location.search)) runBrowserSelfCheck();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CATEGORIES, SPEED_SECONDS, shuffle, pickQuestions, scoreFor, createGame, answer, timeout, useHint,
    nextQuestion, isFinished, wrongQuestions, retryGame, startTimer,
    LEADERBOARD_KEY, getStorage, getTop, addRecord, formatDate, validateQuestions, selfCheck
  };
}
