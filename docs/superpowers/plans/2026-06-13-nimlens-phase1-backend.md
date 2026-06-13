# NimLens Phase 1 — Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NimLens Go backend: `/api/health`, `/api/rates` (CoinGecko-backed, 60s cache, staleness flag), and `/api/balance/:address` (Nimiq RPC proxy), plus Docker packaging.

**Architecture:** A single Go binary (`package main`, stdlib `net/http` only — no external dependencies). `rates.go` fetches and normalizes CoinGecko prices, `cache.go` wraps that fetch with a 60s TTL cache that degrades to stale-but-served on fetch failure, `balance.go` proxies NIM balance lookups to a public Nimiq RPC node, and `handlers.go`/`main.go` wire it all into an HTTP server with permissive CORS for the mini app frontend.

**Tech Stack:** Go 1.24, stdlib `net/http` (using the Go 1.22+ method+pattern `ServeMux`), `net/http/httptest` for tests, Docker + docker-compose.

---

## File Structure

```
backend/
├── go.mod
├── main.go           # server wiring, env config, CORS middleware
├── handlers.go        # HTTP handlers: health, rates, balance
├── handlers_test.go
├── rates.go           # CoinGecko client + normalization types
├── rates_test.go
├── cache.go           # TTL cache with stale-on-error fallback
├── cache_test.go
├── balance.go         # Nimiq RPC client for NIM balance
├── balance_test.go
└── Dockerfile
docker-compose.yml      # repo root
.env.example            # repo root
```

---

### Task 1: Project setup and `/api/health`

**Files:**
- Create: `backend/go.mod`
- Create: `backend/handlers.go`
- Create: `backend/handlers_test.go`
- Create: `backend/main.go`

- [ ] **Step 1: Create the Go module**

```bash
mkdir -p /home/maestro/Documents/projects/NimiqLens/backend
cd /home/maestro/Documents/projects/NimiqLens/backend
cat > go.mod << 'EOF'
module nimlens-backend

go 1.24
EOF
```

- [ ] **Step 2: Write the failing test for the health handler**

Create `backend/handlers_test.go`:

```go
package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	w := httptest.NewRecorder()

	healthHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	expected := "{\"status\":\"ok\"}\n"
	if w.Body.String() != expected {
		t.Fatalf("expected body %q, got %q", expected, w.Body.String())
	}
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: FAIL — `undefined: healthHandler`

- [ ] **Step 4: Implement the health handler**

Create `backend/handlers.go`:

```go
package main

import (
	"encoding/json"
	"net/http"
)

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: PASS

- [ ] **Step 6: Create the server entrypoint**

Create `backend/main.go`:

```go
package main

import (
	"log"
	"net/http"
	"os"
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	port := getEnv("PORT", "8080")

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", healthHandler)

	log.Printf("NimLens backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
```

- [ ] **Step 7: Build and smoke-test the server**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go build -o /tmp/nimlens-backend . && /tmp/nimlens-backend &`
Then: `curl -s http://localhost:8080/api/health`
Expected: `{"status":"ok"}`
Then stop the server: `kill %1`

