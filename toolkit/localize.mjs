import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { H } from './headers.mjs';
const root = new URL('../', import.meta.url);
const ASSETS = new URL('assets/', root), CSSDIR = new URL('assets/css/', root), FDIR = new URL('assets/f/', root);
for (const d of [ASSETS,CSSDIR,FDIR]) if(!existsSync(d)) mkdirSync(d,{recursive:true});
const PAGES = ['home.html','product-arketipo-lotus.html','category-mebel-dlya-kuhni.html','category-mebel-dlya-spalni.html','category-mebel-dlya-gostinoj.html','category-myagkaya-mebel.html','category-mebel-dlya-stolovoj.html','category-svetilniki.html','category-stulya.html'];

const abs = (u, base) => {
  if(!u) return null;
  if(u.startsWith('data:')||u.startsWith('#')||u.startsWith('mailto:')||u.startsWith('tel:')||u.startsWith('javascript:')) return null;
  if(u.startsWith('//')) return 'https:'+u;
  if(u.startsWith('http')) return u;
  try { return new URL(u, base).href; } catch { return null; }
};
const san = (u) => { const p=new URL(u); let n=(p.pathname.split('/').pop()||'x').split('?')[0]||'x'; n=n.replace(/[^a-zA-Z0-9._-]/g,'_'); return (Math.abs([...u].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0))%100000)+'_'+n; };

const cache = new Map(); // absurl -> localfilename (in f/)
async function dl(u, dir, name){
  const f = new URL(name, dir);
  if(existsSync(f)) return true;
  try { const r=await fetch(u,{headers:H}); if(!r.ok){console.error('  miss',r.status,u.slice(0,70));return false;} const b=Buffer.from(await r.arrayBuffer()); writeFileSync(f,b); return true; }
  catch(e){ console.error('  err',u.slice(0,70)); return false; }
}
async function fetchDep(u){ // download a css url() dep into f/, return local name or null
  if(cache.has(u)) return cache.get(u);
  const name=san(u); const ok=await dl(u,FDIR,name); const res= ok? name : null; cache.set(u,res); return res;
}
async function processCss(cssUrl, localName){
  const f=new URL(localName,CSSDIR); let css=readFileSync(f,'utf8'); const seen=new Set();
  const urls=[...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)].map(m=>m[2]).concat([...css.matchAll(/@import\s+(['"])([^'"]+)\1/g)].map(m=>m[2]));
  for (const raw of urls){ if(seen.has(raw))continue; seen.add(raw); const a=abs(raw,cssUrl); if(!a)continue; const ln=await fetchDep(a); if(ln) css=css.split(raw).join('../f/'+ln); }
  writeFileSync(f,css);
}

// 1) collect stylesheet hrefs from all pages (dedupe)
const cssMap=new Map(); // origHref -> localName
for (const p of PAGES){
  const html=readFileSync(new URL('demo/'+p,root),'utf8');
  const base=(html.match(/<base[^>]+href="([^"]+)"/i)||[])[1]||'https://www.myarredo.by/';
  for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/gi)){
    const href=(m[0].match(/href="([^"]+)"/)||[])[1]; if(!href) continue;
    if(cssMap.has(href)) continue;
    const a=abs(href,base); if(!a){cssMap.set(href,null);continue;}
    const name=san(a)+'.css'; cssMap.set(href,{name,a});
  }
}
console.error('unique css:',cssMap.size);
for (const [href,info] of cssMap){ if(!info) continue; if(!existsSync(new URL(info.name,CSSDIR))){ const ok=await dl(info.a,CSSDIR,info.name); if(ok){ await processCss(info.a,info.name); console.error('css ok',info.name);} } }

// 2) rewrite each page
const FV='<style id="fv">*{opacity:1!important;visibility:visible!important}[data-aos],[class*="aos"],[class*="animate"],[class*="reveal"],[class*="fade"],[class*="wow"]{opacity:1!important;transform:none!important;animation:none!important;transition:none!important}</style>';
for (const p of PAGES){
  let html=readFileSync(new URL('demo/'+p,root),'utf8');
  html=html.replace(/<base[^>]*>/i,'');
  for (const [href,info] of cssMap){ if(info) html=html.split('href="'+href+'"').join('href="../assets/css/'+info.name+'"'); }
  html=html.replace(/<script\b(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/gi,'');
  // absolutize protocol-relative and root-relative (skip our ../assets)
  html=html.replace(/(src|href|data-src|poster)="\/\/([^"]+)"/gi,'$1="https://$2"');
  html=html.replace(/(src|href|data-src|poster)="\/(?!\/)([^"]*)"/gi,'$1="https://www.myarredo.by/$2"');
  html=html.replace(/<\/head>/i, FV+'</head>');
  writeFileSync(new URL('demo/'+p,root),html);
  console.error('rewrote',p);
}
console.error('DONE');
