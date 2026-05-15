var fs = require("fs");
var path = require("path");
var zlib = require("zlib");

var root = path.resolve(__dirname, "..");
var failures = [];

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function readPngSize(name) {
  var file = fs.readFileSync(path.join(root, name));
  var signature = file.subarray(0, 8).toString("hex");
  assert(signature === "89504e470d0a1a0a", name + " is a PNG");
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20)
  };
}

var html = read("index.html");
var css = read("styles.css");
var js = read("app.js");
var manifest = JSON.parse(read("manifest.webmanifest"));

assert(html.indexOf("width=600, height=600") !== -1, "viewport is fixed to 600x600");
assert(/class="[^"]*screen[^"]*"/.test(html), "screens use .screen class");
assert(new Set(Array.from(html.matchAll(/id="([^"]+-screen)"/g)).map(function (match) {
  return match[1];
})).size >= 3, "screens have unique ids");
assert((html.match(/class="[^"]*focusable/g) || []).length >= 8, "interactive elements are focusable");
assert((html.match(/data-action="/g) || []).length >= 8, "buttons use data-action attributes");
assert(html.indexOf('data-action="back"') !== -1, "back buttons use data-action=back");
assert(html.indexOf('data-external-link href="https://www.youtube.com/" target="_self"') !== -1, "YouTube home is a same-window anchor");
assert(html.indexOf('data-external-link href="https://www.youtube.com/feed/subscriptions" target="_self"') !== -1, "subscriptions is a same-window anchor");
assert(html.indexOf('id="watch-link"') !== -1 && html.indexOf('href="https://www.youtube.com/watch?v=M7lc1UVf-VE"') !== -1, "watch link is a real anchor");
assert(html.indexOf('id="signin-url"') !== -1, "sign-in URL fallback is visible");
assert(html.indexOf('data-action="copy-signin-url"') !== -1, "sign-in URL copy fallback is available");
assert(html.indexOf('target="_blank"') === -1, "external links do not use target=_blank");
assert(html.indexOf('rel="manifest" href="manifest.webmanifest"') !== -1, "manifest is linked");
assert(html.indexOf('rel="icon" href="favicon.png"') !== -1, "favicon is linked");

assert(css.indexOf("width: 600px") !== -1 && css.indexOf("height: 600px") !== -1, "CSS fixes the 600px canvas");
assert(css.indexOf("background: var(--bg)") !== -1, "page background uses transparent black variable");
assert(css.indexOf("--bg: #000000") !== -1, "black is reserved for the page canvas");
assert(css.indexOf("--focus: #44d7ff") !== -1, "visible cyan focus ring is defined");
assert(css.indexOf("min-height: 88px") !== -1, "primary controls meet 88dp target");

assert(js.indexOf("addEventListener(\"keydown\"") !== -1, "keydown listener is present");
assert(js.indexOf("event.preventDefault()") !== -1, "D-pad key handling prevents default scrolling");
assert(js.indexOf("isExternalAnchor") !== -1, "external anchor handling preserves native navigation");
assert(js.indexOf("navigateToExternal") !== -1, "fallback top-level external navigation is present");
assert(js.indexOf("window.open") === -1, "app does not use popup navigation");
assert(js.indexOf("window.YT.Player") !== -1, "YouTube web player API is used");
assert(js.indexOf("localStorage") !== -1, "localStorage persistence is present");
assert(js.indexOf("serviceWorker") !== -1, "service worker registration is present");
assert(!/client_secret|refresh_token|password\s*=|AIza[0-9A-Za-z_-]{20,}/.test(js), "app JS contains no Google secrets or API keys");

assert(manifest.icons && manifest.icons[0] && manifest.icons[0].src === "favicon.png", "manifest references favicon.png");
assert(manifest.background_color === "#000000", "manifest background is black");
assert(manifest.display === "standalone", "manifest uses standalone display");

var size = readPngSize("favicon.png");
assert(size.width >= 53 && size.height >= 53, "favicon is larger than 52x52");

var gzipped = zlib.gzipSync(Buffer.from(js));
assert(gzipped.length < 500 * 1024, "JavaScript is under 500KB gzipped");

if (failures.length) {
  console.error("Check failed:");
  failures.forEach(function (failure) {
    console.error("- " + failure);
  });
  process.exit(1);
}

console.log("All checks passed.");
console.log("app.js gzip bytes: " + gzipped.length);
console.log("favicon: " + size.width + "x" + size.height + " PNG");
