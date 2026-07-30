// optimize-categories.mjs — массовая оптимизация страниц-ЛИСТИНГОВ (/catalog/...) myarredo.by.
// Для каждой категории: base href (живая вёрстка+сетка как на сайте), title/meta из H1,
// уникальный SEO-блок (что входит + бренды/материалы + 8 FAQ) и JSON-LD CollectionPage+
// BreadcrumbList+FAQPage. БЕЗ LLM — текст из H1/слага категории.
//
// Запуск: node toolkit/optimize-categories.mjs docs/urls.txt [--limit=N] [--concurrency=6]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { H } from './headers.mjs';

const arg  = process.argv[2] || 'docs/urls.txt';
const LIMIT = +(process.argv.find(a=>a.startsWith('--limit='))||'').split('=')[1] || 0;
const CONC  = +(process.argv.find(a=>a.startsWith('--concurrency='))||'').split('=')[1] || 6;
const root  = new URL('../', import.meta.url);
const OUT   = new URL('site/', root);
if (!existsSync(OUT)) mkdirSync(OUT, { recursive:true });
const CSS   = readFileSync(new URL('templates/category-seo.css.html', root), 'utf8');
const FOOT  = '<div class="footer jsftr" data-url="https://www.myarredo.by/forms/ajax-get-form-feedback/">';

