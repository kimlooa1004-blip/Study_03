# 상식 퀴즈 웹 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대학 1학년이 혼자 푸는 4지선다 상식 퀴즈(연습·스피드·힌트 모드, 순위표)를 서버 없이 브라우저에서 여는 정적 웹 앱으로 만든다.

**Architecture:** 배포 파일은 `index.html`, `style.css`, `script.js`, `questions.js` 4개뿐이다. `script.js`는 DOM을 모르는 순수 로직(점수·진행·순위표)과 DOM을 다루는 UI 코드로 나뉘고, 순수 로직은 Node에서 `module.exports`로 불러와 `node:test`로 검증한다. 화면 동작은 Playwright로 `file://`에서 확인한다. 테스트와 검증 도구는 `Study03_Quiz_A/tests/`에 두며 배포 파일이 아니다.

**Tech Stack:** 바닐라 HTML/CSS/JS(클래식 `<script>`, ES module 불사용 — `file://`에서 막힘), localStorage. 검증: Node 22 `node:test`, Playwright 1.56(전역 설치).

**Spec:** `Study03_Quiz_A/PRD.md`

## Global Constraints

- 파일은 `Study03_Quiz_A/` 아래 `index.html`, `style.css`, `script.js`, `questions.js` 4개. 외부 라이브러리·네트워크 요청 없음. `file://`로 열어 동작해야 한다.
- 카테고리 4개: `한국사`, `세계지리`, `과학`, `예술과 문화`. 카테고리마다 10문제, 총 40문제. 한 판 = 카테고리 1개의 10문제.
- 보기는 4개, 정답은 하나. 틀린 문항은 모든 모드에서 0점.
- 연습: 시간 제한·힌트 없음, 맞히면 1점, 순위표 기록 안 함. 시작 화면과 결과 화면에 `순위표에 기록되지 않음` 표시.
- 스피드: 문항마다 15초, 시간 초과는 오답, 해설이 나오면 타이머 정지, [다음]을 누르면 15초부터 다시.
- 힌트: 문항마다 1번, 오답 보기 2개를 지움, 힌트를 쓰고 맞히면 0.5점(힌트 없이 맞히면 1점, 시간 제한 없음).
- 순위표: 스피드·힌트만 기록. 모드별 × 카테고리별(8개), 항목은 점수+날짜, 상위 10개, 점수 내림차순·동점이면 최근 기록이 위. 닉네임 없음.
- 문항 규칙: 정답 하나 / 해설에 확인한 출처 명시 / 최상급 표현("가장 ~" 등)은 문제에 기준과 시점 명시.
- 점수는 0.5 단위로 표시(예: `7.5`).
- 가정(PRD 8장): 스피드 맞히면 1점, 문항 순서는 판마다 섞고 보기 순서는 고정, 시간 초과 시 정답·해설을 보여 주고 [다음]을 기다림, 진행 중인 판은 저장하지 않음, 날짜 표기 `YYYY-MM-DD`.

## Review Focus

사양이 암시하지만 어느 작업의 기본 테스트도 다루지 않는 입력·조건이다. 각 줄의 테스트는 해당 코드를 가진 작업에 들어 있다.

1. 같은 문항에서 보기를 연타하거나 더블클릭해도 점수가 한 번만 반영된다 → Task 7
2. 스피드에서 답 선택과 시간 초과가 겹치거나, 판을 나간 뒤에도 이전 타이머가 남아도 한 문항이 두 번 채점되지 않는다 → Task 11
3. 힌트를 두 번 누르거나 힌트 후 지워진 보기를 눌러도 정답 보기는 남고 점수·상태가 깨지지 않는다 → Task 9
4. 틀린 문항이 0개면 [틀린 문제 다시 풀기]가 없고, 다시 풀어도 원래 판 점수는 바뀌지 않는다 → Task 10
5. localStorage 값이 깨졌거나 접근이 막혀도 게임은 정상이고 순위표는 빈 상태로 복구된다 → Task 13

