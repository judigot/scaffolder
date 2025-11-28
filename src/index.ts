import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import process from 'node:process';
import router from '@/app/routes/index.ts';

dotenv.config();

const isProduction: boolean = process.env.NODE_ENV === 'production';
const PORT = Number.parseInt(process.env.VITE_BACKEND_PORT ?? '3000', 10);
const platform: string = process.platform;
let __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname));

if (platform === 'win32') {
  __dirname = __dirname.substring(1);
}

const publicDirectory = isProduction
  ? path.join(__dirname, '..', 'dist')
  : path.join(__dirname, 'public');

interface IHonoContext {
  html: (h: string) => Response;
  text: (t: string, s: number) => Response;
}

function isHonoContext(c: unknown): c is IHonoContext {
  if (c === null || typeof c !== 'object') {
    return false;
  }
  if (!('html' in c) || !('text' in c)) {
    return false;
  }
  const obj: { html?: unknown; text?: unknown } = c;
  return typeof obj.html === 'function' && typeof obj.text === 'function';
}

const app = new Hono();

app.use(compress());
app.use('*', cors());

app.route('/api', router);

const isVercel = process.env.VERCEL === '1';

if (isProduction && !isVercel) {
  app.use('*', serveStatic({ root: publicDirectory }));
  app.get('*', (c: unknown) => {
    if (!isHonoContext(c)) {
      return new Response('Internal Server Error', { status: 500 });
    }
    try {
      const htmlPath = path.join(publicDirectory, 'index.html');
      const html = readFileSync(htmlPath, 'utf-8');
      return c.html(html);
    } catch {
      return c.text('Not Found', 404);
    }
  });
}

export default app.fetch.bind(app);

if (!isVercel) {
  const startServer = async (): Promise<void> => {
    if (isProduction) {
      serve(
        {
          fetch: app.fetch.bind(app),
          port: PORT,
        },
        (info: { port: number }) => {
          // eslint-disable-next-line no-console
          console.log(
            `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on ${process.env.VITE_BACKEND_HOST ?? 'localhost'}:${String(info.port)}`,
          );
        },
      );
    } else {
      const { createServer } = await import('node:http');
      const viteModule = await import('vite');
      const vite = await viteModule.createServer({
        configFile: path.resolve(__dirname, '../vite.config.ts'),
        server: { middlewareMode: true },
        appType: 'spa',
      });

      const server = createServer((req, res) => {
        const url = req.url ?? '';
        if (url.startsWith('/api')) {
          const host = req.headers.host ?? 'localhost';
          const protocol = req.headers['x-forwarded-proto'] ?? 'http';
          const protocolStr = Array.isArray(protocol)
            ? (protocol[0] ?? 'http')
            : protocol;
          const fullUrl = `${protocolStr}://${host}${url}`;

          const headers: HeadersInit = {};
          for (const [key, value] of Object.entries(req.headers)) {
            if (value !== undefined) {
              headers[key] = Array.isArray(value) ? value.join(', ') : value;
            }
          }

          const handleRequest = async (): Promise<void> => {
            let body: BodyInit | undefined;
            if (req.method !== 'GET' && req.method !== 'HEAD') {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                if (chunk instanceof Buffer) {
                  chunks.push(chunk);
                }
              }
              body = Buffer.concat(chunks);
            }

            const request = new Request(fullUrl, {
              method: req.method,
              headers,
              body,
            });

            const response = await app.fetch(request);

            res.statusCode = response.status;
            response.headers.forEach((value: string, key: string) => {
              res.setHeader(key, value);
            });

            const responseBody = response.body;
            if (responseBody) {
              const reader = responseBody.getReader();
              const pump = async (): Promise<void> => {
                try {
                  let done = false;
                  while (!done) {
                    const result = await reader.read();
                    done = result.done;
                    if (done) {
                      res.end();
                    } else {
                      res.write(result.value);
                    }
                  }
                } catch {
                  res.destroy();
                }
              };
              await pump();
            } else {
              res.end();
            }
          };

          void handleRequest();
        } else {
          vite.middlewares(req, res, () => {
            res.statusCode = 404;
            res.end('Not Found');
          });
        }
      });

      const portString = String(PORT);
      server.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(
          `${platform.charAt(0).toUpperCase() + platform.slice(1)} is running on ${process.env.VITE_BACKEND_HOST ?? 'localhost'}:${portString}`,
        );
      });
    }
  };

  void startServer();
}
