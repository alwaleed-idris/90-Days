Web (Vercel): New Project -> Import -> Framework Preset "Other" (no build command) -> Deploy. Or run `vercel` inside this folder.

Android APK:
- Every push runs .github/workflows/android.yml, which builds the APK and attaches it to a GitHub Release (Releases page).
- Local build (needs Android Studio / Android SDK): npm ci && npm run apk
  Output: android/app/build/outputs/apk/release/app-release.apk
- Open in Android Studio: npm run sync, then open the android/ folder.
- index.html stays the single source of the app; native.js adds Android notifications and backup sharing.
