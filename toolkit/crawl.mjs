import { readFileSync, writeFileSync, createWriteStream } from 'node:fs';
import { analyze } from './analyze.mjs';
import { H } from './headers.mjs';

const urls = readFileSync('urls.txt','utf8').split('\n').map(s=>s.trim()).filter(Boolean);
const CONC = 20, TIMEOUT = 15000, RETRIES = 2;
const t0 = Date.now();
const out = createWriteStream('results.ndjson');
let done = 0, ok200 = 0, errs = 0;

function typeOf(u){
  const p = u.replace(/^https?:\/\/[^/]+/,'');
  if (p.startsWith('/product/')) return 'product';
  if (p.startsWith('/catalog/')) return 'catalog';
  if (p.startsWith('/factory/') || p.startsWith('/factories')) return 'factory';
  if (p === '' || p === '/') return 'home';
  return 'other';
}

async function fetchOne(u){
  for (let a=0; a<=RETRIES; a++){
    const ac = new AbortController();
    const to = setTimeout(()=>ac.abort(), TIMEOUT);
    try {
      const res = await fetch(u, { headers:H, redirect:'follow', signal:ac.signal });
      clearTimeout(to);
      const html = (res.status===200) ? await res.text() : '';
      return { ...analyze(u, res.status, html), type: typeOf(u) };
    } catch(e){
      clearTimeout(to);
      if (a===RETRIES) return { url:u, status:0, err:String(e.name||e).slice(0,30), type: typeOf(u) };
      await new Promise(r=>setTimeout(r, 400*(a+1)));
    }
  }
}

let i = 0;
async function worker(){
  while (i < urls.length){
    const idx = i++;
    const r = await fetchOne(urls[idx]);
    out.write(JSON.stringify(r)+'\n');
    done++;
    if (r.status===200) ok200++; else errs++;
    if (done % 2500 === 0){
      const el=(Date.now()-t0)/1000, rate=done/el, eta=Math.round((urls.length-done)/rate);
      console.error(`${done}/${urls.length}  ok=${ok200} err=${errs}  ${rate.toFixed(1)}/s  ETA ${Math.floor(eta/60)}m${eta%60}s`);
    }
  }
}
await Promise.all(Array.from({length:CONC}, worker));
out.end();
console.error(`FETCH DONE in ${((Date.now()-t0)/1000/60).toFixed(1)}min  ok=${ok200} err=${errs} total=${done}`);
writeFileSync('crawl_meta.json', JSON.stringify({total:urls.length, ok200, errs, minutes:((Date.now()-t0)/60000).toFixed(1)}));
