const CATEGORIES = ['한국사', '세계지리', '과학', '예술과 문화'];
const SUPERLATIVE = /가장|최초|최대|최소|최고|최장|최단|제일/;

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
    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      fail('보기가 4개가 아님');
    } else if (new Set(q.choices).size !== 4) {
      fail('보기 문자열이 중복됨');
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) fail('answer가 0~3이 아님');
    if (typeof q.explanation !== 'string' || !q.explanation.trim()) fail('해설이 비어 있음');
    else if (/[\r\n]/.test(q.explanation)) fail('해설이 한 줄이 아님');
    if (typeof q.source !== 'string' || q.source.trim().length < 2) fail('출처가 비어 있음');
    if (typeof q.question === 'string' && SUPERLATIVE.test(q.question) && !q.question.includes('기준')) {
      fail('최상급 표현이 있는데 문제에 "기준"이 없음');
    }
  });
  return errors;
}

module.exports = { validateQuestions, SUPERLATIVE, CATEGORIES };
