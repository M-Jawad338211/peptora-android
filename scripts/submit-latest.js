// Uploads the newest store build in build-artifacts/ straight from this Mac.
//   npm run submit:ios          -> newest .ipa to App Store Connect / TestFlight (xcrun altool)
//   npm run submit:android      -> newest .aab to the Play internal track, as a draft (fastlane)
//   npm run submit:ios:eas      -> same .ipa, but uploaded through EAS Submit (Expo's servers)
//   npm run submit:android:eas  -> same .aab, through EAS Submit
//
// Upload keys live outside the repo, in ~/.peptora/ (see RELEASING.md):
//   ~/.peptora/AuthKey_<KEYID>.p8          App Store Connect API key
//   ~/.peptora/play-service-account.json   Google Play service account key
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

const ASC_ISSUER_ID = process.env.ASC_API_ISSUER_ID || 'd8e2727b-2171-4d09-970d-5f7290b26131'
const PACKAGE_NAME = 'app.peptora'
const KEYS_DIR = path.join(os.homedir(), '.peptora')

const platform = process.argv[2]
const viaEas = process.argv.includes('--eas')
const ext = { android: '.aab', ios: '.ipa' }[platform]
if (!ext) {
  console.error('Usage: node scripts/submit-latest.js android|ios [--eas]')
  process.exit(1)
}

const artifacts = path.join(__dirname, '..', 'build-artifacts')
const builds = fs.existsSync(artifacts)
  ? fs
      .readdirSync(artifacts)
      .filter((f) => f.endsWith(ext))
      .map((f) => path.join(artifacts, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  : []
if (builds.length === 0) {
  console.error(`No ${ext} file in build-artifacts/. Run "npm run build:${platform}" first.`)
  process.exit(1)
}
const build = builds[0]

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' })
  if (result.error) {
    console.error(`Could not run ${cmd}: ${result.error.message}`)
    process.exit(1)
  }
  process.exit(result.status ?? 1)
}

function fail(message) {
  console.error(message)
  console.error('See "Uploading from this Mac" in RELEASING.md.')
  process.exit(1)
}

console.log(`Uploading ${path.basename(build)}${viaEas ? ' through EAS Submit' : ' from this Mac'}`)

if (viaEas) {
  run('eas', ['submit', '-p', platform, '--profile', 'production', '--path', build])
}

if (platform === 'ios') {
  const keys = fs.existsSync(KEYS_DIR)
    ? fs.readdirSync(KEYS_DIR).filter((f) => /^AuthKey_[A-Z0-9]+\.p8$/.test(f))
    : []
  if (keys.length === 0) fail(`No App Store Connect key found. Put AuthKey_<KEYID>.p8 in ${KEYS_DIR}/`)
  if (keys.length > 1) fail(`More than one AuthKey_*.p8 in ${KEYS_DIR}/. Keep only the current one.`)
  const keyId = keys[0].slice('AuthKey_'.length, -'.p8'.length)
  run('xcrun', [
    'altool',
    '--upload-package', build,
    '--api-key', keyId,
    '--api-issuer', ASC_ISSUER_ID,
    '--p8-file-path', path.join(KEYS_DIR, keys[0]),
  ])
}

if (platform === 'android') {
  const jsonKey = path.join(KEYS_DIR, 'play-service-account.json')
  if (!fs.existsSync(jsonKey)) fail(`No Google Play key found at ${jsonKey}`)
  run('fastlane', [
    'run', 'upload_to_play_store',
    `aab:${build}`,
    `package_name:${PACKAGE_NAME}`,
    'track:internal',
    'release_status:draft',
    `json_key:${jsonKey}`,
    'skip_upload_metadata:true',
    'skip_upload_changelogs:true',
    'skip_upload_images:true',
    'skip_upload_screenshots:true',
  ])
}
