const $ = (s, el=document)=>el.querySelector(s);
const $$ = (s, el=document)=>[...el.querySelectorAll(s)];
const state = {
  view:'home',
  category:null,
  qIndex:0,
  currentList:[],
  answers:{},
  revealed:{},
  examNo:null,
  examMode:'end',
  reviewMode:false
};
const storage = {
  get(k,d){try{return JSON.parse(localStorage.getItem(k)) ?? d}catch{return d}},
  set(k,v){localStorage.setItem(k,JSON.stringify(v))}
};
const progress = storage.get('insurance_progress',{studied:{},mistakes:{},examResults:{}});
const settings = storage.get('insurance_settings',{theme:'light'});
document.documentElement.dataset.theme=settings.theme;
$('#themeBtn').textContent=settings.theme==='dark'?'☀':'☾';

const byId = new Map(QUESTIONS.map(q=>[q.id,q]));
const categories=[...new Set(QUESTIONS.map(q=>q.category))];
const catCounts=Object.fromEntries(categories.map(c=>[c,QUESTIONS.filter(q=>q.category===c).length]));

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function md(s=''){return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}
function optionText(o){return esc(o.text)}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function setTitle(t,back=false){$('#pageTitle').textContent=t;$('#backBtn').classList.toggle('hidden',!back)}
function updateNav(name){$$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.nav===name))}
function saveProgress(){storage.set('insurance_progress',progress)}
function studiedCount(cat){return QUESTIONS.filter(q=>q.category===cat && progress.studied[q.id]).length}

function go(view,opts={}){state.view=view;Object.assign(state,opts);window.scrollTo(0,0);render()}

function render(){
  const app=$('#app');
  if(state.view==='home') return renderHome(app);
  if(state.view==='study') return renderStudy(app);
  if(state.view==='studyQuestion') return renderQuestion(app,'study');
  if(state.view==='exam') return renderExamList(app);
  if(state.view==='examSetup') return renderExamSetup(app);
  if(state.view==='examQuestion') return renderQuestion(app,'exam');
  if(state.view==='examResult') return renderExamResult(app);
  if(state.view==='mistakes') return renderMistakes(app);
}

function renderHome(app){
  setTitle('Ôn Thi Đại Lý Bảo Hiểm');updateNav('home');
  const studied=Object.keys(progress.studied).length, mistakes=Object.keys(progress.mistakes).length;
  const best=Object.values(progress.examResults).reduce((m,r)=>Math.max(m,r.score||0),0);
  app.innerHTML=`
    <section class="hero"><div class="eyebrow" style="color:#99f6e4">CHỨNG CHỈ ĐẠI LÝ BẢO HIỂM</div><h2>Học đủ 595 câu, thi thử như thi thật.</h2><p>Ôn theo 5 nhóm kiến thức, luyện câu sai và làm 15 bộ đề 40 câu. Đạt từ <strong>30/40</strong>.</p>
      <div class="stats"><div class="stat"><b>${studied}</b><small>đã ôn</small></div><div class="stat"><b>${mistakes}</b><small>câu cần ôn lại</small></div><div class="stat"><b>${best||'—'}</b><small>điểm cao nhất</small></div></div>
    </section>
    <div class="section-title"><h2>Bắt đầu</h2><span>Dữ liệu lưu trên thiết bị</span></div>
    <div class="grid">
      <div class="card action-card" data-go="study"><div class="icon">📚</div><h3>Ôn theo nhóm</h3><p>5 nhóm kiến thức, hiện đáp án và giải thích ngay.</p></div>
      <div class="card action-card" data-go="exam"><div class="icon">📝</div><h3>Thi thử</h3><p>15 bộ đề, mỗi đề 40 câu, chọn 2 chế độ chấm.</p></div>
      <div class="card action-card" data-go="mistakes"><div class="icon">🔁</div><h3>Ôn câu sai</h3><p>Tự động gom lại những câu từng trả lời sai.</p></div>
      <div class="card action-card" id="resetProgress"><div class="icon">⚙️</div><h3>Làm mới tiến độ</h3><p>Xóa lịch sử học và kết quả trên thiết bị này.</p></div>
    </div>
    <div class="section-title"><h2>Tiến độ theo nhóm</h2><span>${studied}/${QUESTIONS.length}</span></div>
    <div class="category-list">${categories.map(c=>categoryCard(c)).join('')}</div>`;
  $$('[data-go]').forEach(x=>x.onclick=()=>go(x.dataset.go));
  $('#resetProgress').onclick=()=>{if(confirm('Xóa toàn bộ tiến độ học và kết quả thi trên thiết bị này?')){localStorage.removeItem('insurance_progress');location.reload()}};
}
function categoryCard(c){const done=studiedCount(c), total=catCounts[c],pct=Math.round(done/total*100);return `<div class="category-card" data-cat="${esc(c)}"><div><h3>${esc(c)}</h3><p>${done}/${total} câu đã ôn</p><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div><span class="badge">${pct}%</span></div>`}

