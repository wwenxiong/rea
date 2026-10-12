

const sampleCourseware = {
  id: 'cw-ielts-life-2045',
  title: 'Life in 2045',
  subtitle: 'IELTS Academic Reading · Questions 1–13',
  paragraphs: [
    "The film, Back to the Future II, released in 1989, made a series of outlandish predictions about 2015, the year its key characters travel to from 1985. Although several of the film's predictions, like video calls and wearable technology, came true, Back to the Future II showed the pitfalls of making long-term forecasts. The world of 2015 was one of hoverboards, flying cars and power clothing, and instead we got Snapchat and selfies.",
    "Several experts have made their predictions about what the world of 2045 will look like. Alex Ayad, head of Imperial College London's Tech Foresight Practice forecasts that people will be able to purchase high-quality emotions online. Emotion-sharing experiences are the latest fad in 2045. Imagine your friend at a music festival can post a photo on Instagram and with it comes bundled a faint twinkling of what she was feeling right there in that moment, so you too can share emotionally in her social experience.",
    "Recently, techniques for direct brain stimulation, like optogenetics, have made it possible to not only read but also write information into single neurons. At the moment data transfer rates are still very slow, the best we can do is a few bits per second, but this could well increase to kilobits or maybe reach broadband speeds by 2045. This means the range of human perception could expand beyond its current design limitations.",
    "Our cities will be made from living, dynamic materials that respond to the environment. In 30 years, tall buildings made of glass and twisted steel will be seen as relics from a bygone era, in the same way we think now of 1970s concrete tower blocks: ugly, out-dated and unfit for contemporary purpose. The urban environment of 2045 blends architecture with living materials that are mouldable, adaptable, responsive and disposable.",
    "Entirely new synthetic life forms, or biological machines, made of engineered living cells from bacteria, fungi and algae will grow and evolve with the changing needs of a building's inhabitants. They breathe in pollutants, clean wastewater, and use sunlight to make useful chemicals, energy, heat and vibrant vertical gardens. We will start to see a convergence between biology and technology, to the point where there is no longer a perceptible difference between the two.",
    "Invisibility cloaks, according to Alex Ayad, will be used to 'disappear' ugly objects. Invisibility has forever been a tantalising prospect. The key to cloaking lies in the way the electromagnetic spectrum (including visible light) interacts with objects. The human eye picks up electromagnetic radiation that falls and scatters from objects and we perceive this as light. In recent decades, scientists figured out using mathematics that it might just be possible to imagine a new class of artificial materials made of intricate tiny features with light- (and sound-) bending properties. They named them metamaterials.",
    "And Tamar Kasriel, founder and MD of Futureai, a future-focused strategy consultancy, has forecast that we won't be able to tell the difference between VR hoverboards and real hoverboards. By 2045 quite a few of us might have a hoverboard, but it will be struggling to compete with the thrill of the virtual reality version. What we are likely to see is the breakdown of much of the current distinction between the real and the digital, and the artificial and the human.",
    "Driverless cars will just be ... cars. And for many driving will have become only a leisure pursuit, a kind of sport, and buildings will power themselves. Being optimistic, Marty and Doc won't find themselves in a smoggy apocalypse in 2045. Rather, a powerful mix of sense and/or fear will have continued the momentum behind increasing the efficiency and reducing the cost of alternative power sources. Solar panels will be built into lots of different building materials, so whole neighbourhoods can quietly and cleanly power themselves.",
    "Richard Watson, futurist, writer and founder of online magazine What's Next, predicts phones, cars or homes will be able to read people's feelings and adapt accordingly. Machines will be able to sense and then adapt themselves to the emotional state of an individual user. At the moment machines can work out where someone is, who someone is and perhaps what they are doing or 'like' but that's about it. The next stage will be for machines to intuit human feelings. This can be done by 'harvesting' facial expressions, body language, heart rate, voice and so on. If you are typing text into a computer the computer might consider the speed you are typing, decide you are stressed and conclude that this isn't the best time to allow you to read negative emails.",
    "If you are driving a car, the car might consider how you are driving and infer certain conclusions. If the car decides you are angry and in danger of driving unsafely, it might adapt itself to make things safer. On the other hand a shop might use this technology to work out when customers are more likely to buy things, including things they probably don't really want.",
    "Maybe the predictions above will be realised fully in the year 2045 or maybe life will turn out to be even more fantastical than we can now imagine.",
  ],
  summaryGroup: {
    idRange: '1–7',
    instruction:
      'Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
    paragraphGuide:
      '本题段落号对照: 第1、2题 → 段落 2 (Alex Ayad) | 第2题 → 段落 6 | 第3、4题 → 段落 7 (Tamar Kasriel) | 第5题 → 段落 8 | 第6、7题 → 段落 9 (Richard Watson)',
    paragraphs: [
      "Alex Ayad predicts that by 2045 [1] will be available for sale online. He also thinks that construction materials in cities will be 'alive' and react to their surroundings and that invisibility cloaks will be employed to hide [2].",
      "Tamar Kasriel forecasts that by 2045 it is probable people will not easily make a [3] between the real, human world and what is [4] or digital. He also thinks there will be driverless cars and buildings that [5]. Among Richard Watson' s forecasts are that people' s belongings will have the ability to read their [6], and then adapt to an individual' s [7].",
    ],
    items: [
      {
        id: 1,
        answer: 'high-quality emotions (emotions 亦可)',
        evidenceText: 'people will be able to purchase high-quality emotions online.',
        explanation:
          '题干 be available for sale online (在线有售) ↔ 原文 purchase ... online (可在购买)；能在线买到的是 high-quality emotions。注意 high-quality 为连字符复合词，计一个词。',
        evidenceRanges: [
          {
            paragraphIndex: 1,
            startOffset: 156,
            endOffset: 217,
          },
        ],
      },
      {
        id: 2,
        answer: 'ugly objects',
        evidenceText: "Invisibility cloaks, according to Alex Ayad, will be used to 'disappear' ugly objects.",
        explanation:
          "题干 invisibility cloaks will be employed to hide ... 对应原文 Invisibility cloaks ... will be used to 'disappear' ugly objects，其中 hide 替换 'disappear'，故所填词为 ugly objects。",
        evidenceRanges: [
          {
            paragraphIndex: 5,
            startOffset: 0,
            endOffset: 87,
          },
        ],
      },
      {
        id: 3,
        answer: 'distinction',
        evidenceText:
          'What we are likely to see is the breakdown of much of the current distinction between the real and the digital, and the artificial and the human.',
        explanation:
          '题干 not easily make a distinction between ... 对应原文 breakdown of much of the current distinction between the real and the digital...，故填 distinction。',
        evidenceRanges: [
          {
            paragraphIndex: 6,
            startOffset: 236,
            endOffset: 382,
          },
        ],
      },
      {
        id: 4,
        answer: 'digital (或 artificial)',
        evidenceText:
          'What we are likely to see is the breakdown of much of the current distinction between the real and the digital, and the artificial and the human.',
        explanation:
          '题干 what is [4] or ... 对应原文 between the real and the digital, and the artificial and the human，故填 digital 或 artificial。',
        evidenceRanges: [
          {
            paragraphIndex: 6,
            startOffset: 323,
            endOffset: 382,
          },
        ],
      },
      {
        id: 5,
        answer: 'power themselves',
        evidenceText: 'and buildings will power themselves.',
        explanation:
          '题干 buildings that [5] 对应原文 and buildings will power themselves，故填 power themselves。',
        evidenceRanges: [
          {
            paragraphIndex: 7,
            startOffset: 104,
            endOffset: 140,
          },
        ],
      },
      {
        id: 6,
        answer: 'feelings (或 feelings and thoughts)',
        evidenceText:
          "predicts phones, cars or homes will be able to read people's feelings and adapt accordingly.",
        explanation:
          "题干 belongings will have the ability to read their [6] 对应原文 phones, cars or homes will be able to read people's feelings，故填 feelings。",
        evidenceRanges: [
          {
            paragraphIndex: 8,
            startOffset: 89,
            endOffset: 182,
          },
        ],
      },
      {
        id: 7,
        answer: 'emotional state',
        evidenceText:
          'Machines will be able to sense and then adapt themselves to the emotional state of an individual user.',
        explanation:
          '题干 and then adapt to an individual\'s [7] 对应原文 adapt themselves to the emotional state of an individual user，故填 emotional state。',
        evidenceRanges: [
          {
            paragraphIndex: 8,
            startOffset: 183,
            endOffset: 286,
          },
        ],
      },
    ],
  },
  questions: [
    {
      id: 8,
      type: 'single',
      stem: 'The film Back to the Future II forecasts for 2015',
      options: [
        'A were not completely wrong.',
        'B were not all related to technology.',
        'C did not turn out to be true.',
        'D led to several important inventions.',
      ],
      answer: 'A',
      explanation:
        "第一段第二句指出虽然有许多未实现，但视频通话和可穿戴技术确实成真了，因此并不是完全错误（were not completely wrong）。",
      evidenceText:
        "Although several of the film's predictions, like video calls and wearable technology, came true, Back to the Future II showed the pitfalls of making long-term forecasts.",
      evidenceRanges: [
        {
          paragraphIndex: 0,
          startOffset: 137,
          endOffset: 307,
        },
      ],
    },
    {
      id: 9,
      type: 'single',
      stem: 'By 2045, certain brain stimulation techniques',
      options: [
        'A are unlikely to affect human perception.',
        'B will have no impact on the way humans perceive.',
        'C could alter human perception.',
        'D will reach the limits of the human perception.',
      ],
      answer: 'C',
      explanation:
        '第三段末句明确说明，这意味着人类感知的范围可能会扩展超越当下的局限，即可能改变人类感知能力。',
      evidenceText:
        'This means the range of human perception could expand beyond its current design limitations.',
      evidenceRanges: [
        {
          paragraphIndex: 2,
          startOffset: 280,
          endOffset: 372,
        },
      ],
    },
    {
      id: 10,
      type: 'single',
      stem: 'According to Alex Ayad, in 2045 cities will have',
      options: [
        'A tower blocks with a special type of steel and glass.',
        'B structures that are built with reusable materials.',
        'C more attractive buildings than in the past.',
        'D buildings that are partially alive.',
      ],
      answer: 'D',
      explanation:
        '第四段指出建筑将与活体生命材料融合（blends architecture with living materials），即建筑物具备生命活性。',
      evidenceText:
        'The urban environment of 2045 blends architecture with living materials that are mouldable, adaptable, responsive and disposable.',
      evidenceRanges: [
        {
          paragraphIndex: 3,
          startOffset: 254,
          endOffset: 384,
        },
      ],
    },
    {
      id: 11,
      type: 'single',
      stem: 'New man-made life forms will',
      options: [
        'A help architects create stunning buildings.',
        'B respond to the requirements of the people living in them.',
        'C help buildings to remove all pollutants from the environment.',
        'D allow buildings to monitor people.',
      ],
      answer: 'B',
      explanation:
        '第五段首句明确指出合成生物机体将随住户的需求变化而生长演进（grow and evolve with the changing needs of a building\'s inhabitants），对应选项 B。',
      evidenceText:
        "Entirely new synthetic life forms, or biological machines, made of engineered living cells from bacteria, fungi and algae will grow and evolve with the changing needs of a building's inhabitants.",
      evidenceRanges: [
        {
          paragraphIndex: 4,
          startOffset: 0,
          endOffset: 198,
        },
      ],
    },
    {
      id: 12,
      type: 'short-answer',
      stem: 'What will have become less expensive by 2045?',
      options: [],
      answer: 'alternative power sources',
      explanation:
        '第八段倒数第二句明确提到降低替代能源（alternative power sources）的成本。',
      evidenceText:
        'Rather, a powerful mix of sense and/or fear will have continued the momentum behind increasing the efficiency and reducing the cost of alternative power sources.',
      evidenceRanges: [
        {
          paragraphIndex: 7,
          startOffset: 219,
          endOffset: 380,
        },
      ],
    },
    {
      id: 13,
      type: 'short-answer',
      stem: 'What might computers of the future prevent people from seeing?',
      options: [],
      answer: 'negative emails',
      explanation:
        '第九段末句指出电脑在判断用户焦虑处于重压状态时，会阻止用户查阅负面消极邮件（negative emails）。',
      evidenceText:
        "decide you are stressed and conclude that this isn't the best time to allow you to read negative emails.",
      evidenceRanges: [
        {
          paragraphIndex: 8,
          startOffset: 531,
          endOffset: 636,
        },
      ],
    },
  ],
  createdAt: 1728470400000,
  updatedAt: 1728470400000,
};

