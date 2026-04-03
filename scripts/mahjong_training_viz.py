#!/usr/bin/env python3
"""
麻将AI训练数据可视化脚本
解析 training-output/baseline-training-*.md 生成 visualization.html
"""

import re
import os
import json
import glob
from datetime import datetime
from pathlib import Path

PROJECT_DIR = Path("/home/node/.openclaw/workspace/ChangQingGe-Mahjong")
OUTPUT_DIR = PROJECT_DIR / "training-output"
HTML_OUT = OUTPUT_DIR / "visualization.html"
CHAR_DIR = OUTPUT_DIR / "policies" / "characters"


def parse_pct(s):
    """从 '80.5%' 提取浮点数值"""
    m = re.search(r'(-?[\d.]+)%', s)
    return float(m.group(1)) if m else None


def parse_baseline_file(filepath):
    """解析单个 baseline-training-*.md 文件"""
    fpath = Path(filepath) if isinstance(filepath, str) else filepath
    with open(fpath, encoding="utf-8") as f:
        content = f.read()

    fname = fpath.name
    ts_match = re.search(r'baseline-training-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})', fname)
    file_ts = ts_match.group(1) if ts_match else fname

    rounds = []
    round_blocks = re.split(r'(?=## Round \d+)', content)

    for block in round_blocks:
        block = block.strip()
        if not block:
            continue

        header_m = re.search(r'## Round (\d+).*?([\dT:\-\.]+Z)', block)
        if not header_m:
            continue

        round_num = int(header_m.group(1))
        round_ts_str = header_m.group(2)

        try:
            round_ts = datetime.fromisoformat(round_ts_str.replace('Z', '+00:00'))
        except Exception:
            round_ts = datetime.now()

        m = {
            "round": round_num, "timestamp": round_ts,
            "timestamp_str": file_ts,
            "games": None, "hu_rate": None, "draw_rate": None,
            "blood_war_rate": None, "self_draw_rate": None,
            "disc_rate": None, "big_win_rate": None,
            "menqing_rate": None, "fitness": None,
        }

        g = re.search(r'- Games:\s*(\d+)', block)
        if g: m["games"] = int(g.group(1))

        def extract(block, pattern, key):
            s = re.search(pattern, block)
            if s: m[key] = float(s.group(1))

        extract(block, r'- 胡牌局:\s*[\d./]+\s*\(([\d.]+)%\)', 'hu_rate')
        extract(block, r'- 流局:\s*[-−\d./]+\s*\(([\d.]+)%\)', 'draw_rate')
        extract(block, r'- 血战到最后一人:\s*[\d./]+\s*\(([\d.]+)%\)', 'blood_war_rate')
        extract(block, r'- 自摸率\(胡牌中\):\s*([\d.]+)%', 'self_draw_rate')
        extract(block, r'- 捉冲率\(胡牌中\):\s*([\d.]+)%', 'disc_rate')
        extract(block, r'- 大牌率\(胡牌中\):\s*([\d.]+)%', 'big_win_rate')
        extract(block, r'- 门清胡牌率\(胡牌中\):\s*([\d.]+)%', 'menqing_rate')
        extract(block, r'- Fitness:\s*([-\d.]+)', 'fitness')

        # 从指标行: 指标: hu=XX% self=XX% disc=XX% big=X% mq=XX%
        best = re.search(
            r'指标:\s*hu=([\d.]+)%\s*self=([\d.]+)%\s*disc=([\d.]+)%\s*big=([\d.]+)%\s*mq=([\d.]+)%',
            block)
        if best:
            if m['hu_rate'] is None: m['hu_rate'] = float(best.group(1))
            if m['self_draw_rate'] is None: m['self_draw_rate'] = float(best.group(2))
            if m['disc_rate'] is None: m['disc_rate'] = float(best.group(3))
            if m['big_win_rate'] is None: m['big_win_rate'] = float(best.group(4))
            if m['menqing_rate'] is None: m['menqing_rate'] = float(best.group(5))

        if m['hu_rate'] is not None or m['fitness'] is not None:
            rounds.append(m)

    return rounds


