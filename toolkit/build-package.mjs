// build-package.mjs — комплектует ПОЛНЫЙ КЛОН сайта из site/:
//  1) накладывает премиум-версии (demo/) поверх массовых (одинаковый URL),
//  2) генерирует sitemap.xml (+ под-карты по 45k) со всеми URL,
//  3) генерирует index.html — точка входа: статистика + разделы + карта.
// Запуск: node toolkit/build-package.mjs
import { readFileSync, writeFileSync, readdirSync, copyFileSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const SITE = new URL('site/', root);
const DEMO = new URL('demo/', root);
const DOMAIN = 'https://www.myarredo.by';
const clean = s => (s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ---- 1) overlay premium demo pages over the mass site/ (premium wins at same URL) ----
let overlaid = 0;
for (const f of readdirSync(DEMO)) {
  if (!f.endsWith('.html')) continue;
  let target = null;
  if (f.startsWith('product-')) target = f;                                   // product-<slug>.html
  else if (f.startsWith('category-')) target = 'catalog__' + f.slice('category-'.length); // premium category -> catalog__<slug>.html
  else if (f === 'home.html') target = 'home.html';
  else continue; // skip previews/index
  copyFileSync(new URL(f, DEMO), new URL(target, SITE));
  overlaid++;
}

// ---- filename -> canonical URL ----
function urlOf(f){
  const n = f.replace(/\.html$/,'');
  if (n === 'home' || n === 'index') return DOMAIN + '/';
  if (n.startsWith('product-')) return `${DOMAIN}/product/${n.slice('product-'.length)}/`;
  // everything else uses the path scheme:  a__b__c -> /a/b/c/
  return `${DOMAIN}/${n.replace(/__/g,'/')}/`;
}

// ---- gather pages ----
const files = readdirSync(SITE).filter(f => f.endsWith('.html') && f !== 'index.html');
const products = files.filter(f => f.startsWith('product-'));
const listings = files.filter(f => !f.startsWith('product-') && f !== 'home.html');
const hasHome = existsSync(new URL('home.html', SITE));

// ---- 2) sitemaps (chunk 45000) ----
const NOW = '2026-07-30';
function sm(name, urls, pr){
  const body = urls.map(u => `  <url><loc>${esc(u)}</loc><lastmod>${NOW}</lastmod><changefreq>weekly</changefreq><priority>${pr}</priority></url>`).join('\n');
  writeFileSync(new URL(name, SITE), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
}
const subMaps = [];
// home + listings
const topUrls = [ ...(hasHome?[DOMAIN+'/']:[]), ...listings.map(urlOf) ];
sm('sitemap-catalog.xml', topUrls, '0.8'); subMaps.push('sitemap-catalog.xml');
// products in chunks of 45000
const CHUNK = 45000;
const prodUrls = products.map(urlOf);
for (let i=0, part=1; i<prodUrls.length; i+=CHUNK, part++){
  const name = `sitemap-products-${part}.xml`;
  sm(name, prodUrls.slice(i, i+CHUNK), '0.6'); subMaps.push(name);
}
// sitemap index
const idx = subMaps.map(s => `  <sitemap><loc>${DOMAIN}/${s}</loc><lastmod>${NOW}</lastmod></sitemap>`).join('\n');
writeFileSync(new URL('sitemap.xml', SITE), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${idx}\n</sitemapindex>\n`);

// ---- 3) index.html (entry point) ----
// category display name from H2
function nameOf(f){
  try { const h = readFileSync(new URL(f, SITE),'utf8');
    const h2 = clean((h.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)||[])[1]||'').replace(/ — купить в Минске.*/,'');
    if (h2) return h2;
  } catch(e){}
  return f.replace(/\.html$/,'').replace(/__/g,' / ').replace(/---/g,' ');
}
const catLinks = listings
  .map(f => ({f, name: nameOf(f)}))
  .sort((a,b)=>a.name.localeCompare(b.name,'ru'))
  .map(c => `<a class="cl" href="${c.f}">${esc(c.name)}</a>`).join('');
const premium = ['product-93874-divan-poltrona-frau-archivio-renzo-frau-arcadia.html','product-130535-krovat-cassina-authentic-by-design-2013-cab-night.html','product-103992-stol-cattelan-italia-paolo-cattelan-atrium.html','product-131861-divan-flexform-flexform-harper.html','product-153669-stol-zurnalnyj-minotti-indoor-huber.html']
  .filter(f=>existsSync(new URL(f,SITE)))
  .map(f=>`<a class="pl" href="${f}">${esc(nameOf(f))}</a>`).join('');

const index = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Myarredo — полный оптимизированный клон сайта</title>
<style>:root{--g:#3aa34a;--g2:#1f7a34;--ink:#1f1f1f;--mut:#5a6172;--bd:#e0ece1;--bg:#f5f7f5}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:'PT Sans','Segoe UI',system-ui,Arial,sans-serif;line-height:1.55}.wrap{max-width:1180px;margin:0 auto;padding:0 20px}header{background:linear-gradient(135deg,#2e8b3e,#3aa34a);color:#fff;padding:34px 0 26px}header h1{margin:0 0 8px;font-size:28px}header p{margin:0;opacity:.95;max-width:80ch}.stat{display:flex;flex-wrap:wrap;gap:12px;margin:20px 0}.stat div{background:#fff;border:1px solid var(--bd);border-radius:10px;padding:12px 16px;min-width:150px}.stat b{display:block;font-size:22px;color:var(--g2)}.stat span{font-size:13px;color:var(--mut)}h2.sec{font-size:19px;margin:26px 0 12px;color:var(--g2);border-bottom:2px solid var(--bd);padding-bottom:8px}.links a{display:inline-block;margin:0 8px 8px 0;padding:9px 15px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;background:var(--g);color:#fff}.links a.sec2{background:#eef6ef;color:var(--g2);border:1px solid var(--bd)}.pl{display:inline-block;margin:0 8px 8px 0;padding:8px 13px;border-radius:8px;background:#fff;border:1px solid var(--bd);color:var(--ink);text-decoration:none;font-size:13.5px}.pl:hover,.cl:hover{border-color:var(--g)}.cats{columns:280px;column-gap:14px}.cl{display:block;padding:6px 10px;margin:0 0 6px;background:#fff;border:1px solid var(--bd);border-radius:8px;color:var(--ink);text-decoration:none;font-size:13px;break-inside:avoid}footer{color:var(--mut);font-size:13px;padding:24px 0 44px;border-top:1px solid var(--bd);margin-top:30px}</style></head>
<body><header><div class="wrap"><h1>Myarredo — полный оптимизированный клон сайта</h1><p>Все страницы каталога с применённой SEO-оптимизацией: мета, canonical, alt, микроразметка Schema.org (Product/Offer/BreadcrumbList/FAQPage/CollectionPage), уникальный SEO-текст, таблицы характеристик и 8 FAQ на каждой странице. Плюс карта сайта sitemap.xml.</p></div></header>
<div class="wrap">
<div class="stat"><div><b>${products.length.toLocaleString('ru')}</b><span>карточек товара</span></div><div><b>${listings.length.toLocaleString('ru')}</b><span>категорий / листингов</span></div><div><b>${(products.length+listings.length+(hasHome?1:0)).toLocaleString('ru')}</b><span>страниц всего</span></div><div><b>${subMaps.length}</b><span>файлов sitemap</span></div></div>
<h2 class="sec">Навигация</h2>
<div class="links">${hasHome?'<a href="home.html">Главная</a>':''}<a class="sec2" href="sitemap.xml">Карта сайта (sitemap.xml)</a></div>
${premium?`<h2 class="sec">Премиум-карточки (текст ~1000 слов)</h2><div>${premium}</div>`:''}
<h2 class="sec">Категории и разделы (${listings.length.toLocaleString('ru')})</h2>
<div class="cats">${catLinks}</div>
</div>
<footer><b>Myarredo — оптимизированный клон.</b> ${products.length.toLocaleString('ru')} карточек + ${listings.length.toLocaleString('ru')} категорий. Карточки товара доступны из категорий и перечислены в sitemap.xml. Для публикации: залить папку на хостинг, sitemap.xml указать в robots.txt и Search Console.</footer>
</body></html>`;
writeFileSync(new URL('index.html', SITE), index);

// robots.txt
writeFileSync(new URL('robots.txt', SITE), `User-agent: *\nAllow: /\nSitemap: ${DOMAIN}/sitemap.xml\nHost: myarredo.by\n`);

console.error(`overlaid premium: ${overlaid}`);
console.error(`products: ${products.length} | listings: ${listings.length} | sitemaps: ${subMaps.length}`);
console.error(`written: index.html, sitemap.xml (+${subMaps.length} sub), robots.txt`);