const clean = s => (s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const esc   = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const ldesc = s => (s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').replace(/"/g,'\\"').trim();
function hash(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return Math.abs(h);}
const pick=(a,s)=>a[s%a.length];
const clip=(s,n)=>{s=(s||'').trim();return s.length<=n?s:s.slice(0,n-1).replace(/\s+\S*$/,'')+'…';};

// имя файла из пути URL: /catalog/a---b/ -> catalog__a---b
function fileslug(url){
  let p = url.replace(/^https?:\/\/[^/]+/,'').replace(/^\/+|\/+$/g,'');
  return (p||'index').replace(/[/:]/g,'__');
}
// тип мебели из H1/слага
function kind(s){
  s=s.toLowerCase();
  if(/диван/.test(s))return['диваны','мягкой мебели'];
  if(/кресл/.test(s))return['кресла','мягкой мебели'];
  if(/крроват|кроват/.test(s))return['кровати','мебели для спальни'];
  if(/комод/.test(s))return['комоды','корпусной мебели'];
  if(/тумб/.test(s))return['тумбы','корпусной мебели'];
  if(/шкаф|гардероб/.test(s))return['шкафы','систем хранения'];
  if(/стол/.test(s))return['столы','мебели'];
  if(/стул/.test(s))return['стулья','мебели для столовой'];
  if(/кухн/.test(s))return['кухни','кухонной мебели'];
  if(/спальн/.test(s))return['мебель для спальни','мебели для спальни'];
  if(/гостин/.test(s))return['мебель для гостиной','мебели для гостиной'];
  if(/ванн/.test(s))return['мебель для ванной','мебели для ванной'];
  if(/светильник|люстра|бра|торшер|лампа|свет/.test(s))return['светильники','освещения'];
  return['мебель','мебели'];
}

function seoBlock(h1, url, seed){
  const [k, kgen] = kind(h1+' '+url);
  const K = h1 || (k.charAt(0).toUpperCase()+k.slice(1));
  const lead = pick([
    `${K} из Италии в интернет-магазине Myarredo — оригинальные ${k} по фабричным ценам с доставкой по Минску и всей Беларуси.`,
    `Купить ${k} в Минске: каталог итальянской ${kgen} прямой поставки с фабрик, доставка по Беларуси.`,
  ], seed);
  const adv=[
    'Оригинал итальянских фабрик с гарантией',
    'Натуральные материалы: массив, шпон, кожа, ткань, камень',
    'Прямые поставки — без наценок посредников',
    'Подбор отделки, размеров и комплектаций',
    'Помощь дизайнера-консультанта бесплатно',
    'Доставка, подъём и сборка по Минску и Беларуси',
  ];
  const inTbl=`<div class="tbl-wrap"><table class="data"><thead><tr><th>В разделе</th><th>Что представлено</th></tr></thead><tbody>
    <tr><td>Модели</td><td>${K}: разные стили, размеры и отделки</td></tr>
    <tr><td>Материалы</td><td>Массив дерева, шпон, натуральная кожа и ткань, стекло, металл, камень</td></tr>
    <tr><td>Стили</td><td>Классика, неоклассика, модерн, минимализм, лофт, ар-деко</td></tr>
    <tr><td>Бренды</td><td>Ведущие фабрики Италии; наличие уточняйте у менеджера</td></tr>
  </tbody></table></div>`;
  const buyTbl=`<div class="tbl-wrap"><table class="data"><thead><tr><th>Покупка и сервис</th><th>Условия</th></tr></thead><tbody>
    <tr><td>Цена</td><td>Фабричная, без наценок посредников</td></tr>
    <tr><td>Доставка</td><td>Минск и вся Беларусь, под заказ с фабрики</td></tr>
    <tr><td>Гарантия</td><td>Официальная гарантия производителя</td></tr>
    <tr><td>Подбор</td><td>Бесплатная консультация дизайнера</td></tr>
  </tbody></table></div>`;
  const faqs=[
    [`Это оригинальная итальянская ${k==='мебель'?'мебель':'мебель ('+k+')'}?`, `Да, в разделе — оригинальные изделия прямой поставки с фабрик Италии, с гарантией производителя.`],
    [`Можно ли купить по фабричной цене?`, `Да, мы работаем напрямую с фабриками и предлагаем ${k} без наценок посредников; стоимость рассчитает менеджер.`],
    [`Из каких материалов ${k}?`, `Массив дерева, шпон ценных пород, натуральная кожа и ткань, стекло, металл и камень — зависит от модели.`],
    [`Есть ли доставка по Беларуси?`, `Да, доставляем в Минск и все регионы; поможем с подъёмом и сборкой.`],
    [`Сколько ждать заказ?`, `Сроки зависят от фабрики и комплектации, уточняются при оформлении; часть моделей есть в разделе распродажи.`],
    [`Можно ли выбрать отделку и размер?`, `Как правило да — фабрики предлагают варианты отделок, обивок и размеров; доступное подскажет менеджер.`],
    [`Поможете подобрать под интерьер?`, `Да, дизайнер-консультант бесплатно поможет собрать комплект в едином стиле.`],
    [`Подойдёт ли для современного интерьера?`, `В каталоге есть и классика, и современные ${k}: modern, minimal, loft, contemporary.`],
  ];
  const faqHtml=faqs.map(q=>`<div class="faq-card"><div class="q"><span class="qi">?</span>${q[0]}</div><div class="a">${q[1]}</div></div>`).join('');
  return `<section class="seo-desc" id="seoDesc">
<h2>${esc(K)} — купить в Минске</h2>
<p>${lead}</p>
<div class="seo-rest" id="seoRest">
<h3>Преимущества</h3>
<ul class="adv">${adv.map(a=>`<li>${a}</li>`).join('')}</ul>
<h3>Что в разделе</h3>${inTbl}
<h3>Материалы и качество</h3>
<p>Итальянские фабрики используют натуральные материалы, ручные техники отделки и надёжную фурнитуру с доводчиками. Продукция соответствует требованиям ГОСТ 16371-2014 и ТР ТС 025/2012 «О безопасности мебельной продукции».</p>
<h3>Покупка, доставка и гарантия</h3>${buyTbl}
<h3>Смотрите также</h3>
<div class="links"><a href="https://www.myarredo.by/catalog/">Весь каталог</a> <a href="https://www.myarredo.by/sale/">Распродажа</a></div>
<h3>Часто задаваемые вопросы</h3>
<div class="faq-grid">${faqHtml}</div>
<div class="tags">${esc(K)} · ${k} Минск · итальянская мебель · мебель из Италии · Беларусь</div>
</div>
<button class="seo-toggle" id="seoBtn" onclick="(function(){var r=document.getElementById('seoRest'),b=document.getElementById('seoBtn');var o=r.classList.toggle('open');b.classList.toggle('open',o);b.querySelector('.lbl').textContent=o?'Свернуть':'Читать полностью';})()"><span class="lbl">Читать полностью</span><span class="arr">▾</span></button>
</section>`;
}

// удалить существующий .comp-advanteges (сбалансированный div), чтобы не было дублей текста
function stripComp(html){
  const s=html.indexOf('<div class="comp-advanteges"'); if(s<0)return html;
  const re=/<div\b|<\/div>/g; re.lastIndex=s; let d=0,m,e=-1;
  while((m=re.exec(html))){ if(m[0]==='</div>'){ d--; if(d===0){ e=re.lastIndex; break; } } else d++; }
  return e<0?html:html.slice(0,s)+html.slice(e);
}

async function optimize(url){
  const fs2=fileslug(url);
  const outf=new URL(fs2+'.html', OUT);
  if(existsSync(outf)) return 'skip';
  let html=await (await fetch(url,{headers:H})).text();
  let h1=clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'');
  if(!h1) return 'noh1';
  h1=h1.replace(/\s*[—-]?\s*купить.*$/i,'').replace(/\s*в\s+Минске\s*$/i,'').trim();
  const seed=hash(fs2);
  html=html.replace(/<head([^>]*)>/i, m=>m+`\n<base href="${url}">`);
  const title=clip(h1+' — купить в Минске | Myarredo', 60);
  html=html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  const desc=clip(`${h1} из Италии по фабричным ценам. Оригинал, доставка по Минску и Беларуси, гарантия. Myarredo.`, 158);
  if(/<meta\s+name=["']description["']/i.test(html))
    html=html.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${esc(desc)}">`);
  else html=html.replace(/<\/title>/i, `</title>\n<meta name="description" content="${esc(desc)}">`);
  html=stripComp(html);
  const seo=CSS+seoBlock(h1, url, seed);
  const fi=html.indexOf(FOOT);
  html = fi>=0 ? html.slice(0,fi)+seo+html.slice(fi) : html.replace(/<\/body>/i, seo+'</body>');
  const faqLd=[...seo.matchAll(/<div class="q">[\s\S]*?<\/span>([\s\S]*?)<\/div>\s*<div class="a">([\s\S]*?)<\/div>/g)]
    .map(m=>`{"@type":"Question","name":"${ldesc(m[1])}","acceptedAnswer":{"@type":"Answer","text":"${ldesc(m[2])}"}}`);
  const ld=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"CollectionPage","name":clean(h1),"url":url,"isPartOf":{"@type":"WebSite","name":"Myarredo","url":"https://www.myarredo.by/"}})}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Каталог","item":"https://www.myarredo.by/catalog/"},{"@type":"ListItem","position":2,"name":"${ldesc(h1)}","item":"${url}"}]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${faqLd.join(',')}]}</script>`;
  html=html.replace(/<\/head>/i, ld+'\n</head>');
  writeFileSync(outf, html);
  return 'ok';
}

