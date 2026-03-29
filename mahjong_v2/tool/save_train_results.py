import json
import pymysql
from pathlib import Path

HOST = '192.168.3.241'
PORT = 33061
USER = 'openclaw'
PWD = '0penC1aw'
DB = 'mahjong'
TABLE = 'mahjong_train_results'

jsonl_path = Path('ai_logs/train_results.jsonl')
if not jsonl_path.exists():
    raise SystemExit(f'jsonl not found: {jsonl_path}')

conn = pymysql.connect(host=HOST, port=PORT, user=USER, password=PWD, db=DB, autocommit=True)
cur = conn.cursor()

insert_sql = f"""
INSERT INTO {TABLE} (
  train_session, game_index, steps, is_blood_battle, win_order,
  winner_index, winner_name, win_type, hu_type,
  hand_tiles, melds, is_menqing, bao_relations, dice_values,
  base_points, round_multiplier, extra_multiplier, total_points,
  winner_delta, all_deltas, settlement_detail,
  from_player_index, from_player_name
) VALUES (
  %s,%s,%s,%s,%s,
  %s,%s,%s,%s,
  %s,%s,%s,%s,%s,
  %s,%s,%s,%s,
  %s,%s,%s,
  %s,%s
)
"""

count = 0
with jsonl_path.open('r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        rec = json.loads(line)
        cur.execute(insert_sql, (
            rec.get('train_session'), rec.get('game_index'), rec.get('steps'),
            bool(rec.get('is_blood_battle')), rec.get('win_order'),
            rec.get('winner_index'), rec.get('winner_name'), rec.get('win_type'), rec.get('hu_type'),
            json.dumps(rec.get('all_tiles') or rec.get('hand_tiles')),
            json.dumps(rec.get('meld_details') or rec.get('melds')),
            bool(rec.get('is_menqing')), json.dumps(rec.get('bao_relations')),
            json.dumps(rec.get('dice_values')),
            rec.get('base_points'), rec.get('round_multiplier'), rec.get('extra_multiplier'), rec.get('total_points'),
            rec.get('winner_delta'), json.dumps(rec.get('deltas')),
            json.dumps(rec.get('details')),
            rec.get('from_index'), rec.get('from_name')
        ))
        count += 1

print(f'Inserted {count} rows into {DB}.{TABLE}')
cur.close(); conn.close()
