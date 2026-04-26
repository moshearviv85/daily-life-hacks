#!/bin/bash
# Pinterest Routes KV Seed Script
# Populates Cloudflare KV with routing entries for Pinterest versioned URLs.
#
# Usage:
#   CF_ACCOUNT_ID=xxx CF_API_TOKEN=xxx KV_NAMESPACE_ID=xxx ./seed-pinterest-routes.sh
#
# To find your KV_NAMESPACE_ID:
#   Cloudflare Dashboard > Workers & Pages > KV > PINTEREST_ROUTES > copy the ID

set -euo pipefail

: "${CF_ACCOUNT_ID:?Set CF_ACCOUNT_ID}"
: "${CF_API_TOKEN:?Set CF_API_TOKEN}"
: "${KV_NAMESPACE_ID:?Set KV_NAMESPACE_ID}"

BASE_URL="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}"

put_route() {
  local key="$1"
  local value="$2"
  echo "Setting: ${key}"
  curl -s -X PUT "${BASE_URL}/values/${key}" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "${value}" > /dev/null
}

# --- INTERNAL ROUTES (proxy to base article) ---
# Add v1-v4 for each article slug. Expand this list as needed.

SLUGS=(
  "batch-cooking-for-beginners-weekly-guide"
  "best-way-to-store-avocados-to-stop-browning"
  "easy-high-fiber-breakfast-ideas-for-gut-health"
  "high-fiber-meals-for-constipation-relief"
  "high-protein-high-fiber-meals-for-weight-loss"
)

for slug in "${SLUGS[@]}"; do
  for v in 1 2 3 4; do
    put_route "${slug}-v${v}" "{\"type\":\"internal\",\"base_slug\":\"${slug}\",\"external_url\":null}"
  done
done

# --- EXTERNAL ROUTES (redirect to affiliate) ---
# Example: uncomment and customize when you have affiliate links
#
# put_route "batch-cooking-for-beginners-weekly-guide-v5" \
#   '{"type":"external","base_slug":"batch-cooking-for-beginners-weekly-guide","external_url":"https://www.etsy.com/your-product?ref=dlh"}'

echo ""
echo "Done! Routes seeded. Wait ~60s for KV propagation."