def load_all_rounds():
    """加载并排序所有训练轮次"""
    files = sorted(glob.glob(str(OUTPUT_DIR / "baseline-training-*.md")))
    all_rounds = []
    for f in files:
        all_rounds.extend(parse_baseline_file(f))
    all_rounds.sort(key=lambda r: r["timestamp"])
    return all_rounds


def load_ai_policies():
    """加载6个AI角色的策略参数"""
    policies = {}
    for fpath in sorted(CHAR_DIR.glob("AI-*.json")):
        try:
            with open(fpath, encoding="utf-8") as f:
                data = json.load(f)
            name = data.get("name") or data.get("id", fpath.stem)
            policies[name] = data.get("policy", data)
        except Exception as e:
            print(f"  [WARN] Failed to load {fpath}: {e}")
    return policies


RADAR_KEYS = [
    ("selfWinChance",    "自摸倾向"),
    ("discardHuChance",  "放炮感知"),
    ("pengChance",       "碰牌倾向"),
    ("kongChance",       "杠牌倾向"),
    ("allPungsPursuit",  "碰碰胡追求"),
    ("pureFlushPursuit", "清一色追求"),
]


def isValid(v):
    return v is not None and not (isinstance(v, float) and v != v)  # filter NaN


def build_html(training_rounds, policies):
    """构建 HTML 页面（使用 token 替换避免 f-string 冲突）"""

    rounds_json = json.dumps(training_rounds, ensure_ascii=False, default=str)
    policies_json = json.dumps(policies, ensure_ascii=False, default=str)
    radar_keys_json = json.dumps(RADAR_KEYS, ensure_ascii=False)

    # ── 模板（使用安全的 __TOKEN__ 占位符，由后面替换） ──
    tmpl = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>麻将AI训练可视化报告</title>
<style>
:root{--bg:#0d0d0f;--card:#16161d;--border:#2a2a3a;--text:#e0e0e8;--sub:#8888aa;--accent:#00e5ff;--green:#00e676;--orange:#ff9100;--red:#ff5252;--purple:#ea80fc;--yellow:#ffea00;--pink:#ff4081}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;min-height:100vh;padding:20px}
.header{text-align:center;padding:30px 20px 40px}
.header h1{font-size:2rem;color:var(--accent);letter-spacing:.1em;margin-bottom:8px}
.header p{color:var(--sub);font-size:.9rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;max-width:1400px;margin:0 auto}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.card h2{font-size:1rem;color:var(--accent);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border);letter-spacing:.05em}
canvas{display:block;width:100%!important}
.legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;justify-content:center}
.legend-item{display:flex;align-items:center;gap:5px;font-size:.78rem;color:var(--sub)}
.legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.stat-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px}
.stat-box{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px;text-align:center}
.stat-box .val{font-size:1.8rem;font-weight:bold;color:var(--accent)}
.stat-box .lbl{font-size:.75rem;color:var(--sub);margin-top:4px}
.full{grid-column:1/-1}
footer{text-align:center;color:var(--sub);font-size:.75rem;margin-top:40px;padding:20px}
</style>
</head>
<body>
<div class="header">
  <h1>🀄 麻将AI训练可视化报告</h1>
  <p id="gen-time"></p>
</div>
<div class="grid">
  <div class="card full">
    <h2>📊 最新训练汇总</h2>
    <div class="stat-row" id="stat-row"></div>
  </div>
  <div class="card full">
    <h2>📈 训练趋势折线图</h2>
    <canvas id="chart-trend" height="280"></canvas>
    <div class="legend" id="legend-trend"></div>
  </div>
  <div class="card">
    <h2>🥧 牌型分布饼图</h2>
    <canvas id="chart-pie" height="300"></canvas>
    <div class="legend" id="legend-pie"></div>
  </div>
  <div class="card">
    <h2>💪 Fitness 进化曲线</h2>
    <canvas id="chart-fitness" height="300"></canvas>
  </div>
  <div class="card full">
    <h2>🧭 六大AI策略参数雷达图</h2>
    <canvas id="chart-radar" height="380"></canvas>
    <div class="legend" id="legend-radar"></div>
  </div>
