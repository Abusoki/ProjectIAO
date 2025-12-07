import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // THIS LINE IS CRITICAL. It must match your Repo Name EXACTLY.
  // If your repo is named "Iron-Oil", change this to '/Iron-Oil/'
  base: '/ProjectIAO/', 
})