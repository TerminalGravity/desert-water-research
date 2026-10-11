"""Build terrain assets for the 3D panel.
Elevation: USGS 3DEP Elevation ImageServer (exportImage, best-available 3DEP DEM, resampled server-side).
Imagery (optional toggle): Sentinel-2 cloudless 2020 by EOX (CC BY-NC-SA 4.0).
Outputs in assets/terrain/: height.bin (uint16 LE decimeters, row 0 = north), hillshade.png, texture.jpg, meta.json"""
import math,io,json,os,urllib.request,numpy as np
from PIL import Image,ImageDraw
S,N,W,E=34.40,34.65,-114.40,-114.05
GW,GH=640,560
os.makedirs('assets/terrain',exist_ok=True)
url=f"https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?bbox={W},{S},{E},{N}&bboxSR=4326&imageSR=4326&size={GW},{GH}&format=tiff&pixelType=F32&interpolation=RSP_BilinearInterpolation&f=image"
H=np.array(Image.open(io.BytesIO(urllib.request.urlopen(url,timeout=60).read()))).astype(np.float64)
H=np.clip(H,0,None)
np.round(H*10).astype('<u2').tofile('assets/terrain/height.bin')
wm=(E-W)*111320*math.cos(math.radians((S+N)/2)); hm=(N-S)*110950
dx,dy=wm/(GW-1),hm/(GH-1)
# hillshade (az 315, alt 45) + hypsometric neutral tint + 100 m contours
gy,gx=np.gradient(H,dy,dx)
slope=np.arctan(np.hypot(gx,gy)); aspect=np.arctan2(-gx,gy)
az,alt=math.radians(315),math.radians(45)
hs=np.sin(alt)*np.cos(slope)+np.cos(alt)*np.sin(slope)*np.cos(az-aspect)
hs=np.clip(hs,0,1)
t=(H-H.min())/(H.max()-H.min())
base=np.stack([228-40*t,224-48*t,214-54*t],-1)  # warm light gray -> taupe
water=H<139.5
img=base*(0.55+0.45*hs[...,None])
img[water]=[196,210,220]
SC=3
big=Image.fromarray(img.clip(0,255).astype(np.uint8)).resize((GW*SC,GH*SC),Image.BICUBIC)
Hb=np.array(Image.fromarray(H.astype(np.float32),'F').resize((GW*SC,GH*SC),Image.BILINEAR))
lv=np.floor(Hb/100)
edge=(np.diff(lv,axis=0,prepend=lv[:1])!=0)|(np.diff(lv,axis=1,prepend=lv[:,:1])!=0)
major=(np.floor(Hb/500)!=np.floor(np.roll(Hb,1,0)/500))|(np.floor(Hb/500)!=np.floor(np.roll(Hb,1,1)/500))
a=np.array(big).astype(np.float64)
a[edge&~(Hb<139.5)]*=0.78; a[major&~(Hb<139.5)]*=0.7
Image.fromarray(a.clip(0,255).astype(np.uint8)).save('assets/terrain/hillshade.jpg',quality=85)
def tx(lon,z): return (lon+180)/360*2**z
def ty(lat,z): r=math.radians(lat); return (1-math.log(math.tan(r)+1/math.cos(r))/math.pi)/2*2**z
z=13;x0,x1=int(tx(W,z)),int(tx(E,z));y0,y1=int(ty(N,z)),int(ty(S,z))
tex=Image.new('RGB',((x1-x0+1)*256,(y1-y0+1)*256))
for x in range(x0,x1+1):
  for y in range(y0,y1+1):
    r=urllib.request.Request(f'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',headers={'User-Agent':'desert-water-research/1.0'})
    tex.paste(Image.open(io.BytesIO(urllib.request.urlopen(r,timeout=30).read())),((x-x0)*256,(y-y0)*256))
# reproject Web Mercator rows to linear-latitude rows
out=Image.new('RGB',(2048,1792));src=np.array(tex);o=np.zeros((1792,2048,3),np.uint8)
cols=((tx(np.linspace(W,E,2048),z)-x0)*256).astype(int).clip(0,src.shape[1]-1)
for i,lat in enumerate(np.linspace(N,S,1792)):
  o[i]=src[int((ty(lat,z)-y0)*256),cols]
Image.fromarray(o).save('assets/terrain/texture.jpg',quality=78)
meta=dict(bounds=dict(s=S,n=N,w=W,e=E),grid=[GW,GH],width_m=round(wm),height_m=round(hm),cell_m=[round(dx,1),round(dy,1)],min_m=round(float(H.min()),1),max_m=round(float(H.max()),1),
 elevation_source='USGS 3DEP Elevation ImageServer exportImage (best-available 3DEP DEM, bilinear resample to grid)',imagery_source='Sentinel-2 cloudless 2020 by EOX IT Services GmbH (CC BY-NC-SA 4.0), contains modified Copernicus Sentinel data 2020',encoding='uint16 LE decimeters, row 0 = north, linear lat/lon grid')
json.dump(meta,open('assets/terrain/meta.json','w'),indent=1);print(meta)
