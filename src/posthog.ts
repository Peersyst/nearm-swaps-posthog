import axios from 'axios';
import { cfg, parseCSV } from './config.js';

export type SwapEventRow = {
  uuid: string;
  timestamp: string;
  amount_in?: string | null;
  amount_out?: string | null;
  token_in_id?: string | null;
  token_out_id?: string | null;
};

function q(v: string) { return `'${v.replace(/'/g, "''")}'`; }

function buildExclusions(): string {
  const substr = parseCSV(cfg.EXCLUDE_ACCOUNT_ID_PATTERNS).map((p) => p.toLowerCase());
  const exact = parseCSV(cfg.EXCLUDE_ACCOUNT_IDS);

  const clauses: string[] = [];
  for (const p of substr) clauses.push(`lower(account_id) NOT LIKE ${q('%' + p + '%')}`);
  if (exact.length) clauses.push(`account_id NOT IN (${exact.map(q).join(', ')})`);
  return clauses.length ? clauses.join(' AND ') : '1';
}

async function hogql<T = any>(query: string): Promise<T> {
  const url = `${cfg.POSTHOG_BASE_URL.replace(/\/$/, '')}/api/projects/${cfg.POSTHOG_PROJECT_ID}/query/`;
  const { data } = await axios.post(
    url,
    { query: { kind: 'HogQLQuery', query } },
    { headers: { Authorization: `Bearer ${cfg.POSTHOG_API_KEY}` } }
  );
  return data;
}

/**
 * Fetch one batch of swap events ordered from oldest to newest.
 */
export async function fetchSwapBatch(offset: number, limit: number): Promise<SwapEventRow[]> {
  const where = [
    `event = ${q(cfg.SWAP_EVENT_NAME)}`,
    `properties.network = ${q(cfg.NETWORK_FILTER)}`,
    buildExclusions()
  ].join(' AND ');

  const query = `
    SELECT
      uuid,
      toString(timestamp) AS timestamp,
      properties.${cfg.VOLUME_PROP_IN} AS amount_in,
      properties.${cfg.VOLUME_PROP_OUT} AS amount_out,
      properties.token_in_id AS token_in_id,
      properties.token_out_id AS token_out_id
    FROM events
    WHERE ${where}
    ORDER BY timestamp ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const res = await hogql<{ results: any[] }>(query);
  // Results are rows in same order as SELECT
  return (res?.results ?? []).map((r) => ({
    uuid: r[0],
    timestamp: r[1],
    amount_in: r[2],
    amount_out: r[3],
    token_in_id: r[4],
    token_out_id: r[5]
  }));
}
