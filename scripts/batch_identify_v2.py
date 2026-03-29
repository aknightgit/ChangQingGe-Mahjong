import json, base64, os, subprocess, sys

tiles_dir = sys.argv[1]
output_file = sys.argv[2]

prompt = (
    "这张麻将牌是什么？只回答牌面，不要多余描述。格式示例：\n"
    "筒子1、筒子2、筒子3、筒子4、筒子5、筒子6、筒子7、筒子8、筒子9\n"
    "条子1、条子2、条子3、条子4、条子5、条子6、条子7、条子8、条子9\n"
    "万子1、万子2、万子3、万子4、万子5、万子6、万子7、万子8、万子9\n"
    "风牌东、风牌南、风牌西、风牌北\n"
    "箭牌中、箭牌發、箭牌白\n"
    "花牌春、花牌夏、花牌秋、花牌冬、花牌梅、花牌兰、花牌竹、花牌菊"
)

files = sorted([f for f in os.listdir(tiles_dir) if f.endswith('.jpg')])
results = {}

for i, fname in enumerate(files):
    img_path = os.path.join(tiles_dir, fname)
    with open(img_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()

    payload = {
        "model": "qwen3.5:35b-a3b",
        "messages": [{"role": "user", "content": prompt, "images": [b64]}],
        "stream": False
    }

    req_file = '/home/node/.openclaw/workspace/vl-request.json'
    with open(req_file, 'w') as f:
        json.dump(payload, f)

    result = subprocess.run(
        ['curl', '-s', 'http://192.168.3.114:11434/api/chat', '-d', f'@{req_file}'],
        capture_output=True, text=True, timeout=120
    )

    try:
        resp = json.loads(result.stdout)
        answer = resp.get('message', {}).get('content', 'ERROR').strip()
    except:
        answer = 'PARSE_ERROR'

    results[fname] = answer
    print(f'[{i+1}/{len(files)}] {fname} → {answer}')

with open(output_file, 'w') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f'\nDone! {len(results)} tiles identified.')