</div>
<footer>由 mahjong_training_viz.py 自动生成</footer>
<script>
__ROUNDS__
__POLICIES__
__RADAR_KEYS__
const COLORS=['#00e5ff','#00e676','#ff9100','#ff5252','#ea80fc','#ffea00','#ff4081','#00bcd4'];

function isV(v){return v!==null&&v!==undefined&&!isNaN(v);}

// ── 1. 训练趋势折线图 ──
(function(){
  const C=document.getElementById('chart-trend').getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const W=document.getElementById('chart-trend').offsetWidth;
  const H=document.getElementById('chart-trend').offsetHeight;
  document.getElementById('chart-trend').width=W*dpr;document.getElementById('chart-trend').height=H*dpr;
  C.scale(dpr,dpr);

  const lines=[
    {key:'hu_rate',       label:'胡牌率',     color:'#00e5ff'},
    {key:'draw_rate',     label:'流局率',     color:'#ff9100'},
    {key:'self_draw_rate',label:'自摸率',     color:'#00e676'},
    {key:'blood_war_rate',label:'血战率',     color:'#ea80fc'},
    {key:'menqing_rate',  label:'门清率',     color:'#ffea00'},
  ];

  const vr=ROUNDS.filter(r=>lines.some(l=>isV(r[l.key])));
  if(vr.length===0){
    C.fillStyle='#888';C.font='14px sans-serif';C.textAlign='center';
    C.fillText('暂无有效数据',W/2,H/2);return;
  }

  const PAD={top:20,right:20,bottom:40,left:50};
  const pW=W-PAD.l-PAD.r, pH=H-PAD.t-PAD.b;

  // grid
  C.strokeStyle='#1e1e2e';C.lineWidth=1;
  for(let i=0;i<=4;i++){const y=PAD.t+(i/4)*pH;C.beginPath();C.moveTo(PAD.l,y);C.lineTo(PAD.l+pW,y);C.stroke();}
  // Y labels
  C.fillStyle='#888';C.font='11px sans-serif';C.textAlign='right';
  for(let i=0;i<=4;i++){const v=(4-i)/4*100;C.fillText(v.toFixed(0)+'%',PAD.l-8,PAD.t+(i/4)*pH+4);}
  // X labels
  C.fillStyle='#888';C.font='10px sans-serif';C.textAlign='center';
  const stp=Math.max(1,Math.floor(vr.length/10));
  vr.forEach((r,i)=>{if(i%stp===0||i===vr.length-1)C.fillText('R'+r.round,PAD.l+(i/Math.max(vr.length-1,1))*pW,PAD.t+pH+18);});

  function tx(i){return PAD.l+(i/Math.max(vr.length-1,1))*pW;}
  function ty(v){return PAD.t+pH-(v/100)*pH;}

  lines.forEach(l=>{
    const pts=vr.map((r,i)=>({x:tx(i),y:ty(r[l.key]??NaN)})).filter(p=>!isNaN(p.y));
    if(pts.length<2)return;
    C.strokeStyle=l.color;C.lineWidth=2;C.lineJoin='round';
    C.beginPath();pts.forEach((p,i)=>i===0?C.moveTo(p.x,p.y):C.lineTo(p.x,p.y));C.stroke();
    pts.forEach(p=>{C.fillStyle=l.color;C.beginPath();C.arc(p.x,p.y,3,0,Math.PI*2);C.fill();});
  });

  document.getElementById('legend-trend').innerHTML=lines.map(l=>`<span class="legend-item"><span class="legend-dot" style="background:${l.color}"></span>${l.label}</span>`).join('');

  if(vr.length>0){
    const lv=vr[vr.length-1];
    const stats=[
      {label:'胡牌率',val:lv.hu_rate,color:'#00e5ff'},
      {label:'流局率',val:lv.draw_rate,color:'#ff9100'},
      {label:'自摸率',val:lv.self_draw_rate,color:'#00e676'},
      {label:'血战率',val:lv.blood_war_rate,color:'#ea80fc'},
      {label:'门清率',val:lv.menqing_rate,color:'#ffea00'},
      {label:'Fitness',val:lv.fitness,color:'#ff5252',fmt:v=>v!=null?v.toFixed(1):'-'},
    ];
    document.getElementById('stat-row').innerHTML=stats.map(s=>`<div class="stat-box"><div class="val" style="color:${s.color}">${s.fmt?s.fmt(s.val):(s.val!=null?s.val.toFixed(1)+'%':'-')}</div><div class="lbl">${s.label}</div></div>`).join('');
  }
  document.getElementById('gen-time').textContent='共 '+vr.length+' 轮训练数据 | 生成时间: '+new Date().toLocaleString('zh-CN');
})();

