/* =========================================================================
   data.js - 唯一数据源
   1. EXPECTED_SONG_IDS  19 首正式歌曲白名单（songId 是全项目唯一主键）
   2. SONG_AUDIO         songId → 中文歌名 / 文件名 / 相对路径（唯一音频事实源）
   3. EXCLUDED_AUDIO     Intro / 雨(Intro) / 别(Outro)，永不进入结果池
   4. DIMENSIONS         8 个人格维度与权重
   5. QUESTIONS          10 道题及每个选项的维度增量向量
   6. RESULTS            19 首歌曲人格结果
   7. TOUR_CONFIG        巡演信息（长期活动，可单独更新，不影响测试逻辑）
   8. validateProjectData()  启动一致性校验
   中文歌名只负责展示，程序内部一律用 songId 关联。
   ========================================================================= */
(function (global) {
  'use strict';

  var EXPECTED_SONG_IDS = Object.freeze([
    "guan-yi-bei",
    "liu-ceng-lou",
    "gei-bao-zhe-he-zi-de-gu-niang",
    "guo-yuan-chao",
    "yu-wo-jiao-tan",
    "lian-yi-qun",
    "hou-ji",
    "xie-xie-ni",
    "dong-xiao-jie",
    "ge-zi",
    "li-li-an",
    "kong-gang-qu",
    "zai-xiang-xiang",
    "ban-ma-ban-ma",
    "zhi-dao",
    "bu-mo-sheng-de-ren",
    "an-he-qiao",
    "ka-bi-ba-la-de-hai",
    "luo-yan"
  ]);

  // 唯一音频事实源。禁止在别处建立第二套音频路径映射。
  var SONG_AUDIO = Object.freeze({
  "guan-yi-bei": {
    title: "关忆北",
    file: "guan-yi-bei.mp3",
    src: "./assets/audio/guan-yi-bei.mp3"
  },
  "liu-ceng-lou": {
    title: "六层楼",
    file: "liu-ceng-lou.mp3",
    src: "./assets/audio/liu-ceng-lou.mp3"
  },
  "gei-bao-zhe-he-zi-de-gu-niang": {
    title: "给抱着盒子的姑娘",
    file: "gei-bao-zhe-he-zi-de-gu-niang.mp3",
    src: "./assets/audio/gei-bao-zhe-he-zi-de-gu-niang.mp3"
  },
  "guo-yuan-chao": {
    title: "郭源潮",
    file: "guo-yuan-chao.mp3",
    src: "./assets/audio/guo-yuan-chao.mp3"
  },
  "yu-wo-jiao-tan": {
    title: "与我交谈",
    file: "yu-wo-jiao-tan.mp3",
    src: "./assets/audio/yu-wo-jiao-tan.mp3"
  },
  "lian-yi-qun": {
    title: "连衣裙",
    file: "lian-yi-qun.mp3",
    src: "./assets/audio/lian-yi-qun.mp3"
  },
  "hou-ji": {
    title: "后记",
    file: "hou-ji.mp3",
    src: "./assets/audio/hou-ji.mp3"
  },
  "xie-xie-ni": {
    title: "谢谢你",
    file: "xie-xie-ni.mp3",
    src: "./assets/audio/xie-xie-ni.mp3"
  },
  "dong-xiao-jie": {
    title: "董小姐",
    file: "dong-xiao-jie.mp3",
    src: "./assets/audio/dong-xiao-jie.mp3"
  },
  "ge-zi": {
    title: "鸽子",
    file: "ge-zi.mp3",
    src: "./assets/audio/ge-zi.mp3"
  },
  "li-li-an": {
    title: "莉莉安",
    file: "li-li-an.mp3",
    src: "./assets/audio/li-li-an.mp3"
  },
  "kong-gang-qu": {
    title: "空港曲",
    file: "kong-gang-qu.mp3",
    src: "./assets/audio/kong-gang-qu.mp3"
  },
  "zai-xiang-xiang": {
    title: "再想想",
    file: "zai-xiang-xiang.mp3",
    src: "./assets/audio/zai-xiang-xiang.mp3"
  },
  "ban-ma-ban-ma": {
    title: "斑马，斑马",
    file: "ban-ma-ban-ma.mp3",
    src: "./assets/audio/ban-ma-ban-ma.mp3"
  },
  "zhi-dao": {
    title: "知道",
    file: "zhi-dao.mp3",
    src: "./assets/audio/zhi-dao.mp3"
  },
  "bu-mo-sheng-de-ren": {
    title: "不陌生的人",
    file: "bu-mo-sheng-de-ren.mp3",
    src: "./assets/audio/bu-mo-sheng-de-ren.mp3"
  },
  "an-he-qiao": {
    title: "安和桥",
    file: "an-he-qiao.mp3",
    src: "./assets/audio/an-he-qiao.mp3"
  },
  "ka-bi-ba-la-de-hai": {
    title: "卡比巴拉的海",
    file: "ka-bi-ba-la-de-hai.mp3",
    src: "./assets/audio/ka-bi-ba-la-de-hai.mp3"
  },
  "luo-yan": {
    title: "落雁",
    file: "luo-yan.mp3",
    src: "./assets/audio/luo-yan.mp3"
  }
  });

  // 已上传但永久排除：不进入白名单、结果池、题目权重、调试选择器与播放映射。
  var EXCLUDED_AUDIO = Object.freeze([
    { label: "Intro", file: "excluded-intro.mp3" },
    { label: "雨 (Intro)", file: "excluded-yu-intro.mp3" },
    { label: "别 (Outro)", file: "excluded-bie-outro.mp3" }
  ]);

  // 8 个人格维度，取值 -3 ~ +3。注释仅供开发者阅读，不展示给用户。
  var DIMENSIONS = Object.freeze([
    'memory',         // 放下过去 ←→ 保存记忆
    'mobility',       // 停留安定 ←→ 出走移动
    'relationship',   // 独处疏离 ←→ 靠近连接
    'expression',     // 克制间接 ←→ 直接表达
    'certainty',      // 接受确定 ←→ 怀疑答案
    'responsibility', // 旁观退后 ←→ 承担照顾
    'resistance',     // 适应秩序 ←→ 反抗权威
    'grounding'       // 抽象精神 ←→ 具体日常
  ]);

  var DIMENSION_WEIGHTS = Object.freeze({
    memory: 1.15,
    mobility: 1.1,
    relationship: 1.1,
    expression: 1.0,
    certainty: 1.05,
    responsibility: 1.1,
    resistance: 1.0,
    grounding: 1.05
  });

  /* 10 道题。选项的 v 是该选项对 8 个维度的增量向量（未列出的维度按 0 计）。
     本项目不使用「选项 → 歌曲」的直接权重表，避免某个选项等于某首歌；
     如果将来加入 option.weights，其键必须是 EXPECTED_SONG_IDS 中的 songId。 */
  var QUESTIONS = [
    {
      "scene": "SCENE 01 · 散场",
      "text": "散场后灯亮起来，人群往外走，你通常会怎么做？",
      "options": [
        {
          "label": "站在原地，等最后一点回声散掉",
          "v": {
            "memory": 2,
            "expression": -1,
            "mobility": -1,
            "grounding": -1
          }
        },
        {
          "label": "跟着人流出去，沿一条街走很远",
          "v": {
            "mobility": 2,
            "relationship": -1,
            "certainty": 1
          }
        },
        {
          "label": "找到同行的人，一起去吃点热的",
          "v": {
            "relationship": 2,
            "grounding": 2,
            "responsibility": 1
          }
        },
        {
          "label": "拍下空掉的舞台，然后一个人回家",
          "v": {
            "memory": 2,
            "relationship": -2,
            "expression": -1
          }
        }
      ]
    },
    {
      "scene": "SCENE 02 · 陌生城市",
      "text": "落地一座没来过的城市，第一件事你会做什么？",
      "options": [
        {
          "label": "先去看看这里的海，或者一条河",
          "v": {
            "mobility": 2,
            "grounding": -1,
            "certainty": 1
          }
        },
        {
          "label": "找家便宜的面馆坐下来吃饭",
          "v": {
            "grounding": 2,
            "mobility": -1,
            "responsibility": 1
          }
        },
        {
          "label": "问路上的人，晚上有什么地方可去",
          "v": {
            "relationship": 2,
            "expression": 2
          }
        },
        {
          "label": "什么都不安排，走到走不动为止",
          "v": {
            "mobility": 2,
            "certainty": 2,
            "relationship": -1
          }
        }
      ]
    },
    {
      "scene": "SCENE 03 · 旧人来信",
      "text": "很久没联系的人突然发来消息，只写了一句「在吗」。",
      "options": [
        {
          "label": "马上回，并且问他这些年过得好不好",
          "v": {
            "relationship": 2,
            "expression": 2,
            "responsibility": 1
          }
        },
        {
          "label": "看了很久，最后回一个字：在",
          "v": {
            "memory": 2,
            "expression": -2,
            "relationship": 1
          }
        },
        {
          "label": "不回，但把那个对话框留着没删",
          "v": {
            "memory": 3,
            "expression": -2,
            "relationship": -1
          }
        },
        {
          "label": "客气地说了近况，没有再往下问",
          "v": {
            "memory": -2,
            "relationship": -2,
            "expression": -1
          }
        }
      ]
    },
    {
      "scene": "SCENE 04 · 旧物",
      "text": "整理房间时，翻出一件已经留了很多年的旧东西。",
      "options": [
        {
          "label": "擦干净，放回它原来的位置",
          "v": {
            "memory": 3,
            "mobility": -1,
            "expression": -1
          }
        },
        {
          "label": "拍张照，然后送给更需要它的人",
          "v": {
            "memory": -1,
            "responsibility": 2,
            "relationship": 1,
            "grounding": 1
          }
        },
        {
          "label": "塞进箱子，等下次搬家再决定",
          "v": {
            "memory": 1,
            "certainty": 2,
            "expression": -2
          }
        },
        {
          "label": "扔掉，房间空一点更好呼吸",
          "v": {
            "memory": -3,
            "mobility": 1,
            "resistance": 1
          }
        }
      ]
    },
    {
      "scene": "SCENE 05 · 陌生人",
      "text": "深夜路口，一个陌生人说自己迷路了，向你开口。",
      "options": [
        {
          "label": "送他到能打到车的地方再走",
          "v": {
            "responsibility": 3,
            "relationship": 2,
            "grounding": 1
          }
        },
        {
          "label": "把手机地图给他看，指一个方向",
          "v": {
            "responsibility": 1,
            "grounding": 2,
            "expression": 1
          }
        },
        {
          "label": "说自己也不熟这一带，抱歉",
          "v": {
            "responsibility": -2,
            "certainty": 2,
            "relationship": -1
          }
        },
        {
          "label": "停下来听他讲完，才发现帮不上",
          "v": {
            "relationship": 2,
            "responsibility": 1,
            "certainty": 2,
            "grounding": -1
          }
        }
      ]
    },
    {
      "scene": "SCENE 06 · 公共争论",
      "text": "一件事所有人都在表态，你的时间线全是结论。",
      "options": [
        {
          "label": "写下自己的看法，并且署上名字",
          "v": {
            "expression": 3,
            "resistance": 2,
            "certainty": 1
          }
        },
        {
          "label": "先去找最原始的那份材料看",
          "v": {
            "certainty": 2,
            "resistance": 1,
            "expression": -1,
            "grounding": 1
          }
        },
        {
          "label": "谁都不站，只觉得这些话很像",
          "v": {
            "certainty": 3,
            "resistance": 1,
            "expression": -2,
            "relationship": -1
          }
        },
        {
          "label": "关掉手机，去做手上该做的事",
          "v": {
            "grounding": 3,
            "resistance": -1,
            "expression": -2,
            "mobility": -1
          }
        }
      ]
    },
    {
      "scene": "SCENE 07 · 未来",
      "text": "有人问你，三年之后打算在哪里、做什么。",
      "options": [
        {
          "label": "说出一个具体的城市和打算",
          "v": {
            "certainty": -3,
            "grounding": 2,
            "mobility": -1,
            "expression": 1
          }
        },
        {
          "label": "说不知道，但一定不是现在这样",
          "v": {
            "certainty": 2,
            "mobility": 2,
            "resistance": 2
          }
        },
        {
          "label": "说三年太远，先把这个月过完",
          "v": {
            "grounding": 3,
            "certainty": 1,
            "mobility": -1
          }
        },
        {
          "label": "笑一下，把这个问题还给对方",
          "v": {
            "expression": 1,
            "certainty": 3,
            "relationship": -1,
            "grounding": -2
          }
        }
      ]
    },
    {
      "scene": "SCENE 08 · 关系",
      "text": "一段关系里，自由和安定只能留下一个。",
      "options": [
        {
          "label": "留下安定，把明天安排成一间房",
          "v": {
            "mobility": -3,
            "relationship": 2,
            "responsibility": 2,
            "grounding": 2,
            "certainty": -2
          }
        },
        {
          "label": "留下自由，也把门给对方留着",
          "v": {
            "mobility": 2,
            "relationship": -1,
            "expression": -1,
            "certainty": 1
          }
        },
        {
          "label": "都不选，先陪对方走一段路看看",
          "v": {
            "relationship": 1,
            "certainty": 2,
            "mobility": 1,
            "expression": -2
          }
        },
        {
          "label": "先把自己能给什么说清楚",
          "v": {
            "expression": 3,
            "responsibility": 1,
            "relationship": 1,
            "certainty": -1
          }
        }
      ]
    },
    {
      "scene": "SCENE 09 · 很远的事",
      "text": "新闻里是很远的战争，桌上是明天要交的东西。",
      "options": [
        {
          "label": "关掉新闻，先把桌上的做完",
          "v": {
            "grounding": 3,
            "responsibility": 1,
            "certainty": -1,
            "expression": -2
          }
        },
        {
          "label": "难过了一整晚，事也没做完",
          "v": {
            "grounding": -2,
            "relationship": 1,
            "responsibility": 1,
            "certainty": 2,
            "memory": 1
          }
        },
        {
          "label": "转出去，让更多人看见这件事",
          "v": {
            "expression": 2,
            "resistance": 2,
            "responsibility": 1,
            "relationship": 1
          }
        },
        {
          "label": "出门去喂那只常见的流浪猫",
          "v": {
            "grounding": 3,
            "responsibility": 2,
            "expression": -2,
            "relationship": 1
          }
        }
      ]
    },
    {
      "scene": "SCENE 10 · 告别",
      "text": "要和一个重要的人真正告别，你会怎么结束。",
      "options": [
        {
          "label": "送他上车，看车开走才转身",
          "v": {
            "responsibility": 2,
            "relationship": 1,
            "memory": 2,
            "expression": -1
          }
        },
        {
          "label": "把话说完，包括最难听的那句",
          "v": {
            "expression": 3,
            "resistance": 1,
            "certainty": 1
          }
        },
        {
          "label": "什么也不说，第二天照常起床",
          "v": {
            "expression": -3,
            "grounding": 2,
            "memory": -1,
            "relationship": -1
          }
        },
        {
          "label": "独自去很远的地方待一阵子",
          "v": {
            "mobility": 3,
            "relationship": -2,
            "memory": 1,
            "grounding": -1
          }
        }
      ]
    }
  ];

  /* 19 首歌曲人格结果。字段：
     songId / title / album / personalityName / shortDescription /
     fullDescription / keywords / symbol / vector / calibration
     ticketCode 不是静态数据，由 app.js 在签发票根时生成并挂到运行时结果对象上。
     calibration 是结果池均衡校准值，由全量答案组合（4^10）拟合得到。 */
  var RESULTS = [
    {
      "songId": "guan-yi-bei",
      "title": "关忆北",
      "album": "安和桥北",
      "personalityName": "把一个人认作北方的人",
      "shortDescription": "你记住一个人时，也会记住与他有关的天气、城市和当年的自己。后来难以放下的，可能不只是那个人，而是失去他以后再也找不到的方向。",
      "fullDescription": "你记人的方式非常完整，会连同那年的天气、街道和当时的自己一起记住。所以某个人离开的时候，带走的不只是他自己。\n\n后来你花了很长时间重新找方向。这不是执念，是你确实认真活过那段日子。现在你可以把那个坐标留在原处，再给自己重新立一个。",
      "keywords": [
        "北方",
        "坐标",
        "青春",
        "故乡",
        "失向"
      ],
      "symbol": "compass",
      "vector": {
        "memory": 3,
        "mobility": -1,
        "relationship": 1,
        "expression": -1,
        "certainty": 1,
        "responsibility": 0,
        "resistance": -1,
        "grounding": 0
      },
      "calibration": -0.0156
    },
    {
      "songId": "liu-ceng-lou",
      "title": "六层楼",
      "album": "安和桥北",
      "personalityName": "在悬而未决中邀请同行的人",
      "shortDescription": "你不一定知道要去哪里，但知道停在原地不是答案。你很少用承诺定义关系，却会认真问身边的人：今天走，还是明天走？",
      "fullDescription": "你不常给出承诺，因为你诚实：很多事情你自己也没有答案。但你知道停在原地不会有转机，所以你总在准备出发。\n\n你邀请别人同行的方式很轻，一句「今天走还是明天走」，就是你能给出的最大信任。悬而未决不代表不认真，它只是还没到能说清楚的时候。",
      "keywords": [
        "同行",
        "路上",
        "悬而未决",
        "时间",
        "沉默"
      ],
      "symbol": "stairs",
      "vector": {
        "memory": 0,
        "mobility": 2,
        "relationship": 1,
        "expression": -2,
        "certainty": 2,
        "responsibility": 0,
        "resistance": 0,
        "grounding": 0
      },
      "calibration": -0.0562
    },
    {
      "songId": "gei-bao-zhe-he-zi-de-gu-niang",
      "title": "给抱着盒子的姑娘",
      "album": "安和桥北",
      "personalityName": "把要紧的东西收进盒子里的人",
      "shortDescription": "你很少主动把心事摊开，重要的东西都收在一个只有自己知道的盒子里。你不是没有情绪，只是习惯先照顾别人的难处，再回头处理自己的。",
      "fullDescription": "你习惯把最要紧的东西收起来：一封信、一个名字、一段没讲完的经过。别人以为你没事，其实你只是把盒子抱得更紧了一点。\n\n你身上有一种很旧的温柔。你愿意听别人的委屈，也愿意在原地多站一会儿。只要偶尔记得把盒子打开给一个可靠的人看看，那些东西就不会一直只是重量。",
      "keywords": [
        "珍藏",
        "沉默",
        "温柔",
        "旧事",
        "托付"
      ],
      "symbol": "heldBox",
      "vector": {
        "memory": 3,
        "mobility": -1,
        "relationship": 1,
        "expression": -3,
        "certainty": -1,
        "responsibility": 2,
        "resistance": -1,
        "grounding": 1
      },
      "calibration": -0.0082
    },
    {
      "songId": "guo-yuan-chao",
      "title": "郭源潮",
      "album": "再想想",
      "personalityName": "不接受被俯视的人",
      "shortDescription": "你不怕承认自己有限，但不能接受别人站在高处替你解释人生。真正的平等不是意见相同，而是承认谁也没有资格垄断世界的答案。",
      "fullDescription": "你可以承认自己有限、会错、走过弯路。但你不能接受有人站在高处，替你解释你的人生。\n\n你要的平等不是意见相同，而是没有人有资格垄断答案。必要的时候你会转身，把话说清楚再走。这不是骄傲，是把自己看成一个完整的人。",
      "keywords": [
        "平视",
        "尊严",
        "权威",
        "边界",
        "决裂"
      ],
      "symbol": "twoMountains",
      "vector": {
        "memory": 2,
        "mobility": 0,
        "relationship": 0,
        "expression": 2,
        "certainty": 1,
        "responsibility": 2,
        "resistance": 3,
        "grounding": 0
      },
      "calibration": -0.0377
    },
    {
      "songId": "yu-wo-jiao-tan",
      "title": "与我交谈",
      "album": "再想想",
      "personalityName": "不肯替漂亮话鼓掌的人",
      "shortDescription": "你不是为了反对而反对，只是很难被一句漂亮话说服。你会先看看谁握着笔、谁递来纸、谁盖下印章，再决定这是不是你愿意相信的真相。",
      "fullDescription": "你不容易被漂亮话说服。听到一段完整、动人、结论清楚的表述，你的第一反应是看看它从哪里来。\n\n你在意的是谁在说、为什么现在说、有谁被漏掉了。这让你有时显得不合群，也让你少说错话。你的怀疑不是刻薄，是一种认真。",
      "keywords": [
        "语言",
        "权力",
        "怀疑",
        "真话",
        "审视"
      ],
      "symbol": "stampCut",
      "vector": {
        "memory": 0,
        "mobility": -1,
        "relationship": -2,
        "expression": 3,
        "certainty": 3,
        "responsibility": 1,
        "resistance": 3,
        "grounding": 0
      },
      "calibration": 0.0572
    },
    {
      "songId": "lian-yi-qun",
      "title": "连衣裙",
      "album": "安和桥北",
      "personalityName": "愿意把明天变成家的人",
      "shortDescription": "你相信真正的浪漫不是说走就走，而是愿意听完一个人的过去，再和他一起决定明天住在哪里。",
      "fullDescription": "你相信浪漫需要落地：一间房、一个明天、一个可以商量的将来。这不是不勇敢，这是愿意为一段关系负责的勇敢。\n\n你会先听完一个人的过去，再决定要不要一起生活。你给出的东西不花哨，但都能兑现：时间、耐心，和一整个春天。",
      "keywords": [
        "承诺",
        "共同生活",
        "春天",
        "生长",
        "家"
      ],
      "symbol": "windowTree",
      "vector": {
        "memory": 0,
        "mobility": -3,
        "relationship": 3,
        "expression": 1,
        "certainty": -2,
        "responsibility": 2,
        "resistance": -1,
        "grounding": 2
      },
      "calibration": 0.0532
    },
    {
      "songId": "hou-ji",
      "title": "后记",
      "album": "再想想",
      "personalityName": "看穿自我欺骗，却仍走不出循环的人",
      "shortDescription": "你拥有锋利的自我洞察，甚至能在别人指出之前，先看见自己的虚荣和局限。你的困难不是不明白，而是明白之后，仍会一次次回到那口熟悉的井。",
      "fullDescription": "你的自我洞察比大多数人锋利，别人还没开口，你已经先把自己的虚荣、退缩和小算盘看清楚了。\n\n困难的地方在于，看清之后你仍然会回到熟悉的位置。这不是失败，而是很多清醒的人共有的处境。你不必先变好，才配被理解。",
      "keywords": [
        "自审",
        "循环",
        "不甘",
        "清醒",
        "诚实"
      ],
      "symbol": "wellLoop",
      "vector": {
        "memory": 2,
        "mobility": -2,
        "relationship": -3,
        "expression": 1,
        "certainty": 2,
        "responsibility": -1,
        "resistance": 0,
        "grounding": -2
      },
      "calibration": 0.1672
    },
    {
      "songId": "xie-xie-ni",
      "title": "谢谢你",
      "album": "再想想",
      "personalityName": "把荒诞世界具体成一个你的人",
      "shortDescription": "你不需要世界先证明自己有意义。只要有一个真实的人，让抽象的生活重新变得具体，你就愿意继续走下去。",
      "fullDescription": "你不需要世界先向你证明意义。抽象的荒诞你不去争辩，你只是找一个具体的人、一件具体的事，把日子重新握住。\n\n你的感激通常很小、很实在：有人陪你吃了顿饭，有人记得你怕什么。你知道人和人之间这点温度，就是很多人继续走下去的全部理由。",
      "keywords": [
        "感激",
        "具体",
        "意义",
        "关系",
        "荒诞"
      ],
      "symbol": "sunStitch",
      "vector": {
        "memory": 1,
        "mobility": 0,
        "relationship": 3,
        "expression": 1,
        "certainty": 2,
        "responsibility": 1,
        "resistance": 0,
        "grounding": 3
      },
      "calibration": -0.0502
    },
    {
      "songId": "dong-xiao-jie",
      "title": "董小姐",
      "album": "安和桥北",
      "personalityName": "明知复杂，仍然认真靠近的人",
      "shortDescription": "你很少被完美打动，却总能看见一个人不愿示人的部分。你知道靠近不能解决所有问题，但真正动心时，还是会认真邀请一次。",
      "fullDescription": "你被吸引的从来不是完美的人，而是那些身上带着故事、说话时会突然停一下的人。你能看见对方藏起来的部分，也愿意为此多留一会儿。\n\n你清楚靠近解决不了对方的问题，也可能让自己受伤。但真正动心的时候，你还是会认真发出邀请，哪怕答案并不确定。",
      "keywords": [
        "复杂",
        "动心",
        "故事",
        "邀请",
        "不确定"
      ],
      "symbol": "nightWater",
      "vector": {
        "memory": 1,
        "mobility": 1,
        "relationship": 3,
        "expression": 2,
        "certainty": 1,
        "responsibility": 0,
        "resistance": 0,
        "grounding": 0
      },
      "calibration": 0.0151
    },
    {
      "songId": "ge-zi",
      "title": "鸽子",
      "album": "安和桥北",
      "personalityName": "在归途尽头等春天的人",
      "shortDescription": "你不会剪掉谁的翅膀，也不会因为路途遥远就忘记归途。你愿意成为那个不催促、不喧哗，却始终亮着灯的地方。",
      "fullDescription": "你身上有一种少见的耐心。别人急着确认关系、急着要一个答案的时候，你愿意等一个人自己走完那段路。\n\n你相信真正回来的人，不是被叫回来的。所以你把灯留着，把门留着，不说催促的话。这样的等待并不被动，它需要你一次又一次主动选择相信。",
      "keywords": [
        "归途",
        "等待",
        "春天",
        "信任",
        "坚定"
      ],
      "symbol": "returnWing",
      "vector": {
        "memory": 2,
        "mobility": -2,
        "relationship": 2,
        "expression": -1,
        "certainty": -2,
        "responsibility": 2,
        "resistance": -1,
        "grounding": 1
      },
      "calibration": 0.0429
    },
    {
      "songId": "li-li-an",
      "title": "莉莉安",
      "album": "安和桥北",
      "personalityName": "替孤独守着名字的人",
      "shortDescription": "你不急着把谁留在身边，却会认真记住一个人的名字。你相信真正的相遇不一定需要占有，只需要有人在远方知道，自己曾经被看见。",
      "fullDescription": "你不太擅长争夺，也很少要求一个人属于你。喜欢一个人的时候，你先做的事是把他的名字记牢，把他说过的话放在心里反复辨认。\n\n这不是委屈，而是一种很稳的能力：你能在不打扰对方的前提下，长久地关心一个人。只有一件事值得提醒你：被看见这件事，你自己也配得上，不必总是站在岸上。",
      "keywords": [
        "守望",
        "克制",
        "辨认",
        "远方",
        "共情"
      ],
      "symbol": "shoreName",
      "vector": {
        "memory": 2,
        "mobility": 1,
        "relationship": 1,
        "expression": -3,
        "certainty": 0,
        "responsibility": 1,
        "resistance": -1,
        "grounding": -1
      },
      "calibration": 0.0201
    },
    {
      "songId": "kong-gang-qu",
      "title": "空港曲",
      "album": "再想想",
      "personalityName": "不再向确定性靠岸的人",
      "shortDescription": "你已经很难相信任何绝对纯洁的立场。比起证明自己正确，你更愿意退后一步，看清每个人如何同时成为演员、观众和故事的一部分。",
      "fullDescription": "你已经很难相信任何绝对干净的立场。看得多了，你知道场上的每个人都同时是演员、观众和故事的一部分。\n\n所以你常常退后一步。不是放弃判断，而是不急着表演正确。留在中间地带，你也就保留了继续观察和改变主意的余地。",
      "keywords": [
        "荒诞",
        "撤离",
        "怀疑",
        "中间地带",
        "清醒"
      ],
      "symbol": "emptyPort",
      "vector": {
        "memory": 0,
        "mobility": 2,
        "relationship": -2,
        "expression": -2,
        "certainty": 3,
        "responsibility": -2,
        "resistance": 1,
        "grounding": -1
      },
      "calibration": 0.0314
    },
    {
      "songId": "zai-xiang-xiang",
      "title": "再想想",
      "album": "再想想",
      "personalityName": "用一条狗接住世界的人",
      "shortDescription": "你依然会为很远的事情难过，只是不再相信一次彻夜长谈就能解决世界。想不明白的时候，你会先照顾好眼前的生命。",
      "fullDescription": "很远的事情你仍然会难过，只是不再相信一次彻夜长谈能解决世界。你把力气收回到自己能够到的范围里。\n\n想不明白的时候，你会先照顾好眼前的生命：喂一次饭、修一件东西、陪谁走一段。你还在持续思考，只是学会了不让思考取代生活。",
      "keywords": [
        "日常",
        "悲悯",
        "小事",
        "思考",
        "照顾"
      ],
      "symbol": "houseLamp",
      "vector": {
        "memory": 0,
        "mobility": -2,
        "relationship": 1,
        "expression": -1,
        "certainty": 2,
        "responsibility": 3,
        "resistance": 0,
        "grounding": 3
      },
      "calibration": -0.0727
    },
    {
      "songId": "ban-ma-ban-ma",
      "title": "斑马，斑马",
      "album": "安和桥北",
      "personalityName": "不占有的告别者",
      "shortDescription": "你不是不想留下，只是很早就明白，爱并不等于占有。有些人适合被送回家，有些温柔则要由你带回自己的远方。",
      "fullDescription": "你不是冷淡的人，只是很早就明白，爱不等于把谁留在身边。你会照顾好一段关系，也会在该松手的时候松手。\n\n把人送回家之后，你带走的东西通常很轻：一段路、一句没说完的话、一点温柔。你的远方不是逃跑，是给自己保留的呼吸空间。",
      "keywords": [
        "告别",
        "边界",
        "旅人",
        "温柔",
        "自我放逐"
      ],
      "symbol": "stripes",
      "vector": {
        "memory": 1,
        "mobility": 3,
        "relationship": -1,
        "expression": -1,
        "certainty": 1,
        "responsibility": 0,
        "resistance": 0,
        "grounding": -1
      },
      "calibration": 0.0375
    },
    {
      "songId": "zhi-dao",
      "title": "知道",
      "album": "再想想",
      "personalityName": "用玩笑承认不知道的人",
      "shortDescription": "你并不害怕没有答案，真正令你不安的是人们过早宣布自己已经明白。你会拆掉确定性，也会顺手嘲笑那个急着得到结论的自己。",
      "fullDescription": "没有答案这件事并不让你恐慌。真正让你不安的，是人们太快宣布自己已经明白，然后停止提问。\n\n你会把过硬的结论拆开看看，也会顺手嘲笑那个急着要结论的自己。这种玩笑是一种诚实：承认不知道，比假装知道更需要力气。",
      "keywords": [
        "不知道",
        "提问",
        "自嘲",
        "荒诞",
        "谦逊"
      ],
      "symbol": "questionStamp",
      "vector": {
        "memory": -2,
        "mobility": 1,
        "relationship": 0,
        "expression": 2,
        "certainty": 3,
        "responsibility": -1,
        "resistance": 1,
        "grounding": -3
      },
      "calibration": 0.1163
    },
    {
      "songId": "bu-mo-sheng-de-ren",
      "title": "不陌生的人",
      "album": "再想想",
      "personalityName": "会把陌生人的求救当真的人",
      "shortDescription": "你会认真对待一个陌生人的求救，也会因无能为力而感到难过。你需要记得，承认自己同样迷路，并不等于冷漠。",
      "fullDescription": "你会把一个陌生人的求救当真。别人绕开的时候，你多问了一句，然后为帮不上而难过很久。\n\n你需要记得的是：你也可能正在迷路，承认这件事不等于冷漠。能陪一段、能指一个方向，已经是很具体的善意。",
      "keywords": [
        "求救",
        "共情",
        "陌生人",
        "方向",
        "互助"
      ],
      "symbol": "twoRoads",
      "vector": {
        "memory": 0,
        "mobility": 1,
        "relationship": 2,
        "expression": 0,
        "certainty": 2,
        "responsibility": 3,
        "resistance": 0,
        "grounding": 2
      },
      "calibration": -0.0903
    },
    {
      "songId": "an-he-qiao",
      "title": "安和桥",
      "album": "安和桥北",
      "personalityName": "为回不去的夏天留座的人",
      "shortDescription": "你知道那些夏天不会回来，也知道很多梦想最后会变成妥协。但你仍愿意替过去保留一个位置，因为接受告别，从来不等于否认它曾经重要。",
      "fullDescription": "你知道有些夏天不会回来，也知道很多曾经笃定的事，最后都换了形状。你没有假装不在意。\n\n但你也没有停在那里。你替过去留了一个位置，偶尔回去坐一会儿再走。接受告别，从来不等于否认它曾经重要。",
      "keywords": [
        "纪念",
        "夏天",
        "城市",
        "遗憾",
        "告别"
      ],
      "symbol": "bridge",
      "vector": {
        "memory": 3,
        "mobility": 0,
        "relationship": -1,
        "expression": -2,
        "certainty": 0,
        "responsibility": 1,
        "resistance": -2,
        "grounding": 1
      },
      "calibration": 0.0257
    },
    {
      "songId": "ka-bi-ba-la-de-hai",
      "title": "卡比巴拉的海",
      "album": "安和桥北",
      "personalityName": "看懂漂泊代价的迟来掌舵者",
      "shortDescription": "你曾经以为不停前进就是成长，后来才发现，有些珍贵的人一直在身后。现在的你不再只想远行，也开始学习怎样把疲倦的船带回家。",
      "fullDescription": "你曾经把不停向前当成唯一的答案，直到某次回头，发现一些重要的人一直站在原来的地方。\n\n现在的你还是会想远行，但学会了先把该负的责任接住。不再假装疲倦不存在，也不再让身边的人独自承担你的漂泊。",
      "keywords": [
        "漂泊",
        "悔意",
        "返航",
        "承担",
        "成长"
      ],
      "symbol": "boat",
      "vector": {
        "memory": 2,
        "mobility": 0,
        "relationship": 1,
        "expression": 0,
        "certainty": -1,
        "responsibility": 3,
        "resistance": -1,
        "grounding": 1
      },
      "calibration": 0.0123
    },
    {
      "songId": "luo-yan",
      "title": "落雁",
      "album": "再想想",
      "personalityName": "甘做俗子凡夫的人",
      "shortDescription": "你不再急着证明自己比谁看得更深。人间没有标准答案，悲喜也不必解释干净。能和另一个普通人喝完一杯、唱完一首，就已经足够真实。",
      "fullDescription": "你不再急着证明自己比别人看得更深。人间没有标准答案，悲喜也不必解释干净。\n\n现在的你愿意做个普通人：和另一个普通人喝完一杯，唱完一首，聊些没有结论的事。这份通透不是认输，是终于不需要观众了。",
      "keywords": [
        "凡人",
        "悲喜",
        "人间",
        "通透",
        "普通"
      ],
      "symbol": "gooseCup",
      "vector": {
        "memory": -1,
        "mobility": 0,
        "relationship": 2,
        "expression": 0,
        "certainty": 1,
        "responsibility": 0,
        "resistance": -2,
        "grounding": 3
      },
      "calibration": 0.0804
    }
  ];

  // 巡演信息：长期活动，不绑定城市或场次。正式版接入后把 enabled 改为 true 并填入 cities。
  var TOUR_CONFIG = {
    enabled: false,
    message: '巡演信息将在正式版本中接入。',
    cities: []
  };

  /* ---------------- 启动一致性校验 ---------------- */

  function sortedUnique(values) {
    return Array.from(new Set(values)).sort();
  }

  function assertSameSet(label, actualValues, expectedValues) {
    var actual = sortedUnique(actualValues);
    var expected = sortedUnique(expectedValues);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(label + ' 不一致。actual=' + actual.join(',') + ' expected=' + expected.join(','));
    }
  }

  function validateProjectData(results, questions) {
    if (results.length !== 19) {
      throw new Error('歌曲人格结果应为19项，当前为' + results.length + '项');
    }

    var resultIds = results.map(function (item) { return item.songId; });
    var audioIds = Object.keys(SONG_AUDIO);
    var audioFiles = audioIds.map(function (id) { return SONG_AUDIO[id].file; });

    if (new Set(resultIds).size !== resultIds.length) {
      throw new Error('歌曲人格结果中存在重复 songId');
    }
    if (new Set(audioFiles).size !== audioFiles.length) {
      throw new Error('音频映射中存在重复文件');
    }
    if (audioIds.length !== 19) {
      throw new Error('SONG_AUDIO 应为19项，当前为' + audioIds.length + '项');
    }

    assertSameSet('结果 songId', resultIds, EXPECTED_SONG_IDS);
    assertSameSet('音频 songId', audioIds, EXPECTED_SONG_IDS);

    results.forEach(function (result) {
      var audioTrack = SONG_AUDIO[result.songId];
      if (!audioTrack) {
        throw new Error('结果缺少音频映射：' + result.songId);
      }
      if (result.title !== audioTrack.title) {
        throw new Error('中文歌名不一致：' + result.songId + '，result=' + result.title + '，audio=' + audioTrack.title);
      }
      if (/intro|outro|excluded/i.test(result.songId) || /Intro|Outro/.test(result.title)) {
        throw new Error('结果池中出现 Intro / Outro：' + result.songId);
      }
      Object.keys(result.vector).forEach(function (dim) {
        if (DIMENSIONS.indexOf(dim) === -1) {
          throw new Error('非法维度：' + result.songId + ' → ' + dim);
        }
      });
    });

    EXCLUDED_AUDIO.forEach(function (item) {
      audioFiles.forEach(function (file) {
        if (file === item.file) {
          throw new Error('排除文件出现在音频映射中：' + item.file);
        }
      });
    });

    questions.forEach(function (question, questionIndex) {
      question.options.forEach(function (option, optionIndex) {
        Object.keys(option.v || {}).forEach(function (dim) {
          if (DIMENSIONS.indexOf(dim) === -1) {
            throw new Error('非法维度：question=' + questionIndex + ' option=' + optionIndex + ' dim=' + dim);
          }
        });
        Object.keys(option.weights || {}).forEach(function (songId) {
          if (EXPECTED_SONG_IDS.indexOf(songId) === -1) {
            throw new Error('非法权重 ID：question=' + questionIndex + ' option=' + optionIndex + ' songId=' + songId);
          }
        });
      });
    });

    return true;
  }

  global.SDY_DATA = {
    EXPECTED_SONG_IDS: EXPECTED_SONG_IDS,
    SONG_AUDIO: SONG_AUDIO,
    EXCLUDED_AUDIO: EXCLUDED_AUDIO,
    DIMENSIONS: DIMENSIONS,
    DIMENSION_WEIGHTS: DIMENSION_WEIGHTS,
    QUESTIONS: QUESTIONS,
    RESULTS: RESULTS,
    TOUR_CONFIG: TOUR_CONFIG,
    validateProjectData: validateProjectData
  };
})(typeof window !== 'undefined' ? window : this);
