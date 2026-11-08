import {registerRoot, Composition} from 'remotion';
import {QuoteCard} from '../elements/quote-card';
import {LowerThirdQuote} from '../elements/lower-third-quote';
import {SourceCredit} from '../elements/source-credit';
import {sample} from '../src/catalog';

function Root() {
  return <><Composition id="QuoteCard" component={QuoteCard} width={1080} height={1350} fps={30} durationInFrames={150} defaultProps={sample}/><Composition id="LowerThirdQuote" component={LowerThirdQuote} width={1280} height={300} fps={30} durationInFrames={150} defaultProps={sample}/><Composition id="SourceCredit" component={SourceCredit} width={1280} height={500} fps={30} durationInFrames={150} defaultProps={sample}/></>;
}
registerRoot(Root);