let urls=readFileSync(new URL(arg, root),'utf8').trim().split('\n').map(s=>s.trim()).filter(u=>u && !/\/product\//.test(u) && !/^https?:\/\/[^/]+\/?$/.test(u));
if(LIMIT) urls=urls.slice(0, LIMIT);
const t0=Date.now(); let i=0, ok=0, skip=0, fail=0, noh1=0;
async function worker(){
  while(i<urls.length){ const url=urls[i++];
    try{ const r=await optimize(url); if(r==='ok')ok++; else if(r==='skip')skip++; else if(r==='noh1')noh1++; else fail++; }
    catch(e){ fail++; if(fail<=5)console.error('FAIL',url,String(e).slice(0,50)); }
    if((ok+fail+noh1)%50===0 && (ok+fail+noh1)>0){ const el=(Date.now()-t0)/1000; console.error(`${ok+skip+fail+noh1}/${urls.length} ok=${ok} skip=${skip} noh1=${noh1} fail=${fail} | ${(ok/el).toFixed(2)} стр/с`); }
  }
}
await Promise.all(Array.from({length:CONC}, worker));
const el=(Date.now()-t0)/1000;
console.error(`\nГОТОВО категории: ok=${ok} skip=${skip} noh1=${noh1} fail=${fail} за ${el.toFixed(1)}с`);