function renderStudy(app){
  setTitle('Ôn thi theo nhóm',true);updateNav('study');
  app.innerHTML=`<div class="section-title"><h2>Chọn nhóm kiến thức</h2><span>5 nhóm</span></div><div class="category-list">${categories.map(c=>categoryCard(c)).join('')}</div>`;
  $$('.category-card').forEach(x=>x.onclick=()=>startStudy(x.dataset.cat));
}
function startStudy(cat){state.category=cat;state.currentList=QUESTIONS.filter(q=>q.category===cat).map(q=>q.id);state.qIndex=0;state.answers={};state.revealed={};go('studyQuestion')}

function renderQuestion(app,kind){
  const id=state.currentList[state.qIndex], q=byId.get(id); if(!q){return kind==='exam'?finishExam():go('study')}
  const total=state.currentList.length, chosen=state.answers[id], revealed=!!state.revealed[id];
  setTitle(kind==='exam'?`Đề ${String(state.examNo).padStart(2,'0')}`:state.category,true);updateNav(kind==='exam'?'exam':'study');
  const immediate = kind==='study' || state.examMode==='instant';
  app.innerHTML=`<div class="question-shell">
    <div class="question-head"><span class="question-counter">Câu ${state.qIndex+1}/${total}</span><span class="badge">${esc(q.category)}</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${((state.qIndex+1)/total*100)}%"></div></div>
    <article class="question-card"><h2>${esc(q.question)}</h2><div class="options">${q.options.map(o=>{
      let cls='option'; if(chosen===o.key)cls+=' selected'; if(revealed&&o.key===q.answer)cls+=' correct'; if(revealed&&chosen===o.key&&chosen!==q.answer)cls+=' wrong';
      return `<button class="${cls}" data-key="${o.key}" ${revealed?'disabled':''}><span class="letter">${o.key}</span><span>${optionText(o)}</span></button>`}).join('')}</div></article>
    ${revealed?feedbackHtml(q,chosen):''}
    <div class="actions">
      ${state.qIndex>0?'<button class="btn secondary" id="prevQ">← Câu trước</button>':''}
      ${immediate && chosen && !revealed?'<button class="btn primary" id="checkQ">Kiểm tra</button>':''}
      ${(!immediate || revealed)?`<button class="btn primary" id="nextQ">${state.qIndex===total-1?(kind==='exam'?'Nộp bài':'Hoàn thành'):'Câu tiếp →'}</button>`:''}
    </div>
  </div>`;
  $$('.option').forEach(b=>b.onclick=()=>{state.answers[id]=b.dataset.key;if(kind==='study'){progress.studied[id]=1;saveProgress()}render()});
  if($('#checkQ')) $('#checkQ').onclick=()=>{state.revealed[id]=true;recordMistake(q,state.answers[id]);render()};
  if($('#prevQ')) $('#prevQ').onclick=()=>{state.qIndex--;render()};
  if($('#nextQ')) $('#nextQ').onclick=()=>{
    if(!state.answers[id]) return toast('Anh chọn một đáp án trước nhé.');
    if(kind==='study' && !state.revealed[id]){state.revealed[id]=true;recordMistake(q,state.answers[id]);return render()}
    if(kind==='exam' && state.examMode==='instant' && !state.revealed[id]){state.revealed[id]=true;recordMistake(q,state.answers[id]);return render()}
    if(state.qIndex===total-1){return kind==='exam'?finishExam():go('study')}
    state.qIndex++;render();
  };
}
function feedbackHtml(q,chosen){const ok=chosen===q.answer;return `<div class="feedback ${ok?'ok':'bad'}"><h3>${ok?'✅ Chính xác':'❌ Chưa đúng'} — Đáp án ${q.answer}</h3><p>${md(q.explanation)}</p>${q.tip?`<p class="tip">${md(q.tip)}</p>`:''}</div>`}
function recordMistake(q,chosen){if(!chosen)return;if(chosen!==q.answer){progress.mistakes[q.id]=(progress.mistakes[q.id]||0)+1}else if(progress.mistakes[q.id]){progress.mistakes[q.id]=Math.max(0,progress.mistakes[q.id]-1);if(progress.mistakes[q.id]===0)delete progress.mistakes[q.id]}saveProgress()}