const sampleClozeCourseware = {
  id: 'cw-cloze-xrays',
  title: 'The Discovery of X-rays',
  subtitle: 'Cloze Test · 完形填空精读 (10 题)',
  coursewareType: 'cloze',
  paragraphs: [
    "The first X-ray photograph was ____1____ by a German scientist, Wilhelm Conrad Roentgen, in 1895. It is his wife's ____2____. The bones in her hand (and also her ring) are clearly seen in the photo.",
    "Roentgen discovered X-rays ____3____ when he was working with electricity. Soon after, he ____4____ the first X-ray machine. The machine made hospital operations (手术) much ____5____. For the first time, doctors could see inside people's bodies ____6____ they cut them open! In 1901, Roentgen won the very first Nobel Prize in Physics (诺贝尔物理学奖). His invention is still used today by doctors and ____7____, and is called \"the window into the human body\".",
    "Since the introduction of computer imaging (成像) in the 1970s, X-ray machines have been used ____8____ other things too. At airports, many criminals are caught with illegal (违法的) things in ____9____ luggage. Also, lots of works of art are discovered under other paintings. In factories, many ____10____ in new products are found every day, using X-rays. There is no doubt that new uses for X-rays will be developed in the future.",
  ],
  questions: [
    {
      id: 1,
      stem: '第 1 题',
      options: ['A. used', 'B. broke', 'C. built', 'D. bought'],
      answer: 'C',
      explanation: '此处指拍摄/制造了第一张 X 射线照片。根据下文建造机器制造设备及语境，此处选择 built (拍摄制造)。',
      evidenceText: 'The first X-ray photograph was ____1____ by a German scientist, Wilhelm Conrad Roentgen, in 1895.',
      evidenceRanges: [{ paragraphIndex: 0, startOffset: 0, endOffset: 95 }],
      type: 'cloze',
    },
    {
      id: 2,
      stem: '第 2 题',
      options: ['A. hand', 'B. arm', 'C. face', 'D. ring'],
      answer: 'A',
      explanation: '由后句“The bones in her hand (and also her ring) are clearly seen”可知，照片拍摄的是他妻子的手（hand）。',
      evidenceText: "It is his wife's ____2____. The bones in her hand (and also her ring) are clearly seen in the photo.",
      evidenceRanges: [{ paragraphIndex: 0, startOffset: 96, endOffset: 204 }],
      type: 'cloze',
    },
    {
      id: 3,
      stem: '第 3 题',
      options: ['A. by chance', 'B. on purpose', 'C. in fact', 'D. at first'],
      answer: 'A',
      explanation: 'by chance 意为“偶然，意外地”。科学史上伦琴是在研究电学时偶然发现了 X 射线。',
      evidenceText: 'Roentgen discovered X-rays ____3____ when he was working with electricity.',
      evidenceRanges: [{ paragraphIndex: 1, startOffset: 0, endOffset: 74 }],
      type: 'cloze',
    },
    {
      id: 4,
      stem: '第 4 题',
      options: ['A. found', 'B. built', 'C. bought', 'D. sold'],
      answer: 'B',
      explanation: 'Soon after, he built the first X-ray machine. 意为“不久之后，他制造了第一台 X 光机”。',
      evidenceText: 'Soon after, he ____4____ the first X-ray machine.',
      evidenceRanges: [{ paragraphIndex: 1, startOffset: 75, endOffset: 125 }],
      type: 'cloze',
    },
    {
      id: 5,
      stem: '第 5 题',
      options: ['A. safer', 'B. more dangerous', 'C. cheaper', 'D. more expensive'],
      answer: 'A',
      explanation: 'X 光透视能够让医生提前看清体内情况，从而使医院手术更加安全（safer）。',
      evidenceText: 'The machine made hospital operations (手术) much ____5____.',
      evidenceRanges: [{ paragraphIndex: 1, startOffset: 126, endOffset: 184 }],
      type: 'cloze',
    },
    {
      id: 6,
      stem: '第 6 题',
      options: ['A. since', 'B. when', 'C. before', 'D. after'],
      answer: 'C',
      explanation: 'before they cut them open 意为“在医生切开患者身体之前”，医生就能看到体内的骨骼结构。',
      evidenceText: "For the first time, doctors could see inside people's bodies ____6____ they cut them open!",
      evidenceRanges: [{ paragraphIndex: 1, startOffset: 185, endOffset: 279 }],
      type: 'cloze',
    },
    {
      id: 7,
      stem: '第 7 题',
      options: ['A. tourists', 'B. engineers', 'C. dentists', 'D. teachers'],
      answer: 'C',
      explanation: '除了内外科医生，牙医（dentists）经常使用 X 光片检查牙齿与牙床结构。',
      evidenceText: 'His invention is still used today by doctors and ____7____, and is called "the window into the human body".',
      evidenceRanges: [{ paragraphIndex: 1, startOffset: 349, endOffset: 457 }],
      type: 'cloze',
    },
    {
      id: 8,
      stem: '第 8 题',
      options: ['A. for', 'B. to', 'C. with', 'D. from'],
      answer: 'A',
      explanation: 'be used for + 名词，固定短语，表示“被用于某种用途/目的”。',
      evidenceText: 'Since the introduction of computer imaging (成像) in the 1970s, X-ray machines have been used ____8____ other things too.',
      evidenceRanges: [{ paragraphIndex: 2, startOffset: 0, endOffset: 123 }],
      type: 'cloze',
    },
    {
      id: 9,
      stem: '第 9 题',
      options: ['A. his', 'B. her', 'C. their', 'D. our'],
      answer: 'C',
      explanation: '前面修饰的主语是复数名词 criminals（罪犯），因此用复数物主代词 their（他们的行李）。',
      evidenceText: 'At airports, many criminals are caught with illegal (违法的) things in ____9____ luggage.',
      evidenceRanges: [{ paragraphIndex: 2, startOffset: 124, endOffset: 211 }],
      type: 'cloze',
    },
    {
      id: 10,
      stem: '第 10 题',
      options: ['A. faults', 'B. prizes', 'C. clothes', 'D. paintings'],
      answer: 'A',
      explanation: '工业探伤中，X 光用于检测新工业产品内部的暗伤或缺陷（faults）。',
      evidenceText: 'In factories, many ____10____ in new products are found every day, using X-rays.',
      evidenceRanges: [{ paragraphIndex: 2, startOffset: 278, endOffset: 358 }],
      type: 'cloze',
    },
  ],
  createdAt: 1728500000000,
  updatedAt: 1728500000000,
};