- [ ] **Step 8: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add backend/go.mod backend/main.go backend/handlers.go backend/handlers_test.go
git commit -m "Add backend skeleton with health endpoint"
```

---

### Task 2: CoinGecko rates fetcher

**Files:**
- Create: `backend/rates.go`
- Create: `backend/rates_test.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/rates_test.go`:

```go
package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFetchRates_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{
			"nimiq": {"eur": 0.0123, "usd": 0.0134, "gbp": 0.0105, "chf": 0.0119},
			"bitcoin": {"eur": 58000, "usd": 63000, "gbp": 50000, "chf": 56000},
			"ethereum": {"eur": 3200, "usd": 3500, "gbp": 2800, "chf": 3100},
			"tether": {"eur": 0.92, "usd": 1.0, "gbp": 0.79, "chf": 0.88}
		}`)
	}))
	defer server.Close()

	client := &http.Client{}
	resp, err := FetchRates(client, server.URL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.Source != "CoinGecko" {
		t.Errorf("expected source CoinGecko, got %q", resp.Source)
	}
	if resp.Stale {
		t.Errorf("expected stale=false")
	}
	if resp.Timestamp == "" {
		t.Errorf("expected non-empty timestamp")
	}

	nim, ok := resp.Rates["NIM"]
	if !ok {
		t.Fatalf("missing NIM rates")
	}
	if nim.EUR != 0.0123 || nim.USD != 0.0134 || nim.GBP != 0.0105 || nim.CHF != 0.0119 {
		t.Errorf("unexpected NIM rates: %+v", nim)
	}

	btc, ok := resp.Rates["BTC"]
	if !ok || btc.USD != 63000 {
		t.Errorf("unexpected BTC rates: %+v", btc)
	}

	eth, ok := resp.Rates["ETH"]
	if !ok || eth.USD != 3500 {
		t.Errorf("unexpected ETH rates: %+v", eth)
	}

	usdt, ok := resp.Rates["USDT"]
	if !ok || usdt.USD != 1.0 {
		t.Errorf("unexpected USDT rates: %+v", usdt)
	}
}

func TestFetchRates_MissingAsset(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{
			"nimiq": {"eur": 0.0123, "usd": 0.0134, "gbp": 0.0105, "chf": 0.0119}
		}`)
	}))
	defer server.Close()

	client := &http.Client{}
	_, err := FetchRates(client, server.URL)
	if err == nil {
		t.Fatal("expected error for missing asset, got nil")
	}
}

func TestFetchRates_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := &http.Client{}
	_, err := FetchRates(client, server.URL)
	if err == nil {
		t.Fatal("expected error for HTTP 500, got nil")
	}
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: FAIL — `undefined: FetchRates`, `undefined: AssetRates`, etc.

- [ ] **Step 3: Implement the CoinGecko fetcher**

Create `backend/rates.go`:

```go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// AssetRates holds an asset's price in each supported fiat currency.
type AssetRates struct {
	EUR float64 `json:"EUR"`
	USD float64 `json:"USD"`
	GBP float64 `json:"GBP"`
	CHF float64 `json:"CHF"`
}

// RatesResponse is the normalized payload returned by GET /api/rates.
type RatesResponse struct {
	Rates     map[string]AssetRates `json:"rates"`
	Timestamp string                `json:"timestamp"`
	FetchedAt string                `json:"fetched_at"`
	Stale     bool                  `json:"stale"`
	Source    string                `json:"source"`
}

type coinGeckoPrice struct {
	EUR float64 `json:"eur"`
	USD float64 `json:"usd"`
	GBP float64 `json:"gbp"`
	CHF float64 `json:"chf"`
}

var coinGeckoIDToAsset = map[string]string{
	"nimiq":    "NIM",
	"bitcoin":  "BTC",
	"ethereum": "ETH",
	"tether":   "USDT",
}

// FetchRates fetches NIM, BTC, ETH, and USDT prices in EUR/USD/GBP/CHF from
// CoinGecko's simple price endpoint and normalizes them into a RatesResponse.
func FetchRates(client *http.Client, baseURL string) (RatesResponse, error) {
	url := fmt.Sprintf("%s/simple/price?ids=nimiq,bitcoin,ethereum,tether&vs_currencies=eur,usd,gbp,chf", baseURL)

	resp, err := client.Get(url)
	if err != nil {
		return RatesResponse{}, fmt.Errorf("fetching rates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return RatesResponse{}, fmt.Errorf("coingecko returned status %d", resp.StatusCode)
	}

	var raw map[string]coinGeckoPrice
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		return RatesResponse{}, fmt.Errorf("decoding rates: %w", err)
	}

	rates := make(map[string]AssetRates, len(coinGeckoIDToAsset))
	for id, asset := range coinGeckoIDToAsset {
		price, ok := raw[id]
		if !ok {
			return RatesResponse{}, fmt.Errorf("missing price for %s", id)
		}
		rates[asset] = AssetRates{EUR: price.EUR, USD: price.USD, GBP: price.GBP, CHF: price.CHF}
	}

	now := time.Now().UTC().Format(time.RFC3339)
	return RatesResponse{
		Rates:     rates,
		Timestamp: now,
		FetchedAt: now,
		Stale:     false,
		Source:    "CoinGecko",
	}, nil
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add backend/rates.go backend/rates_test.go
git commit -m "Add CoinGecko rate fetcher with normalization"
```

