import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { H } from './headers.mjs';
const root=new URL('../',import.meta.url); const IMG=new URL('assets/img/',root);
if(!existsSync(IMG)) mkdirSync(IMG,{recursive:true});
const pages=readdirSync(new URL('demo/',root)).filter(f=>f.endsWith('.html')&&!f.startsWith('preview'));
const san=(u)=>{try{const p=new URL(u);let n=(p.pathname.split('/').pop()||'x').split('?')[0]||'img';n=n.replace(/[^a-zA-Z0-9._-]/g,'_');if(!/\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(n))n+='.jpg';return (Math.abs([...u].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0))%1000000)+'_'+n;}catch{return null;}};
// collect unique image urls
const set=new Set();
for(const p of pages){ const h=readFileSync(new URL('demo/'+p,root),'utf8');
  for(const m of h.matchAll(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif|svg|avif)[^"]*)"/gi)) set.add(m[1]);
}
const list=[...set]; console.error('unique images:',list.length);
const map=new Map(); let ok=0,err=0,i=0;
async function worker(){ while(i<list.length){ const u=list[i++]; const name=san(u); if(!name){continue;} const f=new URL(name,IMG);
  if(!map.has(u)) map.set(u,name);
  if(existsSync(f)){ok++;continue;}
  try{ const ac=new AbortController(); const t=setTimeout(()=>ac.abort(),15000); const r=await fetch(u,{headers:H,signal:ac.signal}); clearTimeout(t); if(r.ok){writeFileSync(f,Buffer.from(await r.arrayBuffer()));ok++;}else{err++;} }catch(e){err++;} } }
await Promise.all(Array.from({length:16},worker));
console.error('downloaded ok',ok,'err',err);
// rewrite pages
for(const p of pages){ let h=readFileSync(new URL('demo/'+p,root),'utf8');
  for(const [u,name] of map){ h=h.split('"'+u+'"').join('"../assets/img/'+name+'"'); }
  writeFileSync(new URL('demo/'+p,root),h);
}
console.error('rewritten',pages.length,'pages');
