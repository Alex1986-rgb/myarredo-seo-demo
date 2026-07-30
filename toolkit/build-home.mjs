import { readFileSync, writeFileSync } from 'node:fs';
import { H } from './headers.mjs';
const root=new URL('../',import.meta.url);
function bal(html,open,repl){const s=html.indexOf(open);if(s<0)return html;const re=/<div\b|<\/div>/g;re.lastIndex=s;let d=0,m,e=-1;while((m=re.exec(html))){if(m[0]==='</div>'){d--;if(d===0){e=re.lastIndex;break;}}else d++;}return e<0?html:html.slice(0,s)+repl+html.slice(e);}
const url='https://www.myarredo.by/';
let html=await (await fetch(url,{headers:H})).text();
html=html.replace(/<head([^>]*)>/i,m=>m+`\n<base href="${url}">`);
html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>Итальянская мебель в Минске — купить мебель из Италии | Myarredo</title>');
html=html.replace(/<meta\s+name=["']description["'][^>]*>/i,'<meta name="description" content="Итальянская мебель в Минске по фабричным ценам: кухни, гостиные, спальни, мягкая мебель, стулья. Прямые поставки с фабрик Италии, доставка по Беларуси.">');
html=bal(html,'<div class="best-price">',readFileSync(new URL('templates/home-promo.html',root),'utf8'));
const css=readFileSync(new URL('templates/category-seo.css.html',root),'utf8');
const seoBlock=readFileSync(new URL('templates/home-seo-block.html',root),'utf8');
html=bal(html,'<div class="post-cont">',css+seoBlock);

// --- JSON-LD: WebSite (+SearchAction) + FAQPage from the home SEO FAQ ---
const esc=s=>s.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').replace(/"/g,'\\"').trim();
const faqs=[...seoBlock.matchAll(/<div class="q">[\s\S]*?<\/span>([\s\S]*?)<\/div>\s*<div class="a">([\s\S]*?)<\/div>/g)]
  .map(m=>`{"@type":"Question","name":"${esc(m[1])}","acceptedAnswer":{"@type":"Answer","text":"${esc(m[2])}"}}`);
const ld=`<script type="application/ld+json">${JSON.stringify({
  "@context":"https://schema.org","@type":"WebSite","name":"Myarredo","url":url,
  "inLanguage":"ru-BY",
  "potentialAction":{"@type":"SearchAction","target":url+"search/?q={search_term_string}","query-input":"required name=search_term_string"}
})}</script>\n<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${faqs.join(',')}]}</script>`;
html=html.replace(/<\/head>/i, ld+'\n</head>');

writeFileSync(new URL('demo/home.html',root),html);
console.error('home JS-on rebuilt',html.length,'| FAQPage items:',faqs.length);
