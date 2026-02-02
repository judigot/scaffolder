// Model configuration types
export type ModelId =
  | 'gpt-5-nano'
  | 'gpt-5-mini'
  | 'gpt-5.2-codex'
  | 'claude-haiku-3.5'
  | 'claude-sonnet-4.5'
  | 'claude-opus-4.5';

export type ModelTier = 'free' | 'premium';

export interface IModelOption {
  id: ModelId;
  name: string;
  provider: 'openai' | 'anthropic';
  tier: ModelTier;
}

export const MODEL_OPTIONS: IModelOption[] = [
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai', tier: 'free' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', tier: 'premium' },
  {
    id: 'gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    provider: 'openai',
    tier: 'premium',
  },
  {
    id: 'claude-haiku-3.5',
    name: 'Claude Haiku 3.5',
    provider: 'anthropic',
    tier: 'free',
  },
  {
    id: 'claude-sonnet-4.5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    tier: 'premium',
  },
  {
    id: 'claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'premium',
  },
];
