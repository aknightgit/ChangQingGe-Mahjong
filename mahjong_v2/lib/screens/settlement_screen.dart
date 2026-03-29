import 'package:flutter/material.dart';

class SettlementScreen extends StatelessWidget {
  final Map<String, dynamic> result;
  
  const SettlementScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final winners = result['winners'] as List<dynamic>? ?? [];
    final fan = result['fan'] as int? ?? 0;
    final baseScore = result['baseScore'] as int? ?? 2;
    final totalMultiplier = result['multiplier'] as int? ?? 1;
    final isZimo = result['isZimo'] as bool? ?? false;
    final isLiuJu = result['isLiuJu'] as bool? ?? false;
    
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0D1B2A), Color(0xFF1B263B)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // 标题
                Text(
                  isLiuJu ? '流局' : '胡牌!',
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: isLiuJu ? Colors.orange : Colors.red,
                  ),
                ),
                const SizedBox(height: 30),
                
                // 赢家信息
                if (winners.isNotEmpty) ...[
                  const Text('赢家', style: TextStyle(color: Colors.white70, fontSize: 16)),
                  const SizedBox(height: 10),
                  ...winners.map((w) => Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.green),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(w['name'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 20)),
                        const SizedBox(width: 20),
                        Text('+${w['score']}', style: const TextStyle(color: Colors.green, fontSize: 24, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  )),
                  const SizedBox(height: 20),
                ],
                
                // 详细信息
                if (!isLiuJu) Container(
                  padding: const EdgeInsets.all(20),
                  margin: const EdgeInsets.symmetric(horizontal: 40),
                  decoration: BoxDecoration(
                    color: Colors.black26,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      _infoRow('番数', '$fan 番'),
                      _infoRow('基础分', '$baseScore'),
                      _infoRow('全局倍数', '×$totalMultiplier'),
                      _infoRow('胡牌方式', isZimo ? '自摸' : '点炮'),
                    ],
                  ),
                ),
                
                const SizedBox(height: 40),
                
                // 继续按钮
                GestureDetector(
                  onTap: () {
                    Navigator.of(context).pop();
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 50, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.green,
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: const Text('下一局', style: TextStyle(color: Colors.white, fontSize: 18)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70)),
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
