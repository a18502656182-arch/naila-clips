"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { THEME } from "../components/home/theme";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";
const remote = (p) => (API_BASE ? `${API_BASE}${p}` : p);

function makeAuthFetch(token) {
  return function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const t =
      token ||
      (() => {
        try {
          return localStorage.getItem("sb_access_token");
        } catch {
          return null;
        }
      })();
    if (t) headers["Authorization"] = `Bearer ${t}`;
    return fetch(url, { ...options, headers, credentials: "include" });
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function shuffle(arr) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOne(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[(Math.random() * arr.length) | 0];
}

function normalizeSentence(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[""'']/g, "'")
    .replace(/[^a-z0-9'\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

const BUILTIN_VOCAB = [
  // ════════════════════════════════════════════════════════
  // 高中水平（50个）— 高频实用，句子贴近日常与校园生活
  // ════════════════════════════════════════════════════════
  { id:"h01", term:"accomplish",    kind:"words", data:{ zh:"完成；实现",          example_en:"She worked hard and accomplished all her goals for the semester.",           example_zh:"她努力学习，完成了这学期所有目标。" } },
  { id:"h02", term:"anxious",       kind:"words", data:{ zh:"焦虑的；渴望的",      example_en:"He felt anxious before every important exam.",                             example_zh:"每次重要考试前他都感到焦虑。" } },
  { id:"h03", term:"assume",        kind:"words", data:{ zh:"假设；以为",          example_en:"Don't assume someone is fine just because they smile.",                    example_zh:"不要因为别人在微笑就以为他没事。" } },
  { id:"h04", term:"aware",         kind:"words", data:{ zh:"意识到的；知道的",    example_en:"Are you aware of how much time you spend on your phone each day?",        example_zh:"你知道自己每天花多少时间看手机吗？" } },
  { id:"h05", term:"benefit",       kind:"words", data:{ zh:"益处；使受益",        example_en:"Regular exercise brings enormous benefits to both body and mind.",        example_zh:"定期锻炼对身心都有极大的益处。" } },
  { id:"h06", term:"challenge",     kind:"words", data:{ zh:"挑战；质疑",          example_en:"Every challenge you face is a chance to grow stronger.",                  example_zh:"你面对的每一个挑战都是变得更强大的机会。" } },
  { id:"h07", term:"compete",       kind:"words", data:{ zh:"竞争；比赛",          example_en:"Students compete fiercely to get into top universities.",                  example_zh:"学生们为进入顶尖大学而激烈竞争。" } },
  { id:"h08", term:"concentrate",   kind:"words", data:{ zh:"集中注意力；专注",    example_en:"It is hard to concentrate when there is too much noise around you.",      example_zh:"周围噪音太多时很难集中注意力。" } },
  { id:"h09", term:"courage",       kind:"words", data:{ zh:"勇气；胆量",          example_en:"It takes real courage to admit when you are wrong.",                      example_zh:"承认自己错了需要真正的勇气。" } },
  { id:"h10", term:"curious",       kind:"words", data:{ zh:"好奇的",              example_en:"Curious students tend to learn far more than passive ones.",              example_zh:"好奇心强的学生往往比被动的学生学到更多。" } },
  { id:"h11", term:"debate",        kind:"words", data:{ zh:"辩论；讨论",          example_en:"The class held a lively debate about the use of social media.",           example_zh:"课堂上就社交媒体的使用展开了热烈的辩论。" } },
  { id:"h12", term:"determine",     kind:"words", data:{ zh:"决定；确定",          example_en:"Your mindset largely determines how far you will go in life.",           example_zh:"你的思维方式在很大程度上决定了你人生能走多远。" } },
  { id:"h13", term:"discipline",    kind:"words", data:{ zh:"纪律；自律",          example_en:"Self-discipline is the foundation of any long-term achievement.",        example_zh:"自律是任何长期成就的基础。" } },
  { id:"h14", term:"efficient",     kind:"words", data:{ zh:"高效的；有效率的",    example_en:"An efficient study method saves time and improves results.",             example_zh:"高效的学习方法既节省时间又能提高成绩。" } },
  { id:"h15", term:"embarrass",     kind:"words", data:{ zh:"使尴尬；使难堪",      example_en:"She was embarrassed when she mispronounced the word in front of everyone.", example_zh:"当着所有人的面念错单词时她感到非常尴尬。" } },
  { id:"h16", term:"encourage",     kind:"words", data:{ zh:"鼓励；激励",          example_en:"A good teacher encourages students to think for themselves.",            example_zh:"好老师鼓励学生独立思考。" } },
  { id:"h17", term:"estimate",      kind:"words", data:{ zh:"估计；估算",          example_en:"Can you estimate how long it will take to finish the assignment?",       example_zh:"你能估计一下完成这份作业需要多长时间吗？" } },
  { id:"h18", term:"expand",        kind:"words", data:{ zh:"扩大；扩展",          example_en:"Reading is the best way to expand your vocabulary and knowledge.",       example_zh:"阅读是扩大词汇量和增长知识的最好方式。" } },
  { id:"h19", term:"failure",       kind:"words", data:{ zh:"失败；失误",          example_en:"Every failure carries a lesson if you are willing to look for it.",      example_zh:"每一次失败都包含一个教训，只要你愿意去寻找。" } },
  { id:"h20", term:"grateful",      kind:"words", data:{ zh:"感激的；感谢的",      example_en:"She was deeply grateful for the support her friends had given her.",     example_zh:"她对朋友们给予的支持深感感激。" } },
  { id:"h21", term:"ignore",        kind:"words", data:{ zh:"忽视；不理会",        example_en:"It is unhealthy to ignore problems and hope they go away on their own.", example_zh:"忽视问题、期望它们自行消失是不健康的做法。" } },
  { id:"h22", term:"independent",   kind:"words", data:{ zh:"独立的；自主的",      example_en:"Going to college is the first step toward becoming truly independent.", example_zh:"上大学是走向真正独立的第一步。" } },
  { id:"h23", term:"inspire",       kind:"words", data:{ zh:"激励；启发",          example_en:"A single inspiring teacher can change the course of a student's life.", example_zh:"一位鼓舞人心的老师可以改变学生人生的轨迹。" } },
  { id:"h24", term:"jealous",       kind:"words", data:{ zh:"嫉妒的；羡慕的",      example_en:"Being jealous of others stops you from focusing on your own progress.", example_zh:"嫉妒别人会让你无法专注于自己的进步。" } },
  { id:"h25", term:"manage",        kind:"words", data:{ zh:"管理；设法做到",      example_en:"How do you manage to stay calm under so much pressure?",               example_zh:"你是如何在这么大的压力下保持冷静的？" } },
  { id:"h26", term:"mature",        kind:"words", data:{ zh:"成熟的；使成熟",      example_en:"Dealing with hardship forces you to mature faster than you expect.",    example_zh:"经历艰辛会让你比预期更快地成熟起来。" } },
  { id:"h27", term:"opportunity",   kind:"words", data:{ zh:"机会；时机",          example_en:"Never waste an opportunity to learn something new.",                     example_zh:"永远不要浪费任何一个学习新事物的机会。" } },
  { id:"h28", term:"patient",       kind:"words", data:{ zh:"有耐心的",            example_en:"Learning a new language requires you to be extremely patient with yourself.", example_zh:"学习一门新语言需要对自己极有耐心。" } },
  { id:"h29", term:"persuade",      kind:"words", data:{ zh:"说服；劝说",          example_en:"It took him weeks to persuade his family to support his decision.",     example_zh:"他花了好几周才说服家人支持他的决定。" } },
  { id:"h30", term:"potential",     kind:"words", data:{ zh:"潜力；潜在的",        example_en:"Every student has the potential to excel if given the right support.",  example_zh:"每个学生只要得到适当的支持都有出类拔萃的潜力。" } },
  { id:"h31", term:"pressure",      kind:"words", data:{ zh:"压力；施压",          example_en:"Too much pressure can damage a student's love of learning.",            example_zh:"过大的压力会损害学生对学习的热情。" } },
  { id:"h32", term:"prevent",       kind:"words", data:{ zh:"预防；阻止",          example_en:"Washing your hands regularly can prevent the spread of many illnesses.", example_zh:"经常洗手可以预防许多疾病的传播。" } },
  { id:"h33", term:"reflect",       kind:"words", data:{ zh:"反思；反映",          example_en:"Take time each week to reflect on what you have learned.",              example_zh:"每周花时间反思一下自己学到了什么。" } },
  { id:"h34", term:"responsible",   kind:"words", data:{ zh:"负责任的",            example_en:"Being responsible means owning your mistakes and fixing them.",        example_zh:"负责任意味着承认错误并加以改正。" } },
  { id:"h35", term:"sacrifice",     kind:"words", data:{ zh:"牺牲；放弃",          example_en:"Success often requires sacrifice, especially in the early stages.",     example_zh:"成功往往需要牺牲，尤其是在初期阶段。" } },
  { id:"h36", term:"sincere",       kind:"words", data:{ zh:"真诚的；诚挚的",      example_en:"A sincere apology can repair even seriously damaged relationships.",    example_zh:"一句真诚的道歉可以修复即使严重受损的关系。" } },
  { id:"h37", term:"struggle",      kind:"words", data:{ zh:"挣扎；努力",          example_en:"Many great achievers struggled for years before finally succeeding.",   example_zh:"许多伟大的成功者在成功之前都挣扎了多年。" } },
  { id:"h38", term:"sufficient",    kind:"words", data:{ zh:"足够的",              example_en:"Eight hours of sleep is usually sufficient for most healthy adults.",   example_zh:"对大多数健康成年人来说八小时睡眠通常已经足够。" } },
  { id:"h39", term:"tolerate",      kind:"words", data:{ zh:"忍受；容忍",          example_en:"She could no longer tolerate being treated unfairly at work.",          example_zh:"她再也无法忍受在工作中受到不公平对待。" } },
  { id:"h40", term:"trust",         kind:"words", data:{ zh:"信任；相信",          example_en:"Trust is built slowly through actions, not just words.",               example_zh:"信任是通过行动慢慢建立起来的，而不仅仅靠语言。" } },
  { id:"h41", term:"unique",        kind:"words", data:{ zh:"独特的；唯一的",      example_en:"Everyone has a unique perspective shaped by their own life experience.", example_zh:"每个人都有由自身经历塑造的独特视角。" } },
  { id:"h42", term:"valuable",      kind:"words", data:{ zh:"有价值的；宝贵的",    example_en:"Time is your most valuable resource — spend it wisely.",               example_zh:"时间是你最宝贵的资源，要明智地使用它。" } },
  { id:"h43", term:"vision",        kind:"words", data:{ zh:"愿景；视野",          example_en:"Leaders with a clear vision are able to inspire others to follow them.", example_zh:"拥有清晰愿景的领导者能够激励他人追随。" } },
  { id:"h44", term:"volunteer",     kind:"words", data:{ zh:"志愿者；自愿",        example_en:"Volunteering in your community builds both skills and character.",      example_zh:"在社区做志愿者既能培养技能又能塑造品格。" } },
  { id:"h45", term:"ambitious",     kind:"words", data:{ zh:"有雄心的；有抱负的",  example_en:"He set an ambitious goal to finish the project in just one month.",     example_zh:"他设定了一个雄心勃勃的目标——在一个月内完成项目。" } },
  { id:"h46", term:"determine",     kind:"words", data:{ zh:"决心；下定决心",      example_en:"She was determined to pass the exam no matter how hard it was.",       example_zh:"不管多难她都下定决心要通过这次考试。" } },
  { id:"h47", term:"genuine",       kind:"words", data:{ zh:"真诚的；真实的",      example_en:"Her concern for the team's well-being was completely genuine.",        example_zh:"她对团队福祉的关心是完全出于真心的。" } },
  { id:"h48", term:"hesitate",      kind:"words", data:{ zh:"犹豫；迟疑",          example_en:"Do not hesitate to ask for help when you feel overwhelmed.",           example_zh:"当你感到不知所措时，不要犹豫，及时寻求帮助。" } },
  { id:"h49", term:"optimistic",    kind:"words", data:{ zh:"乐观的",              example_en:"Despite the setbacks, the team remained optimistic about the outcome.",  example_zh:"尽管遭遇挫折，团队对结果仍然保持乐观。" } },
  { id:"h50", term:"realistic",     kind:"words", data:{ zh:"现实的；实际的",      example_en:"It is important to set realistic goals that you can actually achieve.",  example_zh:"设定你实际上能够实现的现实目标是很重要的。" } },

  // ════════════════════════════════════════════════════════
  // 大学水平（100个）— 学术与职场常用，有一定词汇深度
  // ════════════════════════════════════════════════════════
  { id:"u01", term:"abstract",      kind:"words", data:{ zh:"抽象的；摘要",        example_en:"The concept was too abstract for the students to grasp immediately.",   example_zh:"这个概念太抽象，学生们一时难以理解。" } },
  { id:"u02", term:"acknowledge",   kind:"words", data:{ zh:"承认；致谢",          example_en:"She acknowledged that she had made a serious mistake.",                example_zh:"她承认自己犯了一个严重的错误。" } },
  { id:"u03", term:"advocate",      kind:"words", data:{ zh:"倡导；支持者",        example_en:"She is a strong advocate for environmental protection.",                example_zh:"她是环境保护的坚定倡导者。" } },
  { id:"u04", term:"ambiguous",     kind:"words", data:{ zh:"模棱两可的",          example_en:"The instructions were so ambiguous that nobody knew what to do.",       example_zh:"说明书太含糊，没有人知道该怎么做。" } },
  { id:"u05", term:"analyze",       kind:"words", data:{ zh:"分析",               example_en:"We need to carefully analyze the data before drawing any conclusions.", example_zh:"在得出结论前需要仔细分析数据。" } },
  { id:"u06", term:"anticipate",    kind:"words", data:{ zh:"预期；期待",          example_en:"Economists anticipate a slow recovery in the housing market.",          example_zh:"经济学家预期房地产市场将缓慢复苏。" } },
  { id:"u07", term:"assumption",    kind:"words", data:{ zh:"假设；设想",          example_en:"His entire argument was built on a false assumption.",                  example_zh:"他的整个论点建立在一个错误的假设之上。" } },
  { id:"u08", term:"authority",     kind:"words", data:{ zh:"权威；当局",          example_en:"The professor spoke with authority on the subject of climate change.",  example_zh:"这位教授在气候变化课题上发言颇具权威。" } },
  { id:"u09", term:"cognitive",     kind:"words", data:{ zh:"认知的",              example_en:"Regular exercise has been shown to improve cognitive function.",        example_zh:"定期锻炼已被证明能够改善认知功能。" } },
  { id:"u10", term:"compelling",    kind:"words", data:{ zh:"令人信服的",          example_en:"She gave a compelling speech that moved the entire audience to tears.", example_zh:"她发表了一篇令人信服的演讲感动了所有听众。" } },
  { id:"u11", term:"concept",       kind:"words", data:{ zh:"概念；观念",          example_en:"The concept of democracy has evolved significantly over centuries.",    example_zh:"民主的概念在几个世纪里发生了重大演变。" } },
  { id:"u12", term:"conscious",     kind:"words", data:{ zh:"有意识的；清醒的",    example_en:"She made a conscious effort to speak more slowly and clearly.",        example_zh:"她有意识地努力把话说得更慢更清晰。" } },
  { id:"u13", term:"consequence",   kind:"words", data:{ zh:"后果；结果",          example_en:"You must accept the consequences of your own decisions.",              example_zh:"你必须接受自己决定所带来的后果。" } },
  { id:"u14", term:"consistent",    kind:"words", data:{ zh:"一致的；持续的",      example_en:"Consistent effort over time is the key to achieving any long-term goal.", example_zh:"持续的努力是实现长期目标的关键。" } },
  { id:"u15", term:"contribute",    kind:"words", data:{ zh:"贡献；促成",          example_en:"Every team member contributed their unique skills to the project.",    example_zh:"每位成员都为项目贡献了各自独特的技能。" } },
  { id:"u16", term:"controversy",   kind:"words", data:{ zh:"争议；论战",          example_en:"The new policy sparked a great deal of controversy among citizens.",   example_zh:"新政策在市民中引发了极大的争议。" } },
  { id:"u17", term:"credible",      kind:"words", data:{ zh:"可信的；可靠的",      example_en:"You need to cite credible sources in any academic paper.",             example_zh:"学术论文中需要引用可靠的来源。" } },
  { id:"u18", term:"criteria",      kind:"words", data:{ zh:"标准；准则",          example_en:"The selection criteria for the scholarship were extremely strict.",    example_zh:"奖学金的评选标准极为严格。" } },
  { id:"u19", term:"crucial",       kind:"words", data:{ zh:"至关重要的",          example_en:"It is crucial to back up your data regularly to avoid losing it.",    example_zh:"定期备份数据以防丢失是至关重要的。" } },
  { id:"u20", term:"dedicate",      kind:"words", data:{ zh:"致力于；奉献",        example_en:"She dedicated fifteen years of her life to researching this disease.", example_zh:"她把十五年的人生献给了对这种疾病的研究。" } },
  { id:"u21", term:"deliberate",    kind:"words", data:{ zh:"故意的；深思熟虑的",  example_en:"His choice of words was deliberate and carefully calculated.",         example_zh:"他的措辞是刻意为之经过精心计算的。" } },
  { id:"u22", term:"demonstrate",   kind:"words", data:{ zh:"证明；示范",          example_en:"The experiment clearly demonstrates how gravity affects falling objects.", example_zh:"这个实验清楚地证明了重力如何影响下落物体。" } },
  { id:"u23", term:"diminish",      kind:"words", data:{ zh:"减少；降低",          example_en:"Lack of sleep can significantly diminish your ability to concentrate.", example_zh:"睡眠不足会显著降低你的注意力集中能力。" } },
  { id:"u24", term:"diverse",       kind:"words", data:{ zh:"多样的",              example_en:"The city has a diverse population with people from over sixty countries.", example_zh:"这座城市拥有来自六十多个国家的多元人口。" } },
  { id:"u25", term:"dominate",      kind:"words", data:{ zh:"主导；支配",          example_en:"A few large corporations currently dominate the global technology market.", example_zh:"目前少数几家大型企业主导着全球科技市场。" } },
  { id:"u26", term:"eliminate",     kind:"words", data:{ zh:"消除；淘汰",          example_en:"The new vaccine could eliminate this disease within the next decade.", example_zh:"这种新疫苗有望在未来十年内消灭这种疾病。" } },
  { id:"u27", term:"emphasize",     kind:"words", data:{ zh:"强调",               example_en:"The report emphasizes the urgent need for sustainable energy solutions.", example_zh:"报告强调了对可持续能源解决方案的迫切需求。" } },
  { id:"u28", term:"enhance",       kind:"words", data:{ zh:"提升；增强",          example_en:"Regular reading can greatly enhance your vocabulary and writing skills.", example_zh:"经常阅读能极大地提升你的词汇量和写作能力。" } },
  { id:"u29", term:"ethical",       kind:"words", data:{ zh:"道德的；伦理的",      example_en:"Scientists must consider the ethical implications of their research.",  example_zh:"科学家必须考虑其研究的伦理影响。" } },
  { id:"u30", term:"evaluate",      kind:"words", data:{ zh:"评估；评价",          example_en:"The teacher asked students to evaluate each other's presentations.",   example_zh:"老师要求学生互相评价各自的演讲。" } },
  { id:"u31", term:"expertise",     kind:"words", data:{ zh:"专业知识；专长",      example_en:"We need someone with expertise in both finance and technology.",       example_zh:"我们需要一个在金融和技术两方面都有专长的人。" } },
  { id:"u32", term:"facilitate",    kind:"words", data:{ zh:"促进；使便利",        example_en:"Good communication tools can facilitate collaboration across time zones.", example_zh:"好的沟通工具能促进跨时区的协作。" } },
  { id:"u33", term:"flexible",      kind:"words", data:{ zh:"灵活的；有弹性的",    example_en:"A flexible schedule allows employees to maintain a better work-life balance.", example_zh:"灵活的工作时间让员工能更好地平衡工作与生活。" } },
  { id:"u34", term:"fundamental",   kind:"words", data:{ zh:"基本的；根本的",      example_en:"Trust is fundamental to any healthy and lasting relationship.",        example_zh:"信任是任何健康持久关系的根本。" } },
  { id:"u35", term:"generate",      kind:"words", data:{ zh:"产生；创造",          example_en:"The new policy is expected to generate thousands of job opportunities.", example_zh:"新政策预计将创造数千个就业机会。" } },
  { id:"u36", term:"hypothesis",    kind:"words", data:{ zh:"假说；假设",          example_en:"The scientist proposed a bold hypothesis that challenged existing theories.", example_zh:"这位科学家提出了一个挑战现有理论的大胆假说。" } },
  { id:"u37", term:"illustrate",    kind:"words", data:{ zh:"说明；阐释",          example_en:"The chart helps to illustrate the dramatic rise in global temperatures.", example_zh:"这张图表有助于说明全球气温的急剧上升。" } },
  { id:"u38", term:"implication",   kind:"words", data:{ zh:"含义；影响",          example_en:"The implications of this discovery could reshape our understanding of physics.", example_zh:"这一发现的影响可能重塑我们对物理学的理解。" } },
  { id:"u39", term:"inevitable",    kind:"words", data:{ zh:"不可避免的",          example_en:"Change is inevitable, and the best we can do is learn to embrace it.", example_zh:"变化是不可避免的，最好的应对就是学会接受它。" } },
  { id:"u40", term:"insight",       kind:"words", data:{ zh:"洞察力；见解",        example_en:"His years of experience give him remarkable insight into human behavior.", example_zh:"多年经验赋予了他对人类行为的卓越洞察力。" } },
  { id:"u41", term:"integrate",     kind:"words", data:{ zh:"整合；融入",          example_en:"The company is trying to integrate new technology into its existing systems.", example_zh:"公司正试图将新技术整合到现有系统中。" } },
  { id:"u42", term:"interpret",     kind:"words", data:{ zh:"解释；诠释",          example_en:"It can be difficult to interpret body language across different cultures.", example_zh:"在不同文化背景下解读肢体语言可能相当困难。" } },
  { id:"u43", term:"investigate",   kind:"words", data:{ zh:"调查；研究",          example_en:"Journalists investigate stories to uncover the truth for the public.",  example_zh:"记者通过调查新闻向公众揭示真相。" } },
  { id:"u44", term:"justify",       kind:"words", data:{ zh:"证明…正当；辩解",     example_en:"Can you justify spending such a large amount on advertising?",         example_zh:"你能证明花那么多钱在广告上是合理的吗？" } },
  { id:"u45", term:"mechanism",     kind:"words", data:{ zh:"机制；机械装置",      example_en:"The brain has complex mechanisms for filtering irrelevant information.", example_zh:"大脑有复杂的机制来过滤无关信息。" } },
  { id:"u46", term:"motivation",    kind:"words", data:{ zh:"动力；动机",          example_en:"Understanding what drives motivation is key to effective leadership.", example_zh:"了解是什么驱动动力是有效领导力的关键。" } },
  { id:"u47", term:"negotiate",     kind:"words", data:{ zh:"谈判；协商",          example_en:"The two companies agreed to negotiate the terms of their partnership.", example_zh:"两家公司同意就合作条款进行谈判。" } },
  { id:"u48", term:"neutral",       kind:"words", data:{ zh:"中立的；中性的",      example_en:"A good mediator should remain neutral throughout the entire process.", example_zh:"好的调解人在整个过程中应保持中立。" } },
  { id:"u49", term:"objective",     kind:"words", data:{ zh:"客观的；目标",        example_en:"It is important to remain objective when assessing someone's work.",   example_zh:"在评估别人的工作时保持客观是很重要的。" } },
  { id:"u50", term:"outcome",       kind:"words", data:{ zh:"结果；成果",          example_en:"The outcome of the negotiation surprised both sides.",                 example_zh:"谈判的结果让双方都感到意外。" } },
  { id:"u51", term:"perspective",   kind:"words", data:{ zh:"视角；观点",          example_en:"Traveling abroad gives you a fresh perspective on your own culture.", example_zh:"出国旅行能让你以全新视角看待自己的文化。" } },
  { id:"u52", term:"phenomenon",    kind:"words", data:{ zh:"现象",               example_en:"The Aurora Borealis is a natural phenomenon that attracts tourists worldwide.", example_zh:"北极光是吸引全球游客的自然现象。" } },
  { id:"u53", term:"predominant",   kind:"words", data:{ zh:"主要的；占主导的",    example_en:"English is the predominant language in international academic publishing.", example_zh:"英语是国际学术出版中占主导地位的语言。" } },
  { id:"u54", term:"profound",      kind:"words", data:{ zh:"深刻的；深远的",      example_en:"The experience had a profound impact on the way she viewed the world.", example_zh:"这段经历对她看待世界的方式产生了深远的影响。" } },
  { id:"u55", term:"rational",      kind:"words", data:{ zh:"理性的；合理的",      example_en:"Try to make rational decisions rather than acting on emotions alone.", example_zh:"尽量做出理性的决定而不是单纯凭情绪行事。" } },
  { id:"u56", term:"reinforce",     kind:"words", data:{ zh:"强化；巩固",          example_en:"Positive feedback reinforces desirable behavior in the workplace.",   example_zh:"积极的反馈能在职场中强化良好的行为。" } },
  { id:"u57", term:"resilient",     kind:"words", data:{ zh:"有韧性的；能复原的",  example_en:"Children are often more resilient than adults give them credit for.", example_zh:"孩子们往往比大人认为的更有韧性。" } },
  { id:"u58", term:"rhetoric",      kind:"words", data:{ zh:"修辞；花言巧语",      example_en:"The politician's speech was full of rhetoric but lacked substance.",  example_zh:"这位政客的演讲充满修辞却缺乏实质内容。" } },
  { id:"u59", term:"rigorous",      kind:"words", data:{ zh:"严格的；缜密的",      example_en:"A rigorous training program is necessary for elite athletes.",        example_zh:"严格的训练计划对精英运动员是必不可少的。" } },
  { id:"u60", term:"scarce",        kind:"words", data:{ zh:"稀缺的；不足的",      example_en:"Clean drinking water is becoming increasingly scarce in arid regions.", example_zh:"在干旱地区清洁饮用水正变得越来越稀缺。" } },
  { id:"u61", term:"skeptical",     kind:"words", data:{ zh:"持怀疑态度的",        example_en:"Many scientists remain skeptical about the bold claims in the paper.", example_zh:"许多科学家对论文中的大胆主张仍持怀疑态度。" } },
  { id:"u62", term:"sophisticated", kind:"words", data:{ zh:"复杂的；成熟的",      example_en:"Modern smartphones use increasingly sophisticated artificial intelligence.", example_zh:"现代智能手机使用越来越复杂的人工智能技术。" } },
  { id:"u63", term:"strategy",      kind:"words", data:{ zh:"策略；战略",          example_en:"A good marketing strategy can determine the success of a new product.", example_zh:"好的营销策略能决定新产品的成败。" } },
  { id:"u64", term:"subjective",    kind:"words", data:{ zh:"主观的",              example_en:"Taste in art is highly subjective and varies from person to person.", example_zh:"对艺术的欣赏品味是高度主观的因人而异。" } },
  { id:"u65", term:"sustainable",   kind:"words", data:{ zh:"可持续的",            example_en:"Sustainable farming practices are essential for long-term food security.", example_zh:"可持续农业实践对长期粮食安全至关重要。" } },
  { id:"u66", term:"transparent",   kind:"words", data:{ zh:"透明的；坦诚的",      example_en:"Good governance requires transparent decision-making processes.",      example_zh:"良好的治理需要透明的决策过程。" } },
  { id:"u67", term:"undermine",     kind:"words", data:{ zh:"削弱；破坏",          example_en:"Constant criticism can undermine a person's confidence over time.",   example_zh:"不断的批评久而久之会削弱一个人的自信心。" } },
  { id:"u68", term:"valid",         kind:"words", data:{ zh:"有效的；有根据的",    example_en:"Your concerns are completely valid and deserve to be heard.",          example_zh:"你的顾虑完全合理值得被认真对待。" } },
  { id:"u69", term:"verify",        kind:"words", data:{ zh:"核实；证明",          example_en:"Always verify information from multiple sources before sharing it.",  example_zh:"在分享信息之前务必通过多个来源加以核实。" } },
  { id:"u70", term:"volatile",      kind:"words", data:{ zh:"不稳定的；易变的",    example_en:"Cryptocurrency prices are notoriously volatile and hard to predict.", example_zh:"加密货币价格以不稳定著称难以预测。" } },
  { id:"u71", term:"accumulate",    kind:"words", data:{ zh:"积累；堆积",          example_en:"Wealth is often accumulated gradually through discipline and patience.", example_zh:"财富通常通过自律和耐心逐渐积累起来。" } },
  { id:"u72", term:"allocate",      kind:"words", data:{ zh:"分配；拨出",          example_en:"The government plans to allocate more funds to public education.",    example_zh:"政府计划向公共教育拨出更多资金。" } },
  { id:"u73", term:"coherent",      kind:"words", data:{ zh:"连贯的；清晰的",      example_en:"A coherent argument requires strong logic and clear supporting evidence.", example_zh:"连贯的论点需要强有力的逻辑和清晰的支撑证据。" } },
  { id:"u74", term:"comprehensive", kind:"words", data:{ zh:"全面的；综合的",      example_en:"The report provides a comprehensive overview of the market trends.",  example_zh:"这份报告全面概述了市场趋势。" } },
  { id:"u75", term:"contradict",    kind:"words", data:{ zh:"反驳；与…矛盾",       example_en:"His actions completely contradict everything he said in the meeting.", example_zh:"他的行为与他在会议上所说的完全矛盾。" } },
  { id:"u76", term:"cultivate",     kind:"words", data:{ zh:"培养；耕种",          example_en:"Successful leaders cultivate trust by being transparent and consistent.", example_zh:"成功的领导者通过透明和一致性来培养信任。" } },
  { id:"u77", term:"deteriorate",   kind:"words", data:{ zh:"恶化；变坏",          example_en:"Without proper maintenance, the building will continue to deteriorate.", example_zh:"如果不加以维护这栋建筑将继续恶化。" } },
  { id:"u78", term:"dynamic",       kind:"words", data:{ zh:"动态的；充满活力的",  example_en:"The startup has a dynamic team that adapts quickly to market changes.", example_zh:"这家初创公司拥有能快速适应市场变化的活力团队。" } },
  { id:"u79", term:"empirical",     kind:"words", data:{ zh:"基于经验的；实证的",  example_en:"The theory needs empirical evidence to be taken seriously.",          example_zh:"该理论需要实证证据才能被认真对待。" } },
  { id:"u80", term:"explicit",      kind:"words", data:{ zh:"明确的；清晰的",      example_en:"The contract should include explicit details about payment terms.",   example_zh:"合同应明确说明付款条款的细节。" } },
  { id:"u81", term:"fragile",       kind:"words", data:{ zh:"脆弱的；易碎的",      example_en:"International peace is fragile and requires constant diplomatic effort.", example_zh:"国际和平是脆弱的需要不断的外交努力来维护。" } },
  { id:"u82", term:"ideology",      kind:"words", data:{ zh:"意识形态",            example_en:"Political ideology shapes how people interpret news and current events.", example_zh:"政治意识形态影响人们对新闻和时事的解读。" } },
  { id:"u83", term:"incentive",     kind:"words", data:{ zh:"激励；动机",          example_en:"Financial incentives alone are not enough to keep employees motivated.", example_zh:"仅靠金钱激励不足以保持员工的积极性。" } },
  { id:"u84", term:"intrinsic",     kind:"words", data:{ zh:"内在的；固有的",      example_en:"The intrinsic value of education goes far beyond getting a good job.", example_zh:"教育的内在价值远不止于找到一份好工作。" } },
  { id:"u85", term:"irony",         kind:"words", data:{ zh:"讽刺；反讽",          example_en:"The irony is that the security system was breached by its own designer.", example_zh:"讽刺的是这套安全系统被其自己的设计者攻破了。" } },
  { id:"u86", term:"narrative",     kind:"words", data:{ zh:"叙述；故事",          example_en:"The media often controls the narrative around major political events.", example_zh:"媒体往往掌控着围绕重大政治事件的叙事话语权。" } },
  { id:"u87", term:"paradox",       kind:"words", data:{ zh:"悖论；矛盾现象",      example_en:"It is a paradox that the more choices we have, the harder it is to decide.", example_zh:"选择越多决策越难，这本身就是一个悖论。" } },
  { id:"u88", term:"perception",    kind:"words", data:{ zh:"感知；看法",          example_en:"Our perception of reality is shaped by our past experiences.",        example_zh:"我们对现实的感知受到过去经历的影响。" } },
  { id:"u89", term:"persistence",   kind:"words", data:{ zh:"坚持；持续",          example_en:"Persistence is often more important than raw talent in the long run.", example_zh:"从长远来看坚持往往比天赋更重要。" } },
  { id:"u90", term:"prerequisite",  kind:"words", data:{ zh:"先决条件",            example_en:"A basic understanding of algebra is a prerequisite for this course.", example_zh:"对代数有基本了解是学习本课程的先决条件。" } },
  { id:"u91", term:"scrutiny",      kind:"words", data:{ zh:"仔细审查；监督",      example_en:"The new regulation will face intense public scrutiny before it passes.", example_zh:"新法规在通过之前将接受严格的公众审查。" } },
  { id:"u92", term:"simulate",      kind:"words", data:{ zh:"模拟；仿真",          example_en:"Scientists use computer models to simulate climate change scenarios.", example_zh:"科学家使用计算机模型来模拟气候变化情景。" } },
  { id:"u93", term:"synthesis",     kind:"words", data:{ zh:"综合；合成",          example_en:"Good academic writing requires synthesis of ideas from multiple sources.", example_zh:"好的学术写作需要综合多种来源的观点。" } },
  { id:"u94", term:"tangible",      kind:"words", data:{ zh:"有形的；切实的",      example_en:"We need tangible results, not just vague promises.",                  example_zh:"我们需要切实的成果而不仅仅是模糊的承诺。" } },
  { id:"u95", term:"unprecedented", kind:"words", data:{ zh:"前所未有的",          example_en:"The pandemic caused unprecedented disruption to the global economy.", example_zh:"疫情对全球经济造成了前所未有的冲击。" } },
  { id:"u96", term:"arbitrary",     kind:"words", data:{ zh:"任意的；武断的",      example_en:"The rule seemed arbitrary, with no logical basis to justify it.",     example_zh:"这条规定看起来很随意没有任何逻辑依据可以支撑它。" } },
  { id:"u97", term:"articulate",    kind:"words", data:{ zh:"清晰表达；表达清晰的", example_en:"She was highly articulate and could explain complex ideas simply.",   example_zh:"她表达能力极强，能够简洁地解释复杂的想法。" } },
  { id:"u98", term:"catalyst",      kind:"words", data:{ zh:"催化剂；促进因素",    example_en:"The new CEO acted as a catalyst for transformative change.",          example_zh:"新任CEO成为了变革的催化剂。" } },
  { id:"u99", term:"discern",       kind:"words", data:{ zh:"辨别；识别",          example_en:"It takes a trained eye to discern genuine antiques from forgeries.",  example_zh:"需要有训练有素的眼光才能辨别真品古董和赝品。" } },
  { id:"u100",term:"proliferate",   kind:"words", data:{ zh:"激增；迅速蔓延",      example_en:"Misinformation has proliferated rapidly in the age of social media.", example_zh:"在社交媒体时代错误信息迅速大量蔓延。" } },

  // ════════════════════════════════════════════════════════
  // 四六级以上水平（150个）— 高难度，学术/专业语境
  // ════════════════════════════════════════════════════════
  { id:"c01", term:"abdicate",      kind:"words", data:{ zh:"放弃（权力/责任）",   example_en:"A leader who abdicates responsibility destroys the team's morale.",    example_zh:"推卸责任的领导者会摧毁团队士气。" } },
  { id:"c02", term:"aberration",    kind:"words", data:{ zh:"异常；偏差",          example_en:"Scientists treated the unusual result as a statistical aberration.",   example_zh:"科学家将这一异常结果视为统计上的偏差。" } },
  { id:"c03", term:"acrimony",      kind:"words", data:{ zh:"尖刻；激烈争辩",      example_en:"The negotiation ended in acrimony with no agreement reached.",        example_zh:"谈判在激烈争吵中结束未能达成任何协议。" } },
  { id:"c04", term:"aesthetic",     kind:"words", data:{ zh:"美学的；审美的",      example_en:"The architect had a refined aesthetic that favored clean, minimal lines.", example_zh:"这位建筑师有着推崇简洁线条的精致审美观。" } },
  { id:"c05", term:"aggravate",     kind:"words", data:{ zh:"加剧；使恶化",        example_en:"Ignoring a conflict only aggravates the tension between the parties.", example_zh:"无视冲突只会加剧双方之间的紧张关系。" } },
  { id:"c06", term:"alleviate",     kind:"words", data:{ zh:"减轻；缓解",          example_en:"Infrastructure investment can help alleviate urban traffic congestion.", example_zh:"基础设施投资有助于缓解城市交通拥堵。" } },
  { id:"c07", term:"allude",        kind:"words", data:{ zh:"暗指；间接提到",      example_en:"He alluded to serious financial problems without stating them directly.", example_zh:"他间接提到了严重的财务问题却没有直接说明。" } },
  { id:"c08", term:"altruistic",    kind:"words", data:{ zh:"无私的；利他的",      example_en:"Her altruistic decision to donate her savings surprised her colleagues.", example_zh:"她无私捐出积蓄的决定让同事们感到惊讶。" } },
  { id:"c09", term:"ambivalent",    kind:"words", data:{ zh:"矛盾的；态度不明的",  example_en:"She felt ambivalent about the promotion — excited but also overwhelmed.", example_zh:"她对升职感到矛盾——既兴奋又不知所措。" } },
  { id:"c10", term:"ameliorate",    kind:"words", data:{ zh:"改善；改进",          example_en:"Policy reforms are needed to ameliorate the conditions of the poor.",  example_zh:"需要政策改革来改善贫困人口的生活条件。" } },
  { id:"c11", term:"anachronism",   kind:"words", data:{ zh:"时代错位；过时的事物", example_en:"Using fax machines today is a complete anachronism.",                  example_zh:"如今还使用传真机完全是时代错位。" } },
  { id:"c12", term:"anomaly",       kind:"words", data:{ zh:"异常；反常现象",      example_en:"The temperature spike was treated as an anomaly in the dataset.",      example_zh:"这次温度骤升被视为数据集中的异常现象。" } },
  { id:"c13", term:"apathy",        kind:"words", data:{ zh:"冷漠；漠不关心",      example_en:"Voter apathy is a serious threat to the health of any democracy.",    example_zh:"选民冷漠是对任何民主制度健康的严重威胁。" } },
  { id:"c14", term:"apprehension",  kind:"words", data:{ zh:"忧虑；恐惧",          example_en:"There was a sense of apprehension before the final verdict was read.", example_zh:"在最终判决宣读之前现场弥漫着一种忧虑的气氛。" } },
  { id:"c15", term:"archaic",       kind:"words", data:{ zh:"古老的；过时的",      example_en:"The archaic legal system desperately needed modernization.",          example_zh:"这个古老的法律体系迫切需要现代化改革。" } },
  { id:"c16", term:"aspire",        kind:"words", data:{ zh:"渴望；立志",          example_en:"He aspired to become a diplomat and worked tirelessly toward that goal.", example_zh:"他渴望成为一名外交官并为此目标孜孜不倦地努力。" } },
  { id:"c17", term:"astute",        kind:"words", data:{ zh:"精明的；机敏的",      example_en:"An astute investor always researches thoroughly before committing funds.", example_zh:"精明的投资者在投入资金之前总是进行充分的调查研究。" } },
  { id:"c18", term:"atrophy",       kind:"words", data:{ zh:"萎缩；退化",          example_en:"Skills that are never practiced will eventually atrophy.",            example_zh:"从不练习的技能最终会退化。" } },
  { id:"c19", term:"audacious",     kind:"words", data:{ zh:"大胆的；鲁莽的",      example_en:"Her audacious proposal shocked the board but ultimately won them over.", example_zh:"她大胆的提案震惊了董事会但最终赢得了他们的认可。" } },
  { id:"c20", term:"augment",       kind:"words", data:{ zh:"增加；扩充",          example_en:"The company augmented its workforce ahead of the busy season.",        example_zh:"公司在旺季前扩充了劳动力。" } },
  { id:"c21", term:"axiom",         kind:"words", data:{ zh:"公理；自明之理",      example_en:"It is a widely accepted axiom that honesty is the best policy.",      example_zh:"诚实是最佳策略是一条被广泛认可的公理。" } },
  { id:"c22", term:"belligerent",   kind:"words", data:{ zh:"好战的；挑衅的",      example_en:"His belligerent tone made it impossible to hold a productive discussion.", example_zh:"他挑衅的语气使得进行有效的讨论根本不可能。" } },
  { id:"c23", term:"benevolent",    kind:"words", data:{ zh:"仁慈的；善意的",      example_en:"The benevolent donor funded scholarships for hundreds of students.",  example_zh:"这位慷慨的捐助者为数百名学生提供了奖学金。" } },
  { id:"c24", term:"catharsis",     kind:"words", data:{ zh:"宣泄；净化",          example_en:"Writing in a journal can provide emotional catharsis after a hard day.", example_zh:"写日记在艰难的一天结束后能提供情感上的宣泄。" } },
  { id:"c25", term:"circumvent",    kind:"words", data:{ zh:"规避；绕过",          example_en:"Some corporations find ways to circumvent environmental regulations.", example_zh:"一些企业会寻找规避环境法规的方法。" } },
  { id:"c26", term:"clandestine",   kind:"words", data:{ zh:"秘密的；地下的",      example_en:"The clandestine meeting was held far from the media spotlight.",      example_zh:"这次秘密会议在远离媒体关注的地方举行。" } },
  { id:"c27", term:"coerce",        kind:"words", data:{ zh:"强迫；胁迫",          example_en:"No one should be coerced into signing a contract against their will.", example_zh:"任何人都不应被迫签署违背其意愿的合同。" } },
  { id:"c28", term:"complacent",    kind:"words", data:{ zh:"自满的；沾沾自喜的",  example_en:"Success can make teams complacent and resistant to further innovation.", example_zh:"成功可能会让团队产生自满情绪不愿进一步创新。" } },
  { id:"c29", term:"complicity",    kind:"words", data:{ zh:"共谋；同谋",          example_en:"His silence amounted to complicity in the ongoing injustice.",        example_zh:"他的沉默相当于对持续不公正行为的默许共谋。" } },
  { id:"c30", term:"conundrum",     kind:"words", data:{ zh:"难题；谜题",          example_en:"How to balance economic growth with environmental protection is a key conundrum.", example_zh:"如何在经济增长与环境保护之间取得平衡是一个关键难题。" } },
  { id:"c31", term:"corroborate",   kind:"words", data:{ zh:"证实；支持",          example_en:"Multiple witnesses came forward to corroborate her testimony.",       example_zh:"多名证人出面证实了她的证词。" } },
  { id:"c32", term:"cryptic",       kind:"words", data:{ zh:"神秘的；含义隐晦的",  example_en:"He left only a cryptic message that nobody could fully decipher.",   example_zh:"他只留下了一条神秘的信息没有人能完全解读。" } },
  { id:"c33", term:"cynical",       kind:"words", data:{ zh:"愤世嫉俗的；冷嘲的",  example_en:"Years of political disappointment had made him deeply cynical.",     example_zh:"多年的政治失望让他变得极为愤世嫉俗。" } },
  { id:"c34", term:"deference",     kind:"words", data:{ zh:"顺从；尊重",          example_en:"Junior doctors show deference to senior consultants in clinical decisions.", example_zh:"年轻医生在临床决策中对资深顾问医师表示尊重服从。" } },
  { id:"c35", term:"delineate",     kind:"words", data:{ zh:"描述；划定界限",      example_en:"The report delineates the boundaries of each department's responsibilities.", example_zh:"报告划定了每个部门职责的边界。" } },
  { id:"c36", term:"demagogue",     kind:"words", data:{ zh:"煽动者；蛊惑人心的政客", example_en:"A demagogue wins support by exploiting people's fears and biases.",  example_zh:"煽动者通过利用人们的恐惧和偏见来赢得支持。" } },
  { id:"c37", term:"dichotomy",     kind:"words", data:{ zh:"二分法；两极对立",    example_en:"The strict dichotomy between work and personal life is becoming outdated.", example_zh:"工作与私人生活之间严格的二元对立正在变得过时。" } },
  { id:"c38", term:"didactic",      kind:"words", data:{ zh:"说教的；教训的",      example_en:"His writing style was overly didactic, which alienated many readers.", example_zh:"他的写作风格过于说教这疏远了许多读者。" } },
  { id:"c39", term:"digress",       kind:"words", data:{ zh:"离题；跑题",          example_en:"The professor had a habit of digressing from the main topic.",       example_zh:"这位教授有离题的习惯。" } },
  { id:"c40", term:"dissonance",    kind:"words", data:{ zh:"不和谐；矛盾",        example_en:"Cognitive dissonance arises when actions conflict with deeply held beliefs.", example_zh:"当行为与深层信念相冲突时认知失调就会产生。" } },
  { id:"c41", term:"dogma",         kind:"words", data:{ zh:"教条；教义",          example_en:"Blind adherence to dogma stifles critical thinking and progress.",   example_zh:"对教条的盲目遵从会扼杀批判性思维和进步。" } },
  { id:"c42", term:"ebullient",     kind:"words", data:{ zh:"热情洋溢的",          example_en:"Her ebullient personality lit up every room she entered.",            example_zh:"她热情洋溢的个性让她走进的每个房间都充满活力。" } },
  { id:"c43", term:"efficacy",      kind:"words", data:{ zh:"效力；功效",          example_en:"Clinical trials are conducted to test the efficacy of new drugs.",   example_zh:"临床试验的目的是测试新药的效力。" } },
  { id:"c44", term:"egregious",     kind:"words", data:{ zh:"极其恶劣的；骇人的",  example_en:"The court called the breach of human rights an egregious violation.", example_zh:"法院将这次侵犯人权的行为称为极其恶劣的违规行为。" } },
  { id:"c45", term:"elicit",        kind:"words", data:{ zh:"引出；诱发",          example_en:"Skilled teachers know how to elicit responses from quiet students.",  example_zh:"有经验的老师懂得如何引导安静的学生开口作答。" } },
  { id:"c46", term:"eminent",       kind:"words", data:{ zh:"卓越的；著名的",      example_en:"The award was presented by an eminent scholar in the field.",        example_zh:"这个奖项由该领域一位卓越的学者颁发。" } },
  { id:"c47", term:"endemic",       kind:"words", data:{ zh:"（某地区）特有的",    example_en:"Corruption has become endemic in certain sectors of the economy.",   example_zh:"腐败在某些经济领域已成为地方性痼疾。" } },
  { id:"c48", term:"ephemeral",     kind:"words", data:{ zh:"短暂的；转瞬即逝的",  example_en:"Social media fame is often ephemeral, fading within days.",          example_zh:"社交媒体上的名气往往转瞬即逝几天内便会消散。" } },
  { id:"c49", term:"equivocate",    kind:"words", data:{ zh:"含糊其辞；搪塞",      example_en:"The minister equivocated when asked directly about the scandal.",    example_zh:"当被直接追问丑闻时这位部长含糊其辞。" } },
  { id:"c50", term:"eradicate",     kind:"words", data:{ zh:"根除；消灭",          example_en:"Global cooperation is essential to eradicate extreme poverty.",      example_zh:"全球合作对于根除极端贫困至关重要。" } },
  { id:"c51", term:"erudite",       kind:"words", data:{ zh:"博学的；饱学的",      example_en:"Her erudite commentary demonstrated decades of scholarly research.", example_zh:"她博学的评论展示了数十年的学术研究积累。" } },
  { id:"c52", term:"esoteric",      kind:"words", data:{ zh:"深奥的；秘传的",      example_en:"The lecture was so esoteric that only specialists could follow it.", example_zh:"这堂讲座过于深奥只有专家才能听懂。" } },
  { id:"c53", term:"euphemism",     kind:"words", data:{ zh:"委婉语；讳饰",        example_en:"Downsizing is often a euphemism for large-scale layoffs.",          example_zh:"'精简机构'往往是大规模裁员的委婉说法。" } },
  { id:"c54", term:"exacerbate",    kind:"words", data:{ zh:"加剧；使恶化",        example_en:"Poor communication will only exacerbate the existing team tensions.", example_zh:"糟糕的沟通只会加剧现有的团队矛盾。" } },
  { id:"c55", term:"exemplary",     kind:"words", data:{ zh:"模范的；堪为典范的",  example_en:"Her exemplary conduct during the crisis earned widespread respect.",  example_zh:"她在危机中的模范表现赢得了广泛尊重。" } },
  { id:"c56", term:"exonerate",     kind:"words", data:{ zh:"宣告无罪；免除责任",  example_en:"New DNA evidence was enough to exonerate the wrongfully convicted man.", example_zh:"新的DNA证据足以为这名被错误定罪的男子洗清罪名。" } },
  { id:"c57", term:"extrapolate",   kind:"words", data:{ zh:"推断；外推",          example_en:"We cannot extrapolate long-term trends from just three data points.", example_zh:"我们不能仅凭三个数据点来推断长期趋势。" } },
  { id:"c58", term:"fallacious",    kind:"words", data:{ zh:"谬误的；错误的",      example_en:"His argument was built on a fallacious premise from the outset.",    example_zh:"他的论点从一开始就建立在一个错误的前提之上。" } },
  { id:"c59", term:"fanaticism",    kind:"words", data:{ zh:"狂热主义",            example_en:"Religious fanaticism has been the root of many historical conflicts.", example_zh:"宗教狂热主义是许多历史冲突的根源。" } },
  { id:"c60", term:"furtive",       kind:"words", data:{ zh:"鬼鬼祟祟的；秘密的",  example_en:"He cast a furtive glance around the room before speaking.",          example_zh:"他在开口说话之前鬼鬼祟祟地扫视了一下房间。" } },
  { id:"c61", term:"grandiose",     kind:"words", data:{ zh:"宏大的；浮夸的",      example_en:"The grandiose plans for the project far exceeded the actual budget.", example_zh:"该项目宏大的计划远远超出了实际预算。" } },
  { id:"c62", term:"hegemony",      kind:"words", data:{ zh:"霸权；主导权",        example_en:"The debate over global hegemony has intensified in recent years.",   example_zh:"近年来关于全球霸权的争论愈发激烈。" } },
  { id:"c63", term:"heresy",        kind:"words", data:{ zh:"异端；异说",          example_en:"Suggesting that the earth was round was once considered heresy.",    example_zh:"主张地球是圆的曾一度被视为异端邪说。" } },
  { id:"c64", term:"hubris",        kind:"words", data:{ zh:"傲慢；自负",          example_en:"The CEO's hubris led him to ignore early warning signs of collapse.", example_zh:"这位CEO的傲慢自负使他忽视了早期的崩盘预警信号。" } },
  { id:"c65", term:"hyperbole",     kind:"words", data:{ zh:"夸张；夸张的说法",    example_en:"Saying it was the best meal in history is a clear hyperbole.",       example_zh:"说那是历史上最好的一顿饭显然是一种夸张说法。" } },
  { id:"c66", term:"iconoclast",    kind:"words", data:{ zh:"打破传统者",          example_en:"The artist was celebrated as an iconoclast who challenged conventions.", example_zh:"这位艺术家因挑战传统规范而被誉为偶像破坏者。" } },
  { id:"c67", term:"impasse",       kind:"words", data:{ zh:"僵局；死胡同",        example_en:"The negotiations reached an impasse after both sides refused to concede.", example_zh:"谈判在双方都拒绝让步后陷入了僵局。" } },
  { id:"c68", term:"impeccable",    kind:"words", data:{ zh:"无可挑剔的；完美的",  example_en:"Her impeccable research record secured her the prestigious award.",  example_zh:"她无可挑剔的研究记录为她赢得了这一重要奖项。" } },
  { id:"c69", term:"impunity",      kind:"words", data:{ zh:"不受惩罚；免责",      example_en:"Corrupt officials acted with impunity for years before being caught.", example_zh:"腐败官员在被捕之前多年来一直逍遥法外。" } },
  { id:"c70", term:"incisive",      kind:"words", data:{ zh:"敏锐的；透彻的",      example_en:"Her incisive analysis cut straight to the heart of the problem.",    example_zh:"她敏锐的分析一针见血地切中了问题的核心。" } },
  { id:"c71", term:"indolent",      kind:"words", data:{ zh:"懒惰的；懒散的",      example_en:"His indolent attitude toward deadlines frustrated the entire team.", example_zh:"他对截止日期漫不经心的态度让整个团队感到沮丧。" } },
  { id:"c72", term:"inexorable",    kind:"words", data:{ zh:"不可阻挡的；无情的",  example_en:"The inexorable march of technology continues to reshape every industry.", example_zh:"技术不可阻挡的前进步伐继续重塑着每一个行业。" } },
  { id:"c73", term:"ingenuity",     kind:"words", data:{ zh:"独创性；心灵手巧",    example_en:"Human ingenuity has solved problems that once seemed impossible.",   example_zh:"人类的独创性解决了曾经看似不可能解决的难题。" } },
  { id:"c74", term:"insidious",     kind:"words", data:{ zh:"潜伏的；暗中为害的",  example_en:"Misinformation can be insidious, spreading slowly but doing real damage.", example_zh:"错误信息可能十分隐蔽传播缓慢却会造成真实危害。" } },
  { id:"c75", term:"insular",       kind:"words", data:{ zh:"孤立的；偏狭的",      example_en:"An insular worldview prevents meaningful engagement with global issues.", example_zh:"孤立偏狭的世界观妨碍了对全球问题的有效参与。" } },
  { id:"c76", term:"intransigent",  kind:"words", data:{ zh:"不妥协的；固执己见的", example_en:"The intransigent party refused any concession during negotiations.", example_zh:"那个顽固的一方在谈判中拒绝做出任何让步。" } },
  { id:"c77", term:"inundate",      kind:"words", data:{ zh:"涌入；淹没",          example_en:"The office was inundated with complaints after the product recall.",  example_zh:"产品召回后办公室被大量投诉淹没。" } },
  { id:"c78", term:"irrefutable",   kind:"words", data:{ zh:"无可辩驳的",          example_en:"The scientific consensus on climate change is now irrefutable.",      example_zh:"科学界对气候变化的共识现在已无可辩驳。" } },
  { id:"c79", term:"jeopardize",    kind:"words", data:{ zh:"危害；使陷入危险",    example_en:"Reckless decisions can jeopardize years of painstaking progress.",   example_zh:"鲁莽的决定可能危及多年辛苦取得的进展。" } },
  { id:"c80", term:"laconic",       kind:"words", data:{ zh:"简洁的；言简意赅的",  example_en:"His laconic reply suggested he was not interested in further discussion.", example_zh:"他言简意赅的回答暗示他无意进一步讨论此事。" } },
  { id:"c81", term:"lament",        kind:"words", data:{ zh:"哀叹；悲悼",          example_en:"Many scholars lament the decline of serious long-form journalism.", example_zh:"许多学者哀叹严肃长篇新闻报道的衰落。" } },
  { id:"c82", term:"latent",        kind:"words", data:{ zh:"潜在的；隐伏的",      example_en:"The economic crisis exposed latent weaknesses in the banking system.", example_zh:"经济危机暴露了银行体系中潜在的弱点。" } },
  { id:"c83", term:"litigious",     kind:"words", data:{ zh:"好打官司的；诉讼的",  example_en:"The increasingly litigious culture adds costs to businesses.",       example_zh:"日益盛行的诉讼文化增加了企业的运营成本。" } },
  { id:"c84", term:"lucid",         kind:"words", data:{ zh:"清晰的；头脑清醒的",  example_en:"Despite her age, her reasoning remained completely lucid.",          example_zh:"尽管年事已高她的思维依然完全清晰。" } },
  { id:"c85", term:"malleable",     kind:"words", data:{ zh:"可塑的；易影响的",    example_en:"Young minds are highly malleable and shaped by early experiences.", example_zh:"年轻的心灵极具可塑性容易受到早期经历的影响。" } },
  { id:"c86", term:"mendacious",    kind:"words", data:{ zh:"撒谎的；不诚实的",    example_en:"The mendacious report misled investors for years.",                  example_zh:"那份不实报告多年来误导了投资者。" } },
  { id:"c87", term:"mercurial",     kind:"words", data:{ zh:"善变的；易冲动的",    example_en:"His mercurial temperament made him difficult to work with.",         example_zh:"他善变的脾气让人很难与他共事。" } },
  { id:"c88", term:"meticulous",    kind:"words", data:{ zh:"一丝不苟的",          example_en:"Meticulous attention to detail is essential in surgical procedures.", example_zh:"在外科手术中一丝不苟的细节关注至关重要。" } },
  { id:"c89", term:"mitigate",      kind:"words", data:{ zh:"减轻；缓和",          example_en:"Diplomacy can help mitigate the risk of armed conflict.",           example_zh:"外交努力有助于减轻武装冲突的风险。" } },
  { id:"c90", term:"mundane",       kind:"words", data:{ zh:"平凡的；世俗的",      example_en:"Automation is replacing many mundane and repetitive tasks.",        example_zh:"自动化正在取代许多平凡而重复性的工作。" } },
  { id:"c91", term:"nefarious",     kind:"words", data:{ zh:"邪恶的；极恶的",      example_en:"The investigation exposed the nefarious activities of the cartel.", example_zh:"调查揭露了该犯罪集团的罪恶行径。" } },
  { id:"c92", term:"nuance",        kind:"words", data:{ zh:"细微差别；微妙之处",  example_en:"Understanding the nuance of a language takes years of immersion.",  example_zh:"理解一门语言的细微之处需要多年的沉浸式学习。" } },
  { id:"c93", term:"obfuscate",     kind:"words", data:{ zh:"使模糊；混淆视听",    example_en:"Dense jargon can obfuscate simple ideas and confuse readers.",      example_zh:"晦涩的术语会模糊简单的想法让读者感到困惑。" } },
  { id:"c94", term:"obsequious",    kind:"words", data:{ zh:"谄媚的；奉承的",      example_en:"His obsequious behavior toward the boss alienated his colleagues.", example_zh:"他对老板阿谀奉承的行为疏远了他的同事。" } },
  { id:"c95", term:"omnipotent",    kind:"words", data:{ zh:"全能的；无所不能的",  example_en:"No government is omnipotent; all face real constraints of power.",   example_zh:"没有任何政府是全能的，所有政府都面临现实的权力限制。" } },
  { id:"c96", term:"ostracize",     kind:"words", data:{ zh:"排斥；流放",          example_en:"Whistleblowers are sometimes ostracized by their colleagues.",      example_zh:"举报者有时会遭到同事的排斥。" } },
  { id:"c97", term:"partisan",      kind:"words", data:{ zh:"党派的；偏袒的",      example_en:"Partisan politics make it hard to find common ground on key issues.", example_zh:"党派政治使得在关键问题上找到共识变得十分困难。" } },
  { id:"c98", term:"patronize",     kind:"words", data:{ zh:"以高人一等的态度对待", example_en:"She felt patronized by his overly simplified explanations.",        example_zh:"她觉得他过于简化的解释是在俯视她。" } },
  { id:"c99", term:"pernicious",    kind:"words", data:{ zh:"有害的；恶性的",      example_en:"Misinformation has a pernicious effect on public health outcomes.", example_zh:"错误信息对公共卫生结果有着恶性影响。" } },
  { id:"c100",term:"pervasive",     kind:"words", data:{ zh:"无处不在的；普遍的",  example_en:"The pervasive influence of social media on youth is hard to deny.", example_zh:"社交媒体对年轻人无处不在的影响难以否认。" } },
  { id:"c101",term:"placate",       kind:"words", data:{ zh:"安抚；平息",          example_en:"The manager tried to placate angry customers with a full refund.",  example_zh:"经理试图通过全额退款来安抚愤怒的顾客。" } },
  { id:"c102",term:"polarization",  kind:"words", data:{ zh:"极化；两极分化",      example_en:"Political polarization has made constructive dialogue nearly impossible.", example_zh:"政治极化使得建设性的对话几乎成为不可能。" } },
  { id:"c103",term:"posterity",     kind:"words", data:{ zh:"后代；后世",          example_en:"These records were preserved for posterity to study and learn from.", example_zh:"这些记录被保存下来供后代学习和借鉴。" } },
  { id:"c104",term:"pragmatism",    kind:"words", data:{ zh:"实用主义",            example_en:"Political pragmatism sometimes requires compromising on principles.", example_zh:"政治实用主义有时需要在原则上做出妥协。" } },
  { id:"c105",term:"precipitate",   kind:"words", data:{ zh:"促使突然发生；仓促的", example_en:"The assassination precipitated a full-scale diplomatic crisis.",    example_zh:"这次暗杀促使一场全面的外交危机骤然爆发。" } },
  { id:"c106",term:"preclude",      kind:"words", data:{ zh:"排除；阻止",          example_en:"A criminal record may preclude you from certain career opportunities.", example_zh:"犯罪记录可能使你与某些职业机会无缘。" } },
  { id:"c107",term:"prerogative",   kind:"words", data:{ zh:"特权；专有权利",      example_en:"It is the committee's prerogative to amend the proposal.",          example_zh:"修改提案是委员会的专有权利。" } },
  { id:"c108",term:"probity",       kind:"words", data:{ zh:"正直；廉洁",          example_en:"Judges are expected to demonstrate the highest levels of probity.", example_zh:"法官被期望展示最高水平的廉洁正直。" } },
  { id:"c109",term:"promulgate",    kind:"words", data:{ zh:"颁布；宣传",          example_en:"The government promulgated new regulations on data privacy.",       example_zh:"政府颁布了关于数据隐私的新法规。" } },
  { id:"c110",term:"propensity",    kind:"words", data:{ zh:"倾向；癖好",          example_en:"He has a propensity for taking unnecessary risks in his investments.", example_zh:"他有在投资中承担不必要风险的倾向。" } },
  { id:"c111",term:"querulous",     kind:"words", data:{ zh:"爱抱怨的；好发牢骚的", example_en:"His querulous emails drained the team's patience over time.",       example_zh:"他爱发牢骚的邮件逐渐耗尽了团队的耐心。" } },
  { id:"c112",term:"recalcitrant",  kind:"words", data:{ zh:"顽固不服从的",        example_en:"The recalcitrant employee refused every attempt at mediation.",     example_zh:"那名固执的员工拒绝了每一次调解的尝试。" } },
  { id:"c113",term:"reciprocate",   kind:"words", data:{ zh:"回报；互换",          example_en:"If you show kindness consistently, people will often reciprocate.", example_zh:"如果你持续展现善意人们往往会予以回报。" } },
  { id:"c114",term:"repudiate",     kind:"words", data:{ zh:"拒绝承认；驳斥",      example_en:"The spokesperson repudiated all allegations made against the firm.", example_zh:"发言人驳斥了所有针对该公司的指控。" } },
  { id:"c115",term:"reticent",      kind:"words", data:{ zh:"沉默寡言的；不愿表达的", example_en:"He was reticent about his personal life even with close friends.",  example_zh:"即使在亲密的朋友面前他也对自己的私生活讳莫如深。" } },
  { id:"c116",term:"sanctimonious", kind:"words", data:{ zh:"假装虔诚的；道貌岸然的", example_en:"His sanctimonious lectures on ethics irritated everyone around him.", example_zh:"他道貌岸然的伦理说教令周围的人感到厌烦。" } },
  { id:"c117",term:"seditious",     kind:"words", data:{ zh:"煽动性的；叛乱的",    example_en:"The pamphlet was banned for its seditious content.",                example_zh:"这本小册子因其煽动性内容而遭到禁止。" } },
  { id:"c118",term:"solicitous",    kind:"words", data:{ zh:"殷切关注的；焦虑的",  example_en:"She was solicitous about her parents' health throughout the trip.", example_zh:"整个旅途中她都殷切地挂念着父母的健康。" } },
  { id:"c119",term:"specious",      kind:"words", data:{ zh:"似是而非的",          example_en:"The lawyer's specious argument fooled the jury momentarily.",       example_zh:"律师似是而非的论点暂时迷惑了陪审团。" } },
  { id:"c120",term:"spurious",      kind:"words", data:{ zh:"假冒的；欺骗性的",    example_en:"The report was built on spurious data that could not be verified.", example_zh:"这份报告建立在无法核实的虚假数据之上。" } },
  { id:"c121",term:"tenacious",     kind:"words", data:{ zh:"坚韧的；顽强的",      example_en:"Her tenacious pursuit of justice inspired everyone who knew her.",  example_zh:"她对正义的顽强追求激励了所有认识她的人。" } },
  { id:"c122",term:"terse",         kind:"words", data:{ zh:"简短的；简洁有力的",  example_en:"His terse response made it clear he did not want to discuss it.",  example_zh:"他简短的回答清楚地表明他不想讨论这件事。" } },
  { id:"c123",term:"tractable",     kind:"words", data:{ zh:"易处理的；顺从的",    example_en:"The issue proved far less tractable than the team had anticipated.", example_zh:"这个问题比团队预期的要难处理得多。" } },
  { id:"c124",term:"transgress",    kind:"words", data:{ zh:"违反；越界",          example_en:"Any employee who transgresses the code of conduct faces dismissal.", example_zh:"任何违反行为准则的员工都将面临解雇。" } },
  { id:"c125",term:"tumultuous",    kind:"words", data:{ zh:"动荡的；喧嚣的",      example_en:"The country went through a tumultuous period of political transition.", example_zh:"这个国家经历了一段动荡的政治转型时期。" } },
  { id:"c126",term:"ubiquitous",    kind:"words", data:{ zh:"无处不在的；普遍存在的", example_en:"Smartphones have become ubiquitous in every corner of the world.", example_zh:"智能手机已经在世界的每个角落无处不在。" } },
  { id:"c127",term:"unequivocal",   kind:"words", data:{ zh:"明确的；毫不含糊的",  example_en:"The evidence provided unequivocal proof of the defendant's guilt.", example_zh:"证据提供了被告有罪的明确证明。" } },
  { id:"c128",term:"unilateral",    kind:"words", data:{ zh:"单方面的",            example_en:"A unilateral decision made without consultation damaged trust.",     example_zh:"未经磋商的单方面决定损害了信任关系。" } },
  { id:"c129",term:"untenable",     kind:"words", data:{ zh:"站不住脚的；不可维持的", example_en:"Under cross-examination, his position proved completely untenable.", example_zh:"在交叉询问下他的立场被证明完全站不住脚。" } },
  { id:"c130",term:"vacuous",       kind:"words", data:{ zh:"空洞的；无实质内容的", example_en:"The speech was vacuous, full of buzzwords but devoid of real ideas.", example_zh:"这篇演讲空洞无物，充斥着流行词汇却毫无真正的想法。" } },
  { id:"c131",term:"venerate",      kind:"words", data:{ zh:"尊敬；崇拜",          example_en:"In many cultures, elders are venerated for their wisdom and experience.", example_zh:"在许多文化中老年人因其智慧和经验而受到尊敬。" } },
  { id:"c132",term:"veracious",     kind:"words", data:{ zh:"诚实的；真实的",      example_en:"A veracious account of events is essential in any legal proceeding.", example_zh:"对事件的真实陈述在任何法律程序中都至关重要。" } },
  { id:"c133",term:"verbose",       kind:"words", data:{ zh:"冗长的；啰嗦的",      example_en:"His verbose writing style made his reports difficult to read.",     example_zh:"他冗长的写作风格使他的报告读起来十分费力。" } },
  { id:"c134",term:"vexatious",     kind:"words", data:{ zh:"令人烦恼的；无理取闹的", example_en:"The vexatious lawsuit wasted years of the company's resources.",   example_zh:"这场无理取闹的诉讼浪费了公司多年的资源。" } },
  { id:"c135",term:"vicarious",     kind:"words", data:{ zh:"代替他人的；间接感受的", example_en:"She enjoyed a vicarious thrill through her children's adventures.", example_zh:"她通过孩子们的冒险间接感受到了兴奋和刺激。" } },
  { id:"c136",term:"vindicate",     kind:"words", data:{ zh:"证明…无辜；为…辩护",  example_en:"The audit results fully vindicated the manager's financial decisions.", example_zh:"审计结果完全证明了该经理财务决策的正确性。" } },
  { id:"c137",term:"visceral",      kind:"words", data:{ zh:"发自内心的；本能的",  example_en:"The documentary provoked a visceral reaction from its audience.",   example_zh:"这部纪录片引发了观众发自内心的强烈反应。" } },
  { id:"c138",term:"vitriolic",     kind:"words", data:{ zh:"尖酸刻薄的；刻毒的",  example_en:"His vitriolic criticism of colleagues made him deeply unpopular.",  example_zh:"他对同事的尖酸刻薄批评使他极为不受欢迎。" } },
  { id:"c139",term:"volatile",      kind:"words", data:{ zh:"不稳定的；易挥发的",  example_en:"The volatile situation required careful diplomatic handling.",       example_zh:"这种不稳定的局势需要谨慎的外交处理。" } },
  { id:"c140",term:"watershed",     kind:"words", data:{ zh:"分水岭；转折点",      example_en:"The 2008 financial crisis was a watershed moment for global economics.", example_zh:"2008年金融危机是全球经济的一个分水岭时刻。" } },
  { id:"c141",term:"xenophobia",    kind:"words", data:{ zh:"仇外情绪；排外心理",  example_en:"Rising xenophobia threatens the social cohesion of diverse societies.", example_zh:"日益蔓延的仇外情绪威胁着多元社会的社会凝聚力。" } },
  { id:"c142",term:"zeitgeist",     kind:"words", data:{ zh:"时代精神；时代思潮",  example_en:"The film captured the zeitgeist of an entire generation perfectly.",  example_zh:"这部电影完美地捕捉了整整一代人的时代精神。" } },
  { id:"c143",term:"zealot",        kind:"words", data:{ zh:"狂热分子；热衷者",    example_en:"Zealots rarely make good negotiators because they refuse all compromise.", example_zh:"狂热分子很少能成为好的谈判者因为他们拒绝任何妥协。" } },
  { id:"c144",term:"acumen",        kind:"words", data:{ zh:"敏锐；洞察力",        example_en:"Her business acumen allowed her to spot opportunities others missed.", example_zh:"她敏锐的商业洞察力使她能发现别人错过的机会。" } },
  { id:"c145",term:"amalgamate",    kind:"words", data:{ zh:"合并；混合",          example_en:"The two rival companies decided to amalgamate to survive the downturn.", example_zh:"两家竞争公司决定合并以渡过经济下行期。" } },
  { id:"c146",term:"anachronistic", kind:"words", data:{ zh:"时代错误的；不合时宜的", example_en:"His anachronistic management style frustrated younger employees.",   example_zh:"他不合时宜的管理风格令年轻员工感到沮丧。" } },
  { id:"c147",term:"anecdotal",     kind:"words", data:{ zh:"轶事的；道听途说的",  example_en:"Anecdotal evidence is not sufficient to prove a scientific theory.", example_zh:"道听途说的证据不足以证明一个科学理论。" } },
  { id:"c148",term:"approbation",   kind:"words", data:{ zh:"认可；赞许",          example_en:"The proposal received the approbation of the entire board.",         example_zh:"这个提案获得了整个董事会的认可。" } },
  { id:"c149",term:"circumspect",   kind:"words", data:{ zh:"谨慎的；慎重的",      example_en:"Diplomats must be circumspect in their public statements at all times.", example_zh:"外交官在公开声明时任何时候都必须保持谨慎。" } },
  { id:"c150",term:"inveterate",    kind:"words", data:{ zh:"根深蒂固的；积习难改的", example_en:"He was an inveterate gambler who could not stop despite losing everything.", example_zh:"他是个积习难改的赌徒即使输光一切也无法停手。" } },
];
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
      window.speechSynthesis.cancel();
    }
    audioUnlocked = true;
  } catch {}
}

