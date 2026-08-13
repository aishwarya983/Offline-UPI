#!/usr/bin/env bash
API="http://localhost:4000/api"
set -e

# wait for health
for i in {1..20}; do
  if curl -s "$API/health" | grep -q '"ok"'; then
    break
  fi
  sleep 1
done

echo "API is reachable"

TS=$(date +%s)
EMAIL_A="alice.${TS}@example.com"
EMAIL_B="bob.${TS}@example.com"
PWD="Password123!"

# register user A
TMPDIR="$(dirname "$0")/tmp"
mkdir -p "$TMPDIR"
REG_A=$(curl -s -X POST "$API/auth/register" -H "Content-Type: application/json" -d "{\"name\":\"Alice\",\"email\":\"$EMAIL_A\",\"password\":\"$PWD\"}")
printf "%s" "$REG_A" > "$TMPDIR/reg_a.json"
TOKEN_A=$(python -c "import json;print(json.load(open('$TMPDIR/reg_a.json')).get('token',''))")
USER_A_ID=$(python -c "import json;print(json.load(open('$TMPDIR/reg_a.json')).get('user',{}).get('id',''))")

# register user B
REG_B=$(curl -s -X POST "$API/auth/register" -H "Content-Type: application/json" -d "{\"name\":\"Bob\",\"email\":\"$EMAIL_B\",\"password\":\"$PWD\"}")
printf "%s" "$REG_B" > "$TMPDIR/reg_b.json"
TOKEN_B=$(python -c "import json;print(json.load(open('$TMPDIR/reg_b.json')).get('token',''))")
USER_B_ID=$(python -c "import json;print(json.load(open('$TMPDIR/reg_b.json')).get('user',{}).get('id',''))")

# fetch initial balances
curl -s -H "Authorization: Bearer $TOKEN_A" "$API/account" > "$TMPDIR/a_before.json"
BAL_A_BEFORE=$(python -c "import json;print(json.load(open('$TMPDIR/a_before.json')).get('balance','ERR'))")
curl -s -H "Authorization: Bearer $TOKEN_B" "$API/account" > "$TMPDIR/b_before.json"
BAL_B_BEFORE=$(python -c "import json;print(json.load(open('$TMPDIR/b_before.json')).get('balance','ERR'))")

echo "Balances before: A=$BAL_A_BEFORE, B=$BAL_B_BEFORE"

# Online payment: A -> B amount 500
CLIENT_ON="ON-${TS}-1"
PAY_RES=$(curl -s -X POST "$API/transactions" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d "{\"receiverId\":\"$USER_B_ID\",\"amount\":500,\"note\":\"Online test\",\"clientTransactionId\":\"$CLIENT_ON\"}")
printf "%s" "$PAY_RES" > "$TMPDIR/pay_res.json"
PAY_OK=$(python -c "import json
try:
  j=json.load(open('$TMPDIR/pay_res.json'))
  print(1 if 'transaction' in j else 0)
except Exception:
  print(0)")
if [ "$PAY_OK" -eq 1 ]; then
  echo "Online payment processed"
else
  echo "Online payment failed: $(cat /tmp/pay_res.json)"
fi

# balances after online payment
curl -s -H "Authorization: Bearer $TOKEN_A" "$API/account" > "$TMPDIR/a_after.json"
BAL_A_AFTER=$(python -c "import json;print(json.load(open('$TMPDIR/a_after.json')).get('balance','ERR'))")
curl -s -H "Authorization: Bearer $TOKEN_B" "$API/account" > "$TMPDIR/b_after.json"
BAL_B_AFTER=$(python -c "import json;print(json.load(open('$TMPDIR/b_after.json')).get('balance','ERR'))")

echo "Balances after online: A=$BAL_A_AFTER, B=$BAL_B_AFTER"

# Offline (simulated) sync: create OFF transaction and sync
CLIENT_OFF="OFF-${TS}-1"
SYNC_RES=$(curl -s -X POST "$API/transactions/sync" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d "{\"transactions\":[{\"clientTransactionId\":\"$CLIENT_OFF\",\"receiverId\":\"$USER_B_ID\",\"amount\":250,\"note\":\"Offline test\"}]}" )
printf "%s" "$SYNC_RES" > "$TMPDIR/sync_res.json"

echo "Sync response:"
python - <<PY
import json
try:
  j=json.load(open('$TMPDIR/sync_res.json'))
  print(json.dumps(j.get('results',j),indent=2))
except Exception as e:
  print(open('/tmp/sync_res.json').read())
PY

# balances after sync
curl -s -H "Authorization: Bearer $TOKEN_A" "$API/account" > "$TMPDIR/a_postsync.json"
BAL_A_POSTSYNC=$(python -c "import json;print(json.load(open('$TMPDIR/a_postsync.json')).get('balance','ERR'))")
curl -s -H "Authorization: Bearer $TOKEN_B" "$API/account" > "$TMPDIR/b_postsync.json"
BAL_B_POSTSYNC=$(python -c "import json;print(json.load(open('$TMPDIR/b_postsync.json')).get('balance','ERR'))")

echo "Balances after sync: A=$BAL_A_POSTSYNC, B=$BAL_B_POSTSYNC"

# Retry same sync (idempotency)
RETRY_RES=$(curl -s -X POST "$API/transactions/sync" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d "{\"transactions\":[{\"clientTransactionId\":\"$CLIENT_OFF\",\"receiverId\":\"$USER_B_ID\",\"amount\":250,\"note\":\"Offline test retry\"}]}" )
printf "%s" "$RETRY_RES" > "$TMPDIR/retry_res.json"

echo "Retry sync response:"
python - <<PY
import json
try:
  j=json.load(open('$TMPDIR/retry_res.json'))
  print(json.dumps(j.get('results',j),indent=2))
except Exception:
  print(open('/tmp/retry_res.json').read())
PY

# balances after retry
curl -s -H "Authorization: Bearer $TOKEN_A" "$API/account" > "$TMPDIR/a_retry.json"
BAL_A_RETRY=$(python -c "import json;print(json.load(open('$TMPDIR/a_retry.json')).get('balance','ERR'))")
curl -s -H "Authorization: Bearer $TOKEN_B" "$API/account" > "$TMPDIR/b_retry.json"
BAL_B_RETRY=$(python -c "import json;print(json.load(open('$TMPDIR/b_retry.json')).get('balance','ERR'))")

echo "Balances after retry: A=$BAL_A_RETRY, B=$BAL_B_RETRY"

# Insufficient balance test: A tries to send 1,000,000
BIG_TX="OFF-${TS}-big"
BIG_RES=$(curl -s -X POST "$API/transactions/sync" -H "Authorization: Bearer $TOKEN_A" -H "Content-Type: application/json" -d "{\"transactions\":[{\"clientTransactionId\":\"$BIG_TX\",\"receiverId\":\"$USER_B_ID\",\"amount\":1000000,\"note\":\"Big test\"}]}" )
printf "%s" "$BIG_RES" > "$TMPDIR/big_res.json"

echo "Insufficient balance response:"
python - <<PY
import json
try:
  j=json.load(open('$TMPDIR/big_res.json'))
  print(json.dumps(j.get('results',j),indent=2))
except Exception:
  print(open('/tmp/big_res.json').read())
PY

echo "TESTS COMPLETE"
