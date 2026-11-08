import {useRef, useState} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {addElementLibraryToStudio, createElementPayload, installInStudio, isInsideStudio, setStudioDragData} from '@remotion/studio-protocol';
import {elements, libraryUrl, sample, sourceLink, type ElementDefinition} from './catalog';
import {components, type QuoteProps} from './components';
import {libraryDescription} from './copy';

const base = import.meta.env.BASE_URL;
type ActionState = {kind: 'idle'} | {kind: 'pending'} | {kind: 'result'; message: string};

function Preview({element, props, compact = false}: {element: ElementDefinition; props: QuoteProps; compact?: boolean}) {
  const player = useRef<PlayerRef>(null);
  const [playing, setPlaying] = useState(false);
  const entry = components[element.slug];
  if (!entry) return null;
  return <div className={`preview ${compact ? 'compact' : ''}`}>
    <Player ref={player} component={entry.component} inputProps={props} compositionWidth={element.width} compositionHeight={element.height}
      durationInFrames={element.durationInFrames} fps={element.fps} initialFrame={30} controls={false} loop clickToPlay={false} showVolumeControls={false}
      style={{width: compact && element.height > element.width ? 'auto' : '100%', height: compact && element.height > element.width ? '100%' : undefined, aspectRatio: `${element.width} / ${element.height}`}} />
    {!compact && <div className="playback"><button onClick={() => {player.current?.toggle(); setPlaying(player.current?.isPlaying() ?? false);}}>{playing ? 'Pause animation' : 'Play animation'}</button><button onClick={() => player.current?.requestFullscreen()}>Fullscreen ↗</button></div>}
  </div>;
}

function Gallery() {
  const [action, setAction] = useState<ActionState>({kind: 'idle'});
  async function addLibrary() {
    setAction({kind: 'pending'});
    try {
      const result = await addElementLibraryToStudio({url: libraryUrl, displayName: 'Arcmira Quotes'});
      setAction({kind: 'result', message: result.success ? 'Confirm the library in Remotion Studio.' : `${result.message} Open Remotion Studio and try again.`});
    } catch {
      setAction({kind: 'result', message: 'Could not reach Remotion Studio. Open Studio and try again.'});
    }
  }
  return <>
    <section className="intro"><div className="eyebrow">REMOTION ELEMENT LIBRARY</div><h1>Arcmira Quotes</h1><p>{libraryDescription}</p>
      <div className="intro-actions">{!isInsideStudio() && <button className="primary" onClick={addLibrary} disabled={action.kind === 'pending'}>{action.kind === 'pending' ? 'Connecting…' : 'Add library to Studio'}</button>}
        <a href={`${base}llms-components.txt`}>Component index ↗</a></div><p role="status" className="status">{action.kind === 'result' ? action.message : ''}</p>
    </section>
    <section className="gallery" aria-label="Quote elements">{elements.map(element => <article className="element-card" key={element.slug}>
      <Preview element={element} props={sample} compact />
      <a className="card-title" href={`${base}${element.slug}/`}><h2>{element.name}</h2><span aria-hidden="true">↗</span></a>
      <p className="dimensions">{element.width} × {element.height} · {element.durationInFrames / element.fps} seconds</p>
    </article>)}</section>
  </>;
}