---

## File Structure

| 파일 | 책임 |
|---|---|
| `Study03_Quiz_A/questions.js` | 문항 40개 데이터(`QUESTIONS`)만 둔다 |
| `Study03_Quiz_A/script.js` | 순수 로직 → 순위표 로직 → UI 순서로 구역을 나눈다. 끝에서 로직을 `module.exports`로 내보내고, 브라우저(`typeof document !== 'undefined'`)에서만 `init()` 실행 |
| `Study03_Quiz_A/index.html` | 화면(view) 5개의 마크업 |
| `Study03_Quiz_A/style.css` | 스타일 |
| `Study03_Quiz_A/tests/validateQuestions.js` | 문항 규칙 검사기(`validateQuestions`) |
| `Study03_Quiz_A/tests/*.test.js` | `node:test` 단위 테스트 |
| `Study03_Quiz_A/tests/e2e/stageN.js` | Playwright 화면 검증 |

실행 명령: 단위 `node --test Study03_Quiz_A/tests/`, 화면 `NODE_PATH=$(npm root -g) node Study03_Quiz_A/tests/e2e/stage1.js` (실패 시 종료 코드 1).

## 공용 타입

```js
// Question: { id, category, question, choices: [4 strings], answer: 0-3, explanation, source }
// Game:     { mode: 'practice'|'speed'|'hint', category, questions, index, score,
//             results: [{ id, correct, hintUsed, timedOut }], answered, hintUsed, hidden: number[], isRetry }
// Feedback: { correct, correctIndex, explanation, source, points, timedOut }
```

---

# 1단계: 연습 모드와 점수

### Task 1: 문항 검사기

**Files:**
- Create: `Study03_Quiz_A/tests/validateQuestions.js`
- Test: `Study03_Quiz_A/tests/validateQuestions.test.js`

**Interfaces:**
- Produces: `validateQuestions(list: Question[]) -> string[]` (규칙 위반 메시지 목록, 비어 있으면 통과). `module.exports = { validateQuestions, SUPERLATIVE }`.

- [ ] **Step 1: 실패하는 테스트 작성** — 유효한 문항 1개 fixture는 `[]`를 돌려주고, 아래 각각은 메시지 1개 이상을 돌려준다: 보기가 3개, `answer`가 4, `explanation`에 줄바꿈 포함, `source` 빈 문자열, `id` 중복, `category`가 4개 밖, `"가장 큰 나라는?"`(최상급인데 `기준` 없음) → 위반, `"2024년 면적 기준 가장 큰 나라는?"` → 통과, 같은 보기 문자열 중복.
- [ ] **Step 2: 실행해 실패 확인** — `node --test Study03_Quiz_A/tests/validateQuestions.test.js` → FAIL (모듈 없음)
- [ ] **Step 3: `validateQuestions` 구현** — 위반마다 `"<id>: <사유>"` 문자열. `SUPERLATIVE = /가장|최초|최대|최소|최고|최장|최단|제일/`; 문제 문장이 이에 일치하면 `기준`이 문장에 있어야 한다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 커밋** — `git add Study03_Quiz_A/tests && git commit -m "test: add question validator"`

### Task 2–5: 문항 작성 (카테고리당 1작업)

Task 2 = 한국사(`history-01`~`10`), Task 3 = 세계지리(`geography-01`~`10`), Task 4 = 과학(`science-01`~`10`), Task 5 = 예술과 문화(`culture-01`~`10`).

**Files:**
- Modify: `Study03_Quiz_A/questions.js` (Task 2에서 생성)

**Interfaces:**
- Produces: 전역 `QUESTIONS: Question[]`, 파일 끝 `if (typeof module !== 'undefined' && module.exports) { module.exports = { QUESTIONS }; }`.

