import fs from 'node:fs';
const assets = {};
for (const file of ['index.html', ...fs.readdirSync('assets').map(f=>'assets/'+f)]) {
  const type = file.endsWith('.webp') ? 'image/webp' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
  assets['/'+file] = {type,body:fs.readFileSync(file).toString('base64')};
}
const handler = fs.readFileSync('relay-worker.js','utf8').replace('export async function rooms','async function rooms');
const source = handler + '\nconst assets = '+JSON.stringify(assets)+';\nexport default { async fetch(request, env) { const path = new URL(request.url).pathname; if (path.startsWith("/api/rooms/")) return rooms(request,env); const asset=assets[path === "/" ? "/index.html" : path]; if(!asset) return new Response("Not found",{status:404}); return new Response(Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)),{headers:{"Content-Type":asset.type,"Cache-Control":"no-cache"}}); }};';
fs.mkdirSync('dist/server',{recursive:true}); fs.mkdirSync('dist/.openai/drizzle',{recursive:true});
fs.writeFileSync('dist/server/index.js',source);
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
fs.cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