const sampleWordBankCourseware = {
  id: 'cw-summary-wordbank',
  title: 'Future Technologies & Innovation',
  subtitle: 'IELTS Academic Reading · Summary with Word Bank (选词填空)',
  coursewareType: 'reading',
  paragraphs: [
    "Several experts have made their predictions about what the world of 2045 will look like. Alex Ayad forecasts that people will be able to purchase high-quality emotions online. Emotion-sharing experiences are the latest fad in 2045. Imagine your friend at a music festival can post a photo on Instagram and with it comes bundled a faint twinkling of what she was feeling right there in that moment.",
    "Our cities will be made from living, dynamic materials that respond to the environment. In 30 years, tall buildings made of glass and twisted steel will be seen as relics from a bygone era. The urban environment of 2045 blends architecture with living materials that are mouldable, adaptable, responsive and disposable.",
    "And Tamar Kasriel has forecast that we won't be able to tell the difference between VR hoverboards and real hoverboards. What we are likely to see is the breakdown of much of the current distinction between the real and the digital, and the artificial and the human.",
    "Richard Watson predicts phones, cars or homes will be able to read people's feelings and adapt accordingly. Although several predictions came true, long-term forecasts still carry an inevitable disadvantage and unpredictability.",
  ],
  summaryGroup: {
    idRange: '1–5',
    title: 'Technological Impacts on Human Perception',
    instruction: 'Complete the summary using the list of words, A–H, below.',
    paragraphGuide: '备选词表: A disadvantage | B quality | C retirement | D distinction | E artificial | F perception | G adaptable | H emotions',
    paragraphs: [
      "Experts predict that technological breakthroughs will transform how humans interact. By 2045, smart devices will be able to interpret human [1] and adapt accordingly. Researchers also point out the growing difficulty in making a [2] between the biological and the [3] world. Moreover, living materials in modern architecture are expected to be highly [4] to environmental changes. However, long-term predictions still suffer from an inevitable [5] regarding accuracy.",
    ],
    items: [
      {
        id: 1,
        answer: 'H',
        evidenceText: "Richard Watson predicts phones, cars or homes will be able to read people's feelings and adapt accordingly.",
        explanation: "原文 read people's feelings 对应题干 interpret human [1]，考查同义替换 feelings ↔ emotions，对应备选词 H。",
        evidenceRanges: [{ paragraphIndex: 3, startOffset: 0, endOffset: 96 }],
      },
      {
        id: 2,
        answer: 'D',
        evidenceText: "What we are likely to see is the breakdown of much of the current distinction between the real and the digital, and the artificial and the human.",
        explanation: "原文 breakdown of much of the current distinction 对应题干 difficulty in making a [2]，故选填 distinction (差别/区别)，对应备选词 D。",
        evidenceRanges: [{ paragraphIndex: 2, startOffset: 77, endOffset: 223 }],
      },
      {
        id: 3,
        answer: 'E',
        evidenceText: "and the artificial and the human.",
        explanation: "原文 the artificial and the human 对应题干 biological and the [3] world，考查 artificial (人造的)，对应备选词 E。",
        evidenceRanges: [{ paragraphIndex: 2, startOffset: 188, endOffset: 223 }],
      },
      {
        id: 4,
        answer: 'G',
        evidenceText: "The urban environment of 2045 blends architecture with living materials that are mouldable, adaptable, responsive and disposable.",
        explanation: "原文 living materials that are mouldable, adaptable 对应题干 highly [4] to environmental changes，故选填 adaptable (具适应性的)，对应备选词 G。",
        evidenceRanges: [{ paragraphIndex: 1, startOffset: 173, endOffset: 304 }],
      },
      {
        id: 5,
        answer: 'A',
        evidenceText: "Although several predictions came true, long-term forecasts still carry an inevitable disadvantage and unpredictability.",
        explanation: "原文 carry an inevitable disadvantage 对应题干 suffer from an inevitable [5]，故选填 disadvantage (劣势/缺陷)，对应备选词 A。",
        evidenceRanges: [{ paragraphIndex: 3, startOffset: 97, endOffset: 218 }],
      },
    ],
  },
  questions: [
    {
      id: 6,
      stem: 'What is the attitude of researchers towards living materials in architecture?',
      options: ['A. Skeptical', 'B. Optimistic', 'C. Indifferent', 'D. Critical'],
      answer: 'B',
      explanation: '第二段表明研究者认为动态生活材料将取代传统钢筋玻璃，呈现出非常积极乐观（Optimistic）的展望。',
      evidenceText: 'The urban environment of 2045 blends architecture with living materials that are mouldable, adaptable, responsive and disposable.',
      evidenceRanges: [{ paragraphIndex: 1, startOffset: 173, endOffset: 304 }],
      type: 'single',
    },
  ],
  createdAt: 1728510000000,
  updatedAt: 1728510000000,
};


module.exports = { sampleCourseware, sampleClozeCourseware, sampleWordBankCourseware };