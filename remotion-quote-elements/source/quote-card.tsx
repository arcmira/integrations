import {Interactive, interpolate, useCurrentFrame} from 'remotion';

type QuoteProps = {
  quote: string;
  channel: string;
  publishedAt: string;
  watchUrl: string;
  startSeconds: number;
  speaker?: string;
};

export function QuoteCard({quote, channel, publishedAt, watchUrl, startSeconds, speaker}: QuoteProps) {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
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
    <div style={{width: 1080, height: 1350, boxSizing: 'border-box', padding: 86, background: '#121212', color: '#f5f5f5', fontFamily: 'Arial, sans-serif', display: 'flex', flexDirection: 'column'}}>
      <Interactive.Div name="Source channel" style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 28, color: '#b8b8b8'}}>
        <span style={{width: 10, height: 10, background: '#58b887', borderRadius: '50%'}} />
        {channel}
      </Interactive.Div>
      <Interactive.Div name="Quote" style={{marginTop: 108, opacity: reveal, transform: `translateY(${22 * (1 - reveal)}px)`}}>
        <div aria-hidden="true" style={{fontFamily: 'Georgia, serif', fontSize: 180, lineHeight: .75, color: '#58b887'}}>“</div>
        <div style={{marginTop: 20, fontSize: quote.length > 240 ? 48 : 68, lineHeight: 1.22, fontWeight: 500, letterSpacing: '-.025em', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{quote}</div>
      </Interactive.Div>
      <Interactive.Div name="Attribution" style={{marginTop: 'auto', borderTop: '1px solid #414141', paddingTop: 38}}>
        {speaker ? <div style={{fontSize: 34, marginBottom: 12}}>{speaker}</div> : null}
        <div style={{display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'baseline'}}>
          <div style={{fontSize: 24, color: '#aaa'}}>{publishedAt}</div>
          <a href={source} target="_blank" rel="noopener noreferrer" style={{color: '#f5f5f5', textDecoration: 'none', fontSize: 44, fontVariantNumeric: 'tabular-nums'}}>{time} ↗</a>
        </div>
        <div style={{fontSize: 20, marginTop: 18, color: '#aaa', overflowWrap: 'anywhere'}}>{source?.replace('https://www.', '').replace('https://', '')}</div>
      </Interactive.Div>
    </div>
  );
}