function renderExamList(app){
  setTitle('Thi thử 40 câu',true);updateNav('exam');
  app.innerHTML=`<div class="mode-panel"><h2>15 bộ đề</h2><p>14 đề đầu không trùng câu hỏi. Đề 15 gồm 35 câu chưa xuất hiện và 5 câu lặp để đủ 40 câu. <strong>30/40 trở lên là đạt.</strong></p></div><div class="section-title"><h2>Chọn bộ đề</h2><span>40 câu/đề</span></div><div class="exam-grid">${EXAM_SETS.map((ids,i)=>{const r=progress.examResults[i+1];return `<div class="exam-card" data-exam="${i+1}"><h3>Đề ${String(i+1).padStart(2,'0')}</h3><p>${i<14?'40 câu không trùng':'35 câu mới + 5 câu lặp'}</p><div class="result ${r?(r.score>=30?'pass':'fail'):''}">${r?`${r.score}/40 · ${r.score>=30?'ĐẠT':'CHƯA ĐẠT'}`:'Chưa làm'}</div></div>`}).join('')}</div>`;
  $$('.exam-card').forEach(x=>x.onclick=()=>go('examSetup',{examNo:+x.dataset.exam}));
}
function renderExamSetup(app){
  setTitle(`Đề ${String(state.examNo).padStart(2,'0')}`,true);updateNav('exam');
  app.innerHTML=`<section class="mode-panel"><h2>Chọn cách hiển thị đáp án</h2><p>Cả hai chế độ đều chấm kết quả cuối cùng và yêu cầu đúng ít nhất <strong>30/40</strong> để đạt.</p><div class="mode-options">
    <div class="mode-choice ${state.examMode==='instant'?'selected':''}" data-mode="instant"><b>⚡ Trả lời xong hiện kết quả</b><span>Mỗi câu sẽ báo đúng/sai, đáp án và giải thích trước khi sang câu tiếp.</span></div>
    <div class="mode-choice ${state.examMode==='end'?'selected':''}" data-mode="end"><b>🧪 Thi hết 40 câu mới xem đáp án</b><span>Giống thi thật hơn. Trong lúc làm chỉ ghi nhận lựa chọn, không báo đúng/sai.</span></div>
  </div><button class="btn primary" id="startExam" style="width:100%">Bắt đầu làm đề</button><p class="mini-note">Tiến độ của đề được lưu sau khi nộp bài.</p></section>`;
  $$('.mode-choice').forEach(x=>x.onclick=()=>{state.examMode=x.dataset.mode;render()});
  $('#startExam').onclick=()=>{state.currentList=EXAM_SETS[state.examNo-1];state.qIndex=0;state.answers={};state.revealed={};state.reviewMode=false;go('examQuestion')};
}
function finishExam(){
  const unanswered=state.currentList.filter(id=>!state.answers[id]);
  if(unanswered.length && !confirm(`Anh còn ${unanswered.length} câu chưa trả lời. Vẫn nộp bài?`)) return;
  let score=0;state.currentList.forEach(id=>{const q=byId.get(id),a=state.answers[id];if(a===q.answer)score++;else if(a)recordMistake(q,a)});
  progress.examResults[state.examNo]={score,date:new Date().toISOString(),mode:state.examMode};saveProgress();
  state.lastScore=score;go('examResult');
}
function renderExamResult(app){
  const score=state.lastScore ?? progress.examResults[state.examNo]?.score ?? 0, pass=score>=30,pct=Math.round(score/40*100);
  setTitle(`Kết quả Đề ${String(state.examNo).padStart(2,'0')}`,true);updateNav('exam');
  app.innerHTML=`<section class="result-hero"><div class="eyebrow">KẾT QUẢ</div><div class="score-circle" style="--score:${pct}"><div><b>${score}/40</b></div></div><h2 class="${pass?'pass':'fail'}">${pass?'ĐẠT ✅':'CHƯA ĐẠT ❌'}</h2><p>${pass?'Anh đã đạt ngưỡng 30 câu đúng.':'Cần đúng ít nhất 30 câu. Hãy ôn lại các câu sai rồi thử lại.'}</p><div class="actions" style="justify-content:center"><button class="btn secondary" id="retry">Làm lại đề</button><button class="btn primary" id="mistakeOnly">Ôn câu sai của đề</button></div></section>
  <div class="section-title"><h2>Xem lại đáp án</h2><span>${40-score} câu sai/chưa trả lời</span></div><div class="review-list">${state.currentList.map((id,i)=>reviewItem(byId.get(id),state.answers[id],i)).join('')}</div>`;
  $('#retry').onclick=()=>go('examSetup',{examNo:state.examNo});
  $('#mistakeOnly').onclick=()=>{const ids=state.currentList.filter(id=>state.answers[id]!==byId.get(id).answer);if(!ids.length)return toast('Không có câu sai trong đề này.');state.currentList=ids;state.qIndex=0;state.answers={};state.revealed={};state.category='Ôn lại câu sai';go('studyQuestion')};
}
function reviewItem(q,a,i){const ok=a===q.answer;const correct=q.options.find(o=>o.key===q.answer)?.text||'';return `<details class="review-item ${ok?'correct':'wrong'}"><summary>Câu ${i+1}: ${esc(q.question)}</summary><p><strong>Đáp án của anh:</strong> ${a||'Chưa trả lời'} ${ok?'✅':'❌'}</p><p><strong>Đáp án đúng:</strong> ${q.answer}. ${esc(correct)}</p><p>${md(q.explanation)}</p>${q.tip?`<p class="mini-note">${md(q.tip)}</p>`:''}</details>`}

