// ===== 로직: DOM을 모르는 순수 함수. Node 테스트에서도 불러온다 =====

const CATEGORIES = ['한국사', '세계지리', '과학', '예술과 문화'];
const QUESTIONS_PER_GAME = 10;
const SPEED_SECONDS = 15;

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
  const viewNames = ['mode', 'start', 'question', 'result', 'leaderboard'];
  let lbMode = 'speed';
  let lbCategory = '한국사';
  let mode = null;
  let category = null;
  let rootGame = null; // 처음 10문제 판. 점수는 이 판의 결과만 인정한다
  let game = null;     // 지금 풀고 있는 판(다시 풀기 라운드일 수 있다)
  let stopTimer = () => {};

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

  function selectMode(m) {
    mode = m;
    $('start-mode-label').textContent = MODE_LABELS[m];
    $('start-notice').hidden = m !== 'practice';
    checkData();
    show('start');
  }

  function startGame(cat) {
    let questions;
    try {
      questions = pickQuestions(availableQuestions(), cat);
    } catch (e) {
      checkData();
      return;
    }
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
    renderSaveBox();
    show('result');
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
    show('mode');
  }

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectMode(btn.dataset.mode));
  });
  document.querySelectorAll('.category-btn').forEach((btn) => {
    btn.addEventListener('click', () => startGame(btn.dataset.category));
  });
  $('next-btn').addEventListener('click', goNext);
  $('hint-btn').addEventListener('click', useHintClick);
  $('retry-btn').addEventListener('click', retry);
  $('again-btn').addEventListener('click', () => startGame(category));
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
  $('lb-back-btn').addEventListener('click', () => show('mode'));
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
  show('mode');
}

if (typeof document !== 'undefined') {
  initUI();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CATEGORIES, SPEED_SECONDS, shuffle, pickQuestions, scoreFor, createGame, answer, timeout, useHint,
    nextQuestion, isFinished, wrongQuestions, retryGame, startTimer,
    LEADERBOARD_KEY, getStorage, getTop, addRecord, formatDate
  };
}