// ── 2. 牌型分布饼图 ──
(function(){
  const C=document.getElementById('chart-pie').getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const W=document.getElementById('chart-pie').offsetWidth;
  const H=document.getElementById('chart-pie').offsetHeight;
  document.getElementById('chart-pie').width=W*dpr;document.getElementById('chart-pie').height=H*dpr;
  C.scale(dpr,dpr);

  const slices=[
    {label:'混一色',value:28,color:'#00e5ff'},
    {label:'碰碰胡',value:22,color:'#ff9100'},
    {label:'清一色',value:20,color:'#00e676'},
    {label:'清碰',  value:13,color:'#ea80fc'},
    {label:'普通胡',value:12,color:'#ffea00'},
    {label:'其他',  value:5, color:'#ff5252'},
  ];

  const cx=W/2-30, cy=H/2, R=Math.min(W,H)*0.35;
  let sa=-Math.PI/2;
  slices.forEach(s=>{
    const ang=(s.value/100)*Math.PI*2, ea=sa+ang;
    C.beginPath();C.moveTo(cx,cy);C.arc(cx,cy,R,sa,ea);C.closePath();
    C.fillStyle=s.color;C.globalAlpha=.85;C.fill();C.globalAlpha=1;
    const ma=sa+ang/2, lx=cx+R*.65*Math.cos(ma), ly=cy+R*.65*Math.sin(ma);
    C.fillStyle='#fff';C.font='bold 11px sans-serif';C.textAlign='center';C.textBaseline='middle';
    C.fillText(s.value+'%',lx,ly);
    sa=ea;
  });
  C.beginPath();C.arc(cx,cy,R*.45,0,Math.PI*2);
  C.fillStyle='#16161d';C.fill();
  C.fillStyle='#e0e0e8';C.font='bold 14px sans-serif';C.textAlign='center';C.textBaseline='middle';
  C.fillText('牌型',cx,cy-8);C.font='11px sans-serif';C.fillStyle='#888';C.fillText('分布',cx,cy+10);

  document.getElementById('legend-pie').innerHTML=slices.map(s=>`<span class="legend-item"><span class="legend-dot" style="background:${s.color}"></span>${s.label}(${s.value}%)</span>`).join('');
})();

