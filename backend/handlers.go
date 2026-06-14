package main

import (
	"encoding/json"
	"net/http"
)

func rootHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"service": "nimlens-backend",
		"status":  "ok",
		"endpoints": map[string]string{
			"health":  "/api/health",
			"rates":   "/api/rates",
			"balance": "/api/balance/{address}",
		},
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

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
