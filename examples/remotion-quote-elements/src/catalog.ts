export const sample = {
  quote: 'Vibe coding is is essentially using an AI chatbot to bring your ideas to life.',
  channel: 'Masters of Scale',
  publishedAt: '2026-08-11',
  watchUrl: 'https://www.youtube.com/watch?v=mD1F-yy_D8E&t=823s',
  startSeconds: 823,
  speaker: '',
};

export const elements = [
  {slug: 'quote-card', name: 'Quote card', exportName: 'QuoteCard', width: 1080, height: 1350, durationInFrames: 150, fps: 30},
  {slug: 'lower-third-quote', name: 'Lower third quote', exportName: 'LowerThirdQuote', width: 1280, height: 300, durationInFrames: 150, fps: 30},
  {slug: 'source-credit', name: 'Source credit', exportName: 'SourceCredit', width: 1280, height: 500, durationInFrames: 150, fps: 30},
] satisfies Array<{slug: string; name: string; exportName: string; width: number; height: number; durationInFrames: number; fps: number}>;

export type ElementDefinition = typeof elements[number];
export const libraryUrl = 'https://arcmira.github.io/integrations/remotion-quote-elements/';

export function sourceLink(watchUrl: string, startSeconds: number): string | null {
  if (!Number.isFinite(startSeconds) || startSeconds < 0) return null;
  try {
    const url = new URL(watchUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) :
      ['youtube.com', 'www.youtube.com'].includes(url.hostname) && url.pathname === '/watch' ? url.searchParams.get('v') : null;
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return `https://www.youtube.com/watch?v=${id}&t=${Math.floor(startSeconds)}s`;
  } catch { return null; }
}
