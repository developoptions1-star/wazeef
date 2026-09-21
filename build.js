const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  if (!fs.existsSync('dist')) fs.mkdirSync('dist');

  await esbuild.build({
    entryPoints: ['server.js'],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: 'dist/server.js',
    minify: false,
    sourcemap: false,
    external: [],
  });

  // Copy wasm
  const wasmSrc = path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, path.join(__dirname, 'dist/sql-wasm.wasm'));
  }

  const sz = (fs.statSync('dist/server.js').size / 1024).toFixed(0);
  console.log('dist/server.js: ' + sz + ' KB');
}

build().catch(e => { console.error(e); process.exit(1); });
