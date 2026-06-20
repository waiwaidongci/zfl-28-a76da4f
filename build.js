'use strict';
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const SRC_HTML = path.join(__dirname, 'index.html');
const CSS_FILE = path.join(__dirname, 'css', 'style.css');
const ENTRY_JS = path.join(__dirname, 'src', 'index.js');
const GAME_LOGIC_ENTRY = path.join(__dirname, 'src', 'game-logic-index.js');

async function build() {
  console.log('Building for static deployment...');

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const jsResult = await esbuild.build({
    entryPoints: [ENTRY_JS],
    bundle: true,
    minify: false,
    write: false,
    format: 'iife',
    target: ['es2020'],
    outfile: 'bundle.js',
  });

  const cssContent = fs.readFileSync(CSS_FILE, 'utf-8');
  const htmlContent = fs.readFileSync(SRC_HTML, 'utf-8');

  const jsBundle = jsResult.outputFiles[0].text;

  const finalHtml = htmlContent
    .replace(
      '<link rel="stylesheet" href="css/style.css">',
      `<style>\n${cssContent}\n</style>`
    )
    .replace(
      '<script type="module" src="src/index.js"></script>',
      `<script>\n${jsBundle}\n</script>`
    );

  const outputPath = path.join(DIST_DIR, 'index.html');
  fs.writeFileSync(outputPath, finalHtml, 'utf-8');

  console.log('Build complete: ' + outputPath);
  console.log('File size: ' + (Buffer.byteLength(finalHtml) / 1024).toFixed(1) + ' KB');

  const gameLogicOutput = path.join(DIST_DIR, 'game-logic.js');
  await esbuild.build({
    entryPoints: [GAME_LOGIC_ENTRY],
    bundle: true,
    minify: false,
    format: 'cjs',
    target: ['es2020'],
    outfile: gameLogicOutput,
    define: {
      'localStorage': 'global.localStorage'
    }
  });

  console.log('Game logic bundle: ' + gameLogicOutput);
  console.log('File size: ' + (fs.statSync(gameLogicOutput).size / 1024).toFixed(1) + ' KB');

  console.log('✅ Build complete! Deploy the \'dist/\' folder to any static server.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