---

### Task 3: TTL cache with stale-on-error fallback

**Files:**
- Create: `backend/cache.go`
- Create: `backend/cache_test.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/cache_test.go`:

```go
package main

import (
	"errors"
	"testing"
	"time"
)

func TestRatesCache_FetchesOnFirstCall(t *testing.T) {
	calls := 0
	cache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		calls++
		return RatesResponse{Source: "CoinGecko"}, nil
	})

	resp, err := cache.Get()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Stale {
		t.Errorf("expected stale=false on first fetch")
	}
	if calls != 1 {
		t.Errorf("expected 1 fetch call, got %d", calls)
	}
}

func TestRatesCache_ReturnsCachedWithinTTL(t *testing.T) {
	calls := 0
	cache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		calls++
		return RatesResponse{Source: "CoinGecko"}, nil
	})
	fixedNow := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	cache.now = func() time.Time { return fixedNow }

	cache.Get()
	resp, err := cache.Get()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Stale {
		t.Errorf("expected stale=false within TTL")
	}
	if calls != 1 {
		t.Errorf("expected 1 fetch call (cached on second Get), got %d", calls)
	}
}

func TestRatesCache_RefetchesAfterTTL(t *testing.T) {
	calls := 0
	cache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		calls++
		return RatesResponse{Source: "CoinGecko"}, nil
	})
	t0 := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	cache.now = func() time.Time { return t0 }
	cache.Get()

	cache.now = func() time.Time { return t0.Add(61 * time.Second) }
	cache.Get()

	if calls != 2 {
		t.Errorf("expected 2 fetch calls after TTL expiry, got %d", calls)
	}
}

func TestRatesCache_ReturnsStaleOnFetchErrorWithCache(t *testing.T) {
	calls := 0
	cache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		calls++
		if calls == 1 {
			return RatesResponse{Source: "CoinGecko"}, nil
		}
		return RatesResponse{}, errors.New("coingecko down")
	})
	t0 := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	cache.now = func() time.Time { return t0 }
	if _, err := cache.Get(); err != nil {
		t.Fatalf("unexpected error on first Get: %v", err)
	}

	cache.now = func() time.Time { return t0.Add(61 * time.Second) }
	resp, err := cache.Get()
	if err != nil {
		t.Fatalf("expected no error when serving stale cache, got %v", err)
	}
	if !resp.Stale {
		t.Errorf("expected stale=true after fetch error with existing cache")
	}
	if resp.Source != "CoinGecko" {
		t.Errorf("expected cached source to be preserved, got %q", resp.Source)
	}
}

func TestRatesCache_ReturnsErrorWithNoCache(t *testing.T) {
	cache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		return RatesResponse{}, errors.New("coingecko down")
	})

	_, err := cache.Get()
	if err == nil {
		t.Fatal("expected error when fetch fails with no existing cache")
	}
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: FAIL — `undefined: NewRatesCache`

- [ ] **Step 3: Implement the cache**

Create `backend/cache.go`:

```go
package main

import (
	"sync"
	"time"
)

// RatesCache wraps a rate-fetching function with a TTL cache. If the fetch
// fails but a previous result exists, the cached result is returned with
// Stale set to true instead of propagating the error.
type RatesCache struct {
	mu        sync.Mutex
	rates     RatesResponse
	fetchedAt time.Time
	hasData   bool
	ttl       time.Duration
	fetch     func() (RatesResponse, error)
	now       func() time.Time
}

