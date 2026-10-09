import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function apiProxyPlugin(): Plugin {
  return {
    name: 'api-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.writeHead(200);
          res.end();
          return;
        }

        const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
        const target = urlObj.searchParams.get('target');
        if (!target) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing target URL' }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          const bodyBuffer = Buffer.concat(chunks);
          try {
            const forwardHeaders: Record<string, string> = {
              'Content-Type': (req.headers['content-type'] as string) || 'application/json',
            };
            if (req.headers.authorization) {
              forwardHeaders['Authorization'] = req.headers.authorization as string;
            }

            const targetResponse = await fetch(target, {
              method: req.method || 'POST',
              headers: forwardHeaders,
              body: bodyBuffer.length > 0 ? bodyBuffer : undefined,
            });

            res.writeHead(targetResponse.status, {
              'Content-Type': targetResponse.headers.get('content-type') || 'application/json',
              'Access-Control-Allow-Origin': '*',
            });

            const responseBuffer = await targetResponse.arrayBuffer();
            res.end(Buffer.from(responseBuffer));
          } catch (err: any) {
            res.writeHead(502, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(JSON.stringify({ error: `代理转发失败: ${err.message}` }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    apiProxyPlugin(),
  ],
  build: {
    emptyOutDir: false,
  },
});
