#!/usr/bin/env bash
# Local check without npm: type-check, compile to .dev/, serve with an import map for Phaser, and smoke-test in headless Chromium.
set -e
cd "$(dirname "$0")/.."
tsc -p tsconfig.json
rm -rf .dev && tsc -p tsconfig.dev.json
mkdir -p .dev/vendor && cp node_modules/phaser/dist/phaser.esm.js .dev/vendor/
cp src/styles.css src/trials/trials.css .dev/js/ 2>/dev/null; cp -r public/. .dev/ 2>/dev/null || true
mkdir -p .dev/resume && cp resume/index.html .dev/resume/ 2>/dev/null || true
python3 - <<'PY'
s=open('index.html').read()
s=s.replace('<script type="module" src="/src/main.ts"></script>','<script type="importmap">{"imports":{"phaser":"/vendor/phaser.esm.js"}}</script>\n<script type="module" src="/js/main.js"></script>')
open('.dev/index.html','w').write(s)
PY
# Vite bundles CSS imports; locally strip them and link the stylesheets instead.
find .dev/js -name '*.js' -exec sed -i -E "/^import '[^']+\.css';$/d" {} +
sed -i 's#</head>#<link rel="stylesheet" href="/js/styles.css"><link rel="stylesheet" href="/js/trials.css">\n</head>#' .dev/index.html
echo "built .dev"
