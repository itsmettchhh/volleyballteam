const KEY="volleyPlannerV1";
const rolesShort={"Setter":"S","Outside Hitter":"OH","Middle Blocker":"MB","Opposite":"OP","Libero":"L"};

const defaultPlayers=[
  {id:"p1",name:"Cương",number:10,role:"Setter",photo:""},
  {id:"p2",name:"Nam",number:7,role:"Outside Hitter",photo:""},
  {id:"p3",name:"Hùng",number:12,role:"Middle Blocker",photo:""},
  {id:"p4",name:"Minh",number:9,role:"Opposite",photo:""},
  {id:"p5",name:"Tuấn",number:3,role:"Outside Hitter",photo:""},
  {id:"p6",name:"Long",number:15,role:"Middle Blocker",photo:""}
];

let state=load();
let rotation=0;
let autoTimer=null;

function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    if(saved && saved.players?.length) return saved;
  }catch(e){}
  return {teamName:"24H Volleyball",matchName:"Friendly Match",players:defaultPlayers};
}
function save(){
  localStorage.setItem(KEY,JSON.stringify({
    teamName:document.getElementById("teamName").value.trim()||"My Team",
    matchName:document.getElementById("matchName").value.trim()||"Match",
    players:state.players
  }));
  showToast("Đã lưu đội hình");
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function initials(name){return name.trim().split(/\s+/).slice(-2).map(x=>x[0]).join("").toUpperCase();}
function getRotatedPlayers(){
  // Positions 1..6. A clockwise rotation maps old 2->1, 3->2, 4->3, 5->4, 6->5, 1->6.
  const base=state.players.slice(0,6);
  const positions={};
  base.forEach((p,i)=>positions[i+1]=p);
  const result=[];
  for(let r=0;r<rotation;r++){
    const next={};
    next[1]=positions[2]; next[2]=positions[3]; next[3]=positions[4];
    next[4]=positions[5]; next[5]=positions[6]; next[6]=positions[1];
    Object.assign(positions,next);
  }
  return positions;
}
function token(p,pos){
  if(!p) return `<div class="empty-slot">+</div>`;
  const photo=p.photo?`<img src="${p.photo}" alt="">`:`<div class="initial">${escapeHTML(initials(p.name))}</div>`;
  return `<div class="player-token" title="${escapeHTML(p.name)}"><div>${photo}</div><span class="token-number">${p.number}</span></div>
    <div class="token-name">${escapeHTML(p.name)}</div><div class="token-role">${escapeHTML(p.role)}</div>`;
}
function renderCourt(){
  const positions=getRotatedPlayers();
  document.querySelectorAll(".position").forEach(el=>{
    const pos=Number(el.dataset.pos);
    el.innerHTML=token(positions[pos],pos);
  });
  document.getElementById("rotationNumber").textContent=rotation+1;
  document.getElementById("currentLabel").textContent="R"+(rotation+1);
  document.getElementById("courtTitle").textContent=`Rotation ${rotation+1}`;
  const notes=[
    "Đội hình xuất phát. Vị trí 1 là người phát bóng.",
    "Sau khi xoay, người ở vị trí 2 di chuyển về vị trí 1 để phát bóng.",
    "Rotation 3 — tiếp tục xoay theo chiều kim đồng hồ.",
    "Rotation 4 — đội hình đã đi qua nửa vòng.",
    "Rotation 5 — còn 2 bước để hoàn thành một vòng.",
    "Rotation 6 — chuẩn bị trở lại đội hình ban đầu."
  ];
  document.getElementById("rotationNote").innerHTML=`<span>↻</span><div><b>Rotation ${rotation+1}</b><small>${notes[rotation]}</small></div>`;
  document.querySelectorAll(".rotation-dot").forEach((d,i)=>d.classList.toggle("active",i===rotation));
  renderMap();
}
function renderDots(){
  document.getElementById("rotationDots").innerHTML=Array.from({length:6},(_,i)=>`<div class="rotation-dot ${i===rotation?"active":""}" data-r="${i}"></div>`).join("");
  document.querySelectorAll(".rotation-dot").forEach(d=>d.onclick=()=>{rotation=Number(d.dataset.r);renderCourt();});
}
function renderMap(){
  const holder=document.getElementById("rotationMap");
  holder.innerHTML="";
  const old=rotation;
  for(let r=0;r<6;r++){
    rotation=r;
    const pos=getRotatedPlayers();
    const card=document.createElement("div");
    card.className=`map-card ${r===old?"active":""}`;
    card.innerHTML=`<h3>ROTATION ${r+1}</h3>`+Array.from({length:6},(_,i)=>{
      const p=pos[i+1];
      return `<div class="map-player"><b>${i+1}</b><div class="map-mini">${p?escapeHTML(initials(p.name)):"?"}</div><span>${p?escapeHTML(p.name):"Trống"}</span></div>`;
    }).join("");
    card.onclick=()=>{rotation=r;renderCourt();renderDots();};
    holder.appendChild(card);
  }
  rotation=old;
}
function renderPlayers(){
  document.getElementById("playerCount").textContent=state.players.length;
  const list=document.getElementById("playerList");
  list.innerHTML=state.players.map(p=>{
    const av=p.photo?`<img src="${p.photo}" alt="">`:escapeHTML(initials(p.name));
    return `<div class="player-item" draggable="true" data-id="${p.id}">
      <div class="player-avatar">${av}</div>
      <div class="player-meta"><strong>${escapeHTML(p.name)}</strong><span>${escapeHTML(p.role)}</span></div>
      <div class="shirt">#${p.number}</div>
    </div>`;
  }).join("");
  document.querySelectorAll(".player-item").forEach(item=>{
    item.addEventListener("dragstart",e=>{e.dataTransfer.setData("text/player-id",item.dataset.id);item.classList.add("dragging");});
    item.addEventListener("dragend",()=>item.classList.remove("dragging"));
  });
}
function bindDropZones(){
  document.querySelectorAll(".position").forEach(zone=>{
    zone.addEventListener("dragover",e=>e.preventDefault());
    zone.addEventListener("drop",e=>{
      e.preventDefault();
      if(rotation!==0){showToast("Chỉ chỉnh đội hình xuất phát ở R1");return;}
      const id=e.dataTransfer.getData("text/player-id");
      const target=Number(zone.dataset.pos);
      const source=state.players.findIndex(p=>p.id===id);
      if(source<0 || source>=6) return;
      [state.players[source],state.players[target-1]]=[state.players[target-1],state.players[source]];
      renderPlayers();renderCourt();renderDots();
    });
  });
}
function next(){rotation=(rotation+1)%6;renderCourt();renderDots();}
function prev(){rotation=(rotation+5)%6;renderCourt();renderDots();}
function toggleAuto(){
  if(autoTimer){
    clearInterval(autoTimer);autoTimer=null;document.getElementById("autoBtn").textContent="▶";
  }else{
    document.getElementById("autoBtn").textContent="Ⅱ";
    autoTimer=setInterval(next,2200);
  }
}
function showToast(msg){
  const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1700);
}
function openModal(){document.getElementById("playerModal").classList.remove("hidden");document.getElementById("pName").focus();}
function closeModal(){document.getElementById("playerModal").classList.add("hidden");document.getElementById("playerForm").reset();}
document.getElementById("teamName").value=state.teamName;
document.getElementById("matchName").value=state.matchName;
document.getElementById("teamName").addEventListener("input",e=>state.teamName=e.target.value);
document.getElementById("matchName").addEventListener("input",e=>state.matchName=e.target.value);
document.getElementById("saveBtn").onclick=save;
document.getElementById("nextBtn").onclick=next;
document.getElementById("prevBtn").onclick=prev;
document.getElementById("autoBtn").onclick=toggleAuto;
document.getElementById("resetBtn").onclick=()=>{
  if(confirm("Đặt lại đội hình mẫu?")){state={teamName:"24H Volleyball",matchName:"Friendly Match",players:structuredClone(defaultPlayers)};rotation=0;document.getElementById("teamName").value=state.teamName;document.getElementById("matchName").value=state.matchName;renderAll();save();}
};
document.getElementById("addBtn").onclick=openModal;
document.getElementById("closeModal").onclick=closeModal;
document.getElementById("playerModal").addEventListener("click",e=>{if(e.target.id==="playerModal")closeModal();});
document.getElementById("playerForm").addEventListener("submit",e=>{
  e.preventDefault();
  const file=document.getElementById("pPhoto").files[0];
  const finish=(photo="")=>{
    state.players.push({id:"p"+Date.now(),name:document.getElementById("pName").value.trim(),number:Number(document.getElementById("pNumber").value),role:document.getElementById("pRole").value,photo});
    renderAll();closeModal();showToast("Đã thêm cầu thủ");
  };
  if(file){
    const reader=new FileReader();reader.onload=()=>finish(reader.result);reader.readAsDataURL(file);
  }else finish();
});
document.getElementById("fullscreenBtn").onclick=()=>{
  document.body.classList.toggle("presentation");
  document.getElementById("fullscreenBtn").textContent=document.body.classList.contains("presentation")?"× Thoát trình chiếu":"⛶ Trình chiếu";
};
function renderAll(){renderPlayers();renderDots();renderCourt();bindDropZones();}
renderAll();
