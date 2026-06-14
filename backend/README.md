# NimLens backend

Go REST API that normalizes exchange rates and proxies Nimiq balance lookups
for the NimLens frontend. See the [project README](../README.md) for the
overall architecture and [`docs/dev-guide.md`](../docs/dev-guide.md) for setup
and testing instructions.

## Configuration

All configuration is via environment variables (see [`.env.example`](../.env.example)):

| Variable             | Default                              | Description                                                                                  |
| -------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `PORT`               | `8787`                                | Port the server listens on.                                                                    |
| `COINGECKO_API_BASE` | `https://api.coingecko.com/api/v3`   | Base URL for the CoinGecko API used to fetch rates.                                            |
| `NIMIQ_RPC_URL`      | `https://rpc-mainnet.nimiqscan.com`  | Nimiq Albatross JSON-RPC endpoint used for balance lookups.                                    |
| `ALLOWED_ORIGIN`     | `*`                                   | CORS allowed origin(s): `*`, a single origin, or a comma-separated list (see [CORS](#cors)).  |

## API

### `GET /api/health`

Liveness check.

```json
{ "status": "ok" }
```

### `GET /api/rates`

Returns NIM, BTC, ETH, and USDT prices in EUR, USD, GBP, and CHF, fetched from
CoinGecko and cached in memory for 60 seconds.

```json
{
  "rates": {
    "NIM":  { "EUR": 0.012, "USD": 0.013, "GBP": 0.010, "CHF": 0.011 },
    "BTC":  { "EUR": 60000, "USD": 65000, "GBP": 51000, "CHF": 58000 },
    "ETH":  { "EUR": 3000,  "USD": 3250,  "GBP": 2550,  "CHF": 2900 },
    "USDT": { "EUR": 0.92,  "USD": 1.00,  "GBP": 0.78,  "CHF": 0.88 }
  },
  "timestamp": "2026-06-14T12:00:00Z",
  "fetched_at": "2026-06-14T12:00:00Z",
  "stale": false,
  "source": "CoinGecko"
}
```

If CoinGecko is unreachable and no cached value is available, responds
`503 Service Unavailable` with `{"error": "rates unavailable"}`.

### `GET /api/balance/{address}`

Looks up the NIM balance for a Nimiq address via the configured RPC node.

```json
{ "address": "NQ...", "balance_nim": 123.45 }
```

Responds `503 Service Unavailable` with `{"error": "balance unavailable"}` if
the RPC call fails.

## CORS

`withCORS` (see [`cors.go`](cors.go)) sets `Access-Control-Allow-Origin` based
on `ALLOWED_ORIGIN` and short-circuits `OPTIONS` preflight requests with `204`:

- `*` or a single origin — that value is always sent.
- A comma-separated list — the request's `Origin` header is reflected back
  only if it's in the list, with `Vary: Origin` set (since
  `Access-Control-Allow-Origin` can't itself contain multiple values).

## Tests

```bash
go test ./...
```
