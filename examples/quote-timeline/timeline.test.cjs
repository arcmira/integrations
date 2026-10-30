const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function page() {
  const elements = new Map();
  const timers = new Map();
  const players = [];
  let timerId = 0;
  function element() {
    return {
      textContent: '', disabled: false, children: [], handlers: {},
      append(child) { this.children.push(child); },
      setAttribute() {},
      addEventListener(event, handler) { this.handlers[event] = handler; },
      click() { if (!this.disabled) this.handlers.click?.(); },
    };
  }
  function get(id) {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  }
  const context = vm.createContext({
    window: {}, location: { origin: 'https://example.test' }, navigator: {},
    document: { getElementById: get, createElement: element, head: element(), querySelector: get },
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    YT: {
      PlayerState: { CUED: 5, PLAYING: 1, PAUSED: 2 },
      Player: function (id, options) {
        this.events = options.events;
        this.destroy = () => {};
        this.getPlayerState = () => 2;
        this.unMute = () => { this.unmuted = true; };
        this.getVolume = () => 50;
        this.playVideo = () => { this.played = true; };
        players.push(this);
      },
    },
  });
  vm.runInContext(readFileSync(`${__dirname}/fixture.js`, 'utf8'), context);
  vm.runInContext(readFileSync(`${__dirname}/timeline.js`, 'utf8'), context);
  return {
    get, players,
    apiReady: () => context.window.onYouTubeIframeAPIReady(),
    scriptError: () => context.document.head.children.at(-1).onerror(),
    expire: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
  };
}

test('a silent embed offers retry and keeps its source timestamp', () => {
  const p = page(); p.apiReady(); p.expire();
  assert.equal(p.get('play').disabled, false);
  assert.equal(p.get('play').textContent, 'Retry source');
  assert.match(p.get('playback-status').textContent, /YouTube timestamp link/);
  assert.match(p.get('youtube').href, /mD1F-yy_D8E.*823/);
  p.get('play').click();
  assert.equal(p.players.length, 2);
  p.players[1].events.onReady();
  assert.equal(p.get('play').textContent, 'Play source');
  p.get('play').click();
  assert.equal(p.players[1].played, true);
  assert.equal(p.players[1].unmuted, true);
});

test('late events from a replaced player cannot enable or disable the new player', () => {
  const p = page(); p.apiReady();
  p.get('source-list').children[1].click();
  p.players[0].events.onReady();
  assert.equal(p.get('play').disabled, true);
  p.players[1].events.onReady();
  p.players[0].events.onError();
  p.players[0].events.onStateChange({ data: 1 });
  p.expire();
  assert.equal(p.get('play').textContent, 'Play source');
  assert.equal(p.get('play').disabled, false);
  assert.match(p.get('playback-status').textContent, /1:27:06/);
});

test('API loading failure and timeout leave a usable timestamp route', () => {
  for (const fail of ['scriptError', 'expire']) {
    const p = page(); p[fail]();
    assert.equal(p.get('play').textContent, 'Player unavailable');
    assert.match(p.get('playback-status').textContent, /YouTube timestamp link/);
    assert.match(p.get('youtube').href, /mD1F-yy_D8E/);
    p.apiReady(); p.players[0].events.onReady(); p.expire();
    assert.equal(p.get('play').textContent, 'Play source');
  }
});
