#!/usr/bin/env python3
"""
Mahjong tile recognition via Ollama qwen3.5:9b vision.
Reads each image, identifies the tile, renames to standard naming.
"""
import os
import sys
import json
import base64
import urllib.request

OLLAMA_HOST = "http://192.168.3.114:11434"
MODEL = "qwen3.5:9b"
TILES_DIR = "/home/node/.openclaw/workspace/tiles_rename"
OUTPUT_DIR = "/home/node/.openclaw/workspace/ChangQingGe-Mahjong/assets/tiles"

# Standard tile naming
# Winds: east(东), south(南), west(西), north(北)
# Dragons: zhong(中), fa(发), bai(白)  
# Characters(万): wan1-wan9
# Bamboo(条): tiao1-tiao9
# Dots(筒): tong1-tong9

PROMPT = """你是一个麻将牌识别专家。请仔细观察这张图片中的麻将牌面。

请只回答这个麻将牌的标准英文名称，用以下格式之一：
- 万牌: wan1, wan2, wan3, wan4, wan5, wan6, wan7, wan8, wan9
- 条牌: tiao1, tiao2, tiao3, tiao4, tiao5, tiao6, tiao7, tiao8, tiao9
- 筒牌: tong1, tong2, tong3, tong4, tong5, tong6, tong7, tong8, tong9
- 风牌: east(东), south(南), west(西), north(北)
- 箭牌: zhong(中), fa(发), bai(白)

只回答名称，不要任何解释。例如：wan6 或 fa 或 east"""

def identify_tile(image_path):
    """Send image to Ollama and get tile name."""
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()
    
    payload = json.dumps({
        "model": MODEL,
        "messages": [{
            "role": "user",
            "content": PROMPT,
            "images": [img_b64]
        }],
        "stream": False,
        "options": {"temperature": 0}
    }).encode()
    
    req = urllib.request.Request(
        f"{OLLAMA_HOST}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read())
    
    answer = result["message"]["content"].strip().lower()
    # Clean up - extract just the tile name
    for tile in ["wan1","wan2","wan3","wan4","wan5","wan6","wan7","wan8","wan9",
                 "tiao1","tiao2","tiao3","tiao4","tiao5","tiao6","tiao7","tiao8","tiao9",
                 "tong1","tong2","tong3","tong4","tong5","tong6","tong7","tong8","tong9",
                 "east","south","west","north","zhong","fa","bai"]:
        if tile in answer:
            return tile
    # If no match, return raw answer for debugging
    return f"UNKNOWN:{answer}"

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    files = sorted([f for f in os.listdir(TILES_DIR) if f.endswith(".jpg")])
    print(f"Found {len(files)} images to process\n")
    
    results = {}
    errors = []
    
    for i, fname in enumerate(files):
        path = os.path.join(TILES_DIR, fname)
        print(f"[{i+1}/{len(files)}] {fname} → ", end="", flush=True)
        
        try:
            tile_name = identify_tile(path)
            if tile_name.startswith("UNKNOWN:"):
                print(f"❓ {tile_name}")
                errors.append((fname, tile_name))
            else:
                # Check for duplicates
                if tile_name in results:
                    ext = 2
                    while f"{tile_name}_{ext}" in results.values():
                        ext += 1
                    tile_name_out = f"{tile_name}_{ext}"
                else:
                    tile_name_out = tile_name
                
                results[fname] = tile_name_out
                
                # Copy to output dir
                out_path = os.path.join(OUTPUT_DIR, f"{tile_name_out}.jpg")
                import shutil
                shutil.copy2(path, out_path)
                print(f"✅ {tile_name_out}")
        except Exception as e:
            print(f"❌ Error: {e}")
            errors.append((fname, str(e)))
    
    print(f"\n{'='*50}")
    print(f"Results: {len(results)} success, {len(errors)} errors")
    
    if errors:
        print(f"\nErrors:")
        for fname, err in errors:
            print(f"  {fname}: {err}")
    
    # Summary by tile type
    tile_counts = {}
    for name in results.values():
        base = name.split("_")[0]
        tile_counts[base] = tile_counts.get(base, 0) + 1
    
    print(f"\nTile distribution:")
    for tile, count in sorted(tile_counts.items()):
        print(f"  {tile}: {count}")
    
    # Save results
    with open(os.path.join(TILES_DIR, "recognition_results.json"), "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to recognition_results.json")

if __name__ == "__main__":
    main()
