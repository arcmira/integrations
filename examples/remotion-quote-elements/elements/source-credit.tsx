import {Interactive, interpolate, useCurrentFrame} from 'remotion';

type QuoteProps = {
  quote: string;
  channel: string;
  publishedAt: string;
  watchUrl: string;
  startSeconds: number;
  speaker?: string;
};

export function SourceCredit({quote, channel, publishedAt, watchUrl, startSeconds, speaker}: QuoteProps) {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
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
    <Interactive.Div name="Source credit" style={{width: 1280, height: 500, boxSizing: 'border-box', padding: 56, background: '#202020', color: '#f5f5f5', fontFamily: 'Arial, sans-serif', opacity: reveal, display: 'flex', flexDirection: 'column'}}>
      <div style={{display: 'flex', gap: 28, alignItems: 'baseline', paddingBottom: 26, borderBottom: '1px solid #4b4b4b'}}>
        <span style={{fontSize: 30, fontWeight: 600}}>{channel}</span>
        <span style={{fontSize: 20, color: '#aaa'}}>{publishedAt}</span>
        <a href={source} target="_blank" rel="noopener noreferrer" style={{marginLeft: 'auto', fontSize: 26, color: '#86d2a8', textDecoration: 'none', whiteSpace: 'nowrap'}}>{time} ↗</a>
      </div>
      <div style={{fontFamily: 'Georgia, serif', fontSize: quote.length > 240 ? 28 : 39, lineHeight: 1.3, marginTop: 32, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>“{quote}”</div>
      <div style={{marginTop: 'auto', paddingTop: 24, display: 'flex', justifyContent: 'space-between', gap: 24, color: '#aaa', fontSize: 19, overflowWrap: 'anywhere'}}>
        <span>{speaker}</span>
        <span>{source?.replace('https://www.', '').replace('https://', '')}</span>
      </div>
    </Interactive.Div>
  );
}
