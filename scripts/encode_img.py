import json, base64, sys, os

img_path = sys.argv[1]
out_path = sys.argv[2]

with open(img_path, 'rb') as f:
    b64 = base64.b64encode(f.read()).decode()

prompt = (
    "这是一张麻将牌的特写照片。请识别这张牌是什么。\n"
    "回答格式：牌面类别（筒子/万子/条子/风牌/箭牌/花牌）+ 牌号（如1-9或东南西北中發白）。\n"
    "简短回答，不要多余描述。"
)

payload = {
    "model": "qwen3-vl:8b",
    "messages": [{
        "role": "user",
        "content": prompt,
        "images": [b64]
    }],
    "stream": False
}

with open(out_path, 'w') as f:
    json.dump(payload, f)

print(f'Written {os.path.getsize(out_path)} bytes')