각 작업의 단계:
- [ ] **Step 1: 문항 10개 후보 작성** — 확인 가능한 사실 위주, 보기 4개. 통계·기록·직위처럼 바뀌는 사실은 쓰지 않거나 기준 시점을 문제에 쓴다.
- [ ] **Step 2: 문항마다 출처 확인** — WebSearch/WebFetch로 정답과 해설을 실제로 확인하고, 확인한 출처명(필요하면 URL)을 `source`에 적는다. 확인하지 못한 문항은 교체한다. 출처를 지어내지 않는다.
- [ ] **Step 3: 오답 보기 검토** — 오답 3개가 모두 명백히 틀린지 확인한다(부분적으로 맞는 보기 금지).
- [ ] **Step 4: 검사기 실행** — `node -e "const {QUESTIONS}=require('./Study03_Quiz_A/questions.js');const {validateQuestions}=require('./Study03_Quiz_A/tests/validateQuestions.js');const e=validateQuestions(QUESTIONS);console.log(e);process.exit(e.length?1:0)"` → `[]`
- [ ] **Step 5: 커밋** — `git add Study03_Quiz_A/questions.js && git commit -m "content: add <카테고리> questions"`

### Task 6: 전체 문항 데이터 테스트

**Files:**
- Test: `Study03_Quiz_A/tests/questions.data.test.js`

- [ ] **Step 1: 테스트 작성** — `validateQuestions(QUESTIONS)`가 `[]`, `QUESTIONS.length === 40`, 4개 카테고리가 각각 정확히 10개.
- [ ] **Step 2: 실행해 통과 확인** — `node --test Study03_Quiz_A/tests/` → PASS
- [ ] **Step 3: 커밋** — `git commit -am "test: assert 40 questions, 10 per category"`

### Task 7: 연습 모드 게임 로직

**Files:**
- Create: `Study03_Quiz_A/script.js` (로직 구역)
- Test: `Study03_Quiz_A/tests/game.test.js`

**Interfaces:**
- Consumes: `QUESTIONS` (Task 2–5)
- Produces (`module.exports`): `CATEGORIES: string[]`, `shuffle(arr, rng = Math.random) -> arr`(새 배열), `pickQuestions(all, category, rng = Math.random) -> Question[]`(그 카테고리 10개, 순서 섞음), `scoreFor(mode, correct: boolean, hintUsed: boolean) -> number`, `createGame({ mode, category, questions, isRetry = false }) -> Game`, `answer(game, choiceIndex) -> Feedback | null`(이미 답했으면 `null`), `nextQuestion(game) -> void`(답하기 전이면 아무 일도 안 함), `isFinished(game) -> boolean`.

- [ ] **Step 1: 실패하는 테스트 작성** — `pickQuestions(QUESTIONS, '과학')`은 10개이고 모두 `category === '과학'`; `shuffle`은 원본을 바꾸지 않고 같은 원소를 가짐; 연습 모드에서 정답 `answer`는 `points 1`·`game.score 1`, 오답은 `points 0`·점수 불변; **같은 문항에서 `answer`를 두 번 호출하면 두 번째는 `null`이고 점수가 한 번만 반영**(Review Focus 1); 10문제를 모두 풀고 `nextQuestion` 10번 후 `isFinished`가 `true`; `answer` 전 `nextQuestion`은 `index`를 바꾸지 않음.
- [ ] **Step 2: 실패 확인** — `node --test Study03_Quiz_A/tests/game.test.js` → FAIL
- [ ] **Step 3: 구현** — `scoreFor('practice', true, *) === 1`, 오답은 `0`. 이 단계에서는 연습 모드만 다룬다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: 커밋** — `git add Study03_Quiz_A/script.js Study03_Quiz_A/tests/game.test.js && git commit -m "feat: practice game logic"`

### Task 8: 연습 모드 화면

**Files:**
- Create: `Study03_Quiz_A/index.html`, `Study03_Quiz_A/style.css`
- Modify: `Study03_Quiz_A/script.js` (UI 구역, `init()`)
- Test: `Study03_Quiz_A/tests/e2e/stage1.js`

