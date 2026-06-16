const ALGOS = {
  FIFO(pages, nF) {
    let frames=[], queue=[], faults=0, history=[], tlbState=[];
    const TLB_SIZE=4;
    let tlbHits=0, tlbMisses=0;
    for(let p of pages){
      let inTLB = tlbState.includes(p);
      let hit = frames.includes(p), evicted=null;
      if(inTLB){ tlbHits++; }
      else { tlbMisses++; if(!hit){ faults++;
        if(frames.length>=nF){evicted=queue.shift();frames.splice(frames.indexOf(evicted),1)}
        frames.push(p);queue.push(p);
      }
        if(tlbState.length>=TLB_SIZE) tlbState.shift();
        tlbState.push(p);
      }
      history.push({page:p,frames:[...frames],fault:!hit&&!inTLB,hit:hit||inTLB,evicted,tlb:[...tlbState],tlbHit:inTLB});
    }
    return{faults,history,tlbHits,tlbMisses};
  },
  LRU(pages, nF) {
    let frames=[], order=[], faults=0, history=[], tlbState=[];
    const TLB_SIZE=4; let tlbHits=0, tlbMisses=0;
    for(let p of pages){
      let inTLB=tlbState.includes(p);
      let hit=frames.includes(p), evicted=null;
      if(inTLB){tlbHits++;}
      else{tlbMisses++;
        if(!hit){faults++;
          if(frames.length>=nF){evicted=order.shift();frames.splice(frames.indexOf(evicted),1)}
          frames.push(p);
        } else {order.splice(order.indexOf(p),1);}
        order.push(p);
        if(tlbState.length>=TLB_SIZE) tlbState.shift();
        tlbState.push(p);
      }
      history.push({page:p,frames:[...frames],fault:!hit&&!inTLB,hit:hit||inTLB,evicted,tlb:[...tlbState],tlbHit:inTLB});
    }
    return{faults,history,tlbHits,tlbMisses};
  },
  OPTIMAL(pages, nF) {
    let frames=[], faults=0, history=[], tlbState=[];
    const TLB_SIZE=4; let tlbHits=0, tlbMisses=0;
    for(let i=0;i<pages.length;i++){
      let p=pages[i],inTLB=tlbState.includes(p);
      let hit=frames.includes(p),evicted=null;
      if(inTLB){tlbHits++;}
      else{tlbMisses++;
        if(!hit){faults++;
          if(frames.length>=nF){
            let farthest=-1,victim=null;
            for(let f of frames){let nx=pages.indexOf(f,i+1);if(nx===-1){victim=f;break}if(nx>farthest){farthest=nx;victim=f}}
            evicted=victim;frames.splice(frames.indexOf(victim),1);
          }
          frames.push(p);
        }
        if(tlbState.length>=TLB_SIZE) tlbState.shift();
        tlbState.push(p);
      }
      history.push({page:p,frames:[...frames],fault:!hit&&!inTLB,hit:hit||inTLB,evicted,tlb:[...tlbState],tlbHit:inTLB});
    }
    return{faults,history,tlbHits,tlbMisses};
  },
  CLOCK(pages, nF) {
    let frames=new Array(nF).fill(null),ref=new Array(nF).fill(0),hand=0,faults=0,history=[],tlbState=[];
    const TLB_SIZE=4; let tlbHits=0, tlbMisses=0;
    for(let p of pages){
      let inTLB=tlbState.includes(p);
      let idx=frames.indexOf(p),hit=idx!==-1,evicted=null;
      if(inTLB){tlbHits++;if(hit)ref[idx]=1;}
      else{tlbMisses++;
        if(hit){ref[idx]=1;}
        else{faults++;
          while(ref[hand]===1){ref[hand]=0;hand=(hand+1)%nF}
          evicted=frames[hand];frames[hand]=p;ref[hand]=1;hand=(hand+1)%nF;
        }
        if(tlbState.length>=TLB_SIZE) tlbState.shift();
        tlbState.push(p);
      }
      history.push({page:p,frames:frames.filter(x=>x!==null),fault:!hit&&!inTLB,hit:hit||inTLB,evicted,tlb:[...tlbState],tlbHit:inTLB});
    }
    return{faults,history,tlbHits,tlbMisses};
  }
};

let pages=[], nFrames=3, algo='FIFO', result=null, step=0;

