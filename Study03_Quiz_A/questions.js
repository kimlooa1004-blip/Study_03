// 문항 데이터. 형식과 규칙은 PRD.md 6장 참고.
const QUESTIONS = [
  // ===== 한국사 =====
  {
    id: 'history-01',
    category: '한국사',
    question: '세종 때 훈민정음 글자가 만들어진(창제된) 해는?',
    choices: ['1392년', '1419년', '1443년', '1592년'],
    answer: 2,
    explanation: '『세종실록』 1443년(세종 25) 12월 기사에 세종이 28자를 만들었다고 적혀 있다.',
    source: '우리역사넷(국사편찬위원회) 「세종어제훈민정음」 https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_r300900&code=kc_age_30'
  },
  {
    id: 'history-02',
    category: '한국사',
    question: '일본군이 부산에 상륙하며 임진왜란이 시작된 해는?',
    choices: ['1392년', '1592년', '1636년', '1894년'],
    answer: 1,
    explanation: '1592년(선조 25) 4월 일본군이 부산진을 공격하며 임진왜란이 시작되었다.',
    source: '한국민족문화대백과사전 「임진왜란」 https://encykorea.aks.ac.kr/Article/E0047674'
  },
  {
    id: 'history-03',
    category: '한국사',
    question: '민족 대표 33인이 독립선언서를 발표하고 전국에서 만세 시위가 일어난 3·1 운동은 몇 년의 일인가?',
    choices: ['1905년', '1910년', '1919년', '1945년'],
    answer: 2,
    explanation: '3·1 운동은 1919년 3월 1일 서울에서 독립선언이 이루어지며 시작되었다.',
    source: '한국민족문화대백과사전 「3·1운동」 https://encykorea.aks.ac.kr/Article/E0026772'
  },
  {
    id: 'history-04',
    category: '한국사',
    question: '1861년에 목판본 전국 지도 『대동여지도』를 간행한 사람은?',
    choices: ['정약용', '정선', '김정호', '박지원'],
    answer: 2,
    explanation: '김정호가 1861년(철종 12) 22첩의 『대동여지도』를 목판으로 찍어 냈다.',
    source: '한국민족문화대백과사전 「김정호」 https://encykorea.aks.ac.kr/Article/E0010423 , 「대동여지도」 https://encykorea.aks.ac.kr/Article/E0014266'
  },
  {
    id: 'history-05',
    category: '한국사',
    question: '1392년 개경 수창궁에서 왕위에 올라 조선 왕조를 연 인물은?',
    choices: ['왕건', '이성계', '이방원', '정도전'],
    answer: 1,
    explanation: '이성계가 1392년 7월 개경 수창궁에서 즉위해 새 왕조를 열었다(태조).',
    source: '한국민족문화대백과사전 「태조」 https://encykorea.aks.ac.kr/Article/E0059033 , 우리역사넷 「태조이성계」 https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_n312600&code=kc_age_30'
  },
  {
    id: 'history-06',
    category: '한국사',
    question: '왕건이 궁예를 몰아내고 즉위해 고려를 세운 해는?',
    choices: ['668년', '698년', '918년', '936년'],
    answer: 2,
    explanation: '왕건은 918년 6월 철원에서 즉위해 국호를 고려로 하였고, 후삼국 통일은 936년이다.',
    source: '한국민족문화대백과사전 「태조」 https://encykorea.aks.ac.kr/Article/E0059032 , 우리역사넷 「궁예의 몰락과 왕건의 즉위」 https://contents.history.go.kr/mobile/nh/view.do?levelId=nh_012_0020_0010_0020_0010'
  },
  {
    id: 'history-07',
    category: '한국사',
    question: '고구려 장수왕이 도읍을 국내성에서 평양으로 옮긴 해는?',
    choices: ['313년', '391년', '427년', '475년'],
    answer: 2,
    explanation: '장수왕은 427년(장수왕 15)에 국내성에서 평양으로 천도했다.',
    source: '한국민족문화대백과사전 「평양천도」 https://encykorea.aks.ac.kr/Article/E0071979'
  },
  {
    id: 'history-08',
    category: '한국사',
    question: '청 태종이 직접 대군을 이끌고 조선을 침입해 인조가 남한산성에서 항전한 병자호란은 몇 년에 일어났나?',
    choices: ['1592년', '1597년', '1627년', '1636년'],
    answer: 3,
    explanation: '청 태종은 1636년 12월 대군을 이끌고 출병했고 인조는 이듬해 삼전도에서 항복했다.',
    source: '한국민족문화대백과사전 「병자호란」 https://encykorea.aks.ac.kr/Article/E0023151 , 우리역사넷 「병자호란」 https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_i302800&code=kc_age_30'
  },
  {
    id: 'history-09',
    category: '한국사',
    question: '고구려 유민 출신으로 발해를 세우고 제1대 왕(고왕)이 된 사람은?',
    choices: ['대조영', '연개소문', '을지문덕', '궁예'],
    answer: 0,
    explanation: '대조영은 고구려 유민으로 당의 영주 지방에 살다가 무리를 이끌고 동쪽으로 이동해 발해를 세웠다.',
    source: '한국민족문화대백과사전 「고왕」 https://encykorea.aks.ac.kr/Article/E0003841'
  },
  {
    id: 'history-10',
    category: '한국사',
    question: '임진왜란으로 불탄 경복궁을 1865년부터 다시 지을 때(중건) 총책임을 맡은 인물은?',
    choices: ['흥선대원군', '정도전', '김옥균', '이성계'],
    answer: 0,
    explanation: '1865년 신정왕후가 경복궁 중건을 명하며 총책임을 흥선대원군에게 맡겼다.',
    source: '한국민족문화대백과사전 「경복궁」 https://encykorea.aks.ac.kr/Article/E0002434'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QUESTIONS };
}
