import { readFileSync, writeFileSync } from 'node:fs';
const lines = readFileSync('results.ndjson','utf8').split('\n').filter(Boolean);
const R = lines.map(l=>{try{return JSON.parse(l)}catch(e){return null}}).filter(Boolean);

const S = { total: R.length, status:{}, byType:{}, errors:0 };
const g200 = R.filter(r=>r.status===200);
const problem = { '404':[], '410':[], '3xx':[], '5xx':[], err:[] };

for (const r of R){
  S.status[r.status]=(S.status[r.status]||0)+1;
  S.byType[r.type]=(S.byType[r.type]||0)+1;
  if(r.status===0){S.errors++; if(problem.err.length<20)problem.err.push(r.url);}
  else if(r.status===404 && problem['404'].length<20) problem['404'].push(r.url);
  else if(r.status===410 && problem['410'].length<20) problem['410'].push(r.url);
  else if(r.status>=300&&r.status<400 && problem['3xx'].length<20) problem['3xx'].push(r.url);
  else if(r.status>=500 && problem['5xx'].length<20) problem['5xx'].push(r.url);
}

const c = { indexable200: g200.length, noindex:0,
  titleMissing:0, titleLong:0, titleSum:0,
  descMissing:0, descLong:0, descShort:0, descSum:0,
  h1_zero:0, h1_multi:0, canonicalMissing:0,
  imgTotal:0, imgNoAlt:0, pagesWithMissingAlt:0,
  hasBreadcrumb:0 };
for (const r of g200){
  if(r.noindex) c.noindex++;
  if(!r.titleLen) c.titleMissing++; else { c.titleSum+=r.titleLen; if(r.titleLen>60)c.titleLong++; }
  if(!r.descLen) c.descMissing++; else { c.descSum+=r.descLen; if(r.descLen>160)c.descLong++; if(r.descLen<70)c.descShort++; }
  if(r.h1===0) c.h1_zero++; if(r.h1>1) c.h1_multi++;
  if(!r.canonical) c.canonicalMissing++;
  c.imgTotal+=r.imgTotal||0; c.imgNoAlt+=r.imgNoAlt||0; if((r.imgNoAlt||0)>0)c.pagesWithMissingAlt++;
  if(r.hasBreadcrumb) c.hasBreadcrumb++;
}
c.titleAvg = Math.round(c.titleSum/(g200.length-c.titleMissing||1));
c.descAvg = Math.round(c.descSum/(g200.length-c.descMissing||1));
c.altMissingPct = c.imgTotal? +(100*c.imgNoAlt/c.imgTotal).toFixed(1):0;

// product pages schema
const prod = g200.filter(r=>r.type==='product');
const prodStats = {
  total: prod.length,
  hasProduct: prod.filter(r=>r.hasProduct).length,
  hasOffer: prod.filter(r=>r.hasOffer).length,
  missingProduct: prod.filter(r=>!r.hasProduct).length,
};
// per-type 200 counts
const typ200={}; for(const r of g200) typ200[r.type]=(typ200[r.type]||0)+1;

const out = { crawl:S, content:c, products:prodStats, type200:typ200, problem };
writeFileSync('summary.json', JSON.stringify(out,null,2));

const pct=(n,d)=>d?((100*n/d).toFixed(1)+'%'):'—';
console.log(`
=== CRAWL ${S.total} URLs ===
Status: ${JSON.stringify(S.status)}
By type: ${JSON.stringify(S.byType)}
Errors(net): ${S.errors}

=== 200 pages: ${g200.length} ===
noindex: ${c.noindex}
Title:  missing ${c.titleMissing}, >60 chars ${c.titleLong} (${pct(c.titleLong,g200.length)}), avg ${c.titleAvg}
Desc:   missing ${c.descMissing} (${pct(c.descMissing,g200.length)}), >160 ${c.descLong} (${pct(c.descLong,g200.length)}), <70 ${c.descShort}, avg ${c.descAvg}
H1:     zero ${c.h1_zero}, multiple ${c.h1_multi} (${pct(c.h1_multi,g200.length)})
Canonical missing: ${c.canonicalMissing}
Breadcrumb markup: ${c.hasBreadcrumb} (${pct(c.hasBreadcrumb,g200.length)})
Images: total ${c.imgTotal}, no-alt ${c.imgNoAlt} (${c.altMissingPct}%), pages w/ missing-alt ${c.pagesWithMissingAlt} (${pct(c.pagesWithMissingAlt,g200.length)})

=== PRODUCT pages: ${prodStats.total} ===
with Product schema: ${prodStats.hasProduct} (${pct(prodStats.hasProduct,prodStats.total)})
with Offer schema:   ${prodStats.hasOffer}
MISSING Product:     ${prodStats.missingProduct} (${pct(prodStats.missingProduct,prodStats.total)})

Dead in sitemap: 404=${S.status['404']||0} 410=${S.status['410']||0} 3xx=${(Object.entries(S.status).filter(([k])=>+k>=300&&+k<400).reduce((a,[,v])=>a+v,0))} 5xx=${(Object.entries(S.status).filter(([k])=>+k>=500).reduce((a,[,v])=>a+v,0))}
`);
