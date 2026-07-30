import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const CSS = readFileSync(new URL('templates/category-seo.css.html', root),'utf8');
const wrap = (title, inner, autoopen=true) =>
`<meta charset="utf-8"><title>${title}</title><body style="background:#fff;margin:0;padding:22px 0;">
${CSS}${inner}${autoopen?`<script>var r=document.getElementById('seoRest');if(r){r.classList.add('open');var b=document.getElementById('seoBtn');if(b){b.classList.add('open');b.querySelector('.lbl').textContent='Свернуть';}}</script>`:''}</body>`;

// category previews (guaranteed render)
const cats = readdirSync(new URL('category-blocks/', root)).filter(f=>f.endsWith('.html'));
const catNames = {kuhni:'Кухни',spalni:'Спальни',gostinaya:'Гостиные','myagkaya-mebel':'Мягкая мебель',stolovaya:'Столовая',stulya:'Стулья',svetilniki:'Освещение'};
for (const f of cats){
  const body = readFileSync(new URL('category-blocks/'+f, root),'utf8');
  writeFileSync(new URL('demo/preview-'+f, root), wrap('SEO — '+(catNames[f.replace('.html','')]||f), body));
}
// home SEO preview + product SEO preview
writeFileSync(new URL('demo/preview-home-seo.html', root), wrap('SEO главной', readFileSync(new URL('templates/home-seo-block.html', root),'utf8')));
writeFileSync(new URL('demo/preview-product-seo.html', root), wrap('SEO карточки', readFileSync(new URL('templates/product-seo-block.html', root),'utf8')));
writeFileSync(new URL('demo/preview-product-top.html', root), wrap('Верхнее описание карточки', readFileSync(new URL('templates/product-top-description.html', root),'utf8'), false));
writeFileSync(new URL('demo/preview-home-promo.html', root), wrap('Блок «Лучшая цена»', readFileSync(new URL('templates/home-promo.html', root),'utf8'), false));
console.error('previews built');
