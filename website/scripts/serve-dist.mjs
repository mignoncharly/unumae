import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const port = Number(process.argv[2] ?? 4321);
const host = '127.0.0.1';
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const resolveRequest = (requestUrl) => {
  const pathname = decodeURIComponent(
    new URL(requestUrl, 'http://quality').pathname
  );
  const requested = resolve(root, `.${pathname}`);
  if (requested !== root && !requested.startsWith(`${root}${sep}`)) {
    return null;
  }
  if (existsSync(requested) && statSync(requested).isFile()) {
    return requested;
  }
  const index = resolve(requested, 'index.html');
  if (existsSync(index)) {
    return index;
  }
  const humanRoute = pathname.match(
    /^\/(?:([a-z]{2})\/)?human\/[0-9a-f-]{36}\/?$/i
  );
  if (humanRoute) {
    const shell = resolve(
      root,
      humanRoute[1] ? `${humanRoute[1]}/human/index.html` : 'human/index.html'
    );
    if (existsSync(shell)) return shell;
  }
  return null;
};

const server = createServer((request, response) => {
  const file = resolveRequest(request.url ?? '/');
  if (!file) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': types[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`Quality server listening at http://${host}:${port}\n`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
