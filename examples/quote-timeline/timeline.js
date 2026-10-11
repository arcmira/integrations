"use strict";

const fixture = window.QUOTE_FIXTURE;
const $ = (id) => document.getElementById(id);
let active = 0;
let player;
let ready = false;
let apiReady = false;

function clock(seconds) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

const buttons = fixture.quotes.map((item, index) => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "source-option";
  button.setAttribute(
    "aria-label",
    `Show excerpt ${index + 1}, ${item.channel}, passage starts ${clock(item.passageStartSeconds)}`,
  );
  for (const [className, text] of [
    ["number", `0${index + 1}`],
    ["channel-name", item.channel],
    ["time mono", clock(item.passageStartSeconds)],
  ]) {
    const span = document.createElement("span");
    span.className = className;
    span.textContent = text;
    button.append(span);
  }
  button.addEventListener("click", () => {
    render(index);
    if (apiReady) loadSource();
    $("status").textContent =
      `Showing excerpt ${index + 1} from ${item.channel}.`;
  });
  $("source-list").append(button);
  return button;
});

function render(index) {
  const item = fixture.quotes[index];
  active = index;
  $("quote").textContent = item.quote;
  $("channel").textContent = item.channel;
  $("published").textContent = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(item.publishedAt));
  $("card-count").textContent = `0${index + 1} / 0${fixture.quotes.length}`;
  $("source-title").textContent = item.title;
  $("source-title").href = item.sourceUrl;
  $("source-time").textContent = clock(item.passageStartSeconds);
  $("video-id").textContent = item.videoId;
  $("youtube").href = item.youtubeUrl;
  buttons.forEach((button, i) =>
    button.setAttribute("aria-pressed", String(i === index)),
  );
}

function loadSource() {
  ready = false;
  $("play").disabled = true;
  $("play").textContent = "Loading source…";
  $("playback-status").textContent = "Loading YouTube source.";
  if (player) {
    player.destroy();
    const mount = document.createElement("div");
    mount.id = "player";
    document.querySelector(".source-player").append(mount);
  }
  const item = fixture.quotes[active];
  player = new YT.Player("player", {
    width: "640", height: "360", videoId: item.videoId,
    playerVars: { start: item.passageStartSeconds, playsinline: 1, origin: location.origin, rel: 0 },
    events: {
      onReady: () => {
        ready = true;
        const selected = fixture.quotes[active];
        $("play").disabled = false;
        $("play").textContent = "Play source";
        $("playback-status").textContent = `Ready at ${clock(selected.passageStartSeconds)}. Play to hear the original source.`;
      },
      onStateChange: ({ data }) => {
        $("play").disabled = false;
        if (data === YT.PlayerState.CUED) $("playback-status").textContent = `Ready at ${clock(fixture.quotes[active].passageStartSeconds)}.`;
        $("play").textContent = data === YT.PlayerState.PLAYING ? "Pause source" : "Play source";
        if (data === YT.PlayerState.PLAYING) $("playback-status").textContent = "Playing original YouTube source. Volume is controlled in the player.";
        if (data === YT.PlayerState.PAUSED) $("playback-status").textContent = "Source paused.";
      },
      onAutoplayBlocked: () => { $("playback-status").textContent = "Press Play inside the YouTube player to start with sound."; },
      onError: () => { $("play").disabled = true; $("play").textContent = "Source unavailable"; $("playback-status").textContent = "YouTube could not play this embed. Open the YouTube timestamp link to watch the source."; },
    },
  });
}
window.onYouTubeIframeAPIReady = () => { apiReady = true; loadSource(); };
const youtubeAPI = document.createElement("script");
youtubeAPI.src = "https://www.youtube.com/iframe_api";
youtubeAPI.onerror = () => { $("playback-status").textContent = "YouTube could not load. Open the YouTube timestamp link to watch the source."; $("play").textContent = "Player unavailable"; };
document.head.append(youtubeAPI);
$("play").addEventListener("click", () => {
  if (!ready) return;
  if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
  else {
    player.unMute();
    if (player.getVolume() === 0) player.setVolume(100);
    player.playVideo();
  }
});

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    $("copy-fallback").hidden = true;
    $("status").textContent = `${label} copied.`;
  } catch {
    $("copy-fallback").hidden = false;
    $("copy-text").value = text;
    $("copy-text").focus();
    $("copy-text").select();
    $("status").textContent =
      "Clipboard unavailable. Select and copy the text below.";
  }
}
$("copy-prompt").addEventListener("click", () =>
  copy($("prompt").textContent.replace(/\s+/g, " ").trim(), "Research prompt"),
);
$("copy-source").addEventListener("click", () =>
  copy(fixture.quotes[active].sourceUrl, "Source timestamp link"),
);
render(0);
