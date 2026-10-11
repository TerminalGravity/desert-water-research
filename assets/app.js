(function(){
const ACC='#2F5D7C',INK='#1F2328',MUT='#555B61',RUST='#8A4B1F',GRID='#E3E3DF';
// Map
try{
 const map=L.map('map',{scrollWheelZoom:false}).setView([34.8,-114.2],9);
 const topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)'}).addTo(map);
 const osm=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
 L.control.layers({'OpenTopoMap':topo,'OpenStreetMap':osm}).addTo(map);
 [[34.4839,-114.3225,'Lake Havasu City','Effluent recharge since 2008'],[34.5489,-114.1885,'Crossman Peak','5,102 ft (1,555 m)'],[34.5515,-114.1944,'Radio towers','~4,712 ft (verified site coordinates)'],[34.5295,-114.2666,'Falls Springs Wash','USGS GNIS point, 1,751 ft'],[35.1894,-114.0530,'Kingman','Hualapai Valley basin'],[35.42,-114.03,'Hualapai Valley (approx.)','INA since Dec 2022'],[34.85,-114.25,'Sacramento Valley (approx.)','Natural recharge ~6,000 acre-ft/yr (USGS)']]
 .forEach(p=>L.circleMarker([p[0],p[1]],{radius:5,color:INK,weight:1.5,fillColor:p[2].includes('approx')?'#fff':ACC,fillOpacity:1}).addTo(map).bindPopup('<b>'+p[2]+'</b><br>'+p[3]));
}catch(e){console.warn('map',e)}
// Charts
Chart.defaults.color=MUT;Chart.defaults.borderColor=GRID;Chart.defaults.font.family='"IBM Plex Sans",Inter,system-ui,sans-serif';Chart.defaults.font.size=12;
Chart.defaults.animation=matchMedia('(prefers-reduced-motion: reduce)').matches?false:{duration:300};
const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
new Chart(document.getElementById('precipChart'),{data:{labels:mo,datasets:[
 {type:'bar',label:'Precipitation normal 1991–2020, Lake Havasu City (in)',data:[0.75,0.61,0.48,0.16,0.03,0.01,0.26,0.38,0.36,0.28,0.30,0.54],backgroundColor:ACC,yAxisID:'y'},
 {type:'line',label:'Pan evaporation, Davis Dam 1948–61, regional proxy (in)',data:[3.54,5.13,7.60,9.30,11.33,13.33,13.14,12.15,9.51,7.24,5.38,3.88],borderColor:RUST,backgroundColor:RUST,borderWidth:1.5,pointRadius:2,yAxisID:'y1'}]},
 options:{maintainAspectRatio:false,scales:{y:{title:{display:true,text:'Precipitation (in)'},max:1},y1:{position:'right',title:{display:true,text:'Pan evaporation (in)'},grid:{display:false}}}}});
new Chart(document.getElementById('budgetChart'),{type:'bar',data:{labels:['Natural recharge','Incidental recharge','Natural discharge','Kingman wells','Foothills Utilities','Personal wells','Agricultural wells'],
 datasets:[{label:'acre-ft/yr',data:[5000,4500,-5600,-8627,-268,-1227,-44252],backgroundColor:c=>c.raw>0?ACC:(c.dataIndex==6?RUST:'#9AA0A6')}]},
 options:{indexAxis:'y',maintainAspectRatio:false,plugins:{legend:{display:false},title:{display:true,text:'Hualapai Valley basin budget, Mohave County 2024 estimate (acre-ft/yr)',color:INK}}}});
// Estimate tool
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('en-US'),r100=n=>Math.round(n/100)*100;
const yc=new Chart($('yieldChart'),{type:'bar',data:{labels:['Your inputs (mid estimate)','1 acre, 4.16 in, C 0.40 (estimate)','Hydrogel panels (low estimate)','1 household-year (~1/3 acre-ft)'],datasets:[{data:[0,45184,0,108617],backgroundColor:[ACC,'#7A9CB3','#9AA0A6','#C9CCCF']}]},
 options:{maintainAspectRatio:false,scales:{y:{type:'logarithmic',title:{display:true,text:'gal/yr (log scale)'}}},plugins:{legend:{display:false},title:{display:true,text:'Estimated gal/yr (formula estimates, not measurements)',color:INK}}}});
function calc(){const A=+$('A').value,P=+$('P').value,C=+$('C').value,E=+$('E').value,H=+$('H').value;
 $('vA').textContent=fmt(A);$('vP').textContent=P.toFixed(2);$('vC').textContent=C.toFixed(2);$('vE').textContent=E;$('vH').textContent=H;
 $('aP').textContent=P.toFixed(2);$('aA').textContent=fmt(A);$('aC').textContent=C.toFixed(2);$('aE').textContent=E;
 const f=c=>A*P*27154*c*(1-E/100),lo=f(.2),mid=f(C),hi=f(.6),hl=H*.53*365,hh=H*1.45*365;
 $('oG').textContent='about '+fmt(r100(lo))+' to '+fmt(r100(hi))+' gal/yr';
 $('oMid').textContent='Midpoint '+fmt(r100(mid))+' gal/yr ('+(mid/325851).toFixed(2)+' acre-ft/yr), after '+E+'% assumed storage loss. Estimate, not a measurement.';
 $('oTbl').innerHTML=[['Low',.2,lo],['Mid',C,mid],['High',.6,hi]].map(x=>'<tr><td>'+x[0]+'</td><td class="n">'+x[1].toFixed(2)+'</td><td class="n">'+fmt(r100(x[2]))+'</td><td class="n">'+(x[2]/325851).toFixed(2)+'</td><td class="n">'+fmt(r100(x[2]/A))+'</td></tr>').join('');
 $('oH').textContent='about '+fmt(hl)+' to '+fmt(hh)+' gal/yr';
 yc.data.datasets[0].data[0]=Math.max(mid,1);yc.data.datasets[0].data[2]=Math.max(hl,1);yc.update('none');
 window.dispatchEvent(new CustomEvent('estimate',{detail:{lo,mid,hi,area:A}}));}
['A','P','C','E','H'].forEach(id=>$(id).addEventListener('input',calc));
document.querySelectorAll('.btn[data-p]').forEach(b=>b.addEventListener('click',()=>{$('P').value=b.dataset.p;calc()}));
document.querySelectorAll('.btn[data-area]').forEach(b=>b.addEventListener('click',()=>{$('A').value=b.dataset.area;calc()}));
window.__calc=calc;calc();
// Scroll-spy + scene views
const links=[...document.querySelectorAll('.toc a[href^="#"]')];let cur=null;
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;const id=e.target.id;
 links.forEach(l=>l.classList.toggle('on',l.getAttribute('href')=='#'+id));
 const v=e.target.dataset.view;if(v&&v!==cur){cur=v;window.dispatchEvent(new CustomEvent('sceneview',{detail:v}))}}),{rootMargin:'-35% 0px -60% 0px'});
document.querySelectorAll('section[id]').forEach(s=>obs.observe(s));
})();
