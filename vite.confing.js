import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // CRITICAL FIX: Set base to your repository name with slashes
  // This tells Vite your app lives at https://abusoki.github.io/ProjectIAO/
  base: '/', 
  build: {
    rollupOptions: {
      input: {
        // This tells Vite to build BOTH files
        main: resolve(__dirname, 'index.html'),
        // Ensure home.html exists in your root folder before adding this line
        home: resolve(__dirname, 'home.html'), 
      },
    },
  },
})
