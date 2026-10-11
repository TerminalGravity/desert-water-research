import * as THREE from './vendor/three.module.min.js';
import {OrbitControls} from './vendor/OrbitControls.js';
const stage=document.getElementById('stage'),canvas=document.getElementById('scene'),labelsEl=document.getElementById('labels');
const loading=document.getElementById('loading'),fallback=document.getElementById('fallback');
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const VE=1.5;
function fail(msg){console.warn('terrain:',msg);loading.style.display='none';fallback.style.display='block';canvas.style.display='none';document.querySelector('.hud').style.display='none'}
function hasGL(){try{const c=document.createElement('canvas');return !!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')))}catch(e){return false}}
if(!hasGL()){fail('no webgl')}else{
 const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();init().catch(e=>fail(e.message))}});io.observe(stage);
}
const img=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('img '+src));i.src=src});
async function init(){
 const B='assets/terrain/';
 const [meta,hydro,buf,hill,flow,cmain,cdrone]=await Promise.all([fetch(B+'meta.json').then(r=>r.json()),fetch(B+'hydro.json').then(r=>r.json()),fetch(B+'height.bin').then(r=>r.arrayBuffer()),img(B+'hillshade.jpg'),img(B+'flow.png'),img(B+'catch_main.png'),img(B+'catch_drone.png')]);
 let sat=null;
 const [GW,GH]=meta.grid,{s:S,n:N,w:W,e:E}=meta.bounds,WK=meta.width_m/1000,HK=meta.height_m/1000;
 const Hm=new Uint16Array(buf);
 const elevAt=(lat,lon)=>{const fx=(lon-W)/(E-W)*(GW-1),fy=(N-lat)/(N-S)*(GH-1);const x0=Math.max(0,Math.min(GW-2,Math.floor(fx))),y0=Math.max(0,Math.min(GH-2,Math.floor(fy)));const tx=fx-x0,ty=fy-y0,g=(x,y)=>Hm[y*GW+x]/10;
  return g(x0,y0)*(1-tx)*(1-ty)+g(x0+1,y0)*tx*(1-ty)+g(x0,y0+1)*(1-tx)*ty+g(x0+1,y0+1)*tx*ty};
 const toXZ=(lat,lon)=>[(lon-W)/(E-W)*WK-WK/2,(N-lat)/(N-S)*HK-HK/2];
 const v3=(lat,lon,up=0)=>{const [x,z]=toXZ(lat,lon);return new THREE.Vector3(x,elevAt(lat,lon)/1000*VE+up,z)};
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xECECE8);scene.fog=new THREE.Fog(0xECECE8,40,95);
 const camera=new THREE.PerspectiveCamera(40,1,0.05,300);
 const geo=new THREE.PlaneGeometry(WK,HK,GW-1,GH-1);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,Hm[i]/10000*VE);geo.computeVertexNormals();
 // composite texture
 const cv=document.createElement('canvas');cv.width=2048;cv.height=1792;const cx=cv.getContext('2d');
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const state={sat:false,drone:false,manual:false};
 function compose(){cx.drawImage(state.sat&&sat?sat:hill,0,0,cv.width,cv.height);cx.globalAlpha=state.sat?0.55:1;cx.drawImage(flow,0,0,cv.width,cv.height);cx.globalAlpha=1;cx.drawImage(cmain,0,0,cv.width,cv.height);if(state.drone)cx.drawImage(cdrone,0,0,cv.width,cv.height);else{cx.globalAlpha=.6;cx.drawImage(cdrone,0,0,cv.width,cv.height);cx.globalAlpha=1}tex.needsUpdate=true;dirty=true}
 const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex}));scene.add(mesh);
 // markers
 const A=hydro.main.area_acres,D1=hydro.drone.area_acres,G=27154,P=4.16;
 const rng=a=>'about '+Math.round(a*P*G*.2/1e5/10).toLocaleString()+'–'+Math.round(a*P*G*.6/1e5/10).toLocaleString()+' million gal/yr';
 const perAcre='Per acre at this point: about 22,600–67,800 gal/yr (valley rainfall normal, C 0.20–0.60). Mountain rainfall unknown.';
 const M=[
  {id:'peak',short:'Peak',up:1.3,name:'Crossman Peak',lat:34.5489,lon:-114.1885,status:'Existing feature',coord:'Verified (Peakbagger)',est:perAcre},
  {id:'towers',short:'Towers',name:'Radio towers',lat:34.5515278,lon:-114.1943889,status:'Existing',coord:'Verified (MRA, RadioReference)',est:perAcre},
  {id:'fsw',short:'Falls Spr.',name:'Falls Springs Wash (GNIS point)',lat:34.529456,lon:-114.26662,status:'Existing; computed catchment outlet',coord:'Verified GNIS point; the wash is a line, not a point',est:'Catchment above this point ('+A.toLocaleString()+' acres, D8 on 3DEP): '+rng(A)+'. Estimate, not measured.'},
  {id:'city',short:'LHC',name:'Lake Havasu City',lat:34.483901,lon:-114.322455,status:'Existing',coord:'Verified (GNIS)',est:'Not applicable (urban area)'},
  {id:'khii',short:'KHII',name:'Lake Havasu City Airport (KHII)',lat:34.5711,lon:-114.3583,status:'Existing; Class G, non-towered',coord:'Verified (FAA NFDC)',est:'Not applicable. Relevant to drone airspace checks.'},
  {id:'d1',short:'D1',name:'Sub-catchment D1: drone footprint',lat:hydro.drone.outlet[0],lon:hydro.drone.outlet[1],status:'Proposed. Drone orthomosaic pending capture',coord:'Outlet from D8 delineation (approximate)',est:'D1 ('+D1+' acres): '+rng(D1)+'. Estimate, not measured.',prop:true},
  {id:'r1',short:'R1',name:'Recharge basin R1',lat:34.521,lon:-114.286,status:'Proposed / illustrative only',coord:'Approximate; not sited or surveyed',est:'Would receive Falls Springs Wash flow; capacity not designed',prop:true},
  {id:'r2',short:'R2',name:'Recharge basin R2',lat:34.507,lon:-114.236,status:'Proposed / illustrative only',coord:'Approximate; not sited or surveyed',est:'Alluvial-fan site; capacity not designed',prop:true}];
 const dotG=new THREE.SphereGeometry(0.07,12,8),lineM=new THREE.LineBasicMaterial({color:0x1F2328}),dotM=new THREE.MeshBasicMaterial({color:0x1F2328}),dotP=new THREE.MeshBasicMaterial({color:0xFFFFFF});
 M.forEach(m=>{m.elev=elevAt(m.lat,m.lon);const g=v3(m.lat,m.lon,0.02),t=v3(m.lat,m.lon,m.up||0.8);
  const d=new THREE.Mesh(dotG,m.prop?dotP:dotM);d.position.copy(g);scene.add(d);m.dot=d;
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([g,t]),lineM));m.top=t;
  const b=document.createElement('button');b.type='button';b.className='mk'+(m.prop?' prop':'');b.innerHTML='<span class="long">'+m.name+(m.prop?' (proposed)':'')+'</span><span class="short">'+(m.short||m.name)+'</span>';b.setAttribute('aria-label',m.name+(m.prop?' (proposed)':''));b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-expanded','false');
  b.addEventListener('click',()=>openCard(m,b));labelsEl.appendChild(b);m.el=b});
 // estimate bars at Falls Springs outlet
 const bars=[0x9AA0A6,0x2F5D7C,0x9AA0A6].map((c,i)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(0.08,1,0.08),new THREE.MeshBasicMaterial({color:c}));const base=v3(hydro.main.outlet[0],hydro.main.outlet[1]);b.position.set(base.x-0.4+i*0.12,base.y,base.z+0.35);b.userData.base=base.y;scene.add(b);return b});
 const barTarget=[0,0,0];
 window.addEventListener('estimate',e=>{const {lo,mid,hi}=e.detail;[lo,mid,hi].forEach((v,i)=>barTarget[i]=0.03+1.2*Math.sqrt(v/2.2e8));animBars()});
 function animBars(){let t0=performance.now();const from=bars.map(b=>b.scale.y);const step=()=>{const k=RM?1:Math.min(1,(performance.now()-t0)/400);bars.forEach((b,i)=>{const h=from[i]+(barTarget[i]-from[i])*k;b.scale.y=Math.max(h,.01);b.position.y=b.userData.base+h/2});dirty=true;if(k<1)requestAnimationFrame(step)};step()}
 // card
 const card=document.getElementById('mcard'),mcT=document.getElementById('mcTitle'),mcB=document.getElementById('mcBody');let opener=null;
 function openCard(m,b){if(opener)opener.setAttribute('aria-expanded','false');opener=b;b.setAttribute('aria-expanded','true');mcT.textContent=m.name;
  mcB.innerHTML='<dl><dt>Status</dt><dd>'+m.status+'</dd><dt>Elevation</dt><dd>'+Math.round(m.elev)+' m / '+Math.round(m.elev*3.28084).toLocaleString()+' ft (sampled from 3DEP grid)</dd><dt>Coordinates</dt><dd>'+m.lat.toFixed(4)+', '+m.lon.toFixed(4)+'<br>'+m.coord+'</dd><dt>Runoff estimate</dt><dd>'+m.est+'</dd></dl>';
  card.style.display='block';card.querySelector('.x').focus()}
 function closeCard(){card.style.display='none';if(opener){opener.setAttribute('aria-expanded','false');opener.focus();opener=null}}
 card.querySelector('.x').addEventListener('click',closeCard);document.addEventListener('keydown',e=>{if(e.key==='Escape'&&card.style.display==='block')closeCard()});
 // controls & views
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=!RM;controls.dampingFactor=0.08;controls.maxPolarAngle=1.35;controls.minDistance=1.2;controls.maxDistance=70;controls.screenSpacePanning=false;
 const d1c=v3(34.5505,-114.2035),fsc=v3(34.537,-114.235);
 const V={overview:{t:new THREE.Vector3(0,0.3,0),p:new THREE.Vector3(-14,22,26)},catchment:{t:fsc,p:fsc.clone().add(new THREE.Vector3(-6,7,8))},drone:{t:d1c,p:d1c.clone().add(new THREE.Vector3(-1.6,1.9,2.2))},city:{t:v3(34.49,-114.30),p:v3(34.49,-114.30).add(new THREE.Vector3(5,7,9))}};
 let tw=null;
 function go(name,dur=1800){const v=V[name];if(!v)return;if(RM||dur===0){camera.position.copy(v.p);controls.target.copy(v.t);controls.update();dirty=true;return}
  tw={t0:performance.now(),dur,p0:camera.position.clone(),t0v:controls.target.clone(),p1:v.p.clone(),t1:v.t.clone()};kick()}
 window.addEventListener('sceneview',e=>go(e.detail));
 document.getElementById('homeBtn').addEventListener('click',()=>go('overview',1200));
 // source dial
 const ind=document.getElementById('srcInd'),bL=document.getElementById('srcLidar'),bD=document.getElementById('srcDrone'),bT=document.getElementById('texToggle'),tA=document.getElementById('texAttr');
 function setDrone(on){if(state.drone===on)return;state.drone=on;bL.setAttribute('aria-pressed',String(!on));bD.setAttribute('aria-pressed',String(on));
  ind.textContent=on?'Source: Drone orthomosaic, 1–3 cm: PENDING CAPTURE (no data yet; hatched area = planned footprint of sub-catchment D1)':'Source: USGS 3DEP elevation, served as best-available DEM (1 m lidar exists here), shown on a ~50 m mesh';compose()}
 bL.addEventListener('click',()=>{state.manual=true;setDrone(false)});bD.addEventListener('click',()=>{state.manual=true;setDrone(true);go('drone',1200)});
 bT.addEventListener('click',async()=>{if(!sat){bT.disabled=true;try{sat=await img(B+'texture.jpg')}catch(e){console.warn(e)}bT.disabled=false}state.sat=!state.sat&&!!sat;bT.setAttribute('aria-pressed',String(state.sat));
  tA.innerHTML=state.sat?'Imagery: <a href="https://s2maps.eu">Sentinel-2 cloudless 2020 by EOX IT Services GmbH</a> (CC BY-NC-SA 4.0), contains modified Copernicus Sentinel data 2020':'Shading: hillshade, 100 m contours, D8 flow paths';compose()});
 controls.addEventListener('start',()=>{state.manual=false;tw=null});
 controls.addEventListener('change',()=>{dirty=true;if(!state.manual){const near=controls.target.distanceTo(d1c)<1.6&&camera.position.distanceTo(controls.target)<4.5;setDrone(near)}kick()});
 // sizing / loop
 function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();dirty=true;kick()}
 new ResizeObserver(resize).observe(stage);
 let dirty=true,running=false,visible=true;
 new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)kick()}).observe(stage);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick()});
 const tmp=new THREE.Vector3();
 function placeLabels(){const w=stage.clientWidth,h=stage.clientHeight;M.forEach(m=>{m.dot.scale.setScalar(Math.min(1,Math.max(.12,camera.position.distanceTo(m.dot.position)/30)));tmp.copy(m.top).project(camera);const ok=tmp.z<1&&Math.abs(tmp.x)<1.05&&Math.abs(tmp.y)<1.05;m.el.style.display=ok?'':'none';if(ok)m.el.style.transform=`translate(${(tmp.x*.5+.5)*w}px,${(-tmp.y*.5+.5)*h}px) translate(-50%,-100%)`})}
 function frame(){if(!visible||document.hidden){running=false;return}
  let moving=false;if(tw){const k=Math.min(1,(performance.now()-tw.t0)/tw.dur),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;camera.position.lerpVectors(tw.p0,tw.p1,e);controls.target.lerpVectors(tw.t0v,tw.t1,e);if(k>=1)tw=null;moving=true}
  const ch=controls.update();if(ch||moving||dirty){renderer.render(scene,camera);placeLabels();dirty=false}
  if(tw||ch||moving){requestAnimationFrame(frame)}else running=false}
 function kick(){if(!running){running=true;requestAnimationFrame(frame)}}
 compose();resize();
 // gentle settle (skipped under reduced motion)
 camera.position.copy(V.overview.p).multiplyScalar(RM?1:1.12);controls.target.copy(V.overview.t);controls.update();go('overview',RM?0:2200);
 loading.style.display='none';
 if(window.__calc)window.__calc();
 window.__scene={setDrone,go,M};
}
