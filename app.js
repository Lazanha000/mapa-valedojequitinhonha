const API='https://servicodados.ibge.gov.br/api/';
const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
/* ===== v5: paletas, escalas e cores personalizadas ===== */
const PALS={
  terra:{n:'Terra (padrão)',c:['#e9b872','#9cc5a1','#d98f8f','#8fb3d9','#c7a6d8','#e5d36b','#b5c7a1','#e0a58a']},
  vivas:{n:'Vivas',c:['#f6b73c','#3fae6a','#e4572e','#2e86de','#9b59b6','#17bebb','#ff6f91','#8bc34a']},
  pastel:{n:'Pastel',c:['#fbd5a5','#bfe3c6','#f4b8c1','#b8d4f1','#dcc6ee','#fff0a8','#c9e4de','#f2c9a6']},
  dalt:{n:'Para daltônicos',c:['#E69F00','#56B4E9','#009E73','#F0E442','#0072B2','#D55E00','#CC79A7','#999999']},
  forte:{n:'Alto contraste',c:['#ffd400','#00a651','#e60000','#0066ff','#a100ff','#00c2c7','#ff7a00','#5c5c5c']},
  verdes:{n:'Tons de verde',c:['#e5f5e0','#a1d99b','#74c476','#31a354','#006d2c','#c7e9c0','#41ab5d','#00441b']},
  azuis:{n:'Tons de azul',c:['#deebf7','#9ecae1','#6baed6','#3182bd','#08519c','#c6dbef','#4292c6','#08306b']},
  quentes:{n:'Tons quentes',c:['#fff0a8','#fdc66b','#f98e52','#e0522f','#a3261b','#fcd9b6','#f4a582','#c2593e']},
  cinza:{n:'Cinza (para imprimir)',c:['#f0f0f0','#d0d0d0','#b0b0b0','#8f8f8f','#6f6f6f','#e2e2e2','#c1c1c1','#9e9e9e']},
  custom:{n:'Personalizada',c:[]}
};
const RAMPS={
  laranja:{n:'Laranja (padrão)',s:['#fde8c8','#8a3b12']},
  azul:{n:'Azul',s:['#e3f0fb','#08306b']},
  verde:{n:'Verde',s:['#e5f5e0','#00441b']},
  roxo:{n:'Roxo',s:['#efedf5','#3f007d']},
  vermelho:{n:'Vermelho',s:['#fee5d9','#99000d']},
  cinza:{n:'Cinza',s:['#f2f2f2','#1a1a1a']},
  viridis:{n:'Viridis (daltônicos)',s:['#fde725','#5ec962','#21918c','#3b528b','#440154']},
  arco:{n:'Azul ao vermelho',s:['#2b83ba','#abdda4','#ffffbf','#fdae61','#d7191c']},
  custom:{n:'Personalizada',s:[]}
};
const C0=()=>({pal:'terra',cm:{},ramp:'laranja',inv:false,r0:'#fde8c8',r1:'#8a3b12',mun:{},names:'a'});
let C=C0();
const HX=/^#[0-9a-f]{6}$/i,hx=(c,d)=>HX.test(c)?c:d;
(function(){try{const s=JSON.parse(localStorage.getItem('jq_cores5')||'null');
  if(s&&typeof s==='object'){C=C0();['pal','cm','ramp','inv','r0','r1','mun','names'].forEach(k=>{if(k in s)C[k]=s[k]});
    if(!hasOwn(PALS,C.pal))C.pal='terra';if(!hasOwn(RAMPS,C.ramp))C.ramp='laranja';
    if(!C.cm||typeof C.cm!=='object')C.cm={};if(!C.mun||typeof C.mun!=='object')C.mun={};
    C.inv=!!C.inv;if(C.names!=='t')C.names='a'}}catch(e){}})();
const saveC=()=>{try{localStorage.setItem('jq_cores5',JSON.stringify(C))}catch(e){}};
const h2r=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),r2h=a=>'#'+a.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('');
function microColor(i){if(C.pal==='custom')return hx(C.cm[micros[i]],PALS.terra.c[i%8]);const L=PALS[C.pal].c;return L[i%L.length]}
const rampStops=()=>C.ramp==='custom'?[hx(C.r0,'#fde8c8'),hx(C.r1,'#8a3b12')]:RAMPS[C.ramp].s;
function rampAt(t){const st=rampStops();if(C.inv)t=1-t;const n=st.length-1,x=Math.min(n,Math.max(0,t*n)),i=Math.min(n-1,Math.floor(x)),u=x-i,a=h2r(st[i]),b=h2r(st[i+1]);return r2h(a.map((v,k)=>v+(b[k]-v)*u))}
const rampCss=()=>'linear-gradient(90deg,'+[0,.2,.4,.6,.8,1].map(rampAt).join(',')+')';

const $=s=>document.querySelector(s),svg=$('#map'),fmt=n=>n.toLocaleString('pt-BR',{maximumFractionDigits:0});
let F=[],micros=[],bb,W=1,H=1,st={cx:0,cy:0,upp:1},fit=1,sel=null,colored=true,focus=null,showLab=false;

let diag=[];
function showErr(m){if(/ResizeObserver/.test(m))return;const b=$('#err');b.style.display='block';b.textContent='Erro: '+m}
window.addEventListener('error',e=>showErr((e.message||'erro')+' ('+String(e.filename||'').split('/').pop()+':'+e.lineno+')'));
window.addEventListener('unhandledrejection',e=>showErr('promessa rejeitada: '+((e.reason&&e.reason.message)||e.reason)));
function dbg(){if(!/[?&]debug/.test(location.search))return;const b=$('#err');b.style.display='block';
  b.textContent='DEBUG '+navigator.userAgent+' | svg '+Math.round(W)+'x'+Math.round(H)+' | viewBox '+svg.getAttribute('viewBox')+' | municípios '+F.length+' | stage '+$('#stage').clientWidth+'x'+$('#stage').clientHeight}
async function j(u,ms=45000){let r;const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);
  try{r=await fetch(u,{signal:ac.signal,credentials:'omit',referrerPolicy:'no-referrer'})}catch(e){clearTimeout(t);diag.push('Falhou (rede, tempo esgotado ou bloqueio): '+u);throw e}
  clearTimeout(t);
  if(!r.ok){diag.push('Erro '+r.status+': '+u);throw new Error('HTTP '+r.status)}diag.push('OK: '+u);return r.json()}
/* Começa a baixar indicadores.json já na abertura, em paralelo com a malha (antes só começava depois do mapa pronto). */
const INDFILE=fetch('indicadores.json',{credentials:'omit'}).then(r=>r.ok?r.json():null).catch(()=>null);
const cod=f=>String((f.properties&&(f.properties.codarea??f.properties.id??f.properties.codigo))??'');
async function first(urls,ids){for(const u of urls){try{const g=await j(u);const ft=(g.features||[]).filter(f=>ids.has(cod(f)));if(ft.length)return[ft,u]}catch(e){}}
  throw new Error('Nenhum endereço de malha do IBGE respondeu corretamente')}
const Q='intrarregiao=municipio&formato=application/vnd.geo+json';
async function load(){
  try{const d=await j('dados.json');if(d.features&&d.features.length)return d}catch(e){}
  try{const[g,m]=await Promise.all([j('malha.json'),j('municipios.json')]);return{muns:m,features:g.features,fonte:'arquivos locais'}}catch(e){}
  try{const c=localStorage.getItem('jq_v2');if(c){const d=JSON.parse(c);validar(d);return d}}catch(e){}
  diag=[];
  const m=(await j(API+'v1/localidades/estados/31/mesorregioes')).find(x=>x.nome.toLowerCase()==='jequitinhonha');
  if(!m)throw new Error('Mesorregião Jequitinhonha não encontrada na API');
  const muns=await j(API+`v1/localidades/mesorregioes/${m.id}/municipios`);
  const ids=new Set(muns.map(x=>String(x.id)));
  const[features,u]=await first([API+`v3/malhas/mesorregioes/${m.id}?${Q}&qualidade=maxima`,API+`v4/malhas/estados/31?${Q}&qualidade=maxima`,API+`v3/malhas/mesorregioes/${m.id}?${Q}&qualidade=4`,API+`v3/malhas/estados/31?${Q}&qualidade=4`,API+`v3/malhas/estados/31?${Q}`],ids);
  const d={muns,features,fonte:u};
  try{const t=JSON.stringify(d);if(t.length<4e6)localStorage.setItem('jq_v2',t)}catch(e){}
  return d;
}
function ringArea(r){let la=0;r.forEach(p=>la+=p[1]);la/=r.length;const kx=111.32*Math.cos(la*Math.PI/180),ky=110.95;let a=0;
  for(let i=0;i<r.length;i++){const p=r[i],q=r[(i+1)%r.length];a+=((p[0]-r[0][0])*kx)*((q[1]-r[0][1])*ky)-((q[0]-r[0][0])*kx)*((p[1]-r[0][1])*ky)}return a/2}
function centroid(p){let A=0,cx=0,cy=0;const[ox,oy]=p[0];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],x1=a[0]-ox,y1=a[1]-oy,x2=b[0]-ox,y2=b[1]-oy,c=x1*y2-x2*y1;A+=c;cx+=(x1+x2)*c;cy+=(y1+y2)*c}A/=2;return A?[ox+cx/(6*A),oy+cy/(6*A)]:[ox,oy]}