function parse(){
  pages=document.getElementById('refInput').value.split(',').map(s=>s.trim()).filter(Boolean).map(Number).filter(x=>!isNaN(x));
  nFrames=Math.max(1,Math.min(10,parseInt(document.getElementById('frameCount').value)||3));
}

function initFrames(){
  const g=document.getElementById('framesGrid'); g.innerHTML='';
  for(let i=0;i<nFrames;i++){
    const b=document.createElement('div');
    b.className='frame-box';b.id='frame'+i;
    b.innerHTML='<span class="frame-label">F'+(i+1)+'</span>—';
    g.appendChild(b);
  }
}

function updateFrames(h){
  for(let i=0;i<nFrames;i++){
    const b=document.getElementById('frame'+i);
    if(i<h.frames.length){
      b.className='frame-box '+(h.fault?'fault':'hit');
      b.innerHTML='<span class="frame-label">F'+(i+1)+'</span>'+h.frames[i];
    } else {
      b.className='frame-box';
      b.innerHTML='<span class="frame-label">F'+(i+1)+'</span>—';
    }
  }
}

function updateTLB(h, tlbHits, tlbMisses, total){
  const row=document.getElementById('tlbRow');
  row.innerHTML='';
  if(h.tlb.length===0){
    row.innerHTML='<span style="font-size:12px;color:var(--muted)">TLB is empty — run simulation</span>';
    return;
  }
  h.tlb.forEach(p=>{
    const e=document.createElement('div');
    const isCurrent = p===h.page;
    const isHit = isCurrent && h.tlbHit;
    const isMiss = isCurrent && !h.tlbHit;
    e.className='tlb-entry'+(isHit?' tlb-hit':isMiss?' tlb-miss':'');
    e.textContent='Page '+p;
    row.appendChild(e);
  });
  const hitRate=total>0?Math.round(tlbHits/total*100):0;
  document.getElementById('tlbStats').innerHTML=
    '<div class="tlb-stat-item"><div class="tlb-stat-label">TLB HITS</div><div class="tlb-stat-value" style="color:#22c55e">'+tlbHits+'</div></div>'+
    '<div class="tlb-stat-item"><div class="tlb-stat-label">TLB MISSES</div><div class="tlb-stat-value" style="color:#ef4444">'+tlbMisses+'</div></div>'+
    '<div class="tlb-stat-item"><div class="tlb-stat-label">HIT RATE</div><div class="tlb-stat-value" style="color:#a855f7">'+hitRate+'%</div></div>';
}

function buildTimeline(){
  const tbl=document.getElementById('timelineTable'); tbl.innerHTML='';
  const hr=tbl.insertRow();
  let th0=document.createElement('th');th0.textContent='';hr.appendChild(th0);
  pages.forEach(p=>{const th=document.createElement('th');th.textContent=p;hr.appendChild(th)});
  for(let row=0;row<nFrames;row++){
    const tr=tbl.insertRow();
    const td0=tr.insertCell();td0.textContent='F'+(row+1);td0.className='row-label';
    result.history.forEach(h=>{
      const td=tr.insertCell();
      td.textContent=row<h.frames.length?h.frames[row]:'';
      td.className=row<h.frames.length?(h.fault?'t-fault':'t-hit'):'t-empty';
    });
  }
  const fr=tbl.insertRow();
  const ftd=fr.insertCell();ftd.className='row-label';ftd.textContent='';
  result.history.forEach(h=>{
    const td=fr.insertCell();
    td.textContent=h.fault?'F':'';
    td.className=h.fault?'t-f-marker':'t-empty';
  });
}

function setMsg(txt, type=''){
  const m=document.getElementById('stepMsg');
  m.textContent=txt; m.className='step-msg '+(type||'');
}

function updateStats(upTo){
  const slice=result.history.slice(0,upTo);
  const faults=slice.filter(h=>h.fault).length;
  const hits=slice.length-faults;
  document.getElementById('statFaults').textContent=faults;
  document.getElementById('statHits').textContent=hits;
  document.getElementById('statRate').textContent=slice.length?Math.round(hits/slice.length*100)+'%':'—';
  document.getElementById('progressBar').style.width=Math.round(upTo/pages.length*100)+'%';
}

