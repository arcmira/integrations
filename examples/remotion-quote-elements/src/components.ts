import {QuoteCard} from '../elements/quote-card';
import {LowerThirdQuote} from '../elements/lower-third-quote';
import {SourceCredit} from '../elements/source-credit';
import quoteCardSource from '../elements/quote-card.tsx?raw';
import lowerThirdSource from '../elements/lower-third-quote.tsx?raw';
import sourceCreditSource from '../elements/source-credit.tsx?raw';
import type {ComponentProps, ComponentType} from 'react';

export type QuoteProps = ComponentProps<typeof QuoteCard>;
export const components: Record<string, {component: ComponentType<QuoteProps>; source: string}> = {
  'quote-card': {component: QuoteCard, source: quoteCardSource},
  'lower-third-quote': {component: LowerThirdQuote, source: lowerThirdSource},
  'source-credit': {component: SourceCredit, source: sourceCreditSource},
};
