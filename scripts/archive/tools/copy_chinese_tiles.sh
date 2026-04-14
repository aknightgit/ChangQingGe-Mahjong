#!/bin/bash
# 把 tiles_rename/ 里的中文命名牌图复制到 ak_jpg/ 并用英文文件名
# 东南西北 4张风牌没有中文命名，跳过（ak_jpg 里已有）

SRC="/home/node/.openclaw/workspace/ChangQingGe-Mahjong/tiles_rename"
DST="/home/node/.openclaw/workspace/ChangQingGe-Mahjong/public/assets/tileset/ak_jpg"

# 中文 → 英文 映射
declare -A MAP=(
  ["一万.jpg"]="man1.jpg"
  ["二万.jpg"]="man2.jpg"
  ["三万.jpg"]="man3.jpg"
  ["四万.jpg"]="man4.jpg"
  ["五万.jpg"]="man5.jpg"
  ["六万.jpg"]="man6.jpg"
  ["七万.jpg"]="man7.jpg"
  ["八万.jpg"]="man8.jpg"
  ["九万.jpg"]="man9.jpg"
  ["一筒.jpg"]="pin1.jpg"
  ["二筒.jpg"]="pin2.jpg"
  ["三筒.jpg"]="pin3.jpg"
  ["四筒.jpg"]="pin4.jpg"
  ["五筒.jpg"]="pin5.jpg"
  ["六筒.jpg"]="pin6.jpg"
  ["七筒.jpg"]="pin7.jpg"
  ["八筒.jpg"]="pin8.jpg"
  ["九筒.jpg"]="pin9.jpg"
  ["一条.jpg"]="bamboo1.jpg"
  ["二条.jpg"]="bamboo2.jpg"
  ["三条.jpg"]="bamboo3.jpg"
  ["四条.jpg"]="bamboo4.jpg"
  ["五条.jpg"]="bamboo5.jpg"
  ["六条.jpg"]="bamboo6.jpg"
  ["七条.jpg"]="bamboo7.jpg"
  ["八条.jpg"]="bamboo8.jpg"
  ["九条.jpg"]="bamboo9.jpg"
  ["中.jpg"]="zhong.jpg"
  ["发.jpg"]="fa.jpg"
  ["白板.jpg"]="bai.jpg"
  ["春.jpg"]="spring.jpg"
  ["夏.jpg"]="summer.jpg"
  ["秋.jpg"]="autumn.jpg"
  ["冬.jpg"]="winter.jpg"
  ["梅.jpg"]="plum.jpg"
  ["兰.jpg"]="orchid.jpg"
  ["竹.jpg"]="bamboo_flower.jpg"
  ["菊.jpg"]="chrysanthemum.jpg"
)

count=0
for cn in "${!MAP[@]}"; do
  en="${MAP[$cn]}"
  if [ -f "$SRC/$cn" ]; then
    cp "$SRC/$cn" "$DST/$en"
    echo "✅ $cn → $en"
    ((count++))
  else
    echo "⚠️  缺失: $cn"
  fi
done

echo ""
echo "完成: 复制了 $count 个文件到 ak_jpg/"

# 同时复制新的 mapping 到 ak_jpg
cp "$SRC/tile_mapping.json" "$DST/tile_mapping_chinese.json"
echo "✅ tile_mapping_chinese.json 已复制"
