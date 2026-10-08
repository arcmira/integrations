"use strict";

const fixture = window.QUOTE_FIXTURE;
const $ = (id) => document.getElementById(id);
const cardDuration = 6;
const duration = fixture.quotes.length * cardDuration;
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
let position = 0;
let playing = false;
let active = -1;
let frame = 0;
let startClock = 0;
let startPosition = 0;

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
    render(index * cardDuration);
    pause();
    $("status").textContent =
      `Showing excerpt ${index + 1} from ${item.channel}.`;
  });
  $("source-list").append(button);
  return button;
});

function render(seconds) {
  position = Math.min(duration, Math.max(0, seconds));
  const index = Math.min(
    fixture.quotes.length - 1,
    Math.floor(position / cardDuration),
  );
  const item = fixture.quotes[index];
  if (active !== index) {
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
  // This deterministic reveal belongs to the card sequence, never the source audio.
  const reveal = motion.matches
    ? 1
    : Math.min(1, 0.7 + (position - index * cardDuration) / 0.4);
  $("quote-card").style.opacity = String(reveal);
  $("quote-card").style.transform = motion.matches
    ? "none"
    : `translateY(${(1 - reveal) * 18}px)`;
  $("scrub").value = String(position);
  $("scrub").setAttribute(
    "aria-valuetext",
    `${position.toFixed(1)} seconds, card ${index + 1} of ${fixture.quotes.length}`,
  );
  $("position").textContent = `${clock(position)} / ${clock(duration)}`;
}

function pause() {
  playing = false;
  cancelAnimationFrame(frame);
  $("play").textContent =
    position >= duration ? "Replay sequence" : "Play sequence";
  $("play").setAttribute("aria-label", $("play").textContent);
}

function tick(now) {
  if (!playing) return;
  render(startPosition + (now - startClock) / 1000);
  if (position >= duration) pause();
  else frame = requestAnimationFrame(tick);
}

$("play").addEventListener("click", () => {
  if (playing) return pause();
  if (position >= duration) render(0);
  startPosition = position;
  startClock = performance.now();
  playing = true;
  $("play").textContent = "Pause sequence";
  $("play").setAttribute("aria-label", "Pause sequence");
  frame = requestAnimationFrame(tick);
});

$("scrub").addEventListener("input", (event) => {
  render(Number(event.target.value));
  pause();
});
motion.addEventListener("change", () => render(position));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
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
