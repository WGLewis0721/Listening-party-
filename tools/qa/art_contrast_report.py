import json,re,sys
from PIL import Image
from collections import Counter
import os
D=(sys.argv[1] if len(sys.argv)>1 else '.')+'/'
meta=json.load(open(D+'meta.json'))
def L(r,g,b):
    c=[v/255 for v in (r,g,b)]; c=[v/12.92 if v<=.03928 else ((v+.055)/1.055)**2.4 for v in c]; return .2126*c[0]+.7152*c[1]+.0722*c[2]
worst={}; fails=[]; n=0
for m in meta:
    im=Image.open(m['f']).convert('RGB'); W,H=im.size
    for it in m['items']:
        x0,y0=max(0,int(it['x'])),max(0,int(it['y'])); x1,y1=min(W,int(it['x']+it['w'])),min(H,int(it['y']+it['h']))
        if x1-x0<2 or y1-y0<2: continue
        px=list(im.crop((x0,y0,x1,y1)).getdata()); Ls=sorted(L(*p) for p in px); bg=Ls[int(len(Ls)*.95)-1]
        mm=[float(v) for v in re.findall(r'[\d.]+',it['color'])[:3]]
        if it['color'].startswith('color('): mm=[v*255 for v in mm]
        tc=L(*mm)
        ratio=(max(tc,bg)+.05)/(min(tc,bg)+.05); n+=1
        need=3 if it['fs']>=24 else 4.5
        key=(m['id'],m['W'])
        if key not in worst or ratio/need<worst[key][0]/worst[key][4]: worst[key]=(ratio,it['sel'],it['txt'],m['p'],need)
        if ratio<need: fails.append((m['id'],m['W'],it['sel'],round(ratio,1),need,m['p']))
print(f'{n} text elements measured; pass = 4.5 body / 3.0 large (>=24px)')
for k in sorted(worst): v=worst[k]; print(f"  skin {k[0]} @{k[1]:>4}px  tightest {v[0]:.1f}:1 (need {v[4]})  {v[1]} p={v[3]}  {'PASS' if v[0]>=v[4] else 'FAIL'}")
print('failing:',len(fails)); print(Counter((f[0],f[1],f[2]) for f in fails).most_common(12))
