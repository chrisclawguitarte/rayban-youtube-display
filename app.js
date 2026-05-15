(function () {
  "use strict";

  var CONFIG = {
    appName: "Ray-Ban YouTube Display",
    storageKey: "rayban-youtube-display:v1",
    defaultVideoId: "M7lc1UVf-VE",
    youtubeBase: "https://www.youtube.com"
  };

  var state = {
    currentScreen: "home-screen",
    screenStack: [],
    activeVideoId: CONFIG.defaultVideoId,
    player: null,
    playerReady: false,
    playerState: "idle",
    apiPromise: null,
    toastTimer: 0
  };

  var playerTarget;
  var playerStatus;
  var videoTitle;
  var toast;

  document.addEventListener("DOMContentLoaded", function () {
    playerTarget = document.getElementById("player-target");
    playerStatus = document.getElementById("player-status");
    videoTitle = document.getElementById("video-title");
    toast = document.getElementById("toast");

    restoreState();
    bindEvents();
    registerServiceWorker();

    var launchVideo = getLaunchVideoId();
    if (launchVideo) {
      startVideo(launchVideo, true);
    } else {
      focusFirst();
    }
  });

  function bindEvents() {
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("click", function (event) {
      var target = event.target.closest("[data-action]");
      if (!target) {
        return;
      }
      handleAction(target.dataset.action, target);
    });
  }

  function handleKeydown(event) {
    var keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " ", "Escape", "Backspace"];
    if (keys.indexOf(event.key) === -1) {
      return;
    }

    event.preventDefault();

    if (event.key.indexOf("Arrow") === 0) {
      moveFocus(event.key.replace("Arrow", "").toLowerCase());
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      var active = document.activeElement;
      if (active && active.classList.contains("focusable")) {
        active.click();
      }
      return;
    }

    goBack();
  }

  function handleAction(action, element) {
    switch (action) {
      case "play-video":
        startVideo(element.dataset.video || CONFIG.defaultVideoId, false);
        break;
      case "player-toggle":
        togglePlayer();
        break;
      case "seek-back":
        seekBy(-10);
        break;
      case "seek-forward":
        seekBy(10);
        break;
      case "open-watch":
        navigateToYouTube(watchUrl(state.activeVideoId));
        break;
      case "open-youtube-home":
        navigateToYouTube(CONFIG.youtubeBase + "/");
        break;
      case "open-youtube-subscriptions":
        navigateToYouTube(CONFIG.youtubeBase + "/feed/subscriptions");
        break;
      case "open-youtube-signin":
        navigateToYouTube(CONFIG.youtubeBase + "/account");
        break;
      case "show-account":
        showScreen("account-screen");
        break;
      case "home":
        showScreen("home-screen", true);
        break;
      case "back":
        goBack();
        break;
      default:
        showToast("Action unavailable");
    }
  }

  function startVideo(videoId, fromLaunch) {
    var safeId = normalizeVideoId(videoId);
    if (!safeId) {
      showToast("Invalid YouTube video id");
      return;
    }

    state.activeVideoId = safeId;
    saveState();
    videoTitle.textContent = fromLaunch ? "Launched video" : "Test video";
    playerStatus.textContent = "Loading YouTube player...";
    showScreen("player-screen");
    createOrLoadPlayer(safeId);
  }

  function createOrLoadPlayer(videoId) {
    if (state.player && typeof state.player.loadVideoById === "function") {
      state.playerReady = true;
      playerStatus.textContent = "Loading selected video...";
      state.player.loadVideoById(videoId);
      return;
    }

    state.playerReady = false;
    ensurePlayerPlaceholder("Loading YouTube player...");

    loadYouTubeApi()
      .then(function () {
        playerTarget.innerHTML = "";
        state.player = new window.YT.Player("player-target", {
          width: 432,
          height: 243,
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
          }
        });
      })
      .catch(function () {
        loadFallbackIframe(videoId);
      });
  }

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }

    if (state.apiPromise) {
      return state.apiPromise;
    }

    state.apiPromise = new Promise(function (resolve, reject) {
      var timeout = window.setTimeout(function () {
        reject(new Error("YouTube API timed out"));
      }, 6000);

      window.onYouTubeIframeAPIReady = function () {
        window.clearTimeout(timeout);
        resolve();
      };

      var script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = function () {
        window.clearTimeout(timeout);
        reject(new Error("YouTube API failed"));
      };
      document.head.appendChild(script);
    });

    return state.apiPromise;
  }

  function onPlayerReady(event) {
    state.playerReady = true;
    playerStatus.textContent = "Ready. YouTube handles account and Premium state.";
    try {
      event.target.playVideo();
    } catch (error) {
      playerStatus.textContent = "Ready. Press Play / Pause to start.";
    }
    focusFirst();
  }

  function onPlayerStateChange(event) {
    var YT = window.YT || {};
    var playerStates = YT.PlayerState || {};
    if (event.data === playerStates.PLAYING) {
      state.playerState = "playing";
      playerStatus.textContent = "Playing through the YouTube web player.";
    } else if (event.data === playerStates.PAUSED) {
      state.playerState = "paused";
      playerStatus.textContent = "Paused.";
    } else if (event.data === playerStates.ENDED) {
      state.playerState = "ended";
      playerStatus.textContent = "Video ended.";
    } else if (event.data === playerStates.BUFFERING) {
      playerStatus.textContent = "Buffering...";
    }
  }

  function onPlayerError() {
    playerStatus.textContent = "YouTube could not play this video inline.";
    showToast("Open on YouTube for normal playback");
  }

  function loadFallbackIframe(videoId) {
    var iframe = document.createElement("iframe");
    iframe.title = "YouTube web player";
    iframe.src = embedUrl(videoId);
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    playerTarget.innerHTML = "";
    playerTarget.appendChild(iframe);
    state.playerReady = false;
    playerStatus.textContent = "Inline player loaded. YouTube controls account state.";
    focusFirst();
  }

  function ensurePlayerPlaceholder(text) {
    playerTarget.innerHTML = "";
    var placeholder = document.createElement("div");
    placeholder.className = "player-placeholder";
    placeholder.textContent = text;
    playerTarget.appendChild(placeholder);
  }

  function togglePlayer() {
    if (!state.playerReady || !state.player) {
      loadFallbackIframe(state.activeVideoId);
      return;
    }

    if (state.playerState === "playing") {
      state.player.pauseVideo();
    } else {
      state.player.playVideo();
    }
  }

  function seekBy(seconds) {
    if (!state.playerReady || !state.player || typeof state.player.seekTo !== "function") {
      showToast("Seek is available after the player is ready");
      return;
    }

    var currentTime = 0;
    if (typeof state.player.getCurrentTime === "function") {
      currentTime = state.player.getCurrentTime() || 0;
    }
    state.player.seekTo(Math.max(0, currentTime + seconds), true);
  }

  function navigateToYouTube(url) {
    window.location.href = url;
  }

  function showScreen(screenId, resetStack) {
    var current = document.getElementById(state.currentScreen);
    var next = document.getElementById(screenId);
    if (!next || current === next) {
      return;
    }

    if (current && !resetStack) {
      state.screenStack.push(state.currentScreen);
    }
    if (resetStack) {
      state.screenStack = [];
    }

    document.querySelectorAll(".screen").forEach(function (screen) {
      screen.classList.toggle("active", screen.id === screenId);
    });
    state.currentScreen = screenId;
    window.setTimeout(focusFirst, 0);
  }

  function goBack() {
    var previous = state.screenStack.pop();
    if (!previous) {
      if (state.currentScreen !== "home-screen") {
        showScreen("home-screen", true);
      }
      return;
    }

    document.querySelectorAll(".screen").forEach(function (screen) {
      screen.classList.toggle("active", screen.id === previous);
    });
    state.currentScreen = previous;
    window.setTimeout(focusFirst, 0);
  }

  function activeFocusables() {
    var screen = document.getElementById(state.currentScreen);
    if (!screen) {
      return [];
    }
    return Array.prototype.slice.call(screen.querySelectorAll(".focusable:not([disabled])"))
      .filter(function (element) {
        return element.offsetParent !== null;
      });
  }

  function focusFirst() {
    var elements = activeFocusables();
    if (elements.length) {
      focusElement(elements[0]);
    }
  }

  function focusElement(element) {
    element.focus({ preventScroll: true });
    if (typeof element.scrollIntoView === "function") {
      element.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function moveFocus(direction) {
    var elements = activeFocusables();
    if (!elements.length) {
      return;
    }

    var current = document.activeElement;
    if (elements.indexOf(current) === -1) {
      focusElement(elements[0]);
      return;
    }

    var currentRect = current.getBoundingClientRect();
    var currentCenter = centerOf(currentRect);
    var scored = elements
      .filter(function (element) {
        return element !== current;
      })
      .map(function (element) {
        var rect = element.getBoundingClientRect();
        var center = centerOf(rect);
        var dx = center.x - currentCenter.x;
        var dy = center.y - currentCenter.y;
        var primary = direction === "left" || direction === "right" ? dx : dy;
        var secondary = direction === "left" || direction === "right" ? dy : dx;
        var inDirection =
          (direction === "left" && dx < -2) ||
          (direction === "right" && dx > 2) ||
          (direction === "up" && dy < -2) ||
          (direction === "down" && dy > 2);

        return {
          element: element,
          inDirection: inDirection,
          score: Math.abs(primary) * 10 + Math.abs(secondary)
        };
      })
      .filter(function (item) {
        return item.inDirection;
      })
      .sort(function (a, b) {
        return a.score - b.score;
      });

    if (scored.length) {
      focusElement(scored[0].element);
      return;
    }

    var index = elements.indexOf(current);
    var backwards = direction === "left" || direction === "up";
    var nextIndex = backwards ? index - 1 : index + 1;
    if (nextIndex < 0) {
      nextIndex = elements.length - 1;
    } else if (nextIndex >= elements.length) {
      nextIndex = 0;
    }
    focusElement(elements[nextIndex]);
  }

  function centerOf(rect) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function getLaunchVideoId() {
    var params = new URLSearchParams(window.location.search);
    return normalizeVideoId(params.get("v") || params.get("video") || params.get("url"));
  }

  function normalizeVideoId(value) {
    if (!value) {
      return "";
    }

    var trimmed = String(value).trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    try {
      var parsed = new URL(trimmed);
      if (parsed.hostname === "youtu.be") {
        return normalizeVideoId(parsed.pathname.slice(1));
      }
      if (parsed.hostname.endsWith("youtube.com")) {
        if (parsed.pathname === "/watch") {
          return normalizeVideoId(parsed.searchParams.get("v"));
        }
        var parts = parsed.pathname.split("/").filter(Boolean);
        if ((parts[0] === "embed" || parts[0] === "shorts") && parts[1]) {
          return normalizeVideoId(parts[1]);
        }
      }
    } catch (error) {
      return "";
    }

    return "";
  }

  function watchUrl(videoId) {
    return CONFIG.youtubeBase + "/watch?v=" + encodeURIComponent(videoId);
  }

  function embedUrl(videoId) {
    return CONFIG.youtubeBase + "/embed/" + encodeURIComponent(videoId) +
      "?autoplay=1&playsinline=1&rel=0&modestbranding=1";
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(function () {
      toast.classList.remove("visible");
    }, Math.min(8000, 3500 + Math.max(0, message.split(" ").length - 2) * 300));
  }

  function restoreState() {
    try {
      var raw = window.localStorage.getItem(CONFIG.storageKey);
      if (!raw) {
        return;
      }
      var saved = JSON.parse(raw);
      var savedVideo = normalizeVideoId(saved.activeVideoId);
      if (savedVideo) {
        state.activeVideoId = savedVideo;
      }
    } catch (error) {
      window.localStorage.removeItem(CONFIG.storageKey);
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        activeVideoId: state.activeVideoId,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      // Local storage can be disabled in some webviews; playback still works.
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
      return;
    }

    navigator.serviceWorker.register("service-worker.js").catch(function () {
      // Static caching is optional; do not block the player on registration errors.
    });
  }
})();
