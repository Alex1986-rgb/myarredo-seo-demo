// Собирает демо-страницы категорий: берёт реальную страницу myarredo.by,
// оптимизирует title/description/canonical и заменяет SEO-текст (.comp-advanteges)
// стилизованным блоком из ../category-blocks/. Запуск: node build-demo-pages.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { H } from './headers.mjs';
const CSS = readFileSync(new URL('../templates/category-seo.css.html', import.meta.url),'utf8');
const CATS = [
  ['mebel-dlya-kuhni','kuhni','Итальянские кухни в Минске — купить кухню из Италии | Myarredo'],
  ['mebel-dlya-spalni','spalni','Итальянские спальни в Минске — купить спальню из Италии | Myarredo'],
  ['mebel-dlya-gostinoj','gostinaya','Итальянские гостиные в Минске — мебель для гостиной | Myarredo'],
  ['myagkaya-mebel','myagkaya-mebel','Итальянская мягкая мебель в Минске — диваны из Италии | Myarredo'],
  ['mebel-dlya-stolovoj','stolovaya','Мебель для столовой из Италии в Минске | Myarredo'],
  ['svetilniki','svetilniki','Итальянские светильники в Минске — свет из Италии | Myarredo'],
  ['stulya','stulya','Итальянские стулья в Минске — купить стулья из Италии | Myarredo'],
];
function balancedReplace(html, openTag, repl){
  const s=html.indexOf(openTag); if(s<0) return null;
  const re=/<div\b|<\/div>/g; re.lastIndex=s; let d=0,m,end=-1;
  while((m=re.exec(html))){ if(m[0]==='</div>'){d--; if(d===0){end=re.lastIndex;break;}} else d++; }
  if(end<0) return null; return html.slice(0,s)+repl+html.slice(end);
}
const FOOT='<div class="footer jsftr" data-url="https://www.myarredo.by/forms/ajax-get-form-feedback/">';
for (const [slug,block,title] of CATS){
  const url='https://www.myarredo.by/catalog/'+slug+'/';
  let html=await (await fetch(url,{headers:H})).text();
  html=html.replace(/<head([^>]*)>/i,m=>m+`\n<base href="${url}">`);
  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${title}</title>`);
  const seo=CSS+readFileSync(new URL('../category-blocks/'+block+'.html', import.meta.url),'utf8');
  let out=balancedReplace(html,'<div class="comp-advanteges">',seo);
  if(!out){ const i=html.indexOf(FOOT); out = i>=0 ? html.slice(0,i)+seo+html.slice(i) : html.replace(/<\/body>/i,seo+'</body>'); }
  writeFileSync(new URL('../demo/category-'+slug+'.html', import.meta.url), out);
  console.error('built demo/category-'+slug+'.html', out.length);
}
