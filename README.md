# Ray-Ban YouTube Display

A 600x600 Meta Ray-Ban Display compatible web app that launches and controls the YouTube web player with D-pad input.

## Authentication

This app does not request, store, proxy, or use Google credentials. It does not use a YouTube API key or OAuth token. YouTube Premium behavior comes only from the normal YouTube web session in the browser or glasses WebView. If YouTube asks for sign-in, sign in on youtube.com, not in this app.

The YouTube home, subscriptions, watch, and sign-in controls are same-window anchors instead of popups. If the glasses WebView blocks Google sign-in, use the visible sign-in URL fallback from the Account screen in a full browser on the device/account you want YouTube to use.

## Run Locally

~~~bash
npm start
~~~

Open `http://localhost:3000` and use arrow keys plus Enter to simulate the glasses D-pad.

To launch a specific video, pass an 11-character YouTube video id:

~~~text
http://localhost:3000/?v=M7lc1UVf-VE
~~~

YouTube URLs also work through the `url` parameter when URL-encoded.

## Device Setup

Meta Ray-Ban Display web apps need a public HTTPS URL. After deploying, add the URL in the Meta AI app under Display Glasses settings, App connections, Web apps.

Public test URL:

~~~text
https://chrisclawguitarte.github.io/rayban-youtube-display/
~~~

The QR deep link for adding the app is saved as `qr-display.png`.

The app uses:

- Fixed `600x600` viewport
- Dark transparent display canvas
- `.focusable` controls with visible cyan focus
- Arrow key D-pad navigation
- Enter/Space activation
- Escape/Backspace back navigation
- Static asset service worker cache
