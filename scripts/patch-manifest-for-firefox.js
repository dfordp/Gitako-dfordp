const path = require('path')
const fs = require('fs')

const manifestPath = path.join(__dirname, '..', 'dist', 'manifest.json')
const manifest = require(manifestPath)
manifest.manifest_version = 2
const serviceWorker = manifest.background?.['service_worker']
if (serviceWorker) {
  console.log('Patching background')
  manifest.background.scripts = [serviceWorker]
  Reflect.deleteProperty(manifest.background, 'service_worker')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
} else {
  console.log('Service worker field not found, skipped patching')
}
