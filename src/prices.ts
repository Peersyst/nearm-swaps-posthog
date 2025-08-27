import axios from 'axios';
import { Decimal } from 'decimal.js';
import { cfg } from './config.js';

/** Fetch Kaito price from CoinGecko API */
async function fetchKaitoFromCoinGecko(): Promise<Decimal | null> {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=kaito&vs_currencies=usd';
    const { data } = await axios.get(url, { timeout: 10000 });
    const price = data?.kaito?.usd;
    return price ? new Decimal(price) : null;
  } catch (error: any) {
    console.warn('Failed to fetch Kaito price from CoinGecko:', error?.message || error);
    return null;
  }
}

/** Fetch all prices once and return id -> Decimal(usdPrice). */
export async function fetchPricesOnce(): Promise<Record<string, Decimal>> {
  // 1) Fetch from internal API
  const { data } = await axios.get(cfg.PRICES_API_URL, { timeout: 20000 });
  const map: Record<string, Decimal> = {};
  for (const row of data as Array<{ id: string; usdPrice: string }>) {
    if (!row?.id || row?.usdPrice == null) continue;
    try { map[row.id] = new Decimal(row.usdPrice); } catch { /* ignore bad rows */ }
  }

  // 2) Fetch Kaito from CoinGecko if missing
  if (!map['kaito']) {
    console.log('Kaito price missing from internal API, fetching from CoinGecko...');
    const kaitoPrice = await fetchKaitoFromCoinGecko();
    if (kaitoPrice) {
      map['kaito'] = kaitoPrice;
      console.log(`✓ Kaito price from CoinGecko: $${kaitoPrice.toString()}`);
    }
  }

  return map;
}
