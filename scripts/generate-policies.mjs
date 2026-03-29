/**
 * 生成6个AI玩家的policy文件
 * 基于训练最优policy (champion-r10) 微调各参数，体现不同风格
 */
import fs from 'fs'
import path from 'path'

// 基准policy（2026-03-30 训练结果 champion-r10）
const BASE = {
  "selfWinChance": 0.8355,
  "selfWinWildBoost": 0.0957,
  "discardHuChance": 0.9387,
  "discardHuWildPenalty": 0.3198,
  "discardHuMenQingPenalty": 0.2067,
  "pengChance": 0.8113,
  "kongChance": 0.4367,
  "chowChance": 0.1591,
  "pengWildBoost": 0,
  "kongWildBoost": 0.0693,
  "chowWildPenalty": 0.1132,
  "bailoutBuildWildBoost": 0.1704,
  "bailoutHuPenaltyPerMeld": 0.0402,
  "honorRushThreshold": 2,
  "honorRushBoost": 0.4264,
  "pairWeight": 4.1499,
  "nearWeight": 2.168,
  "honorPairBonus": 2.3602,
  "wildKeepPenalty": 1491.66,
  "dominantSuitBonus": 0,
  "tripletKeepBonus": 3.8235,
  "honorTripletKeepBonus": 7.0,
  "windDragonPairKeepBonus": 10.9668,
  "tripletComboBonus": 2.7776,
  "flushChaseBonus": 1.3572
}

// 6个AI角色定义
const PROFILES = {
  'AI-小胖': {
    name: 'AI-小胖',
    style: '稳健型',
    desc: '尽量前两名胡牌，不做第三甚至最后输家，捉冲意愿高',
    mod: {
      discardHuChance: 0.99,        // 捉冲意愿极高
      discardHuWildPenalty: 0.1,    // 有花也果断捉
      discardHuMenQingPenalty: 0.05,// 不太在乎门清
      selfWinChance: 0.90,          // 自摸也积极
      pengChance: 0.90,             // 碰了就加速
      kongChance: 0.55,             // 杠也愿意
      chowChance: 0.20,             // 偶尔吃
      pairWeight: 3.5,              // 对子优先级中等
      dominantSuitBonus: 2.0,       // 集中花色加速
      flushChaseBonus: 0.8,         // 不追求大牌
      tripletComboBonus: 1.5,       // 不执着碰碰胡
    }
  },
  'AI-老赵': {
    name: 'AI-老赵',
    style: '进攻型',
    desc: '不怕三口，勇敢进攻，甚至主动制造三口四口',
    mod: {
      pengChance: 0.95,             // 碰到就碰
      kongChance: 0.70,             // 杠也很积极
      chowChance: 0.85,             // 吃牌非常积极
      chowWildPenalty: 0.02,        // 不怎么在乎百搭不吃的规则
      bailoutBuildWildBoost: 0.8,   // 有百搭就建立三口
      bailoutHuPenaltyPerMeld: 0.02,// 三口四口也果断胡
      tripletComboBonus: 4.5,       // 追求碰碰胡
      discardHuChance: 0.75,        // 宁可不等别人放冲
      selfWinChance: 0.80,          // 更倾向进攻
      pairWeight: 2.5,              // 对子不太保留
    }
  },
  'AI-阿水': {
    name: 'AI-阿水',
    style: '做大做强型',
    desc: '爱做大牌，能门清就门清，追求风一色/风碰，高风险高回报',
    mod: {
      selfWinChance: 0.98,          // 极高自摸意愿
      discardHuChance: 0.40,        // 不喜欢捉冲，等自摸
      discardHuWildPenalty: 0.5,    // 捉冲惩罚大
      discardHuMenQingPenalty: 0.4, // 门清保护
      pengChance: 0.15,             // 极少碰（保留门清+风牌）
      kongChance: 0.10,             // 极少杠（影响门清）
      chowChance: 0.02,             // 几乎不吃
      flushChaseBonus: 8.0,         // 追清一色
      tripletComboBonus: 6.0,       // 追碰碰胡
      honorTripletKeepBonus: 20.0,  // 风箭刻子极力保留
      windDragonPairKeepBonus: 15.0,// 风箭对子极力保留
      honorRushThreshold: 2,        // 2张风牌就开始做风一色
      honorRushBoost: 0.9,          // 风一色加成极高
      honorPairBonus: 5.0,          // 风对子极力保留
      pairWeight: 7.0,              // 对子很重要（风对+大牌对）
      wildKeepPenalty: 3000,        // 百搭绝不放
      dominantSuitBonus: 6.0,       // 同花色大牌
      tripletKeepBonus: 5.0,        // 刻子也重要
    }
  },
  'AI-AK': {
    name: 'AI-AK',
    style: '默认型',
    desc: '指向当前默认的best policy（训练最优）',
    mod: {}  // 完全用基准policy
  },
  'AI-老蒋': {
    name: 'AI-老蒋',
    style: '均衡型',
    desc: 'best policy，再偏保守一点点',
    mod: {
      selfWinChance: 0.88,          // 稍微更积极一点
      discardHuChance: 0.96,        // 稍微更愿意捉冲
      pengChance: 0.85,             // 碰稍微多点
      kongChance: 0.50,             // 杠稍微多点
      chowChance: 0.20,             // 偶尔吃
      pairWeight: 4.5,              // 对子保留稍高
      wildKeepPenalty: 1600,        // 百搭保护略强
    }
  },
  'AI-小猪': {
    name: 'AI-小猪',
    style: '风险规避型',
    desc: '偏保守，风险规避，尽量提前捉冲走人',
    mod: {
      selfWinChance: 0.78,          // 不追求自摸
      discardHuChance: 0.99,        // 一有机会就捉冲
      discardHuWildPenalty: 0.05,   // 有花也冲
      discardHuMenQingPenalty: 0.02,// 门清也不管
      pengChance: 0.90,             // 碰了加速胡
      kongChance: 0.65,             // 杠也积极
      chowChance: 0.30,             // 偶尔吃
      pairWeight: 2.0,              // 对子不太重要
      tripletKeepBonus: 2.0,        // 不执着刻子
      wildKeepPenalty: 800,         // 百搭适度保护
      flushChaseBonus: 0.8,         // 不做大牌
      tripletComboBonus: 1.0,       // 不执着碰碰胡
      bailoutHuPenaltyPerMeld: 0.15,// 百搭多时果断胡
    }
  }
}

// 生成policy
function generatePolicy(name, profile) {
  const policy = { ...BASE, ...profile.mod }
  policy.id = `${name}-${profile.style}`
  policy.savedAt = new Date().toISOString()
  return {
    name: name,
    style: profile.style,
    desc: profile.desc,
    savedAt: policy.savedAt,
    baseId: 'champion-r10',
    metrics: {
      huRate: 0.0,
      selfDrawRate: 0.0,
      lastPlayerRate: 0.0,
      note: '基于champion-r10训练最优policy微调，待实战验证'
    },
    policy
  }
}

// 输出目录
const outDir = '/home/node/.openclaw/workspace/ChangQingGe-Mahjong/AI_policies/characters'
fs.mkdirSync(outDir, { recursive: true })

// 生成6个policy文件
for (const [name, profile] of Object.entries(PROFILES)) {
  const data = generatePolicy(name, profile)
  const filename = `${name}.json`
  const filepath = path.join(outDir, filename)
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`✅ ${filename} (${profile.style})`)
}

console.log(`\n所有policy已保存到: ${outDir}`)
