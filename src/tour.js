// The 1-minute guided tour. Plays the whole loop on sandboxed progress, then puts the viewer's data back in place.
// It can be paused, and Next skips to the following caption.
(function (A) {
  const $=id=>document.getElementById(id);
  let touring=false, abort=false, paused=false, skip=false, step=0;
  const STEPS=13;
  // Waits in small slices so Pause holds the clock and Next cuts a caption short (typing pauses but can't be skipped).
  const sleep=ms=>new Promise((res,rej)=>{let left=ms;const tick=()=>{if(abort)return rej('stop');if(skip&&ms>=300){skip=false;return res()}
    if(!paused)left-=Math.min(100,left);if(left<=0)return res();setTimeout(tick,Math.min(100,left||100))};tick()});
  async function typeIn(text){const ta=$('prompt');ta.value='';for(const ch of text){if(abort)throw'stop';ta.value+=ch;ta.dispatchEvent(new Event('input'));await sleep(32)}}
  function cap(label,text){step++;$('tourStep').textContent=label;$('tourCap').textContent=text;$('tourProg').style.width=Math.min(100,step/STEPS*100)+'%'}
  const top=()=>window.scrollTo({top:0,behavior:'smooth'});
  function setPaused(p){paused=p;const b=$('tourPause');b.textContent=p?'Resume':'Pause';b.setAttribute('aria-pressed',p)}
  async function run(app){
    if(touring)return;touring=true;abort=false;skip=false;step=0;setPaused(false);A.storage.beginSandbox();
    app.resetForTour();app.showTab('route');top();
    $('tourbar').classList.add('on');$('tourBtn').disabled=true;$('endBtn').disabled=true;
    try{
      cap('0:00','Meet Mandu. You bring a prompt, he finds the right AI model. Watch the Core loop strip light up as we play.');await sleep(4200);
      cap('ASK','Step 1, Ask: type what you would normally ask ChatGPT, Claude or Gemini.');await sleep(700);
      await typeIn("What's the capital of Australia?");await sleep(500);app.doRoute();
      cap('ROUTE','Step 2, Route: Mandu reads the prompt, follows the trail and snatches an ant in that model\'s color.');await sleep(3800);
      cap('REVEAL','Step 3, Reveal: a quick fact goes to a fast, cheap model, and Mandu says how sure he is.');await sleep(3800);
      await typeIn('Fix this off-by-one bug in my Python loop');await sleep(300);app.doRoute();
      cap('REVEAL','A coding prompt gets a stronger model. The belly shows your split across Claude, GPT and Gemini.');await sleep(4200);
      cap('STEER','Step 4, Steer: disagree? Tap another model. Mandu tilts his head and reroutes.');await sleep(1600);
      const chips=[...$('result').querySelectorAll('.chip')].filter(c=>!c.classList.contains('on'));
      const want=['sonnet','gpt','gpro'].find(id=>{const m=A.models.MODELS.find(x=>x.id===id);return!app.game.state().fams.includes(m.fam)})||'sonnet';
      (chips.find(c=>c.dataset.id===want)||chips[0])?.click();await sleep(3800);
      cap('LEARN','Step 5, Learn: a reroute strengthens that trail for prompts like this one, so next time Mandu picks it on his own.');app.showTab('trails');await sleep(2600);
      await typeIn('Summarize this 20-page article into key points');await sleep(300);app.doRoute();await sleep(3900);$('good')?.click();
      cap('LEARN','"Good route" confirms Mandu\'s pick. Decisions like this earn the most XP.');await sleep(3000);
      cap('PLATFORM','Already living in one app? Switch to Gemini and Mandu picks the right tier inside it.');app.clickPlat('Gemini');await sleep(900);
      await typeIn('Design the database schema for a ride-share app, handle edge cases');await sleep(300);app.doRoute();await sleep(4200);
      cap('LEVEL UP','Progress: each level unlocks a routing tool, like score bars and close-call alerts.');app.showTab('progress');await sleep(3400);
      cap('SHOP','Shop: spend crumbs on gear, or on second opinions and forgetting a trail.');app.showTab('shop');await sleep(800);
      for(const id of ['hat','bandana','bow']){const b=$('shop').querySelector('[data-buy="'+id+'"]');if(b&&!b.disabled){b.click();await sleep(1300)}}
      await sleep(1600);
      cap('ZOT!','Fellow Anteaters: press Zot! (or type zot).');app.clickPlat('Any app');$('zot').click();await sleep(3600);
      cap('LOOP','That is the loop: Ask, Route, Reveal, Steer, Learn, level up. Your turn!');app.showTab('route');await sleep(4200);
    }catch(e){}
    A.storage.endSandbox();app.restoreAll();
    touring=false;$('tourbar').classList.remove('on');$('tourBtn').disabled=false;$('endBtn').disabled=false;$('tourBtn').focus();
  }
  function stop(){abort=true;$('tourCap').textContent='Stopping…'}
  A.tour={run,stop,pause:()=>setPaused(!paused),next:()=>{skip=true}};
})(globalThis.AntRouter = globalThis.AntRouter || {});
