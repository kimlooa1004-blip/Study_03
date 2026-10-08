// ===== 로직: DOM을 모르는 순수 함수. Node 테스트에서도 불러온다 =====

const CATEGORIES = ['한국사', '세계지리', '과학', '예술과 문화'];
const QUESTIONS_PER_GAME = 10;

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
  return 1;
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

function answer(game, choiceIndex) {
  if (isFinished(game) || game.answered) return null;
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) return null;
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

function nextQuestion(game) {
  if (!game.answered) return;
  game.index += 1;
  game.answered = false;
  game.hintUsed = false;
  game.hidden = [];
}

// ===== UI: DOM을 다루는 코드. 브라우저에서만 실행된다 =====

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
    CATEGORIES, shuffle, pickQuestions, scoreFor, createGame, answer, nextQuestion, isFinished
  };
}
