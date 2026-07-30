// optimize-template.mjs — МАССОВЫЙ генератор оптимизации myarredo.by БЕЗ LLM.
// Для каждой карточки строит уникальный (из её полей) верхний блок характеристик,
// нижний SEO-текст (4 таблицы + 8 FAQ) и вставляет мета/canonical/JSON-LD.
// Уникальность — за счёт реальных полей страницы (бренд/коллекция/артикул/материал/
// размеры/стиль/тип) + детерминированная вариация формулировок по slug.
// Это тот же принцип, которым генерировались 68–73k страниц завода (скрипт по шаблону).
//
// Запуск:  node toolkit/optimize-template.mjs docs/urls.txt --limit=50 --concurrency=8
//          node toolkit/optimize-template.mjs docs/urls.txt            # все
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { H } from './headers.mjs';

const arg  = process.argv[2] || 'docs/urls.txt';
const LIMIT = +(process.argv.find(a=>a.startsWith('--limit='))||'').split('=')[1] || 0; // 0 = все
const CONC  = +(process.argv.find(a=>a.startsWith('--concurrency='))||'').split('=')[1] || 8;
const root  = new URL('../', import.meta.url);
const OUT   = new URL('site/', root);
if (!existsSync(OUT)) mkdirSync(OUT, { recursive:true });
const CSS   = readFileSync(new URL('templates/category-seo.css.html', root), 'utf8');
const PDCSS = `<style>.pd-mod{font-family:'PT Sans',system-ui,Arial;color:#2a2a2a}.pd-mod p{margin:0 0 12px;font-size:15.5px;line-height:1.7}.pd-mod .pd-spec{border-collapse:collapse !important;max-width:620px;width:100%;margin:8px 0}.pd-mod .pd-spec td{border:1px solid #e3e3e3 !important;padding:8px 12px !important;font-size:14.5px;vertical-align:top}.pd-mod .pd-spec td:first-child{background:#f7faf7 !important;color:#666 !important;width:40%}.pd-cap{font-weight:700;color:#1f7a34;margin:14px 0 6px}.pd-links a{display:inline-block;margin:0 6px 6px 0;padding:5px 12px;background:#f4f7f4;border:1px solid #d7e6d9;border-radius:16px;color:#1f7a34;text-decoration:none;font-size:14px}</style>`;

