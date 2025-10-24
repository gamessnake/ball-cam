
/* script.js
   پیاده‌سازی WebRTC P2P با signaling دستی (Base64-friendly) و sanitize SDP
   نحوه کار:
   - بازیکن A: "ساختن Offer" -> متن Base64 (یا خام) نمایش می‌یابد -> آن را کپی کند و برای بازیکن B ارسال کند.
   - بازیکن B: Offer را پیست کند -> "ساختن Answer" -> Answer را کپی و برای بازیکن A ارسال کند.
   - بازیکن A: Answer را پیست کند -> اتصال برقرار می‌شود.
*/

const pcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

let pc = null;
let dc = null;
let isInitiator = false;
let myMove = null;
let oppMove = null;

const offerArea = document.getElementById('offerArea');
const answerArea = document.getElementById('answerArea');
const connStatus = document.getElementById('connStatus');
const logArea = document.getElementById('logArea');
const resultDiv = document.getElementById('result');
const countdownDiv = document.getElementById('countdown');

function log(...args){
  const t = args.map(a => (typeof a === 'object')? JSON.stringify(a) : String(a)).join(' ');
  logArea.textContent += t + '\n';
  logArea.scrollTop = logArea.scrollHeight;
  console.log(...args);
}

function setStatus(s){
  connStatus.textContent = 'وضعیت: ' + s;
}

/* ---------- utility: base64 encode/decode safe for unicode ---------- */
function encodeSDPForTransfer(sdp){
  // return base64 encoded UTF-8
  return btoa(unescape(encodeURIComponent(sdp)));
}
function decodeSDPFromTransfer(text){
  try {
    // if looks like base64 (no spaces, valid chars) try decode
    if(/^[A-Za-z0-9+/=\r\n]+$/.test(text) && text.length % 4 === 0){
      return decodeURIComponent(escape(atob(text)));
    }
  } catch(e){}
  // fallback: return raw text
  return text;
}