// NewRatesCache creates a cache that calls fetch to refresh data older than ttl.
func NewRatesCache(ttl time.Duration, fetch func() (RatesResponse, error)) *RatesCache {
	return &RatesCache{
		ttl:   ttl,
		fetch: fetch,
		now:   time.Now,
	}
}

// Get returns the current rates, refreshing them if the cache is empty or
// has expired. On refresh failure, it falls back to the last known good
// value with Stale=true if one exists.
func (c *RatesCache) Get() (RatesResponse, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.hasData && c.now().Sub(c.fetchedAt) < c.ttl {
		resp := c.rates
		resp.Stale = false
		return resp, nil
	}

	fresh, err := c.fetch()
	if err != nil {
		if c.hasData {
			resp := c.rates
			resp.Stale = true
			return resp, nil
		}
		return RatesResponse{}, err
	}

	c.rates = fresh
	c.fetchedAt = c.now()
	c.hasData = true

	resp := c.rates
	resp.Stale = false
	return resp, nil
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add backend/cache.go backend/cache_test.go
git commit -m "Add TTL rates cache with stale-on-error fallback"
```

---

### Task 4: `GET /api/rates` handler

**Files:**
- Modify: `backend/handlers.go`
- Modify: `backend/handlers_test.go`
- Modify: `backend/main.go`

- [ ] **Step 1: Write the failing tests**

Append to `backend/handlers_test.go`:

```go
func TestRatesHandler_Success(t *testing.T) {
	cache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		return RatesResponse{
			Rates:     map[string]AssetRates{"NIM": {EUR: 0.01, USD: 0.011, GBP: 0.009, CHF: 0.0095}},
			Timestamp: "2026-06-13T16:30:00Z",
			FetchedAt: "2026-06-13T16:30:00Z",
			Source:    "CoinGecko",
		}, nil
	})

	req := httptest.NewRequest(http.MethodGet, "/api/rates", nil)
	w := httptest.NewRecorder()

	ratesHandler(cache)(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp RatesResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decoding response: %v", err)
	}
	if resp.Source != "CoinGecko" {
		t.Errorf("expected source CoinGecko, got %q", resp.Source)
	}
	if resp.Rates["NIM"].EUR != 0.01 {
		t.Errorf("unexpected NIM EUR rate: %v", resp.Rates["NIM"].EUR)
	}
}

func TestRatesHandler_Unavailable(t *testing.T) {
	cache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		return RatesResponse{}, errors.New("coingecko down")
	})

	req := httptest.NewRequest(http.MethodGet, "/api/rates", nil)
	w := httptest.NewRecorder()

	ratesHandler(cache)(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", w.Code)
	}
}
```

Add the needed imports (`encoding/json`, `errors`, `time`) to the top of `backend/handlers_test.go`:

```go
import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: FAIL — `undefined: ratesHandler`

- [ ] **Step 3: Implement the handler**

Append to `backend/handlers.go`:

