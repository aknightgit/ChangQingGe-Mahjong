import json, os, shutil

tiles_dir = '/data/mahjong-tiles/ak_jpg'
mapping_file = '/home/node/.openclaw/workspace/tile_mapping.json'

with open(mapping_file) as f:
    vl_results = json.load(f)

# 步骤1：根据VL结果重命名（使用中文原始名称，方便K哥核验）
renamed_count = 0
skipped_count = 0

for fname in sorted(os.listdir(tiles_dir)):
    if not fname.endswith('.jpg'):
        continue
    
    vl_name = vl_results.get(fname, '未知')
    
    # 清理VL结果中的空格和多余字符
    vl_name = vl_name.strip().replace(' ', '')
    
    # 特殊修正：8B模型常犯的错误
    # "竹子4" → 实际是"条子4"（tiao=条/竹）
    if vl_name == '竹子4':
        vl_name = '条子4'
    # "花牌白板" → "箭牌白"
    if vl_name == '花牌白板' or vl_name == '花牌白':
        vl_name = '箭牌白'
    
    # 构建新文件名：VL名称_原文件名.jpg（这样K哥可以看到原始文件）
    new_name = f'{vl_name}.jpg'
    
    # 检查是否已有同名文件
    new_path = os.path.join(tiles_dir, new_name)
    old_path = os.path.join(tiles_dir, fname)
    
    if os.path.exists(new_path) and new_name != fname:
        # 同名文件已存在，加序号
        base = vl_name
        counter = 2
        while True:
            candidate = f'{base}_{counter}.jpg'
            if not os.path.exists(os.path.join(tiles_dir, candidate)):
                new_name = candidate
                break
            counter += 1
        new_path = os.path.join(tiles_dir, new_name)
    
    if new_name != fname:
        shutil.move(old_path, new_path)
        print(f'  {fname} → {new_name}')
        renamed_count += 1
    else:
        skipped_count += 1

print(f'\n完成！重命名 {renamed_count} 个文件，跳过 {skipped_count} 个同名文件')
