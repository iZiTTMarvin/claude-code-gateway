import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

function normalizePreloadOutput() {
  return {
    name: 'normalize-preload-output',
    async closeBundle() {
      const preloadDir = path.resolve('dist-electron/preload');
      const jsFile = path.join(preloadDir, 'index.js');
      const mjsFile = path.join(preloadDir, 'index.mjs');
      const cjsFile = path.join(preloadDir, 'index.cjs');

      try {
        const sourceFile = await fs
          .access(jsFile)
          .then(() => jsFile)
          .catch(async () => {
            await fs.access(mjsFile);
            return mjsFile;
          });

        await fs.copyFile(sourceFile, cjsFile);

        await Promise.all([fs.rm(jsFile, { force: true }), fs.rm(mjsFile, { force: true })]);
      } catch {
        // 交给后续运行时报错，避免构建阶段因为文件尚未生成而中断监听
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // 主进程入口
        entry: 'electron/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['electron', 'electron-store', 'better-sqlite3'],
            },
          },
        },
      },
      preload: {
        // preload 脚本最终必须落盘为 .cjs，避免在 type:module 包作用域下被当作 ESM
        input: 'electron/preload/index.ts',
        vite: {
          plugins: [normalizePreloadOutput()],
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: 'index.js',
              },
            },
          },
        },
      },
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
