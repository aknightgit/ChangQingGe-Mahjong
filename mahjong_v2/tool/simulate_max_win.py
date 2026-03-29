#!/usr/bin/env python3
"""
Mahjong Simulation - Find Maximum Win Margin
Enhanced version with realistic scoring
"""
import random
import time
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple

@dataclass
class Tile:
    suit: str
    value: int
    is_dual: bool = False
    
    def __repr__(self):
        return f"{self.suit}{self.value}" if not self.is_dual else "🀄"

@dataclass
class Player:
    index: int
    name: str
    hand: List[Tile] = field(default_factory=list)
    melds: List[Tuple[str, List[Tile]]] = field(default_factory=list)
    played: List[Tile] = field(default_factory=list)
    score: int = 0
    total_score: int = 0
    bao_count: int = 0

@dataclass
class SettlementResult:
    is_draw: bool
    winner_index: Optional[int]
    base_points: int
    round_multiplier: int
    extra_multiplier: int
    total_points: int
    deltas: Dict[int, int]
    reason: str
    hu_type: Optional[str] = None
    from_player: Optional[int] = None
    details: List[str] = field(default_factory=list)

class MahjongSimulator:
    def __init__(self):
        self.wall: List[Tile] = []
        self.players: List[Player] = []
        self.current_player: int = 0
        self.dealer: int = 0
        self.round_multiplier: int = 1
        self.game_ended: bool = False
        self.last_settlement: Optional[SettlementResult] = None
        self.last_discard: Optional[Tile] = None
        self.last_discarder: Optional[int] = None
        self.is_self_draw: bool = True
        self.last_winner: Optional[int] = None
        self.turn_count: int = 0
        
    def init_game(self):
        """Initialize a new game"""
        # Create 144 tiles
        tiles = []
        for suit in ['万', '条', '筒']:
            for val in range(1, 10):
                tiles.extend([Tile(suit, val)] * 4)
        for hon in ['东', '南', '西', '北', '中', '发', '白']:
            tiles.extend([Tile(hon, 0)] * 4)
        
        self.wall = tiles
        random.shuffle(self.wall)
        self.players = [Player(i, f"P{i}") for i in range(4)]
        
        # Deal 13 tiles each
        for i in range(4):
            self.players[i].hand = self.wall[:13]
            self.wall = self.wall[13:]
        
        self.current_player = self.dealer
        self.game_ended = False
        self.last_settlement = None
        self.turn_count = 0
        
        # Simulate initial melds - some players start with melds
        for p in self.players:
            if random.random() < 0.3:  # 30% chance to have a meld
                meld_type = random.choice(['碰', '杠'])
                p.melds.append((meld_type, []))
                p.bao_count = random.randint(0, 2)
    
    def _can_hu(self, player: Player) -> bool:
        """Check if player can hu"""
        if len(player.hand) < 13:
            return False
        
        # Hu chance increases with:
        # 1. More melds (more complete sets)
        # 2. Later in game (more tiles drawn)
        # 3. Higher bao count (connected hands)
        
        meld_factor = len(player.melds) * 0.12
        turn_factor = min(self.turn_count * 0.01, 0.15)
        bao_factor = player.bao_count * 0.08
        
        base_chance = 0.06
        hu_chance = base_chance + meld_factor + turn_factor + bao_factor
        
        return random.random() < hu_chance
    
    def _generate_hu_type(self, player: Player) -> str:
        """Generate hu type based on player state"""
        meld_count = len(player.melds)
        bao = player.bao_count
        
        # Weighted random based on hand strength
        weights = []
        types = []
        
        # Base hand
        types.append('平胡')
        weights.append(30)
        
        # Special hands based on melds
        if meld_count >= 3:
            types.extend(['混一色', '碰碰胡', '清一色'])
            weights.extend([15, 12, 10])
        elif meld_count >= 2:
            types.extend(['混一色', '碰碰胡'])
            weights.extend([12, 8])
        else:
            types.extend(['混一色', '碰碰胡'])
            weights.extend([5, 3])
        
        # Rare hands with bao
        if bao >= 3:
            types.extend(['风一色', '清碰'])
            weights.extend([8, 6])
        
        # Select based on weights
        return random.choices(types, weights=weights)[0]
    
    def _calc_base_points(self, hu_type: str) -> int:
        """Calculate base points for hu type"""
        base_points = {
            '平胡': 2,
            '混一色': 4,
            '碰碰胡': 6,
            '清一色': 8,
            '清碰': 8,
            '风一色': 12,
            '风碰': 6,
        }
        return base_points.get(hu_type, 2)
    
    def _calc_extra_multiplier(self, player: Player) -> int:
        """Calculate extra multiplier"""
        mult = 1
        for meld_type, _ in player.melds:
            if meld_type == '杠':
                mult += 2
            elif meld_type == '碰':
                mult += 1
        mult += player.bao_count
        # Add some rounds multiplier variation
        mult *= self.round_multiplier
        return min(mult, 8)
    
    def _get_bao_multiplier(self, from_player: int, to_player: int) -> int:
        p1 = self.players[from_player]
        p2 = self.players[to_player]
        if p1.bao_count > 0 and p2.bao_count > 0:
            return min(p1.bao_count, p2.bao_count)
        return 0
    
    def _settle_win(self, winner_idx: int) -> SettlementResult:
        """Settle a win"""
        winner = self.players[winner_idx]
        hu_type = self._generate_hu_type(winner)
        base_points = self._calc_base_points(hu_type)
        extra_mult = self._calc_extra_multiplier(winner)
        total = base_points * extra_mult
        
        deltas = {i: 0 for i in range(4)}
        details = []
        
        payers = [i for i in range(4) if i != winner_idx]
        
        # Find bao partner
        bao_partner = None
        bao_mult = 0
        for p in payers:
            m = self._get_bao_multiplier(winner_idx, p)
            if m > bao_mult:
                bao_mult = m
                bao_partner = p
        
        if not self.is_self_draw:
            shooter = self.last_discarder
            if shooter is not None:
                if bao_partner is not None and shooter == bao_partner:
                    deltas[winner_idx] = total * 2
                    deltas[shooter] = -total * 2
                    details.append(f'互包互相放冲: P{shooter} ×2')
                elif bao_partner is not None and shooter != bao_partner:
                    deltas[winner_idx] = total * 2
                    deltas[shooter] = -total
                    deltas[bao_partner] = -total
                    details.append(f'第三方放冲: P{shooter} ×1 + P{bao_partner} ×1')
                else:
                    deltas[winner_idx] = total
                    deltas[shooter] = -total
                    details.append(f'放冲: P{shooter} ×1')
                from_player = shooter
        else:
            from_player = None
            if bao_partner is not None and bao_mult >= 5:
                deltas[winner_idx] = total * 5
                deltas[bao_partner] = -total * 5
                details.append(f'互包四口自摸: P{bao_partner} ×5')
            elif bao_partner is not None and bao_mult >= 3:
                deltas[winner_idx] = total * (len(payers) + 2)
                deltas[bao_partner] = -total * 3
                for p in payers:
                    if p != bao_partner:
                        deltas[p] = -total
                details.append(f'互包三口自摸: P{bao_partner} ×3')
            else:
                deltas[winner_idx] = total * len(payers)
                for p in payers:
                    deltas[p] = -total
                details.append('自摸: 其他玩家 ×1')
        
        return SettlementResult(
            is_draw=False,
            winner_index=winner_idx,
            base_points=base_points,
            round_multiplier=self.round_multiplier,
            extra_multiplier=extra_mult,
            total_points=total,
            deltas=deltas,
            reason='胡牌',
            hu_type=hu_type,
            from_player=from_player,
            details=details
        )
    
    def play_turn(self) -> Optional[SettlementResult]:
        """Play one turn"""
        player = self.players[self.current_player]
        self.turn_count += 1
        
        # Draw tile
        if self.wall:
            drawn = self.wall.pop()
            player.hand.append(drawn)
        
        # Check for hu
        if self._can_hu(player):
            self.is_self_draw = True
            self.last_winner = self.current_player
            result = self._settle_win(self.current_player)
            self.last_settlement = result
            self.game_ended = True
            return result
        
        # Discard tile
        if player.hand:
            discard_idx = random.randint(0, len(player.hand) - 1)
            discarded = player.hand.pop(discard_idx)
            player.played.append(discarded)
            self.last_discard = discarded
            self.last_discarder = self.current_player
            self.is_self_draw = False
            
            # Simulate other players responding (ron)
            for offset in range(1, 4):
                responder = (self.current_player + offset) % 4
                resp_player = self.players[responder]
                # Higher ron chance with bao connections
                ron_chance = 0.01 + resp_player.bao_count * 0.02
                if random.random() < ron_chance:
                    self.is_self_draw = False
                    self.last_winner = responder
                    result = self._settle_win(responder)
                    self.last_settlement = result
                    self.game_ended = True
                    return result
        
        # Next player
        self.current_player = (self.current_player + 1) % 4
        return None
    
    def run_simulation(self) -> Tuple[bool, Optional[SettlementResult]]:
        """Run a single game simulation"""
        self.init_game()
        steps = 0
        max_steps = 300
        
        while not self.game_ended and steps < max_steps and self.wall:
            result = self.play_turn()
            if result:
                return True, result
            steps += 1
        
        return False, None


