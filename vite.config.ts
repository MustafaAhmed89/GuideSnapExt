import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

/**
 * Strip the pdfobject CDN URL that jsPDF bundles for its `pdfobjectnewwindow`
 * output mode (which we never use). The Chrome Web Store MV3 policy rejects
 * any extension that contains remotely-hosted code URLs, even if they are
 * dead strings that are never executed.
 */
function stripRemoteCodeUrls(): import('vite').Plugin {
  return {
    name: 'strip-remote-code-urls',
    transform(code, id) {
      if (id.includes('jspdf') && code.includes('cdnjs.cloudflare.com')) {
        return {
          code: code.replace(
            'https://cdnjs.cloudflare.com/ajax/libs/pdfobject/2.1.1/pdfobject.min.js',
            ''
          ),
          map: null,
        };
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    stripRemoteCodeUrls(),
  ],
  build: {
    rollupOptions: {
      input: {
        offscreen: 'src/offscreen/offscreen.html',
        editor: 'src/editor/index.html',
      },
    },
  },
});
