
const pcConfig = { iceServers: [ { urls: "stun:stun.l.google.com:19302" } ] };

let pc = null;
let dc = null;
let isInitiator = false;
let myMove = null;
let oppMove = null;

const offerArea = document.getElementById('offerArea');
const answerArea = document.getElementById('answerArea');
const connStatus = document.getElementById('connStatus');
const logArea = document.getElementById('logArea');
const resultText = document.getElementById('resultText');

function log(...args){
  const t = args.map(a => (typeof a === 'object')? JSON.stringify(a) : String(a)).join(' ');
  logArea.textContent += t + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

function setStatus(s){ connStatus.textContent = 'وضعیت: ' + s; }

function setupPeer(asInitiator){
  pc = new RTCPeerConnection(pcConfig);
  isInitiator = !!asInitiator;

  pc.onicecandidate = e => {
    if(e.candidate) return;
    if(pc.localDescription){
      if(isInitiator){
        offerArea.value = pc.localDescription.sdp;
      } else {
        answerArea.value = pc.localDescription.sdp;
      }
    }
  };

  pc.onconnectionstatechange = () => {
    setStatus(pc.connectionState);
    log('pc state:', pc.connectionState);
  };

  pc.ondatachannel = (ev) => {
    dc = ev.channel;
    wireDataChannel();
    log('received datachannel', dc.label);
  };
}

function wireDataChannel(){
  if(!dc) return;
  dc.onopen = () => { setStatus('متصل شد'); log('datachannel open'); };
  dc.onclose = () => { setStatus('قطع شد'); log('datachannel closed'); };
  dc.onmessage = ev => {
    try{ handleMessage(JSON.parse(ev.data)); }
    catch(e){ log('پیام نامعتبر', ev.data); }
  };
}

function sendMessage(obj){
  if(dc && dc.readyState === 'open'){ dc.send(JSON.stringify(obj)); log('ارسال شد', obj); }
  else log('کانال باز نیست');
}

function handleMessage(msg){
  log('دریافت', msg);
  if(msg.type === 'move'){ oppMove = msg.move; checkRound(); }
  else if(msg.type === 'restart'){ myMove = oppMove = null; resultText.textContent = 'شروع دوباره — انتخاب کنید'; }
}

function decideWinner(a,b){
  if(a===b) return 'tie';
  const wins = { rock:'scissors', scissors:'paper', paper:'rock' };
  return wins[a]===b?'me':'opponent';
}

function checkRound(){
  if(!myMove || !oppMove) return;
  const who = decideWinner(myMove, oppMove);
  if(who==='tie') resultText.textContent = 'مساوی — شما: ' + myMove + ' — حریف: ' + oppMove;
  else if(who==='me') resultText.textContent = 'شما برنده شدید — شما: ' + myMove + ' — حریف: ' + oppMove;
  else resultText.textContent = 'شما باختید — شما: ' + myMove + ' — حریف: ' + oppMove;
  setTimeout(()=>{ myMove=oppMove=null; }, 2500);
}

/* UI handlers */
document.getElementById('createOffer').addEventListener('click', async () => {
  setupPeer(true);
  dc = pc.createDataChannel('rps');
  wireDataChannel();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  setStatus('در حال آماده سازی Offer...');
  offerArea.value = 'در حال ساختن... صبر کنید تا ICE جمع شود';
});

document.getElementById('copyOffer').addEventListener('click', async () => {
  if(!offerArea.value) return alert('Offer ساخته نشده');
  await navigator.clipboard.writeText(offerArea.value);
  alert('Offer کپی شد');
});

document.getElementById('pasteOffer').addEventListener('click', async () => {
  const text = await navigator.clipboard.readText().catch(()=>null);
  if(text) answerArea.value = text;
  else alert('clipboard خالی یا دسترسی رد شد');
});

document.getElementById('setRemoteAnswer').addEventListener('click', async () => {
  const sdp = answerArea.value.trim();
  if(!sdp) return alert('Answer را در کادر پیست کنید');
  try{ await pc.setRemoteDescription({ type:'answer', sdp }); setStatus('متصل شد'); log('remote answer set'); }
  catch(e){ alert('خطا در قرار دادن Answer: '+e); }
});

document.getElementById('createAnswer').addEventListener('click', async () => {


const offerSDP = offerArea.value.trim() || answerArea.value.trim();
  if(!offerSDP) return alert('Offer را وارد یا پیست کنید');
  setupPeer(false);
  try{
    await pc.setRemoteDescription({ type:'offer', sdp: offerSDP });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    setStatus('در حال آماده سازی Answer...');
    answerArea.value = 'در حال ساختن Answer... صبر کنید';
  }catch(e){ alert('خطا در ساخت Answer: '+e); }
});

document.getElementById('copyAnswer').addEventListener('click', async () => {
  if(!answerArea.value) return alert('Answer ساخته نشده');
  await navigator.clipboard.writeText(answerArea.value);
  alert('Answer کپی شد');
});

document.querySelectorAll('.move-btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    const mv = b.dataset.move;
    if(!dc || dc.readyState!=='open') { alert('اتصال برقرار نشده'); return; }
    myMove = mv;
    sendMessage({ type:'move', move:mv });
    resultText.textContent='صبر کنید؛ حرکت حریف...';
    checkRound();
  });
});

document.getElementById('rematch').addEventListener('click', ()=>{
  if(dc && dc.readyState==='open') sendMessage({ type: 'restart' });
  myMove = oppMove = null;
  resultText.textContent = 'شروع دوباره — انتخاب کنید';
});