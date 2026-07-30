// optimize-llm.mjs — локальный конвейер уникальной SEO-оптимизации страниц myarredo.by.
// Для КАЖДОЙ страницы LLM пишет уникальные верхнее описание + SEO-текст + 8 FAQ из её полей,
// затем скрипт вставляет мета/canonical/alt/JSON-LD и сохраняет в ./site/.
//
// Запуск:  node toolkit/optimize-llm.mjs urls.txt [--limit=50] [--concurrency=4]
// LLM (одна из переменных окружения):
//   SEO_LLM=openai    OPENAI_API_KEY=sk-...
//   SEO_LLM=anthropic ANTHROPIC_API_KEY=sk-ant-...
//   SEO_LLM=gemini    GEMINI_API_KEY=...
//   SEO_LLM=ollama    OLLAMA_MODEL=qwen2.5:7b   (нужен запущенный `ollama serve`)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { H } from './headers.mjs';

const arg = process.argv[2] || 'urls.txt';
const LIMIT = +(process.argv.find(a=>a.startsWith('--limit='))||'').split('=')[1] || 50;
const CONC  = +(process.argv.find(a=>a.startsWith('--concurrency='))||'').split('=')[1] || 4;
const PROVIDER = process.env.SEO_LLM || 'ollama';
const OUT = new URL('../site/', import.meta.url);
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// ---------- LLM call (returns JSON {top, seo}) ----------
async function callLLM(system, user) {
  if (PROVIDER === 'openai') {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method:'POST',
      headers:{ 'Authorization':'Bearer '+process.env.OPENAI_API_KEY, 'Content-Type':'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL||'gpt-4o-mini', temperature:0.7,
        response_format:{type:'json_object'}, messages:[{role:'system',content:system},{role:'user',content:user}] }) });
    return (await r.json()).choices[0].message.content;
  }
  if (PROVIDER === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method:'POST',
      headers:{ 'x-api-key':process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01', 'Content-Type':'application/json' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL||'claude-sonnet-4-5', max_tokens:4000,
        system, messages:[{role:'user',content:user+'\n\nОтветь строго JSON: {"top":"...","seo":"..."}'}] }) });
    return (await r.json()).content[0].text;
  }
  if (PROVIDER === 'gemini') {
    const m = process.env.GEMINI_MODEL||'gemini-2.5-flash';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ systemInstruction:{parts:[{text:system}]}, generationConfig:{responseMimeType:'application/json'},
          contents:[{parts:[{text:user}]}] }) });
    return (await r.json()).candidates[0].content.parts[0].text;
  }
  // ollama (local)
  const r = await fetch('http://localhost:11434/api/chat', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ model: process.env.OLLAMA_MODEL||'qwen2.5:7b', stream:false, format:'json',
      messages:[{role:'system',content:system},{role:'user',content:user}] }) });
  return (await r.json()).message.content;
}

const SYSTEM = `Ты SEO-копирайтер интернет-магазина итальянской мебели myarredo.by (Минск, Беларусь).
Пиши УНИКАЛЬНЫЙ, экспертный текст на русском, без эмодзи, СТРОГО по переданным полям — не выдумывай
характеристик, которых нет (если данных нет — «уточняется у менеджера»). Верни JSON с двумя строками HTML:
{"top": "<div class=\\"pd-mod\\">…верхнее описание: 2 абзаца + таблица .pd-spec + .pd-links…</div>",
 "seo": "<section class=\\"seo-desc\\" id=\\"seoDesc\\"><h2>…купить в Минске…</h2><p>лид</p><div class=\\"seo-rest\\" id=\\"seoRest\\"><h3>…</h3><ul class=\\"adv\\">6×<li></li></ul>2-3 таблицы .tbl-wrap>table.data; Стандарты (ГОСТ 16371-2014, ТР ТС 025/2012); Смотрите также .links; 8 УНИКАЛЬНЫХ .faq-card в .faq-grid; .tags; кнопка .seo-toggle#seoBtn с onclick-тогглом</section>"}
Без тегов <style>. Все 8 FAQ уникальны и конкретны про этот товар.`;

// ---------- field extraction ----------
function fields(html){
  const g=re=>{const m=html.match(re);return m?m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim():'';};
  const chars={}; for(const m of html.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g)) chars[m[1].trim()]=m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return { name:g(/<h1[^>]*>([\s\S]*?)<\/h1>/i), brand:chars['Фабрика']||'', coll:chars['Коллекция']||'',
    art:chars['Артикул']||'', style:chars['Стиль']||'', material:chars['Материал']||'', dims:chars['Размеры']||'',
    type:chars['Типы мебели']||'' };
}

// ---------- main ----------
const urls = readFileSync(new URL('../'+arg, import.meta.url),'utf8').trim().split('\n').filter(Boolean).slice(0, LIMIT);
const CSS = readFileSync(new URL('../templates/category-seo.css.html', import.meta.url),'utf8');
let i=0, done=0;
async function worker(){
  while(i<urls.length){ const url=urls[i++]; const slug=url.replace(/\/$/,'').split('/').pop();
    const outf=new URL('product-'+slug+'.html', OUT); if(existsSync(outf)){done++;continue;}
    try{
      let html=await (await fetch(url,{headers:H})).text();
      if(!/<div class="prod-descr"/.test(html)) continue;
      const f=fields(html);
      const raw=await callLLM(SYSTEM, `Поля товара:\n${JSON.stringify(f,null,1)}\nURL: ${url}`);
      const j=JSON.parse(raw);
      html=html.replace(/<head([^>]*)>/i,m=>m+`\n<base href="${url}">`);
      const title=(`${f.type||f.name.split(' ').slice(0,3).join(' ')} ${f.brand} — купить в Минске | Myarredo`).slice(0,60);
      html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${title}</title>`);
      // top block
      html=html.replace(/<div class="prod-descr"[\s\S]*?<\/div>\s*(?=<)/i, '');
      const top=`<div class="prod-descr" itemprop="description"><style>.pd-mod{font-family:'PT Sans',system-ui,Arial;color:#2a2a2a}.pd-mod p{margin:0 0 12px;font-size:15.5px;line-height:1.7}.pd-mod .pd-spec{border-collapse:collapse;max-width:620px;width:100%;margin:8px 0}.pd-mod .pd-spec td{border:1px solid #e3e3e3;padding:8px 12px}.pd-mod .pd-spec td:first-child{background:#f7faf7;color:#666;width:40%}.pd-cap{font-weight:700;color:#1f7a34;margin:14px 0 6px}.pd-links a{display:inline-block;margin:0 6px 6px 0;padding:5px 12px;background:#f4f7f4;border:1px solid #d7e6d9;border-radius:16px;color:#1f7a34;text-decoration:none;font-size:14px}</style>${j.top}</div>`;
      // (упрощённо: вставляем top после первого <h1> контейнера — в реальном шаблоне заменяем .prod-descr)
      const FOOT='<div class="footer jsftr"';
      const fi=html.indexOf(FOOT);
      const seo=CSS+j.seo;
      html = fi>=0 ? html.slice(0,fi)+top+seo+html.slice(fi) : html.replace(/<\/body>/i, top+seo+'</body>');
      writeFileSync(outf, html); done++;
      console.error('optimized', slug, `(${done}/${urls.length})`);
    }catch(e){ console.error('FAIL', slug, String(e).slice(0,80)); }
  }
}
await Promise.all(Array.from({length:CONC}, worker));
console.error('DONE. Optimized pages in ./site/  (provider='+PROVIDER+')');
