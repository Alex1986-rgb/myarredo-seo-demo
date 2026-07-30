import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { H } from './headers.mjs';
const root = new URL('../', import.meta.url);
const CSS = readFileSync(new URL('templates/category-seo.css.html', root),'utf8');
const urls = readFileSync(new URL('../product_sample.txt', root),'utf8').trim().split('\n').filter(Boolean);

const san=(u)=>{const p=new URL(u);let n=(p.pathname.split('/').pop()||'x').split('?')[0]||'x';n=n.replace(/[^a-zA-Z0-9._-]/g,'_');return (Math.abs([...u].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0))%100000)+'_'+n;};
const absU=(u,base)=>{try{if(u.startsWith('//'))return 'https:'+u;if(u.startsWith('http'))return u;return new URL(u,base).href;}catch{return null;}};
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const clip=(s,n)=>{s=(s||'').trim();return s.length<=n?s:s.slice(0,n-1).replace(/\s+\S*$/,'')+'…';};

const FV='<style id="fv">*{opacity:1!important;visibility:visible!important}[data-aos],[class*="aos"],[class*="animate"],[class*="reveal"],[class*="fade"],[class*="wow"]{opacity:1!important;transform:none!important;animation:none!important;transition:none!important}.preloader-container,.preloader,.page-loader,#preloader,.mobile-openbg{display:none!important}</style>';

function localize(html, base){
  html=html.replace(/<base[^>]*>/i,'');
  for(const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/gi)){
    const href=(m[0].match(/href="([^"]+)"/)||[])[1]; if(!href)continue;
    const a=absU(href,base); if(!a)continue; const name=san(a)+'.css';
    if(existsSync(new URL('assets/css/'+name,root))) html=html.split('href="'+href+'"').join('href="../assets/css/'+name+'"');
  }
  html=html.replace(/<script\b(?![^>]*application\/ld\+json)[\s\S]*?<\/script>/gi,'');
  html=html.replace(/(src|href|data-src|poster)="\/\/([^"]+)"/gi,'$1="https://$2"');
  html=html.replace(/(src|href|data-src|poster)="\/(?!\/)([^"]*)"/gi,'$1="https://www.myarredo.by/$2"');
  html=html.replace(/<img\b([^>]*?)>/gi,(m,a)=>/(^|\s)alt\s*=/.test(a)?m:`<img${a} alt="${''}">`);
  html=html.replace(/<\/head>/i, FV+'</head>');
  return html;
}
function balancedReplace(html, openTag, repl){
  const s=html.indexOf(openTag); if(s<0) return html;
  const re=/<div\b|<\/div>/g; re.lastIndex=s; let d=0,m,end=-1;
  while((m=re.exec(html))){ if(m[0]==='</div>'){d--; if(d===0){end=re.lastIndex;break;}} else d++; }
  if(end<0) return html; return html.slice(0,s)+repl+html.slice(end);
}

let made=[];
for (const url of urls){
  let html; try{ html=await (await fetch(url,{headers:H})).text(); }catch(e){ console.error('skip',url); continue; }
  if(!/<div class="prod-descr"/.test(html)){ console.error('no descr',url); continue; }
  const g=(re)=>{const m=html.match(re);return m?m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim():'';};
  const chars={};
  for(const m of html.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)) chars[m[1].trim()]=m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const name=g(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if(!name) continue;
  const brand=chars['Фабрика']||'', coll=chars['Коллекция']||'', art=chars['Артикул']||'', style=chars['Стиль']||'', mat=chars['Материал']||'', dims=chars['Размеры']||'', type=chars['Типы мебели']||name.split(' ').slice(0,2).join(' ');
  const short=name.length>40?name.split(' ').slice(0,4).join(' '):name;
  let title=`${type} ${brand} — купить в Минске | Myarredo`;
  if(title.length>60) title=`${brand} ${art} — Myarredo Минск`;
  title=clip(title,60);
  const desc=clip(`${name}. Материал: ${mat}. ${dims}. Итальянская мебель под заказ, доставка по Беларуси.`,158);
  const slug=url.replace(/\/$/,'').split('/').pop();
  const img=(html.match(/<link href="([^"]+)" itemprop="contentUrl">/)||html.match(/itemprop="image"[^>]*src="([^"]+)"/)||[])[1]||'';

  // head opts
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)}</title>`);
  html=html.replace(/<meta\s+name=["']description["'][^>]*>/i,`<meta name="description" content="${esc(desc)}">`);
  const ld=`
