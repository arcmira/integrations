import {AbsoluteFill, Composition, Sequence, interpolate, registerRoot, useCurrentFrame} from 'remotion';
import fixture from './quotes.json';

const fps = 30;
const cardFrames = 6 * fps;
type Quote = (typeof fixture.quotes)[number];

function timestamp(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function QuoteCard({quote, position}: {quote: Quote; position: number}) {
  const frame = useCurrentFrame();
  const reveal = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp'});
  const progress = interpolate(frame, [0, cardFrames - 1], [0, 100]);

  return (
    <AbsoluteFill style={{padding: 88, backgroundColor: '#10131b', color: '#f2f5fa', fontFamily: 'Arial, sans-serif'}}>
      <div style={{fontSize: 30, letterSpacing: 5, color: '#c1b7ff'}}>ARCMIRA / SOURCE NOTES</div>
      <div style={{marginTop: 22, fontSize: 42}}>YouTube Transcript Search</div>
      <div style={{marginTop: 100, fontSize: 26, color: '#a7b3c8'}}>SEARCH: {fixture.query.toUpperCase()}</div>
      <div style={{marginTop: 90, opacity: reveal, transform: `translateY(${24 * (1 - reveal)}px)`}}>
        <div style={{fontSize: 120, lineHeight: 0.8, color: '#b7aaff'}}>“</div>
        <div style={{fontSize: 68, fontWeight: 600, lineHeight: 1.16, letterSpacing: -1.5, whiteSpace: 'pre-line'}}>{quote.quote}</div>
      </div>
      <div style={{marginTop: 'auto', borderTop: '2px solid #3b4354', paddingTop: 38}}>
        <div style={{fontSize: 22, color: '#a7b3c8', letterSpacing: 3}}>SOURCE CHANNEL</div>
        <div style={{fontSize: 40, marginTop: 12}}>{quote.channel}</div>
        <div style={{fontSize: 26, marginTop: 18, color: '#bac5d7', lineHeight: 1.4}}>{quote.title}</div>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 36}}>
          <div style={{fontSize: 26, color: '#a7b3c8'}}>Passage begins at</div>
          <div style={{fontSize: 64, color: '#c1b7ff', fontVariantNumeric: 'tabular-nums'}}>{timestamp(quote.passageStartSeconds)}</div>
        </div>
        <div style={{fontFamily: 'monospace', fontSize: 23, marginTop: 20}}>{quote.youtubeUrl.replace('https://www.', '')}</div>
      </div>
      <div style={{marginTop: 50, color: '#a7b3c8', fontSize: 23, lineHeight: 1.5}}>Saved {fixture.savedAt.slice(0, 10)} · Channel is not speaker attribution.<br />Presentation timing is not source audio timing.</div>
      <div style={{height: 4, background: '#30394b', marginTop: 35}}><div style={{height: '100%', width: `${progress}%`, background: '#b7aaff'}} /></div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 25, fontSize: 23, color: '#a7b3c8'}}><span>arcmira.com/docs</span><span>{position} / {fixture.quotes.length}</span></div>
    </AbsoluteFill>
  );
}

function QuoteCards() {
  return <AbsoluteFill>{fixture.quotes.map((quote, index) => <Sequence key={quote.videoId} from={index * cardFrames} durationInFrames={cardFrames}><QuoteCard quote={quote} position={index + 1} /></Sequence>)}</AbsoluteFill>;
}

function Root() {
  return <Composition id="QuoteCards" component={QuoteCards} width={1080} height={1920} fps={fps} durationInFrames={fixture.quotes.length * cardFrames} />;
}

registerRoot(Root);
