// The 1-minute guided tour. Plays the whole loop on sandboxed progress, then restores the viewer's data and reloads.
(function (A) {
  const $=id=>document.getElementById(id);
  let touring=false, abort=false;
  const sleep=ms=>new Promise((res,rej)=>{setTimeout(()=>abort?rej('stop'):res(),ms)});
  async function typeIn(text){const ta=$('prompt');ta.value='';for(const ch of text){if(abort)throw'stop';ta.value+=ch;ta.dispatchEvent(new Event('input'));await sleep(32)}}
  function cap(step,text){$('tourStep').textContent=step;$('tourCap').textContent=text}
  const top=()=>window.scrollTo({top:0,behavior:'smooth'});
  async function run(app){
    if(touring)return;touring=true;abort=false;A.storage.beginSandbox();
    app.resetForTour();app.showTab('route');top();
    $('tourbar').classList.add('on');$('tourBtn').disabled=true;$('endBtn').disabled=true;
    const t0=performance.now();const tick=setInterval(()=>{const s=Math.min(60,(performance.now()-t0)/1000);$('tourProg').style.width=(s/60*100)+'%'},250);
    try{
      cap('0:00','Meet Mandu. You bring a prompt, he finds the right AI model. Watch the Core loop strip light up as we play.');await sleep(4200);
      cap('ASK','Step 1, Ask: type what you would normally ask ChatGPT, Claude or Gemini.');await sleep(700);
      await typeIn("What's the capital of Australia?");await sleep(500);app.doRoute();
      cap('ROUTE','Step 2, Route: Mandu reads the prompt, follows the trail and snatches an ant in that model\'s color.');await sleep(3800);
      cap('REVEAL','Step 3, Reveal: a quick fact goes to a fast, cheap model. The ant lands in his belly, and you earn XP and crumbs.');await sleep(3800);
      await typeIn('Fix this off-by-one bug in my Python loop');await sleep(300);app.doRoute();
      cap('REVEAL','A coding prompt gets a stronger model. The belly shows your split across Claude, GPT and Gemini.');await sleep(4200);
      cap('STEER','Step 4, Steer: disagree? Tap another model. Mandu tilts his head and reroutes.');await sleep(1600);
      const chips=[...$('result').querySelectorAll('.chip')].filter(c=>!c.classList.contains('on'));
      const want=['sonnet','gpt','gpro'].find(id=>{const m=A.models.MODELS.find(x=>x.id===id);return!app.game.state().fams.includes(m.fam)})||'sonnet';
      (chips.find(c=>c.dataset.id===want)||chips[0])?.click();await sleep(3800);
      cap('LEARN','Step 5, Learn: every reroute strengthens that trail, so next time Mandu picks it on his own.');app.showTab('trails');await sleep(2400);
      await typeIn('Summarize this 20-page article into key points');await sleep(300);app.doRoute();await sleep(3900);$('good')?.click();
      cap('LEARN','"Good route" confirms Mandu\'s pick. Badges pay bonus crumbs.');await sleep(3000);
      cap('PLATFORM','Already living in one app? Switch to Gemini and Mandu picks the right tier inside it.');app.clickPlat('Gemini');await sleep(900);
      await typeIn('Design the database schema for a ride-share app, handle edge cases');await sleep(300);app.doRoute();await sleep(4200);
      cap('LEVEL UP','Progress: XP levels Mandu up from Pup to Trailblazer and unlocks new shop items.');app.showTab('progress');await sleep(3200);
      cap('SHOP','Shop: spend crumbs on gear. Mandu wears it right away.');app.showTab('shop');await sleep(800);
      for(const id of ['hat','bandana','bow']){const b=$('shop').querySelector('[data-buy="'+id+'"]');if(b&&!b.disabled){b.click();await sleep(1300)}}
      await sleep(1600);
      cap('ZOT!','Fellow Anteaters: type zot.');app.clickPlat('Any app');await typeIn('zot');await sleep(3600);
      cap('LOOP','That is the loop: Ask, Route, Reveal, Steer, Learn, level up. Your turn!');app.showTab('route');await sleep(4200);
    }catch(e){}
    clearInterval(tick);app.stopMandu();A.storage.endSandbox();
    try{sessionStorage.setItem('antrouter-skip-launch','1')}catch(e){}
    location.reload();
  }
  function stop(){abort=true;$('tourCap').textContent='Stopping…'}
  A.tour={run,stop};
})(globalThis.AntRouter = globalThis.AntRouter || {});
