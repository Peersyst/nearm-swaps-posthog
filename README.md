# PostHog Swaps Metrics

A TypeScript application that analyzes swap events from PostHog to calculate total swap volume in USD. Processes events chronologically (oldest → newest) with high precision using Decimal.js.

## 🎯 Features

- **Event-by-event processing**: Chronological analysis from oldest to newest swap events
- **Dual pricing sources**: Internal Prices API + CoinGecko fallback for missing tokens
- **100% token coverage**: Comprehensive token mapping for NEAR ecosystem and standard tokens
- **High precision**: Uses Decimal.js for accurate financial calculations
- **Flexible configuration**: Supports volume calculation on either `amount_in` or `amount_out`
- **Account filtering**: Exclude test/internal accounts from calculations
- **Comprehensive diagnostics**: Reports unmapped tokens, missing prices, and bad amounts

## 📊 Current Results

- **Total Swaps**: 2,950+ events processed
- **Total Volume**: $684,290+ USD calculated
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
  "totalSwaps": 2950,
  "totalVolumeUSD": 684290.326785399,
  "notes": {
    "unmappedIntentTokenIds": [],
    "priceIdMissing": [],
    "badAmounts": 0
  }
}
```

### Output Fields

- **`sideValued`**: Which leg was valued (`in` or `out`)
- **`totalSwaps`**: Total number of swap events processed
- **`totalVolumeUSD`**: Total volume in USD (high precision)
- **`unmappedIntentTokenIds`**: Token IDs without mapping (should be empty)
- **`priceIdMissing`**: Mapped tokens without price data
- **`badAmounts`**: Events with unparseable amounts

## 🛠️ Development

### Available Scripts

- `npm run dev`: Watch mode for development
- `npm run run`: Execute analysis
- `npm run build`: Compile TypeScript
- `npm start`: Run compiled JavaScript

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

Use the included `debug-events.js` to inspect PostHog data:

```bash
node debug-events.js
```

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
