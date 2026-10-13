/* Player state is local. Achievements are always derived from the watch list. */
(() => {
  'use strict';
  const PLAYER_KEY='anime-atlas:player:v1';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const trophyPath='M4 2h8v2h3v5h-3v2h-2v3h3v2H3v-2h3v-3H4V9H1V4h3zm0 4H3v1h1zm8 0v1h1V6z';
  const icon=`<svg class="pixel-trophy" viewBox="0 0 16 18" aria-hidden="true"><path d="${trophyPath}"/></svg>`;
  const tierName={bronze:'铜杯',silver:'银杯',gold:'金杯',platinum:'白金'};
  const counts=[[1,'first','故事从这里开始','铜','你与一个新世界相遇了。'],[10,'ten','这集看完就睡','铜','你也是这么跟自己说的？'],[50,'fifty','片尾曲听完再走','银','把余韵也放进收藏夹。'],[100,'hundred','次元常住居民','银','欢迎回来，次元常住居民。'],[300,'threehundred','我的青春有很多季','金','每一季，都有你的身影。'],[500,'fivehundred','异世界图书管理员','金','这份阅历，可以开图书馆了。']];
  const achievements=counts.map(([target,id,name,tier,quip])=>({id,name,tier:{铜:'bronze',银:'silver',金:'gold'}[tier],target,quip,desc:`看过 ${target} 部作品`,value:s=>s.count}));
  achievements.push(
    {id:'years5',name:'时间旅行初体验',tier:'bronze',target:5,desc:'看过 5 个不同首播年份的作品',quip:'下一站，哪一年的夏天？',value:s=>s.years},
    {id:'years10',name:'十年一瞬',tier:'silver',target:10,desc:'看过 10 个不同首播年份的作品',quip:'片头曲一响，青春就回来了。',value:s=>s.years},
    {id:'years20',name:'跨越时代的冒险',tier:'gold',target:20,desc:'看过 20 个不同首播年份的作品',quip:'你的存档，横跨二十个年份。',value:s=>s.years},
    {id:'cinema',name:'大银幕留个座',tier:'silver',target:10,desc:'看过 10 部剧场版作品',quip:'爆米花准备好，故事要开场了。',value:s=>s.cinema},
    {id:'formats',name:'全地图探索者',tier:'silver',target:4,desc:'看过 TV、剧场版、OVA、WEB 各至少一部',quip:'故事的入口，从来不止一个。',value:s=>s.formats},
    {id:'platinum',name:'此生无悔入二次元',tier:'platinum',target:503,desc:'看过 500 部，另达成至少 3 枚探索奖杯',quip:'属于你的冒险，还在继续。',value:s=>Math.min(s.count,500)+Math.min(s.explorations,3)}
  );
  const validIds=new Set(achievements.map(a=>a.id));
  function normalize(raw={}) {
    if(!raw||typeof raw!=='object')raw={};
    return {version:1,nickname:typeof raw.nickname==='string'?Array.from(raw.nickname.trim()).slice(0,16).join(''):'',motion:['off','light','full'].includes(raw.motion)?raw.motion:'full',sound:raw.sound===true,collapsed:raw.collapsed===true,favorites:Array.isArray(raw.favorites)?[...new Set(raw.favorites.filter(id=>Number.isSafeInteger(id)&&byId.has(id)))].slice(0,3):[],announced:Array.isArray(raw.announced)?[...new Set(raw.announced.filter(id=>validIds.has(id)))]:[]};
  }
  let player=normalize(), firstVisit=true;
  try {const raw=localStorage.getItem(PLAYER_KEY);if(raw){player=normalize(JSON.parse(raw));firstVisit=false;}}
  catch {$('storageWarning').hidden=false;}
  function persist(){try{localStorage.setItem(PLAYER_KEY,JSON.stringify(player));}catch{$('storageWarning').hidden=false;}}
  function summary(){
    const seen=records.filter(a=>watched.has(a.id)),yearSet=new Set(seen.map(a=>a.year)),types=new Set(seen.map(a=>a.type)),decades=new Map();
    for(const a of seen){const d=Math.floor(a.year/10)*10;decades.set(d,(decades.get(d)||0)+1);}
    const s={count:seen.length,years:yearSet.size,cinema:seen.filter(a=>a.type==='剧场版').length,formats:['TV','剧场版','OVA','WEB'].filter(t=>types.has(t)).length,seen,era:[...decades].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]};
    s.explorations=Number(s.years>=5)+Number(s.years>=10)+Number(s.years>=20)+Number(s.cinema>=10)+Number(s.formats===4);
    s.earned=achievements.filter(a=>a.value(s)>=a.target);return s;
  }
  function rank(n){return n>=500?['次元传说','超高浓度 · 这份热爱有迹可循']:n>=300?['番剧图书管理员','超高浓度 · 故事库存充足']:n>=100?['次元常住居民','高浓度 · 建议搭配现实生活服用']:n>=50?['异世界熟面孔','中高浓度 · 已经认得传送门']:n>=10?['片尾曲守护者','中浓度 · 故事正在升温']:n>=1?['次元见习旅人','微浓度 · 冒险刚刚开始']:['等待启程的旅人','初始浓度 · 从喜欢的故事开始'];}
  const hud=document.createElement('section');hud.className='game-hud';hud.id='gameHud';hud.setAttribute('aria-label','玩家档案与成就');
  hud.innerHTML=`<div class="hud-row"><span class="pixel-badge">${icon}</span><div class="hud-identity"><div class="game-kicker">PLAYER 01 / 我的次元存档</div><strong id="playerRank"></strong></div><div id="hudProgress" class="hud-progress"><p id="nextTrophy"></p><div class="xp-track" role="progressbar" aria-label="下一枚观看数量奖杯" aria-valuemin="0" aria-valuemax="100" id="xpTrack"><span id="xpFill"></span></div></div><div class="hud-actions"><button id="openPlayer"><span class="desktop-label">玩家</span>档案</button><button id="openTrophies">奖杯 <span id="trophyCount">0/12</span></button><button class="game-primary" id="openShare">晒战绩 ↗</button><button id="collapseHud" class="hud-mini" aria-label="收起玩家状态栏" aria-expanded="true" aria-controls="hudProgress">−</button></div></div>`;
  document.querySelector('main').insertBefore(hud,document.querySelector('.workspace'));
  const ui=document.createElement('div');ui.innerHTML=`
  <div id="gameFx" class="game-fx" aria-hidden="true"></div>
  <aside id="gameReward" class="game-reward" role="status" aria-live="polite" hidden><span class="reward-burst">${icon}</span><div class="game-kicker" id="rewardLabel">ACHIEVEMENT UNLOCKED</div><strong id="rewardTitle"></strong><p id="rewardText"></p></aside>
  <dialog id="playerDialog" class="game-dialog" aria-labelledby="playerHeading"><button class="close" aria-label="关闭玩家档案">×</button><div class="game-kicker">SAVE FILE / 只属于你的冒险</div><h2 id="playerHeading">玩家档案</h2><div id="profileBanner" class="profile-banner"></div><div class="profile-form"><label class="wide">玩家昵称<input id="playerName" maxlength="16" placeholder="无名的次元旅人" autocomplete="off"></label><label>动效强度<select id="motionLevel"><option value="full">完整 · 像素打击感</option><option value="light">轻量 · 轻快反馈</option><option value="off">关闭</option></select></label><label class="inline-setting"><input id="gameSound" type="checkbox">开启收集音效</label><label class="wide">本命作品 ①<select id="favorite0"></select></label><label class="wide">本命作品 ②<select id="favorite1"></select></label><label class="wide">本命作品 ③<select id="favorite2"></select></label></div><p class="game-help">可从看过的作品中选出最多三部本命。设置自动保存在本机，导出记录时一起备份。系统开启“减少动态效果”时，自动停用动效。</p><div class="game-footer"><button id="profileShare" class="game-primary">生成我的战绩卡 ↗</button></div></dialog>
  <dialog id="trophyDialog" class="game-dialog" aria-labelledby="trophyHeading"><button class="close" aria-label="关闭奖杯收藏室">×</button><div class="game-kicker">TROPHY ROOM / 每份热爱都有回响</div><h2 id="trophyHeading">奖杯收藏室</h2><p id="trophySummary" class="game-subtitle"></p><div id="trophyGrid" class="trophy-grid"></div><p class="game-help">依据本片单中标记“看过”的作品计算；不同季度、续作按独立条目计数。取消标记会重新计算奖杯进度，重复点亮不会刷出奖励。</p></dialog>
  <dialog id="shareDialog" class="game-dialog" aria-labelledby="shareHeading"><button class="close" aria-label="关闭分享卡">×</button><div class="game-kicker">PLAYER CARD / 把热爱带出次元</div><h2 id="shareHeading">我的二次元浓度</h2><canvas id="shareCanvas" width="900" height="1200" role="img" aria-label="个人观看战绩卡"></canvas><p class="game-help">趣味评级只依据本片单的本地观看记录，不代表全站排名。图片在本机生成，不上传记录。</p><p id="shareStatus" role="status" class="game-help"></p><div class="game-footer"><button id="downloadCard">保存图片 ↓</button><button id="nativeShare" class="game-primary">分享战绩 ↗</button></div></dialog>`;
  document.body.append(ui);
  for(const dialog of ui.querySelectorAll('dialog'))dialog.querySelector('.close').onclick=()=>dialog.close();
  function openDialog(id){hideTooltip();$(id).showModal();}
  let rewardTimer,comboTimer,combo=0,lastHit=0,comboIds=new Set(),audio;
  const motion=()=>reduced.matches?'off':player.motion;
  function applySettings(){document.documentElement.dataset.motion=motion();hud.classList.toggle('is-collapsed',player.collapsed);$('collapseHud').textContent=player.collapsed?'+':'−';$('collapseHud').setAttribute('aria-expanded',String(!player.collapsed));$('collapseHud').setAttribute('aria-label',player.collapsed?'展开玩家状态栏':'收起玩家状态栏');if(motion()!=='full')$('gameFx').replaceChildren();}
  reduced.addEventListener('change',applySettings);
  function refresh(){
    const s=summary();$('playerRank').textContent=rank(s.count)[0];$('trophyCount').textContent=`${s.earned.length}/12`;
    const next=counts.find(a=>s.count<a[0]);const pct=next?Math.min(100,Math.floor(s.count/next[0]*100)):100;
    $('nextTrophy').textContent=next?`已收录 ${s.count} 部 · 距「${next[2]}」还差 ${next[0]-s.count} 部`:`已收录 ${s.count} 部 · 数量奖杯全收集，探索继续！`;
    $('xpFill').style.width=pct+'%';$('xpTrack').setAttribute('aria-valuenow',String(pct));
    if($('trophyDialog').open)renderTrophies(s);
    if($('playerDialog').open)renderProfile(s);
    return s;
  }
  function reward(title,message,tier='gold',label='ACHIEVEMENT UNLOCKED / 奖杯解锁'){
    clearTimeout(rewardTimer);const el=$('gameReward');el.hidden=true;$('rewardTitle').textContent=title;$('rewardText').textContent=message;$('rewardLabel').textContent=label;el.className='game-reward '+tier;void el.offsetWidth;el.hidden=false;rewardTimer=setTimeout(()=>el.hidden=true,4500);
  }
  function reconcile(announce=false){const s=refresh(),fresh=s.earned.filter(a=>!player.announced.includes(a.id));if(fresh.length){player.announced=[...new Set([...player.announced,...fresh.map(a=>a.id)])];persist();if(announce){const top=fresh[fresh.length-1];reward(fresh.length===1?top.name:`新解锁 ${fresh.length} 枚奖杯`,fresh.length===1?top.quip:fresh.map(a=>a.name).join(' · '),top.tier);}}return s;}
  function playTone(){if(!player.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio ||= new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});const t=audio.currentTime;for(let i=0;i<2;i++){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='square';osc.frequency.value=(i?880:660)+Math.min(combo,5)*30;gain.gain.setValueAtTime(.018,t+i*.06);gain.gain.exponentialRampToValueAtTime(.001,t+i*.06+.075);osc.connect(gain);gain.connect(audio.destination);osc.start(t+i*.06);osc.stop(t+i*.06+.08);osc.onended=()=>{osc.disconnect();gain.disconnect();};}}catch{}}
  function feedback(id,on){
    const button=$('tableBody').querySelector(`[data-id="${id}"]`);const m=motion();
    if(on){const now=performance.now();if(now-lastHit>1500){combo=0;comboIds.clear();}if(!comboIds.has(id)){combo++;comboIds.add(id);}lastHit=now;clearTimeout(comboTimer);comboTimer=setTimeout(()=>{combo=0;comboIds.clear();},1500);playTone();}
    if(!button||m==='off')return;button.classList.remove('hit','unhit');void button.offsetWidth;button.classList.add(on?'hit':'unhit');button.addEventListener('animationend',()=>button.classList.remove('hit','unhit'),{once:true});
    if(m!=='full'||$('details').open)return;const r=button.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;
    const layer=$('gameFx');layer.replaceChildren();
    for(let i=0;i<(on?10:5);i++){const bit=document.createElement('i'),angle=i*Math.PI*2/(on?10:5);bit.className='pixel-bit'+(on?'':' muted');bit.style.cssText=`left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;--dx:${Math.cos(angle)*65}px;--dy:${Math.sin(angle)*55-20}px`;layer.append(bit);}
    const word=document.createElement('span');word.className='hit-word';word.textContent=on?(combo>1?`收录连击 ×${combo}`:'GET! 已收录'):'标记解除';word.style.left=Math.max(70,Math.min(innerWidth-70,r.left+r.width/2))+'px';word.style.top=Math.max(35,r.top+15)+'px';layer.append(word);setTimeout(()=>{if(layer.contains(word))layer.replaceChildren();},700);
  }
  function renderTrophies(s=summary()){
    $('trophySummary').textContent=`已解锁 ${s.earned.length} / 12 枚 · 收集故事，也收集属于你的瞬间。`;
    $('trophyGrid').innerHTML=achievements.map(a=>{const val=Math.min(a.target,a.value(s)),earned=val>=a.target;return `<article class="trophy-card ${a.tier} ${earned?'earned':'locked'}"><span class="trophy-state">${tierName[a.tier]} · ${earned?'已解锁':'未解锁'}</span><div class="trophy-icon">${icon}</div><h3>${a.name}</h3><p>${a.desc}</p><progress aria-label="${a.name}" max="${a.target}" value="${val}"></progress><small>${a.id==='platinum'?`${Math.min(s.count,500)}/500 部 · ${Math.min(s.explorations,3)}/3 探索奖杯`:`${val} / ${a.target}`}</small></article>`;}).join('');
  }
  function renderProfile(s=summary()){
    $('profileBanner').innerHTML=`<div class="game-kicker">${escapeHTML(player.nickname||'无名的次元旅人')}</div><strong>${rank(s.count)[0]}</strong><p>${rank(s.count)[1]}</p><div class="profile-numbers"><div><b>${s.count}</b><span>作品已收录</span></div><div><b>${s.years}</b><span>首播年份足迹</span></div><div><b>${s.earned.length}</b><span>奖杯已解锁</span></div></div>`;
  }
  function syncForm(){const s=summary();$('playerName').value=player.nickname;$('motionLevel').value=player.motion;$('gameSound').checked=player.sound;for(let i=0;i<3;i++){const select=$('favorite'+i);select.replaceChildren(new Option('未选择 · 从看过的作品中挑选',''));for(const a of s.seen)select.add(new Option(a.name,String(a.id)));select.value=watched.has(player.favorites[i])?String(player.favorites[i]):'';}}
  $('openPlayer').onclick=()=>{renderProfile();syncForm();openDialog('playerDialog');};
  $('openTrophies').onclick=()=>{renderTrophies();openDialog('trophyDialog');};
  $('collapseHud').onclick=()=>{player.collapsed=!player.collapsed;applySettings();persist();};
  $('playerName').oninput=()=>{player.nickname=Array.from($('playerName').value.trim()).slice(0,16).join('');persist();renderProfile();};
  $('motionLevel').onchange=()=>{player.motion=$('motionLevel').value;applySettings();persist();};
  $('gameSound').onchange=()=>{player.sound=$('gameSound').checked;persist();if(player.sound)playTone();};
  for(let i=0;i<3;i++)$('favorite'+i).onchange=()=>{player.favorites=[...new Set([0,1,2].map(j=>Number($('favorite'+j).value)).filter(id=>byId.has(id)&&watched.has(id)))];persist();syncForm();};
  function drawTrophy(ctx,x,y,scale,color){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle=color;ctx.fill(new Path2D(trophyPath));ctx.restore();}
  function drawCard(){
    const s=summary(),c=$('shareCanvas'),ctx=c.getContext('2d');if(!ctx)throw Error('当前浏览器无法生成图片');
    const ink='#252635',paper='#fffdf5',mint='#a6f0cc',sun='#ffe16b';
    ctx.fillStyle=paper;ctx.fillRect(0,0,900,1200);ctx.fillStyle='#e2dfd6';for(let x=0;x<900;x+=12)for(let y=0;y<1200;y+=12)ctx.fillRect(x,y,2,2);
    ctx.strokeStyle=ink;ctx.lineWidth=6;ctx.strokeRect(25,25,850,1150);ctx.fillStyle=ink;ctx.fillRect(25,25,850,90);
    function text(t,x,y,size=24,color=ink,bold=false){ctx.fillStyle=color;ctx.font=`${bold?'900':'500'} ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;ctx.fillText(t,x,y);}
    function fit(t,width,size=30){ctx.font=`900 ${size}px "PingFang SC","Microsoft YaHei",sans-serif`;let value=t;while(ctx.measureText(value).width>width&&value.length>1)value=Array.from(value).slice(0,-1).join('');return value===t?t:value+'…';}
    text('番年史  /  ANIME ATLAS',60,83,30,paper,true);text('PLAYER CARD',625,81,19,mint,true);
    text('二 次 元 浓 度 鉴 定 卡',60,166,23,ink,true);text(fit(player.nickname||'无名的次元旅人',720,38),60,228,38,ink,true);
    ctx.fillStyle=mint;ctx.fillRect(60,260,780,154);ctx.strokeRect(60,260,780,154);drawTrophy(ctx,690,286,5,ink);text(rank(s.count)[0],84,327,40,ink,true);text(rank(s.count)[1],84,374,22);
    [[String(s.count),'作品已收录'],[String(s.years),'首播年份足迹'],[String(s.earned.length)+'/12','奖杯已解锁']].forEach(([n,label],i)=>{text(n,70+i*265,500,58,ink,true);text(label,70+i*265,538,21);});
    text(s.era!==undefined?`最常出没：${s.era} 年代`:'最常出没：等待第一次启程',60,599,24,ink,true);
    ctx.fillStyle=sun;ctx.fillRect(60,632,780,62);ctx.strokeRect(60,632,780,62);const a=s.earned.at(-1);text(a?`代表奖杯 · ${a.name}`:'下一枚奖杯 · 故事从这里开始',80,673,25,ink,true);
    text('MY FAVORITES / 我的本命',60,746,20,ink,true);
    const favorites=player.favorites.filter(id=>watched.has(id)&&byId.has(id));
    if(!favorites.length)text('故事很多，本命的位置留给心动。',60,800,24);
    favorites.forEach((id,i)=>text(`${String(i+1).padStart(2,'0')}  ${fit(byId.get(id).name,705,25)}`,60,795+i*43,25,ink,true));
    ctx.fillStyle=ink;ctx.fillRect(60,957,575,145);text('每一格点亮，都是一个去过的世界。',82,1002,23,paper,true);text('扫码开启你的次元存档 →',82,1050,23,mint,true);text('codphish.github.io/anime-atlas',82,1081,17,paper);
    if(window.ATLAS_QR){const qr=window.ATLAS_QR,unit=4,side=(qr.length+8)*unit,x=840-side,y=951;ctx.fillStyle='white';ctx.fillRect(x,y,side,side);ctx.fillStyle=ink;qr.forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')ctx.fillRect(x+(i+4)*unit,y+(j+4)*unit,unit,unit);}));}
    text('趣味评级 · 根据本片单的本地记录生成 · 非全站排名',60,1145,17);c.setAttribute('aria-label',`${player.nickname||'无名的次元旅人'}，${rank(s.count)[0]}，看过 ${s.count} 部，${s.earned.length} 枚奖杯`);
    return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(Error('图片生成失败')),'image/png'));
  }
  let shareBlob=null,shareGeneration=0;
  async function openShare(){const generation=++shareGeneration;shareBlob=null;openDialog('shareDialog');$('shareStatus').textContent='正在绘制战绩卡…';$('nativeShare').disabled=$('downloadCard').disabled=true;try{const blob=await drawCard();if(generation!==shareGeneration)return;shareBlob=blob;$('shareStatus').textContent='图片已就绪，可以保存或分享。';$('nativeShare').disabled=$('downloadCard').disabled=false;}catch(e){$('shareStatus').textContent=e.message;}}
  $('openShare').onclick=openShare;$('profileShare').onclick=()=>{$('playerDialog').close();openShare();};
  function downloadCard(){if(!shareBlob)return;const url=URL.createObjectURL(shareBlob),a=document.createElement('a');a.href=url;a.download='番年史-我的二次元浓度.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('shareStatus').textContent='已开始保存图片；也可以长按预览或截图分享。';}
  $('downloadCard').onclick=downloadCard;
  $('nativeShare').onclick=async()=>{if(!shareBlob)return;const file=new File([shareBlob],'我的二次元浓度.png',{type:'image/png'});if(!navigator.canShare?.({files:[file]})){downloadCard();return;}try{await navigator.share({files:[file],title:'我的番年史 · 二次元浓度'});$('shareStatus').textContent='已交给系统分享。';}catch(e){$('shareStatus').textContent=e.name==='AbortError'?'已取消分享，图片仍可保存。':'分享未完成，请使用“保存图片”。';}};
  window.AtlasGame={
    onWatch(id,on){feedback(id,on);reconcile(true);},
    onRecords(){reconcile(false);if($('playerDialog').open)syncForm();},
    exportState(){return {...player,favorites:[...player.favorites],announced:[...player.announced]};},
    validateImport(raw){if(raw===undefined)return null;if(!raw||typeof raw!=='object'||raw.version!==1||!Array.isArray(raw.favorites)||raw.favorites.some(id=>!Number.isSafeInteger(id)||id<=0)||typeof raw.nickname!=='string'||!['full','light','off'].includes(raw.motion)||typeof raw.sound!=='boolean')throw Error('玩家档案格式无效');return normalize(raw);},
    importState(raw){if(raw){player={...raw,announced:[...new Set([...player.announced,...raw.announced])]};persist();applySettings();}reconcile(false);if($('playerDialog').open)syncForm();}
  };
  window.addEventListener('storage',e=>{if(e.key===PLAYER_KEY||e.key===null){try{player=normalize(e.key===PLAYER_KEY&&e.newValue?JSON.parse(e.newValue):{});applySettings();refresh();if($('playerDialog').open)syncForm();}catch{$('storageWarning').hidden=false;}}});
  applySettings();const initial=reconcile(false);persist();
  if(firstVisit&&initial.count)reward('欢迎回来，旅人',`已读取 ${initial.count} 部观看记录，获得 ${initial.earned.length} 枚奖杯。`,'gold','SAVE LOADED / 旧存档已接续');
})();
