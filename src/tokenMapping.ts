/**
 * Map intents:<symbol> -> internal Prices API id.
 * Most IDs match CoinGecko slugs; a few need overrides.
 */
const baseMap: Record<string, string> = {
  // Standard intents: mappings
  zcash: "zcash",        // Alternative symbol
  melania: "melania-meme",
  bera: "berachain-bera",
  aurora: "aurora-near",
  shib: "shiba-inu",
  gmx: "gmx",
  mog: "mog-coin",
  brett: "based-brett",
  sweat: "sweatcoin",
  turbo: "turbo",
  wif: "dogwifcoin",
  bome: "book-of-meme",
  blackdragon: "black-dragon",
  shitzu: "shitzu",
  purge: "forgive-me-father",
  brrr: "burrow",
  gno: "gnosis",
  cow: "cow-protocol",
  safe: "safe",
  usdc: "usd-coin",
  trump: "official-trump",
  near: "near",
  usdt: "tether",
  dai: "dai",
  eth: "ethereum",
  btc: "bitcoin",
  pepe: "pepe",
  link: "chainlink",
  uni: "uniswap",
  arb: "arbitrum",
  aave: "aave",
  sol: "solana",
  doge: "dogecoin",
  xrp: "ripple",
  abg: "abg-966.meme-cooking.near",
  ref: "token.v2.ref-finance.near",
  mpdao: "mpdao-token.near",
  hapi: "hapi",
  score: "score.aidols.near",
  kaito: "kaito",
  trx: "tron",
  tron: "tron",          // Alternative symbol
  cbbtc: "coinbase-wrapped-btc",
  bnb: "binancecoin",
  pol: "matic-network",
  sui: "sui",
  
  // NEAR ecosystem direct mappings (non-intents format)
  "near-native": "near",
  
  // NEAR ecosystem contract addresses
  "noear": "noear-324.meme-cooking.near",
  "gnear": "gnear-229.meme-cooking.near",
  "eth.bridge.near": "ethereum",
  "usdt.tether-token.near": "tether",
  "token.sweat": "sweatcoin",
  "token.burrow.near": "burrow",
  "blackdragon.tkn.near": "black-dragon",
  "token.0xshitzu.near": "shitzu",
  "score.aidols.near": "score.aidols.near",
  "zec.omft.near": "zcash",
  
  // Contract addresses mapped to themselves as price IDs
  "mpdao-token.near": "mpdao-token.near",
  "token.v2.ref-finance.near": "token.v2.ref-finance.near",
  "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1": "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
  "aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near": "aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near",
  "d9c2d319cd7e6177336b0a9c93c21cb48d84fb54.factory.bridge.near": "d9c2d319cd7e6177336b0a9c93c21cb48d84fb54.factory.bridge.near",
};

export function intentsToPriceId(intentsTokenId?: string | null): string | null {
  if (!intentsTokenId) return null;
  
  let cleaned = intentsTokenId.trim().toLowerCase();
  
  // Remove "intents:" prefix if present
  if (cleaned.startsWith('intents:')) {
    cleaned = cleaned.replace(/^intents:/, '');
  }
  
  // Direct lookup in unified mapping
  const directMatch = baseMap[cleaned];
  if (directMatch) return directMatch;
  
  // Handle dynamic meme-cooking tokens: "gnear-229.meme-cooking.near" → "gnear"
  if (cleaned.includes('.meme-cooking.near')) {
    const symbol = cleaned.split('-')[0];
    return symbol ? (baseMap[symbol] ?? null) : null;
  }
  
  return null;
}
