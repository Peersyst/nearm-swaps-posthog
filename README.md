# PostHog Swaps Metrics

A TypeScript application that analyzes swap events from PostHog to calculate total swap volume in USD. Processes events chronologically (oldest → newest) with high precision using Decimal.js.

## 🎯 Features

- **Event-by-event processing**: Chronological analysis from oldest to newest swap events
- **Dual pricing sources**: Internal Prices API + CoinGecko fallback for missing tokens
- **100% token coverage**: Comprehensive token mapping for NEAR ecosystem and standard tokens
- **High precision**: Uses Decimal.js for accurate financial calculations
- **Flexible configuration**: Supports volume calculation on either `amount_in` or `amount_out`
- **Account filtering**: Exclude test/internal accounts from calculations
- **Trading pair analytics**: Track top Token A → Token B conversions with volume and count
- **Data quality monitoring**: Check data availability and identify gaps across date ranges
- **Comprehensive diagnostics**: Reports unmapped tokens, missing prices, and bad amounts

## 📊 Current Results

- **All-Time**: 2,951+ swaps, $684,166+ USD volume
- **Last 24h**: 121 swaps, $24,463 USD volume (-43.72% swaps, -39.97% volume vs previous day)
- **Previous 24h**: 215 swaps, $40,751 USD volume
- **Last 7d**: 1,081 swaps, $152,872 USD volume  
- **Last 30d**: 2,712 swaps, $569,981 USD volume
- **Top Trading Pair**: Mystery Token → USDC ($215K volume, 66 swaps)
- **Most Active Pair**: NEAR ↔ NEAR Native (1,136+ swaps combined)
- **Token Coverage**: 100% (all tokens mapped and priced)
- **Processing Speed**: ~3 seconds for full analysis

## 🚀 Quick Start

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd posthog-swaps-metrics
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.sample .env
   # Edit .env with your PostHog credentials
   ```

3. **Run analysis**:
   ```bash
   npm run run
   ```

4. **Check data quality**:
   ```bash
   npm run check-data
   ```

5. **Debug events** (optional):
   ```bash
   npm run debug
   ```

## ⚙️ Configuration

### Required Environment Variables

```bash
# PostHog Configuration
POSTHOG_BASE_URL=https://eu.posthog.com
POSTHOG_PROJECT_ID=13814
POSTHOG_API_KEY=phc_your_api_key_here

# Event Schema
SWAP_EVENT_NAME=swap
NETWORK_FILTER=mainnet

# Volume Calculation
VOLUME_SIDE=in                    # "in" or "out"
VOLUME_PROP_IN=amount_in
VOLUME_PROP_OUT=amount_out

# Pricing
PRICES_API_URL=

# Performance
BATCH_SIZE=500                    # Events per PostHog query
MAX_EVENTS=0                      # 0 = unlimited, >0 for testing
```

### Optional Filtering

```bash
# Exclude accounts by pattern or exact match
EXCLUDE_ACCOUNT_ID_PATTERNS=test,internal
EXCLUDE_ACCOUNT_IDS=test.near,bot.near
```

## 🏗️ Architecture

### Core Components

- **`src/index.ts`**: Main application logic and event processing
- **`src/posthog.ts`**: PostHog API integration and HogQL queries
- **`src/prices.ts`**: Price fetching from internal API + CoinGecko fallback
- **`src/tokenMapping.ts`**: Token ID to price ID mapping system
- **`src/config.ts`**: Environment configuration and validation
- **`src/checkDataAvailability.ts`**: Data quality monitoring and gap detection

### Token Mapping System

The application handles multiple token ID formats:

1. **Standard format**: `intents:usdc` → `usd-coin`
2. **NEAR ecosystem**: `eth.bridge.near` → `ethereum`
3. **Contract addresses**: `17208628...` → `17208628...` (direct mapping)
4. **Meme tokens**: `gnear-229.meme-cooking.near` → `near`

### Pricing Fallback Strategy

1. **Primary**: Fetch all prices from internal Prices API
2. **Fallback**: If specific tokens missing (e.g., Kaito), fetch from CoinGecko
3. **Mapping**: Convert token IDs to price API IDs using comprehensive mapping table

## 📈 Output Format

```json
{
  "sideValued": "in",
  "allTime": {
    "totalSwaps": 2951,
    "totalVolumeUSD": 683997.460131663
  },
  "last24h": {
    "totalSwaps": 121,
    "totalVolumeUSD": 24411.73271967872,
    "swapGrowthPercent": -44.24,
    "volumeGrowthPercent": -40.08
  },
  "previous24h": {
    "totalSwaps": 217,
    "totalVolumeUSD": 40738.48889244697
  },
  "last7d": {
    "totalSwaps": 1081,
    "totalVolumeUSD": 152777.93104626966
  },
  "last30d": {
    "totalSwaps": 2712,
    "totalVolumeUSD": 569813.4399897703
  },
  "notes": {
    "unmappedIntentTokenIds": [],
    "priceIdMissing": [],
    "badAmounts": 0
  }
}
```

### Output Fields

- **`sideValued`**: Which leg was valued (`in` or `out`)
- **`allTime`**: Complete historical metrics
- **`last24h`**: Activity in the last 24 hours with growth metrics
  - **`swapGrowthPercent`**: Day-over-day change in transaction count (%)
  - **`volumeGrowthPercent`**: Day-over-day change in volume (%)
- **`previous24h`**: Activity 24-48 hours ago (for growth comparison)
- **`last7d`**: Activity in the last 7 days  
- **`last30d`**: Activity in the last 30 days
- **`totalSwaps`**: Number of swap events in time period
- **`totalVolumeUSD`**: Total volume in USD (high precision)
- **`unmappedIntentTokenIds`**: Token IDs without mapping (should be empty)
- **`priceIdMissing`**: Mapped tokens without price data
- **`badAmounts`**: Events with unparseable amounts

## 📊 Data Quality Monitoring

The project includes a data availability checker that helps monitor data quality and identify gaps in your PostHog events.

### Usage

```bash
npm run check-data
```

### Sample Output

```
🔍 Checking PostHog data availability...

