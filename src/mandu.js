// Mandu, the ASCII anteater: animation loop, moods, belly ants, gear and the level readout.
// The page talks to Mandu only through the object createMandu() returns.
(function (A) {
  function createMandu(opts){
    const pre=opts.screen, statusEl=opts.status, reduce=!!opts.reduce, store=opts.store, maxFont=opts.maxFont||13;
    const wearing=id=>opts.getWorn(id);
    const FAMC=A.models.FAMILY_COLORS;
const COLS=104, ROWS=44, ASPECT=0.6, VTOP=-0.7, VSPAN=1.82;
const CH=VSPAN/ROWS, CW=CH*ASPECT;
const RAMP=" .,:;-=+*#%@", TAILR=" .'`\":;*%#";
const UBLUE='#2F8FE0', UGOLD='#FFD200';
const ZFONT={Z:['#####','   # ','  #  ',' #   ','#####'],O:[' ### ','#   #','#   #','#   #',' ### '],T:['#####','  #  ','  #  ','  #  ','  #  '],'!':['#','#','#',' ','#']};
const ALPHA="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const FUR='#E7D2B4', FURD='#B89A78', STRIPE='#5E4B3C', CREAM='#FFF4E2', PINK='#F59AB0', WHITE='#FFFFFF', DIRT='#4A4152', GREY='#8B96AE';
let state='idle', stateT=0, t=0, lastInput=0;
const LICK=1.1;
const WIN=(x,y)=>((x+0.04)/0.31)**2+((y-0.39)/0.2)**2;
    const readBelly=()=>{const v=store.get('belly',null);return v&&typeof v==='object'?{Claude:v.Claude|0,GPT:v.GPT|0,Gemini:v.Gemini|0}:{Claude:0,GPT:0,Gemini:0}};
    let belly=readBelly();
    let gulpAt=-9, pendingEat=null, levelUpAt=-9, levelUpName='';
    function saveBelly(){store.set('belly',belly);if(opts.onBellyChange)opts.onBellyChange()}
function eat(fam,from){if(from&&belly[from]>0)belly[from]--;belly[fam]=(belly[fam]||0)+1;gulpAt=t;saveBelly();still()}
function queueEat(fam,from){if(reduce||!rafId){eat(fam,from);return}if(pendingEat)pendingEat.fam=fam;else pendingEat={fam,from:from||null}}
// fixed slots inside the stomach, model coords
const SLOTS=(()=>{const o=[];for(let y=0.24;y<=0.54;y+=0.04)for(let x=-0.32;x<=0.24;x+=0.044){const q=((x+0.04)/0.27)**2+((y-0.39)/0.165)**2;if(q<1)o.push([x,y])}
  // interleave so colours mix like a real ant pile
  return o.map((p,i)=>[p,(i*37)%o.length]).sort((a,b)=>a[1]-b[1]).map(a=>a[0])})();
let trailColor=GREY, plate=' SNIFFING ', target=null, flapStart=0;
let blinkAt=2, tongueAt=3, look={x:0,y:0}, pointer=null, fx=[], ants=[];
for(let i=0;i<7;i++)ants.push({x:-1.3+Math.random()*2.6,v:(Math.random()<0.5?-1:1)*(0.05+Math.random()*0.05)});
    function fit(){const term=pre.parentElement;const w=term.clientWidth-16;let f=w/(COLS*0.602);if(term.classList.contains('max')){f=Math.min(f,(term.clientHeight-80)/ROWS);f=Math.min(f,24)}else f=Math.min(f,maxFont);pre.style.fontSize=Math.max(5,f)+'px'}
    window.addEventListener('resize',fit);
pre.addEventListener('pointermove',e=>{const r=pre.getBoundingClientRect();pointer={x:(e.clientX-r.left)/r.width*2-1,y:(e.clientY-r.top)/r.height*2-1};lastInput=t;if(state==='nap')wake()});
pre.addEventListener('pointerleave',()=>pointer=null);
pre.addEventListener('click',pet);
const len=(x,y)=>Math.sqrt(x*x+y*y);
const L=(()=>{const x=-0.45,y=-0.7,z=0.55,n=Math.hypot(x,y,z);return[x/n,y/n,z/n]})();
const shade=(b,ramp)=>{ramp=ramp||RAMP;b=Math.max(0,Math.min(0.999,b));return ramp[1+Math.floor(b*(ramp.length-1))]||ramp[ramp.length-1]};
function hex(c){return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)]}
function mix(a,b,k){k=Math.max(0,Math.min(1,k));const A=hex(a),B=hex(b);return'#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join('')}
function seg(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay;const h=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)));return{d:len(px-ax-dx*h,py-ay-dy*h),h}}
function setStatus(s){statusEl.textContent='mandu — '+s}
    // Reduced motion has no animation loop: each mood change draws one still frame, then settles back to idle.
    let settleT=0;
    function still(){if(reduce){update(0);render()}}
    function settle(ms){if(!reduce)return;still();clearTimeout(settleT);settleT=setTimeout(()=>{if(state!=='nap'){state='idle';idleStatus()}levelUpAt=-9;fx=[];still()},ms)}
