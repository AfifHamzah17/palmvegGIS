import openpyxl, re, collections
U='/mnt/user-data/uploads/'
S=lambda x: str(x).strip() if x is not None else ''
ROM={'I':1,'II':2,'III':3,'IV':4,'V':5,'VI':6,'VII':7,'VIII':8,'IX':9,'X':10,'XI':11,'XII':12}
def afd(v):
    v=S(v).upper()
    if v in ROM: return f'AFD{ROM[v]:02d}'
    m=re.search(r'(\d+)',v)
    return f'AFD{int(m.group(1)):02d}' if m else v
def num(v):
    if v is None: return None
    if isinstance(v,(int,float)): return float(v)
    t=S(v).replace(',','.')
    try: return float(t)
    except: return None
def sheet(f,nama,hmatch=('Afdeling','Blok')):
    rows=list(openpyxl.load_workbook(U+f,data_only=True,read_only=True)[nama].iter_rows(values_only=True))
    hi=next(i for i,r in enumerate(rows[:30]) if all(h in [S(x) for x in r] for h in hmatch))
    hdr=[S(x) for x in rows[hi]]
    out=[]
    for r in rows[hi+1:]:
        d={h:r[i] for i,h in enumerate(hdr) if h}
        if S(d.get('Blok')): out.append(d)
    return out
SRC={
 '2025-1':('VEGETATIF_TBM_REG_1_PERIODE_1_2025.xlsx','Detail Seleksi'),
 '2025-2':('VEGETATIF_TBM_REG_1_PERIODE_2_2025.xlsx','Data PICA'),
 '2025-3':('VEGETATIF_TBM_REG_1_PERIODE_3_2025.xlsx','Data PICA'),
 '2026-1':('VEGETATIF_TBM_REG_1_PERIODE_1_2026.xlsx','Data PICA'),
 '2026-2':('VEGETATIF_TBM_REG_1_PERIODE_2_2026.xlsx','Rekap Per Blok'),
}
def semua():
    R={}
    for k,(f,sh) in SRC.items():
        rows=sheet(f,sh)
        R[k]=[d for d in rows if S(d.get('Regional'))=='RPC1']
    return R
