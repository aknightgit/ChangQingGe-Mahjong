#!/usr/bin/env python3
"""使用 qwen3.5:9b 批量分析 /data/PICTEST/*.png（2并发）"""
import base64, json, urllib.request, os, shutil, glob, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed

DIR = "/data/PICTEST"
X_DIR = os.path.join(DIR, "x")
MM_DIR = os.path.join(DIR, "mm")
WORKERS = 2
TIMEOUT = 90  # 秒

def classify_image(img_path):
    with open(img_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    prompt = ("图片分类：只回答一个字母\n"
              "A=色情/暴露/成人内容  B=正常穿着的女性  C=非女性/非人物/其他\n"
              "只回答A/B/C一个字母")
    payload = json.dumps({
        'model': 'qwen3.5:9b',
        'messages': [{'role': 'user', 'content': prompt, 'images': [b64]}],
        'stream': False
    }).encode()
    req = urllib.request.Request('http://192.168.3.114:11434/api/chat', data=payload,
                                  headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode())
            answer = data.get('message', {}).get('content', 'C').strip().upper()
            if answer.startswith('A'): return 'x'
            elif answer.startswith('B'): return 'mm'
            else: return 'other'
    except Exception as e:
        print(f"  ERR {os.path.basename(img_path)}: {e}", file=sys.stderr)
        return 'error'

def main():
    files = sorted(glob.glob(os.path.join(DIR, "*.png")))
    files = [f for f in files if os.path.getsize(f) > 10240]  # >10KB
    total = len(files)
    print(f"待分析: {total} 张, {WORKERS} 并发, 超时{TIMEOUT}s")
    count = {'x': 0, 'mm': 0, 'other': 0, 'error': 0}
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        future_map = {pool.submit(classify_image, f): f for f in files}
        for i, future in enumerate(as_completed(future_map)):
            fpath = future_map[future]
            fname = os.path.basename(fpath)
            try:
                result = future.result()
            except Exception as e:
                result = 'error'
                print(f"  EXC {fname}: {e}", file=sys.stderr)
            
            if result == 'x':
                shutil.move(fpath, os.path.join(X_DIR, fname))
            elif result == 'mm':
                shutil.move(fpath, os.path.join(MM_DIR, fname))
            
            count[result] = count.get(result, 0) + 1
            elapsed = time.time() - t0
            rate = (i+1) / elapsed
            eta = (total - i - 1) / rate if rate > 0 else 0
            if (i+1) % 10 == 0 or (i+1) <= 3:
                print(f"[{i+1}/{total}] {fname} → {result} | {rate:.2f}img/s | ETA:{int(eta/60)}m{int(eta%60)}s")

    elapsed = time.time() - t0
    print(f"\n✅ 完成! {elapsed/60:.1f}分钟 | x:{count['x']} mm:{count['mm']} 保留:{count['other']} 错误:{count['error']}")

if __name__ == '__main__':
    main()