function renderMistakes(app){
  setTitle('Ôn lại câu sai',true);updateNav('mistakes');
  const ids=Object.keys(progress.mistakes).map(Number).filter(id=>byId.has(id)).sort((a,b)=>(progress.mistakes[b]||0)-(progress.mistakes[a]||0));
  if(!ids.length){app.innerHTML='<div class="empty"><div style="font-size:42px">🎉</div><h2>Chưa có câu sai nào</h2><p>Các câu trả lời sai trong phần ôn hoặc thi thử sẽ tự động xuất hiện tại đây.</p></div>';return}
  app.innerHTML=`<section class="mode-panel"><h2>${ids.length} câu cần ôn lại</h2><p>Câu sai nhiều lần được ưu tiên trước. Khi trả lời đúng, mức ưu tiên sẽ giảm dần.</p><button class="btn primary" id="startMistakes">Bắt đầu ôn ${ids.length} câu</button></section><div class="section-title"><h2>Danh sách</h2><span>Sắp theo số lần sai</span></div><div class="review-list">${ids.slice(0,30).map(id=>{const q=byId.get(id);return `<div class="review-item wrong"><b>${progress.mistakes[id]} lần sai</b><p>${esc(q.question)}</p><small>${esc(q.category)}</small></div>`}).join('')}</div>`;
  $('#startMistakes').onclick=()=>{state.currentList=ids;state.qIndex=0;state.answers={};state.revealed={};state.category='Ôn lại câu sai';go('studyQuestion')};
}

$('#backBtn').onclick=()=>{
  if(state.view==='studyQuestion') return go('study');
  if(state.view==='examSetup'||state.view==='examResult') return go('exam');
  if(state.view==='examQuestion'){if(confirm('Thoát đề thi hiện tại? Các câu đang làm chưa được lưu.'))go('exam');return}
  go('home');
};
$('#themeBtn').onclick=()=>{settings.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=settings.theme;storage.set('insurance_settings',settings);$('#themeBtn').textContent=settings.theme==='dark'?'☀':'☾'};
$$('.bottom-nav button').forEach(b=>b.onclick=()=>go(b.dataset.nav));
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
render();
