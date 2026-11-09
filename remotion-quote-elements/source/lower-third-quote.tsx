import {Interactive, interpolate, useCurrentFrame} from 'remotion';

type QuoteProps = {
  quote: string;
  channel: string;
  publishedAt: string;
  watchUrl: string;
  startSeconds: number;
  speaker?: string;
};

export function LowerThirdQuote({quote, channel, publishedAt, watchUrl, startSeconds, speaker}: QuoteProps) {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 18], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const time = `${Math.floor(startSeconds / 60)}:${String(Math.floor(startSeconds % 60)).padStart(2, '0')}`;
  let source: string | undefined;
  try {
    const url = new URL(watchUrl);
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) :
      ['youtube.com', 'www.youtube.com'].includes(url.hostname) && url.pathname === '/watch' ? url.searchParams.get('v') : null;
    if (url.protocol === 'https:' && !url.username && !url.password && id && /^[A-Za-z0-9_-]{11}$/.test(id) && Number.isFinite(startSeconds) && startSeconds >= 0) {
      source = `https://www.youtube.com/watch?v=${id}&t=${Math.floor(startSeconds)}s`;
    }
  } catch { /* Invalid links remain plain text. */ }

  return (
    <Interactive.Div name="Lower third quote" style={{width: 1280, height: 300, boxSizing: 'border-box', padding: '38px 48px', background: '#f0f0eb', color: '#161616', borderLeft: '8px solid #187246', fontFamily: 'Arial, sans-serif', opacity: reveal, transform: `translateX(${-28 * (1 - reveal)}px)`, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
      <div style={{fontSize: quote.length > 200 ? 27 : 38, lineHeight: 1.22, letterSpacing: '-.02em', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>“{quote}”</div>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 24, marginTop: 26, fontSize: 20, color: '#555'}}>
        <span style={{color: '#161616', fontWeight: 600}}>{speaker ? `${speaker} · ${channel}` : channel}</span>
        <span>{publishedAt}</span>
        <a href={source} target="_blank" rel="noopener noreferrer" style={{marginLeft: 'auto', color: '#185d3c', textDecoration: 'none', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>{time} ↗</a>
      </div>
    </Interactive.Div>
  );
}
