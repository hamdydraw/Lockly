# Lockly on Android

The Android app is the same React client wrapped in [Capacitor](https://capacitorjs.com/):
a native shell around a WebView that loads the bundled web assets from inside the APK.

**The APK does not contain your vault.** There is no server, database or encryption key on
the phone — the app is a client that talks to your Lockly server over the network. On first
launch it asks for that server's address and remembers it (Settings → Server to change it).

## Getting the APK

### From GitHub Actions (no toolchain needed)

The **Android APK** workflow builds on every push to `main` that touches `client/`, and can
be run on demand from the Actions tab. Open the finished run and download the `lockly-apk`
artifact — you can do this from the phone's browser directly.

The artifact is a zip; extract it and install `app-debug.apk`. Android will ask you to allow
installing from unknown sources, because this is a debug-signed personal build rather than a
Play Store release.

### Locally

Requires JDK 21 and the Android SDK (both come with Android Studio):

```bash
npm run android:build
```

The APK lands at `client/android/app/build/outputs/apk/debug/app-debug.apk`. With the phone
connected over USB and debugging enabled, `npm run android:install` pushes it straight to the
device.

## Pointing the app at your server

### A server on your LAN

Start the server so it listens on all interfaces (it already does) and find your machine's
LAN address:

```bash
ipconfig
```

Enter `<that-address>:4000` in the app — e.g. `172.16.51.26:4000`. Phone and PC must be on
the same network, and Windows Firewall has to allow inbound TCP on the port. If the app can't
connect, that firewall rule is the usual reason; you can add one from an **Administrator**
PowerShell:

```powershell
New-NetFirewallRule -DisplayName "Lockly 4000" -Direction Inbound -Protocol TCP -LocalPort 4000 -Action Allow -Profile Private
```

Note that a LAN address is plain `http://`, so **your master password and vault contents
cross the network unencrypted**. That is usually acceptable on a home network you control,
but the app will warn you, and it is not something to do on public or office Wi-Fi.

### A public deployment

Deploy the server for free as described in [DEPLOY.md](DEPLOY.md) (Render + Neon) and enter
the `https://` URL, e.g. `https://lockly-xxxx.onrender.com`. This is the better option: it works
on mobile data, from anywhere, and the connection is encrypted. On the free plan the server
sleeps after 15 idle minutes, so the first request can take about a minute — wait and retry.

## How the mobile build differs

These are the places the Android target needed different behaviour from the web app:

- **Auth uses a bearer token, not a cookie.** The WebView is its own origin
  (`https://localhost`), so the server's `SameSite=lax` session cookie would never be sent.
  The client sends `X-Auth-Mode: token`, gets the JWT in the response body, and sends it as
  `Authorization: Bearer`. Browsers are untouched and keep the httpOnly cookie.
- **CORS** allows the Capacitor origins (`server/src/index.ts`).
- **Cleartext HTTP is permitted** via `network_security_config.xml`, since self-hosted LAN
  servers rarely have certificates. `allowMixedContent` in `capacitor.config.ts` is the
  matching WebView setting.
- **File downloads** go through the Filesystem + Share plugins; an `<a download>` silently
  does nothing in a WebView. Files are written to the cache directory rather than a
  browsable folder, so decrypted copies don't linger.
- **`allowBackup="false"`** keeps the saved session token out of Android cloud backups.

## Rebuilding after client changes

`npm run android:build` runs the web build and `cap sync` for you. If you only changed web
assets, `npx cap sync android` inside `client/` is enough before rebuilding in Android Studio.
