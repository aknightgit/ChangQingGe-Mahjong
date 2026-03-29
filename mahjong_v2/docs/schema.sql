-- 长清阁麻将数据库表结构
-- MariaDB 10.x+

-- 创建数据库
CREATE DATABASE IF NOT EXISTS changqingge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE changqingge;

-- 游戏记录表
CREATE TABLE IF NOT EXISTS game_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id VARCHAR(64) NOT NULL,
    player_id INT NOT NULL,
    player_name VARCHAR(32),
    score INT DEFAULT 0,
    fan INT DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_game_id (game_id),
    INDEX idx_player_id (player_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 玩家统计表
CREATE TABLE IF NOT EXISTS player_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT UNIQUE NOT NULL,
    player_name VARCHAR(32),
    total_games INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    total_score BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 游戏房间表
CREATE TABLE IF NOT EXISTS game_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(32) UNIQUE NOT NULL,
    status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    dealer_id INT DEFAULT 0,
    current_round INT DEFAULT 1,
    global_multiplier INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 房间玩家关联表
CREATE TABLE IF NOT EXISTS room_players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(32) NOT NULL,
    player_id INT NOT NULL,
    player_name VARCHAR(32),
    position INT NOT NULL COMMENT '0-东 1-南 2-西 3-北',
    is_ready BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES game_rooms(room_id) ON DELETE CASCADE,
    UNIQUE KEY idx_room_position (room_id, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 示例查询
-- SELECT * FROM player_stats ORDER BY total_score DESC LIMIT 10;
-- SELECT * FROM game_records WHERE game_id = 'xxx';
