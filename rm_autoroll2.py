#!/usr/bin/env python3
import re

filepath = 'app/pages/gameroom/[roomId].vue'
with open(filepath, 'r') as f:
    content = f.read()

# Remove autoRollAndDeal function (no comment prefix, already damaged by sed)
content = re.sub(
    r'\nconst autoRollAndDeal = \(\) => \{[\s\S]*?void onDealTiles\(\)[\s\S]*?\n\}',
    '',
    content
)

# Remove autoRollOnly function (without comment)
content = re.sub(
    r'\nconst autoRollOnly = \(\) => \{[\s\S]*?// 骰子掷完，等人发牌[\s\S]*?\n\}',
    '',
    content
)

# Remove watch handler auto-roll section (may have different formatting)
# Capture from "🔄 自动下一局" to "return" at that nesting level
content = re.sub(
    r'// [\u2000-\u206F\u2E00-\u2E7F]*? 自动下一局.*?if \(prevPhase === GamePhase\.ENDED\) \{.*?\n      \}\n      return',
    '',
    content,
    flags=re.DOTALL
)

# Clean up multiple blank lines
content = re.sub(r'\n{4,}', '\n\n', content)

with open(filepath, 'w') as f:
    f.write(content)

# Verify
count = content.count('autoRoll')
print(f'autoRoll references: {count}')
if count > 0:
    for i, line in enumerate(content.split('\n')):
        if 'autoRoll' in line:
            print(f'  Line {i+1}: {line.strip()}')
