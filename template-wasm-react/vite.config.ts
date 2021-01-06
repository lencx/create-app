import * as reactPlugin from 'vite-plugin-react';
import type { UserConfig } from 'vite';
import path from 'path';
const rustPlugin = require('vite-plugin-rust');

const config: UserConfig = {
  jsx: 'react',
  minify: 'esbuild',
  plugins: [
    reactPlugin,
    // https://github.com/gliheng/vite-plugin-rust
    // TODO: `vite build` - *.wasm files loss
    // Temporary solutions: scripts/wasm-copy.js
    rustPlugin({
      crates: {
        rust_crate: './rust-crate',
      },
    }),
  ],
  // see: https://github.com/vitejs/vite/blob/master/src/node/config.ts
  // the key must start and end with a slash
  alias: {
    '/@/': path.resolve(__dirname, 'src'),
    '/hooks/': path.resolve(__dirname, 'src/hooks'),
  },
};

export default config;