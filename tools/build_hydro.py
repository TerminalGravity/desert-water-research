"""D8 flow accumulation + catchment delineation on USGS 3DEP (ImageServer, ~25 m grid).
Outputs assets/terrain/: flow.png (RGBA channel overlay), catch_main.png, catch_drone.png (RGBA masks), hydro.json"""
import io,json,math,urllib.request,numpy as np
from PIL import Image
S,N,W,E=34.40,34.65,-114.40,-114.05
GW,GH=1280,1120
url=f"https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox={W},{S},{E},{N}&bboxSR=4326&imageSR=4326&size={GW},{GH}&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image"
H=np.array(Image.open(io.BytesIO(urllib.request.urlopen(url,timeout=90).read()))).astype(np.float64)
wm=(E-W)*111320*math.cos(math.radians((S+N)/2));hm=(N-S)*110950;dx,dy=wm/(GW-1),hm/(GH-1)
# priority-flood depression fill (Barnes et al. 2014) with epsilon
import heapq
F=H.copy();seen=np.zeros(H.shape,bool);pq=[]
for r in range(GH):
  for c in (0,GW-1): heapq.heappush(pq,(F[r,c],r,c));seen[r,c]=True
for c in range(1,GW-1):
  for r in (0,GH-1): heapq.heappush(pq,(F[r,c],r,c));seen[r,c]=True
nb=[(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
while pq:
  z,r,c=heapq.heappop(pq)
  for a,b in nb:
    rr,cc=r+a,c+b
    if 0<=rr<GH and 0<=cc<GW and not seen[rr,cc]:
      seen[rr,cc]=True
      if F[rr,cc]<=z: F[rr,cc]=z+1e-4
      heapq.heappush(pq,(F[rr,cc],rr,cc))
# D8 directions
dist=[math.hypot(a*dy,b*dx) for a,b in nb]
P=np.pad(F,1,constant_values=-1e9)
drops=np.stack([(F-P[1+a:1+a+GH,1+b:1+b+GW])/d for (a,b),d in zip(nb,dist)])
D=np.argmax(drops,0);D[np.max(drops,0)<=0]=-1
# accumulation: process high->low
order=np.argsort(-F,axis=None);acc=np.ones(GH*GW)
Dr=np.array([a for a,b in nb]);Dc=np.array([b for a,b in nb]);Df=D.ravel()
for i in order:
  d=Df[i]
  if d<0: continue
  r,c=divmod(i,GW);rr,cc=r+Dr[d],c+Dc[d]
  if 0<=rr<GH and 0<=cc<GW: acc[rr*GW+cc]+=acc[i]
A=acc.reshape(GH,GW);cell=dx*dy
def rc(lat,lon): return int(round((N-lat)/(N-S)*(GH-1))),int(round((lon-W)/(E-W)*(GW-1)))
def snap(lat,lon,rad):
  r,c=rc(lat,lon);w=A[max(r-rad,0):r+rad+1,max(c-rad,0):c+rad+1];k=np.unravel_index(np.argmax(w),w.shape);return max(r-rad,0)+k[0],max(c-rad,0)+k[1]
def upstream(r0,c0):
  m=np.zeros((GH,GW),bool);m[r0,c0]=True;stack=[(r0,c0)]
  while stack:
    r,c=stack.pop()
    for k,(a,b) in enumerate(nb):
      rr,cc=r-a,c-b
      if 0<=rr<GH and 0<=cc<GW and not m[rr,cc] and D[rr,cc]==k: m[rr,cc]=True;stack.append((rr,cc))
  return m
def ll(r,c): return round(N-r/(GH-1)*(N-S),5),round(W+c/(GW-1)*(E-W),5)
out={}
# main: Falls Springs Wash at GNIS point (34.529456,-114.266620), snapped to max accumulation within ~150 m
r0,c0=snap(34.529456,-114.266620,6);M=upstream(r0,c0)
out['main']=dict(name='Falls Springs Wash catchment above GNIS point',outlet=ll(r0,c0),area_km2=round(M.sum()*cell/1e6,2),area_acres=round(M.sum()*cell/4046.856),max_elev_m=round(float(H[M].max()),1),min_elev_m=round(float(H[M].min()),1))
# drone sub-catchment: illustrative small tributary pour point near the road end below the radio towers
r1,c1=snap(34.548,-114.205,4);Md=upstream(r1,c1)
out['drone']=dict(name='Sub-catchment D1 (proposed drone survey footprint)',outlet=ll(r1,c1),area_km2=round(Md.sum()*cell/1e6,3),area_acres=round(Md.sum()*cell/4046.856),max_elev_m=round(float(H[Md].max()),1),min_elev_m=round(float(H[Md].min()),1))
out['grid']=[GW,GH];out['cell_m']=[round(dx,1),round(dy,1)];out['method']='Priority-flood fill + D8 flow accumulation on USGS 3DEP ImageServer export resampled to this grid'
# overlays at 2x grid
SC=2
la=np.log10(A*cell)  # contributing area m2
chan=np.clip((la-5.0)/2.5,0,1)  # starts ~0.1 km2
ov=np.zeros((GH,GW,4),np.uint8);ov[...,0]=40;ov[...,1]=88;ov[...,2]=124;ov[...,3]=(chan*235).astype(np.uint8)
ov[H<139.5,3]=0
Image.fromarray(ov).resize((GW*SC,GH*SC),Image.BILINEAR).save('assets/terrain/flow.png',optimize=True)
def maskimg(m,fill,edge,hatch=False):
  mm=np.array(Image.fromarray(m.astype(np.uint8)*255).resize((GW*SC,GH*SC),Image.NEAREST))>0
  e=mm^(np.roll(mm,1,0)&np.roll(mm,-1,0)&np.roll(mm,1,1)&np.roll(mm,-1,1))
  e=e|np.roll(e,1,0)|np.roll(e,1,1)
  o=np.zeros(mm.shape+(4,),np.uint8)
  o[mm]=fill
  if hatch:
    yy,xx=np.indices(mm.shape);h=((xx+yy)%10)<2;o[mm&h]=edge[:3]+(150,)
  o[e]=edge
  return Image.fromarray(o)
maskimg(M,(47,93,124,38),(47,93,124,235)).save('assets/terrain/catch_main.png',optimize=True)
maskimg(Md,(255,255,255,40),(31,35,40,255),hatch=True).save('assets/terrain/catch_drone.png',optimize=True)
json.dump(out,open('assets/terrain/hydro.json','w'),indent=1);print(json.dumps(out,indent=1))
