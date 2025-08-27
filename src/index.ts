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

type TimeBasedMetrics = {
  swaps: number;
  volumeUSD: Decimal;
};

async function main() {
  // 1) Get prices ONCE
  const prices = await fetchPricesOnce(); // id -> Decimal price
  const diags: Diagnostics = {
    unmappedIntentTokenIds: new Set(),
    priceIdMissing: new Set(),
    badAmounts: 0
  };

  // 2) Setup time periods (in milliseconds from now)
  const now = Date.now();
  const timeFrames = {
    '24h': now - (24 * 60 * 60 * 1000),
    '48h': now - (48 * 60 * 60 * 1000), // For previous 24h comparison
    '7d': now - (7 * 24 * 60 * 60 * 1000),
    '30d': now - (30 * 24 * 60 * 60 * 1000)
  };

  // 3) Initialize metrics for each time period
  const metrics = {
    allTime: { swaps: 0, volumeUSD: new Decimal(0) },
    last24h: { swaps: 0, volumeUSD: new Decimal(0) },
    previous24h: { swaps: 0, volumeUSD: new Decimal(0) }, // 24-48h ago
    last7d: { swaps: 0, volumeUSD: new Decimal(0) },
    last30d: { swaps: 0, volumeUSD: new Decimal(0) }
  };

  // 4) Iterate events one-by-one oldest→newest
  let offset = 0;
  const limit = cfg.BATCH_SIZE;

  let processed = 0;
  const useIn = cfg.VOLUME_SIDE === 'in';

  while (true) {
    if (cfg.MAX_EVENTS > 0 && processed >= cfg.MAX_EVENTS) break;

    const batch = await fetchSwapBatch(offset, limit);
    if (batch.length === 0) break;

    for (const ev of batch) {
      if (cfg.MAX_EVENTS > 0 && processed >= cfg.MAX_EVENTS) break;

      const amountStr = (useIn ? ev.amount_in : ev.amount_out) ?? '0';
      const tokenId   = (useIn ? ev.token_in_id : ev.token_out_id) ?? '';

      // Parse event timestamp
      const eventTime = new Date(ev.timestamp).getTime();
      
      let amount: Decimal;
      try { amount = new Decimal(amountStr); }
      catch { diags.badAmounts++; continue; }

      let volumeContribution = new Decimal(0);
      const priceId = intentsToPriceId(tokenId);
      if (!priceId) {
        diags.unmappedIntentTokenIds.add(tokenId || '(empty)');
      } else {
        const price = prices[priceId];
        if (!price) {
          diags.priceIdMissing.add(priceId);
        } else {
          volumeContribution = amount.times(price);
        }
      }

      // Add to all-time metrics
      metrics.allTime.swaps++;
      metrics.allTime.volumeUSD = metrics.allTime.volumeUSD.plus(volumeContribution);

      // Add to time-based metrics if within timeframe
      if (eventTime >= timeFrames['30d']) {
        metrics.last30d.swaps++;
        metrics.last30d.volumeUSD = metrics.last30d.volumeUSD.plus(volumeContribution);
      }
      if (eventTime >= timeFrames['7d']) {
        metrics.last7d.swaps++;
        metrics.last7d.volumeUSD = metrics.last7d.volumeUSD.plus(volumeContribution);
      }
      if (eventTime >= timeFrames['24h']) {
        metrics.last24h.swaps++;
        metrics.last24h.volumeUSD = metrics.last24h.volumeUSD.plus(volumeContribution);
      }
      // Track previous 24h period (24-48h ago) for growth calculation
      if (eventTime >= timeFrames['48h'] && eventTime < timeFrames['24h']) {
        metrics.previous24h.swaps++;
        metrics.previous24h.volumeUSD = metrics.previous24h.volumeUSD.plus(volumeContribution);
      }

      processed++;
    }

    offset += batch.length;
    if (batch.length < limit) break; // finished
  }

  // 5) Calculate growth percentages
  const calculateGrowth = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? null : 0; // Can't calculate % from zero
    return ((current - previous) / previous) * 100;
  };

  const swapGrowth = calculateGrowth(metrics.last24h.swaps, metrics.previous24h.swaps);
  const volumeGrowth = calculateGrowth(
    metrics.last24h.volumeUSD.toNumber(), 
    metrics.previous24h.volumeUSD.toNumber()
  );

  // 6) Output with time-based metrics and growth
  const out = {
    sideValued: cfg.VOLUME_SIDE,
    
    // All-time metrics
    allTime: {
      totalSwaps: metrics.allTime.swaps,
      totalVolumeUSD: metrics.allTime.volumeUSD.toNumber()
    },
    
    // Recent activity metrics
    last24h: {
      totalSwaps: metrics.last24h.swaps,
      totalVolumeUSD: metrics.last24h.volumeUSD.toNumber(),
      swapGrowthPercent: swapGrowth !== null ? Number(swapGrowth.toFixed(2)) : null,
      volumeGrowthPercent: volumeGrowth !== null ? Number(volumeGrowth.toFixed(2)) : null
    },
    
    // Previous 24h for context
    previous24h: {
      totalSwaps: metrics.previous24h.swaps,
      totalVolumeUSD: metrics.previous24h.volumeUSD.toNumber()
    },
    
    last7d: {
      totalSwaps: metrics.last7d.swaps,
      totalVolumeUSD: metrics.last7d.volumeUSD.toNumber()
    },
    
    last30d: {
      totalSwaps: metrics.last30d.swaps,
      totalVolumeUSD: metrics.last30d.volumeUSD.toNumber()
    },
    
    // Diagnostics
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
