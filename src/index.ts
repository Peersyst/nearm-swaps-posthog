import { Decimal } from 'decimal.js';
import { cfg } from './config.js';
import { fetchPricesOnce } from './prices.js';
import { fetchSwapBatch, type SwapEventRow } from './posthog.js';
import { intentsToPriceId } from './tokenMapping.js';

type Diagnostics = {
  unmappedIntentTokenIds: Set<string>;
  priceIdMissing: Set<string>;
  badAmounts: number;
};

async function main() {
  // 1) Get prices ONCE
  const prices = await fetchPricesOnce(); // id -> Decimal price
  const diags: Diagnostics = {
    unmappedIntentTokenIds: new Set(),
    priceIdMissing: new Set(),
    badAmounts: 0
  };

  // 2) Iterate events one-by-one oldest→newest
  let offset = 0;
  const limit = cfg.BATCH_SIZE;

  let processed = 0;
  let totalSwaps = 0;
  let totalVolumeUSD = new Decimal(0);

  const useIn = cfg.VOLUME_SIDE === 'in';

  while (true) {
    if (cfg.MAX_EVENTS > 0 && processed >= cfg.MAX_EVENTS) break;

    const batch = await fetchSwapBatch(offset, limit);
    if (batch.length === 0) break;

    for (const ev of batch) {
      if (cfg.MAX_EVENTS > 0 && processed >= cfg.MAX_EVENTS) break;

      const amountStr = (useIn ? ev.amount_in : ev.amount_out) ?? '0';
      const tokenId   = (useIn ? ev.token_in_id : ev.token_out_id) ?? '';

      let amount: Decimal;
      try { amount = new Decimal(amountStr); }
      catch { diags.badAmounts++; continue; }

      const priceId = intentsToPriceId(tokenId);
      if (!priceId) {
        diags.unmappedIntentTokenIds.add(tokenId || '(empty)');
      } else {
        const price = prices[priceId];
        if (!price) {
          diags.priceIdMissing.add(priceId);
        } else {
          totalVolumeUSD = totalVolumeUSD.plus(amount.times(price));
        }
      }

      totalSwaps++;
      processed++;
    }

    offset += batch.length;
    if (batch.length < limit) break; // finished
  }

  // 3) Output
  const out = {
    sideValued: cfg.VOLUME_SIDE,
    totalSwaps,
    totalVolumeUSD: totalVolumeUSD.toNumber(),
    notes: {
      unmappedIntentTokenIds: [...diags.unmappedIntentTokenIds],
      priceIdMissing: [...diags.priceIdMissing],
      badAmounts: diags.badAmounts
    }
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  if (err?.response?.data) {
    console.error('HTTP error:', JSON.stringify(err.response.data, null, 2));
  } else {
    console.error(err);
  }
  process.exit(1);
});