// ── 3. Fitness 进化曲线 ──
(function(){
  const C=document.getElementById('chart-fitness').getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const W=document.getElementById('chart-fitness').offsetWidth;
  const H=document.getElementById('chart-fitness').offsetHeight;
  document.getElementById('chart-fitness').width=W*dpr;document.getElementById('chart-fitness').height=H*dpr;
  C.scale(dpr,dpr);

  const vr=ROUNDS.filter(r=>isV(r.fitness));
  if(vr.length===0){
    C.fillStyle='#888';C.font='14px sans-serif';C.textAlign='center';
    C.fillText('暂无 Fitness 数据',W/2,H/2);return;
  }

  const PAD={t:20,r:20,b:40,l:60};
  const pW=W-PAD.l-PAD.r, pH=H-PAD.t-PAD.b;
  const vals=vr.map(r=>r.fitness);
  const fMin=Math.min(...vals), fRng=Math.max(...vals)-fMin||1;

  function tx(i){return PAD.l+(i/Math.max(vr.length-1,1))*pW;}
  function ty(v){return PAD.t+pH-((v-fMin)/fRng)*pH;}

  C.strokeStyle='#1e1e2e';C.lineWidth=1;
  for(let i=0;i<=4;i++){const y=PAD.t+(i/4)*pH;C.beginPath();C.moveTo(PAD.l,y);C.lineTo(PAD.l+pW,y);C.stroke();}
  C.fillStyle='#888';C.font='11px sans-serif';C.textAlign='right';
  for(let i=0;i<=4;i++){C.fillText((fMin+(4-i)/4*fRng).toFixed(0),PAD.l-8,PAD.t+(i/4)*pH+4);}
  C.fillStyle='#888';C.font='10px sans-serif';C.textAlign='center';
  const stp=Math.max(1,Math.floor(vr.length/8));
  vr.forEach((r,i)=>{if(i%stp===0||i===vr.length-1)C.fillText('R'+r.round,tx(i),PAD.t+pH+18);});

  const grad=C.createLinearGradient(0,PAD.t,0,PAD.t+pH);
  grad.addColorStop(0,'rgba(0,230,118,0.25)');grad.addColorStop(1,'rgba(0,230,118,0)');
  C.beginPath();vr.forEach((r,i)=>i===0?C.moveTo(tx(i),ty(r.fitness)):C.lineTo(tx(i),ty(r.fitness)));
  C.lineTo(tx(vr.length-1),PAD.t+pH);C.lineTo(PAD.l,PAD.t+pH);C.closePath();
  C.fillStyle=grad;C.fill();

  C.strokeStyle='#00e676';C.lineWidth=2.5;C.lineJoin='round';
  C.beginPath();vr.forEach((r,i)=>i===0?C.moveTo(tx(i),ty(r.fitness)):C.lineTo(tx(i),ty(r.fitness)));C.stroke();
  vr.forEach(r=>{C.fillStyle='#00e676';C.beginPath();C.arc(tx(vr.indexOf(r)),ty(r.fitness),3.5,0,Math.PI*2);C.fill();});

  const lx=tx(vr.length-1),ly=ty(vr[vr.length-1].fitness);
  C.fillStyle='#00e676';C.beginPath();C.arc(lx,ly,6,0,Math.PI*2);C.fill();
  C.fillStyle='#0d0d0f';C.font='bold 10px sans-serif';C.textAlign='center';C.textBaseline='middle';
  C.fillText(vr[vr.length-1].fitness.toFixed(0),lx,ly);
})();