**Interfaces:**
- Consumes: Task 7의 로직 전체.
- Produces (이후 화면 작업이 쓰는 선택자): 화면 `#view-start`, `#view-question`, `#view-result`(전환은 `hidden` 속성); `.category-btn[data-category]` 4개; `.no-record-notice`(텍스트 `순위표에 기록되지 않음`); 문제 화면 `#progress`(`3 / 10`), `#question-text`, `.choice-btn` 4개, `#feedback`(정답 여부·정답·해설·출처), `#next-btn`(마지막 문항에서는 텍스트 `결과 보기`); 결과 `#score`(`7 / 10`), `#home-btn`.
- 단축키: 숫자 `1`~`4`는 해당 보기 선택, `Enter`는 [다음]. 보기는 `<button>`이라 Tab·Enter로도 선택된다.

- [ ] **Step 1: 실패하는 화면 테스트 작성** — `file://`로 열기 → 시작 화면에 `.no-record-notice`와 카테고리 버튼 4개 → `과학` 선택 → `#progress`가 `1 / 10` → 보기 클릭 → `#feedback`에 해설과 출처가 보이고 보기 4개가 모두 비활성 → 키보드 `1` 선택·`Enter` 다음 동작 → 10문제를 모두 푼 뒤 `#score`가 `N / 10` 형식이고 결과 화면에도 `.no-record-notice` → `#home-btn`이 시작 화면으로 돌아감. 정답 인덱스는 페이지의 `QUESTIONS`로 계산해 정확히 3문제만 맞히고 `#score`가 `3 / 10`임을 단언.
- [ ] **Step 2: 실패 확인** — `NODE_PATH=$(npm root -g) node Study03_Quiz_A/tests/e2e/stage1.js` → FAIL
- [ ] **Step 3: 마크업·스타일·UI 구현** — 렌더 함수는 `Game`을 읽기만 하고 로직 함수만 호출한다. 모바일(폭 375px)에서 가로 스크롤이 없어야 한다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS, 이어서 `node --test Study03_Quiz_A/tests/` → PASS
- [ ] **Step 5: 커밋** — `git add Study03_Quiz_A && git commit -m "feat: practice mode UI (stage 1)"`

---

# 2단계: 스피드·힌트 모드, 모드 선택, 틀린 문제 다시 풀기

### Task 9: 힌트 로직과 점수

**Files:**
- Modify: `Study03_Quiz_A/script.js` (로직 구역)
- Test: `Study03_Quiz_A/tests/hint.test.js`

**Interfaces:**
- Consumes: Task 7의 `scoreFor`, `createGame`, `answer`.
- Produces: `useHint(game, rng = Math.random) -> number[] | null`(지워진 오답 인덱스 2개를 `game.hidden`에 넣고 반환, 힌트 모드가 아니거나 이미 썼거나 이미 답했으면 `null`). `answer`는 `game.hidden`에 있는 보기 선택이면 `null`. `scoreFor('hint', true, true) === 0.5`, `scoreFor('hint', true, false) === 1`, 오답은 `0`.

- [ ] **Step 1: 실패하는 테스트 작성** — 힌트 후 `hidden.length === 2`이고 정답 인덱스가 포함되지 않음(rng를 바꿔 100회 반복); 힌트 사용 후 정답 → `points 0.5`, 힌트 없이 정답 → `1`, 힌트 후 오답 → `0`; **`useHint` 두 번째 호출은 `null`이고 `hidden` 불변; 지워진 보기를 `answer`하면 `null`이고 점수 불변; 연습·스피드 모드에서 `useHint`는 `null`**(Review Focus 3); 다음 문항으로 가면 `hidden`과 `hintUsed`가 초기화.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** — `nextQuestion`이 `hidden`/`hintUsed`를 초기화하도록 확장.
- [ ] **Step 4: 통과 확인** — `node --test Study03_Quiz_A/tests/` → PASS
- [ ] **Step 5: 커밋** — `git commit -am "feat: hint logic and scoring"`