```go
func ratesHandler(cache *RatesCache) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp, err := cache.Get()
		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{"error": "rates unavailable"})
			return
		}
		json.NewEncoder(w).Encode(resp)
	}
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: PASS

- [ ] **Step 5: Wire the handler into the server**

Modify `backend/main.go`. Replace the body of `main` with:

```go
func main() {
	port := getEnv("PORT", "8080")
	coinGeckoBaseURL := getEnv("COINGECKO_API_BASE", "https://api.coingecko.com/api/v3")

	httpClient := &http.Client{Timeout: 10 * time.Second}

	ratesCache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		return FetchRates(httpClient, coinGeckoBaseURL)
	})

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", healthHandler)
	mux.HandleFunc("GET /api/rates", ratesHandler(ratesCache))

	log.Printf("NimLens backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
```

Add `"time"` to the import block of `backend/main.go`:

```go
import (
	"log"
	"net/http"
	"os"
	"time"
)
```

- [ ] **Step 6: Build and smoke-test against the live CoinGecko API**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go build -o /tmp/nimlens-backend . && /tmp/nimlens-backend &`
Then: `curl -s http://localhost:8080/api/rates`
Expected: JSON with `"source":"CoinGecko"`, `"stale":false`, and `rates.NIM`, `rates.BTC`, `rates.ETH`, `rates.USDT` each containing `EUR`, `USD`, `GBP`, `CHF`.
Then stop the server: `kill %1`

- [ ] **Step 7: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add backend/handlers.go backend/handlers_test.go backend/main.go
git commit -m "Add GET /api/rates endpoint"
```

---

### Task 5: Nimiq RPC balance client

**Files:**
- Create: `backend/balance.go`
- Create: `backend/balance_test.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/balance_test.go`:

```go
package main

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetBalance_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{
			"jsonrpc": "2.0",
			"result": {
				"data": {
					"address": "NQ07 0000 0000 0000 0000 0000 0000 0000 0000",
					"balance": 12345000
				}
			},
			"id": 1
		}`)
	}))
	defer server.Close()

	client := NewNimiqRPCClient(&http.Client{}, server.URL)
	resp, err := client.GetBalance("NQ07 0000 0000 0000 0000 0000 0000 0000 0000")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.Address != "NQ07 0000 0000 0000 0000 0000 0000 0000 0000" {
		t.Errorf("unexpected address: %q", resp.Address)
	}
	if resp.BalanceNIM != 123.45 {
		t.Errorf("expected balance_nim 123.45, got %v", resp.BalanceNIM)
	}
}

func TestGetBalance_RPCError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{
			"jsonrpc": "2.0",
			"error": {"code": -32602, "message": "Invalid address"},
			"id": 1
		}`)
	}))
	defer server.Close()

	client := NewNimiqRPCClient(&http.Client{}, server.URL)
	_, err := client.GetBalance("not-an-address")
	if err == nil {
		t.Fatal("expected error for RPC error response, got nil")
	}
}

func TestGetBalance_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := NewNimiqRPCClient(&http.Client{}, server.URL)
	_, err := client.GetBalance("NQ07 0000 0000 0000 0000 0000 0000 0000 0000")
	if err == nil {
		t.Fatal("expected error for HTTP 500, got nil")
	}
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: FAIL — `undefined: NewNimiqRPCClient`

- [ ] **Step 3: Implement the RPC client**

Create `backend/balance.go`:

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const lunaPerNIM = 100000.0

// BalanceResponse is the payload returned by GET /api/balance/:address.
type BalanceResponse struct {
	Address    string  `json:"address"`
	BalanceNIM float64 `json:"balance_nim"`
}

// NimiqRPCClient queries a Nimiq Albatross JSON-RPC node for account data.
type NimiqRPCClient struct {
	client *http.Client
	rpcURL string
}

// NewNimiqRPCClient creates a client targeting the given RPC URL.
func NewNimiqRPCClient(client *http.Client, rpcURL string) *NimiqRPCClient {
	return &NimiqRPCClient{client: client, rpcURL: rpcURL}
}

type rpcRequest struct {
	JSONRPC string `json:"jsonrpc"`
	Method  string `json:"method"`
	Params  []any  `json:"params"`
	ID      int    `json:"id"`
}

type rpcAccountData struct {
	Address string `json:"address"`
	Balance int64  `json:"balance"`
}

type rpcResult struct {
	Data rpcAccountData `json:"data"`
}

type rpcErrorBody struct {
	Message string `json:"message"`
}

type rpcResponse struct {
	Result *rpcResult    `json:"result"`
	Error  *rpcErrorBody `json:"error"`
}

