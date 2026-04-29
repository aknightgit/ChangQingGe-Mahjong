#!/usr/bin/env python3
import base64
import json
import os
import subprocess
import sys
import urllib.request

TTS_KEY = os.environ.get('MIMO_TP_KEY', 'tp-cja24dc29ly7r5uefo0ca7je3suzc3jxpkzuwgwg1iwvv4f0')
TTS_BASE_URL = os.environ.get('MIMO_TTS_BASE_URL', 'https://token-plan-cn.xiaomimimo.com/v1')
VOICE = os.environ.get('MIMO_TTS_VOICE', 'Chloe')
STYLE_PROMPT = os.environ.get('MIMO_TTS_STYLE_PROMPT', '用更高亢、更有力量感、更清晰利落的中文女声朗读，节奏稳，吐字准，像标准游戏配音，不要卖萌，不要拖音。')
OUT_DIR = '/home/node/.openclaw/workspace/ChangQingGe-Mahjong/public/assets/voice/pure_zh'

TILES = {
    'wan_1': '一万', 'wan_2': '二万', 'wan_3': '三万', 'wan_4': '四万', 'wan_5': '五万', 'wan_6': '六万', 'wan_7': '七万', 'wan_8': '八万', 'wan_9': '九万',
    'tong_1': '一筒', 'tong_2': '二筒', 'tong_3': '三筒', 'tong_4': '四筒', 'tong_5': '五筒', 'tong_6': '六筒', 'tong_7': '七筒', 'tong_8': '八筒', 'tong_9': '九筒',
    'tiao_1': '一条', 'tiao_2': '二条', 'tiao_3': '三条', 'tiao_4': '四条', 'tiao_5': '五条', 'tiao_6': '六条', 'tiao_7': '七条', 'tiao_8': '八条', 'tiao_9': '九条',
    'feng_east': '东风', 'feng_south': '南风', 'feng_west': '西风', 'feng_north': '北风',
    'jian_zhong': '红中', 'jian_fa': '发财', 'jian_bai': '白板',
    'hua_spring': '花', 'hua_summer': '花', 'hua_autumn': '花', 'hua_winter': '花',
    'hua_plum': '花', 'hua_orchid': '花', 'hua_bamboo': '花', 'hua_chrysanthemum': '花',
}

PROMPT_PREFIX = '请严格按照要求，用中文女声朗读以下文本：'


def ensure_dir(path):
    os.makedirs(path, exist_ok=True)


def generate_tts(text, output_path):
    payload = json.dumps({
        'model': 'mimo-v2.5-tts',
        'messages': [
            {'role': 'user', 'content': f'{PROMPT_PREFIX}{STYLE_PROMPT}'},
            {'role': 'assistant', 'content': text}
        ],
        'audio': {'voice': VOICE, 'format': 'mp3'}
    }).encode()
    req = urllib.request.Request(
        f'{TTS_BASE_URL}/chat/completions',
        data=payload,
        headers={'Content-Type': 'application/json', 'api-key': TTS_KEY}
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read())
    b64 = data['choices'][0]['message']['audio']['data']
    audio_bytes = base64.b64decode(b64)
    with open(output_path, 'wb') as f:
        f.write(audio_bytes)


def mp3_to_opus(src_mp3, dst_opus):
    subprocess.run([
        'ffmpeg', '-y', '-i', src_mp3,
        '-ar', '48000', '-ac', '2',
        '-c:a', 'libopus', '-b:a', '64k', dst_opus
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    ensure_dir(OUT_DIR)
    generated = []
    for key, text in TILES.items():
        mp3 = os.path.join(OUT_DIR, f'{key}.mp3')
        opus = os.path.join(OUT_DIR, f'{key}.opus')
        print(f'Generating {key} -> {text}')
        generate_tts(text, mp3)
        mp3_to_opus(mp3, opus)
        generated.append({'key': key, 'text': text, 'mp3': mp3, 'opus': opus, 'skipped': False})
    with open(os.path.join(OUT_DIR, 'manifest.json'), 'w', encoding='utf-8') as f:
        json.dump({'voice': VOICE, 'tiles': generated}, f, ensure_ascii=False, indent=2)
    print('OK')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)
