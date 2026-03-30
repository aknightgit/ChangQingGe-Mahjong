#!/usr/bin/env python3
"""Resume tile recognition from a specific index."""
import os, sys, json, base64, urllib.request, shutil

OLLAMA_HOST = "http://192.168.3.114:11434"
MODEL = "qwen3.5:9b"
TILES_DIR = "/home/node/.openclaw/workspace/ChangQingGe-Mahjong/tiles_rename"
OUTPUT_DIR = "/home/node/.openclaw/workspace/ChangQingGe-Mahjong/assets/tiles"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PROMPT = """你是一个麻将牌识别专家。请仔细观察这张图片中的麻将牌面。
请只回答这个麻将牌的标准英文名称，用以下格式之一：
- 万牌: wan1, wan2, wan3, wan4, wan5, wan6, wan7, wan8, wan9
- 条牌: tiao1, tiao2, tiao3, tiao4, tiao5, tiao6, tiao7, tiao8, tiao9
- 筒牌: tong1, tong2, tong3, tong4, tong5, tong6, tong7, tong8, tong9
- 风牌: east(东), south(南), west(西), north(北)
- 箭牌: zhong(中), fa(发), bai(白)
只回答名称，不要任何解释。例如：wan6 或 fa 或 east"""

ALL_TILES = ["wan1","wan2","wan3","wan4","wan5","wan6","wan7","wan8","wan9",
             "tiao1","tiao2","tiao3","tiao4","tiao5","tiao6","tiao7","tiao8","tiao9",
             "tong1","tong2","tong3","tong4","tong5","tong6","tong7","tong8","tong9",
             "east","south","west","north","zhong","fa","bai"]

def identify_tile(image_path):
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()
    payload = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": PROMPT, "images": [img_b64]}],
        "stream": False,
        "options": {"temperature": 0}
    }).encode()
    req = urllib.request.Request(f"{OLLAMA_HOST}/api/chat", data=payload,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        result = json.loads(resp.read())
    answer = result["message"]["content"].strip().lower()
    for tile in ALL_TILES:
        if tile in answer:
            return tile
    return f"UNKNOWN:{answer}"

def main():
    # Load existing results
    results_file = os.path.join(TILES_DIR, "recognition_results.json")
    if os.path.exists(results_file):
        with open(results_file) as f:
            results = json.load(f)
    else:
        results = {}
    
    files = sorted([f for f in os.listdir(TILES_DIR) if f.endswith(".jpg")])
    start_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    
    print(f"Resuming from index {start_idx}, {len(files) - start_idx} remaining\n")
    
    for i in range(start_idx, len(files)):
        fname = files[i]
        if fname in results:
            print(f"[{i+1}/{len(files)}] {fname} → ⏭️ already done: {results[fname]}")
            continue
        
        path = os.path.join(TILES_DIR, fname)
        print(f"[{i+1}/{len(files)}] {fname} → ", end="", flush=True)
        
        try:
            tile_name = identify_tile(path)
            if tile_name.startswith("UNKNOWN:"):
                print(f"❓ {tile_name}")
            else:
                results[fname] = tile_name
                out_path = os.path.join(OUTPUT_DIR, f"{tile_name}.jpg")
                # Handle duplicates
                if os.path.exists(out_path):
                    ext = 2
                    while os.path.exists(os.path.join(OUTPUT_DIR, f"{tile_name}_{ext}.jpg")):
                        ext += 1
                    tile_name = f"{tile_name}_{ext}"
                    out_path = os.path.join(OUTPUT_DIR, f"{tile_name}.jpg")
                shutil.copy2(path, out_path)
                results[fname] = tile_name
                print(f"✅ {tile_name}")
        except Exception as e:
            print(f"❌ {e}")
        
        # Save after each
        with open(results_file, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main()
