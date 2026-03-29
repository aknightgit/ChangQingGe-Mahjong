/**
 * 生成6个AI玩家的policy文件
 * 基于当前best-policy.json微调各参数，体现不同风格
 */
import fs from 'fs'
import path from 'path'

// 基准policy（当前最优）
const BASE = {
  "selfWinChance": 0.925,
  "selfWinWildBoost": 0.04,
  "discardHuChance": 0.929,
  "discardHuWildPenalty": 0.131,
  "discardHuMenQingPenalty": 0.053,
  "pengChance": 0.65,
  "kongChance": 0.299,
  "chowChance": 0.06,
  "pengWildBoost": 0.067,
  "kongWildBoost": 0.261,
  "chowWildPenalty": 0.1,
  "bailoutBuildWildBoost": 0.403,
  "bailoutHuPenaltyPerMeld": 0.055,
  "honorRushThreshold": 2,
  "honorRushBoost": 0.492,
  "pairWeight": 4.82,
  "nearWeight": 0.1,
  "honorPairBonus": 0.261,
  "wildKeepPenalty": 509,
  "dominantSuitBonus": 2.84,
  "tripletKeepBonus": 4.525,
  "honorTripletKeepBonus": 11.79,
  "windDragonPairKeepBonus": 6.8,
  "tripletComboBonus": 2.77,
  "flushChaseBonus": 3.57
}

// 6个AI角色定义
const PROFILES = {
  'AI-小胖': {
    name: 'AI-小胖',
    style: '稳健型',
    desc: '尽量前两名胡牌，不做第三甚至最后输家，捉冲意愿高',
    mod: {
      discardHuChance: 0.98,        // 捉冲意愿极高
      discardHuWildPenalty: 0.05,   // 有花也果断捉
      discardHuMenQingPenalty: 0.02,// 不太在乎门清
      selfWinChance: 0.95,          // 自摸也积极
      pengChance: 0.8,              // 碰了就加速
      kongChance: 0.5,              // 杠也愿意
      chowChance: 0.15,             // 偶尔吃
      pairWeight: 3.5,              // 对子优先级中等
      dominantSuitBonus: 3.5,       // 集中花色加速
      wildKeepPenalty: 800,         // 百搭死守住
    }
  },
  'AI-老赵': {
    name: 'AI-老赵',
    style: '进攻型',
    desc: '不怕三口，勇敢进攻，甚至主动制造三口四口',
    mod: {
      pengChance: 0.95,             // 碰到就碰
      kongChance: 0.7,              // 杠也很积极
      chowChance: 0.85,             // 吃牌非常积极
      chowWildPenalty: 0.02,        // 不怎么在乎百搭不吃的规则
      bailoutBuildWildBoost: 0.8,   // 有百搭就建立三口
      bailoutHuPenaltyPerMeld: 0.02,// 三口四口也果断胡
      tripletComboBonus: 4.0,       // 追求碰碰胡
      discardHuChance: 0.75,        // 宁可不等别人放冲
      selfWinChance: 0.85,          // 更倾向进攻
      pairWeight: 2.5,              // 对子不太保留
    }
  },
  'AI-阿水': {
    name: 'AI-阿水',
    style: '做大做强型',
    desc: '爱做大牌，能门清就门清',
    mod: {
      selfWinChance: 0.98,          // 大牌要自摸
      discardHuChance: 0.6,         // 不急着捉冲
      discardHuMenQingPenalty: 0.3, // 门清对捉冲惩罚大（保护门清）
      pengChance: 0.25,             // 不碰（保留门清）
      kongChance: 0.15,             // 不杠（影响门清）
      chowChance: 0.03,             // 不吃
      flushChaseBonus: 6.0,         // 追清一色
      tripletComboBonus: 5.0,       // 追碰碰胡
      honorTripletKeepBonus: 15.0,  // 大牌要素
      windDragonPairKeepBonus: 10.0,// 保留风箭
      pairWeight: 6.0,              // 对子很重要
      wildKeepPenalty: 2000,        // 百搭绝不放
      dominantSuitBonus: 5.0,       // 同花色大牌
    }
  },
  'AI-AK': {
    name: 'AI-AK',
    style: '默认型',
    desc: '指向当前默认的best policy',
    mod: {}  // 完全用基准policy
  },
  'AI-老蒋': {
    name: 'AI-老蒋',
    style: '均衡型',
    desc: 'best policy，再偏保守一点点',
    mod: {
      selfWinChance: 0.95,          // 稍微更积极一点
      discardHuChance: 0.95,        // 稍微更愿意捉冲
      pengChance: 0.7,              // 碰稍微多点
      kongChance: 0.35,             // 杠稍微多点
      chowChance: 0.1,              // 偶尔吃
      pairWeight: 5.0,              // 对子保留稍高
      wildKeepPenalty: 600,         // 百搭保护略强
    }
  },
  'AI-小猪': {
    name: 'AI-小猪',
    style: '风险规避型',
    desc: '偏保守，风险规避，尽量提前捉冲走人',
    mod: {
      selfWinChance: 0.85,          // 不追求自摸
      discardHuChance: 0.99,        // 一有机会就捉冲
      discardHuWildPenalty: 0.01,   // 有花也冲
      discardHuMenQingPenalty: 0.0, // 门清也不管
      pengChance: 0.9,              // 碰了加速胡
      kongChance: 0.6,              // 杠也积极
      chowChance: 0.3,              // 偶尔吃
      pairWeight: 2.0,              // 对子不太重要
      tripletKeepBonus: 2.0,        // 不执着刻子
      wildKeepPenalty: 300,         // 百搭适度保护
      flushChaseBonus: 1.0,         // 不做大牌
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
    metrics: {
      huRate: 0.0,
      selfDrawRate: 0.0,
      lastPlayerRate: 0.0,
      note: '手动配置，待训练验证'
    },
    policy
  }
}

// 输出目录
const outDir = '/home/node/.openclaw/workspace/ChangQingGe-Mahjong/training-output/policies/characters'
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