### Task 10: 틀린 문제 다시 풀기 로직

**Files:**
- Modify: `Study03_Quiz_A/script.js` (로직 구역)
- Test: `Study03_Quiz_A/tests/retry.test.js`

**Interfaces:**
- Produces: `wrongQuestions(game) -> Question[]`(`results`에서 `correct === false`인 문항을 푼 순서대로), `retryGame(game) -> Game | null`(틀린 문항이 없으면 `null`, 있으면 `createGame({ mode: 'practice', category: game.category, questions: wrongQuestions(game), isRetry: true })`). 원래 `game.score`는 건드리지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성** — 3문제 틀린 판 → `wrongQuestions.length === 3`이고 순서 유지; 전부 맞힌 판 → `retryGame`이 `null`(Review Focus 4); `retryGame`으로 만든 판을 끝까지 풀어도 원래 `game.score`가 그대로; 다시 푼 판의 `isRetry === true`이고 한 번 더 틀린 문항을 또 다시 풀게 하는 함수는 없다.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `node --test Study03_Quiz_A/tests/` → PASS
- [ ] **Step 5: 커밋** — `git commit -am "feat: retry wrong questions logic"`

### Task 11: 스피드 로직과 타이머

**Files:**
- Modify: `Study03_Quiz_A/script.js` (로직 구역)
- Test: `Study03_Quiz_A/tests/speed.test.js`

**Interfaces:**
- Produces: `SPEED_SECONDS = 15`, `timeout(game) -> Feedback | null`(`answered`이면 `null`, 아니면 오답 처리하고 `timedOut: true`인 Feedback 반환), `scoreFor('speed', true, *) === 1`. 타이머는 UI 구역의 `startTimer(seconds, onTick: (remaining: number) => void, onExpire: () => void) -> stop: () => void`(마감 시각 `Date.now() + seconds*1000` 기준 계산, `setInterval` 100ms).

- [ ] **Step 1: 실패하는 테스트 작성** — `timeout`은 `points 0`·`correct false`·`timedOut true`, 점수 불변, `results`에 `{ timedOut: true }` 기록; **`answer` 뒤 `timeout`은 `null`, `timeout` 뒤 `answer`는 `null`(채점은 한 문항에 한 번)**(Review Focus 2); 스피드 정답 `points 1`.
- [ ] **Step 2: 실패 확인** → FAIL
- [ ] **Step 3: 구현** — `startTimer`는 DOM 없이 Node에서도 불러올 수 있게 UI 구역 안 함수 선언으로 둔다.
- [ ] **Step 4: 통과 확인** — `node --test Study03_Quiz_A/tests/` → PASS
- [ ] **Step 5: 커밋** — `git commit -am "feat: speed mode logic and timer"`

### Task 12: 모드 선택·스피드·힌트·다시 풀기 화면

**Files:**
- Modify: `Study03_Quiz_A/index.html`, `Study03_Quiz_A/style.css`, `Study03_Quiz_A/script.js` (UI 구역)
- Test: `Study03_Quiz_A/tests/e2e/stage2.js`

**Interfaces:**
- Consumes: Task 9–11의 로직, Task 8의 선택자.
- Produces: 화면 `#view-mode`(`.mode-btn[data-mode="practice|speed|hint"]`, 연습 설명에 `.no-record-notice`); 흐름 모드 선택 → 카테고리 선택 → 문제 → 결과; 문제 화면 `#timer`(스피드만 표시, `15`부터), `#hint-btn`(힌트 모드만 표시, 사용 후·답한 후 비활성), 지워진 보기는 `hidden`; 결과 `#retry-btn`(연습 모드이고 틀린 문항이 있을 때만 표시), `#retry-summary`(`다시 맞힌 N / M`); 결과 화면에서 [다시 하기]와 `#home-btn`.