// GetBalance returns the NIM balance for address by calling getAccountByAddress.
func (c *NimiqRPCClient) GetBalance(address string) (BalanceResponse, error) {
	reqBody, err := json.Marshal(rpcRequest{
		JSONRPC: "2.0",
		Method:  "getAccountByAddress",
		Params:  []any{address},
		ID:      1,
	})
	if err != nil {
		return BalanceResponse{}, fmt.Errorf("encoding rpc request: %w", err)
	}

	resp, err := c.client.Post(c.rpcURL, "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return BalanceResponse{}, fmt.Errorf("calling nimiq rpc: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return BalanceResponse{}, fmt.Errorf("nimiq rpc returned status %d", resp.StatusCode)
	}

	var rpcResp rpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return BalanceResponse{}, fmt.Errorf("decoding rpc response: %w", err)
	}

	if rpcResp.Error != nil {
		return BalanceResponse{}, fmt.Errorf("nimiq rpc error: %s", rpcResp.Error.Message)
	}
	if rpcResp.Result == nil {
		return BalanceResponse{}, fmt.Errorf("nimiq rpc returned no result")
	}

	return BalanceResponse{
		Address:    address,
		BalanceNIM: float64(rpcResp.Result.Data.Balance) / lunaPerNIM,
	}, nil
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add backend/balance.go backend/balance_test.go
git commit -m "Add Nimiq RPC balance client"
```

---

### Task 6: `GET /api/balance/{address}` handler

**Files:**
- Modify: `backend/handlers.go`
- Modify: `backend/handlers_test.go`
- Modify: `backend/main.go`

- [ ] **Step 1: Write the failing tests**

Append to `backend/handlers_test.go`:

```go
func TestBalanceHandler_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"jsonrpc":"2.0","result":{"data":{"address":"NQ07 0000 0000 0000 0000 0000 0000 0000 0000","balance":12345000}},"id":1}`)
	}))
	defer server.Close()

	rpcClient := NewNimiqRPCClient(&http.Client{}, server.URL)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/balance/{address}", balanceHandler(rpcClient))

	req := httptest.NewRequest(http.MethodGet, "/api/balance/NQ07%200000%200000%200000%200000%200000%200000%200000%200000", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp BalanceResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatalf("decoding response: %v", err)
	}
	if resp.BalanceNIM != 123.45 {
		t.Errorf("expected balance_nim 123.45, got %v", resp.BalanceNIM)
	}
}

func TestBalanceHandler_Unavailable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	rpcClient := NewNimiqRPCClient(&http.Client{}, server.URL)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/balance/{address}", balanceHandler(rpcClient))

	req := httptest.NewRequest(http.MethodGet, "/api/balance/NQ07", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", w.Code)
	}
}
```

Add `"fmt"` to the import block of `backend/handlers_test.go`:

```go
import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: FAIL — `undefined: balanceHandler`

- [ ] **Step 3: Implement the handler**

Append to `backend/handlers.go`:

```go
func balanceHandler(client *NimiqRPCClient) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		address := r.PathValue("address")

		resp, err := client.GetBalance(address)
		w.Header().Set("Content-Type", "application/json")
		if err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]string{"error": "balance unavailable"})
			return
		}
		json.NewEncoder(w).Encode(resp)
	}
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: PASS

- [ ] **Step 5: Wire the handler into the server**

Modify `backend/main.go`. Update the body of `main` to add the Nimiq RPC client and route:

```go
func main() {
	port := getEnv("PORT", "8080")
	coinGeckoBaseURL := getEnv("COINGECKO_API_BASE", "https://api.coingecko.com/api/v3")
	nimiqRPCURL := getEnv("NIMIQ_RPC_URL", "https://rpc-mainnet.nimiqscan.com")

	httpClient := &http.Client{Timeout: 10 * time.Second}

	ratesCache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		return FetchRates(httpClient, coinGeckoBaseURL)
	})

	rpcClient := NewNimiqRPCClient(httpClient, nimiqRPCURL)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", healthHandler)
	mux.HandleFunc("GET /api/rates", ratesHandler(ratesCache))
	mux.HandleFunc("GET /api/balance/{address}", balanceHandler(rpcClient))

	log.Printf("NimLens backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
```