📊 Data Range Summary:
   Earliest swap: 2025-07-18
   Latest swap: 2025-08-27
   Total events: 2,951

📅 Daily Data Availability (40 days with data):

✅ 2025-07-18: 1 swaps
❌ 2025-07-19: No data
✅ 2025-07-20: 2 swaps
✅ 2025-07-21: 19 swaps
...

📋 Data Quality Summary:
   Total days in range: 41
   Days with data: 40
   Days without data: 1
   Data coverage: 97.6%
   Longest gap: 1 consecutive days

📈 Recent Activity (Last 7 Days):
   Recent coverage: 7/7 days (100.0%)

💡 Recommendations:
   ✅ Excellent data coverage with minimal gaps.
```

### Features

- **Date range analysis**: Identifies the full span of available data
- **Daily breakdown**: Shows swap count for each day or marks missing days
- **Gap detection**: Identifies periods without data and measures gap lengths
- **Coverage metrics**: Calculates overall data coverage percentage
- **Recent activity focus**: Special attention to the last 7 days of data
- **Actionable recommendations**: Suggests next steps based on data quality

## 🛠️ Development

### Available Scripts

- `npm start`: Execute main swap analysis
- `npm run check-data`: Check data availability and identify gaps
- `npm run debug`: Debug PostHog events and schema
- `npm run dev`: Watch mode for development
- `npm run build`: Compile TypeScript

### Adding New Token Mappings

Edit `src/tokenMapping.ts`:

```typescript
const baseMap: Record<string, string> = {
  // Add new mappings here
  "new-token-id": "coingecko-id",
  "another.token.near": "another-coingecko-id"
};
```

### Testing with Limited Events

Set `MAX_EVENTS` in `.env` for quick testing:

```bash
MAX_EVENTS=100  # Process only first 100 events
```

## 🔍 Troubleshooting

### Common Issues

1. **"Unable to resolve field: swap"**
   - Check `SWAP_EVENT_NAME` matches your PostHog event name
   - Verify PostHog API key has correct permissions

2. **Low volume numbers**
   - Check `unmappedIntentTokenIds` for missing token mappings
   - Review `priceIdMissing` for tokens needing price data

3. **API timeouts**
   - Reduce `BATCH_SIZE` for slower connections
   - Check network connectivity to PostHog and price APIs

### Debug Mode

Use the included debug script to inspect PostHog data:

```bash
npm run debug
```

### Data Quality Issues

If the data availability checker shows gaps:

1. **Check PostHog ingestion**: Verify events are being sent correctly
2. **Review date filters**: Ensure your event collection covers the expected period
3. **Validate event naming**: Confirm `SWAP_EVENT_NAME` matches your actual events
4. **Monitor ongoing**: Run `npm run check-data` regularly to catch new gaps

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add token mappings or improve functionality
4. Test with `MAX_EVENTS=100`
5. Submit a pull request

## 📋 Requirements

- Node.js 18+
- TypeScript 5.5+
- PostHog API access
- Network access to pricing APIs

## 📄 License

MIT License - see LICENSE file for details.