- [ ] **Step 1: 실패하는 화면 테스트 작성** — `page.clock`으로 시간 제어. (a) 스피드: 시작 시 `#timer`가 `15`, 5초 경과 후 약 `10`, 답하면 정지(5초 더 경과해도 값 불변), `#next-btn` 후 다시 `15`; 15초 경과하면 오답 처리되고 정답·해설이 보이며 `#next-btn`을 기다림; **시간 초과 직후 보기 클릭이 점수에 반영되지 않음; 결과 화면에서 `#home-btn`으로 나온 뒤 15초가 지나도 아무 변화 없음**(Review Focus 2). (b) 힌트: `#hint-btn` 클릭 → 보기 2개가 사라지고 정답 보기는 남음, 버튼 비활성, 힌트 후 정답이면 결과가 `0.5` 단위로 표시. (c) 연습: 일부러 2문제를 틀린 판 → `#retry-btn` 표시 → 2문제만 다시 풀고 `#retry-summary` 확인, 원래 점수는 결과에 그대로; 전부 맞힌 판에는 `#retry-btn`이 없음.
- [ ] **Step 2: 실패 확인** — `NODE_PATH=$(npm root -g) node Study03_Quiz_A/tests/e2e/stage2.js` → FAIL
- [ ] **Step 3: 구현** — 판이 바뀔 때(다음 문항, 결과, 홈) 이전 타이머의 `stop()`을 반드시 호출한다.
- [ ] **Step 4: 통과 확인** — stage1.js, stage2.js, `node --test Study03_Quiz_A/tests/` 모두 PASS (1단계 화면은 모드 선택이 추가되어 stage1.js의 시작 절차를 맞게 고친다)
- [ ] **Step 5: 커밋** — `git add Study03_Quiz_A && git commit -m "feat: speed/hint modes, mode select, retry (stage 2)"`

---

# 3단계: 점수 저장과 순위표

### Task 13: 순위표 저장 로직

**Files:**
- Modify: `Study03_Quiz_A/script.js` (순위표 구역)
- Test: `Study03_Quiz_A/tests/leaderboard.test.js`

**Interfaces:**
- Produces: `LEADERBOARD_KEY = 'quiz.leaderboard.v1'`, `addRecord(storage, mode, category, score, at: number) -> boolean`(`practice`이거나 저장 실패면 `false`), `getTop(storage, mode, category) -> { score, at }[]`(최대 10개, 점수 내림차순·동점이면 `at` 내림차순), `formatDate(at) -> 'YYYY-MM-DD'`, `getStorage() -> Storage | null`(접근 예외 시 `null`). 저장 형식은 `{ "<mode>|<category>": [{ score, at }] }`를 JSON으로 한 값 하나. `storage`는 `getItem/setItem`만 쓰는 객체(테스트에서 가짜로 주입).

- [ ] **Step 1: 실패하는 테스트 작성** — 11개 기록 후 `getTop`은 10개이고 최저 점수가 빠짐; 점수 `7.5`, `7`, `7.5`(더 최근)의 정렬 → 최근 `7.5`, 이전 `7.5`, `7`; 모드·카테고리가 다르면 서로 섞이지 않음; `addRecord(…'practice'…)`는 `false`이고 아무것도 저장 안 함; `setItem`이 예외를 던지는 storage → `false`, 던지지 않음; **`getItem`이 `'{깨진'`·`'[]'`·`'null'`을 돌려주면 `getTop`은 `[]`이고 이후 `addRecord`가 정상 저장**; `storage === null`이면 `getTop`은 `[]`, `addRecord`는 `false`(Review Focus 5); `formatDate(new Date(2026, 9, 8).getTime()) === '2026-10-08'`.
- [ ] **Step 2: 실패 확인** — `node --test Study03_Quiz_A/tests/leaderboard.test.js` → FAIL
- [ ] **Step 3: 구현**
- [ ] **Step 4: 통과 확인** — `node --test Study03_Quiz_A/tests/` → PASS
- [ ] **Step 5: 커밋** — `git commit -am "feat: leaderboard storage logic"`