- [ ] **Step 6: Build and smoke-test against the live Nimiq RPC node**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go build -o /tmp/nimlens-backend . && /tmp/nimlens-backend &`
Then: `curl -s "http://localhost:8080/api/balance/NQ07%200000%200000%200000%200000%200000%200000%200000%200000"`
Expected: JSON with `"address"` and `"balance_nim"` fields.

**If the response shape from `rpc-mainnet.nimiqscan.com` differs** from `{"result":{"data":{"address":...,"balance":...}}}` (e.g. balance is nested elsewhere or named differently), inspect the raw response with:
`curl -s -X POST https://rpc-mainnet.nimiqscan.com -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"getAccountByAddress","params":["NQ07 0000 0000 0000 0000 0000 0000 0000 0000"],"id":1}'`
and adjust the `rpcResult`/`rpcAccountData` struct fields in `backend/balance.go` to match, then re-run the unit tests and this smoke test.

Then stop the server: `kill %1`

- [ ] **Step 7: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add backend/handlers.go backend/handlers_test.go backend/main.go
git commit -m "Add GET /api/balance/{address} endpoint"
```

---

### Task 7: CORS middleware

**Files:**
- Create: `backend/cors.go`
- Create: `backend/cors_test.go`
- Modify: `backend/main.go`

- [ ] **Step 1: Write the failing tests**

Create `backend/cors_test.go`:

```go
package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWithCORS_SetsHeaderAndCallsNext(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	handler := withCORS("https://example.com", next)

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if !called {
		t.Error("expected next handler to be called")
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://example.com" {
		t.Errorf("expected Access-Control-Allow-Origin=https://example.com, got %q", got)
	}
}