def run_simulations(n_games: int = 1000) -> Tuple[Optional[dict], List[dict]]:
    """Run multiple simulations and find max win"""
    random.seed(int(time.time() * 1000) % 1000000)
    
    all_games = []
    max_win_game = None
    max_win_delta = 0
    
    for i in range(n_games):
        sim = MahjongSimulator()
        ended, result = sim.run_simulation()
        
        if result and ended:
            winner_delta = result.deltas.get(result.winner_index, 0)
            game_data = {
                'game_num': i + 1,
                'winner': result.winner_index,
                'win_type': result.reason,
                'from_player': result.from_player,
                'hu_type': result.hu_type,
                'melds': sim.players[result.winner_index].melds,
                'base_points': result.base_points,
                'round_multiplier': result.round_multiplier,
                'extra_multiplier': result.extra_multiplier,
                'total_points': result.total_points,
                'deltas': result.deltas,
                'details': result.details,
                'winner_delta': winner_delta,
                'turn_count': sim.turn_count
            }
            all_games.append(game_data)
            
            if winner_delta > max_win_delta:
                max_win_delta = winner_delta
                max_win_game = game_data
    
    return max_win_game, all_games


if __name__ == '__main__':
    print("=" * 65)
    print("  🀄 Mahjong Simulation - Finding Maximum Win Margin 🀄")
    print("=" * 65)
    
    # Run simulations
    start_time = time.time()
    max_game, all_games = run_simulations(2000)
    elapsed = time.time() - start_time
    
    print(f"\n⏱  Completed {len(all_games)} games in {elapsed:.2f}s")
    print(f"   (Attempted 2000 games)")
    
    if all_games:
        # Show some stats
        deltas = [g['winner_delta'] for g in all_games]
        hu_types = {}
        for g in all_games:
            ht = g['hu_type']
            hu_types[ht] = hu_types.get(ht, 0) + 1
        
        print(f"\n📊 Statistics:")
        print(f"   Avg win delta: {sum(deltas)/len(deltas):.1f}")
        print(f"   Max win delta: {max(deltas)}")
        print(f"   Hu types: {hu_types}")
    
    if max_game:
        print("\n" + "=" * 65)
        print("🏆 GAME WITH MAXIMUM WIN MARGIN")
        print("=" * 65)
        print(f"🎯 Game #{max_game['game_num']} (turn {max_game['turn_count']})")
        print(f"👑 Winner: Player {max_game['winner']}")
        print(f"📋 Win Type: {max_game['win_type']}")
        print(f"🃏 Hu Type: {max_game['hu_type']}")
        
        if max_game['from_player'] is not None:
            print(f"🔔 From Player: {max_game['from_player']} (ron)")
        else:
            print(f"🔔 From Player: Self draw (zimo)")
        
        print(f"\n📈 Points Breakdown:")
        print(f"   Base Points:     {max_game['base_points']}")
        print(f"   Round Multiplier: {max_game['round_multiplier']}")
        print(f"   Extra Multiplier: {max_game['extra_multiplier']}")
        print(f"   ─────────────────")
        print(f"   Total Points:    {max_game['total_points']}")
        
        print(f"\n💰 Per-Player Deltas:")
        for pid, delta in sorted(max_game['deltas'].items()):
            sign = '+' if delta > 0 else ''
            player_str = "Winner" if pid == max_game['winner'] else "Loser"
            print(f"   Player {pid} ({player_str:6}): {sign}{delta:>4}")
        
        print(f"\n⭐ Winner Delta: +{max_game['winner_delta']}")
        
        if max_game['details']:
            print(f"\n📝 Details: {', '.join(max_game['details'])}")
    else:
        print("\n⚠ No completed games found!")
    
    print("\n" + "=" * 65)
