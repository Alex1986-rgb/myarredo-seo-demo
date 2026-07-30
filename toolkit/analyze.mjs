export function analyze(url, status, html) {
  const r = { url, status };
  if (!html) return r;
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1] || '';
  r.titleLen = title.trim().length;
  const md = (html.match(/<meta[^>]+name=["']description["'][^>]*>/i)||[])[0] || '';
  const mdc = (md.match(/content=["']([\s\S]*?)["']/i)||[])[1] || '';
  r.descLen = mdc.trim().length;
  r.h1 = (html.match(/<h1[\s>]/gi)||[]).length;
  r.canonical = /rel=["']canonical["']/i.test(html);
  r.noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  r.imgTotal = imgs.length;
  r.imgNoAlt = imgs.filter(t => !/\balt\s*=\s*["'][^"']*\S[^"']*["']/i.test(t)).length;
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join(' ');
  r.hasProduct = /"@type"\s*:\s*"Product"/.test(ld);
  r.hasOffer = /"@type"\s*:\s*"(Offer|AggregateOffer)"/.test(ld);
  r.hasBreadcrumb = /BreadcrumbList/.test(html);
  r.hasOrg = /"@type"\s*:\s*"Organization"/.test(ld);
  return r;
}
