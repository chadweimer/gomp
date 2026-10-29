import { defineConfig, Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ionicons(): Plugin {
  const src = path.resolve(__dirname, 'node_modules/ionicons/dist/svg');
  const dest = path.resolve(__dirname, 'dist/svg');

  return {
    name: 'ionicons',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url && (url.startsWith('/static/svg/') || url.startsWith('/svg/'))) {
          const iconName = url.replace(/^\/(static\/)?svg\//, '');
          const svgPath = path.resolve(src, iconName);
          if (fs.existsSync(svgPath)) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            fs.createReadStream(svgPath).pipe(res);
            return;
          }
        }
        next();
      });
    },
    writeBundle() {
      if (fs.existsSync(src)) {
        fs.mkdirSync(dest, { recursive: true });
        fs.cpSync(src, dest, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  base: '/static/',
  plugins: [ionicons()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5678',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    sourcemap: true,
  },
});
