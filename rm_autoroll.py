#!/usr/bin/env python3
"""Remove auto-roll dice code from room page."""
import re

filepath = 'app/pages/gameroom/[roomId].vue'
with open(filepath, 'r') as f:
    content = f.read()

# Remove autoRollAndDeal function and its comment
content = re.sub(
    r'/\*\* 自动掷骰子\+发牌（AI庄家） \*/.*?const autoRollAndDeal = \(\) => \{.*?\n\}',
    '',
    content,
    flags=re.DOTALL
)

# Remove autoRollOnly function and its comment
content = re.sub(
    r'/\*\* 仅自动掷骰子（人类庄家） \*/.*?const autoRollOnly = \(\) => \{.*?\n\}',
    '',
    content,
    flags=re.DOTALL
)

# Remove the watch handler section that triggers auto-roll
content = re.sub(
    r'// 🔄 自动下一局：来自结算/流局后，自动走掷骰子\+发牌.*?if \(prevPhase === GamePhase\.ENDED\) \{.*?\n      \}\n      return',
    '',
    content,
    flags=re.DOTALL
)

# Clean up multiple blank lines
content = re.sub(r'\n{3,}', '\n\n', content)

with open(filepath, 'w') as f:
    f.write(content)

print('Done')
# Verify no remaining auto-roll references
with open(filepath, 'r') as f:
    c = f.read()
count = c.count('autoRoll')
print(f'Remaining autoRoll references: {count}')
