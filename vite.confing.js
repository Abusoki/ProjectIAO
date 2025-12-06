import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // DEPLOYMENT CONFIGURATION:
  // 1. If deploying to a custom domain (e.g., https://cardboardbonfire.com), keep base as '/'
  // 2. If deploying to standard GitHub Pages (e.g., https://username.github.io/iron-and-oil/), 
  //    change base to '/iron-and-oil/' (matching your repo name)
  base: '/', 
})
