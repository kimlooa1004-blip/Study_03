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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CATEGORIES, shuffle, pickQuestions, scoreFor, createGame, answer, nextQuestion, isFinished
  };
}
