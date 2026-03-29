// 麻将牌枚举 - 从Unity移植
enum MahjongType {
  // 9个筒
  m_tong1, m_tong2, m_tong3, m_tong4, m_tong5, m_tong6, m_tong7, m_tong8, m_tong9,
  // 9个条
  m_tiao1, m_tiao2, m_tiao3, m_tiao4, m_tiao5, m_tiao6, m_tiao7, m_tiao8, m_tiao9,
  // 9个万
  m_wan1, m_wan2, m_wan3, m_wan4, m_wan5, m_wan6, m_wan7, m_wan8, m_wan9,
  // 7个风
  m_feng_dong, m_feng_nan, m_feng_xi, m_feng_bei,
  m_feng_zhong, m_feng_fa, m_feng_bai,
  // 8个花
  m_hua_chun, m_hua_xia, m_hua_qiu, m_hua_dong,
  m_hua_mei, m_hua_lan, m_hua_zhu, m_hua_ju,
}

// 操作类型
enum ActionType {
  at_hu,     // 胡
  at_gang,    // 杠
  at_peng,    // 碰
  at_chow,    // 吃
  at_pass,     // 过
  at_max,
}

// 胡牌类型
enum HuType {
  ht_normal,      // 平胡
  ht_qingyise,    // 清一色
  ht_quese,       // 缺一门
  ht_hua,         // 花牌
  ht_gang,        // 杠牌
  ht_angang,      // 暗杠
  ht_menqing,     // 门清
  ht_duiduihu,    // 对对胡
  ht_anqidui,     // 暗七对
  ht_longqidui,   // 龙七对
  ht_gangshanghua,// 杠上花
  ht_gangshangpao,// 杠上炮
  ht_haidihua,    // 海底花
  ht_haidipao,    // 海底炮
  ht_tianhu,      // 天胡
  ht_max,
}

// 玩家位置
enum PlayerPosition {
  pp_myself,    // 自己
  pp_left,      // 上家
  pp_opposite,  // 对家
  pp_right,     // 下家
  pp_max,
}

// 游戏状态
enum GamePlayState {
  mps_waiting,       // 等待玩家进入或准备
  mps_dice,         // 掷骰子
  mps_get_start,    // 开局拿牌
  mps_normal_gaming, // 正常游戏中
  mps_ending,       // 结束
}

// 花牌类型
enum MahjongHua {
  mh_feng,   // 风
  mh_tong,   // 筒
  mh_tiao,   // 条
  mh_wan,    // 万
  mh_hua,    // 花
  mh_max,
}

// 兼容旧代码的类型别名
typedef TileType = MahjongType;
typedef TileSuit = MahjongHua;
