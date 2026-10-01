// Increments android.versionCode and ios.buildNumber in app.json.
// Usage: npm run bump            -> build numbers +1
//        npm run bump -- 1.3.0   -> also sets the app version
const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '..', 'app.json')
const config = JSON.parse(fs.readFileSync(file, 'utf8'))
const expo = config.expo

const newVersion = process.argv[2]
if (newVersion) {
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error(`"${newVersion}" is not a version like 1.3.0`)
    process.exit(1)
  }
  expo.version = newVersion
}

expo.android.versionCode = Number(expo.android.versionCode || 0) + 1
expo.ios.buildNumber = String(Number(expo.ios.buildNumber || 0) + 1)

fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n')
console.log(
  `version ${expo.version} · Android versionCode ${expo.android.versionCode} · iOS buildNumber ${expo.ios.buildNumber}`
)
