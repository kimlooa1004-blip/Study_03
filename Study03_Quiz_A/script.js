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

function initUI() {
  const $ = (id) => document.getElementById(id);
  const viewNames = ['start', 'question', 'result'];
  let game = null;

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

  function startGame(category) {
    let questions;
    try {
      questions = pickQuestions(availableQuestions(), category);
    } catch (e) {
      checkData();
      return;
    }
    game = createGame({ mode: 'practice', category, questions });
    renderQuestion();
    show('question');
  }

  function renderQuestion() {
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

  function choose(i) {
    const fb = answer(game, i);
    if (!fb) return;
    const q = game.questions[game.index];
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach((b, idx) => {
      b.disabled = true;
      if (idx === fb.correctIndex) {
        b.classList.add('correct');
        b.querySelector('.mark').textContent = '✓';
      } else if (idx === i) {
        b.classList.add('wrong');
        b.querySelector('.mark').textContent = '✗';
      }
    });
    const label = $('result-label');
    label.textContent = fb.correct ? '정답입니다!' : '오답입니다';
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

  function goNext() {
    nextQuestion(game);
    if (isFinished(game)) {
      $('score').textContent = `${formatScore(game.score)} / ${game.questions.length}`;
      show('result');
    } else {
      renderQuestion();
    }
  }

  document.querySelectorAll('.category-btn').forEach((btn) => {
    btn.addEventListener('click', () => startGame(btn.dataset.category));
  });
  $('next-btn').addEventListener('click', goNext);
  $('home-btn').addEventListener('click', () => {
    game = null;
    checkData();
    show('start');
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

if (typeof document !== 'undefined') {
  initUI();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CATEGORIES, SPEED_SECONDS, shuffle, pickQuestions, scoreFor, createGame, answer, timeout, useHint,
    nextQuestion, isFinished, wrongQuestions, retryGame, startTimer
  };
}
