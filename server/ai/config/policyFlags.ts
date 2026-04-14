/**
 * P2 特征管线开关配置
 * 通过环境变量或配置文件控制灰度发布
 */

/** 是否启用新管线（false=用legacy，true=用pipeline） */
export const USE_PIPELINE_SCORER = process.env.USE_PIPELINE_SCORER === 'true'

/** Shadow 模式：同时记录新旧评分对比日志 */
export const PIPELINE_SHADOW_MODE = process.env.PIPELINE_SHADOW_MODE !== 'false' // 默认开启

/** 是否记录 breakdown 日志（用于分析） */
export const PIPELINE_LOG_BREAKDOWN = process.env.PIPELINE_LOG_BREAKDOWN === 'true'

/** 阈值：shadow 模式下新管线与 legacy 分差多大时记录 */
export const SHADOW_LOG_THRESHOLD = 0.5

/** 温度参数（控制 sigmoid 随机性） */
export const SOFT_POLICY_TEMPERATURE = parseFloat(process.env.SOFT_POLICY_TEMPERATURE || '1.0')
