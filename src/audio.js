// Sound effects, synthesized with Web Audio so there are no audio files. Silent until the first click (browser
// autoplay rules) and whenever the viewer mutes. Sounds fired in the same tick collapse to the most important one.
(function (A) {
  const n=(f,at,dur,o)=>Object.assign({f,at,dur},o||{});
  // Each sound is a list of notes: frequency (Hz), start and length (s), optional wave, volume and pitch slide.
  const SFX={
    tap:[n(660,0,.05,{vol:.06})],
    route:[n(880,0,.04,{type:'triangle',vol:.09}),n(1046,.07,.04,{type:'triangle',vol:.09}),n(1318,.14,.05,{type:'triangle',vol:.09})],
    gulp:[n(520,0,.16,{slide:190,vol:.2}),n(1200,.17,.05,{vol:.05})],
    good:[n(660,0,.1,{vol:.12}),n(990,.09,.16,{vol:.12})],
    hmm:[n(440,0,.14,{type:'triangle',slide:330,vol:.12}),n(330,.15,.18,{type:'triangle',slide:494,vol:.12})],
    coin:[n(988,0,.07,{type:'square',vol:.05}),n(1319,.07,.24,{type:'square',vol:.05})],
    levelup:[n(523,0,.14,{type:'triangle'}),n(659,.09,.14,{type:'triangle'}),n(784,.18,.14,{type:'triangle'}),n(1047,.27,.32,{type:'triangle'})],
    quest:[n(784,0,.1,{vol:.12}),n(1047,.1,.22,{vol:.12})],
    badge:[n(1319,0,.07,{vol:.08}),n(1568,.06,.07,{vol:.08}),n(2093,.12,.18,{vol:.07})],
    zot:[n(587,0,.1,{type:'sawtooth',vol:.06}),n(587,.17,.1,{type:'sawtooth',vol:.06}),n(587,.34,.1,{type:'sawtooth',vol:.06}),n(880,.52,.3,{type:'square',vol:.06})],
    pet:[n(880,0,.09,{slide:1250,vol:.08})],
    nap:[n(392,0,.45,{slide:262,vol:.07})],
    start:[n(392,0,.12),n(523,.1,.12),n(659,.2,.12),n(784,.3,.3)],
    end:[n(784,0,.16,{vol:.1}),n(659,.15,.16,{vol:.1}),n(523,.3,.16,{vol:.1}),n(392,.45,.4,{vol:.1})],
    lap:[n(659,0,.08,{vol:.11}),n(784,.08,.08,{vol:.11}),n(1047,.16,.24,{vol:.11})],
    nope:[n(220,0,.12,{type:'triangle',vol:.1})]
  };
  const PRI={levelup:9,badge:8,quest:7,lap:6,coin:5,start:5,end:5,zot:5,gulp:4,hmm:4,good:4,route:3,pet:2,nap:2,nope:2,tap:1};

  function createAudio(store){
    let muted=!!store.get('muted',false), ctx=null, out=null, pending=null;
    const AC=globalThis.AudioContext||globalThis.webkitAudioContext;
    function ready(){if(!AC)return false;if(!ctx){try{ctx=new AC();out=ctx.createGain();out.gain.value=.8;out.connect(ctx.destination)}catch(e){ctx=null;return false}}
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});return true}
    function voice(v,t0){const o=ctx.createOscillator(),g=ctx.createGain(),t=t0+v.at,vol=v.vol||.14;
      o.type=v.type||'sine';o.frequency.setValueAtTime(v.f,t);if(v.slide)o.frequency.exponentialRampToValueAtTime(v.slide,t+v.dur);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+v.dur);
      o.connect(g);g.connect(out);o.start(t);o.stop(t+v.dur+.02)}
    function play(name){if(muted||!SFX[name]||!ready())return;
      if(pending){if((PRI[name]||0)>(PRI[pending]||0))pending=name;return}
      pending=name;setTimeout(()=>{const s=SFX[pending];pending=null;const t0=ctx.currentTime+.01;s.forEach(v=>voice(v,t0))},0)}
    function setMuted(m){muted=!!m;store.set('muted',muted)}
    return{play,setMuted,muted:()=>muted};
  }
  A.audio={createAudio,SOUNDS:Object.keys(SFX)};
})(globalThis.AntRouter = globalThis.AntRouter || {});
