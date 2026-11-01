/* Original procedural score: D Phrygian dominant, slow temple percussion,
   bowed metallic impacts and a stereo hall. No remote audio dependencies. */
(() => {
  let ctx, master, fx, music, hall, echo, tick, step = 0, next = 0;
  let enabled = true, level = .28;
  try { const s = JSON.parse(localStorage.getItem('hand-duel-audio') || '{}'); enabled = s.enabled ?? true; level = Math.max(0, Math.min(1, Number(s.level ?? .28))); } catch (_) {}
  const save = () => { try { localStorage.setItem('hand-duel-audio', JSON.stringify({enabled, level})); } catch (_) {} };
  function init() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -16; limiter.ratio.value = 5;
      master = ctx.createGain(); master.gain.value = .7; master.connect(limiter).connect(ctx.destination);
      hall = ctx.createConvolver();
      const impulse = ctx.createBuffer(2, ctx.sampleRate * 3.6, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = impulse.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/d.length, 3) * (i < ctx.sampleRate*.025 ? .12 : .7); }
      hall.buffer = impulse;
      const wet = ctx.createGain(); wet.gain.value = .24; hall.connect(wet).connect(master);
      fx = ctx.createGain(); fx.gain.value = .8; fx.connect(master); fx.connect(hall);
      music = ctx.createGain(); music.gain.value = enabled ? level : 0; music.connect(master); music.connect(hall);
      echo = ctx.createDelay(.8); echo.delayTime.value = .29;
      const feedback = ctx.createGain(); feedback.gain.value = .24;
      const low = ctx.createBiquadFilter(); low.frequency.value = 2200;
      const send = ctx.createGain(); send.gain.value = .17;
      fx.connect(send).connect(echo); echo.connect(low).connect(feedback).connect(echo); low.connect(master);
      next = ctx.currentTime + .1;
      tick = setInterval(schedule, 100);
    }
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(() => {});
    return true;
  }
  function tone(freq, when, duration, gain, bus, type='sine', pan=0, attack=.02, end=freq) {
    const o=ctx.createOscillator(), g=ctx.createGain(), p=ctx.createStereoPanner();
    o.type=type; o.frequency.setValueAtTime(freq,when); o.frequency.exponentialRampToValueAtTime(Math.max(20,end),when+duration);
    g.gain.setValueAtTime(0,when); g.gain.linearRampToValueAtTime(gain,when+Math.min(attack,duration*.3)); g.gain.exponentialRampToValueAtTime(.0001,when+duration);
    p.pan.value=pan; o.connect(g).connect(p).connect(bus); o.start(when); o.stop(when+duration+.02);
    o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};
  }
  function noise(when, duration, volume, from, to, bus, q=1) {
    const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate), d=b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const s=ctx.createBufferSource(), f=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=b;
    f.type='bandpass';f.Q.value=q;f.frequency.setValueAtTime(from,when);f.frequency.exponentialRampToValueAtTime(to,when+duration);
    g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(volume,when+.015);g.gain.exponentialRampToValueAtTime(.0001,when+duration);
    s.connect(f).connect(g).connect(bus);s.start(when);s.onended=()=>{s.disconnect();f.disconnect();g.disconnect();};
  }
  const hz = midi => 440*Math.pow(2,(midi-69)/12);
  function pluck(midi,t,vol=.11,pan=0) {
    [1,2,3,4.02,5].forEach((partial,i)=>tone(hz(midi)*partial,t,1.5/(1+i*.25),vol/(1+i*2.8),music,'sine',pan,.006));
  }
  function pad(midi,t,duration=5) {
    [0,7,12].forEach((n,i)=>{tone(hz(midi+n)*.998,t,duration,.034,music,'sine',-.5,.9);tone(hz(midi+n)*1.002,t,duration,.03,music,'sine',.5,.9);});
  }
  const melody=[62,null,63,66,69,null,67,66,63,null,62,null,57,null,60,null,62,null,66,67,70,null,69,67,66,null,63,null,62,null,null,null];
  function schedule() {
    if (!ctx || ctx.state !== 'running' || document.hidden) return;
    if(next < ctx.currentTime) next=ctx.currentTime+.05;
    while(next < ctx.currentTime+.25) {
      if(enabled && level>0) {
        const s=step%32, bar=Math.floor(step/8)%8;
        if(s%8===0) pad([38,38,39,38,43,39,38,38][bar],next,5.8);
        const note=melody[s]; if(note!==null) pluck(note+(bar>=4?12:0),next,.085,(s%4-1.5)*.28);
        if(s%4===0) { tone(110,next,.55,.16,music,'sine',-.12,.006,48); noise(next,.12,.075,550,150,music); }
        if(s%8===5 || s%8===7) noise(next,.17,.038,1900,650,music,1.7);
        if(s%16===12) {tone(hz(74),next,2.2,.04,music,'sine',.35,.4);noise(next,1.7,.018,1600,2100,music,4);}
      }
      next+=.375; step++;
    }
  }
  function impact() {
    if(!init())return; const t=ctx.currentTime;
    // Heavy forged-metal impact: a defined attack, deep weight and short hall tail.
    tone(152,t,.32,.34,fx,'sine',0,.004,52);
    noise(t,.11,.21,1750,420,master,.9);
    [233,389,641,977,1471].forEach((f,i)=>tone(f,t+.006,.95-i*.12,.12/(1+i*.75),fx,'sine',(i%2?1:-1)*.2,.004,f*.985));
    noise(t+.025,.19,.085,820,1850,fx,4.5);
    tone(74,t+.032,.38,.12,master,'sine',0,.008,46);
    // A quiet reflected clink adds depth without a long or piercing squeal.
    tone(641,t+.105,.26,.023,master,'sine',.25,.006,633);
  }
  function reveal() {
    if(!init())return;const t=ctx.currentTime;
    noise(t,.42,.12,400,3400,fx,2.4);
    [587,880,1174,1760].forEach((f,i)=>tone(f,t+i*.04,.8,.055,fx,'sine',(i-1.5)*.25,.015));
  }
  let lastHover = -1;
  function hover() {
    // Keep this gesture close and dry, with no impact echo or long metallic ring.
    if(!init() || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if(t - lastHover < .065) return;
    lastHover = t;
    const variation = .92 + Math.random() * .16;
    noise(t, .145, .075, 1550 * variation, 420 * variation, master, 1.15);
    noise(t + .018, .09, .045, 540 * variation, 980 * variation, master, 3.2);
    tone(235 * variation, t, .12, .022, master, 'triangle', 0, .012, 174 * variation);
    tone(690 * variation, t + .012, .095, .012, master, 'sine', .12, .008, 610 * variation);
  }
  function result(kind) {
    if(!init())return;const t=ctx.currentTime+.22;
    const chord=kind==='win'?[50,57,62,66,69]:kind==='lose'?[38,45,50,53,60]:[50,57,62,67];
    tone(80,t,1.1,.3,fx,'sine',0,.01,36);noise(t,.8,.12,700,190,fx);
    chord.forEach((m,i)=>[1,2,3].forEach((h,j)=>tone(hz(m)*h,t+i*.095,2.8,.12/(1+j*4),fx,j?'triangle':'sine',(i/(chord.length-1)-.5)*1.1,.13)));
    if(kind==='win') [74,78,81,86].forEach((m,i)=>tone(hz(m),t+.4+i*.14,1.9,.09,fx,'sine',.25,.01));
  }
  const panel=document.createElement('details');panel.className='audio-settings';
  panel.innerHTML='<summary aria-label="Sound settings">♫ SOUND</summary><div class="audio-panel"><label><input id="musicEnabled" type="checkbox"> Background music</label><label for="musicVolume">Music volume <output id="musicLevel"></output></label><input id="musicVolume" aria-label="Background music volume" type="range" min="0" max="100" step="1"><small>Temple ambience · Original score</small></div>';
  document.querySelector('.topbar').append(panel);
  const toggle=panel.querySelector('#musicEnabled'), slider=panel.querySelector('#musicVolume'), output=panel.querySelector('output');
  toggle.checked=enabled;slider.value=Math.round(level*100);output.value=slider.value+'%';
  function update(){enabled=toggle.checked;level=Number(slider.value)/100;output.value=slider.value+'%';init();if(music)music.gain.setTargetAtTime(enabled?level:0,ctx.currentTime,.12);save();}
  toggle.addEventListener('change',update);slider.addEventListener('input',update);
  document.addEventListener('pointerdown', event => { if(!panel.contains(event.target)) panel.open=false; });
  document.addEventListener('keydown', event => { if(event.key==='Escape') panel.open=false; });
  document.addEventListener('pointerdown',()=>init(),{once:true});
  document.addEventListener('keydown',()=>init(),{once:true});
  document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else{next=ctx.currentTime+.1;ctx.resume().catch(()=>{});}});
  // Delegate once so rerendered hands do not replay on every inner image event.
  document.addEventListener('pointerover', event => {
    if(event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const card = event.target.closest?.('.hand-card, .play-card:not(.empty), .history-item img');
    if(!card || (event.relatedTarget instanceof Node && card.contains(event.relatedTarget))) return;
    hover();
  });
  window.DuelAudio={impact,reveal,result,hover};
})();
