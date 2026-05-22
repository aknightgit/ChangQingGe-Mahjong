import sys

with open('/home/ak/myworkspace/ChangQingGe-Mahjong/server/services/botService.ts', 'r') as f:
    content = f.read()

old = "        const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)"
new = """        const topOpponentScore = Math.max(
          ...game.players.filter(p => p.id !== player.id).map(p => p.score ?? 0)
        )
        const scoreLead = (player.score ?? 0) - topOpponentScore
        const estimatedRound = Math.max(1, Math.floor((game.discardPile?.length || 0) / 4) + 1)"""

count = content.count(old)
print(f"Found {count} occurrences")

if count == 1:
    content = content.replace(old, new)
    with open('/home/ak/myworkspace/ChangQingGe-Mahjong/server/services/botService.ts', 'w') as f:
        f.write(content)
    print("Done - added scoreLead definition")
else:
    idx = content.find('estimatedRound')
    if idx >= 0:
        print(f"Context: ...{content[idx-100:idx+100]}...")