<script type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":${JSON.stringify(name)},"sku":${JSON.stringify(art)},"image":[${JSON.stringify(img)}],"description":${JSON.stringify(desc)},"brand":{"@type":"Brand","name":${JSON.stringify(brand)}},"material":${JSON.stringify(mat)},"offers":{"@type":"Offer","url":${JSON.stringify(url)},"priceCurrency":"BYN","availability":"https://schema.org/PreOrder","seller":{"@type":"Organization","name":"Myarredo"}}}<\/script>
<script type="application/ld+json">{"@context":"https://schema.org/","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Главная","item":"https://www.myarredo.by/"},{"@type":"ListItem","position":2,"name":"Каталог","item":"https://www.myarredo.by/catalog/"},{"@type":"ListItem","position":3,"name":${JSON.stringify(name)}}]}<\/script>`;
  html=html.replace(/<\/head>/i, ld+'\n</head>');

  // top description block
  const top=`<div class="prod-descr" data-product-description itemprop="description"><style>.pd-mod{font-family:'PT Sans',system-ui,Arial,sans-serif;color:#2a2a2a}.pd-mod p{margin:0 0 12px;font-size:15.5px;line-height:1.7;text-align:justify}.pd-mod b{color:#111}.pd-mod .pd-spec{border-collapse:collapse;width:100%;max-width:620px;margin:8px 0}.pd-mod .pd-spec td{border:1px solid #e3e3e3;padding:8px 12px;font-size:14.5px}.pd-mod .pd-spec td:first-child{width:40%;color:#666;background:#f7faf7}.pd-cap{font-weight:700;color:#1f7a34;font-size:15px;margin:16px 0 6px}.pd-links{margin:12px 0}.pd-links a{display:inline-block;margin:0 6px 6px 0;padding:5px 12px;background:#f4f7f4;border:1px solid #d7e6d9;border-radius:16px;color:#1f7a34;text-decoration:none;font-size:14px}</style>
<div class="pd-mod">
<p><b>${esc(name)}</b> — итальянская мебель фабрики <b>${esc(brand)}</b>${coll?` из коллекции <b>${esc(coll)}</b>`:''}. Модель выполнена в ${esc(style.toLowerCase()||'современном')} стиле и поставляется под заказ напрямую с фабрики в Италии.</p>
<p>Материал — <b>${esc(mat)}</b>. Габариты: ${esc(dims)}. Myarredo организует доставку по Минску и всей Беларуси, поможет подобрать отделку и рассчитает точную стоимость под вашу конфигурацию.</p>
<div class="pd-cap">Характеристики</div>
<table class="pd-spec"><tbody>
<tr><td>Фабрика</td><td>${esc(brand)}</td></tr>${coll?`<tr><td>Коллекция</td><td>${esc(coll)}</td></tr>`:''}
<tr><td>Тип</td><td>${esc(type)}</td></tr>${style?`<tr><td>Стиль</td><td>${esc(style)}</td></tr>`:''}
<tr><td>Материал</td><td>${esc(mat)}</td></tr><tr><td>Размеры</td><td>${esc(dims)}</td></tr>
<tr><td>Артикул</td><td>${esc(art)}</td></tr><tr><td>Наличие</td><td>Под заказ</td></tr>
</tbody></table>
<div class="pd-links">Смотрите также:
<a href="https://www.myarredo.by/catalog/">Каталог</a>
<a href="https://www.myarredo.by/sale/">Распродажа</a>
<a href="https://www.myarredo.by/factory/${esc((brand||'').toLowerCase().replace(/[^a-z0-9]+/g,'-'))}/">Фабрика ${esc(brand)}</a>
</div></div></div>`;
  html=balancedReplace(html,'<div class="prod-descr"',top);

  // bottom SEO block (grounded, templated)
  const matList=(mat||'').split(/[;,]/).map(s=>s.trim()).filter(Boolean);
  const matRows=matList.map(m=>`<tr><td><b>${esc(m)}</b></td><td>Натуральный, долговечный материал; уход — мягкая сухая ткань без абразивов.</td></tr>`).join('')||`<tr><td><b>${esc(mat)}</b></td><td>Долговечный материал итальянского производства.</td></tr>`;
  const seo=CSS+`<section class="seo-desc" id="seoDesc"><h2>${esc(name)} — купить в Минске</h2>
<p>${esc(name)} от фабрики <b>${esc(brand)}</b>${coll?` (коллекция ${esc(coll)})`:''} — оригинальная итальянская мебель под заказ. Ниже — материалы, размеры, условия доставки по Беларуси и ответы на частые вопросы.</p>
<div class="seo-rest" id="seoRest">
<h3>Почему стоит купить у нас</h3><ul class="adv"><li>Оригинал напрямую с фабрики ${esc(brand)}, без наценок посредников</li><li>Материал: ${esc(mat)}</li><li>Габариты: ${esc(dims)}</li><li>Индивидуальный расчёт цены под вашу конфигурацию</li><li>Доставка по Минску и всей Беларуси</li><li>Гарантия производителя</li></ul>
<h3>Материалы и уход</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Материал</th><th>Особенности и уход</th></tr></thead><tbody>${matRows}</tbody></table></div>
<h3>Доставка, оплата, гарантия</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Условие</th><th>Детали</th></tr></thead><tbody><tr><td><b>Доставка</b></td><td>По Минску и всей Беларуси; подъём и сборка по договорённости</td></tr><tr><td><b>Сроки</b></td><td>Под заказ с фабрики в Италии; уточняются при оформлении</td></tr><tr><td><b>Оплата</b></td><td>Индивидуальный расчёт, предоплата по договору</td></tr><tr><td><b>Гарантия</b></td><td>Официальная гарантия производителя</td></tr></tbody></table></div>
<h3>Стандарты</h3><ul><li><b>ГОСТ 16371-2014</b> «Мебель. Общие технические условия»</li><li><b>ТР ТС 025/2012</b> «О безопасности мебельной продукции»</li></ul>
<h3>Смотрите также</h3><div class="links"><a href="https://www.myarredo.by/catalog/">Весь каталог</a><a href="https://www.myarredo.by/sale/">Распродажа</a><a href="https://www.myarredo.by/catalog/myagkaya-mebel/">Мягкая мебель</a><a href="https://www.myarredo.by/catalog/mebel-dlya-gostinoj/">Гостиные</a></div>
<h3>Часто задаваемые вопросы</h3><div class="faq-grid">
<div class="faq-card"><div class="q"><span class="qi">?</span>Из чего сделан ${esc(type.toLowerCase())}?</div><div class="a">Материал изделия: ${esc(mat)}. Это оригинальная продукция итальянской фабрики ${esc(brand)}.</div></div>
<div class="faq-card"><div class="q"><span class="qi">?</span>Какие размеры?</div><div class="a">${esc(dims)}. Уточняйте посадочные размеры при заказе.</div></div>
<div class="faq-card"><div class="q"><span class="qi">?</span>Почему цена под заказ?</div><div class="a">Стоимость зависит от отделки, обивки и конфигурации — менеджер рассчитывает её индивидуально.</div></div>
<div class="faq-card"><div class="q"><span class="qi">?</span>Доставляете по Беларуси?</div><div class="a">Да, по Минску и всей Беларуси; товар поставляется под заказ с фабрики в Италии.</div></div>
<div class="faq-card"><div class="q"><span class="qi">?</span>Можно выбрать цвет или отделку?</div><div class="a">Как правило, доступны варианты отделки и обивки фабрики ${esc(brand)} — уточняйте у менеджера.</div></div>
<div class="faq-card"><div class="q"><span class="qi">?</span>Это оригинал?</div><div class="a">Да, поставка напрямую от фабрики ${esc(brand)} с сопроводительными документами.</div></div>
<div class="faq-card"><div class="q"><span class="qi">?</span>Какие сроки изготовления?</div><div class="a">Изготовление под заказ; ориентировочный срок называет менеджер при оформлении.</div></div>
<div class="faq-card"><div class="q"><span class="qi">?</span>Есть ли гарантия?</div><div class="a">Да, предоставляется официальная гарантия производителя.</div></div>
</div>
<div class="tags">${esc(type.toLowerCase())} ${esc(brand)} · ${esc(brand)} Минск · итальянская мебель под заказ · ${esc(coll)} · купить ${esc(type.toLowerCase())} Беларусь</div></div>
<button class="seo-toggle" id="seoBtn" onclick="(function(){var r=document.getElementById('seoRest'),b=document.getElementById('seoBtn');var o=r.classList.toggle('open');b.classList.toggle('open',o);b.querySelector('.lbl').textContent=o?'Свернуть':'Читать полностью';})()"><span class="lbl">Читать полностью</span><span class="arr">▾</span></button></section>`;
  const FOOT='<div class="footer jsftr" data-url="https://www.myarredo.by/forms/ajax-get-form-feedback/">';
  const i=html.indexOf(FOOT); if(i>=0) html=html.slice(0,i)+seo+html.slice(i); else html=html.replace(/<\/body>/i,seo+'</body>');

  html=html.replace(/<head([^>]*)>/i,(m)=>m+`\n<base href="${url}">`);
  writeFileSync(new URL('demo/product-'+slug+'.html', root), html);
  made.push({slug,name,brand});
}
writeFileSync(new URL('../products-made.json', root), JSON.stringify(made));
console.error('PRODUCTS BUILT:', made.length);
