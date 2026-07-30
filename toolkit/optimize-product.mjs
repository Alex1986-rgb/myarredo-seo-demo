import { writeFileSync, readFileSync } from 'node:fs';
import { H } from './headers.mjs';
const URL='https://www.myarredo.by/product/77867-divan-arketipo-firenze-6109203/';
let html = await (await fetch(URL,{headers:H})).text();
html = html.replace(/<head([^>]*)>/i, m=>m+`\n<base href="${URL}">`);
html = html.replace(/<title>[\s\S]*?<\/title>/i,'<title>Диван ARKETIPO Lotus — купить в Минске | Myarredo</title>');
const D='Прямой кожаный диван ARKETIPO Lotus, коллекция Firenze, 220×103 см. Итальянская мебель под заказ с доставкой по Минску и Беларуси. Myarredo.';
html = html.replace(/<meta\s+name=["']description["'][^>]*>/i,`<meta name="description" content="${D}">`);
html = html.replace(/<img\b([^>]*?)>/gi,(m,a)=>/(^|\s)alt\s*=/.test(a)?m:`<img${a} alt="Диван ARKETIPO Lotus, коллекция Firenze, арт. 6109203">`);
const faq=[
 ["Кто дизайнер дивана Lotus?","Maurizio Manzoni и Roberto Tapinassi (студия Manzoni e Tapinassi / Studio Memo) для фабрики ARKETIPO Firenze."],
 ["Из чего сделан каркас?","Металл и фанера с открытой металлической рамой (отделки micaceous brown или galvanized titanium); ножки пластиковые."],
 ["Какое у дивана наполнение?","Недеформируемый ППУ в основе сиденья и спинки плюс пуховое наполнение (down) в мягких элементах."],
 ["Какие цвета и обивка доступны?","Кожа или ткань в палитре фабрики; рама в двух отделках; угловые заплатки в тон или контраст."],
 ["Есть ли механизм раскладки?","Нет, Lotus стационарный диван. Но он модульный: собирается в прямые и угловые конфигурации."],
 ["Поместится ли в небольшую гостиную?","Да. Габариты модуля 220x103x70 см и умеренная глубина позволяют разместить его даже в компактной комнате."],
 ["Почему цена под заказ?","Стоимость зависит от конфигурации, обивки и отделки рамы. Точную цену менеджер рассчитывает под ваше исполнение."],
 ["Как быстро доставите по Беларуси?","Диван поставляется под заказ с итальянской фабрики; доставка по Минску и всей Беларуси, сроки уточняются при заказе."]
];
const faqLd = JSON.stringify({"@context":"https://schema.org/","@type":"FAQPage","mainEntity":faq.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))});
const ld=`
<script type="application/ld+json">{"@context":"https://schema.org/","@type":"Product","name":"Диван ARKETIPO Lotus 6109203","sku":"6109203","image":["https://img.myarredo.by/uploads/myarredo-ico.jpg"],"description":"Прямой кожаный диван ARKETIPO Lotus из коллекции Firenze, 220×103 см.","brand":{"@type":"Brand","name":"ARKETIPO"},"material":"Натуральная кожа, металл, фанера","width":{"@type":"QuantitativeValue","value":220,"unitCode":"CMT"},"depth":{"@type":"QuantitativeValue","value":103,"unitCode":"CMT"},"height":{"@type":"QuantitativeValue","value":70,"unitCode":"CMT"},"offers":{"@type":"Offer","url":"${URL}","priceCurrency":"BYN","availability":"https://schema.org/PreOrder","seller":{"@type":"Organization","name":"Myarredo"}}}<\/script>
<script type="application/ld+json">{"@context":"https://schema.org/","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Главная","item":"https://www.myarredo.by/"},{"@type":"ListItem","position":2,"name":"Каталог","item":"https://www.myarredo.by/catalog/"},{"@type":"ListItem","position":3,"name":"Мягкая мебель","item":"https://www.myarredo.by/catalog/myagkaya-mebel/"},{"@type":"ListItem","position":4,"name":"Диван ARKETIPO Lotus 6109203"}]}<\/script>
<script type="application/ld+json">${faqLd}<\/script>`;
html = html.replace(/<\/head>/i, ld+'\n</head>');
const seo = readFileSync('seo_block.html','utf8');
const FOOT='<div class="footer jsftr" data-url="https://www.myarredo.by/forms/ajax-get-form-feedback/">';
const i = html.indexOf(FOOT);
if(i<0){console.error('no footer');process.exit(1);}
html = html.slice(0,i)+'\n'+seo+'\n'+html.slice(i);

// ---- replace on-page product description with modernized block ----
{
  const s = html.indexOf('<div class="prod-descr"');
  if (s >= 0) {
    const re = /<div\b|<\/div>/g; re.lastIndex = s; let depth=0, m, end=-1;
    while ((m = re.exec(html))) { if (m[0] === '</div>') { depth--; if (depth===0){ end=re.lastIndex; break; } } else depth++; }
    if (end > 0) { const inner = readFileSync('prod_descr.html','utf8'); html = html.slice(0,s) + inner + html.slice(end); console.error('prod-descr replaced'); }
  }
}

writeFileSync('optimized_copy.html', html);
console.error('OK bytes', html.length, 'FAQ questions', faq.length);
