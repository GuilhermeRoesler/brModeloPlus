import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serve em /brModeloPlus/ — em dev/local o base continua "/"
const base =
  process.env.GITHUB_ACTIONS === 'true' ? '/brModeloPlus/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
  ],
})