function playWord(term) {
  const t = (term || "").trim();
  if (!t) return;
  const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(t)}&type=2`);
  audio.play().catch(() => {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "en-US";
      u.rate = 0.88;
      window.speechSynthesis.speak(u);
    } catch {}
  });
}

const SCORE_KEY = "naila_game_scores";

const GAME_META = [
  { id: "bubble", emoji: "🫧", name: "气泡拼写", color: "#7c3aed" },
  { id: "match", emoji: "🔗", name: "极速连连看", color: "#d97706" },
  { id: "swipe", emoji: "🃏", name: "单词探探", color: "#ec4899" },
  { id: "rebuild", emoji: "🧩", name: "台词磁力贴", color: "#059669" },
  { id: "balloon", emoji: "🎧", name: "盲听气球", color: "#0891b2" },
  { id: "speed", emoji: "⚡", name: "极速二选一", color: "#d97706" },
];

function loadScores() {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveScore(gameId, score) {
  try {
    const all = loadScores();
    const prev = all[gameId] || { best: 0, last: 0, playCount: 0 };
    const isNewBest = score > 0 && score >= prev.best;
    all[gameId] = {
      best: Math.max(prev.best, score),
      last: score,
      playCount: (prev.playCount || 0) + 1,
    };
    localStorage.setItem(SCORE_KEY, JSON.stringify(all));
    return { ...all[gameId], isNewBest, oldBest: prev.best };
  } catch {
    return null;
  }
}


function NotEnoughView({ onBack, onSwitchBuiltin, isMember }) {
  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: 400, width: "100%", background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📚</div>
        <div style={{ fontSize: 18, fontWeight: 1000, marginBottom: 8 }}>收藏词太少了</div>
        <div style={{ opacity: 0.7, fontWeight: 900, fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          至少需要收藏 10 个词汇才能开始游戏。<br />
          {isMember ? "去视频页收藏更多词，或者先用内置词库练习。" : "去视频页收藏更多词，或开通会员使用内置词库练习。"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {isMember && (
            <button onClick={onSwitchBuiltin}
              style={{ padding: "12px 20px", borderRadius: THEME.radii.pill, background: THEME.colors.accent, color: "#fff", border: "none", fontWeight: 1000, cursor: "pointer", fontSize: 15 }}>
              用内置词库练习 →
            </button>
          )}
          <button onClick={onBack}
            style={{ padding: "10px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: "transparent", cursor: "pointer", fontWeight: 900 }}>
            返回大厅
          </button>
        </div>
      </div>
    </div>
  );
}

function useCountdown(seconds, onDone) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const doneRef = useRef(false);
  useEffect(() => {
    doneRef.current = false;
    setTimeLeft(seconds);
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(id);
          if (!doneRef.current) { doneRef.current = true; onDone(); }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);
  return timeLeft;
}

function TimerBar({ timeLeft, totalSeconds }) {
  const pct = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;
  const color = pct > 40 ? "#22c55e" : pct > 20 ? "#f59e0b" : "#ef4444";
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 9999, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 9999, width: `${pct}%`, background: color, transition: "width 1s linear, background 0.3s", boxShadow: `0 0 6px ${color}88` }} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 1000, color, minWidth: 36, textAlign: "right" }}>
        {m}:{String(s).padStart(2, "0")}
      </div>
    </div>
  );
}

const TIMED_OPTIONS = [
  { label: "1 分钟", seconds: 60,  desc: "轻松" },
  { label: "2 分钟", seconds: 120, desc: "标准" },
  { label: "3 分钟", seconds: 180, desc: "挑战" },
];

function TimedStartScreen({ emoji, name, desc, sourceLabel, onStart, onExit }) {
  const [sel, setSel] = useState(1);
  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 20 }}>
      <div style={{ fontSize: 48 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 1000 }}>{name}</div>
      <div style={{ fontSize: 14, color: THEME.colors.faint, fontWeight: 900, textAlign: "center", maxWidth: 280 }}>{desc}</div>
      <div style={{ fontSize: 12, fontWeight: 900, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.pill, padding: "4px 12px", color: THEME.colors.faint }}>
        词库：{sourceLabel}
      </div>
      <div style={{ width: "100%", maxWidth: 280 }}>
        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>选择时长</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {TIMED_OPTIONS.map((d, i) => (
            <button key={i} onClick={() => setSel(i)} style={{
              padding: "10px 0", borderRadius: THEME.radii.md, cursor: "pointer", fontWeight: 1000, fontSize: 13,
              border: sel === i ? `2px solid ${THEME.colors.accent}` : `1px solid ${THEME.colors.border}`,
              background: sel === i ? `${THEME.colors.accent}18` : THEME.colors.surface,
              color: sel === i ? THEME.colors.accent : THEME.colors.ink,
            }}>
              <div>{d.label}</div>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 900 }}>{d.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <button onClick={async () => { await unlockAudio(); onStart(TIMED_OPTIONS[sel].seconds); }}
        style={{ marginTop: 4, padding: "14px 40px", borderRadius: THEME.radii.pill, background: THEME.colors.accent, color: "#fff", border: "none", fontSize: 16, fontWeight: 1000, cursor: "pointer" }}>
        开始游戏 →
      </button>
      <button onClick={onExit} style={{ padding: "8px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: "transparent", cursor: "pointer", fontWeight: 900 }}>返回大厅</button>
    </div>
  );
}

const COUNT_OPTIONS = [
  { label: "5 题",  count: 5,  desc: "速战" },
  { label: "10 题", count: 10, desc: "标准" },
  { label: "20 题", count: 20, desc: "精练" },
];

function CountStartScreen({ emoji, name, desc, sourceLabel, vocabCount = 99, onStart, onExit }) {
  const options = COUNT_OPTIONS.filter(d => d.count <= vocabCount);
  const [sel, setSel] = useState(0);
  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 20 }}>
      <div style={{ fontSize: 48 }}>{emoji}</div>
      <div style={{ fontSize: 20, fontWeight: 1000 }}>{name}</div>
      <div style={{ fontSize: 14, color: THEME.colors.faint, fontWeight: 900, textAlign: "center", maxWidth: 280 }}>{desc}</div>
      <div style={{ fontSize: 12, fontWeight: 900, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.pill, padding: "4px 12px", color: THEME.colors.faint }}>
        词库：{sourceLabel}
      </div>
      <div style={{ width: "100%", maxWidth: 280 }}>
        <div style={{ fontSize: 13, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>选择题数</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},1fr)`, gap: 8 }}>
          {options.map((d, i) => (
            <button key={i} onClick={() => setSel(i)} style={{
              padding: "10px 0", borderRadius: THEME.radii.md, cursor: "pointer", fontWeight: 1000, fontSize: 13,
              border: sel === i ? `2px solid ${THEME.colors.accent}` : `1px solid ${THEME.colors.border}`,
              background: sel === i ? `${THEME.colors.accent}18` : THEME.colors.surface,
              color: sel === i ? THEME.colors.accent : THEME.colors.ink,
            }}>
              <div>{d.label}</div>
              <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 900 }}>{d.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <button onClick={async () => { await unlockAudio(); onStart(options[sel].count); }}
        style={{ marginTop: 4, padding: "14px 40px", borderRadius: THEME.radii.pill, background: THEME.colors.accent, color: "#fff", border: "none", fontSize: 16, fontWeight: 1000, cursor: "pointer" }}>
        开始游戏 →
      </button>
      <button onClick={onExit} style={{ padding: "8px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: "transparent", cursor: "pointer", fontWeight: 900 }}>返回大厅</button>
    </div>
  );
}

function ScoreResult({ score, gameId }) {
  const calledRef = useRef(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    try {
      const metaMap = window.__nailaScoreSavedMeta || {};
      const meta = metaMap?.[gameId];
      if (meta && meta.last === score) {
        setResult(meta);
        return;
      }
    } catch {}

    const r = saveScore(gameId, score);
    setResult(r);
  }, [gameId, score]);

  if (!result) return null;

  const { best = 0, oldBest = 0, isNewBest = false } = result;

  let text = "";
  let color = THEME.colors.muted;

  if (oldBest === 0) {
    text = "🌟 首次完成！继续加油";
    color = "#b45309";
  } else if (isNewBest && oldBest > 0) {
    text = `🎉 新纪录！超越了上次的 ${oldBest} 分`;
    color = "#b45309";
  } else {
    text = `历史最高：${best} 分`;
    color = THEME.colors.muted;
  }

  return (
    <div style={{ marginTop: 10, fontWeight: 1000, color, fontSize: 13 }}>
      {text}
    </div>
  );
}


function MasteryBadge({ level }) {
  const map = {
    0: { label: "新收藏", bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
    1: { label: "学习中", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    2: { label: "已掌握", bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  };
  const m = map[level ?? 0] || map[0];
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: m.bg, color: m.color, border: `1px solid ${m.border}`, fontWeight: 700 }}>
      {level === 0 ? "⭐" : level === 1 ? "🔄" : "✅"} {m.label}
    </span>
  );
}

function ProgressBar({ current, total, onExit }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: THEME.colors.muted }}>第 {current + 1} 题 / 共 {total} 题</span>
        <button type="button" onClick={onExit} style={{ fontSize: 13, color: THEME.colors.muted, background: "none", border: "none", cursor: "pointer", fontWeight: 800 }}>退出</button>
      </div>
      <div style={{ height: 6, background: "#e8eaf0", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", background: THEME.colors.accent, borderRadius: 999, width: `${((current + 1) / total) * 100}%`, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function BubbleSpellingGame({ vocabItems, onExit, onGameEnd, maxQuestions = 10, sourceLabel = "我的收藏" }) {
  const [questionCount, setQuestionCount] = useState(maxQuestions);
  const allFiltered = useMemo(() => {
    return (vocabItems || []).filter((x) => {
      const k = x?.kind;
      if (k && k !== "words" && k !== "phrases") return false;
      return true;
    });
  }, [vocabItems]);
  const cards = useMemo(() => shuffle(allFiltered).slice(0, questionCount), [allFiltered, questionCount]);

  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [slots, setSlots] = useState([]);
  const [bubbles, setBubbles] = useState([]);
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [records, setRecords] = useState([]);
  const [done, setDone] = useState(false);
  const endCalledRef = useRef(false);

  const card = cards[idx];
  const isLast = idx === cards.length - 1;
  const total = cards.length;

  useEffect(() => {
    if (!card || done) return;
    initQuestion(card);
    if (started) playWord(card.term);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, card?.id, done, started]);

  useEffect(() => {
    if (!done) return;
    const score = correctCount * 10;
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    try { onGameEnd?.(score); } catch {}
  }, [done, correctCount, onGameEnd]);

  function initQuestion(c) {
    const term = c?.term || "";
    const slotArr = term.split("").map((ch) => (ch === " " ? " " : null));
    setSlots(slotArr);
    const letters = term.split("").filter((ch) => ch !== " ");
    const distractorPool = "abcdefghijklmnopqrstuvwxyz";
    const termLetters = new Set(letters.map((l) => l.toLowerCase()));
    const distractors = distractorPool.split("").filter((l) => !termLetters.has(l));
    const shuffledDistractors = [...distractors].sort(() => Math.random() - 0.5);
    const extraCount = Math.min(4, Math.max(2, Math.floor(letters.length * 0.4)));
    const extras = shuffledDistractors.slice(0, extraCount);
    const allLetters = [...letters, ...extras].sort(() => Math.random() - 0.5);
    setBubbles(allLetters.map((letter, i) => ({ letter, id: i, used: false })));
    setChecked(false);
    setIsCorrect(false);
    setSuccessAnim(false);
  }

  function finishGame() { setDone(true); }

  function handleBubbleClick(bubbleId) {
    if (checked || done) return;
    const bubble = bubbles.find((b) => b.id === bubbleId && !b.used);
    if (!bubble) return;
    const emptyIdx = slots.findIndex((s) => s === null);
    if (emptyIdx === -1) return;
    const expectedLetter = (card?.term || "")[emptyIdx] || "";
    const correct = bubble.letter.toLowerCase() === expectedLetter.toLowerCase();
    const newSlots = [...slots];
    newSlots[emptyIdx] = { letter: bubble.letter, correct };
    setSlots(newSlots);
    setBubbles((prev) => prev.map((b) => (b.id === bubbleId ? { ...b, used: true } : b)));
    const allFilled = newSlots.every((s) => s !== null);
    if (allFilled) {
      const allCorrect = newSlots.every((s) => s === " " || s.correct);
      setChecked(true);
      setIsCorrect(allCorrect);
      setRecords((prev) => [...prev, { term: card?.term || "", wasCorrect: allCorrect }]);
      if (allCorrect) setCorrectCount((c) => c + 1);
      if (allCorrect) {
        setSuccessAnim(true);
        setTimeout(() => { if (isLast) { finishGame(); } else { setIdx((i) => i + 1); } }, 900);
      }
    }
  }

  function handlePlayAudio() {
    unlockAudio();
    setPlayingAudio(true);
    playWord(card?.term);
    setTimeout(() => setPlayingAudio(false), 1500);
  }

  function handleNext() {
    if (done) return;
    if (isLast) { finishGame(); } else { setIdx((i) => i + 1); }
  }

  function handleReset() {
    if (done) return;
    initQuestion(card);
  }

  function resetAll() {
    endCalledRef.current = false;
    setIdx(0); setSlots([]); setBubbles([]); setChecked(false); setIsCorrect(false);
    setPlayingAudio(false); setSuccessAnim(false); setCorrectCount(0); setRecords([]); setDone(false);
  }

  const bubbleColors = [
    { bg: "linear-gradient(135deg,#6366f1,#4f46e5)", shadow: "rgba(99,102,241,0.35)" },
    { bg: "linear-gradient(135deg,#ec4899,#db2777)", shadow: "rgba(236,72,153,0.35)" },
    { bg: "linear-gradient(135deg,#06b6d4,#0891b2)", shadow: "rgba(6,182,212,0.35)" },
    { bg: "linear-gradient(135deg,#10b981,#059669)", shadow: "rgba(16,185,129,0.35)" },
    { bg: "linear-gradient(135deg,#f59e0b,#d97706)", shadow: "rgba(245,158,11,0.35)" },
    { bg: "linear-gradient(135deg,#8b5cf6,#7c3aed)", shadow: "rgba(139,92,246,0.35)" },
  ];

  const shellStyle = { minHeight: "100vh", background: THEME.colors.bg, padding: 14, boxSizing: "border-box", color: THEME.colors.ink };
  const topBar = { maxWidth: 980, margin: "0 auto", padding: "8px 6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" };

  if (done) {
    const score = correctCount * 10;
    return (
      <div style={shellStyle}>
        <div style={topBar}>
          <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
          <div style={{ fontWeight: 1000 }}>🫧 气泡拼写</div>
          <div style={{ opacity: 0.7, fontWeight: 900 }}>结算</div>
        </div>
        <div style={{ maxWidth: 760, margin: "18px auto 0", padding: "0 14px" }}>
          <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 18, boxShadow: "0 12px 30px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本轮结算</div>
            <div style={{ marginTop: 10, opacity: 0.9, fontWeight: 1000 }}>总积分：<b>{score}</b> 分　·　答对 <b>{correctCount}</b> / <b>{total}</b> 题</div>
            <ScoreResult score={score} gameId="bubble" />
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {records.map((r, i) => {
                const ok = !!r.wasCorrect;
                return (
                  <div key={`${r.term}-${i}`} style={{ padding: 12, borderRadius: THEME.radii.md, background: ok ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)", border: `1px solid ${ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, fontWeight: 900, lineHeight: 1.35 }}>
                    {ok ? `✅ ${r.term} — 拼写正确` : `❌ ${r.term} — 拼写错误`}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={resetAll} style={{ height: 44, padding: "0 16px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontWeight: 900, color: THEME.colors.accent }}>再来一轮</button>
              <button onClick={onExit} style={{ height: 44, padding: "0 16px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontWeight: 900 }}>返回大厅</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <CountStartScreen emoji="🫧" name="气泡拼写" desc="听到单词发音，点击字母气泡按顺序拼出来" sourceLabel={sourceLabel} vocabCount={allFiltered.length}
        onStart={(count) => { setQuestionCount(count); setStarted(true); }} onExit={onExit} />
    );
  }

  if (!card) return null;

  const filledCount = slots.filter((s) => s !== null && s !== " ").length;
  const totalLetters = (card.term || "").split("").filter((c) => c !== " ").length;

  return (
    <div style={shellStyle}>
      <div style={topBar}>
        <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
        <div style={{ fontWeight: 1000 }}>🫧 气泡拼写</div>
        <div style={{ opacity: 0.7, fontWeight: 900 }}>{idx + 1} / {cards.length}</div>
      </div>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px 40px" }}>
        <style>{`
          @keyframes slotPop { 0%{transform:scale(0.5);opacity:0} 60%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
          @keyframes successPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
          @keyframes bubbleAppear { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        `}</style>
        <ProgressBar current={idx} total={cards.length} onExit={onExit} />
        <div style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, padding: "24px 20px 28px", boxShadow: "0 4px 16px rgba(11,18,32,0.08)", animation: successAnim ? "successPulse 400ms ease" : "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button type="button" onClick={handlePlayAudio} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: THEME.radii.pill, background: playingAudio ? THEME.colors.accent : "#eef2ff", border: `1px solid ${playingAudio ? THEME.colors.accent : "#c7d2fe"}`, color: playingAudio ? "#fff" : THEME.colors.accent, fontSize: 13, fontWeight: 800, cursor: "pointer", transition: "all 200ms" }}>
              {playingAudio ? "🔊 播放中..." : "🔊 听发音"}
            </button>
          </div>
          <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {card.data?.zh && (
              <div style={{ padding: "10px 14px", background: "#fffbeb", borderRadius: THEME.radii.md, border: "1px solid #fde68a" }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: "#b45309" }}>中文含义　</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.colors.ink }}>{card.data.zh}</span>
              </div>
            )}
            {card.data?.ipa && (
              <div style={{ padding: "8px 14px", background: "#f8fafc", borderRadius: THEME.radii.md, border: `1px solid ${THEME.colors.border}` }}>
                <span style={{ fontSize: 11, fontWeight: 900, color: THEME.colors.muted }}>音标　</span>
                <span style={{ fontSize: 13, fontFamily: "monospace", color: THEME.colors.muted }}>{card.data.ipa}</span>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: THEME.colors.muted, marginBottom: 10, textAlign: "center" }}>点击字母拼出答案 · {filledCount}/{totalLetters} 个字母</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", minHeight: 52, padding: "8px 12px", background: "#f8fafc", borderRadius: THEME.radii.md, border: `2px dashed ${checked ? (isCorrect ? "#22c55e" : "#ef4444") : "#c7d2fe"}`, transition: "border-color 300ms" }}>
              {slots.map((s, i) => {
                if (s === " ") return <div key={i} style={{ width: 14 }} />;
                const filled = s && s !== " ";
                const letterCorrect = filled ? s.correct : null;
                return (
                  <div key={i} style={{ width: 38, height: 42, borderRadius: 10, border: `2px solid ${filled ? (letterCorrect ? "#22c55e" : "#ef4444") : "#c7d2fe"}`, background: filled ? (letterCorrect ? "#f0fdf4" : "#fff5f5") : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 1000, color: filled ? (letterCorrect ? "#16a34a" : "#dc2626") : "#4f46e5", transition: "all 200ms", animation: filled && !checked ? "slotPop 300ms ease" : "none", boxShadow: filled ? `0 2px 8px ${letterCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}` : "none" }}>
                    {filled ? s.letter : ""}
                  </div>
                );
              })}
            </div>
          </div>
          {checked && !isCorrect && (
            <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: THEME.radii.md, background: "#fff5f5", border: "1px solid #fecaca" }}>
              <div style={{ fontWeight: 1000, color: "#dc2626", marginBottom: 6 }}>✗ 拼写有误</div>
              <div style={{ fontSize: 13, color: THEME.colors.ink }}>正确拼写：<strong style={{ color: "#dc2626", fontSize: 16 }}>{card.term}</strong></div>
              {card.data?.zh && <div style={{ fontSize: 12, color: THEME.colors.muted, marginTop: 4 }}>{card.data.zh}</div>}
            </div>
          )}
          {checked && isCorrect && (
            <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: THEME.radii.md, background: "#f0fdf4", border: "1px solid #bbf7d0", textAlign: "center" }}>
              <div style={{ fontWeight: 1000, color: "#16a34a", fontSize: 15 }}>✓ 拼写正确！</div>
            </div>
          )}
          {!checked && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 900, color: THEME.colors.muted, marginBottom: 10, textAlign: "center" }}>点击字母气泡填入答案</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", minHeight: 56 }}>
                {bubbles.filter((b) => !b.used).map((b, i) => {
                  const colorScheme = bubbleColors[b.id % bubbleColors.length];
                  return (
                    <button key={b.id} type="button" onClick={() => handleBubbleClick(b.id)} style={{ width: 48, height: 48, borderRadius: "50%", background: colorScheme.bg, border: "none", color: "#fff", fontSize: 18, fontWeight: 1000, cursor: "pointer", boxShadow: `0 4px 14px ${colorScheme.shadow}`, animation: `bubbleAppear ${200 + i * 40}ms ease both`, transition: "transform 100ms, box-shadow 100ms", userSelect: "none" }}>
                      {b.letter}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
            {!checked && (
              <button type="button" onClick={handleReset} style={{ padding: "9px 20px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, fontSize: 13, fontWeight: 900, color: THEME.colors.muted, cursor: "pointer" }}>🔄 重新排列</button>
            )}
            {checked && !isCorrect && (
              <button type="button" onClick={handleNext} style={{ padding: "10px 28px", borderRadius: THEME.radii.pill, background: THEME.colors.ink, color: "#fff", border: "none", fontSize: 14, fontWeight: 1000, cursor: "pointer" }}>{isLast ? "完成" : "下一题"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


const MATCH_TIME = 60;
const BATCH_SIZE = 5;

function MatchMadnessGame({ vocabItems, onExit, onGameEnd, maxQuestions = 10, sourceLabel = "我的收藏" }) {
  const cards = useMemo(() => shuffle(vocabItems || []).slice(0, maxQuestions), [vocabItems, maxQuestions]);
  const border2 = THEME.colors.border2 || THEME.colors.border;

  const [batch, setBatch] = useState([]);
  const [leftSel, setLeftSel] = useState(null);
  const [rightSel, setRightSel] = useState(null);
  const [matched, setMatched] = useState(new Set());
  const [flash, setFlash] = useState(null);
  const [shake, setShake] = useState(false);
  const [timeLeft, setTimeLeft] = useState(MATCH_TIME);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [done, setDone] = useState(false);
  const endCalledRef = useRef(false);
  const scoreRef = useRef(0);
  const deckRef = useRef([...cards].sort(() => Math.random() - 0.5));
  const offsetRef = useRef(0);
  const timerRef = useRef(null);
  const [rightOrder, setRightOrder] = useState([]);

  function endGame() {
    clearInterval(timerRef.current);
    setDone(true);
    if (!endCalledRef.current) {
      endCalledRef.current = true;
      try { onGameEnd?.(scoreRef.current); } catch {}
    }
  }

  function loadNextBatch() {
    const deck = deckRef.current;
    const start = offsetRef.current;
    // 词打完了就重新洗牌循环，不提前结束
    if (start >= deck.length) {
      deckRef.current = shuffle([...cards]);
      offsetRef.current = 0;
    }
    const newDeck = deckRef.current;
    const newStart = offsetRef.current;
    const next = newDeck.slice(newStart, newStart + BATCH_SIZE);
    offsetRef.current = newStart + next.length;
    setBatch(next);
    setMatched(new Set());
    setLeftSel(null);
    setRightSel(null);
    setRightOrder([...next].sort(() => Math.random() - 0.5));
  }

  useEffect(() => {
    loadNextBatch();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setDone(true);
          if (!endCalledRef.current) {
            endCalledRef.current = true;
            try { onGameEnd?.(scoreRef.current); } catch {}
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (batch.length > 0 && matched.size === batch.length) {
      setTimeout(loadNextBatch, 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched]);

  function tryMatch(lId, rId) {
    const correct = lId === rId;
    if (correct) {
      const newMatched = new Set([...matched, lId]);
      setMatched(newMatched);
      const newCombo = combo + 1;
      setCombo(newCombo);
      setBestCombo((b) => Math.max(b, newCombo));
      setScore((s) => { const ns = s + 10 + newCombo * 2; scoreRef.current = ns; return ns; });
      setFlash({ id: lId, ok: true });
      setTimeout(() => setFlash(null), 400);
    } else {
      setCombo(0);
      setTimeLeft((t) => Math.max(0, t - 3));
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setLeftSel(null);
    setRightSel(null);
  }

  function handleLeft(id) {
    if (matched.has(id) || done) return;
    setLeftSel(id);
    if (rightSel !== null) tryMatch(id, rightSel);
  }

  function handleRight(id) {
    if (matched.has(id) || done) return;
    setRightSel(id);
    if (leftSel !== null) tryMatch(leftSel, id);
  }

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "8px 6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
          <div style={{ fontWeight: 1000 }}>🔗 极速连连看</div>
          <div />
        </div>
        <div style={{ maxWidth: 720, margin: "18px auto 0" }}>
          <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 18, boxShadow: "0 12px 30px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本局结束</div>
            <div style={{ marginTop: 10, opacity: 0.85, fontWeight: 900 }}>得分：<b>{score}</b>　·　最高连击：<b>{bestCombo}</b></div>
            <ScoreResult score={score} gameId="match" />
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => {
                endCalledRef.current = false;
                deckRef.current = [...cards].sort(() => Math.random() - 0.5);
                offsetRef.current = 0;
                setTimeLeft(MATCH_TIME); setScore(0); scoreRef.current = 0; setCombo(0); setBestCombo(0); setDone(false);
                loadNextBatch();
                clearInterval(timerRef.current);
                timerRef.current = setInterval(() => {
                  setTimeLeft((t) => {
                    if (t <= 1) { clearInterval(timerRef.current); setDone(true); if (!endCalledRef.current) { endCalledRef.current = true; try { onGameEnd?.(scoreRef.current); } catch {} } return 0; }
                    return t - 1;
                  });
                }, 1000);
              }} style={{ height: 44, padding: "0 16px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontWeight: 900 }}>再来一局</button>
              <button onClick={onExit} style={{ height: 44, padding: "0 16px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontWeight: 900 }}>返回大厅</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const timePct = (timeLeft / MATCH_TIME) * 100;
  const timeColor = timeLeft > 15 ? "#22c55e" : timeLeft > 8 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "8px 6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
        <div style={{ fontWeight: 1000 }}>🔗 极速连连看</div>
        <div style={{ opacity: 0.7, fontWeight: 900 }}>剩余 {timeLeft}s</div>
      </div>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "8px 16px 40px" }}>
        <style>{`
          @keyframes matchShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
          @keyframes matchPop { 0%{transform:scale(1)} 40%{transform:scale(1.08)} 100%{transform:scale(1)} }
        `}</style>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ fontSize: 20, fontWeight: 1000, color: THEME.colors.ink }}>🔗 {score}</span>
              {combo >= 2 && <span style={{ fontSize: 13, fontWeight: 900, padding: "3px 10px", borderRadius: 999, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", animation: "matchPop 300ms ease" }}>🔥 {combo}连击</span>}
            </div>
            <button type="button" onClick={onExit} style={{ fontSize: 13, color: THEME.colors.muted, background: "none", border: "none", cursor: "pointer", fontWeight: 900 }}>退出</button>
          </div>
          <div style={{ height: 10, background: "#e8eaf0", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ height: "100%", borderRadius: 999, width: `${timePct}%`, background: `linear-gradient(90deg, ${timeColor}, ${timeColor}cc)`, transition: "width 1s linear, background 0.5s", boxShadow: `0 0 8px ${timeColor}88` }} />
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: timeColor, fontWeight: 900, marginTop: 4 }}>{timeLeft}s</div>
        </div>
        <div style={{ animation: shake ? "matchShake 500ms ease" : "none", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {batch.map((card) => {
              const isMatched = matched.has(card.id);
              const isSelected = leftSel === card.id;
              const isFlashing = flash?.id === card.id;
              return (
                <button key={card.id} type="button" onClick={() => handleLeft(card.id)} style={{ padding: "12px 14px", borderRadius: 14, border: "2px solid", borderColor: isMatched ? "#bbf7d0" : isSelected ? THEME.colors.accent : border2, background: isMatched ? "#f0fdf4" : isSelected ? "#eef2ff" : THEME.colors.surface, color: isMatched ? "#16a34a" : isSelected ? THEME.colors.accent : THEME.colors.ink, fontSize: 14, fontWeight: 900, cursor: isMatched ? "default" : "pointer", textAlign: "center", transition: "all 150ms", opacity: isMatched ? 0.45 : 1, animation: isFlashing ? "matchPop 400ms ease" : "none", boxShadow: isSelected ? "0 0 0 3px rgba(99,102,241,0.20)" : "none", textDecoration: isMatched ? "line-through" : "none" }}>
                  {card.term}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rightOrder.map((card) => {
              const isMatched = matched.has(card.id);
              const isSelected = rightSel === card.id;
              const isFlashing = flash?.id === card.id;
              return (
                <button key={card.id} type="button" onClick={() => handleRight(card.id)} style={{ padding: "12px 14px", borderRadius: 14, border: "2px solid", borderColor: isMatched ? "#bbf7d0" : isSelected ? "#ec4899" : border2, background: isMatched ? "#f0fdf4" : isSelected ? "#fdf2f8" : THEME.colors.surface, color: isMatched ? "#16a34a" : isSelected ? "#db2777" : THEME.colors.ink, fontSize: 13, fontWeight: 900, cursor: isMatched ? "default" : "pointer", textAlign: "center", transition: "all 150ms", opacity: isMatched ? 0.45 : 1, animation: isFlashing ? "matchPop 400ms ease" : "none", boxShadow: isSelected ? "0 0 0 3px rgba(236,72,153,0.20)" : "none", textDecoration: isMatched ? "line-through" : "none" }}>
                  {card.data?.zh || "（无释义）"}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: THEME.colors.faint, fontWeight: 900 }}>本轮 {matched.size}/{batch.length} · 最高连击 {bestCombo}</div>
      </div>
    </div>
  );
}


function SwipeGame({ vocabItems, onExit, onGameEnd, sourceLabel = "我的收藏" }) {
  const pool = useMemo(() => shuffle(vocabItems || []), [vocabItems]);
  const TIMER_SECONDS = 45;
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [records, setRecords] = useState([]);
  const endCalledRef = useRef(false);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [animating, setAnimating] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const pointerIdRef = useRef(null);
  const items = pool;
  const total = items.length;
  const current = items[total > 0 ? idx % total : 0] || null;
  const [cardMeaning, setCardMeaning] = useState("");
  const [isMeaningCorrect, setIsMeaningCorrect] = useState(true);

  useEffect(() => { setStarted(true); }, []);
  const timeLeft = useCountdown(started ? TIMER_SECONDS : 0, () => setDone(true));

  useEffect(() => {
    if (done) return;
    if (!current) return;
    const correctMeaning = current?.data?.zh || "";
    const shouldBeCorrect = Math.random() < 0.5;
    if (shouldBeCorrect || items.length < 2) { setCardMeaning(correctMeaning); setIsMeaningCorrect(true); return; }
    const others = items.filter((x) => x?.id !== current?.id);
    const other = pickOne(others) || pickOne(items);
    const wrongMeaning = other?.data?.zh || "";
    if (!wrongMeaning || wrongMeaning === correctMeaning) { setCardMeaning(correctMeaning); setIsMeaningCorrect(true); return; }
    setCardMeaning(wrongMeaning);
    setIsMeaningCorrect(false);
  }, [idx, current, items, done]);

  useEffect(() => {
    if (!done) return;
    const score = correct * 10;
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    try { onGameEnd?.(score); } catch {}
  }, [done, correct, onGameEnd]);

  const threshold = useMemo(() => { if (typeof window === "undefined") return 120; return Math.max(120, window.innerWidth / 4); }, []);

  function judge(dir) {
    if (!current || animating || done) return;
    const choseMatch = dir === "right";
    const shouldMatch = isMeaningCorrect;
    const ok = choseMatch === shouldMatch;
    const correctMeaning = current?.data?.zh || "";
    setRecords((prev) => [...prev, { term: current?.term || "", displayedMeaning: cardMeaning || "", correctMeaning: correctMeaning || "", wasCorrect: ok, isMatchQuestion: isMeaningCorrect, userChoseMatch: choseMatch }]);
    if (ok) setCorrect((c) => c + 1);
    setAnimating(true);
    const flyX = choseMatch ? (typeof window !== "undefined" ? window.innerWidth : 1200) : (typeof window !== "undefined" ? -window.innerWidth : -1200);
    setDx(flyX);
    setDy(dy * 0.2);
    setTimeout(() => {
      setAnimating(false); setDragging(false); setDx(0); setDy(0);
      if (idx + 1 >= total * 3) setIdx(0);
      else setIdx((i) => i + 1);
    }, 320);
  }

  function onPointerDown(e) {
    if (done || animating) return;
    pointerIdRef.current = e.pointerId;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
  }
  function onPointerMove(e) {
    if (!dragging || animating) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    setDx(e.clientX - startRef.current.x);
    setDy(e.clientY - startRef.current.y);
  }
  function onPointerUp(e) {
    if (!dragging || animating) return;
    if (pointerIdRef.current != null && e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    if (Math.abs(dx) >= threshold) { judge(dx > 0 ? "right" : "left"); return; }
    setAnimating(true); setDx(0); setDy(0);
    setTimeout(() => setAnimating(false), 220);
    setDragging(false);
  }

  useEffect(() => {
    function onKey(e) {
      if (done) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); judge("left"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); judge("right"); }
    }
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [done, animating, idx, isMeaningCorrect, cardMeaning]);

  const rotate = clamp(dx / 20, -15, 15);
  const showLeft = dx < -30;
  const showRight = dx > 30;
  const shellStyle = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box" };
  const topBarStyle = { display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", padding: "8px 6px 14px", maxWidth: 980, margin: "0 auto" };
  const cardWrap = { position: "relative", maxWidth: 560, margin: "0 auto", paddingTop: 6 };
  const cardStyle = { background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, boxShadow: "0 10px 30px rgba(15,23,42,0.10)", padding: "22px 18px", userSelect: "none", touchAction: "none", transform: `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`, transition: animating ? "transform 0.3s ease" : dragging ? "none" : "transform 0.2s ease" };
  const btnRow = { maxWidth: 560, margin: "14px auto 0", display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" };
  const bigBtnBase = { height: 52, borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, fontSize: 16, fontWeight: 900, cursor: "pointer" };

  if (done) {
    const score = correct * 10;
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
          <div style={{ fontWeight: 1000 }}>🃏 单词探探</div>
          <div style={{ opacity: 0.7, fontWeight: 900 }}>完成</div>
        </div>
        <div style={{ maxWidth: 760, margin: "22px auto 0", background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}>
          <div style={{ fontSize: 22, fontWeight: 1000, marginBottom: 8 }}>本轮结果</div>
          <div style={{ fontSize: 16, opacity: 0.9, fontWeight: 900, marginBottom: 6 }}>本轮积分：{score} 分</div>
          <ScoreResult score={score} gameId="swipe" />
          <div style={{ fontSize: 15, opacity: 0.85, fontWeight: 900, marginTop: 8 }}>正确：<b>{correct}</b> / <b>{total}</b></div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {records.map((r, i) => {
              const ok = !!r.wasCorrect;
              const text = ok ? `✅ ${r.term} — 你选了${r.userChoseMatch ? "匹配" : "不匹配"}，正确` : `❌ ${r.term} — 展示的释义是「${r.displayedMeaning || "（空）"}」，正确释义是「${r.correctMeaning || "（空）"}」，你选错了`;
              return <div key={`${r.term}-${i}`} style={{ padding: 12, borderRadius: THEME.radii.md, background: ok ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)", border: `1px solid ${ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, fontWeight: 900, lineHeight: 1.35 }}>{text}</div>;
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <button onClick={() => { endCalledRef.current = false; setIdx(0); setCorrect(0); setDone(false); setRecords([]); setDx(0); setDy(0); setStarted(false); setTimeout(() => setStarted(true), 50); }} style={{ ...bigBtnBase, padding: "0 16px", borderColor: THEME.colors.accent, color: THEME.colors.accent }}>再来一轮</button>
            <button onClick={onExit} style={{ ...bigBtnBase, padding: "0 16px" }}>返回大厅</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <div style={topBarStyle}>
        <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
        <div style={{ fontWeight: 1000 }}>🃏 单词探探</div>
        <div style={{ opacity: 0.75, fontWeight: 900 }}>答对 {correct}</div>
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto 10px", padding: "0 14px" }}>
        <TimerBar timeLeft={started ? timeLeft : TIMER_SECONDS} totalSeconds={TIMER_SECONDS} />
      </div>
      <div style={cardWrap}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: 4, left: 6, width: 140, height: 90, borderRadius: 999, background: "rgba(239,68,68,0.15)", filter: "blur(18px)", opacity: showLeft ? 1 : 0, transition: "opacity 0.15s ease" }} />
          <div style={{ position: "absolute", top: 4, right: 6, width: 140, height: 90, borderRadius: 999, background: "rgba(34,197,94,0.15)", filter: "blur(18px)", opacity: showRight ? 1 : 0, transition: "opacity 0.15s ease" }} />
          <div style={{ position: "absolute", top: 14, left: 14, fontSize: 34, opacity: showLeft ? 1 : 0, transition: "opacity 0.15s ease" }}>❌</div>
          <div style={{ position: "absolute", top: 14, right: 14, fontSize: 34, opacity: showRight ? 1 : 0, transition: "opacity 0.15s ease" }}>✅</div>
        </div>
        <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={cardStyle}>
          <div style={{ fontSize: 14, opacity: 0.6, fontWeight: 900 }}>英文</div>
          <div style={{ fontSize: 34, fontWeight: 1000, marginTop: 6, wordBreak: "break-word" }}>{current?.term || "-"}</div>
          <div style={{ height: 14 }} />
          <div style={{ fontSize: 14, opacity: 0.6, fontWeight: 900 }}>中文释义</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 8, lineHeight: 1.35 }}>{cardMeaning || "（无释义）"}</div>
          <div style={{ marginTop: 16, fontSize: 12, opacity: 0.6, fontWeight: 900 }}>左滑❌：不匹配 / 右滑✅：匹配（也可用键盘 ← →）</div>
        </div>
        <div style={btnRow}>
          <button onClick={() => judge("left")} style={{ ...bigBtnBase, background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)" }}>❌ 不匹配</button>
          <div />
          <button onClick={() => judge("right")} style={{ ...bigBtnBase, background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.25)" }}>✅ 匹配</button>
        </div>
      </div>
    </div>
  );
}


function RebuildGame({ vocabItems, onExit, onGameEnd, maxQuestions = 10, sourceLabel = "我的收藏" }) {
  const [questionCount, setQuestionCount] = useState(maxQuestions);
  const [started, setStarted] = useState(false);

  const allPool = useMemo(() => {
    return (vocabItems || []).filter((x) => {
      const k = x?.kind;
      if (k && k !== "words" && k !== "phrases") return false;
      const ex = (x?.data?.example_en || "").trim();
      if (!ex) return false;
      return ex.split(/\s+/).filter(Boolean).length >= 4;
    }).map((x) => ({ ...x, __exampleWords: (x?.data?.example_en || "").trim().split(/\s+/).filter(Boolean) }));
  }, [vocabItems]);

  const pool = useMemo(() => shuffle(allPool).slice(0, questionCount), [allPool, questionCount]);

  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [selected, setSelected] = useState([]);
  const [available, setAvailable] = useState([]);
  const [status, setStatus] = useState("idle");
  const [showAnswer, setShowAnswer] = useState(false);
  const [records, setRecords] = useState([]);
  const endCalledRef = useRef(false);

  const current = pool[i] || null;
  const total = pool.length;

  useEffect(() => {
    if (!current) return;
    const words = current.__exampleWords || [];
    setSelected([]);
    setAvailable(shuffle(words.map((w, idx) => ({ id: `${current.id}-${idx}-${w}`, text: w }))));
    setStatus("idle");
    setShowAnswer(false);
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useMemo(() => (current?.data?.example_en || "").trim(), [current]);
  const normalizedAnswer = useMemo(() => normalizeSentence(answer), [answer]);

  const finished = i >= total;
  useEffect(() => {
    if (!finished) return;
    const pts = score * 10;
    if (endCalledRef.current) return;
    endCalledRef.current = true;
    try { onGameEnd?.(pts); } catch {}
  }, [finished, score, onGameEnd]);

  function pushRecord(term, answerText, userAnswerText, wasCorrect) {
    setRecords((prev) => [...prev, { term: term || "", answer: answerText || "", userAnswer: userAnswerText || "", wasCorrect: !!wasCorrect }]);
  }

  function checkAuto(currentSelected) {
    const userAns = (currentSelected || []).map((x) => x.text).join(" ");
    const now = normalizeSentence(userAns);
    if (!now) return;
    if (now === normalizedAnswer) {
      pushRecord(current?.term || "", answer, userAns, true);
      setStatus("correct");
      setScore((s) => s + 1);
      setTimeout(() => { if (i + 1 >= total) { setI(total); return; } setI((v) => v + 1); }, 950);
    }
  }

  function submit() {
    if (!current) return;
    const userAns = selected.map((x) => x.text).join(" ");
    const now = normalizeSentence(userAns);
    if (now === normalizedAnswer) {
      pushRecord(current?.term || "", answer, userAns, true);
      setStatus("correct"); setScore((s) => s + 1);
      setTimeout(() => { if (i + 1 >= total) { setI(total); return; } setI((v) => v + 1); }, 950);
    } else {
      pushRecord(current?.term || "", answer, userAns, false);
      setStatus("wrong"); setWrongCount((w) => w + 1); setShowAnswer(true);
      setTimeout(() => { setStatus("idle"); setShowAnswer(false); setSelected([]); if (i + 1 >= total) { setI(total); } else { setI((v) => v + 1); } }, 2000);
    }
  }

  function moveToSelected(token) {
    if (status !== "idle") return;
    setAvailable((a) => a.filter((x) => x.id !== token.id));
    setSelected((s) => { const next = [...s, token]; setTimeout(() => checkAuto(next), 0); return next; });
  }

  function moveToAvailable(token) {
    if (status !== "idle") return;
    setSelected((s) => s.filter((x) => x.id !== token.id));
    setAvailable((a) => shuffle([...a, token]));
  }

  const shellStyle = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box" };
  const topBarStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 10px", maxWidth: 980, margin: "0 auto" };
  const card = { background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, boxShadow: "0 10px 28px rgba(15,23,42,0.08)", padding: 14 };
  const tokenBase = { display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "10px 12px", borderRadius: 14, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, boxShadow: "0 6px 14px rgba(15,23,42,0.06)", cursor: "pointer", fontWeight: 900, transition: "transform 0.12s ease, background 0.12s ease", userSelect: "none" };
  const answerTokenBorder = status === "correct" ? "rgba(34,197,94,0.7)" : status === "wrong" ? "rgba(239,68,68,0.75)" : THEME.colors.accent;

  if (!pool || pool.length === 0) {
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
          <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
          <div />
        </div>
        <div style={{ maxWidth: 720, margin: "16px auto 0" }}>
          <div style={{ ...card, textAlign: "center", padding: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 1000 }}>没有可用例句</div>
            <div style={{ opacity: 0.7, marginTop: 8, fontWeight: 900 }}>需要收藏带英文例句的词汇（example_en 不为空，且至少 4 个单词）。</div>
            <button onClick={onExit} style={{ marginTop: 14, height: 44, padding: "0 16px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontWeight: 900 }}>返回大厅</button>
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return <CountStartScreen emoji="🧩" name="台词磁力贴" desc="把打乱的单词重新排列成正确句子" sourceLabel={sourceLabel} vocabCount={allPool.length} onStart={(count) => { setQuestionCount(count); setStarted(true); }} onExit={onExit} />;
  }

  if (i >= total) {
    const pts = score * 10;
    return (
      <div style={shellStyle}>
        <div style={topBarStyle}>
          <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
          <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
          <div style={{ opacity: 0.7, fontWeight: 900 }}>完成</div>
        </div>
        <div style={{ maxWidth: 820, margin: "18px auto 0" }}>
          <div style={{ ...card, padding: 18 }}>
            <div style={{ fontSize: 22, fontWeight: 1000 }}>本轮结算</div>
            <div style={{ marginTop: 10, opacity: 0.9, fontWeight: 1000 }}>答对 <b>{score}</b> 题，获得 <b>{pts}</b> 分　·　错误次数：<b>{wrongCount}</b></div>
            <ScoreResult score={pts} gameId="rebuild" />
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {records.map((r, idx) => {
                const ok = !!r.wasCorrect;
                return (
                  <div key={`${r.term}-${idx}`} style={{ padding: 12, borderRadius: THEME.radii.md, background: ok ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)", border: `1px solid ${ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, fontWeight: 900, lineHeight: 1.35 }}>
                    <div>{ok ? `✅ ${r.term} — 回答正确` : `❌ ${r.term} — 你的答案：${r.userAnswer || "（空）"}`}</div>
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, opacity: 0.75 }}>{ok ? `正确句子：${r.answer}` : `正确答案：${r.answer}`}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button onClick={() => { endCalledRef.current = false; setI(0); setScore(0); setWrongCount(0); setRecords([]); setStarted(false); }} style={{ height: 44, padding: "0 16px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontWeight: 900, color: THEME.colors.accent }}>再来一轮</button>
              <button onClick={onExit} style={{ height: 44, padding: "0 16px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", fontWeight: 900 }}>返回大厅</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = total ? (i / total) * 100 : 0;

  return (
    <div style={shellStyle}>
      <div style={topBarStyle}>
        <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
        <div style={{ fontWeight: 1000 }}>🧩 台词磁力贴</div>
        <div style={{ opacity: 0.75, fontWeight: 1000 }}>{Math.min(i + 1, total)} / {total}</div>
      </div>
      <div style={{ maxWidth: 920, margin: "0 auto 10px" }}>
        <div style={{ height: 8, background: THEME.colors.faint, borderRadius: 999, overflow: "hidden", border: `1px solid ${THEME.colors.border}` }}>
          <div style={{ width: `${progress}%`, height: "100%", background: THEME.colors.accent }} />
        </div>
      </div>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>当前词汇</div>
              <div style={{ fontSize: 26, fontWeight: 1000, marginTop: 4, wordBreak: "break-word" }}>{current?.term || "-"} <span style={{ fontSize: 14, opacity: 0.7, fontWeight: 900 }}>{current?.data?.ipa ? `/${current.data.ipa}/` : ""}</span></div>
              <div style={{ marginTop: 6, opacity: 0.85, fontWeight: 900 }}>{current?.data?.zh || "（无释义）"}</div>
              {current?.data?.example_zh ? <div style={{ marginTop: 10, opacity: 0.55, fontWeight: 900, lineHeight: 1.35 }}>提示：{current.data.example_zh}</div> : null}
            </div>
          </div>
          <div style={{ height: 14 }} />
          <div style={{ border: `1px dashed ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: 12, minHeight: 86, background: "rgba(79,70,229,0.04)" }}>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900 }}>答题区</div>
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {selected.length === 0 ? <div style={{ opacity: 0.55, fontWeight: 900 }}>点击下方方块，把句子拼回来…</div> : null}
              {selected.map((t) => (
                <div key={t.id} onClick={() => moveToAvailable(t)} style={{ ...tokenBase, borderColor: answerTokenBorder, background: status === "correct" ? "rgba(34,197,94,0.10)" : status === "wrong" ? "rgba(239,68,68,0.10)" : THEME.colors.surface, animation: status === "wrong" ? "shakeX 0.28s ease-in-out 0s 2" : "none" }}>{t.text}</div>
              ))}
            </div>
            {showAnswer ? <div style={{ marginTop: 10, opacity: 0.85 }}><div style={{ fontSize: 12, fontWeight: 900, opacity: 0.65 }}>正确答案</div><div style={{ fontWeight: 1000, marginTop: 4 }}>{answer}</div></div> : null}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={submit} disabled={status !== "idle"} style={{ height: 40, padding: "0 14px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: status === "idle" ? "pointer" : "not-allowed", fontWeight: 1000, opacity: status === "idle" ? 1 : 0.6 }}>提交</button>
            </div>
          </div>
          <div style={{ height: 14 }} />
          <div style={{ padding: 2 }}>
            <div style={{ fontSize: 12, opacity: 0.65, fontWeight: 900, marginBottom: 8 }}>待选区</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {available.map((t) => (
                <div key={t.id} onClick={() => moveToSelected(t)} style={{ ...tokenBase, background: "rgba(79,70,229,0.04)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(79,70,229,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(79,70,229,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                  {t.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes shakeX { 0%{transform:translateX(0)} 25%{transform:translateX(-6px)} 50%{transform:translateX(6px)} 75%{transform:translateX(-4px)} 100%{transform:translateX(0)} }`}</style>
    </div>
  );
}


function BalloonGame({ vocabItems, onExit, onGameEnd, sourceLabel = "我的收藏" }) {
  const pool = useMemo(() => shuffle((vocabItems || []).filter(x => { const k = x?.kind; return !k || k === "words"; })), [vocabItems]);
  const TIMER_SECONDS = 60;
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const endCalledRef = useRef(false);
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const [currentWord, setCurrentWord] = useState(null);
  const [balloons, setBalloons] = useState([]);
  const [answered, setAnswered] = useState(false);
  const roundTimerRef = useRef(null);
  const roundIdRef = useRef(0);

  const balloonColors = [
    { bg: "#ff6b9d", shadow: "rgba(255,107,157,0.4)" }, { bg: "#74b9ff", shadow: "rgba(116,185,255,0.4)" },
    { bg: "#55efc4", shadow: "rgba(85,239,196,0.4)" }, { bg: "#fdcb6e", shadow: "rgba(253,203,110,0.4)" },
    { bg: "#a29bfe", shadow: "rgba(162,155,254,0.4)" }, { bg: "#fd79a8", shadow: "rgba(253,121,168,0.4)" },
  ];

  const timeLeft = useCountdown(started ? TIMER_SECONDS : 0, () => {
    gameOverRef.current = true;
    setGameOver(true);
    if (!endCalledRef.current) {
      endCalledRef.current = true;
      try { onGameEnd?.(scoreRef.current); } catch {}
    }
  });

  function startRound() {
    if (!pool || pool.length < 2) return;
    if (gameOverRef.current) return;
    const rid = (roundIdRef.current += 1);
    const word = pickOne(pool);
    const correctMeaning = word?.data?.zh || "";
    const otherMeanings = shuffle(pool.filter(x => x?.id !== word?.id).map(x => x?.data?.zh || "").filter(Boolean)).slice(0, 5);
    const texts = shuffle([correctMeaning, ...otherMeanings]).slice(0, 6);
    const positions = shuffle([0,1,2,3,4,5]);
    const newBalloons = texts.map((txt, i) => ({ id: `${rid}-${i}`, text: txt, correct: txt === correctMeaning, left: 5 + positions[i] * 10 + Math.random() * 2, duration: 7 + Math.random() * 3, delay: i * 0.4, color: balloonColors[i % balloonColors.length], popped: false }));
    setCurrentWord(word); setBalloons(newBalloons); setAnswered(false);
    playWord(word?.term);
    const maxTime = (7 + 3 + 5 * 0.4 + 1) * 1000;
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    roundTimerRef.current = setTimeout(() => {
      if (roundIdRef.current !== rid) return;
      setAnswered(true); setCombo(0);
      setTimeout(() => { if (roundIdRef.current !== rid) return; startRound(); }, 600);
    }, maxTime);
  }

  function clickBalloon(b) {
    unlockAudio();
    if (gameOver || answered || b.popped) return;
    setAnswered(true);
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    setBalloons(prev => prev.map(x => x.id === b.id ? { ...x, popped: true } : x));
    const rid = roundIdRef.current;
    if (b.correct) {
      setScore(s => { const ns = s + 10; scoreRef.current = ns; return ns; });
      setCombo(c => { const n = c + 1; setMaxCombo(m => Math.max(m, n)); return n; });
      try { if (navigator.vibrate) navigator.vibrate(20); } catch {}
    } else { setCombo(0); }
    setTimeout(() => { if (roundIdRef.current !== rid) return; startRound(); }, 500);
  }

  useEffect(() => { setStarted(true); }, []);
  useEffect(() => {
    if (!started) return;
    startRound();
    return () => { if (roundTimerRef.current) clearTimeout(roundTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  if (gameOver) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 10px", maxWidth: 980, margin: "0 auto" }}>
          <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
          <div style={{ fontWeight: 1000 }}>🎧 盲听气球</div>
          <div />
        </div>
        <div style={{ maxWidth: 500, margin: "40px auto", background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎈</div>
          <div style={{ fontSize: 22, fontWeight: 1000, marginBottom: 8 }}>时间到！</div>
          <div style={{ fontSize: 32, fontWeight: 1000, color: THEME.colors.accent, marginBottom: 6 }}>{score} 分</div>
          <div style={{ fontSize: 14, color: THEME.colors.faint, marginBottom: 24 }}>最高连击 {maxCombo} 次</div>
          <ScoreResult score={score} gameId="balloon" />
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <button onClick={() => { setScore(0); scoreRef.current = 0; setCombo(0); setMaxCombo(0); setGameOver(false); endCalledRef.current = false; gameOverRef.current = false; setStarted(false); setTimeout(() => setStarted(true), 50); }}
              style={{ padding: "10px 24px", borderRadius: THEME.radii.pill, background: "#f59e0b", color: "#fff", border: "none", fontWeight: 1000, cursor: "pointer" }}>再来一轮</button>
            <button onClick={onExit} style={{ padding: "10px 24px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, fontWeight: 900, cursor: "pointer" }}>返回大厅</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 6px", maxWidth: 980, margin: "0 auto" }}>
        <button onClick={onExit} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 900 }}>← 返回大厅</button>
        <div style={{ fontWeight: 1000 }}>🎧 盲听气球</div>
        <button onClick={() => playWord(currentWord?.term)} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", cursor: "pointer", fontWeight: 1000 }}>再听 🔁</button>
      </div>
      <div style={{ maxWidth: 980, margin: "0 auto 6px", padding: "0 6px" }}>
        <TimerBar timeLeft={started ? timeLeft : TIMER_SECONDS} totalSeconds={TIMER_SECONDS} />
      </div>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "0 6px", alignItems: "center" }}>
        <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.pill, padding: "8px 12px", fontWeight: 1000, textAlign: "center" }}>分数：{score}</div>
        <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.pill, padding: "8px 12px", fontWeight: 1000, textAlign: "center" }}>{combo >= 3 ? <>🔥x{combo}</> : <>连击：{combo}</>}</div>
      </div>
      <div style={{ maxWidth: 980, margin: "6px auto 0", padding: "0 6px", opacity: 0.6, fontWeight: 900, fontSize: 13 }}>听发音，戳破正确释义的气球</div>
      <style>{`
        @keyframes floatUp { from{transform:translateY(0);opacity:1} to{transform:translateY(-108vh);opacity:0.15} }
        @keyframes balloonPop { 0%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.8} 100%{transform:scale(0);opacity:0} }
      `}</style>
      <div style={{ position: "relative", width: "100%", height: "72vh", marginTop: 6, overflow: "hidden" }}>
        {balloons.map((b) => (
          <div key={b.id} onClick={() => clickBalloon(b)} style={{ position: "absolute", bottom: "-130px", left: `${b.left}%`, width: 60, maxWidth: "calc(100% - 10px)", cursor: answered ? "default" : "pointer", userSelect: "none", animation: b.popped ? "balloonPop 0.4s ease-out forwards" : `floatUp ${b.duration}s linear ${b.delay}s forwards` }}>
            <div style={{ width: 60, height: 70, borderRadius: "50% 50% 50% 50% / 55% 55% 45% 45%", background: b.color.bg, boxShadow: `0 8px 20px ${b.color.shadow}, inset 6px 6px 12px rgba(255,255,255,0.28), inset -3px -3px 8px rgba(0,0,0,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 5px", textAlign: "center", fontSize: 11, fontWeight: 900, color: "#fff", lineHeight: 1.25, textShadow: "0 1px 3px rgba(0,0,0,0.35)", position: "relative" }}>
              <div style={{ position: "absolute", top: "12%", left: "18%", width: "24%", height: "14%", borderRadius: "50%", background: "rgba(255,255,255,0.42)", pointerEvents: "none" }} />
              <span style={{ position: "relative", zIndex: 1 }}>{b.text}</span>
            </div>
            <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `7px solid ${b.color.bg}`, margin: "0 auto", filter: "brightness(0.75)" }} />
            <div style={{ width: 1, height: 32, background: "rgba(80,80,80,0.25)", margin: "0 auto" }} />
          </div>
        ))}
      </div>
    </div>
  );
}


function SpeedGame({ vocabItems, onExit, onGameEnd, sourceLabel = "我的收藏" }) {
  const items = useMemo(() => shuffle(vocabItems || []), [vocabItems]);
  const TIMER_SECONDS = 45;
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [word, setWord] = useState(null);
  const [leftText, setLeftText] = useState("");
  const [rightText, setRightText] = useState("");
  const [correctSide, setCorrectSide] = useState("left");
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [cracked, setCracked] = useState(false);
  const endCalledRef = useRef(false);
  const scoreRef = useRef(0);
  const limitMs = useMemo(() => clamp(3000 - combo * 120, 1500, 3000), [combo]);
  const startTsRef = useRef(0);
  const rafRef = useRef(null);
  const [tRatio, setTRatio] = useState(1);

  useEffect(() => { setStarted(true); }, []);
  const timeLeft = useCountdown(started ? TIMER_SECONDS : 0, () => {
    stopTimer();
    setGameOver(true);
    if (!endCalledRef.current) {
      endCalledRef.current = true;
      setCombo(c => { setMaxCombo(m => Math.max(m, c)); return c; });
      try { onGameEnd?.(scoreRef.current); } catch {}
    }
  });

  function pickQuestion() {
    if (!items || items.length < 2) return;
    const w = pickOne(items);
    const correctMeaning = w?.data?.zh || "";
    const others = items.filter((x) => x?.id !== w?.id);
    const wrong = pickOne(others);
    const wrongMeaning = wrong?.data?.zh || "";
    const correctIsLeft = Math.random() < 0.5;
    setWord(w); setCorrectSide(correctIsLeft ? "left" : "right");
    setLeftText(correctIsLeft ? correctMeaning : wrongMeaning);
    setRightText(correctIsLeft ? wrongMeaning : correctMeaning);
    setCracked(false);
  }

  function stopTimer() { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  function startTimer() {
    stopTimer();
    startTsRef.current = performance.now();
    setTRatio(1);
    const tick = () => {
      const elapsed = performance.now() - startTsRef.current;
      const ratio = clamp(1 - elapsed / limitMs, 0, 1);
      setTRatio(ratio);
      if (ratio <= 0) { setCombo(0); setRound(r => r + 1); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function answer(side) {
    if (gameOver) return;
    const ok = side === correctSide;
    stopTimer();
    if (ok) {
      const nextCombo = combo + 1;
      setCombo(nextCombo); setMaxCombo((m) => Math.max(m, nextCombo));
      setScore((s) => { const ns = s + 10 * nextCombo; scoreRef.current = ns; return ns; });
      try { if (navigator.vibrate) navigator.vibrate(30); } catch {}
    } else { setCracked(true); setCombo(0); }
    setTimeout(() => setRound(r => r + 1), ok ? 0 : 300);
  }

  useEffect(() => { if (!items || items.length < 2) return; if (gameOver) return; pickQuestion(); }, [round, items]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!word || gameOver) return; startTimer(); return () => stopTimer(); }, [word?.id, limitMs, gameOver]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopTimer(), []);

  const shellStyle = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, boxSizing: "border-box" };
  const topHud = { position: "sticky", top: 0, zIndex: 5, padding: 12, background: "rgba(246,247,251,0.88)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${THEME.colors.border}` };
  const hudRow = { maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };
  const pill = { background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.pill, padding: "8px 12px", fontWeight: 1000, boxShadow: "0 10px 22px rgba(15,23,42,0.06)", display: "inline-flex", alignItems: "center", gap: 6 };

  if (gameOver) {
    return (
      <div style={shellStyle}>
        <div style={topHud}><div style={hudRow}>
          <button onClick={onExit} style={{ ...pill, cursor: "pointer" }}>← 返回大厅</button>
          <div style={{ fontWeight: 1000 }}>⚡ 极速二选一</div>
          <div style={pill}>完成</div>
        </div></div>
        <div style={{ maxWidth: 500, margin: "40px auto", padding: "0 14px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 22, fontWeight: 1000, marginBottom: 8 }}>时间到！</div>
          <div style={{ fontSize: 32, fontWeight: 1000, color: THEME.colors.accent, marginBottom: 6 }}>{score} 分</div>
          <div style={{ fontSize: 14, color: THEME.colors.faint, marginBottom: 24 }}>最高连击 {maxCombo} 次</div>
          <ScoreResult score={score} gameId="speed" />
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
            <button onClick={() => { setScore(0); scoreRef.current = 0; setCombo(0); setMaxCombo(0); setGameOver(false); setRound(0); endCalledRef.current = false; setStarted(false); setTimeout(() => setStarted(true), 50); }}
              style={{ padding: "10px 24px", borderRadius: THEME.radii.pill, background: THEME.colors.accent, color: "#fff", border: "none", fontWeight: 1000, cursor: "pointer" }}>再来一轮</button>
            <button onClick={onExit} style={{ padding: "10px 24px", borderRadius: THEME.radii.pill, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, fontWeight: 900, cursor: "pointer" }}>返回大厅</button>
          </div>
        </div>
      </div>
    );
  }

  const termStyle = { fontSize: clamp(typeof window !== "undefined" ? Math.min(36, 260 / Math.max((word?.term || "").length, 1)) : 28, 18, 36), fontWeight: 1000, lineHeight: 1.2, letterSpacing: "-0.02em" };
  const choiceBase = { flex: 1, minHeight: 110, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, cursor: "pointer", padding: "14px 10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 1000, textAlign: "center", lineHeight: 1.3, transition: "transform 0.1s, box-shadow 0.1s", boxShadow: "0 6px 20px rgba(15,23,42,0.08)" };

  return (
    <div style={shellStyle}>
      <div style={topHud}>
        <div style={hudRow}>
          <button onClick={onExit} style={{ ...pill, cursor: "pointer" }}>← 返回大厅</button>
          <div style={{ fontWeight: 1000 }}>⚡ 极速二选一</div>
          <div style={pill}>🔥 {combo > 0 ? `x${combo}` : score + "分"}</div>
        </div>
        <div style={{ maxWidth: 980, margin: "8px auto 0" }}>
          <TimerBar timeLeft={started ? timeLeft : TIMER_SECONDS} totalSeconds={TIMER_SECONDS} />
        </div>
        <div style={{ maxWidth: 980, margin: "4px auto 0", textAlign: "center" }}>
          <span style={{ fontSize: 28, fontWeight: 1000, color: tRatio > 0.4 ? THEME.colors.accent : "#ef4444", transition: "color 0.2s", letterSpacing: -1 }}>
            {Math.ceil(tRatio * limitMs / 1000)}
          </span>
        </div>
      </div>
      <div style={{ maxWidth: 560, margin: "28px auto 0", padding: "0 14px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.5, marginBottom: 6, letterSpacing: "0.08em" }}>选出正确释义</div>
          <div style={termStyle}>{word?.term || "…"}</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => answer("left")} style={{ ...choiceBase, borderColor: cracked && correctSide === "left" ? "#ef4444" : THEME.colors.border }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(15,23,42,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,23,42,0.08)"; }}>
            {leftText}
          </button>
          <button onClick={() => answer("right")} style={{ ...choiceBase, borderColor: cracked && correctSide === "right" ? "#ef4444" : THEME.colors.border }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(15,23,42,0.12)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(15,23,42,0.08)"; }}>
            {rightText}
          </button>
        </div>
      </div>
    </div>
  );
}


function GameCard({ title, subtitle, tag, color, emoji, disabled, onClick, spanFull }) {
  return (
    <div onClick={disabled ? undefined : onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (disabled) return; if (e.key === "Enter" || e.key === " ") onClick?.(); }}
      style={{ position: "relative", background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderLeft: `4px solid ${disabled ? THEME.colors.border : color}`, borderRadius: THEME.radii.lg, padding: 14, boxShadow: "0 10px 26px rgba(15,23,42,0.08)", cursor: disabled ? "not-allowed" : "pointer", minHeight: 118, display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "transform 0.12s ease, box-shadow 0.12s ease", gridColumn: spanFull ? "1 / -1" : undefined, opacity: disabled ? 0.78 : 1 }}
      onMouseEnter={(e) => { if (disabled) return; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 32px rgba(15,23,42,0.10)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 10px 26px rgba(15,23,42,0.08)"; }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 26 }}>{emoji}</div>
          <div style={{ fontSize: 18, fontWeight: 1000, color: THEME.colors.ink }}>{title}</div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7, fontWeight: 900, lineHeight: 1.35 }}>{subtitle}</div>
        <div style={{ marginTop: 10, display: "inline-flex" }}>
          <span style={{ fontSize: 12, fontWeight: 1000, padding: "6px 10px", borderRadius: THEME.radii.pill, background: disabled ? THEME.colors.faint : `${color}1A`, color: disabled ? THEME.colors.muted : color, border: `1px solid ${disabled ? THEME.colors.border : `${color}33`}` }}>{tag}</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <div style={{ fontWeight: 1000, color: disabled ? THEME.colors.muted : color }}>开始 →</div>
      </div>
      {disabled ? (
        <div style={{ position: "absolute", inset: 0, borderRadius: THEME.radii.lg, background: "rgba(15,23,42,0.52)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 14, textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>🔒</div>
          <div style={{ fontWeight: 1000, fontSize: 13, color: "#fff", lineHeight: 1.4, textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}>收藏单词不足 10 个<br /><span style={{ fontWeight: 900, opacity: 0.8, fontSize: 12 }}>切换内置词库即可练习</span></div>
        </div>
      ) : null}
    </div>
  );
}

export default function PracticeClient({ accessToken: ssrToken }) {
  const [activeGame, setActiveGame] = useState(null);
  const [vocabSource, setVocabSource] = useState("my");
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [me, setMe] = useState(null);
  const [vocabItems, setVocabItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(ssrToken || null);
  const [liveToken, setLiveToken] = useState(ssrToken || null);
  const [scores, setScores] = useState({});

  useEffect(() => {
    try { setScores(loadScores()); } catch { setScores({}); }
  }, []);

  useEffect(() => {
    let mounted = true;
    let subscription = null;
    async function init() {
      try {
        const { createSupabaseBrowserClient } = await import("../../utils/supabase/client");
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.access_token) { tokenRef.current = session.access_token; setLiveToken(session.access_token); }
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          const newToken = session?.access_token ?? null;
          tokenRef.current = newToken; setLiveToken(newToken);
        });
        subscription = data.subscription;
      } catch (e) { console.warn("[PracticeClient] supabase init error:", e); }
    }
    init();
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, []);

  const authFetch = useMemo(() => {
    return function authFetch(url, options = {}) {
      const headers = { ...(options.headers || {}) };
      const t = tokenRef.current;
      if (t) headers["Authorization"] = `Bearer ${t}`;
      return fetch(url, { ...options, headers, credentials: "include" });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      let token = tokenRef.current;
      if (!token) { await new Promise(resolve => setTimeout(resolve, 400)); token = tokenRef.current; }
      try {
        setLoading(true);
        const requests = [authFetch(remote("/api/me")), authFetch(remote("/api/vocab_favorites"))];
        if (token) requests.push(authFetch(remote("/api/game_scores")));
        const [meRes, vocabRes, scoresRes] = await Promise.all(requests);
        const meJson = meRes.ok ? await meRes.json() : null;
        const vocabJson = vocabRes.ok ? await vocabRes.json() : { items: [] };
        if (cancelled) return;
        setMe(meJson);
        setVocabItems(Array.isArray(vocabJson?.items) ? vocabJson.items : []);
        // 合并本地和后端分数，各取最高值
        if (scoresRes && scoresRes.ok) {
          try {
            const scoresJson = await scoresRes.json();
            const remoteScores = scoresJson?.scores || {};
            const local = loadScores();
            const merged = { ...local };
            Object.entries(remoteScores).forEach(([gameId, remote]) => {
              const localBest = Number(local[gameId]?.best || 0);
              const remoteBest = Number(remote?.best || 0);
              if (remoteBest > localBest) {
                merged[gameId] = {
                  best: remoteBest,
                  last: local[gameId]?.last || remoteBest,
                  playCount: Math.max(local[gameId]?.playCount || 0, remote?.playCount || 0),
                };
              }
            });
            setScores(merged);
          } catch { /* 后端分数拉取失败，保持本地缓存 */ }
        }
      } catch { if (!cancelled) { setMe(null); setVocabItems([]); } }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveToken]);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const isMember = !!(me?.is_member);
  const activeVocab = vocabSource === "builtin" ? BUILTIN_VOCAB : vocabItems;
  const sourceLabel = vocabSource === "builtin" ? "内置词库" : "我的收藏";
  const myWordCount = useMemo(() => (vocabItems || []).filter(x => !x?.kind || x?.kind === "words").length, [vocabItems]);

  function builtinLocked() { return !loading && vocabSource === "builtin" && !isMember; }
  function notEnough() { return !loading && vocabSource === "my" && myWordCount < 10; }
  function isLocked() { return notEnough() || builtinLocked(); }
  function handleSwitchBuiltin() { setVocabSource("builtin"); setActiveGame(null); }

  // ✅ 核心修改：handleGameEnd 在写 localStorage 后同步到后端
  function handleGameEnd(gameId, s) {
    const score = Number(s) || 0;
    const r = saveScore(gameId, score);

    try {
      window.__nailaScoreSavedMeta = window.__nailaScoreSavedMeta || {};
      if (r) window.__nailaScoreSavedMeta[gameId] = r;
    } catch {}

    try {
      setScores(loadScores());
    } catch {
      setScores((prev) => prev || {});
    }

    // 同步到后端（fire-and-forget，失败不影响游戏）
    try {
      const t = tokenRef.current;
      if (t && score > 0) {
        fetch(remote("/api/game_scores"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${t}`,
          },
          credentials: "include",
          body: JSON.stringify({ game_id: gameId, score }),
        }).catch(() => {});
      }
    } catch {}
  }

  const leaderboard = useMemo(() => {
    function seededRand(seed, index) {
      let h = 0;
      const str = seed + "lb" + String(index * 7919);
      for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
      return Math.abs(h) / 2147483647;
    }
    const seed = me?.username || me?.email || "guest";
    const namePool = ["xiao_yu","breezy92","tangjun","forest_k","qinghe","nova_li","zhuwei","pixel88","sunnyday","cfeng21","mintleaf","haochen","sky_blue","rui2024","dandelion","wuming","luckyx3","peach_bb","jiaming","comet77","xlei","morning_z","tigger","baixue","echo_ran","jingtao","spark_y","coconut","feifei9","breeze_w","longfei","purple_m","xingchen","cloudy_q","ray2025","hazel_x","zhiyuan","orbit_k","meimei","dusk_fan","binbin","starfall","yuchen3","misty_l","foxrun","caiyun","neon_j","huxiao","leafy_w","zephyr9","xiaoxue","blaze_r","pengfei","cotton_y","storm88","ruoxi","glitch_z","tianhao","maple_q","drift_c","linlin","wave_xu","chengyu","panda_f","jade_w","bowen","pixel_s","ruolin","echo99","sunny_t","yanyan","ghost_li","mingze","velvet_r","crane_w","junjun","amber_x","zhenyu","flash_q","brook_f","xixi","cobalt_z","haoran","mint_y","blaze_j","feiyu","dusk_w","jiahao","river_x","pearl_q","momo_z","spark_f","yuxuan","stone_r","bloom_c","leilei","prism_w","zhengyu","dew_x","lunar_j"];
    const shuffled = [...namePool];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(seededRand(seed, i) * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const scoreSlots = [255, 238, 220, 198, 175, 155, 132, 110, 88, 65];
    const fakeUsers = shuffled.slice(0, 10).map((name, i) => { const jitter = Math.floor(seededRand(seed, i + 200) * 12) - 6; return { name, totalScore: scoreSlots[i] + jitter, isMe: false }; });
    const myTotal = GAME_META.reduce((sum, m) => sum + Number(scores?.[m.id]?.best || 0), 0);
    const myName = me ? (me.username || (me.email || "").split("@")[0].slice(0, 10) || null) : null;
    const allEntries = [...fakeUsers];
    if (myName) allEntries.push({ name: myName, totalScore: myTotal, isMe: true });
    allEntries.sort((a, b) => b.totalScore - a.totalScore);
    return allEntries.slice(0, 10);
  }, [me, scores]);

  if (activeGame === "bubble") {
    if (isLocked()) return <NotEnoughView onBack={() => setActiveGame(null)} onSwitchBuiltin={handleSwitchBuiltin} isMember={isMember} />;
    return <BubbleSpellingGame vocabItems={activeVocab} sourceLabel={sourceLabel} maxQuestions={maxQuestions} onExit={() => setActiveGame(null)} onGameEnd={(s) => handleGameEnd("bubble", s)} />;
  }
  if (activeGame === "match") {
    if (isLocked()) return <NotEnoughView onBack={() => setActiveGame(null)} onSwitchBuiltin={handleSwitchBuiltin} isMember={isMember} />;
    return <MatchMadnessGame vocabItems={activeVocab} sourceLabel={sourceLabel} maxQuestions={maxQuestions} onExit={() => setActiveGame(null)} onGameEnd={(s) => handleGameEnd("match", s)} />;
  }
  if (activeGame === "swipe") {
    if (isLocked()) return <NotEnoughView onBack={() => setActiveGame(null)} onSwitchBuiltin={handleSwitchBuiltin} isMember={isMember} />;
    return <SwipeGame vocabItems={activeVocab} sourceLabel={sourceLabel} maxQuestions={maxQuestions} onExit={() => setActiveGame(null)} onGameEnd={(s) => handleGameEnd("swipe", s)} />;
  }
  if (activeGame === "rebuild") {
    if (isLocked()) return <NotEnoughView onBack={() => setActiveGame(null)} onSwitchBuiltin={handleSwitchBuiltin} isMember={isMember} />;
    return <RebuildGame vocabItems={activeVocab} sourceLabel={sourceLabel} maxQuestions={maxQuestions} onExit={() => setActiveGame(null)} onGameEnd={(s) => handleGameEnd("rebuild", s)} />;
  }
  if (activeGame === "balloon") {
    if (isLocked()) return <NotEnoughView onBack={() => setActiveGame(null)} onSwitchBuiltin={handleSwitchBuiltin} isMember={isMember} />;
    return <BalloonGame vocabItems={activeVocab} sourceLabel={sourceLabel} maxQuestions={maxQuestions} onExit={() => setActiveGame(null)} onGameEnd={(s) => handleGameEnd("balloon", s)} />;
  }
  if (activeGame === "speed") {
    if (isLocked()) return <NotEnoughView onBack={() => setActiveGame(null)} onSwitchBuiltin={handleSwitchBuiltin} isMember={isMember} />;
    return <SpeedGame vocabItems={activeVocab} sourceLabel={sourceLabel} maxQuestions={maxQuestions} onExit={() => setActiveGame(null)} onGameEnd={(s) => handleGameEnd("speed", s)} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: THEME.colors.bg, padding: 14, boxSizing: "border-box", color: THEME.colors.ink }}>
        <style>{`@keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 14px" }}>
          <Link href="/" style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", textDecoration: "none", color: THEME.colors.ink, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>← 返回首页</Link>
          <div style={{ fontSize: 18, fontWeight: 1000 }}>🎮 游戏大厅</div>
          <div style={{ opacity: 0.5, fontWeight: 900, fontSize: 13 }}>加载中…</div>
        </div>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 6px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
            {[0, 1, 2].map((i) => <div key={i} style={{ height: 72, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite" }} />)}
          </div>
          <div style={{ height: 192, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, marginBottom: 14, animation: "shimmer 1.4s ease-in-out infinite" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ height: 118, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite" }} />)}
            <div style={{ height: 118, borderRadius: THEME.radii.lg, background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, animation: "shimmer 1.4s ease-in-out infinite", gridColumn: "1 / -1" }} />
          </div>
        </div>
      </div>
    );
  }

  // 已登录但非会员 → 跳兑换页（未登录保持原有锁定界面）
  if (me?.logged_in && !me?.is_member) {
    if (typeof window !== "undefined") window.location.replace("/redeem");
    return null;
  }

  const page = { minHeight: "100vh", background: THEME.colors.bg, color: THEME.colors.ink, padding: 14, boxSizing: "border-box" };
  const topBar = { maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 6px 14px" };

  function ScoreLine({ meta, isLastRow }) {
    const info = scores?.[meta.id] || { best: 0, last: 0, playCount: 0 };
    const best = Number(info.best || 0);
    const playCount = Number(info.playCount || 0);
    const hasPlayed = playCount > 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: isLastRow ? "none" : `1px solid ${THEME.colors.border}`, fontSize: 13 }}>
        <span style={{ fontSize: 16 }}>{meta.emoji}</span>
        <span style={{ fontWeight: 1000, flex: 1, fontSize: 13 }}>{meta.name}</span>
        {hasPlayed ? (
          <span style={{ fontWeight: 1000, color: meta.color }}>最高 {best}分<span style={{ opacity: 0.5, fontSize: 11, marginLeft: 4, fontWeight: 900 }}>/ {playCount}次</span></span>
        ) : (
          <span style={{ opacity: 0.4, fontWeight: 900 }}>—</span>
        )}
      </div>
    );
  }

  return (
    <div style={page}>
      <style>{`
        .practice-games-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; max-width: 980px; margin: 14px auto 0; padding: 0 6px 18px; }
        .practice-score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
        .practice-score-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 980px; margin: 0 auto; padding: 0 6px; }
        .practice-topbar-email { opacity: 0.7; font-weight: 900; }
        @media (max-width: 600px) {
          .practice-games-grid { grid-template-columns: 1fr; gap: 10px; padding: 0 4px 18px; }
          .practice-score-grid { grid-template-columns: 1fr; gap: 4px; }
          .practice-score-row { grid-template-columns: 1fr; padding: 0 4px; }
          .practice-topbar-email { display: none; }
        }
      `}</style>
      <div style={topBar}>
        <Link href="/" style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: THEME.radii.pill, padding: "8px 12px", textDecoration: "none", color: THEME.colors.ink, fontWeight: 900, display: "inline-flex", alignItems: "center", gap: 8 }}>← 返回首页</Link>
        <div style={{ fontSize: 18, fontWeight: 1000 }}>🎮 游戏大厅</div>
        <div className="practice-topbar-email">{me ? (me.username || (me.email || "").split("@")[0] || "未登录") : "未登录"}</div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto 10px", padding: "0 6px" }}>
        <div style={{ display: "inline-flex", border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.pill, overflow: "hidden", background: THEME.colors.surface }}>
          {[{ key: "my", label: `我的收藏 (${myWordCount}词)` }, { key: "builtin", label: "内置词库" }].map(opt => (
            <button key={opt.key} onClick={() => setVocabSource(opt.key)} disabled={opt.key === "builtin" && !loading && !isMember}
              style={{ padding: "8px 16px", border: "none", cursor: opt.key === "builtin" && !loading && !isMember ? "not-allowed" : "pointer", fontWeight: 1000, fontSize: 13, background: vocabSource === opt.key ? THEME.colors.accent : "transparent", color: vocabSource === opt.key ? "#fff" : opt.key === "builtin" && !loading && !isMember ? THEME.colors.muted : THEME.colors.ink, transition: "all 0.15s" }}>
              {opt.label}{opt.key === "builtin" && !isMember ? " 🔒" : ""}
            </button>
          ))}
        </div>
        {vocabSource === "my" && myWordCount < 10 && (
          <div style={{ marginTop: 8, fontSize: 12, color: "#ef4444", fontWeight: 900, lineHeight: 1.5 }}>⚠️ 收藏单词不足 10 个<br /><span style={{ opacity: 0.85 }}>建议切换内置词库练习</span></div>
        )}
      </div>

      {showLeaderboard && (
        <div onClick={() => setShowLeaderboard(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(11,18,32,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: THEME.colors.surface, borderRadius: THEME.radii.lg, border: `1px solid ${THEME.colors.border}`, boxShadow: "0 24px 60px rgba(11,18,32,0.18)", padding: "14px 16px", width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${THEME.colors.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 1000 }}>🥇 总分排行榜</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 900 }}>全站 Top 10</div>
                <button onClick={() => setShowLeaderboard(false)} style={{ border: `1px solid ${THEME.colors.border}`, background: THEME.colors.surface, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>关闭</button>
              </div>
            </div>
            {leaderboard.map((entry, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
              const isMe = entry.isMe;
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, marginBottom: 3, background: isMe ? "rgba(99,102,241,0.08)" : "transparent", border: isMe ? `1px solid rgba(99,102,241,0.18)` : "1px solid transparent" }}>
                  <div style={{ width: 22, textAlign: "center", fontSize: medal ? 15 : 12, fontWeight: 1000, color: THEME.colors.faint, flexShrink: 0 }}>{medal || `${idx + 1}`}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 1000 : 900, color: isMe ? THEME.colors.accent : THEME.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}{isMe ? " (我)" : ""}</div>
                  <div style={{ fontSize: 13, fontWeight: 1000, color: isMe ? THEME.colors.accent : THEME.colors.ink, flexShrink: 0 }}>{entry.totalScore} 分</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="practice-score-row">
        <div style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: "10px 14px", boxShadow: "0 4px 12px rgba(15,23,42,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${THEME.colors.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 1000 }}>🏆 我的最高分</div>
            <div style={{ fontSize: 11, opacity: 0.55, fontWeight: 900 }}>游玩即自动记录</div>
          </div>
          <div className="practice-score-grid">
            {GAME_META.map((m, idx) => <ScoreLine key={m.id} meta={m} isLastRow={idx >= GAME_META.length - 2} />)}
          </div>
        </div>
        <button onClick={() => setShowLeaderboard(true)} style={{ background: THEME.colors.surface, border: `1px solid ${THEME.colors.border}`, borderRadius: THEME.radii.lg, padding: "10px 14px", boxShadow: "0 4px 12px rgba(15,23,42,0.06)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "flex-start", width: "100%", textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${THEME.colors.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 1000, color: THEME.colors.ink }}>🥇 总分排行榜</div>
            <div style={{ fontSize: 18, opacity: 0.35, color: THEME.colors.ink }}>›</div>
          </div>
          {leaderboard.slice(0, 3).map((entry, idx) => {
            const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉";
            const isMe = entry.isMe;
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "5px 0", borderBottom: idx < 2 ? `1px solid ${THEME.colors.border}` : "none" }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{medal}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 1000 : 900, color: isMe ? THEME.colors.accent : THEME.colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.name}{isMe ? " (我)" : ""}</span>
                <span style={{ fontSize: 13, fontWeight: 1000, color: isMe ? THEME.colors.accent : THEME.colors.faint, flexShrink: 0 }}>{entry.totalScore}分</span>
              </div>
            );
          })}
          <div style={{ marginTop: 10, fontSize: 12, color: THEME.colors.faint, fontWeight: 900, alignSelf: "center" }}>
            {leaderboard.findIndex(e => e.isMe) >= 0 ? `你当前排第 ${leaderboard.findIndex(e => e.isMe) + 1} 名 · 点击查看完整榜单` : "点击查看完整榜单"}
          </div>
        </button>
      </div>

      <div className="practice-games-grid">
        <GameCard emoji="🫧" title="气泡拼写" subtitle="拼出你看到的单词，点击字母气泡按顺序完成拼写" tag="拼写训练" color="#7c3aed" disabled={isLocked()} onClick={() => setActiveGame("bubble")} />
        <GameCard emoji="🔗" title="极速连连看" subtitle="30秒内快速配对英文与中文，连击越多分越高" tag="速记模式" color="#d97706" disabled={isLocked()} onClick={() => setActiveGame("match")} />
        <GameCard emoji="🃏" title="单词探探" subtitle="左滑❌ 右滑✅ 判断释义是否正确" tag="休闲模式" color="#ec4899" disabled={isLocked()} onClick={() => setActiveGame("swipe")} />
        <GameCard emoji="🧩" title="台词磁力贴" subtitle="点击方块，把打散的例句拼回去" tag="语感训练" color="#059669" disabled={isLocked()} onClick={() => setActiveGame("rebuild")} />
        <GameCard emoji="🎧" title="盲听气球" subtitle="听发音，点击正确释义的气球" tag="听力专精" color="#0891b2" disabled={isLocked()} onClick={() => setActiveGame("balloon")} />
        <GameCard emoji="⚡" title="极速二选一" subtitle="3秒内点击正确释义，连击拿高分" tag="挑战模式" color="#d97706" disabled={isLocked()} onClick={() => setActiveGame("speed")} />
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 6px", opacity: 0.65, fontWeight: 900 }}>
        {builtinLocked() ? "内置词库需要会员才能使用，开通会员后即可解锁。" : notEnough() ? "提示：去「我的收藏 → 词汇本」多收藏一些词汇，解锁全部游戏。" : "选一个游戏开始练习吧！"}
      </div>
    </div>
  );
}