function ElementPage({element}: {element: ElementDefinition}) {
  const [props, setProps] = useState<QuoteProps>(sample);
  const [action, setAction] = useState<ActionState>({kind: 'idle'});
  const entry = components[element.slug];
  if (!entry) return null;
  const watchLink = sourceLink(props.watchUrl, props.startSeconds);
  const valid = props.quote.trim().length > 0 && props.channel.trim().length > 0 && props.publishedAt.length > 0 && watchLink !== null;
  const payload = createElementPayload({displayName: element.name, slug: element.slug, sourceCode: entry.source,
    dependencies: [], dimensions: {width: element.width, height: element.height}, durationInFrames: element.durationInFrames,
    initialProps: {...props, watchUrl: watchLink ?? props.watchUrl}, installationMode: 'wrapped'});
  async function install() {
    setAction({kind: 'pending'});
    try {
      const result = await installInStudio({payload});
      setAction({kind: 'result', message: result.success ? 'Sent to Studio. Confirm the Element there to finish adding it.' : `${result.message} Open a project in Remotion Studio, then try again or copy the source below.`});
    } catch {
      setAction({kind: 'result', message: 'Could not reach Remotion Studio. Open a project, then try again or copy the source below.'});
    }
  }
  async function copySource() {
    try {
      await navigator.clipboard.writeText(entry.source);
      setAction({kind: 'result', message: 'Component source copied.'});
    } catch {
      setAction({kind: 'result', message: 'Clipboard access is unavailable. Open the source link to copy it.'});
    }
  }
  function change(field: keyof QuoteProps, value: string) {
    setProps(current => ({...current, [field]: field === 'startSeconds' ? Number(value) : value}));
    setAction({kind: 'idle'});
  }
  return <>
    <div className="detail-heading"><a href={base}>← All Elements</a><h1>{element.name}</h1><p className="dimensions">{element.width} × {element.height} · {element.fps} fps · {element.durationInFrames / element.fps} seconds</p></div>
    <div className={`workspace ${element.slug}`}>
      <section className="preview-panel" aria-label="Live preview"><Preview element={element} props={props}/><div className="preview-foot">{watchLink && <a href={watchLink} target="_blank" rel="noopener noreferrer">Watch the source at {Math.floor(props.startSeconds / 60)}:{String(Math.floor(props.startSeconds % 60)).padStart(2, '0')} ↗</a>}</div></section>
      <section className="editor" aria-label="Element inputs">
        <h2>Make it yours</h2>
        <label htmlFor="quote">Quote <span>required</span></label><textarea id="quote" rows={4} value={props.quote} onChange={event => change('quote', event.target.value)} aria-describedby="quote-help"/>
        <p className="help" id="quote-help">The passage text, trimmed to one or two sentences.</p>
        <label htmlFor="channel">Channel <span>required</span></label><input id="channel" value={props.channel} onChange={event => change('channel', event.target.value)}/>
        <p className="help">The channel or show name.</p>
        <label htmlFor="watchUrl">Watch URL <span>required</span></label><input id="watchUrl" type="url" value={props.watchUrl} onChange={event => change('watchUrl', event.target.value)} aria-invalid={!watchLink}/>
        <p className="help">The watch link at the second the passage starts.</p>
        <div className="input-row"><div><label htmlFor="publishedAt">Published</label><input id="publishedAt" type="date" value={props.publishedAt} onChange={event => change('publishedAt', event.target.value)}/></div><div><label htmlFor="startSeconds">Start in seconds</label><input id="startSeconds" type="number" min="0" step="1" value={props.startSeconds} onChange={event => change('startSeconds', event.target.value)}/></div></div>
        <label htmlFor="speaker">Speaker <span>optional</span></label><input id="speaker" value={props.speaker ?? ''} onChange={event => change('speaker', event.target.value)} placeholder="Speaker's name"/>
        <button className="primary install" onClick={install} disabled={!valid || action.kind === 'pending'} draggable={valid} onDragStart={event => {if (valid) setStudioDragData({dataTransfer: event.dataTransfer, payload});}}>{action.kind === 'pending' ? 'Connecting…' : 'Add to Studio'}</button>
        <p className="help">Or drag the button into Studio.</p>
        <p className="status" role="status">{action.kind === 'result' ? action.message : !valid ? 'Add a quote, channel, date and valid YouTube watch link.' : ''}</p>
        <div className="source-actions"><button onClick={copySource}>Copy source</button><a href={`${base}source/${element.slug}.tsx`} target="_blank" rel="noopener noreferrer">View source ↗</a></div>
      </section>
    </div>
  </>;
}

export default function App() {
  const slug = window.location.pathname.replace(base, '').split('/')[0];
  const element = elements.find(item => item.slug === slug);
  return <><header><a className="brand" href="https://arcmira.com" aria-label="Arcmira homepage"><img src={`${base}assets/arcmira-mark.jpg`} alt="" width="25" height="25"/><span>Arcmira</span></a><nav aria-label="Main"><a href="https://arcmira.com/docs">API docs ↗</a><a href="https://arcmira.com/docs/mcp-server">Connect your AI ↗</a></nav></header><main>{element ? <ElementPage element={element}/> : <Gallery/>}</main><footer><a href="https://arcmira.com">Arcmira</a><a href="https://www.remotion.dev/docs/elements/libraries">Remotion Elements ↗</a></footer></>;
}