function routeTo(m){target=m;state='routing';stateT=0;flapStart=t;lastInput=t;trailColor=m.color;setStatus('following the trail to '+m.name.toLowerCase());
  if(reduce){state='happy';plate=' '+m.name.toUpperCase()+' ';setStatus('found '+m.name.toLowerCase()+'!');settle(2400)}
  // Hidden or minimized (no animation running): land at once so the next route isn't blocked.
  else if(!rafId){state='idle';stateT=0;plate=' '+m.name.toUpperCase()+' ';setStatus('found '+m.name.toLowerCase()+'!');if(opts.onLanded)setTimeout(opts.onLanded,0)}}
    function puzzle(m){if(reduce||!rafId)return routeTo(m);target=m;state='puzzled';stateT=0;lastInput=t;setStatus('hmm, new trail?')}
    function zot(){state='zot';stateT=reduce?2:0;lastInput=t;setStatus('zot! zot! zot!');settle(3000)}
function nap(){state='nap';stateT=0;setStatus('curled up for a nap');still()}
function wake(){state='idle';stateT=0;lastInput=t;setStatus(target?'hanging out at '+target.name.toLowerCase():'sniffing around');still()}
function pet(){if(state==='routing'||state==='puzzled'||state==='lick')return;state='happy';stateT=0;lastInput=t;setStatus('happy wiggles');for(let i=0;i<3;i++)fx.push({kind:'heart',x:0.3+Math.random()*0.3,y:-0.35,vy:-0.25-Math.random()*0.1,life:1});settle(2400)}
    const busy=()=>state==='routing'||state==='lick'||state==='puzzled';