// ---------- helpers ----------
const clean = s => (s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const esc   = s => (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const ldesc = s => (s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').replace(/"/g,'\\"').trim();
function hash(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h); }
const pick = (arr,seed) => arr[seed % arr.length];

// характеристики со страницы: <tr><td>k</td><td>v</td></tr>
function fields(html){
  const chars={};
  for(const m of html.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g))
    chars[clean(m[1])] = clean(m[2]);
  const g = re => { const m=html.match(re); return m?clean(m[1]):''; };
  return {
    name : g(/<h1[^>]*>([\s\S]*?)<\/h1>/i),
    brand: chars['Фабрика']||chars['Бренд']||'',
    coll : chars['Коллекция']||'',
    art  : chars['Артикул']||'',
    style: chars['Стиль']||'',
    material: chars['Материал']||chars['Материалы']||'',
    dims : chars['Размеры']||'',
    type : chars['Типы мебели']||chars['Тип']||'',
    _raw : chars,
  };
}

// тип мебели из названия/полей → для профильных строк и текста
function kindOf(f){
  const s=(f.type+' '+f.name).toLowerCase();
  if(/крылат|диван|кушет|канапе/.test(s)) return 'sofa';
  if(/кресл/.test(s)) return 'armchair';
  if(/кроват/.test(s)) return 'bed';
  if(/комод/.test(s)) return 'chest';
  if(/тумб/.test(s)) return 'nightstand';
  if(/шкаф|гардероб|витрин|пенал/.test(s)) return 'cabinet';
  if(/полка|стеллаж/.test(s)) return 'shelf';
  if(/стол журнальн|журнальн/.test(s)) return 'coffee';
  if(/стол/.test(s)) return 'table';
  if(/стул|полукресл/.test(s)) return 'chair';
  if(/светильник|люстра|бра|торшер|лампа/.test(s)) return 'light';
  return 'furniture';
}
const KIND_RU = { sofa:'диван', armchair:'кресло', bed:'кровать', chest:'комод', nightstand:'тумба',
  cabinet:'шкаф', shelf:'полка', coffee:'журнальный стол', table:'стол', chair:'стул', light:'светильник', furniture:'предмет мебели' };

// ---------- top block (spec table from fields) ----------
function topBlock(f, seed){
  const na='<i>уточняется у менеджера</i>';
  const rows=[
    ['Фабрика', f.brand||na],
    ['Коллекция', f.coll||na],
    ['Тип', f.type||KIND_RU[kindOf(f)]],
    ['Стиль', f.style||na],
    ['Материал', f.material||na],
    ['Размеры', f.dims||na],
    ['Артикул', f.art||na],
    ['Наличие', 'под заказ · уточняйте у менеджера'],
  ];
  const kind=KIND_RU[kindOf(f)];
  const p1intro=pick([
    `${f.name} — оригинальный ${kind} фабрики ${f.brand||'из Италии'}`,
    `${f.name}: ${kind} из каталога итальянской мебели Myarredo`,
    `${f.name} — ${kind} прямой поставки с фабрики ${f.brand||'Италии'}`,
  ], seed);
  const p1 = `<p>${p1intro}${f.coll?`, коллекция «${f.coll}»`:''}. Оригинальное изделие с гарантией производителя; отделку, размер и комплектацию уточняйте у менеджера.</p>`;
  const p2 = `<p>${f.material?`Основные материалы: ${f.material}. `:''}${f.dims?`Габариты: ${f.dims}. `:''}Дизайнер и точная комплектация указываются в характеристиках или уточняются у менеджера — поможем подобрать под ваш интерьер и рассчитать доставку по Минску и Беларуси.</p>`;
  const tbl = `<table class="pd-spec">${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>`;
  const links = `<div class="pd-links"><a href="https://www.myarredo.by/catalog/">Каталог</a>${f.brand?`<a href="https://www.myarredo.by/search/?q=${encodeURIComponent(f.brand)}">Все ${esc(f.brand)}</a>`:''}<a href="https://www.myarredo.by/sale/">Распродажа</a></div>`;
  return `<div class="prod-descr" itemprop="description">${PDCSS}<div class="pd-mod">${p1}${p2}<div class="pd-cap">Характеристики</div>${tbl}${links}</div></div>`;
}

// ---------- bottom SEO block from fields ----------
function seoBlock(f, seed){
  const kind=KIND_RU[kindOf(f)];
  const Kind=kind.charAt(0).toUpperCase()+kind.slice(1);
  const brand=f.brand||'ведущих фабрик Италии';
  const h2 = `${f.name} — купить в Минске`;
  const lead=pick([
    `${f.name} — ${kind} из Италии в каталоге Myarredo. Прямые поставки${f.brand?` с фабрики ${f.brand}`:''}, доставка по Минску и всей Беларуси.`,
    `Купить ${f.name.toLowerCase()} в Минске: оригинальный ${kind}${f.brand?` фабрики ${f.brand}`:''} по фабричной цене, с доставкой по Беларуси.`,
  ], seed);
  const adv=[
    f.brand?`Оригинал фабрики ${f.brand} с гарантией`:'Оригинал итальянской фабрики с гарантией',
    f.material?`Материалы: ${f.material}`:'Натуральные материалы премиум-класса',
    f.coll?`Коллекция «${f.coll}» — единый стиль интерьера`:'Возможность собрать комплект в едином стиле',
    'Прямые поставки — без наценок посредников',
    'Индивидуальный подбор отделки и размеров',
    'Доставка, подъём и сборка по Минску и Беларуси',
  ];
  const specTbl=`<div class="tbl-wrap"><table class="data"><thead><tr><th>Параметр</th><th>Значение</th></tr></thead><tbody>
    <tr><td>Фабрика</td><td>${f.brand||'уточняется'}</td></tr>
    <tr><td>Коллекция</td><td>${f.coll||'уточняется'}</td></tr>
    <tr><td>Тип</td><td>${f.type||Kind}</td></tr>
    <tr><td>Стиль</td><td>${f.style||'уточняется'}</td></tr>
    <tr><td>Материал</td><td>${f.material||'уточняется'}</td></tr>
    <tr><td>Размеры</td><td>${f.dims||'уточняется'}</td></tr>
    <tr><td>Артикул</td><td>${f.art||'уточняется'}</td></tr>
  </tbody></table></div>`;
  const useTbl=`<div class="tbl-wrap"><table class="data"><thead><tr><th>Где используется</th><th>Почему подходит</th></tr></thead><tbody>
    <tr><td>Частные квартиры и дома</td><td>Оригинальный итальянский ${kind} задаёт уровень интерьера</td></tr>
    <tr><td>Премиальные резиденции</td><td>Натуральные материалы и авторский дизайн</td></tr>
    <tr><td>Дизайн-проекты и бутик-отели</td><td>Возможность подобрать комплект и отделку под концепцию</td></tr>
  </tbody></table></div>`;
  const careTbl=`<div class="tbl-wrap"><table class="data"><thead><tr><th>Покупка и сервис</th><th>Условия</th></tr></thead><tbody>
    <tr><td>Цена</td><td>Фабричная, без наценок посредников — рассчитает менеджер</td></tr>
    <tr><td>Доставка</td><td>Минск и вся Беларусь, под заказ с фабрики</td></tr>
    <tr><td>Гарантия</td><td>Официальная гарантия производителя</td></tr>
    <tr><td>Подбор</td><td>Бесплатная консультация дизайнера</td></tr>
  </tbody></table></div>`;
  const faqs=[
    [`Оригинальный ли это ${kind}?`, `Да, это оригинальное изделие${f.brand?` фабрики ${f.brand}`:''} прямой поставки из Италии, с гарантией производителя.`],
    [`Из каких материалов сделан?`, f.material?`Основные материалы — ${f.material}. Точная спецификация указана в характеристиках.`:`Материалы указаны в характеристиках; при отсутствии данных уточняются у менеджера.`],
    [`Какие размеры?`, f.dims?`Габариты: ${f.dims}. Возможны другие размеры под заказ — уточняйте у менеджера.`:`Размеры уточняются у менеджера; часть моделей доступна в нескольких габаритах.`],
    [`Можно ли заказать по фабричной цене?`, `Да, мы работаем напрямую с фабриками Италии и предлагаем ${kind} без наценок посредников.`],
    [`Есть ли доставка по Беларуси?`, `Да, доставляем в Минск и все регионы Беларуси; поможем с подъёмом и сборкой.`],
    [`Сколько ждать доставку?`, `Сроки зависят от фабрики и комплектации, уточняются при заказе; часть позиций есть в разделе распродажи.`],
    [`Можно ли выбрать отделку или цвет?`, `Как правило да — фабрики предлагают варианты отделок и обивок; доступные варианты подскажет менеджер.`],
    [f.coll?`Есть ли другие предметы коллекции «${f.coll}»?`:`Поможете подобрать в комплект?`, f.coll?`Да, коллекцию «${f.coll}» можно дополнить другими предметами в едином стиле — уточните у менеджера.`:`Да, дизайнер-консультант поможет собрать комплект в едином стиле.`],
  ];
  const faqHtml=faqs.map(q=>`<div class="faq-card"><div class="q"><span class="qi">?</span>${q[0]}</div><div class="a">${q[1]}</div></div>`).join('');
  const tags=[f.brand, f.coll, kind+' Минск', 'итальянская мебель', f.style].filter(Boolean).join(' · ');
  return `<section class="seo-desc" id="seoDesc">
  <h2>${h2}</h2>
  <p>${lead}</p>
  <div class="seo-rest" id="seoRest">
    <h3>Преимущества</h3>
    <ul class="adv">${adv.map(a=>`<li>${a}</li>`).join('')}</ul>
    <h3>Характеристики</h3>${specTbl}
    <h3>Материалы и качество</h3>
    <p>${f.material?`В производстве использованы: ${f.material}. `:''}Итальянские фабрики применяют натуральные материалы, ручные техники отделки и надёжную фурнитуру с доводчиками, что обеспечивает долговечность и ремонтопригодность изделия. Соответствие требованиям ${'ГОСТ 16371-2014'} и ТР ТС 025/2012.</p>
    <h3>Где используется такая мебель</h3>${useTbl}
    <h3>Покупка, доставка и гарантия</h3>${careTbl}
    <h3>Смотрите также</h3>
    <div class="links">
      <a href="https://www.myarredo.by/catalog/">Весь каталог</a>
      ${f.brand?`<a href="https://www.myarredo.by/search/?q=${encodeURIComponent(f.brand)}">Мебель ${esc(f.brand)}</a>`:''}
      <a href="https://www.myarredo.by/sale/">Распродажа</a>
    </div>
    <h3>Часто задаваемые вопросы</h3>
    <div class="faq-grid">${faqHtml}</div>
    <div class="tags">${tags}</div>
  </div>
  <button class="seo-toggle" id="seoBtn" onclick="(function(){var r=document.getElementById('seoRest'),b=document.getElementById('seoBtn');var o=r.classList.toggle('open');b.classList.toggle('open',o);b.querySelector('.lbl').textContent=o?'Свернуть':'Читать полностью';})()"><span class="lbl">Читать полностью</span><span class="arr">▾</span></button>
</section>`;
}

// заменить существующий .prod-descr (balanced div)
function replaceProdDescr(html, repl){
  const s=html.indexOf('<div class="prod-descr"'); if(s<0) return html.replace(/<\/body>/i, repl+'</body>');
  const re=/<div\b|<\/div>/g; re.lastIndex=s; let d=0,m,e=-1;
  while((m=re.exec(html))){ if(m[0]==='</div>'){ d--; if(d===0){ e=re.lastIndex; break; } } else d++; }
  return e<0?html:html.slice(0,s)+repl+html.slice(e);
}

// ---------- per-URL ----------
async function optimize(url){
  const slug=url.replace(/\/$/,'').split('/').pop();
  const outf=new URL('product-'+slug+'.html', OUT);
  if(existsSync(outf)) return 'skip';
  let html=await (await fetch(url,{headers:H})).text();
  if(!/<div class="prod-descr"/.test(html)) return 'noprod';
  const f=fields(html); const seed=hash(slug);
  html=html.replace(/<head([^>]*)>/i, m=>m+`\n<base href="${url}">`);
  const title=clean(`${f.type||KIND_RU[kindOf(f)]} ${f.brand} ${f.art}`).slice(0,58)+' | Myarredo';
  html=html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
  const descTxt=clean(`${f.name} — купить в Минске. ${f.brand?'Оригинал '+f.brand+', ':''}${f.material?f.material+', ':''}доставка по Беларуси, фабричная цена.`).slice(0,158);
  if(/<meta\s+name=["']description["']/i.test(html))
    html=html.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${esc(descTxt)}">`);
  else html=html.replace(/<\/title>/i, `</title>\n<meta name="description" content="${esc(descTxt)}">`);
  const top=topBlock(f,seed), seo=seoBlock(f,seed);
  html=replaceProdDescr(html, top);
  const FOOT='<div class="footer jsftr"'; const fi=html.indexOf(FOOT);
  const seoFull=CSS+seo;
  html = fi>=0 ? html.slice(0,fi)+seoFull+html.slice(fi) : html.replace(/<\/body>/i, seoFull+'</body>');
  // JSON-LD Product + Breadcrumb + FAQPage
  const faqLd=[...seo.matchAll(/<div class="q">[\s\S]*?<\/span>([\s\S]*?)<\/div>\s*<div class="a">([\s\S]*?)<\/div>/g)]
    .map(m=>`{"@type":"Question","name":"${ldesc(m[1])}","acceptedAnswer":{"@type":"Answer","text":"${ldesc(m[2])}"}}`);
  const ld=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Product","name":clean(f.name),"brand":{"@type":"Brand","name":f.brand||"Myarredo"},"sku":f.art||undefined,"category":f.type||undefined,"offers":{"@type":"Offer","priceCurrency":"BYN","availability":"https://schema.org/PreOrder","url":url,"seller":{"@type":"Organization","name":"Myarredo"}}})}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Каталог","item":"https://www.myarredo.by/catalog/"},{"@type":"ListItem","position":2,"name":"${ldesc(f.name)}","item":"${url}"}]}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[${faqLd.join(',')}]}</script>`;
  html=html.replace(/<\/head>/i, ld+'\n</head>');
  writeFileSync(outf, html);
  return 'ok';
}

// ---------- main ----------
let urls=readFileSync(new URL(arg, root),'utf8').trim().split('\n').map(s=>s.trim()).filter(u=>/\/product\//.test(u));
if(LIMIT) urls=urls.slice(0, LIMIT);
const t0=Date.now(); let i=0, ok=0, skip=0, fail=0;
async function worker(){
  while(i<urls.length){ const url=urls[i++];
    try{ const r=await optimize(url); if(r==='ok')ok++; else if(r==='skip')skip++; else fail++; }
    catch(e){ fail++; if(fail<=5) console.error('FAIL',url,String(e).slice(0,60)); }
    if((ok+fail)%25===0 && (ok+fail)>0){ const el=(Date.now()-t0)/1000; console.error(`${ok+skip+fail}/${urls.length} ok=${ok} skip=${skip} fail=${fail} | ${(ok/el).toFixed(2)} стр/с`); }
  }
}
await Promise.all(Array.from({length:CONC}, worker));
const el=(Date.now()-t0)/1000;
console.error(`\nГОТОВО: ok=${ok} skip=${skip} fail=${fail} за ${el.toFixed(1)}с | ${(ok/el).toFixed(2)} стр/с`);
console.error(`Экстраполяция на 66551 карточек при conc=${CONC}: ~${(66551/(ok/el)/3600).toFixed(1)} ч`);
