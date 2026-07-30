import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { H } from './headers.mjs';
const root=new URL('../',import.meta.url);
const CSS=readFileSync(new URL('templates/category-seo.css.html',root),'utf8');
const PD='<style>.pd-mod{font-family:\'PT Sans\',system-ui,Arial,sans-serif;color:#2a2a2a}.pd-mod p{margin:0 0 12px;font-size:15.5px;line-height:1.7;text-align:justify}.pd-mod b{color:#111}.pd-mod .pd-spec{border-collapse:collapse;width:100%;max-width:620px;margin:8px 0}.pd-mod .pd-spec td{border:1px solid #e3e3e3;padding:8px 12px;font-size:14.5px}.pd-mod .pd-spec td:first-child{width:40%;color:#666;background:#f7faf7}.pd-cap{font-weight:700;color:#1f7a34;font-size:15px;margin:16px 0 6px}.pd-links{margin:12px 0}.pd-links a{display:inline-block;margin:0 6px 6px 0;padding:5px 12px;background:#f4f7f4;border:1px solid #d7e6d9;border-radius:16px;color:#1f7a34;text-decoration:none;font-size:14px}</style>';
const prods=JSON.parse(readFileSync(new URL('category-blocks/products/_chosen8.json',root),'utf8'));
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clip=(s,n)=>{s=(s||'').trim();return s.length<=n?s:s.slice(0,n-1).replace(/\s+\S*$/,'')+'…';};
function bal(html,open){const s=html.indexOf(open);if(s<0)return null;const re=/<div\b|<\/div>/g;re.lastIndex=s;let d=0,m,e=-1;while((m=re.exec(html))){if(m[0]==='</div>'){d--;if(d===0){e=re.lastIndex;break;}}else d++;}return e<0?null:[s,e];}
const made=[];
for(const p of prods){
  const topF=new URL('category-blocks/products/'+p.slug+'-top.html',root), seoF=new URL('category-blocks/products/'+p.slug+'-seo.html',root);
  if(!existsSync(topF)||!existsSync(seoF)){console.error('missing blocks',p.slug);continue;}
  const top=readFileSync(topF,'utf8'), seo=readFileSync(seoF,'utf8');
  let html=await (await fetch(p.url,{headers:H})).text();
  html=html.replace(/<head([^>]*)>/i,m=>m+`\n<base href="${p.url}">`);
  const h2=(seo.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)||[])[1]?.replace(/<[^>]+>/g,'').trim()||p.name;
  const title=clip(h2.replace(/ — купить в Минске.*/,'')+' — купить в Минске | Myarredo',60);
  const desc=clip(`${p.name}. ${p.material}. ${p.dims}. Под заказ, доставка по Беларуси. Myarredo.`,158);
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)}</title>`);
  html=html.replace(/<meta\s+name=["']description["'][^>]*>/i,`<meta name="description" content="${esc(desc)}">`);
  // FAQPage from seo faq-cards
  const faqs=[...seo.matchAll(/<div class="q">[\s\S]*?<\/span>([\s\S]*?)<\/div>\s*<div class="a">([\s\S]*?)<\/div>/g)].map(m=>[m[1].replace(/<[^>]+>/g,'').trim(),m[2].replace(/<[^>]+>/g,'').trim()]);
  const ld=`\n<script type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":${JSON.stringify(p.name)},"sku":${JSON.stringify(p.art)},"brand":{"@type":"Brand","name":${JSON.stringify(p.brand)}},"material":${JSON.stringify(p.material)},"description":${JSON.stringify(desc)},"offers":{"@type":"Offer","url":${JSON.stringify(p.url)},"priceCurrency":"BYN","availability":"https://schema.org/PreOrder","seller":{"@type":"Organization","name":"Myarredo"}}}<\/script>`+
  (faqs.length?`\n<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org/","@type":"FAQPage","mainEntity":faqs.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))})}<\/script>`:'');
  html=html.replace(/<\/head>/i, ld+'\n</head>');
  // replace .prod-descr with top
  const span=bal(html,'<div class="prod-descr"');
  const topBlock=`<div class="prod-descr" itemprop="description">${PD}${top}</div>`;
  if(span) html=html.slice(0,span[0])+topBlock+html.slice(span[1]);
  // inject seo before footer
  const FOOT='<div class="footer jsftr" data-url="https://www.myarredo.by/forms/ajax-get-form-feedback/">';
  const fi=html.indexOf(FOOT); const seoBlock=CSS+seo;
  html = fi>=0 ? html.slice(0,fi)+seoBlock+html.slice(fi) : html.replace(/<\/body>/i,seoBlock+'</body>');
  writeFileSync(new URL('demo/product-'+p.slug+'.html',root),html);
  made.push({slug:p.slug,name:p.name,brand:p.brand});
  console.error('assembled',p.slug);
}
writeFileSync(new URL('category-blocks/products/_made.json',root),JSON.stringify(made));
console.error('UNIQUE PRODUCTS:',made.length);
