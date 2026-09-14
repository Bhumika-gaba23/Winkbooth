import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['winkbooth-mark.svg'],
    manifest: { name: 'WinkBooth', short_name: 'WinkBooth', description: 'Your private browser photo booth', theme_color: '#fff0f5', background_color: '#fff0f5', display: 'standalone', start_url: '/', icons: [{src:'/winkbooth-mark.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}] },
    workbox: { navigateFallback: '/index.html', globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,mp3,ogg}'] }
  })],
  test: { environment: 'node' }
});
