import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/cfb-recruit-hub/',
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.js'],
  },
})
