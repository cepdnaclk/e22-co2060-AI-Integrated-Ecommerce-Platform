# Bookkeeping Service (Automated, Event-Driven)

Production-oriented bookkeeping microservice for e-commerce transactions with strict double-entry accounting, idempotent event processing, MongoDB persistence, and Redis/BullMQ async processing.

## Architecture

E-commerce Backend -> POST /events -> BullMQ Redis Queue -> Worker -> Rule Engine -> Journal Entries -> Ledger Balances -> Financial Reports.

## Features

- Independent microservice (`Backend\bookkeeping-service`)
- Event-driven processing for:
  - `ORDER_CREATED`
  - `ORDER_PAID`
  - `ORDER_SHIPPED`
  - `PAYMENT_RECEIVED`
  - `REFUND_ISSUED`
  - `INVENTORY_PURCHASED`
  - `SUPPLIER_PAYMENT`
  - `MARKETPLACE_SETTLEMENT`
  - `EXPENSE_RECORDED`
- Configurable accounting mapping via `accounting_rules` collection (seeded defaults, not hardcoded in worker flow)
- Double-entry integrity checks (`totalDebits === totalCredits`)
- MongoDB transactions for journal + ledger + event log atomicity
- Idempotency via `event_logs`, Redis lock key, and processed key
- Audit trail preserved (no journal deletion; reversal-ready model shape)
- Report caching in Redis

## Data Model (MongoDB)

- `accounts`
- `accountingrules`
- `journalentries`
- `ledgerbalances`
- `eventlogs`

Indexes include:
- account code unique index
- event id unique index (journal/event log)
- event status index
- journal tracing indexes (event/source document)

## API

- `POST /events`
- `GET /reports/profit-loss`
- `GET /reports/balance-sheet`
- `GET /reports/trial-balance`
- `GET /accounts`
- `GET /ledger/:accountId`
- `GET /health`

## Setup

1. Copy `.env.example` to `.env` and adjust MongoDB/Redis settings.
   - For frontend access, set `FRONTEND_ORIGIN` (comma-separated allowed origins).
2. Install dependencies:
   - `npm install`
3. Ensure Redis is running and reachable at your `.env` host/port (default `127.0.0.1:6379`).
   - Quick check: `redis-cli -h 127.0.0.1 -p 6379 ping` -> `PONG`
   - If Redis is on another host/port, update `REDIS_HOST`/`REDIS_PORT`.
4. Ensure MongoDB is running and reachable at `MONGO_URI`.
5. Run API:
   - `npm start` (or `npm run start:api`)
6. Run worker:
   - `npm run start:worker`
   - Optional when `INLINE_EVENT_PROCESSING=true` (default in `.env.example`). In that mode, the API also processes queued events directly, so accounting still updates even if worker is not running.

## Sample Event

See `samples\events.json`.

Example:

```json
{
  "eventId": "evt-order-paid-1001",
  "type": "ORDER_PAID",
  "timestamp": "2026-04-17T10:00:00.000Z",
  "source": "ecommerce-backend",
  "payload": {
    "orderId": "1001",
    "amount": 3500,
    "sourceDocumentType": "PAYMENT_GATEWAY_REPORT",
    "sourceDocumentId": "PG-1001"
  }
}
```

## End-to-End Example

1. E-commerce backend emits `ORDER_PAID`.
2. `POST /events` validates and queues event.
3. Worker consumes queue job.
4. Rule engine maps event -> journal lines.
5. Journal entry is persisted in Mongo transaction.
6. Ledger balances/history are updated in same transaction.
7. Event log marked `PROCESSED`.
8. Cached reports invalidated; subsequent report request reflects latest transaction.

## Tests

- Unit: accounting rule engine and balancing behavior
- Integration: event -> journal flow, duplicate processing protection, failed transaction status

Run:

`npm test`