function build(d){
  d=validar(d);const HS=readHash();if(HS.pal)C.pal=HS.pal;if(HS.rp)C.ramp=HS.rp;if(HS.iv)C.inv=true;
  const info={};d.muns.forEach(m=>info[m.id]={id:String(m.id),nome:m.nome,micro:m.microrregiao.nome});
  micros=[...new Set(d.muns.map(m=>m.microrregiao.nome))].sort();
  const k=Math.cos(-17.5*Math.PI/180),S=1000,P=p=>[p[0]*k*S,-p[1]*S];
  let X0=1e9,X1=-1e9,Y0=1e9,Y1=-1e9;
  F=d.features.map(f=>{const i=info[cod(f)];if(!i)return null;
    const g=f.geometry;if(!g||!Array.isArray(g.coordinates))return null;
    const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:null;if(!polys)return null;
    let area=0,best=-1,bp=null,cen=[0,0],x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;const rings=[];
    polys.forEach(pl=>Array.isArray(pl)&&pl.forEach((r,ri)=>{if(!Array.isArray(r)||r.length<4)return;
      const n=r.length,a=new Float64Array(n*2);let ok=true;
      for(let q=0;q<n;q++){const c=r[q],lo=+c[0],la=+c[1];if(!isFinite(lo)||!isFinite(la)){ok=false;break}a[2*q]=lo*k*S;a[2*q+1]=-la*S}
      if(!ok)return;
      const ar=Math.abs(ringArea(r));area+=ri?-ar:ar;
      for(let q=0;q<n;q++){const x=a[2*q],y=a[2*q+1];if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
      if(!ri&&ar>best){best=ar;const pts=new Array(n);for(let q=0;q<n;q++)pts[q]=[a[2*q],a[2*q+1]];cen=centroid(pts);bp=pts}
      rings.push(a)}));
    if(!rings.length)return null;
    X0=Math.min(X0,x0);X1=Math.max(X1,x1);Y0=Math.min(Y0,y0);Y1=Math.max(Y1,y1);
    return{...i,rings,lod:new Map(),curL:-1,vis:true,raw:null,area,cen,pin:pole(bp,cen),bb:[x0,y0,x1,y1]}}).filter(Boolean);
  if(!F.length)throw new Error('Nenhum município carregado');
  bb={w:X1-X0,h:Y1-Y0,cx:(X0+X1)/2,cy:(Y0+Y1)/2};
  $('#o').innerHTML=F.map(()=>`<path/>`).join('');
  $('#m').innerHTML=F.map((f,i)=>`<path class="m" data-i="${i}" tabindex="0" role="button" aria-label="${f.nome}, microrregião de ${f.micro}"/>`).join('');
  $('#l').innerHTML=F.map(f=>`<text x="${f.pin[0].toFixed(1)}" y="${f.pin[1].toFixed(1)}" dy=".35em" style="display:none">${esc(f.nome)}</text>`).join('');
  [...document.querySelectorAll('#m path')].forEach((p,i)=>F[i].el=p);[...document.querySelectorAll('#o path')].forEach((p,i)=>F[i].oel=p);[...document.querySelectorAll('#l text')].forEach((t,i)=>F[i].tx=t);
  const tot=F.reduce((s,f)=>s+f.area,0);
  $('#sub').textContent=`${F.length} municípios · ${micros.length} microrregiões · ≈ ${fmt(tot)} km²`+(F.length!==51?' (esperado: 51)':'')+(d.fonte?' · fonte: '+d.fonte.replace(API,'').split('?')[0]:'');
  $('#leg').innerHTML=legMicro();
  sty();paint();renderList();fitAll();$('#msg').style.display='none';requestAnimationFrame(()=>{size();fitAll();dbg()});INDP=loadInd().then(()=>{statsC.clear();
    addModes();
    const has=k=>!!(IND&&IND[k]&&Object.keys(IND[k]).length),ok={p:has('pop'),d:has('den'),b:has('pib'),c:has('pib_per_capita'),a:has('analfabetismo_15mais'),s:has('san_esgoto_adequado')};
    Object.entries(ok).forEach(([k,v])=>{const o=$('#bMod option[value='+k+']');if(o)o.disabled=!v});
    [['p',ok.p],['dn',ok.d],['pc',ok.c],['ia',ok.a]].forEach(([k,v])=>{const o=$('#ord option[value='+k+']');if(o)o.disabled=!v});
    $('#ord').title=ok.p?'':'Ordenar por indicadores indisponível: os dados do IBGE não carregaram (gere o indicadores.json ou verifique a internet).';
    if(ORDS[$('#ord').value])renderList();
    if(HS.m&&HS.m!=='m'&&(ok[HS.m]||(/^i_/.test(HS.m)&&MODES[HS.m]))){if(HS.y)YR=HS.y;$('#bMod').value=HS.m;setMode(HS.m)}});
  const hf=HS.c&&F.find(x=>x.id===HS.c);if(hf)pick(hf,true);
  $('#fm').innerHTML='<option value="">Todas as microrregiões</option>'+micros.map(m=>`<option value="${m}">${m}</option>`).join('');
}
/* Traços: largura em pixels de tela = largura × unidades-por-pixel (sem vector-effect, que é lento em contornos grandes). */
function sty(){const u=st.upp;$('#sty').textContent=`path{stroke-linejoin:round}#o path{fill:#222;stroke:#222;stroke-width:${3.2*u}px}.m{stroke:#3a3631;stroke-width:${.7*u}px;cursor:pointer}.m.sel{stroke:#b00020;stroke-width:${2.4*u}px}.m:focus-visible{stroke:#0057d8;stroke-width:${3.5*u}px}`}
/* Estilo da exportação (SVG/PNG): traço de largura fixa na imagem. */
const styExp=s=>`path{vector-effect:non-scaling-stroke;stroke-linejoin:round}#o path{fill:#222;stroke:#222;stroke-width:${3.2*s}px}.m{stroke:#3a3631;stroke-width:${.7*s}px}.m.sel{stroke:#b00020;stroke-width:${2.4*s}px}`;
/* ===== v6: geometria por nível de zoom (LOD) =====
   Cada contorno é simplificado (Douglas-Peucker) com tolerância de no máximo 0,4 pixel de tela no zoom atual,
   então a imagem na tela é indistinguível da malha completa; só desenha o que está na tela; e guarda o resultado.
   A exportação SVG/PNG sempre usa a malha completa. */
const LMAX=9;
function simp(a,tol){
  const n=a.length/2;if(n<8||!(tol>0))return a;
  const keep=new Uint8Array(n);keep[0]=keep[n-1]=1;
  let m=0,md=-1;for(let i=1;i<n-1;i++){const dx=a[2*i]-a[0],dy=a[2*i+1]-a[1],d=dx*dx+dy*dy;if(d>md){md=d;m=i}}
  keep[m]=1;const t2=tol*tol,stk=[0,m,m,n-1];
  while(stk.length){const e=stk.pop(),b=stk.pop();if(e-b<2)continue;
    const ax=a[2*b],ay=a[2*b+1],dx=a[2*e]-ax,dy=a[2*e+1]-ay,l2=dx*dx+dy*dy;let mx=-1,mi=-1;
    for(let i=b+1;i<e;i++){const px=a[2*i]-ax,py=a[2*i+1]-ay;let d;
      if(l2===0)d=px*px+py*py;else{let t=(px*dx+py*dy)/l2;t=t<0?0:t>1?1:t;const ex=px-t*dx,ey=py-t*dy;d=ex*ex+ey*ey}
      if(d>mx){mx=d;mi=i}}
    if(mx>t2){keep[mi]=1;stk.push(b,mi,mi,e)}}
  let c=0;for(let i=0;i<n;i++)c+=keep[i];
  if(c<4)return null;
  const o=new Float64Array(c*2);let j=0;for(let i=0;i<n;i++)if(keep[i]){o[j++]=a[2*i];o[j++]=a[2*i+1]}
  return o}
function pathOf(a,dec){const n=a.length,p=[];for(let i=0;i<n;i+=2)p.push((i?'L':'M')+a[i].toFixed(dec)+' '+a[i+1].toFixed(dec));return p.join('')+'Z'}
function lodD(f,L){let r=f.lod.get(L);if(r!==undefined)return r;
  const tol=L>=LMAX?0:.4*fit/Math.pow(2,L);r='';
  for(const a of f.rings){const b=tol?simp(a,tol):a;if(b)r+=pathOf(b,3)}
  if(!r)for(const a of f.rings)r+=pathOf(a,3);
  f.lod.set(L,r);return r}
const rawD=f=>f.raw||(f.raw=f.rings.map(a=>pathOf(a,2)).join(''));
function geo(x0,y0,w,h){
  if(!F.length)return;
  const L=Math.max(0,Math.min(LMAX,Math.ceil(Math.log2(fit/st.upp)-1e-9))),mg=Math.max(w,h)*.05+4*st.upp,
    A=x0-mg,B=x0+w+mg,Cc=y0-mg,D=y0+h+mg;
  for(const f of F){
    const v=f===sel||(f.bb[0]<B&&f.bb[2]>A&&f.bb[1]<D&&f.bb[3]>Cc);
    if(v!==f.vis){f.vis=v;const ds=v?'':'none';f.el.style.display=ds;f.oel.style.display=ds}
    if(v&&f.curL!==L){const d=lodD(f,L);f.el.setAttribute('d',d);f.oel.setAttribute('d',d);f.curL=L}}}
/* Dados vindos de fora (API, arquivos, cache): só aceita o formato esperado e remove caracteres que poderiam virar HTML. */
const limpa=s=>String(s==null?'':s).replace(/[<>"&\u0000-\u001f]/g,'').slice(0,120);
function validar(d){
  if(!d||!Array.isArray(d.muns)||!Array.isArray(d.features))throw new Error('Dados do mapa em formato inesperado');
  const muns=d.muns.filter(m=>m&&/^\d{6,8}$/.test(String(m.id))&&m.microrregiao&&m.microrregiao.nome).map(m=>({id:String(m.id),nome:limpa(m.nome),microrregiao:{nome:limpa(m.microrregiao.nome)}}));
  if(!muns.length)throw new Error('Lista de municípios vazia ou inválida');
  return{muns,features:d.features,fonte:limpa(d.fonte||'')}}
/* ===== v5: nomes no mapa (ponto dentro do município, sem sobreposição) ===== */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* Ponto mais "para dentro" do maior contorno (centro do maior círculo inscrito, aproximado).
   O centroide comum pode cair FORA de municípios de formato torto; este não cai. */
function pole(pts,cen){
  if(!pts||pts.length<4)return cen;
  const step=Math.max(1,Math.ceil(pts.length/260)),q=[];for(let i=0;i<pts.length;i+=step)q.push(pts[i]);
  let x0=1e18,x1=-1e18,y0=1e18,y1=-1e18;q.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])});
  const inside=(x,y)=>{let c=false;for(let i=0,j=q.length-1;i<q.length;j=i++){const a=q[i],b=q[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
  const dist=(x,y)=>{let m=1e30;for(let i=0,j=q.length-1;i<q.length;j=i++){const a=q[j],b=q[i],dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy;let t=l?((x-a[0])*dx+(y-a[1])*dy)/l:0;t=Math.max(0,Math.min(1,t));const ex=a[0]+t*dx-x,ey=a[1]+t*dy-y,d=ex*ex+ey*ey;if(d<m)m=d}return Math.sqrt(m)};
  let best=null,bd=-1;
  const scan=(ax,ay,bx,by,n)=>{for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*j/n;if(!inside(x,y))continue;const d=dist(x,y);if(d>bd){bd=d;best=[x,y]}}};
  scan(x0,y0,x1,y1,16);
  if(best){const w=(x1-x0)/16,h=(y1-y0)/16,bx=best[0],by=best[1];scan(bx-w,by-h,bx+w,by+h,8)}
  return best||cen}
/* Decide quais nomes aparecem: os maiores municípios primeiro; um nome só entra se couber
   (não ficar bem mais largo que o município) e não encostar em outro nome já colocado. */
function layoutLabels(cx,cy,upp,W,H,fs,all,obs=[]){
  const out=[],placed=[],pad=3,order=[...F].sort((a,b)=>(b===sel)-(a===sel)||b.area-a.area);
  for(const f of order){
    const sx=(f.pin[0]-cx)/upp+W/2,sy=(f.pin[1]-cy)/upp+H/2,w=f.nome.length*fs*.58+6,h=fs*1.3,r=[sx-w/2,sy-h/2,sx+w/2,sy+h/2];
    if(r[0]<0||r[2]>W||r[1]<0||r[3]>H)continue;
    if(!all&&f!==sel){
      const pw=(f.bb[2]-f.bb[0])/upp;
      if(w>pw*1.6+10)continue;
      if(obs.some(p=>r[0]<p[2]&&r[2]>p[0]&&r[1]<p[3]&&r[3]>p[1]))continue;
      if(placed.some(p=>r[0]<p[2]+pad&&r[2]>p[0]-pad&&r[1]<p[3]+pad&&r[3]>p[1]-pad))continue}
    placed.push(r);out.push(f)}
  return out}
/* áreas da tela cobertas por legenda, botões de zoom e painéis: nomes não entram aí */
function obstacles(){const r0=svg.getBoundingClientRect(),o=[];
  ['#leg','#ctl','#mini','#openSide','#cp'].forEach(q=>{const e=$(q);if(!e||e.hidden)return;const r=e.getBoundingClientRect();if(r.width&&r.height)o.push([r.left-r0.left-4,r.top-r0.top-4,r.right-r0.left+4,r.bottom-r0.top+4])});return o}
function applyLabels(){
  if(!F.length||!F[0].tx)return;
  const g=$('#l'),h=$('#nhint');
  if(!showLab){g.style.display='none';h.hidden=true;return}
  g.style.display='';
  const fs=window.matchMedia&&matchMedia('(pointer:coarse)').matches?13:12,all=C.names==='t',vis=new Set(layoutLabels(st.cx,st.cy,st.upp,W,H,fs,all,all?[]:obstacles()));
  g.setAttribute('font-size',fs*st.upp);g.setAttribute('stroke-width',fs*.3*st.upp);g.setAttribute('stroke-linejoin','round');
  F.forEach(f=>{const t=f.tx,on=vis.has(f);t.style.display=on?'':'none';
    if(on){t.setAttribute('font-weight',f===sel?'800':'600');t.setAttribute('fill',f===sel?'#7a0014':'#222')}});
  const inView=F.filter(f=>{const x=(f.pin[0]-st.cx)/st.upp+W/2,y=(f.pin[1]-st.cy)/st.upp+H/2;return x>=0&&x<=W&&y>=0&&y<=H}).length;
  h.hidden=all||vis.size>=inView;
  h.textContent=`Mostrando ${vis.size} de ${inView} nomes na tela. Aproxime o mapa para ver os demais, ou escolha “Todos os nomes” em Personalizar cores.`}
function fillExportLabels(l,cx,cy,upp,Wp,Hp,s){
  const fs=12*s,vis=layoutLabels(cx,cy,upp,Wp,Hp,fs,C.names==='t');
  l.setAttribute('font-size',fs*upp);l.setAttribute('stroke-width',fs*.3*upp);l.setAttribute('stroke-linejoin','round');
  l.innerHTML=vis.map(f=>`<text x="${f.pin[0].toFixed(1)}" y="${f.pin[1].toFixed(1)}" dy=".35em"${f===sel?' font-weight="800" fill="#7a0014"':''}>${esc(f.nome)}</text>`).join('')}

/* Redesenho no máximo uma vez por quadro; nomes são reposicionados só quando o gesto para (evita travar ao arrastar/zoom). */
let raf=0,labT=0,lastU=0;
function view(){if(!raf)raf=requestAnimationFrame(viewNow)}
function viewNow(){raf=0;if(!bb)return;const w=st.upp*W,h=st.upp*H,x0=st.cx-w/2,y0=st.cy-h/2;
  svg.setAttribute('viewBox',`${x0} ${y0} ${w} ${h}`);
  if(!lastU||Math.abs(st.upp/lastU-1)>.004){lastU=st.upp;sty()}
  geo(x0,y0,w,h);clearTimeout(labT);labT=setTimeout(applyLabels,110)}
function size(){const r=svg.getBoundingClientRect(),s=$('#stage');W=r.width||s.clientWidth||1;H=r.height||s.clientHeight||1}
function fitAll(){size();const nf=Math.max(bb.w/W,bb.h/H)*1.08;if(!fit||Math.abs(nf/fit-1)>.02)F.forEach(f=>{f.lod.clear();f.curL=-1});fit=nf;st={cx:bb.cx,cy:bb.cy,upp:fit};lastU=0;view()}
function zoomAt(f,px,py){const u=Math.min(fit*1.6,Math.max(fit/300,st.upp/f));
  const wx=st.cx+(px-W/2)*st.upp,wy=st.cy+(py-H/2)*st.upp;st.cx=wx-(px-W/2)*u;st.cy=wy-(py-H/2)*u;st.upp=u;view()}
let mode='m',RAMP=null,YR=null;
/* Modos de colorir. Todos usam só dados já carregados do IBGE (SIDRA); sem dado, o município fica cinza. */
const yrsOf=k=>[...new Set(Object.values((IND&&IND[k])||{}).flatMap(r=>Object.keys(r||{})))].filter(y=>/^\d{4}$/.test(y)).sort();
const yv=(k,f)=>{const r=IND&&IND[k]&&IND[k][f.id];return r&&r[YR]!=null?r[YR]:0};
const MODES={
  p:{t:'População',u:' hab.',d:0,yrs:'pop',v:f=>yv('pop',f)},
  d:{t:'Densidade',u:' hab/km²',d:1,yrs:'den',v:f=>yv('den',f)},
  b:{t:'PIB',u:' mil R$',d:0,yrs:'pib',v:f=>yv('pib',f),note:'Valores da época, sem correção pela inflação: compare a posição dos municípios dentro do mesmo ano, não os valores entre anos.'},
  c:{t:'PIB per capita',pre:'R$ ',u:'',d:0,yrs:'pib_per_capita',v:f=>yv('pib_per_capita',f),note:'Valores da época. PIB ÷ população estimada do mesmo ano (Censo em 2010 e 2022).'},
  a:{t:'Alfabetização 15+',u:'%',d:1,yrs:'analfabetismo_15mais',v:f=>{const r=IND&&IND.analfabetismo_15mais&&IND.analfabetismo_15mais[f.id];return r&&r[YR]!=null?100-r[YR]:0},note:'100 − taxa de analfabetismo. 1991–2010: Atlas; 2022: IBGE.'},
  s:{t:'Esgoto adequado',u:'%',d:1,yrs:'san_esgoto_adequado',v:f=>yv('san_esgoto_adequado',f),note:'Domicílios com rede geral, rede pluvial ou fossa séptica (Censos).'}
};
/* v7: um modo de cor para cada indicador do indicadores.json (_meta vem do projeto de coleta, com fonte e avisos) */
function addModes(){const M=IND&&IND._meta;if(!M||addModes.ok)return;addModes.ok=true;const G={};
  Object.entries(M).forEach(([k,m])=>{if(!IND[k])return;const id='i_'+k;
    MODES[id]={t:m.t,u:m.u,d:m.d,yrs:k,z:true,v:f=>{const r=IND[k][f.id];return r&&r[YR]!=null?r[YR]:null},
      note:'Fonte: '+m.f+(/^(corrente|constante)/.test(m.cc)?' · '+m.cc:'')+'. Avisos na ficha do município.'};
    (G[m.g]=G[m.g]||[]).push(`<option value="${id}">${esc(m.t)}</option>`)});
  $('#bMod').insertAdjacentHTML('beforeend',Object.entries(G).map(([g,o])=>`<optgroup label="${esc(g)}">${o.join('')}</optgroup>`).join(''))}
const valOf=f=>mode==='m'?0:MODES[mode].v(f);
const fillOf=f=>hx(C.mun[f.id],null)||(mode==='m'?microColor(micros.indexOf(f.micro)):(RAMP&&RAMP.get(f))||'#d9d4c5');
const legMicro=()=>'<div class="lt">Microrregiões</div><div class="lh">Clique para destacar uma</div>'+micros.map((m,i)=>`<div class="lg" role="button" tabindex="0" aria-pressed="false" data-m="${m}"><i style="background:${microColor(i)}"></i>${m}</div>`).join('');
const fv=(M,x)=>(M.pre||'')+f1(x,M.d)+(M.u||'');
function recolor(){const M=MODES[mode],a=F.map(f=>[f,valOf(f)]).filter(x=>x[1]!=null&&(M.z||x[1]>0)).sort((x,y)=>x[1]-y[1]),n=a.length;
  RAMP=new Map(a.map(([f],i)=>[f,rampAt(n>1?i/(n-1):0)]));
  let cl='';if(n>=5)for(let q=0;q<5;q++){const i0=Math.floor(q*n/5),i1=Math.max(i0,Math.floor((q+1)*n/5)-1);
    cl+=`<div class="cl"><i style="background:${rampAt((q+.5)/5)}"></i>${fv(M,a[i0][1])} – ${fv(M,a[i1][1])}</div>`}
  $('#lgb').innerHTML=`<div class="lt">${M.t}${M.yrs&&YR?' '+YR:''}</div><div style="height:12px;width:170px;margin:4px 0;border:1px solid #8886;background:${rampCss()}"></div>`+
    (n?`<div style="display:flex;justify-content:space-between"><span>${fv({...M,u:'',pre:''},a[0][1])}</span><span>${fv(M,a[n-1][1])}</span></div>`:'')+
    (cl?`<div class="cls" aria-label="Faixas, cada uma com cerca de 1/5 dos municípios">${cl}</div>`:'')+
    `<div class="lh" style="max-width:170px;margin-top:3px">Cor por posição no ranking (não proporcional). Cada faixa tem cerca de 1/5 dos municípios. Cinza: sem dado.${M.note?' '+M.note:''}</div>`;
  paint()}
function setMode(v){mode=MODES[v]?v:'m';const L=$('#leg');
  if(mode==='m'){RAMP=null;L.innerHTML=legMicro();syncHash();paint();return}
  const M=MODES[mode],ys=M.yrs?yrsOf(M.yrs):[];
  if(M.yrs&&!ys.includes(YR))YR=ys[ys.length-1]||null;
  L.innerHTML='<div id="lgb"></div>'+(ys.length>1?`<div class="tlw"><label for="yr">Ano: <b id="yl">${YR}</b></label><input type="range" id="yr" min="0" max="${ys.length-1}" step="1" value="${ys.indexOf(YR)}"></div>`:'<div id="lgy"></div>');
  recolor();syncHash()}
$('#leg').addEventListener('input',e=>{if(e.target.id!=='yr'||mode==='m')return;const ys=yrsOf(MODES[mode].yrs),y=ys[+e.target.value];if(!y)return;YR=y;$('#yl').textContent=y;recolor();syncHash()});
function refreshColors(){if(!F.length)return;setMode(mode);renderList()}
$('#bMod').onchange=e=>setMode(e.target.value);
function paint(){F.forEach(f=>{f.el.setAttribute('fill',colored?fillOf(f):'#d9d4c5');
  f.el.style.opacity=(focus&&f.micro!==focus)?.25:1;f.el.classList.toggle('sel',f===sel)});
  if(sel)sel.el.parentNode.appendChild(sel.el);
  document.querySelectorAll('.lg').forEach(e=>{e.classList.toggle('off',!!focus&&e.dataset.m!==focus);e.setAttribute('aria-pressed',String(focus===e.dataset.m))});applyLabels()}
const MODEKEYS=['m','p','d','b','c','a','s'],ID=/^\d{6,8}$/;
function syncHash(){try{const q=new URLSearchParams();if(sel)q.set('c',sel.id);if(mode!=='m'){q.set('m',mode);if(MODES[mode].yrs&&YR)q.set('y',YR)}
  if(C.pal!=='terra'&&C.pal!=='custom')q.set('pal',C.pal);if(C.ramp!=='laranja'&&C.ramp!=='custom')q.set('rp',C.ramp);if(C.inv)q.set('iv','1');
  const h=q.toString();history.replaceState(null,'',h?'#'+h:location.pathname+location.search)}catch(e){}}
function readHash(){const h=location.hash.slice(1),o={c:null,m:null,y:null,pal:null,rp:null,iv:false};if(ID.test(h)){o.c=h;return o}
  try{const q=new URLSearchParams(h),c=q.get('c'),m=q.get('m'),y=q.get('y'),pal=q.get('pal'),rp=q.get('rp');
    if(ID.test(c||''))o.c=c;if(MODEKEYS.includes(m)||/^i_[a-z0-9_]+$/.test(m||''))o.m=m;if(/^\d{4}$/.test(y||''))o.y=y;
    if(pal&&hasOwn(PALS,pal)&&pal!=='custom')o.pal=pal;if(rp&&hasOwn(RAMPS,rp)&&rp!=='custom')o.rp=rp;o.iv=q.get('iv')==='1'}catch(e){}return o}
function pick(f,zoom){sel=f;paint();syncHash();document.title=f.nome+' — Mapa do Vale do Jequitinhonha';
  const rank=[...F].sort((a,b)=>b.area-a.area).indexOf(f)+1;
  $('#info').innerHTML=infoHtml(f);updMini();if(!$('#cp').hidden)renderCp();
  document.querySelectorAll('#list .it').forEach(e=>e.classList.toggle('s',e.dataset.id==f.id));
  if(zoom){size();st.upp=Math.min(fit,Math.max(fit/300,Math.max((f.bb[2]-f.bb[0])/W,(f.bb[3]-f.bb[1])/H)*1.6));st.cx=(f.bb[0]+f.bb[2])/2;st.cy=(f.bb[1]+f.bb[3])/2;view()}}
const pp=f=>(IND&&IND.pop&&IND.pop[f.id]&&IND.pop[f.id]['2022'])||0;
const ORDS={p:[f=>pp(f),v=>fmt(v)+' hab.'],dn:[f=>stats(f).den||0,v=>f1(v,1)+' hab/km²'],pc:[f=>stats(f).pc||0,v=>'R$ '+fmt(v)],ia:[f=>stats(f).alf||0,v=>f1(v,1)+'%']};
function renderList(){const q=$('#q').value.toLowerCase(),o=$('#ord').value,fmv=$('#fm').value;let h='';
  const L=F.filter(f=>f.nome.toLowerCase().includes(q)&&(!fmv||f.micro===fmv));
  if(ORDS[o])h=[...L].sort((a,b)=>ORDS[o][0](b)-ORDS[o][0](a)).map(it).join('');
  else if(o==='b')h=[...L].sort((a,b)=>b.area-a.area).map(it).join('');
  else micros.forEach((m,i)=>{const l=L.filter(f=>f.micro===m).sort((a,b)=>a.nome.localeCompare(b.nome,'pt'));
    if(l.length)h+=`<h3><i style="background:${microColor(i)}"></i>${m} (${l.length})</h3>`+l.map(it).join('')});
  $('#list').innerHTML=h||'<p>Nada encontrado.</p>'}
const it=f=>{const o=ORDS[$('#ord').value];return `<div class="it${f===sel?' s':''}" role="button" tabindex="0" data-id="${f.id}">${f.nome}<span>${o?o[1](o[0](f)):fmt(f.area)+' km²'}</span></div>`};

$('#list').onclick=e=>{const d=e.target.closest('.it');if(d)pick(F.find(f=>f.id==d.dataset.id),true)};
$('#q').oninput=renderList;$('#ord').onchange=renderList;$('#fm').onchange=renderList;
$('#leg').onclick=e=>{const d=e.target.closest('.lg');if(!d)return;focus=focus===d.dataset.m?null:d.dataset.m;paint()};
$('#bCor').onclick=e=>{colored=!colored;e.target.classList.toggle('on',colored);e.target.setAttribute('aria-pressed',colored);paint()};
$('#bNom').onclick=e=>{showLab=!showLab;e.target.classList.toggle('on',showLab);e.target.setAttribute('aria-pressed',showLab);applyLabels()};
$('#zi').onclick=()=>zoomAt(1.6,W/2,H/2);$('#zo').onclick=()=>zoomAt(1/1.6,W/2,H/2);$('#zr').onclick=fitAll;
svg.addEventListener('wheel',e=>{e.preventDefault();const r=svg.getBoundingClientRect();zoomAt(e.deltaY<0?1.25:.8,e.clientX-r.left,e.clientY-r.top)},{passive:false});
const ptr=new Map();let moved=0,pd=0;
svg.addEventListener('pointerdown',e=>{ptr.set(e.pointerId,[e.clientX,e.clientY]);moved=0;try{svg.setPointerCapture(e.pointerId)}catch(_){}pd=0;svg.style.cursor='grabbing'});
svg.addEventListener('pointermove',e=>{
  const tip=$('#tip');
  if(!ptr.size){const t=e.target.closest&&e.target.closest('.m');if(t){tip.style.display='block';tip.style.left=e.clientX+12+'px';tip.style.top=e.clientY+12+'px';tip.textContent=F[t.dataset.i].nome}else tip.style.display='none';return}
  tip.style.display='none';const p=ptr.get(e.pointerId);if(!p)return;
  const dx=e.clientX-p[0],dy=e.clientY-p[1];moved+=Math.abs(dx)+Math.abs(dy);
  if(ptr.size===1){st.cx-=dx*st.upp;st.cy-=dy*st.upp;view()}
  else{const o=[...ptr.entries()].find(([k])=>k!==e.pointerId)[1],d0=Math.hypot(p[0]-o[0],p[1]-o[1]),d1=Math.hypot(e.clientX-o[0],e.clientY-o[1]),r=svg.getBoundingClientRect();
    if(d0>0)zoomAt(d1/d0,(e.clientX+o[0])/2-r.left,(e.clientY+o[1])/2-r.top)}
  ptr.set(e.pointerId,[e.clientX,e.clientY])});
svg.addEventListener('pointerup',e=>{ptr.delete(e.pointerId);svg.style.cursor='grab';
  if(moved<6&&!ptr.size){const t=document.elementFromPoint(e.clientX,e.clientY);const m=t&&t.closest&&t.closest('.m');if(m)pick(F[m.dataset.i],false)}});
svg.addEventListener('pointercancel',e=>ptr.delete(e.pointerId));
svg.addEventListener('pointerleave',()=>$('#tip').style.display='none');
new ResizeObserver(()=>{if(F.length){const c=[st.cx,st.cy,st.upp];size();view()}}).observe(svg);

function snap(Wp){const pad=1.06,ew=bb.w*pad,eh=bb.h*pad,Hp=Math.round(Wp*eh/ew),s=Wp/1500,c=svg.cloneNode(true),x=bb.cx-ew/2,y=bb.cy-eh/2;
  c.setAttribute('viewBox',`${x} ${y} ${ew} ${eh}`);c.setAttribute('width',Wp);c.setAttribute('height',Hp);c.removeAttribute('style');
  c.querySelector('#sty').textContent=styExp(s);
  c.querySelectorAll('#m path,#o path').forEach((p,i)=>{const f=F[i%F.length];p.setAttribute('d',rawD(f));p.style.display=''});
  const l=c.querySelector('#l');fillExportLabels(l,bb.cx,bb.cy,ew/Wp,Wp,Hp,s);l.style.display=showLab?'':'none';
  c.insertAdjacentHTML('afterbegin',`<rect x="${x}" y="${y}" width="${ew}" height="${eh}" fill="#f4f1ea"/>`);
  const st0=c.querySelector('#sty');c.insertBefore(st0,c.firstChild);
  c.insertAdjacentHTML('beforeend',`<text x="${x+ew*.015}" y="${y+eh-eh*.02}" font-size="${14*s*ew/Wp}" fill="#444" font-family="system-ui,sans-serif">Vale do Jequitinhonha — malha municipal IBGE</text>`);
  const xml=new XMLSerializer().serializeToString(c);F.forEach(f=>f.raw=null);
  return{xml,Wp,Hp}}
function dl(b,n){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=n;a.click()}
/* v7: uma coluna por indicador (ano mais recente com dado); séries completas ficam nos CSV do projeto de coleta */
$('#bCsv').onclick=async()=>{await INDP;const q=v=>'"'+String(v).replace(/"/g,'""')+'"',c=v=>v==null?'':String(v).replace('.',','),
  K=Object.keys((IND&&IND._meta)||{}).map(k=>[k,yrsOf(k).pop()]).filter(x=>x[1]),
  L=[['codigo_ibge','municipio','microrregiao','area_malha_km2',...K.map(([k,y])=>k+'_'+y)].join(';')];
  F.forEach(f=>L.push([f.id,q(f.nome),q(f.micro),f.area.toFixed(1).replace('.',','),...K.map(([k,y])=>c(at(IND[k][f.id],y)))].join(';')));
  dl(new Blob(['\ufeff'+L.join('\n')],{type:'text/csv;charset=utf-8'}),'jequitinhonha.csv')};
$('#bSvg').onclick=()=>dl(new Blob([snap(1500).xml],{type:'image/svg+xml'}),'jequitinhonha.svg');
$('#bPng').onclick=()=>{const{xml,Wp,Hp}=snap(6000),im=new Image();
  im.onload=()=>{const c=document.createElement('canvas');c.width=Wp;c.height=Hp;c.getContext('2d').drawImage(im,0,0);c.toBlob(b=>dl(b,'jequitinhonha.png'))};
  im.onerror=()=>alert('Não foi possível gerar o PNG neste navegador. Use o SVG.');
  im.src=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml'}))};


/* ===== Indicadores (IBGE/SIDRA) ===== */
let IND=null,INDP=null;
const num=v=>{const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?null:n},f1=(n,d=1)=>n.toLocaleString('pt-BR',{maximumFractionDigits:d});
const at=(r,p)=>r&&r[p]!=null?r[p]:null,last=r=>{if(!r)return null;const k=Object.keys(r).sort().pop();return k?{p:k,v:r[k]}:null};
async function sidra(t,per,v,ids){try{const g=await j(API+`v3/agregados/${t}/periodos/${per}/variaveis/${v}?localidades=N6[${ids}]`);const o={};
  (((g[0]||{}).resultados||[{}])[0].series||[]).forEach(s=>{const r={};Object.entries(s.serie||{}).forEach(([p,x])=>{const n=num(x);if(n!==null)r[p]=n});o[s.localidade.id]=r});return o}catch(e){return{}}}
async function loadInd(){
  {const d=await INDFILE;if(d&&typeof d==='object'&&d.pop&&typeof d.pop==='object'){IND=d;return}}
  try{const c=localStorage.getItem('jq_ind2');if(c){const d=JSON.parse(c);if(d&&typeof d==='object'&&d.pop){IND=d;return}}}catch(e){}
  const ids=F.map(f=>f.id).join(',');
  const[pop,area,den,est,pib]=await Promise.all([sidra(4714,'all',93,ids),sidra(4714,'all',6318,ids),sidra(4714,'all',614,ids),sidra(6579,'-1',9324,ids),sidra(5938,'all',37,ids)]);
  IND={pop,area,den,est,pib};
  if(Object.keys(pop).length)try{localStorage.setItem('jq_ind2',JSON.stringify(IND))}catch(e){}
}


/* ===== v4: educação e saneamento (Censo 2022; só via indicadores.json) ===== */
const statsC=new Map();
function stats(f){let r=statsC.get(f.id);if(r)return r;
  const g=k=>IND&&IND[k]&&IND[k][f.id],P=g('pop')||{},B=last(g('pib')),a=last(g('area')),p22=at(P,'2022'),PC=last(g('pib_per_capita')),an=at(g('analfabetismo_15mais'),'2022');
  r={pop:p22,pop10:at(P,'2010'),den:at(g('den'),'2022'),area:a?a.v:null,pib:B,pc:PC?PC.v:(B&&p22?B.v*1000/p22:null),pcy:PC?PC.p:null,
    alf:an!=null?100-an:null,esg:at(g('san_esgoto_adequado'),'2022'),lixo:at(g('san_lixo_coletado'),'2022')};
  statsC.set(f.id,r);return r}
/* ===== v5: menus de dados redesenhados (mesmos dados, melhor organização) ===== */
const sec=(id,t,body,intro)=>body?`<section id="s-${id}" class="sec" aria-labelledby="h-${id}"><h3 id="h-${id}" tabindex="-1">${t}</h3>${intro?`<p class="intro">${intro}</p>`:''}${body}</section>`:'';
const hero=a=>{a=a.filter(Boolean);return a.length?'<div class="hero" role="group" aria-label="Números principais">'+a.map(h=>`<div class="stat"><div class="sl">${h[0]}</div><div class="sv">${h[1]}</div>${h[2]?`<div class="su">${h[2]}</div>`:''}</div>`).join('')+'</div>':''};
/* linha da tabela: [rótulo, valor, explicação opcional, porcentagem opcional para a barra] */
const tb=rows=>{rows=rows.filter(Boolean);return rows.length?'<table class="t"><tbody>'+rows.map(r=>{const b=r[3]!=null;return `<tr${b?' class="hb"':''}><th scope="row">${r[0]}${r[2]?`<small>${r[2]}</small>`:''}</th><td>${r[1]}</td></tr>`+(b?`<tr class="bb" aria-hidden="true"><td colspan="2"><span class="bar"><i style="width:${Math.max(0,Math.min(100,r[3]))}%"></i></span></td></tr>`:'')}).join('')+'</tbody></table>':''};
/* v7: percentuais do projeto de coleta; para o Vale (vários municípios) mostra a mediana entre os municípios */
function socialHtml(L){
  const med=a=>a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2,
    v=(k,p)=>{const a=L.map(x=>at(IND&&IND[k]&&IND[k][x.id],p||(last(IND&&IND[k]&&IND[k][x.id])||{}).p)).filter(x=>x!=null).sort((x,y)=>x-y);return a.length?med(a):null},
    ed=[],sa=[],an=v('analfabetismo_15mais','2022'),y=k=>yrsOf(k).pop();
  if(an!=null)ed.push(['Taxa de alfabetização (15+ anos, 2022)',f1(100-an,1)+'%','Pessoas de 15 anos ou mais que sabem ler e escrever',100-an]);
  [['ideb_anos_iniciais','IDEB anos iniciais'],['ideb_anos_finais','IDEB anos finais'],['ideb_ensino_medio','IDEB ensino médio']].forEach(([k,t])=>{const x=v(k,y(k));if(x!=null)ed.push([`${t} (${y(k)})`,f1(x,1),'Rede pública, escala de 0 a 10'])});
  [['san_agua_rede','Água da rede geral'],['san_esgoto_adequado','Esgoto: rede, pluvial ou fossa séptica'],['san_sem_banheiro','Sem banheiro nem sanitário'],['san_lixo_coletado','Lixo coletado']].forEach(([k,t])=>{const x=v(k,'2022');if(x!=null)sa.push([t,f1(x,1)+'%','',x])});
  const md=L.length>1?' Mediana entre os municípios.':'';
  return sec('edu','Educação',tb(ed),md.trim())+sec('san','Saneamento',tb(sa),'Porcentagem dos domicílios, Censo 2022.'+md)}
/* v7: todos os indicadores do indicadores.json, valor mais recente, com fonte e avisos */
function allHtml(f){const M=IND&&IND._meta;if(!M)return '';const G={};
  Object.entries(M).forEach(([k,m])=>{const l=last(IND[k]&&IND[k][f.id]);
    (G[m.g]=G[m.g]||[]).push([esc(m.t),l?f1(l.v,m.d)+esc(m.u):'sem dado',(l?l.p+' · ':'')+esc(m.f)])});
  const av=Object.values(M).filter(m=>m.av.length).map(m=>`<li><b>${esc(m.t)}</b>: ${m.av.map(esc).join(' ')}</li>`).join('');
  return sec('tud','Todos os indicadores',Object.entries(G).map(([g,R])=>`<p class="intro"><b>${esc(g)}</b></p>`+tb(R)).join(''),
    'Valor mais recente de cada indicador. Para ver a série, escolha o indicador em “Colorir o mapa por” e mude o ano na legenda.')+
    (av?`<details class="srcbox"><summary>Avisos e limitações de cada indicador</summary><ul>${av}</ul></details>`:'')}
/* mini gráfico de linha (SVG simples); o texto embaixo repete os valores, então o gráfico não é a única informação */
function spark(pts,fm,titulo){
  pts=pts.filter(q=>q[1]!=null&&isFinite(q[1])).sort((a,b)=>a[0]-b[0]);if(pts.length<2)return '';
  const Wd=300,Hd=64,p=8,xs=pts.map(q=>+q[0]),ys=pts.map(q=>q[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),
    X=x=>p+(x1>x0?(x-x0)/(x1-x0):0)*(Wd-2*p),Y=y=>Hd-p-(y1>y0?(y-y0)/(y1-y0):.5)*(Hd-2*p),A=pts[0],Z=pts[pts.length-1];
  return `<p class="intro"><b>${titulo}</b></p><svg class="spk" viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="${titulo}: de ${fm(A[1])} em ${A[0]} para ${fm(Z[1])} em ${Z[0]}"><path d="${pts.map((q,i)=>(i?'L':'M')+X(+q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('')}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>${pts.map(q=>`<circle cx="${X(+q[0]).toFixed(1)}" cy="${Y(q[1]).toFixed(1)}" r="3.5" fill="currentColor"/>`).join('')}</svg><p class="intro">${A[0]}: ${fm(A[1])} · ${Z[0]}: ${fm(Z[1])}</p>`}
const GL='<p class="gl"><b>hab.</b> = habitantes; <b>hab/km²</b> = habitantes por quilômetro quadrado; <b>R$ mi</b> = milhões de reais; <b>R$ bi</b> = bilhões de reais. As barras mostram a porcentagem e não substituem o número ao lado.</p>';
const SRC='<details class="srcbox"><summary>Fontes dos dados</summary><p>IBGE/SIDRA (Censos 1970–2022, estimativas de população, PIB dos Municípios, Produção Agrícola e Pecuária Municipal, saneamento), Atlas do Desenvolvimento Humano (PNUD/IPEA/FJP, via IPEADATA), INEP (IDEB) e Ministério da Saúde/DATASUS. Números coletados e conferidos no projeto de coleta, com a resposta original de cada fonte guardada; a fonte, a tabela e os avisos de cada indicador estão em “Todos os indicadores”.</p></details>';
const NODATA='<p class="warn">Não foi possível carregar os dados do IBGE agora (internet ou bloqueio do navegador). Tente de novo mais tarde.</p>';
let lastFocus=null;
function openDlg(title,sub,body){
  if($('#dlg').hidden)lastFocus=document.activeElement;
  $('#dtitle').textContent=title;$('#dsub').textContent=sub||'';$('#dbody').innerHTML=body;
  const S=[...$('#dbody').querySelectorAll('section.sec')];
  $('#dnav').innerHTML=S.map(s=>`<button type="button" data-go="${s.id}">${s.querySelector('h3').textContent}</button>`).join('');
  $('#dnav').hidden=S.length<2;
  $('#dlg').hidden=false;$('#dbody').scrollTop=0;$('#dx').focus()}
function closeDlg(){$('#dlg').hidden=true;if(lastFocus&&lastFocus.focus&&document.contains(lastFocus))lastFocus.focus()}
$('#dnav').onclick=e=>{const b=e.target.closest('button[data-go]');if(!b)return;const s=document.getElementById(b.dataset.go);if(!s)return;
  s.scrollIntoView({behavior:window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'start'});
  const h=s.querySelector('h3');if(h)h.focus({preventScroll:true})};
async function openMun(f){
  const sub=`Microrregião de ${f.micro} — código IBGE ${f.id}`;
  openDlg(f.nome,sub,'<p class="load">Carregando dados…</p>');await INDP;
  const P=IND&&IND.pop&&IND.pop[f.id];if(!P)return openDlg(f.nome,sub,NODATA);
  const p22=at(P,'2022'),p10=at(P,'2010'),a=last(IND.area&&IND.area[f.id]),d=at(IND.den&&IND.den[f.id],'2022'),e=last(IND.est&&IND.est[f.id]);
  const ord=F.map(x=>[x,at(IND.pop[x.id],'2022')]).filter(x=>x[1]!=null).sort((x,y)=>y[1]-x[1]),rk=ord.findIndex(x=>x[0]===f)+1;
  const mic=F.filter(x=>x.micro===f.micro).length,tot=ord.reduce((s,x)=>s+x[1],0),B=last(IND.pib&&IND.pib[f.id]),pd=B&&(at(P,B.p)||p22),cg=p22&&p10?(Math.pow(p22/p10,1/12)-1)*100:null,S=stats(f);
  openDlg(f.nome,sub,
    hero([p22!=null&&['População em 2022',fmt(p22),'habitantes (Censo)'],rk&&['Posição no Vale',rk+'º','por população, entre '+ord.length+' municípios'],d!=null&&['Densidade demográfica',f1(d,2),'hab/km², em 2022']])+
    sec('pop','População',tb([p10!=null&&['Censo 2010',fmt(p10)+' hab.'],p22!=null&&p10!=null&&['Variação 2010–2022',(p22>=p10?'+':'')+f1((p22/p10-1)*100)+'%'],e&&[`Estimativa ${e.p}`,fmt(e.v)+' hab.'],cg!=null&&['Crescimento médio anual 2010–2022',f1(cg,2)+'% ao ano'],p22&&tot&&['Participação na população do Vale',f1(p22/tot*100,1)+'%']]))+
    sec('eco','Economia',tb([B?[`PIB (${B.p})`,'R$ '+f1(B.v/1000,1)+' mi','Produto Interno Bruto, em milhões de reais']:['PIB','indisponível'],S.pcy?[`PIB per capita (${S.pcy})`,'R$ '+fmt(S.pc),'PIB dividido pela população do mesmo ano']:B&&pd&&[`PIB per capita${at(P,B.p)?'':' (aprox., pop. 2022)'}`,'R$ '+fmt(B.v*1000/pd),'PIB dividido pelo número de habitantes']]))+
    sec('evo','Evolução',spark(Object.entries((IND.pib&&IND.pib[f.id])||{}),v=>'R$ '+f1(v/1000,1)+' mi','PIB (valores da época, sem correção pela inflação)')+spark(Object.entries(P),v=>fmt(v)+' hab.','População (Censos)'))+
    socialHtml([f])+allHtml(f)+
    sec('ter','Território',tb([a&&[`Área oficial (${a.p})`,f1(a.v,2)+' km²'],['Municípios na microrregião',mic]]))+
    `<p class="ext"><a href="https://www.ibge.gov.br/cidades-e-estados/mg/${f.id}.html" target="_blank" rel="noopener noreferrer">Ver página completa no IBGE Cidades <span class="sr">(abre em nova aba)</span> ↗</a></p>`+GL+SRC)}
async function openVale(){
  const sub=`${F.length} municípios em ${micros.length} microrregiões (mesorregião do IBGE)`;
  openDlg('Vale do Jequitinhonha',sub,'<p class="load">Carregando dados…</p>');await INDP;
  if(!IND||!IND.pop||!Object.keys(IND.pop).length)return openDlg('Vale do Jequitinhonha',sub,NODATA);
  const sum=(L,p)=>L.reduce((s,x)=>s+(at(IND.pop[x.id],p)||0),0),ok=p=>F.filter(x=>at(IND.pop[x.id],p)!=null);
  const A=F.reduce((s,x)=>s+((last(IND.area&&IND.area[x.id])||{}).v||0),0),n22=ok('2022'),t22=sum(n22,'2022'),both=F.filter(x=>at(IND.pop[x.id],'2022')!=null&&at(IND.pop[x.id],'2010')!=null);
  const v22=sum(both,'2022'),v10=sum(both,'2010');
  const top=[...n22].sort((a,b)=>at(IND.pop[b.id],'2022')-at(IND.pop[a.id],'2022'));
  const py=Object.values(IND.pib||{}).flatMap(r=>Object.keys(r)).sort().pop(),pv=py&&F.reduce((s,x)=>s+(at(IND.pib[x.id],py)||0),0);
  const mr=micros.map(m=>{const L=F.filter(x=>x.micro===m),v=sum(L,'2022');return[m+` (${L.length} mun.)`,fmt(v)+' hab.','',t22?v/t22*100:0]});
  openDlg('Vale do Jequitinhonha',sub,
    hero([['População (Censo 2022)',fmt(t22),'habitantes'],A&&['Área oficial somada',fmt(A),'km²'],A&&['Densidade média',f1(t22/A,1),'hab/km²']])+
    sec('pan','Panorama',tb([both.length&&v10&&['Variação 2010–2022',(v22>=v10?'+':'')+f1((v22/v10-1)*100)+'%'],pv&&[`PIB do Vale (${py})`,'R$ '+f1(pv/1e6,2)+' bi','Produto Interno Bruto somado, em bilhões de reais'],pv&&t22&&['PIB per capita (aprox., pop. 2022)','R$ '+fmt(pv*1000/t22)],top.length>4&&['Maior município',`${top[0].nome} (${fmt(at(IND.pop[top[0].id],'2022'))})`],top.length>4&&['Menor município',`${top[top.length-1].nome} (${fmt(at(IND.pop[top[top.length-1].id],'2022'))})`]]))+
    sec('mic','População por microrregião',tb(mr),'Censo 2022. A barra mostra a parte de cada microrregião no total do Vale.')+
    socialHtml(F)+
    (n22.length<F.length?`<p class="warn">Atenção: ${F.length-n22.length} município(s) sem dado de 2022 carregado; totais parciais.</p>`:'')+
    GL+SRC)}
$('#info').onclick=e=>{const b=e.target.closest('button');if(!b)return;
  if(b.id==='bLink'){const u=location.href;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>{b.textContent='Link copiado!';setTimeout(()=>{b.textContent='Copiar link'},2500)},()=>prompt('Copie o link:',u));return}
  if(b.id==='bMais'&&sel)openMun(sel);
  if(b.id==='bAddCmp'&&sel)toggleCmp(sel)};
$('#bVale').onclick=openVale;
let CMP=[];
function updCmp(){const b=$('#bCmp');b.hidden=!CMP.length;b.textContent='Comparar ('+CMP.length+')'}
function toggleCmp(f){const i=CMP.indexOf(f);if(i>=0)CMP.splice(i,1);else{if(CMP.length>=4)CMP.shift();CMP.push(f)}updCmp();refreshInfo()}
async function openCmp(){
  openDlg('Comparar municípios',CMP.length+' escolhido(s), no máximo 4','<p class="load">Carregando dados…</p>');await INDP;
  if(CMP.length<2)return openDlg('Comparar municípios','','<p class="intro">Escolha pelo menos 2 municípios: selecione um no mapa e use o botão “Comparar com outros”.</p>');
  const S=CMP.map(stats),n=(v,fn)=>v==null?'<span class="sub">indisponível</span>':fn(v),
    R=[['Microrregião',CMP.map(f=>f.micro)],
      ['População em 2022 (hab.)',S.map(x=>n(x.pop,fmt))],['Densidade (hab/km²)',S.map(x=>n(x.den,v=>f1(v,2)))],['Área oficial (km²)',S.map(x=>n(x.area,v=>f1(v,1)))],
      ['PIB mais recente',S.map(x=>n(x.pib,b=>'R$ '+f1(b.v/1000,1)+' mi ('+b.p+')'))],['PIB per capita (mais recente)',S.map(x=>n(x.pc,v=>'R$ '+fmt(v)+(x.pcy?' ('+x.pcy+')':'')))],
      ['Alfabetização 15+ (%)',S.map(x=>n(x.alf,v=>f1(v,1)+'%'))],['Esgoto: rede, pluvial ou fossa séptica (%, 2022)',S.map(x=>n(x.esg,v=>f1(v,1)+'%'))],['Lixo coletado (%)',S.map(x=>n(x.lixo,v=>f1(v,1)+'%'))]];
  openDlg('Comparar municípios',CMP.length+' municípios lado a lado',`<div class="cmpw"><table class="t cmp"><thead><tr><th scope="col"><span class="sr">Indicador</span></th>${CMP.map(f=>`<th scope="col">${f.nome}</th>`).join('')}</tr></thead><tbody>${R.map(r=>`<tr><th scope="row">${r[0]}</th>${r[1].map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="intro">Dados do IBGE. PIB per capita: PIB dividido pela população do mesmo ano (valores da época).</p><div class="acts"><button type="button" id="cmpClear">Limpar comparação</button></div>`+SRC);
  const cb=$('#cmpClear');if(cb)cb.onclick=()=>{CMP=[];updCmp();refreshInfo();closeDlg()}}
$('#bCmp').onclick=openCmp;
$('#bHelp').onclick=()=>openDlg('Ajuda','Como usar o mapa',`<div class="sec"><ul class="help"><li><b>Mapa:</b> arraste para mover; roda do mouse, pinça ou botões + − para aproximar; ⌂ mostra tudo.</li><li><b>Clique ou toque</b> num município para ver o resumo. “Ver todos os dados” abre população, economia, educação, saneamento e evolução ao longo dos anos.</li><li><b>Cor:</b> escolha a microrregião ou um indicador (população, densidade, PIB, PIB per capita, alfabetização, esgoto). Nos indicadores com mais de um ano, use o controle “Ano” na legenda. As cores seguem a posição no ranking, e a legenda mostra as faixas.</li><li><b>Personalizar cores:</b> paletas prontas (inclusive para daltônicos e para imprimir), escalas e cor de um município.</li><li><b>Nomes:</b> liga e desliga os nomes no mapa; aproxime para ver mais.</li><li><b>Comparar:</b> selecione um município e use “Comparar com outros” (até 4).</li><li><b>Lista:</b> busque, ordene por indicador e filtre por microrregião. “Recolher painel” libera a tela.</li><li><b>Compartilhar:</b> “Copiar link” guarda o município, o indicador, o ano e a paleta escolhida.</li><li><b>Baixar:</b> CSV, SVG e PNG de alta resolução (sempre com a malha completa).</li></ul></div>`);
$('#dx').onclick=closeDlg;$('#dlg').onclick=e=>{if(e.target.id==='dlg')closeDlg()};
document.addEventListener('keydown',e=>{
  if(!$('#dlg').hidden){if(e.key==='Escape')return closeDlg();
    if(e.key==='Tab'){const x=[...$('#dlg').querySelectorAll('a[href],button,summary')].filter(n=>n.offsetParent!==null),a=x[0],z=x[x.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}return}
  if(e.key==='Escape'&&!$('#cp').hidden){closeCp();return}
  if(e.key!=='Enter'&&e.key!==' ')return;const t=e.target,c=t.classList;if(!c)return;
  if(c.contains('it')||c.contains('lg')){e.preventDefault();t.click()}
  else if(c.contains('m')){e.preventDefault();const f=F[t.dataset.i];pick(f,true);f.el.focus()}});


/* ===== v5: painel do município, menu lateral recolhível, painel de cores e nomes ===== */
const rankOf=f=>[...F].sort((a,b)=>b.area-a.area).indexOf(f)+1;
function infoHtml(f){
  const dot=hx(C.mun[f.id],microColor(micros.indexOf(f.micro)));
  return `<div class="ih"><i class="dot" style="background:${dot}" aria-hidden="true"></i><div><div class="nm">${f.nome}</div><div class="sb">Microrregião de ${f.micro}</div></div></div>`+
  `<dl class="kv"><div><dt>Código IBGE</dt><dd>${f.id}</dd></div><div><dt>Área aproximada</dt><dd>${fmt(f.area)} km²<small>${rankOf(f)}º maior de ${F.length}</small></dd></div></dl>`+
  `<div class="acts"><button id="bMais" class="pri">Ver todos os dados</button><button id="bLink">Copiar link</button><button id="bAddCmp" aria-pressed="${CMP.includes(f)}">${CMP.includes(f)?'Tirar da comparação':'Comparar com outros'}</button></div>`}
function refreshInfo(){if(sel)$('#info').innerHTML=infoHtml(sel);updMini()}
function updMini(){const m=$('#mini');
  if(!document.body.classList.contains('side-off')||!sel){m.hidden=true;applyLabels();return}
  m.hidden=false;m.innerHTML=`<div class="nm">${sel.nome}</div><div class="sb">Microrregião de ${sel.micro}</div><button id="bMini" class="pri">Ver todos os dados</button>`;applyLabels()}
$('#mini').onclick=e=>{if(e.target.id==='bMini'&&sel)openMun(sel)};

/* menu lateral: fechar e abrir quando quiser (a escolha fica guardada neste navegador) */
function setSide(open,fx){
  document.body.classList.toggle('side-off',!open);
  $('#bSide').setAttribute('aria-expanded',String(open));
  $('#openSide').hidden=open;$('#openSide').setAttribute('aria-expanded',String(open));
  try{localStorage.setItem('jq_side',open?'1':'0')}catch(e){}
  updMini();
  requestAnimationFrame(()=>{if(F.length){size();view()}});
  if(fx)(open?$('#bSide'):$('#openSide')).focus()}
$('#bSide').onclick=()=>setSide(false,true);
$('#openSide').onclick=()=>setSide(true,true);
{let so='1';try{so=localStorage.getItem('jq_side')||'1'}catch(e){}setSide(so!=='0',false)}

/* painel "Personalizar cores" */
const cpEl=$('#cp');
const swatch=cols=>'<span class="sw" aria-hidden="true">'+cols.map(c=>`<i style="background:${c}"></i>`).join('')+'</span>';
function renderCp(){
  const b=$('#cpb'),sc=b.scrollTop;
  const pals=Object.entries(PALS).map(([k,p])=>`<button type="button" class="pal" data-pal="${k}" aria-pressed="${C.pal===k}">${swatch(k==='custom'?micros.map((m,i)=>microColor(i)):p.c.slice(0,6))}<span>${p.n}</span></button>`).join('');
  const mic=micros.map((m,i)=>`<label class="cr"><input type="color" data-micro="${i}" value="${microColor(i)}"><span>${m}</span></label>`).join('');
  const rps=Object.entries(RAMPS).map(([k,r])=>`<button type="button" class="pal" data-ramp="${k}" aria-pressed="${C.ramp===k}"><span class="gr" aria-hidden="true" style="background:linear-gradient(90deg,${k==='custom'?hx(C.r0,'#fde8c8')+','+hx(C.r1,'#8a3b12'):r.s.join(',')})"></span><span>${r.n}</span></button>`).join('');
  const nm=Object.keys(C.mun).length,cur=sel?hx(C.mun[sel.id],hx(fillOf(sel),'#d9d4c5')):'';
  b.innerHTML=
  `<section aria-labelledby="c1"><h3 id="c1">Cores das microrregiões</h3><div class="pals">${pals}</div><details${C.pal==='custom'?' open':''}><summary>Escolher a cor de cada microrregião</summary><div class="crs">${mic}</div></details></section>`+
  `<section aria-labelledby="c2"><h3 id="c2">Escala de população e densidade</h3><p class="hint">Use o seletor “Cor:” no topo para colorir o mapa por população ou densidade.</p><div class="pals" style="margin-top:8px">${rps}</div>`+
  (C.ramp==='custom'?`<div class="crs"><label class="cr"><input type="color" id="r0" value="${hx(C.r0,'#fde8c8')}"><span>Valores baixos</span></label><label class="cr"><input type="color" id="r1" value="${hx(C.r1,'#8a3b12')}"><span>Valores altos</span></label></div>`:'')+
  `<label class="ck"><input type="checkbox" id="rinv"${C.inv?' checked':''}><span>Inverter a escala (troca claro e escuro)</span></label></section>`+
  `<section aria-labelledby="c3"><h3 id="c3">Cor de um município</h3>`+
  (sel?`<div class="crs"><label class="cr"><input type="color" id="mc" value="${cur}"><span>${sel.nome}</span></label><button type="button" id="mcx"${C.mun[sel.id]?'':' disabled'}>Voltar à cor padrão</button></div>`:'<p class="hint">Selecione um município no mapa ou na lista para escolher uma cor só para ele.</p>')+
  (nm?`<div class="crs"><button type="button" id="mcall">${nm===1?'Remover a cor individual':'Remover as '+nm+' cores individuais'}</button></div>`:'')+`</section>`+
  `<section aria-labelledby="c4"><h3 id="c4">Nomes no mapa</h3><p class="hint">Ligue ou desligue com o botão “Nomes” no topo.</p>`+
  `<label class="ck"><input type="radio" name="nm" value="a"${C.names!=='t'?' checked':''}><span>Automático: mostra os nomes que cabem sem sobrepor. Aproxime o mapa para ver mais.</span></label>`+
  `<label class="ck"><input type="radio" name="nm" value="t"${C.names==='t'?' checked':''}><span>Todos os nomes de uma vez (podem ficar sobrepostos)</span></label></section>`+
  `<button type="button" id="cpr" class="rst">Restaurar cores e nomes originais</button>`;
  b.scrollTop=sc}
function openCp(){cpEl.hidden=false;$('#bPal').setAttribute('aria-expanded','true');renderCp();cpEl.focus();applyLabels()}
function closeCp(){cpEl.hidden=true;$('#bPal').setAttribute('aria-expanded','false');$('#bPal').focus();applyLabels()}
$('#bPal').onclick=()=>cpEl.hidden?openCp():closeCp();
$('#cpx').onclick=closeCp;
function syncPal(){cpEl.querySelectorAll('[data-pal]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.pal===C.pal)));
  const cs=cpEl.querySelector('[data-pal=custom] .sw');if(cs)cs.innerHTML=micros.map((m,i)=>`<i style="background:${microColor(i)}"></i>`).join('')}
function snapPal(){const s=micros.map((m,i)=>microColor(i));C.pal='custom';micros.forEach((m,i)=>C.cm[m]=s[i])}
function again(q){renderCp();const n=cpEl.querySelector(q);if(n)n.focus()}
cpEl.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.pal){const s=micros.map((m,i)=>microColor(i));C.pal=t.dataset.pal;
    if(C.pal==='custom'&&!micros.every(m=>C.cm[m]))micros.forEach((m,i)=>{C.cm[m]=hx(C.cm[m],s[i])});
    saveC();refreshColors();refreshInfo();again(`[data-pal="${C.pal}"]`);return}
  if(t.dataset.ramp){C.ramp=t.dataset.ramp;saveC();refreshColors();again(`[data-ramp="${C.ramp}"]`);return}
  if(t.id==='mcx'&&sel){delete C.mun[sel.id];saveC();paint();refreshInfo();again('#mc');return}
  if(t.id==='mcall'){C.mun={};saveC();paint();refreshInfo();again('[data-pal="'+C.pal+'"]');return}
  if(t.id==='cpr'){C=C0();saveC();refreshColors();refreshInfo();applyLabels();again('[data-pal="terra"]')}});
cpEl.addEventListener('input',e=>{const t=e.target;
  if(t.dataset&&t.dataset.micro!=null){if(C.pal!=='custom')snapPal();C.cm[micros[+t.dataset.micro]]=t.value;saveC();refreshColors();refreshInfo();syncPal()}
  else if(t.id==='r0'||t.id==='r1'){C[t.id]=t.value;saveC();refreshColors()}
  else if(t.id==='mc'&&sel){C.mun[sel.id]=t.value;saveC();paint();refreshInfo();const x=$('#mcx');if(x)x.disabled=false}});
cpEl.addEventListener('change',e=>{const t=e.target;
  if(t.id==='rinv'){C.inv=t.checked;saveC();refreshColors()}
  else if(t.name==='nm'){C.names=t.value==='t'?'t':'a';saveC();applyLabels()}});

function start(){$('#msg').style.display='flex';$('#msg').textContent='Carregando a malha oficial do IBGE…';
  load().then(build).catch(err=>{$('#msg').innerHTML=`<b>Não foi possível carregar o mapa.</b><span>${esc(err.message)}</span><small style="max-width:760px;text-align:left;word-break:break-all;color:#555">${diag.slice(-8).map(esc).join('<br>')}</small>`;
    const b=document.createElement('button');b.textContent='Tentar de novo';b.onclick=start;$('#msg').appendChild(b)})}
start();
