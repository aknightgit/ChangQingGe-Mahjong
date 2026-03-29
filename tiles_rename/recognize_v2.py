#!/usr/bin/env python3
"""Mahjong tile recognition - robust version with retry."""
import os, json, base64, urllib.request, shutil, time

OLLAMA = "http://192.168.3.114:11434"
MODEL = "qwen3.5:9b"
SRC = "/home/node/.openclaw/workspace/ChangQingGe-Mahjong/tiles_rename"
DST = "/home/node/.openclaw/workspace/ChangQingGe-Mahjong/assets/tiles"
RESULTS_FILE = os.path.join(SRC, "recognition_results.json")
os.makedirs(DST, exist_ok=True)

PROMPT = """看这个麻将牌。只回答牌名，格式如下：
wan1/wan2/.../wan9 或 tiao1/tiao2/.../tiao9 或 tong1/tong2/.../tong9
或 east/south/west/north 或 zhong/fa/bai
只回答一个词，不解释。"""

ALL = [f"wan{i}" for i in range(1,10)] + [f"tiao{i}" for i in range(1,10)] + \
      [f"tong{i}" for i in range(1,10)] + ["east","south","west","north","zhong","fa","bai"]

def identify(path, retries=2):
    for attempt in range(retries + 1):
        try:
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            payload = json.dumps({
                "model": MODEL,
                "messages": [{"role":"user","content":PROMPT,"images":[b64]}],
                "stream": False,
                "options": {"temperature": 0}
            }).encode()
            req = urllib.request.Request(f"{OLLAMA}/api/chat", data=payload,
                                        headers={"Content-Type":"application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                ans = json.loads(r.read())["message"]["content"].strip().lower()
            for t in ALL:
                if t in ans:
                    return t
            return f"UNK:{ans}"
        except Exception as e:
            if attempt < retries:
                print(f"(retry {attempt+1})", end=" ", flush=True)
                time.sleep(2)
            else:
                return f"ERR:{e}"

def main():
    res = {}
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE) as f:
            res = json.load(f)
    
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".jpg"))
    n = len(files)
    
    for i, fn in enumerate(files):
        if fn in res:
            continue
        print(f"[{i+1}/{n}] {fn} -> ", end="", flush=True)
        tile = identify(os.path.join(SRC, fn))
        
        # Save result
        res[fn] = tile
        with open(RESULTS_FILE, "w") as f:
            json.dump(res, f, indent=2, ensure_ascii=False)
        
        # Copy file
        if not tile.startswith(("UNK:","ERR:")):
            dst = os.path.join(DST, f"{tile}.jpg")
            if os.path.exists(dst):
                ext = 2
                while os.path.exists(os.path.join(DST, f"{tile}_{ext}.jpg")):
                    ext += 1
                tile = f"{tile}_{ext}"
                res[fn] = tile
                with open(RESULTS_FILE, "w") as f:
                    json.dump(res, f, indent=2, ensure_ascii=False)
                dst = os.path.join(DST, f"{tile}.jpg")
            shutil.copy2(os.path.join(SRC, fn), dst)
        
        print(f"{tile}")
    
    # Summary
    print(f"\n=== Done: {len([v for v in res.values() if not v.startswith(('UNK:','ERR:'))])}/{n} success ===")
    errors = {k:v for k,v in res.items() if v.startswith(("UNK:","ERR:"))}
    if errors:
        print(f"Errors ({len(errors)}):")
        for k,v in errors.items():
            print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
