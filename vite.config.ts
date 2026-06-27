import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * MediaPipe 的 vision_bundle.mjs 末尾带
 *   `//# sourceMappingURL=vision_bundle_mjs.js.map`
 * 但 .map 文件未随包发布，Vite dev server 会尝试读取并抛 ENOENT 警告。
 *
 * 在 load 钩子里读取源文件，去掉 sourceMappingURL 注释行，
 * 并返回 map: null 显式声明无 sourcemap。这样 Vite 不再尝试加载。
 */
function suppressMediaPipeSourceMapWarning(): Plugin {
  return {
    name: 'suppress-mediapipe-sourcemap-warning',
    enforce: 'pre',
    async load(id) {
      const cleanId = id.split('?')[0]
      if (
        cleanId.includes('tasks-vision') &&
        cleanId.endsWith('vision_bundle.mjs')
      ) {
        const raw = await readFile(cleanId, 'utf8')
        const stripped = raw.replace(/\n?\/\/#\s*sourceMappingURL=[^\n]+/g, '')
        return { code: stripped, map: null }
      }
      return null
    },
  }
}

// GitHub Pages 部署在用户名子路径下，例如
//   https://amoihans.github.io/gesture_recgnz/
// 所以 base 应设为 '/gesture_recgnz/'；本地开发时保持 '/'
const BASE = process.env.GITHUB_PAGES
  ? '/gesture_recgnz/'
  : '/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss(), suppressMediaPipeSourceMapWarning()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
})