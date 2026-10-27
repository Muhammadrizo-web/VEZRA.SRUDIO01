// Dev-сервер Vezra Studio: собирает сайт (build.py), открывает его на http://localhost:3000
// и пересобирает при изменении templates/, src/, site/, site.json, i18n/. Без зависимостей.
//
// Защита от бесконечной перезагрузки (Windows присылает события даже на чтение файлов):
//  1) сборка запускается только если у исходников изменились размер или время изменения;
//  2) страница в браузере перезагружается только если изменился готовый сайт.
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'preview');
const PORT = Number(process.env.PORT) || 3000;
// По умолчанию страница НЕ перезагружается сама (обновляйте F5). Автообновление: npm run dev:live
const NO_RELOAD = !process.argv.includes('--live');

// Ищем Python: на Windows это обычно "py" или "python"
const PY = ['python', 'py', 'python3'].find((cmd) => {
  const r = spawnSync(cmd, ['-c', 'import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)'], { stdio: 'ignore' });
  return r.status === 0;
});
if (!PY) {
  console.error('\n✖ Python 3 не найден. Установите его с https://www.python.org/downloads/ (галочка "Add to PATH").\n');
  process.exit(1);
}
const deps = spawnSync(PY, ['-c', 'import jinja2, PIL'], { stdio: 'ignore' });
if (deps.status !== 0) {
  console.log('→ Ставлю библиотеки jinja2 и pillow...');
  const pip = spawnSync(PY, ['-m', 'pip', 'install', 'jinja2', 'pillow'], { stdio: 'inherit' });
  if (pip.status !== 0) { console.error('\n✖ Не удалось поставить библиотеки. Выполните: ' + PY + ' -m pip install jinja2 pillow\n'); process.exit(1); }
}

function build() {
  const r = spawnSync(PY, [path.join(ROOT, 'build.py')], { cwd: ROOT, encoding: 'utf-8' });
  if (r.status === 0) { console.log('✔ ' + new Date().toLocaleTimeString() + '  ' + (r.stdout || '').trim().split('\n').pop()); return true; }
  console.error('✖ Ошибка сборки:\n' + (r.stderr || r.stdout));
  return false;
}

// Отпечаток готового сайта: меняется, только если изменились страницы, стили или скрипт
function outputHash() {
  const h = crypto.createHash('sha1');
  try {
    ['', 'en', 'uz'].forEach((sub) => {
      const dir = path.join(OUT, sub);
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).filter((n) => /\.(html|css|js)$/.test(n)).sort()
        .forEach((n) => { h.update(sub + '/' + n); h.update(fs.readFileSync(path.join(dir, n))); });
    });
  } catch (e) { /* папки ещё нет */ }
  return h.digest('hex');
}

if (!build()) process.exit(1);
if (process.argv.includes('--build')) process.exit(0);
let outHash = outputHash();

// Автообновление страницы в браузере
const clients = new Set();
const RELOAD = NO_RELOAD ? '' : '<script>(function(){var s=new EventSource("/__reload");s.onmessage=function(e){if(e.data==="reload")location.reload()};})()</script>';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  if (req.url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 3000\n\n');
    clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(OUT, path.normalize(p));
  if (!file.startsWith(OUT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  let status = 200;
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { status = 404; file = path.join(OUT, '404.html'); }
  const ext = path.extname(file);
  let body = fs.readFileSync(file);
  if (ext === '.html') body = body.toString().replace('</body>', RELOAD + '</body>');
  // шрифты и картинки кэшируются, страницы — нет
  const cache = /\.(woff2|webp|png|jpg|svg)$/.test(ext) ? 'public, max-age=86400' : 'no-cache';
  res.writeHead(status, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache });
  res.end(body);
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\n✖ Порт ${PORT} уже занят — скорее всего, это старый запуск сервера.\n` +
      '  Закройте его одним из способов:\n' +
      '   • закройте все терминалы в VS Code (значок корзины) и запустите npm run dev снова;\n' +
      '   • или выполните в терминале:  taskkill /F /IM node.exe   и снова npm run dev\n');
    process.exit(1);
  }
  throw e;
});
server.listen(PORT, () => console.log(`\n  Сайт: http://localhost:${PORT}\n  ${NO_RELOAD ? 'После правок обновите страницу клавишей F5.' : 'Правьте файлы — страница обновится сама.'} Остановить: Ctrl+C\n`));

const WATCH = ['templates', 'src', 'site', 'site.json', 'i18n'].map((x) => path.join(ROOT, x));
function snapshot() {
  const out = [];
  WATCH.forEach((p) => {
    (function walk(q) {
      let st; try { st = fs.statSync(q); } catch (e) { return; }
      if (st.isDirectory()) fs.readdirSync(q).forEach((n) => walk(path.join(q, n)));
      else out.push(q + ':' + st.size + ':' + Math.round(st.mtimeMs));
    })(p);
  });
  return out.sort().join('|');
}
let last = snapshot(), timer, building = false;
function check() {
  if (building) return;
  const now = snapshot();
  if (now === last) return;
  building = true;
  const ok = build();
  last = snapshot();
  building = false;
  if (!ok) return;
  const h = outputHash();
  if (h !== outHash) { outHash = h; clients.forEach((c) => c.write('data: reload\n\n')); }
}
for (const target of WATCH) {
  if (!fs.existsSync(target)) continue;
  try { fs.watch(target, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(check, 400); }); }
  catch (e) { /* recursive watch не поддерживается — подстрахует опрос ниже */ }
}
setInterval(check, 2000);