/* ---------- sanitize SDP to remove unsupported lines ---------- */
function sanitizeSDP(raw){
  if(!raw) return '';
  // normalize newlines
  const lines = raw.split(/\r\n|\r|\n/);
  const keep = [];
  for(let ln of lines){
    ln = ln.trim();
    if(!ln) continue;
    // ignore prefixes like "Offer:" or "Answer:" or URLs
    if(/^offer:/i.test(ln) || /^answer:/i.test(ln)) continue;
    if(/^https?:\/\//i.test(ln)) continue;
    // remove problematic a=max-message-size lines
    if(/^a=max-message-size:/i.test(ln)) continue;
    // remove weird characters
    if(/[\u0000-\u001F&&[^\r\n\t]]/.test(ln)) continue;
    keep.push(ln);
  }
  return keep.join('\r\n');
}

/* ---------- Peer setup ---------- */
function setupPeer(asInitiator){
  pc = new RTCPeerConnection(pcConfig);
  isInitiator = !!asInitiator;

  pc.onicecandidate = e => {
    // when gathering finished (null candidate) localDescription ready
    if(e.candidate) return;
    if(pc.localDescription){
      const sdp = pc.localDescription.sdp;
      // offer/answer: present as base64 by default for safer transfer
      const encoded = encodeSDPForTransfer(sdp);
      if(isInitiator) offerArea.value = encoded;
      else answerArea.value = encoded;
      setStatus('SDP ساخته شد (Base64) — آن را کپی و برای طرف مقابل ارسال کنید');
      log('localDescription ready');
    }
  };

  pc.onconnectionstatechange = () => {
    setStatus(pc.connectionState);
    log('pc state', pc.connectionState);
  };

  pc.ondatachannel = (ev) => {
    dc = ev.channel;
    wireDataChannel();
    log('datachannel received', dc.label);
  };
}

function wireDataChannel(){
  if(!dc) return;
  dc.onopen = () => { setStatus('اتصال برقرار شد (datachannel باز)'); log('datachannel open'); };
  dc.onclose = () => { setStatus('کانال بسته شد'); log('datachannel closed'); };
  dc.onmessage = ev => {
    try {
      const msg = JSON.parse(ev.data);
      handleMessage(msg);
    } catch(e){
      log('پیام غیرقابل خواندن:', ev.data);
    }
  };
}

/* ---------- messaging ---------- */
function sendMessage(obj){
  if(dc && dc.readyState === 'open'){
    dc.send(JSON.stringify(obj));
    log('sent', obj);
  } else log('کانال باز نیست یا آماده نیست');
}

function handleMessage(msg){
  log('recv', msg);
  if(msg.type === 'move'){
    oppMove = msg.move;
    checkRound();
  } else if(msg.type === 'restart'){
    myMove = oppMove = null;
    resultDiv.textContent = 'شروع دوباره — انتخاب کنید';
  } else if(msg.type === 'countdown'){
    startLocalCountdown(msg.seconds || 3);
  }
}

/* ---------- game logic ---------- */
function decideWinner(a,b){
  if(a === b) return 'tie';
  const wins = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
  return wins[a] === b ? 'me' : 'opponent';
}

function checkRound(){
  if(!myMove || !oppMove) return;
  const who = decideWinner(myMove, oppMove);
  if(who === 'tie') resultDiv.textContent = 'مساوی — شما: ' + myMove + ' — حریف: ' + oppMove;
  else if(who === 'me') resultDiv.textContent = 'شما برنده شدید — شما: ' + myMove + ' — حریف: ' + oppMove;
  else resultDiv.textContent = 'شما باختید — شما: ' + myMove + ' — حریف: ' + oppMove;
  // ریست بعد از 2.5 ثانیه
  setTimeout(()=>{ myMove = oppMove = null; }, 2500);
}

/* ---------- UI handlers for signaling ---------- */
document.getElementById('createOffer').addEventListener('click', async () => {
  setupPeer(true);
  dc = pc.createDataChannel('rps');
  wireDataChannel();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  setStatus('در حال آماده سازی Offer ...');
  offerArea.value = 'در حال ساختن... صبر کنید تا ICE جمع شود';
});

document.getElementById('copyOffer').addEventListener('click', async () => {
  const v = offerArea.value.trim();
  if(!v) return alert('Offer ساخته نشده');
  await navigator.clipboard.writeText(v).catch(()=>{ alert('کپی در کلیپ‌بورد محدود شد'); });
  alert('Offer کپی شد (Base64 یا خام). آن را برای بازیکن B ارسال کنید.');
});

document.getElementById('pasteOffer').addEventListener('click', async () => {
  const txt = await navigator.clipboard.readText().catch(()=>null);
  if(txt) answerArea.value = txt;
  else alert('کپی از کلیپ‌بورد ممکن نشد. متن را دستی پیست کنید.');
});

document.getElementById('createAnswer').addEventListener('click', async () => {
  // Accept offer from either offerArea (raw) or answerArea (if user pasted there)
  let raw = offerArea.value.trim() || answerArea.value.trim();
  if(!raw) return alert('ابتدا Offer را پیست کنید');
  // decode if base64 or treat as raw
  let decoded = decodeSDPFromTransfer(raw);
  decoded = sanitizeSDP(decoded);
  try{
    setupPeer(false);
    // Note: need to set remote offer before createAnswer
    await pc.setRemoteDescription({ type: 'offer', sdp: decoded });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    setStatus('در حال ساخت Answer ...');
    answerArea.value = 'در حال ساختن Answer... صبر کنید';
  } catch(e){
    alert('خطا در قرار دادن Offer یا ساخت Answer: ' + e);
    log('error setRemoteDescription/createAnswer', e);
  }
});

document.getElementById('copyAnswer').addEventListener('click', async () => {
  const v = answerArea.value.trim();
  if(!v) return alert('Answer ساخته نشده یا خالی است');
  // If answerArea currently contains placeholder, try to encode localDescription
  if(v.startsWith('در حال ساختن')) {
    if(pc && pc.localDescription){
      const enc = encodeSDPForTransfer(pc.localDescription.sdp);
      answerArea.value = enc;
      await navigator.clipboard.writeText(enc).catch(()=>{});
      alert('Answer کپی شد (Base64). آن را برای بازیکن A ارسال کنید.');
      return;
    } else {
      return alert('Answer هنوز آماده نشده');
    }
  }
  await navigator.clipboard.writeText(v).catch(()=>{});
  alert('Answer کپی شد (Base64 یا خام). آن را برای بازیکن A ارسال کنید.');
});

/* ---------- Accept Answer on initiator side ---------- */
document.getElementById('answerArea').addEventListener('change', async () => {
  // user may paste answer here and then click a button; we also allow auto-apply if pc exists
});


/* manual "set answer" by pasting into answerArea and pressing Rematch? Provide separate button? 
   We'll set a small listener: double-click answerArea to apply as remote answer (for convenience).
*/
answerArea.addEventListener('dblclick', async () => {
  const raw = answerArea.value.trim();
  if(!raw) return alert('Answer خالی است');
  const decoded = sanitizeSDP( decodeSDPFromTransfer(raw) );
  try{
    await pc.setRemoteDescription({ type: 'answer', sdp: decoded });
    setStatus('Answer قرار داده شد — منتظر اتصال');
    log('remote answer set');
  } catch(e){
    alert('خطا در قرار دادن Answer: ' + e);
    log('error setRemoteDescription(answer)', e);
  }
});

/* ---------- game UI ---------- */
document.querySelectorAll('.move').forEach(b=>{
  b.addEventListener('click', ()=>{
    const mv = b.dataset.move;
    if(!dc || dc.readyState !== 'open'){
      alert('اتصال برقرار نیست؛ ابتدا Offer/Answer را کامل کنید.');
      return;
    }
    myMove = mv;
    sendMessage({ type: 'move', move: mv });
    setStatus('حرکت شما ارسال شد: ' + mv);
    resultDiv.textContent = 'صبر کنید؛ حرکت حریف...';
  });
});

document.getElementById('rematch').addEventListener('click', ()=>{
  if(dc && dc.readyState === 'open') sendMessage({ type: 'restart' });
  myMove = oppMove = null;
  resultDiv.textContent = 'شروع دوباره — انتخاب کنید';
});

/* start countdown locally (if you want to trigger from one side, you can send countdown via datachannel) */
function startLocalCountdown(seconds){
  let s = seconds || 3;
  countdownDiv.textContent = s;
  const iv = setInterval(()=>{
    s--;
    if(s <= 0){
      clearInterval(iv);
      countdownDiv.textContent = '';
      setStatus('انتخاب کنید!');
    } else {
      countdownDiv.textContent = s;
    }
  }, 1000);
}

/* convenience: help button */
document.getElementById('help').addEventListener('click', ()=>{
  alert('روند اتصال (خلاصه):\n\n1) بازیکن A: ساختن Offer -> کپی (Base64) -> ارسال به بازیکن B\n2) بازیکن B: پیست Offer -> ساختن Answer -> کپی (Base64) -> ارسال به بازیکن A\n3) بازیکن A: پیست Answer در کادر پایین و دوبار کلیک روی آن تا Answer قرار گیرد\n4) وقتی کانال باز شد، هر دو حرکت می‌کنند. \n\nنکته: میتوانی متن Offer/Answer را به صورت Base64 ارسال کنی تا هنگام انتقال دستکاری نشود. برای چسباندن سریع از گزینهٔ Paste استفاده کن.');
});

/* initial UI */
setStatus('قطع - آماده برای ساخت Offer یا پیست Offer');
log('ready');