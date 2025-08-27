import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  POSTHOG_BASE_URL: z.string().default('https://app.posthog.com'),
  POSTHOG_PROJECT_ID: z.string(),
  POSTHOG_API_KEY: z.string(),

  SWAP_EVENT_NAME: z.string().default('swap'),
  NETWORK_FILTER: z.string().default('mainnet'),

  VOLUME_SIDE: z.enum(['in', 'out']).default('in'),
  VOLUME_PROP_IN: z.string().default('amount_in'),
  VOLUME_PROP_OUT: z.string().default('amount_out'),

  EXCLUDE_ACCOUNT_ID_PATTERNS: z.string().optional(),
  EXCLUDE_ACCOUNT_IDS: z.string().optional(),

  PRICES_API_URL: z.string(),

  BATCH_SIZE: z.coerce.number().default(500),
  MAX_EVENTS: z.coerce.number().default(0)
});

export type AppConfig = z.infer<typeof Env>;
export const cfg: AppConfig = Env.parse(process.env);

export function parseCSV(value?: string): string[] {
  return (value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}
