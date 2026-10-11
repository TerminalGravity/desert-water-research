import json,re,html
refs=json.load(open('tools/refs.json'))
def reflist():
  out=['<ol class="refs">']
  for i,r in enumerate(refs,1):
    links=' '.join(f'<a href="{html.escape(u)}">{html.escape(re.sub(r"^https?://(www\.)?","",u).split("/")[0])}</a>' for u in r[1:])
    out.append(f'<li id="r{i}">{html.escape(r[0])} {links}</li>')
  return '\n'.join(out+['</ol>'])
def cite(s,prefix=''):
  def f(m):
    ns=re.findall(r'\d+',m.group(0))
    for n in ns: assert 1<=int(n)<=len(refs),n
    return '<sup class="c">'+','.join(f'<a href="{prefix}#r{n}" aria-label="Reference {n}">{n}</a>' for n in ns)+'</sup>'
  return re.sub(r'\^(\[\d+\])+',f,s)
for src,dst,pre in [('tools/index.src.html','index.html',''),('tools/protocol.src.html','protocol.html','index.html')]:
  s=open(src).read().replace('{{REFS}}',reflist());s=cite(s,pre)
  assert '^[' not in s
  open(dst,'w').write(s)
print('built',len(refs),'refs')
