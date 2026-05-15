# Meta Display Playlist

A 600x600 Meta Ray-Ban Display compatible web app for playing a YouTube playlist inline with D-pad navigation.

The app no longer exposes dead outbound navigation. Meta Ray-Ban Display testing showed same-origin app reload works, but external top-level navigation does not leave the web app container. This version stays inside the app and uses the YouTube iframe player only.

## Playlist

Configured playlist:

https://youtube.com/playlist?list=PL7bU9mtR4VuCsaFjk5VBO8gWRd7pkzqrO

Playlist metadata is generated into same-origin playlist.json from YouTube's public playlist RSS feed. The in-app Refresh button reloads that JSON without trying to navigate away from the app.

To refresh the checked-in playlist JSON:

~~~bash
npm run refresh-playlist
~~~

A GitHub Actions workflow also refreshes playlist.json every 30 minutes and commits only when the playlist data changes.

## Run Locally

~~~bash
npm start
~~~

Open http://localhost:3000 and use arrow keys plus Enter to simulate the glasses D-pad.

## Device Setup

Meta Ray-Ban Display web apps need a public HTTPS URL. Add the deployed URL in the Meta AI app under Display Glasses settings, App connections, Web apps.

Public test URL:

~~~text
https://chrisclawguitarte.github.io/rayban-youtube-display/
~~~

The app uses:

- Fixed 600x600 viewport
- Dark transparent display canvas
- focusable controls with visible cyan focus
- Arrow key D-pad navigation
- Enter/Space activation
- Escape/Backspace back navigation
- Same-origin playlist refresh
- Static asset service worker cache