### Task 14: 순위표 화면과 자동 기록

**Files:**
- Modify: `Study03_Quiz_A/index.html`, `Study03_Quiz_A/style.css`, `Study03_Quiz_A/script.js` (UI 구역)
- Test: `Study03_Quiz_A/tests/e2e/stage3.js`

**Interfaces:**
- Consumes: Task 13의 순위표 함수, Task 12의 화면.
- Produces: `#view-leaderboard`(시작 화면의 `#leaderboard-btn`으로 진입), 모드 탭 `.lb-mode-tab[data-mode="speed|hint"]`, 카테고리 탭 `.lb-category-tab[data-category]`, 행 `.lb-row`(순위·점수·날짜), 빈 상태 `#lb-empty`; 결과 화면의 `#save-notice`(저장 불가 시 `기록을 저장할 수 없음`). 스피드·힌트 판이 끝나면 한 번 자동 기록한다(연습·다시 풀기 라운드는 기록 안 함).

- [ ] **Step 1: 실패하는 화면 테스트 작성** — 스피드 `과학` 한 판을 끝낸 뒤 순위표의 스피드·과학 탭에 `.lb-row` 1개, 같은 판이 힌트·과학 탭이나 스피드·한국사 탭에는 없음(`#lb-empty`); 연습 판과 다시 풀기 라운드를 끝내도 `.lb-row`가 늘지 않음; 페이지를 새로 열어도(같은 `localStorage`) 기록이 남음; 한 판의 결과 화면을 새로고침 없이 두 번 열어도 기록은 1건; `Storage.prototype.setItem`이 예외를 던지게 한 컨텍스트에서 판이 정상 완료되고 `#save-notice`가 보임; `localStorage`에 깨진 값을 미리 넣어도 순위표가 `#lb-empty`로 열림.
- [ ] **Step 2: 실패 확인** — `NODE_PATH=$(npm root -g) node Study03_Quiz_A/tests/e2e/stage3.js` → FAIL
- [ ] **Step 3: 구현** — 결과 화면에 들어갈 때만 `addRecord`를 호출하고, 같은 판에서 다시 그려져도 중복 호출하지 않도록 `Game`에 기록 여부를 둔다(필드 추가 시 공용 타입 주석도 갱신).
- [ ] **Step 4: 통과 확인** — stage1~3.js, `node --test Study03_Quiz_A/tests/` 모두 PASS
- [ ] **Step 5: 커밋** — `git add Study03_Quiz_A && git commit -m "feat: leaderboard UI and auto-record (stage 3)"`

### Task 15: 최종 검증

**Files:** 수정 없음 (결함을 발견하면 해당 작업의 파일을 고친다)

- [ ] **Step 1: 전체 테스트** — `node --test Study03_Quiz_A/tests/` 및 stage1~3.js → 모두 PASS
- [ ] **Step 2: 배포 파일 점검** — `ls Study03_Quiz_A`에 배포 파일은 정확히 4개(`index.html`, `style.css`, `script.js`, `questions.js`)와 `tests/`, `PRD.md`뿐; `index.html`에 외부 URL(`http`)이 없음 → `grep -n "http" Study03_Quiz_A/index.html` 결과 없음
- [ ] **Step 3: 네트워크·콘솔 확인** — Playwright로 `file://`을 열어 한 판을 끝까지 진행하며 `requestfailed`·`console.error`·`pageerror`가 0건이고 외부 요청이 없음을 확인
- [ ] **Step 4: 폭 375px 확인** — 시작·문제·결과·순위표 화면에서 `document.documentElement.scrollWidth <= 375`
- [ ] **Step 5: PRD 대조** — PRD 1–7장의 항목을 하나씩 확인해 어긋나는 점이 있으면 목록으로 보고하고, 확인 결과를 PRD 문항 검수 체크리스트에 맞춰 남긴다
- [ ] **Step 6: 푸시** — `git push -u origin claude/affectionate-mccarthy-27q9jr`
