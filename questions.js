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
  },

  // ===== 세계지리 =====
  {
    id: 'geography-01',
    category: '세계지리',
    question: '오스트레일리아의 수도는?',
    choices: ['시드니', '멜버른', '캔버라', '브리즈번'],
    answer: 2,
    explanation: '캔버라는 시드니와 멜버른의 중간쯤에 있는 호주 수도이며, 연방 의회는 1927년에 캔버라로 옮겼다.',
    source: 'Britannica, "What is the capital of Australia?" https://www.britannica.com/question/What-is-the-capital-of-Australia'
  },
  {
    id: 'geography-02',
    category: '세계지리',
    question: '튀르키예(터키)의 수도는?',
    choices: ['이스탄불', '앙카라', '이즈미르', '부르사'],
    answer: 1,
    explanation: '앙카라는 1923년 공화국 수립 때부터 수도이며, 큰 도시인 이스탄불과 혼동하기 쉽다.',
    source: 'Britannica, "Ankara, capital of Turkey" https://www.britannica.com/summary/Ankara'
  },
  {
    id: 'geography-03',
    category: '세계지리',
    question: '캐나다의 수도는?',
    choices: ['토론토', '몬트리올', '밴쿠버', '오타와'],
    answer: 3,
    explanation: '오타와는 온타리오주 남동부, 퀘벡주와 맞닿은 오타와강 남쪽에 있으며 1857년 빅토리아 여왕이 수도로 정했다.',
    source: 'Britannica, "Ottawa" https://www.britannica.com/place/Ottawa'
  },
  {
    id: 'geography-04',
    category: '세계지리',
    question: '이집트 북부에서 삼각주를 이루며 지중해로 흘러드는 강은?',
    choices: ['나일강', '아마존강', '갠지스강', '도나우강'],
    answer: 0,
    explanation: '나일강은 이집트 북부에서 지중해로 흘러들며 카이로 북쪽에서 로제타·다미에타 두 줄기로 갈라지는 삼각주를 이룬다.',
    source: 'Britannica, "Nile River" https://www.britannica.com/place/Nile-River ; National Geographic, "Nile River" https://education.nationalgeographic.org/resource/nile-river/'
  },
  {
    id: 'geography-05',
    category: '세계지리',
    question: '아프리카의 킬리만자로산이 있는 나라는?',
    choices: ['이집트', '모로코', '탄자니아', '남아프리카공화국'],
    answer: 2,
    explanation: '킬리만자로산은 탄자니아 북동부, 케냐 국경 가까이에 있으며 정상 우후루 봉은 해발 5,895m이다.',
    source: 'Britannica, "Kilimanjaro National Park" https://www.britannica.com/place/Kilimanjaro-National-Park'
  },
  {
    id: 'geography-06',
    category: '세계지리',
    question: '남아메리카 국가 가운데 포르투갈어를 공용어로 쓰는 나라는?',
    choices: ['아르헨티나', '칠레', '콜롬비아', '브라질'],
    answer: 3,
    explanation: '브라질은 포르투갈의 식민지였기 때문에 포르투갈어를 쓰고, 남아메리카의 다른 대부분 나라는 스페인어를 쓴다.',
    source: 'Britannica, "Brazil" https://www.britannica.com/place/Brazil'
  },
  {
    id: 'geography-07',
    category: '세계지리',
    question: '파나마 운하가 연결하는 두 대양은?',
    choices: ['대서양과 태평양', '대서양과 인도양', '태평양과 인도양', '북극해와 대서양'],
    answer: 0,
    explanation: '파나마 운하는 파나마 지협을 가로질러 대서양과 태평양을 잇고, 1914년에 개통되었다.',
    source: 'Britannica, "Panama Canal" https://www.britannica.com/topic/Panama-Canal'
  },
  {
    id: 'geography-08',
    category: '세계지리',
    question: '사하라 사막이 있는 대륙은?',
    choices: ['아시아', '아프리카', '오세아니아', '남아메리카'],
    answer: 1,
    explanation: '사하라는 아프리카 북부에 펼쳐진 사막으로 모로코·알제리·이집트·말리·차드 등 여러 나라에 걸쳐 있다.',
    source: 'Britannica, "Sahara summary" https://www.britannica.com/summary/Sahara-desert-Africa'
  },
  {
    id: 'geography-09',
    category: '세계지리',
    question: '남아메리카 대륙의 서부를 따라 길게 뻗은 산맥은?',
    choices: ['로키산맥', '알프스산맥', '히말라야산맥', '안데스산맥'],
    answer: 3,
    explanation: '안데스산맥은 남아메리카 서쪽을 따라 약 8,900km 이어지며 칠레·아르헨티나·페루 등을 지난다.',
    source: 'Britannica, "Andes Mountains" https://www.britannica.com/summary/Andes-Mountains'
  },
  {
    id: 'geography-10',
    category: '세계지리',
    question: '영국 잉글랜드와 프랑스 사이에 있으며 영국해협과 북해를 잇는 좁은 해협은?',
    choices: ['도버 해협', '지브롤터 해협', '보스포루스 해협', '말라카 해협'],
    answer: 0,
    explanation: '도버 해협은 영국해협의 동쪽 끝으로 잉글랜드의 도버와 프랑스의 칼레를 가르며 영국해협과 북해를 잇는다.',
    source: 'Britannica, "English Channel summary" https://www.britannica.com/summary/English-Channel'
  },

  // ===== 과학 =====
  {
    id: 'science-01',
    category: '과학',
    question: '식물이 광합성을 할 때 공기 중에서 흡수하는 기체는?',
    choices: ['이산화탄소', '산소', '질소', '수소'],
    answer: 0,
    explanation: '식물은 햇빛 에너지로 이산화탄소와 물을 합쳐 당과 산소를 만든다.',
    source: 'NASA Science, "The Carbon Cycle" https://science.nasa.gov/earth/earth-observatory/the-carbon-cycle/'
  },
  {
    id: 'science-02',
    category: '과학',
    question: '사람의 대부분의 체세포 하나에 들어 있는 염색체는 모두 몇 개인가?',
    choices: ['23개', '44개', '46개', '48개'],
    answer: 2,
    explanation: '사람의 체세포는 23쌍, 모두 46개의 염색체를 가지며 정자와 난자만 절반인 23개를 가진다.',
    source: 'NHGRI, "Diploid" https://www.genome.gov/genetics-glossary/Diploid'
  },
  {
    id: 'science-03',
    category: '과학',
    question: '1953년 DNA의 이중나선 구조 모형을 제안한 두 과학자는?',
    choices: ['멘델과 다윈', '왓슨과 크릭', '파스퇴르와 코흐', '뉴턴과 갈릴레이'],
    answer: 1,
    explanation: '왓슨과 크릭은 1953년 『네이처』에 DNA 이중나선 구조를 발표했고 1962년 노벨 생리의학상을 윌킨스와 함께 받았다.',
    source: 'Britannica, "Francis Crick" https://www.britannica.com/biography/Francis-Crick ; Britannica, "Structure and composition of DNA" https://www.britannica.com/science/heredity-genetics/Structure-and-composition-of-DNA'
  },
  {
    id: 'science-04',
    category: '과학',
    question: '원소 기호 Au로 나타내는 금속 원소는?',
    choices: ['은', '금', '알루미늄', '구리'],
    answer: 1,
    explanation: 'Au는 금(원자 번호 79)의 기호로 라틴어 aurum에서 왔다.',
    source: 'Royal Society of Chemistry, "Gold" https://periodic-table.rsc.org/element/79/gold'
  },
  {
    id: 'science-05',
    category: '과학',
    question: '2006년 국제천문연맹(IAU)의 행성 정의에 따르면 태양계의 행성은 모두 몇 개인가?',
    choices: ['7개', '8개', '9개', '10개'],
    answer: 1,
    explanation: '2006년 IAU 정의로 수성~해왕성 8개만 행성이 되었고 명왕성은 왜소행성으로 분류되었다.',
    source: 'IAU, 2006 General Assembly resolution votes https://www.iau.org/IAU/Iau/News/PR2006/iau-2006-general-assembly-resolution-votes.aspx ; NASA Science, "About the Planets" https://science.nasa.gov/solar-system/planets/'
  },
  {
    id: 'science-06',
    category: '과학',
    question: '표준 대기압(1기압)에서 물이 끓는 온도는 섭씨 약 몇 도인가?',
    choices: ['80도', '90도', '100도', '120도'],
    answer: 2,
    explanation: '1기압에서 물의 끓는점은 약 100℃(373K)이고 기압이 낮아지면 끓는점도 낮아진다.',
    source: 'NIST, "SI Units – Temperature" https://www.nist.gov/pml/owm/si-units-temperature ; Britannica, "When does water boil?" https://www.britannica.com/question/When-does-water-boil'
  },
  {
    id: 'science-07',
    category: '과학',
    question: '우주 공간 대부분에서 소리가 전달되지 않는 까닭은?',
    choices: ['빛이 너무 강해서', '소리를 전달할 매질이 거의 없어서', '중력이 없어서', '온도가 너무 높아서'],
    answer: 1,
    explanation: '소리는 물질을 통해 전달되는 역학적 파동이라 우주 대부분의 진공에는 전달해 줄 매질이 없다.',
    source: 'NASA, "New NASA Black Hole Sonifications with a Remix" https://www.nasa.gov/universe/new-nasa-black-hole-sonifications-with-a-remix/ ; Britannica, "Wave" https://www.britannica.com/science/wave-physics'
  },
  {
    id: 'science-08',
    category: '과학',
    question: '원자 번호가 8번인 원소는?',
    choices: ['수소', '탄소', '질소', '산소'],
    answer: 3,
    explanation: '산소(O)는 원자 번호 8번으로 양성자가 8개이고 상온에서 무색·무취의 기체이다.',
    source: 'Royal Society of Chemistry, "Oxygen" https://periodic-table.rsc.org/element/8/oxygen ; Britannica, "oxygen" https://www.britannica.com/science/oxygen'
  },
  {
    id: 'science-09',
    category: '과학',
    question: '혈당 조절에 쓰이는 호르몬인 인슐린을 만드는 기관은?',
    choices: ['간', '췌장', '신장', '위'],
    answer: 1,
    explanation: '인슐린은 췌장의 랑게르한스섬 베타세포에서 만들어져 세포가 혈액의 포도당을 쓰도록 돕는다.',
    source: 'Britannica, "Insulin" https://www.britannica.com/science/insulin ; Britannica, "Pancreas" https://www.britannica.com/science/pancreas'
  },
  {
    id: 'science-10',
    category: '과학',
    question: '1687년 『프린키피아』에서 운동 법칙과 함께 만유인력의 법칙을 발표한 과학자는?',
    choices: ['갈릴레이', '케플러', '뉴턴', '아인슈타인'],
    answer: 2,
    explanation: '뉴턴은 1687년 『자연철학의 수학적 원리(프린키피아)』에서 만유인력의 법칙과 3가지 운동 법칙을 제시했다.',
    source: 'Britannica, "Principia" https://www.britannica.com/topic/Principia'
  },

  // ===== 예술과 문화 =====
  {
    id: 'culture-01',
    category: '예술과 문화',
    question: '프랑스 루브르 박물관에 걸려 있는 「모나리자」를 그린 화가는?',
    choices: ['레오나르도 다 빈치', '미켈란젤로', '라파엘로', '렘브란트'],
    answer: 0,
    explanation: '레오나르도 다 빈치가 1503년경 그리기 시작해 1519년 죽을 때까지 손질한 작품이다.',
    source: 'Britannica, "Mona Lisa" https://www.britannica.com/topic/Mona-Lisa-painting ; Louvre https://www.louvre.fr/en/explore/the-palace/from-the-mona-lisa-to-the-wedding-feast-at-cana'
  },
  {
    id: 'culture-02',
    category: '예술과 문화',
    question: '1889년 생레미의 요양원에서 「별이 빛나는 밤」을 그린 화가는?',
    choices: ['빈센트 반 고흐', '클로드 모네', '폴 세잔', '구스타프 클림트'],
    answer: 0,
    explanation: '반 고흐가 1889년 6월 생레미의 요양원에서 기억과 상상으로 그린 작품이다.',
    source: 'MoMA, "The Starry Night" https://www.moma.org/collection/works/79802'
  },
  {
    id: 'culture-03',
    category: '예술과 문화',
    question: '1937년 스페인 내전 중 게르니카 폭격을 주제로 대형 그림 「게르니카」를 그린 화가는?',
    choices: ['살바도르 달리', '호안 미로', '파블로 피카소', '앙리 마티스'],
    answer: 2,
    explanation: '피카소는 파리 만국박람회 스페인관에 걸 벽화로 1937년 「게르니카」를 그렸다.',
    source: 'Britannica, "Guernica" https://www.britannica.com/topic/Guernica-by-Picasso ; Museo Reina Sofía https://www.museoreinasofia.es/en/collections/artwork/guernica-0/'
  },
  {
    id: 'culture-04',
    category: '예술과 문화',
    question: '덴마크 왕자의 복수를 그린 비극 『햄릿』을 쓴 작가는?',
    choices: ['괴테', '윌리엄 셰익스피어', '몰리에르', '도스토옙스키'],
    answer: 1,
    explanation: '『햄릿』은 셰익스피어가 1599~1601년경 쓴 5막 비극이며 1603년 사절판으로 처음 출간되었다.',
    source: 'Britannica, "Hamlet" https://www.britannica.com/topic/Hamlet-by-Shakespeare ; Folger https://www.folger.edu/explore/shakespeares-works/hamlet/'
  },
  {
    id: 'culture-05',
    category: '예술과 문화',
    question: '「지옥의 문」 위에 앉은 시인상으로 구상되어 「생각하는 사람」이 된 조각을 만든 조각가는?',
    choices: ['미켈란젤로', '카노바', '오귀스트 로댕', '브랑쿠시'],
    answer: 2,
    explanation: '로댕이 1880년 「지옥의 문」 꼭대기의 단테상으로 구상했고 뒤에 독립 작품이 되었다.',
    source: 'Musée Rodin, "The Thinker" https://www.musee-rodin.fr/en/musee/collections/oeuvres/thinker'
  },
  {
    id: 'culture-06',
    category: '예술과 문화',
    question: '작곡가 모차르트가 태어난 도시는?',
    choices: ['빈', '잘츠부르크', '베를린', '프라하'],
    answer: 1,
    explanation: '모차르트는 1756년 1월 27일 잘츠부르크에서 태어나 1791년 빈에서 세상을 떠났다.',
    source: 'Britannica, "Wolfgang Amadeus Mozart Facts" https://www.britannica.com/facts/Wolfgang-Amadeus-Mozart'
  },
  {
    id: 'culture-07',
    category: '예술과 문화',
    question: '마지막 악장에 실러의 시 「환희의 송가」를 합창으로 넣은 교향곡 9번의 작곡가는?',
    choices: ['모차르트', '바흐', '슈베르트', '베토벤'],
    answer: 3,
    explanation: '베토벤의 교향곡 9번 d단조(작품 125)는 1824년 빈에서 초연되었다.',
    source: 'Britannica, "Symphony No. 9 in D Minor, Op. 125" https://www.britannica.com/topic/Symphony-No-9-in-D-Minor'
  },
  {
    id: 'culture-08',
    category: '예술과 문화',
    question: '2003년 유네스코 「인류구전 및 무형유산 걸작」으로 선정된 한국의 공연 예술은?',
    choices: ['판소리', '종묘제례악', '강릉단오제', '강강술래'],
    answer: 0,
    explanation: '판소리는 2003년 11월 걸작에 뽑혔고 2008년 인류무형문화유산 대표목록이 되었다.',
    source: '국가유산청 국가유산포털 「판소리」 https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1279900050000 ; 유네스코한국위원회 https://unesco.or.kr/%EC%9C%A0%EB%84%A4%EC%8A%A4%EC%BD%94-%EC%83%81%EC%8B%9D-2/'
  },
  {
    id: 'culture-09',
    category: '예술과 문화',
    question: '2024년 노벨 문학상을 받은 한국 작가는?',
    choices: ['한강', '고은', '황석영', '박경리'],
    answer: 0,
    explanation: '한강은 "역사적 트라우마에 맞서는 강렬한 시적 산문"으로 2024년 노벨 문학상을 받았다.',
    source: 'NobelPrize.org, 2024 Literature press release https://www.nobelprize.org/prizes/literature/2024/press-release/'
  },
  {
    id: 'culture-10',
    category: '예술과 문화',
    question: '제왕을 기리는 유교 사당으로 1995년 유네스코 세계유산에 등재된 곳은?',
    choices: ['경복궁', '종묘', '창덕궁', '수원화성'],
    answer: 1,
    explanation: '종묘는 정전과 영녕전이 원형대로 보존되어 1995년 12월 세계유산이 되었다.',
    source: '국가유산청 국가유산포털 「종묘」 https://www.heritage.go.kr/heri/html/HtmlPage.do?pg=%2Funesco%2FHeritage%2FHeritage_03.jsp&pageNo=1_1_1_0 ; 한국민족문화대백과사전 https://encykorea.aks.ac.kr/Article/E0052928'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { QUESTIONS };
}