function update(dt){
  t+=dt;stateT+=dt;
  if(state==='routing'&&stateT>1.8){state='lick';stateT=0;setStatus('snatching a '+target.fam+' ant off the trail…')}
  if(state==='lick'&&stateT>LICK){state='happy';stateT=0;if(pendingEat){eat(pendingEat.fam,pendingEat.from);pendingEat=null}setStatus('gulp! found '+target.name.toLowerCase()+'!');if(opts.onLanded)opts.onLanded();for(let i=0;i<4;i++)fx.push({kind:'heart',x:0.25+Math.random()*0.4,y:-0.35,vy:-0.22-Math.random()*0.12,life:1})}
  if(state==='puzzled'&&stateT>1.2)routeTo(target);
  if(state==='happy'&&stateT>2.4){state='idle';stateT=0;setStatus(target?'hanging out at '+target.name.toLowerCase():'sniffing around')}
  if(state==='zot'&&stateT>3){state='idle';stateT=0;setStatus(target?'hanging out at '+target.name.toLowerCase():'sniffing around')}
  if(state==='zot'&&Math.random()<dt*10)fx.push({kind:'star',x:-0.9+Math.random()*1.9,y:-0.2+Math.random()*0.3,vy:-0.3,life:1,c:Math.random()<0.5?UBLUE:UGOLD});
  if(state==='idle'&&t-lastInput>22&&!reduce)nap();
  let tx,ty;
  if(state==='routing'){tx=1;ty=0.6}
  else if(state==='lick'){tx=1;ty=1}
  else if(state==='thinking'){tx=0.6+Math.sin(t*5)*0.4;ty=1}
  else if(state==='puzzled'){tx=Math.sin(t*8)*0.9;ty=-0.6}
  else if(pointer){tx=Math.max(-1,Math.min(1,(pointer.x-0.3)*1.6));ty=Math.max(-1,Math.min(1,(pointer.y+0.2)*1.6))}
  else{tx=Math.sin(t*0.5)*0.5;ty=Math.sin(t*0.37)*0.3}
  look.x+=(tx-look.x)*Math.min(1,dt*8);look.y+=(ty-look.y)*Math.min(1,dt*8);
  // ants
  const running=state==='routing';
  ants.forEach((a,i)=>{
    if(state==='zot'){a.v=0.7*(i%2?1:-1)}else if(running){a.v=0.9+0.1*Math.sin(i)}else if(Math.abs(a.v)>0.2){a.v=(Math.random()<0.5?-1:1)*0.06}
    if(!running&&Math.random()<dt*0.3)a.v=-a.v;
    a.x+=a.v*dt;if(a.x>1.35)a.x=-1.35;if(a.x<-1.35)a.x=1.35});
  if(!running&&state!=='happy')trailColor=mix(trailColor,GREY,dt*0.3);
  // dust when running
  if(running&&Math.random()<dt*14)fx.push({kind:'dust',x:-0.6+Math.random()*0.9,y:0.86,vy:-0.08,vx:-0.5,life:0.6});
  if(state==='nap'&&Math.random()<dt*0.9)fx.push({kind:'z',x:0.55,y:-0.25,vy:-0.12,vx:0.05,life:1});
  fx.forEach(p=>{p.y+=(p.vy||0)*dt;p.x+=(p.vx||0)*dt;p.life-=dt*(p.kind==='dust'?1.6:0.45)});
  fx=fx.filter(p=>p.life>0);
}
function eyeMode(){
  if(state==='nap')return'closed';
  if(state==='happy'||state==='zot')return'happy';
  if(t>blinkAt){if(t>blinkAt+0.15)blinkAt=t+2.2+Math.random()*3.5;return'closed'}
  return'open';
}
function tongueLen(){
  if(state==='happy'||state==='zot')return 0.1+0.03*Math.sin(t*14);
  if(state==='idle'&&t>tongueAt){const k=t-tongueAt;if(k>0.5){tongueAt=t+3+Math.random()*4;return 0}return Math.sin(k/0.5*Math.PI)*0.16}
  return 0;
}

