(function(){
const G='#C9A24A',T='#2FB5A8',I='#F6F0E4',M='#B8B0A2',W='#E08A4F';
// Map
try{
 const map=L.map('map',{scrollWheelZoom:false}).setView([34.85,-114.2],9);
 const topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)'}).addTo(map);
 const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
 L.control.layers({'OpenTopoMap':topo,'OpenStreetMap':osm}).addTo(map);
 const pts=[[34.4839,-114.3225,'Lake Havasu City','Colorado River city; effluent recharge since 2008',T],
 [34.5489,-114.1885,'Crossman Peak','5,102 ft (1,555 m), highest point of the Mohave Mountains',G],
 [35.1894,-114.0530,'Kingman','Main municipal pumper in the Hualapai Valley basin',I],
 [35.42,-114.03,'Hualapai Valley (approx.)','INA since Dec 2022; ~50,474 AF/yr deficit (county 2024)',W],
 [34.85,-114.25,'Sacramento Valley (approx.)','Natural recharge ~6,000 AF/yr (USGS)',W]];
 pts.forEach(p=>L.circleMarker([p[0],p[1]],{radius:8,color:p[4],fillColor:p[4],fillOpacity:.75,weight:2}).addTo(map).bindPopup('<b>'+p[2]+'</b><br>'+p[3]));
 L.polygon([[34.66,-114.24],[34.62,-114.12],[34.48,-114.08],[34.40,-114.15],[34.45,-114.25],[34.57,-114.28]],{color:G,weight:1,dashArray:'4',fillOpacity:.05}).addTo(map).bindPopup('<b>Mohave Mountains</b> (approximate outline)');
}catch(e){console.warn('map',e)}
// 3D terrain
try{
 const tm=new maplibregl.Map({container:'terrain',center:[-114.19,34.55],zoom:11.3,pitch:65,bearing:-30,maxPitch:80,
  style:{version:8,sources:{topo:{type:'raster',tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png','https://b.tile.opentopomap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,attribution:'© OpenStreetMap contributors, © OpenTopoMap'},
   dem:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:14,attribution:'Terrain Tiles (AWS / USGS 3DEP)'}},
   layers:[{id:'bg',type:'background',paint:{'background-color':'#080D14'}},{id:'topo',type:'raster',source:'topo'}],terrain:{source:'dem',exaggeration:1.5}}});
 tm.addControl(new maplibregl.NavigationControl({visualizePitch:true}));
 new maplibregl.Marker({color:G}).setLngLat([-114.1885,34.5489]).setPopup(new maplibregl.Popup().setText('Crossman Peak, 5,102 ft')).addTo(tm);
 tm.on('error',e=>console.warn('terrain',e&&e.error&&e.error.message));
}catch(e){document.getElementById('terrain').style.display='none';document.getElementById('terrain-fallback').style.display='block'}
// Charts
Chart.defaults.color=M;Chart.defaults.borderColor='#1F2A3A';Chart.defaults.font.family='Inter,system-ui,sans-serif';
const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pr=[0.75,0.61,0.48,0.16,0.03,0.01,0.26,0.38,0.36,0.28,0.30,0.54];
const ev=[3.54,5.13,7.60,9.30,11.33,13.33,13.14,12.15,9.51,7.24,5.38,3.88];
new Chart(document.getElementById('precipChart'),{data:{labels:mo,datasets:[
 {type:'bar',label:'Precipitation, Lake Havasu City (in)',data:pr,backgroundColor:T,yAxisID:'y'},
 {type:'line',label:'Pan evaporation, Davis Dam (in)',data:ev,borderColor:G,backgroundColor:G,tension:.3,yAxisID:'y1'}]},
 options:{maintainAspectRatio:false,scales:{y:{title:{display:true,text:'Precip (in)'},max:1},y1:{position:'right',title:{display:true,text:'Pan evap (in)'},grid:{display:false}}}}});
new Chart(document.getElementById('budgetChart'),{type:'bar',data:{labels:['Natural recharge','Incidental recharge','Natural discharge','Kingman wells','Foothills Utilities','Personal wells','Agricultural wells'],
 datasets:[{label:'2024 update (AF/yr)',data:[5000,4500,-5600,-8627,-268,-1227,-44252],backgroundColor:c=>c.raw>0?T:(c.dataIndex==6?W:G)}]},
 options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:'Hualapai Valley basin budget, 2024 county update: inflow 9,500 vs outflow 59,974 AF/yr',color:I}}}});
// Calculator
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('en-US');
const yc=new Chart($('yieldChart'),{type:'bar',data:{labels:['Your catchment (modeled)','1 acre @ 4.16 in, C=0.4','Hydrogel panels (modeled)','1 home-year (~1/3 AF)'],datasets:[{data:[0,45184,0,108617],backgroundColor:[T,G,'#8f7fd6',M]}]},
 options:{maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:'Gallons per year',color:I}}}});
function calc(){const A=+$('A').value,P=+$('P').value,C=+$('C').value,E=+$('E').value,H=+$('H').value,HY=+$('HY').value;
 $('vA').textContent=A;$('vP').textContent=P.toFixed(2);$('vC').textContent=C.toFixed(2);$('vE').textContent=E;$('vH').textContent=H;$('vHY').textContent=HY.toFixed(2);
 const gross=A*P*27154*C,net=gross*(1-E/100),hy=H*HY*365;
 $('oG').textContent=fmt(net);$('oDet').textContent='Gross runoff '+fmt(gross)+' gal; lost to evaporation '+fmt(gross-net)+' gal; '+(net/325851).toFixed(3)+' acre-feet; '+fmt(net*0.00378541)+' m³.';
 $('oH').textContent=fmt(hy);yc.data.datasets[0].data[0]=net;yc.data.datasets[0].data[2]=hy;yc.update('none');}
['A','P','C','E','H','HY'].forEach(id=>$(id).addEventListener('input',calc));
document.querySelectorAll('.btn[data-p]').forEach(b=>b.addEventListener('click',()=>{$('P').value=b.dataset.p;calc()}));calc();
// nav highlight
const links=[...document.querySelectorAll('nav a[href^="#"]')];
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')=='#'+e.target.id))}),{rootMargin:'-40% 0px -55% 0px'});
document.querySelectorAll('section[id]').forEach(s=>obs.observe(s));
})();