func TestWithCORS_HandlesOptionsPreflight(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})

	handler := withCORS("*", next)

	req := httptest.NewRequest(http.MethodOptions, "/api/rates", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if called {
		t.Error("expected next handler not to be called for OPTIONS preflight")
	}
	if w.Code != http.StatusNoContent {
		t.Errorf("expected status 204, got %d", w.Code)
	}
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: FAIL — `undefined: withCORS`

- [ ] **Step 3: Implement the middleware**

Create `backend/cors.go`:

```go
package main

import "net/http"

// withCORS sets Access-Control-Allow-Origin to allowedOrigin on every
// response and short-circuits OPTIONS preflight requests with 204.
func withCORS(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go test ./...`
Expected: PASS

- [ ] **Step 5: Wire the middleware into the server**

Modify `backend/main.go`. Update the final lines of `main` (the `log.Printf`/`ListenAndServe` call) and add an `ALLOWED_ORIGIN` env var:

```go
func main() {
	port := getEnv("PORT", "8080")
	coinGeckoBaseURL := getEnv("COINGECKO_API_BASE", "https://api.coingecko.com/api/v3")
	nimiqRPCURL := getEnv("NIMIQ_RPC_URL", "https://rpc-mainnet.nimiqscan.com")
	allowedOrigin := getEnv("ALLOWED_ORIGIN", "*")

	httpClient := &http.Client{Timeout: 10 * time.Second}

	ratesCache := NewRatesCache(60*time.Second, func() (RatesResponse, error) {
		return FetchRates(httpClient, coinGeckoBaseURL)
	})

	rpcClient := NewNimiqRPCClient(httpClient, nimiqRPCURL)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", healthHandler)
	mux.HandleFunc("GET /api/rates", ratesHandler(ratesCache))
	mux.HandleFunc("GET /api/balance/{address}", balanceHandler(rpcClient))

	log.Printf("NimLens backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, withCORS(allowedOrigin, mux)); err != nil {
		log.Fatal(err)
	}
}
```

- [ ] **Step 6: Build and run full test suite**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go build ./... && go test ./...`
Expected: build succeeds, all tests PASS

- [ ] **Step 7: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add backend/cors.go backend/cors_test.go backend/main.go
git commit -m "Add CORS middleware"
```

---

### Task 8: Docker packaging

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Create the Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY *.go ./
RUN go build -o nimlens-backend .

FROM alpine:3.20
WORKDIR /app
COPY --from=build /app/nimlens-backend .
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["./nimlens-backend"]
```

- [ ] **Step 2: Create the dockerignore**

Create `backend/.dockerignore`:

```
*_test.go
```

- [ ] **Step 3: Create the docker-compose file**

Create `docker-compose.yml`:

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - COINGECKO_API_BASE=https://api.coingecko.com/api/v3
      - NIMIQ_RPC_URL=https://rpc-mainnet.nimiqscan.com
      - ALLOWED_ORIGIN=*
```

- [ ] **Step 4: Create the env example**

Create `.env.example`:

```
# Backend
PORT=8080
COINGECKO_API_BASE=https://api.coingecko.com/api/v3
NIMIQ_RPC_URL=https://rpc-mainnet.nimiqscan.com
ALLOWED_ORIGIN=*

# Frontend (added in Phase 2)
VITE_API_BASE_URL=http://localhost:8080
VITE_TIP_ADDRESS=NQ00 0000 0000 0000 0000 0000 0000 0000 0000
```

- [ ] **Step 5: Build and run via docker-compose**

Run: `cd /home/maestro/Documents/projects/NimiqLens && docker compose build backend && docker compose up -d backend`
Then: `curl -s http://localhost:8080/api/health`
Expected: `{"status":"ok"}`
Then: `docker compose down`

- [ ] **Step 6: Commit**

```bash
cd /home/maestro/Documents/projects/NimiqLens
git add backend/Dockerfile backend/.dockerignore docker-compose.yml .env.example
git commit -m "Add Docker packaging for backend"
```

---

### Task 9: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go vet ./... && go test ./... -v`
Expected: `go vet` reports nothing, all tests PASS

- [ ] **Step 2: Run the binary and exercise all three endpoints**

Run: `cd /home/maestro/Documents/projects/NimiqLens/backend && go run . &`
Then run each in turn:
- `curl -s http://localhost:8080/api/health` → `{"status":"ok"}`
- `curl -s http://localhost:8080/api/rates` → `"source":"CoinGecko"`, `"stale":false`, rates for NIM/BTC/ETH/USDT in EUR/USD/GBP/CHF
- `curl -s "http://localhost:8080/api/balance/NQ07%200000%200000%200000%200000%200000%200000%200000%200000"` → `"address"` and `"balance_nim"`

Then stop the server: `kill %1`

- [ ] **Step 3: Verify staleness behavior manually**

With the server still running from Step 2, call `/api/rates` twice in quick succession and confirm the second response has `"stale":false` and a `"fetched_at"` timestamp identical to the first (cache hit, no refetch within 60s).

---

## Self-Review Notes

- **Spec coverage:** `/api/health` (Task 1), `/api/rates` with CoinGecko normalization + 60s TTL cache + staleness (Tasks 2-4), `/api/balance/:address` via `rpc-mainnet.nimiqscan.com` (Tasks 5-6), CORS for the mini app origin (Task 7), Docker packaging + `.env.example` (Task 8). No `/api/ocr` endpoint, matching the design decision that OCR is fully client-side.
- **Type consistency:** `RatesResponse`, `AssetRates`, `BalanceResponse`, `RatesCache`, `NimiqRPCClient` are defined once (Tasks 2, 3, 5) and reused consistently by `handlers.go` (Tasks 4, 6) and `main.go` (Tasks 4, 6, 7).
- **Open item carried to Task 6/9:** the exact Nimiq RPC response shape is assumed based on the standard Albatross JSON-RPC wrapper (`result.data.balance` in Luna); Task 6 Step 6 includes the exact `curl` command and adjustment instructions if `rpc-mainnet.nimiqscan.com` differs.