function runAll(){
  parse(); initFrames();
  result=ALGOS[algo](pages,nFrames);
  step=result.history.length;
  buildTimeline();
  const last=result.history[result.history.length-1];
  if(last){updateFrames(last);updateTLB(last,result.tlbHits,result.tlbMisses,pages.length);}
  updateStats(step);
  setMsg('Done — '+result.faults+' page fault(s), '+Math.round((pages.length-result.faults)/pages.length*100)+'% hit rate','');
}

function runStep(){
  if(!result||step===0){parse();initFrames();result=ALGOS[algo](pages,nFrames);step=0;}
  if(step>=result.history.length){setMsg('Simulation complete ✓');return;}
  const h=result.history[step];
  updateFrames(h);
  updateTLB(h,result.tlbHits,result.tlbMisses,step+1);
  updateStats(step+1);
  const type=h.fault?'fault':'hit';
  setMsg(
    'Page '+h.page+' → '+(h.tlbHit?'TLB HIT (ultra fast)':(h.fault?'PAGE FAULT — loaded into RAM':(h.hit?'PAGE HIT — already in RAM':'')))+
    (h.evicted?' | Evicted page: '+h.evicted:''),
    type
  );
  step++;
}

function reset(){
  parse(); initFrames(); result=null; step=0;
  document.getElementById('statFaults').textContent='—';
  document.getElementById('statHits').textContent='—';
  document.getElementById('statRate').textContent='—';
  document.getElementById('progressBar').style.width='0%';
  document.getElementById('timelineTable').innerHTML='';
  document.getElementById('compareCard').style.display='none';
  document.getElementById('tlbRow').innerHTML='<span style="font-size:12px;color:var(--muted)">TLB is empty</span>';
  document.getElementById('tlbStats').textContent='Run simulation to see TLB behaviour';
  setMsg('Press Run or Step to begin simulation','');
}

function compareAll(){
  parse();
  const names=['FIFO','LRU','OPTIMAL','CLOCK'];
  const colors=['#ef4444','#22c55e','#6366f1','#f59e0b'];
  const results=names.map(n=>({name:n,...ALGOS[n](pages,nFrames)}));
  const minFaults=Math.min(...results.map(r=>r.faults));
  const grid=document.getElementById('compareGrid'); grid.innerHTML='';
  results.forEach((r,i)=>{
    const card=document.createElement('div');
    card.className='compare-card'+(r.faults===minFaults?' best':'');
    const rate=Math.round((pages.length-r.faults)/pages.length*100);
    card.innerHTML=
      '<div class="c-algo">'+r.name+(r.faults===minFaults?' ★':'')+'</div>'+
      '<div class="c-faults" style="color:'+colors[i]+'">'+r.faults+'</div>'+
      '<div class="c-rate">'+rate+'% hit rate</div>';
    grid.appendChild(card);
  });
  document.getElementById('compareFrameLabel').textContent=nFrames+' frames, '+pages.length+' references';
  const card=document.getElementById('compareCard'); card.style.display='block';
  let beladys=false, beladyMsg='';
  for(let f=2;f<=nFrames+3;f++){
    const a=ALGOS.FIFO(pages,f-1).faults, b=ALGOS.FIFO(pages,f).faults;
    if(b>a){beladys=true;beladyMsg="<strong>Belady's Anomaly Detected!</strong> FIFO with "+f+" frames causes "+b+" page faults, but with "+(f-1)+" frames it only causes "+a+" faults. More RAM = more page faults. This is why FIFO is not a stack algorithm. LRU and Optimal never suffer from this.";break;}
  }
  const bb=document.getElementById('beladyBox');
  bb.style.display=beladys?'block':'none';
  if(beladys)bb.innerHTML=beladyMsg;
  card.scrollIntoView({behavior:'smooth',block:'nearest'});
}

document.querySelectorAll('.algo-btn').forEach(b=>{
  b.addEventListener('click',()=>{
    document.querySelectorAll('.algo-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); algo=b.dataset.algo; reset();
  });
});
document.getElementById('btnRun').addEventListener('click', runAll);
document.getElementById('btnStep').addEventListener('click', runStep);
document.getElementById('btnReset').addEventListener('click', reset);
document.getElementById('btnCompare').addEventListener('click', compareAll);
document.getElementById('frameCount').addEventListener('change', reset);
document.getElementById('refInput').addEventListener('change', reset);

parse(); initFrames();