function render(){
  const N=ROWS*COLS,grid=new Array(N).fill(' '),col=new Array(N).fill(null);
  const running=state==='routing', napping=state==='nap';
  const zotting=state==='zot';
  const bob=zotting?-Math.abs(Math.sin(t*7))*0.07:running?Math.abs(Math.sin(t*12))*-0.035:napping?Math.sin(t*1.3)*0.012:Math.sin(t*2.4)*0.018;
  const breathe=1+(napping?0.03:0.015)*Math.sin(t*(napping?1.3:2.4));
  const tilt=zotting?Math.sin(t*7)*0.12:state==='puzzled'?0.22*Math.sin(Math.min(1,stateT*3)*Math.PI/2):napping?0.18:state==='happy'?Math.sin(t*6)*0.06:0;
  const tailA=(napping?0.9:-0.25)+Math.sin(t*(running?9:1.6))*(running?0.18:0.12)+(state==='happy'||zotting?Math.sin(t*14)*0.25:0);
  const sniff=state==='thinking'?Math.sin(t*22)*0.018:(state==='idle'||running)?Math.sin(t*9)*0.012*(Math.sin(t*0.9)>0.3?1:0):0;
  const eyes=eyeMode(), tongue=tongueLen();
  const bellyOn=(belly.Claude+belly.GPT+belly.Gemini)>0;
  const headY=napping?0.16:0;
  for(let r=0;r<ROWS;r++){
    const v=VTOP+(r+0.5)*CH;
    for(let c=0;c<COLS;c++){
      const u=(c+0.5-COLS/2)*CW;
      let x=u+0.05, y=v-bob;
      let ch=' ',cc=null,depth=-1;
      const put=(k,col)=>{ch=k;cc=col};
      // tail (pivot at back of body)
      {const px=-0.62,py=0.22;const ca=Math.cos(tailA),sa=Math.sin(tailA);const lx=(x-px)*ca+(y-py)*sa,ly=-(x-px)*sa+(y-py)*ca;
       const ex=lx+0.12,ey=ly+0.4;const ang=Math.atan2(ey,ex);const fr=1+0.09*Math.sin(ang*13+t*2);
       const q=len(ex/0.2,ey/0.46)/fr;
       if(q<1){const b=0.2+0.6*(1-q)*(ex<0?0.8:1);put(q>0.86?(Math.sin(ang*13)>0?"'":'`'):shade(b,TAILR),q>0.86?FURD:FUR)}}
      // far legs
      const legLift=i=>zotting?Math.max(0,Math.sin(t*14+i*Math.PI))*0.05:running?Math.max(0,Math.sin(t*12+i*Math.PI))*0.08:0;
      for(const [lx,i] of [[-0.42,1],[0.16,0]]){const lift=legLift(i);if(Math.abs(x-lx)<0.06&&y>0.45&&y<0.82-lift){put('#',FURD)}if(len((x-lx-0.02)/0.08,(y-0.82+lift)/0.05)<1)put('@',FURD)}
      // body
      {const cx=-0.1,cy=0.32,rx=0.52*breathe,ry=0.33*breathe;const nx=(x-cx)/rx,ny=(y-cy)/ry,q=nx*nx+ny*ny;
       if(q<1){const nz=Math.sqrt(1-q);const b=0.12+0.62*Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]);put(shade(b),FUR);
        // shoulder stripe
        const s=seg(x,y,0.26,0.34,-0.08,0.1);
        if(s.d<0.035){put('%',STRIPE)}else if(s.d<0.06){put(':',CREAM)}
        // x-ray stomach window behind the ants
        if(bellyOn){const sq=WIN(x,y);if(sq<1){put(sq>0.82?':':(Math.abs(Math.sin(x*60+y*40))>0.93?'.':' '),sq>0.82?FURD:'#3A3346')}}
        // belly fluff
        if(ny>0.82&&Math.abs(Math.sin(x*40))>0.5)put(',',FURD)}}
      // rump: rounded, furry hindquarters
      {const cx=-0.47,cy=0.35,rx=0.27*breathe,ry=0.31*breathe;const nx=(x-cx)/rx,ny=(y-cy)/ry,q=nx*nx+ny*ny;
       if(q<1&&!(bellyOn&&WIN(x,y)<1)){const nz=Math.sqrt(1-q);const b=0.14+0.6*Math.max(0,nx*L[0]+ny*L[1]+nz*L[2]);
         put(q>0.88&&nx<0?(Math.sin(y*90)>0?"'":'`'):shade(b),q>0.88&&nx<0?FURD:FUR);
         if(ny>0.8&&Math.abs(Math.sin(x*40))>0.5)put(',',FURD)}}
      // gear: tail bow
      if(wearing('bow')){const dx=x+0.7,dy=y-0.13;if(Math.abs(dx)<0.1&&Math.abs(dy)<0.04&&Math.abs(dy)<Math.abs(dx)*0.45+0.012){put(Math.abs(dx)<0.022?'@':dx<0?'>':'<',Math.abs(dx)<0.022?'#FF3D7F':'#FF6FA3')}}
      // near legs
      for(const [lx,i] of [[-0.3,0],[0.28,1]]){const lift=legLift(i);if(Math.abs(x-lx)<0.065&&y>0.5&&y<0.84-lift){put(shade(0.45),FUR)}if(len((x-lx-0.025)/0.085,(y-0.85+lift)/0.05)<1)put('@',FUR);
        if(len((x-lx-0.06)/0.03,(y-0.86+lift)/0.03)<1)put('v',CREAM)}
      // head group (rotated for tilt)
      {const hx=0.42,hy=-0.02+headY;const px=0.3,py=0.15;const ca=Math.cos(tilt),sa=Math.sin(tilt);
       const X=(x-px)*ca+(y-py)*sa+px, Y=-(x-px)*sa+(y-py)*ca+py;
       // ear
       const ed=len(X-0.3,Y-(hy-0.27));if(ed<0.09){put(ed<0.045?'*':'@',ed<0.045?PINK:FUR)}
       // head sphere
       const hdx=X-hx,hdy=Y-hy,hd=len(hdx,hdy),HR=0.3;
       if(hd<HR){const nx=hdx/HR,ny=hdy/HR,nz=Math.sqrt(Math.max(0,1-nx*nx-ny*ny));put(shade(0.14+0.62*Math.max(0,nx*L[0]+ny*L[1]+nz*L[2])),FUR)}
       // gear: UCI bandana around the neck
       if(wearing('bandana')){const bs=seg(X,Y,0.15,0.0,0.3,0.32);if(bs.d<0.065){put('#',Math.floor(bs.h*8)%2?UGOLD:UBLUE)}
         const kn=seg(X,Y,0.2,0.22,0.08,0.36);if(kn.d<0.03)put(Math.floor(len(X,Y)*40)%2?'/':'\\',kn.h>0.5?UGOLD:UBLUE)}
       // gear: party hat
       if(wearing('hat')){const apy=hy-0.5,bsy=hy-0.25,lean=0.35;if(Y>apy&&Y<bsy){const k=(Y-apy)/(bsy-apy),w=k*0.1,cxh=0.42+(bsy-Y)*lean;if(Math.abs(X-cxh)<w)put(Math.floor(k*4)%2?'#':'=',Math.floor(k*4)%2?'#FF6FA3':UGOLD)}
         if(len((X-0.42-(bsy-apy)*lean)/0.03,(Y-apy+0.015)/0.025)<1)put('*',UGOLD)}
       // snout (tapered, slightly downward curve)
       const ax=0.56,ay=hy+0.04,bx=1.02,by=hy+0.2+sniff;const s=seg(X,Y,ax,ay,bx,by);const sr=0.105*(1-s.h)+0.04*s.h;
       if(s.d<sr){const k=s.d/sr;put(shade(0.2+0.5*(1-k*k)),FUR)}
       // nose
       if(len(X-bx-0.01,Y-by)<0.045)put('@',PINK);
       // tongue
       if(tongue>0){const tx2=bx+0.03+tongue,ty2=by+0.04+Math.sin(t*20)*0.01;const ts=seg(X,Y,bx+0.03,by+0.01,tx2,ty2);if(ts.d<0.014)put('~',PINK)}
       // eye
       const ex=0.47,ey=hy-0.04;const erx=0.085,ery=0.11;const qx=(X-ex)/erx,qy=(Y-ey)/ery;
       if(eyes==='open'){if(qx*qx+qy*qy<1){const ppx=ex+look.x*0.02,ppy=ey+look.y*0.025;const pq=len((X-ppx)/0.062,(Y-ppy)/0.082);
          if(pq<1){put(' ',null);if(len((X-ppx+0.018)/0.016,(Y-ppy+0.025)/0.02)<1)put('*',WHITE);else if(len((X-ppx-0.02)/0.01,(Y-ppy-0.025)/0.012)<1)put('.',WHITE)}
          else put('@',WHITE)}}
       else if(eyes==='happy'){const dd=len(qx,qy+0.35);if(Math.abs(dd-0.85)<0.25&&qy<0.0)put('^',WHITE)}
       else{if(Math.abs(qy-0.1)<0.2&&Math.abs(qx)<1&&len(qx,(qy-0.1)*2)<1.1)put('-',FURD)}
       // gear: sunglasses over the eye
       if(wearing('shades')&&eyes!=='closed'){const lx2=(X-ex)/0.1,ly2=(Y-ey)/0.075;if(Math.abs(lx2)<1&&Math.abs(ly2)<1&&lx2*lx2+ly2*ly2*0.6<1.05){const rim=Math.abs(ly2)>0.7||Math.abs(lx2)>0.85;put(rim?'#':(lx2<-0.2&&ly2<-0.1?'/':'█'),rim?'#F5B82E':(lx2<-0.2&&ly2<-0.1?WHITE:'#2A2F4A'))}
         const br=seg(X,Y,ex+0.1,ey-0.03,ex+0.22,ey);if(br.d<0.014)put('=','#F5B82E');const arm=seg(X,Y,ex-0.1,ey-0.03,ex-0.2,ey-0.06);if(arm.d<0.014)put('-','#F5B82E')}
       // blush
       if(len((X-0.5)/0.06,(Y-(hy+0.1))/0.032)<1)put(state==='happy'||state==='nap'||zotting?'~':'.',PINK)
      }
      grid[r*COLS+c]=ch;col[r*COLS+c]=cc;
    }
  }
  const toRC=(x,y)=>[Math.round((y-VTOP)/CH-0.5),Math.round((x-0.05)/CW+COLS/2-0.5)];
  const place=(x,y,s,color)=>{const[r,c]=toRC(x,y);for(let i=0;i<s.length;i++){if(r>=0&&r<ROWS&&c+i>=0&&c+i<COLS){grid[r*COLS+c+i]=s[i];col[r*COLS+c+i]=color}}};
  fx.forEach(p=>{if(p.kind==='heart')place(p.x,p.y,'♥',p.life>0.3?PINK:mix('#0B1120',PINK,p.life*3));
    if(p.kind==='dust')place(p.x,p.y,p.life>0.35?'o':'.',DIRT);
    if(p.kind==='z')place(p.x,p.y,p.life>0.6?'z':'Z',GREY);
    if(p.kind==='star')place(p.x,p.y,p.life>0.5?'*':'+',p.c)});
  // ---- belly: one ant per routed prompt, coloured by family ----
  {const fams=['Claude','GPT','Gemini'];const total=fams.reduce((a,f)=>a+belly[f],0);
   if(total>0){const n=Math.min(total*4,SLOTS.length);
     const raw=fams.map(f=>belly[f]/total*n);const cnt=raw.map(Math.floor);let left=n-cnt.reduce((a,b)=>a+b,0);
     raw.map((v,i)=>[v-cnt[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([_,i])=>{if(left>0){cnt[i]++;left--}});
     const seq=[];fams.forEach((f,i)=>{for(let k=0;k<cnt[i];k++)seq.push(f)});
     // spread each family across the pile instead of stacking
     const order=seq.map((f,i)=>[f,(i*7)%seq.length]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
     const fresh=t-gulpAt<1.2;
     order.forEach((f,i)=>{const [sx,sy]=SLOTS[i];const wig=reduce?0:Math.sin(t*3+i*1.7)*0.01;
       const isNew=fresh&&i>=order.length-4;place(sx+wig,sy+bob,'ж',isNew&&Math.floor(t*8)%2?'#FFFFFF':FAMC[f])});
     // legend
     let c0=2;const r0=1;const put2=(s,color)=>{for(let i=0;i<s.length;i++){if(c0<COLS){grid[r0*COLS+c0]=s[i];col[r0*COLS+c0]=color}c0++}};
     put2('belly ',GREY);
     fams.forEach((f,i)=>{put2('ж',FAMC[f]);put2(' '+f+' '+Math.round(belly[f]/total*100)+'%',FAMC[f]);if(i<2)put2('  ',GREY)});
     put2('  ('+total+' routed)',GREY);
   }else{let c0=2;const s='belly empty: route a prompt to feed Mandu';for(let i=0;i<s.length;i++){grid[1*COLS+c0+i]=s[i];col[1*COLS+c0+i]=GREY}}}
  // HUD: level + crumbs, top right
  {const h=opts.getHud(),li=h.index,fill=h.fill;
   const hud='Lv'+(li+1)+' '+h.name+' ['+'#'.repeat(fill)+'-'.repeat(8-fill)+'] '+h.crumbs+' crumbs';const c0=COLS-hud.length-2;
   for(let i=0;i<hud.length;i++){grid[1*COLS+c0+i]=hud[i];col[1*COLS+c0+i]=hud[i]==='#'?'#F5B82E':i<3+String(li+1).length?'#F59AB0':GREY}}
  if(t-levelUpAt<2.8){const msg='*  LEVEL UP!  '+levelUpName.toUpperCase()+'  *';const r0=4,c0=Math.round(COLS/2-msg.length/2)+8;
    for(let i=0;i<msg.length;i++){grid[r0*COLS+c0+i]=msg[i];col[r0*COLS+c0+i]=(Math.floor(t*6)+i)%2?UGOLD:'#F59AB0'}}
  if(zotting){const word='ZOT!';const beat=Math.floor(stateT*3.5);const w=word.split('').reduce((a,ch)=>a+ZFONT[ch][0].length+1,0)-1;let c0=Math.round(COLS/2-w/2)+6;const r0=3;
    word.split('').forEach((ch,li)=>{const g=ZFONT[ch];if(li<=beat){g.forEach((row,ri)=>{for(let k=0;k<row.length;k++){if(row[k]!==' '){const rr=r0+ri,cc=c0+k;if(rr<ROWS&&cc<COLS){grid[rr*COLS+cc]=(beat+li)%2?'#':'@';col[rr*COLS+cc]=(beat+li)%2?UGOLD:UBLUE}}}})}c0+=g[0].length+1});}
  if(state==='puzzled')place(0.62,-0.45,'?',PINK);
  // ---- tongue snatches an ant in the chosen model's colour ----
  if(state==='lick'&&target){
    const gr0=ROWS-3, antY=VTOP+(gr0-1+0.5)*CH, antX=1.17;
    const sx0=1.04, sy0=0.2+bob;            // nose tip on screen
    const k=stateT/LICK;                     // 0..1
    const ext=k<0.42?k/0.42:k<0.55?1:Math.max(0,1-(k-0.55)/0.45);
    const caught=k>=0.42;
    const ex=sx0+(antX-sx0)*ext, ey=sy0+(antY-sy0)*ext;
    // waiting ant on the trail before the catch
    if(!caught)place(antX,antY,'ж',FAMC[target.fam]);
    // tongue body
    const steps=Math.max(1,Math.ceil(Math.abs(ey-sy0)/CH*1.5+Math.abs(ex-sx0)/CW*1.5));
    for(let i=1;i<=steps;i++){const f=i/steps;const wob=Math.sin(f*Math.PI)*0.03*Math.sin(t*30);
      const x=sx0+(ex-sx0)*f+wob, y=sy0+(ey-sy0)*f;place(x,y,i===steps?'o':(Math.abs(ex-sx0)*3<Math.abs(ey-sy0)?'│':'╲'),PINK)}
    // ant stuck to the tongue tip on the way back
    if(caught&&ext>0.05)place(ex,ey+CH,'ж',FAMC[target.fam]);
    if(k>0.42&&k<0.52)place(antX+CW*2,antY-CH,'!',PINK);
  }
  // ground + ants
  const gr=ROWS-3;for(let c=0;c<COLS;c++){const k=(c*7+(running?Math.floor(t*25):0))%11;grid[gr*COLS+c]=k===0?'.':k===5?',':'_';col[gr*COLS+c]=DIRT}
  ants.forEach(a=>{const c=Math.round(a.x/CW+COLS/2);for(const cc of [c]){if(cc>=0&&cc<COLS){grid[(gr-1)*COLS+cc]='ж';col[(gr-1)*COLS+cc]=zotting?(ants.indexOf(a)%2?UGOLD:UBLUE):(wearing('gold')&&state!=='routing'&&state!=='lick')?(Math.sin(t*5+a.x*9)>0.6?'#FFF4B0':UGOLD):trailColor}}});
  // trail sign
  let text=plate;
  if(state==='routing'){const name=' '+target.name.toUpperCase()+' ';const el=t-flapStart;text=name.split('').map((ch,i)=>ch===' '?' ':el>0.35+i*0.07?ch:ALPHA[Math.floor(Math.random()*ALPHA.length)]).join('');if(el>0.35+name.length*0.07)plate=name}
  else if(state==='thinking')text=' '+'SNIFFING'.slice(0,3+Math.floor(t*6)%6)+' ';
  else if(state==='nap')text=' z z z ';
  else if(zotting)text=' ZOT ZOT ZOT ';
  else if(target){plate=' '+target.name.toUpperCase()+' ';text=plate}
  text='trail: ['+text+']';
  const sr=ROWS-1,sc=Math.round(COLS/2-text.length/2);for(let i=0;i<text.length;i++){grid[sr*COLS+sc+i]=text[i];col[sr*COLS+sc+i]=i<6?GREY:zotting?(Math.floor(t*6)%2?UGOLD:UBLUE):'#F5B82E'}
  let out='';
  for(let r=0;r<ROWS;r++){let cur,buf='';
    for(let c=0;c<COLS;c++){const i=r*COLS+c;let ch=grid[i];const k=ch===' '?null:col[i];
      if(ch==='<')ch='&lt;';else if(ch==='>')ch='&gt;';else if(ch==='&')ch='&amp;';
      if(k!==cur){if(buf)out+=cur?'<span style="color:'+cur+'">'+buf+'</span>':buf;buf='';cur=k}buf+=ch}
    if(buf)out+=cur?'<span style="color:'+cur+'">'+buf+'</span>':buf;if(r<ROWS-1)out+='\n'}
  pre.innerHTML=out;
}
let last=performance.now(), rafId=0;
    // Calm mode: once Mandu is idle or asleep with nothing in the air, the frame holds still until something happens.
    let calm=!!opts.calm;
    const settled=()=>calm&&(state==='idle'||state==='nap')&&!fx.length&&stateT>0.6;
function loop(now){const dt=Math.min(0.05,(now-last)/1000);last=now;if(!settled()){update(dt);render()}rafId=requestAnimationFrame(loop)}
function start(){if(reduce){update(0.016);render();return}if(!rafId){last=performance.now();rafId=requestAnimationFrame(loop)}}
// Stopped mid-trail (hidden, minimized, a screen opened): land right away so the next route isn't blocked and the ant still counts.
function stop(){cancelAnimationFrame(rafId);rafId=0;
  if(busy()){if(pendingEat){eat(pendingEat.fam,pendingEat.from);pendingEat=null}state='idle';stateT=0;if(opts.onLanded)opts.onLanded()}}
    function idleStatus(){setStatus(target?'hanging out at '+target.name.toLowerCase():'sniffing around')}
    function levelUp(name){levelUpAt=t;levelUpName=name;for(let i=0;i<6;i++)fx.push({kind:'star',x:-0.6+Math.random()*1.4,y:-0.2+Math.random()*0.3,vy:-0.3,life:1,c:Math.random()<0.5?UGOLD:'#F59AB0'});settle(2800)}
    function resetBelly(){belly={Claude:0,GPT:0,Gemini:0};saveBelly();still()}
    function loadBelly(){belly=readBelly();still()}
    function setCalm(v){calm=!!v;stateT=0}
    fit();start();
    return{routeTo,puzzle,queueEat,pet,zot,nap,wake,levelUp,resetBelly,loadBelly,setCalm,belly:()=>({...belly}),fit,start,stop,setStatus,idleStatus,busy,refresh:still};
  }
  A.mandu={createMandu};
})(globalThis.AntRouter = globalThis.AntRouter || {});