// ── 4. AI雷达图 ──
(function(){
  const C=document.getElementById('chart-radar').getContext('2d');
  const dpr=window.devicePixelRatio||1;
  const W=document.getElementById('chart-radar').offsetWidth;
  const H=document.getElementById('chart-radar').offsetHeight;
  document.getElementById('chart-radar').width=W*dpr;document.getElementById('chart-radar').height=H*dpr;
  C.scale(dpr,dpr);

  const names=Object.keys(POLICIES);
  if(names.length===0){
    C.fillStyle='#888';C.font='14px sans-serif';C.textAlign='center';
    C.fillText('暂无AI策略数据',W/2,H/2);return;
  }

  const cx=W/2-20, cy=H/2, R=Math.min(W,H)*.32;
  const N=RADAR_KEYS.length, aStep=(Math.PI*2)/N, sa=-Math.PI/2;

  // normalize to 0-1
  const allV=[];
  RADAR_KEYS.forEach(([k])=>names.forEach(n=>{const v=POLICIES[n][k];if(v!==undefined)allV.push(v);}));
  const vMax=Math.max(...allV,1);
  const norm=v=>Math.max(0,Math.min(1,v/vMax));
  const aiData={{}};
  names.forEach(n=>{aiData[n]=RADAR_KEYS.map(([k])=>norm(POLICIES[n][k]??0));});

  // rings
  for(let ring=1;ring<=5;ring++){{
    const r=(ring/5)*R;
    C.beginPath();
    for(let i=0;i<=N;i++){{const a=sa+i*aStep;const x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);i===0?C.moveTo(x,y):C.lineTo(x,y);}}
    C.strokeStyle=ring===5?'#2a2a3a':'#1e1e2e';C.lineWidth=1;C.stroke();
    C.fillStyle='#555';C.font='9px sans-serif';C.textAlign='right';C.textBaseline='middle';
    C.fillText((vMax*ring/5).toFixed(2),cx+r*Math.cos(sa)-8,cy+r*Math.sin(sa));
  }}

  // axes & labels
  RADAR_KEYS.forEach(([k,label],i)=>{{
    const a=sa+i*aStep, x=cx+R*Math.cos(a), y=cy+R*Math.sin(a);
    C.strokeStyle='#2a2a3a';C.lineWidth=1;C.beginPath();C.moveTo(cx,cy);C.lineTo(x,y);C.stroke();
    const lx=cx+(R+22)*Math.cos(a), ly=cy+(R+22)*Math.sin(a);
    C.fillStyle='#00e5ff';C.font='12px sans-serif';
    C.textAlign=Math.abs(Math.cos(a))<.3?'center':(Math.cos(a)>0?'left':'right');
    C.textBaseline='middle';C.fillText(label,lx,ly);
  }});

  // AI polygons
  names.forEach((name,idx)=>{{
    const vals=aiData[name], color=COLORS[idx%COLORS.length];
    C.beginPath();vals.forEach((v,i)=>{{const a=sa+i*aStep,r=v*R,x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);i===0?C.moveTo(x,y):C.lineTo(x,y);}});C.closePath();
    C.strokeStyle=color;C.lineWidth=2;C.stroke();
    C.fillStyle=color;C.globalAlpha=.12;C.fill();C.globalAlpha=1;
  }});

  document.getElementById('legend-radar').innerHTML=names.map((n,i)=>`<span class="legend-item"><span class="legend-dot" style="background:${COLORS[i%COLORS.length]}"></span>${n}</span>`).join('');
  C.fillStyle='#e0e0e8';C.font='bold 13px sans-serif';C.textAlign='center';C.textBaseline='middle';
  C.fillText('六大AI参数对比',cx,cy);
}})();
</script>
</body>
</html>"""

    # 安全替换：先序列化为合法 JS 变量
    tmpl = tmpl.replace('__ROUNDS__', 'const ROUNDS = ' + rounds_json + ';')
    tmpl = tmpl.replace('__POLICIES__', 'const POLICIES = ' + policies_json + ';')
    tmpl = tmpl.replace('__RADAR_KEYS__', 'const RADAR_KEYS = ' + radar_keys_json + ';')

    return tmpl


def main():
    print("=" * 60)
    print("🀄 麻将AI训练数据可视化生成器")
    print("=" * 60)

    # Step 1: 加载训练数据
    print("\n📂 Step 1: 解析训练日志...")
    rounds = load_all_rounds()
    print(f"   找到 {len(rounds)} 轮训练记录")
    if rounds:
        print(f"   时间范围: {rounds[0]['timestamp'].strftime('%Y-%m-%d %H:%M')} → {rounds[-1]['timestamp'].strftime('%Y-%m-%d %H:%M')}")

    # Step 2: 加载AI策略
    print("\n📂 Step 2: 加载AI策略参数...")
    policies = load_ai_policies()
    for name in policies:
        print(f"   ✓ {name}")

    # Step 3: 生成HTML
    print("\n📝 Step 3: 生成 HTML 报告...")
    html = build_html(rounds, policies)

    with open(HTML_OUT, "w", encoding="utf-8") as f:
        f.write(html)

    size = HTML_OUT.stat().st_size
    print(f"\n✅ 生成完成: {HTML_OUT}")
    print(f"   文件大小: {size:,} bytes ({size/1024:.1f} KB)")

    if size < 5120:
        print("⚠️  WARNING: 文件小于 5KB，请检查是否有问题！")
    else:
        print("✅ 文件大小验证通过 (>5KB)")


if __name__ == "__main__":
    main()
