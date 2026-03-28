cd e:\ClickFlash
cd apps/management
npm i --ignore-scripts --legacy-peer-deps
npm run build
cd ../..
if (Test-Path 'out') { Remove-Item -Recurse -Force 'out' }
New-Item -ItemType Directory -Force -Path 'out' | Out-Null
Copy-Item -Recurse -Force 'apps/website/out/*' 'out'
New-Item -ItemType Directory -Force -Path 'out/gallery' | Out-Null
Copy-Item -Recurse -Force 'apps/gallery/dist/*' 'out/gallery'
New-Item -ItemType Directory -Force -Path 'out/manage' | Out-Null
Copy-Item -Recurse -Force 'apps/management/dist/*' 'out/manage'
if (Test-Path 'apps/website/public/_redirects') { Copy-Item -Force 'apps/website/public/_redirects' 'out/_redirects' }
npx wrangler pages deploy out --project-name clickflash-website --commit-dirty=true
