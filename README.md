# ReceptionBot

An AI-powered virtual receptionist built with **Node.js + TypeScript + Express**, backed by **PostgreSQL via Prisma**. It handles common front-desk tasks: answering business hours, listing services, and booking appointments through a web chat interface.

---

## Architecture

```
src/
├── index.ts              # Entry point – starts Express server
├── app.ts                # Express app wiring (middleware, routes)
├── config/               # Environment-driven configuration
├── types/                # Shared TypeScript interfaces
├── bot/
│   ├── engine.ts         # Core message processor / intent dispatcher
│   ├── intents/
│   │   └── recognizer.ts # Rule-based intent classifier
│   └── handlers/         # One handler per intent
│       ├── greetingHandler.ts
│       ├── businessHoursHandler.ts
│       ├── servicesInfoHandler.ts
│       ├── appointmentHandler.ts   # Multi-turn booking flow
│       └── fallbackHandler.ts
├── channels/
│   └── web/
│       └── chatRoutes.ts # HTTP endpoints (web widget adapter)
├── services/
│   └── sessionStore.ts   # In-memory session cache (swap for Redis in phase 5)
├── db/
│   ├── prismaClient.ts   # Prisma singleton
│   └── repositories/     # Thin data-access layer
│       ├── sessionRepository.ts
│       ├── messageRepository.ts
│       └── appointmentRepository.ts
└── middleware/
    └── errorHandler.ts   # Centralized error & 404 handling
prisma/
└── schema.prisma         # DB schema: sessions, messages, appointments
tests/
└── README.md             # Test coverage plan (tests added in phase 5)
```

### Design decisions

| Concern | Choice | Rationale |
|---|---|---|
| Runtime | Node.js 20+ / TypeScript | Type-safe, fast iteration |
| Framework | Express 4 | Minimal, well-understood |
| ORM | Prisma 5 | Type-safe queries, easy migrations |
| Session state | In-memory Map | Simple now; clear interface for Redis swap |
| Bot logic | Rule-based intent router | Deterministic, easily auditable |
| Channel | HTTP JSON API | Works with any web widget; adapter-ready for WhatsApp/Slack |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/chat/session` | Create a new chat session |
| `GET` | `/api/chat/session/:id` | Get session + message history |
| `POST` | `/api/chat/message` | Send a message, get bot response |
| `GET` | `/api/chat/history/:id` | Get message history for a session |

### Example flow

```bash
# 1. Start a session
curl -X POST http://localhost:3000/api/chat/session
# → { "sessionId": "uuid", "channel": "web", "createdAt": "..." }

# 2. Send a greeting
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<id>","message":"Hello"}'
# → { "sessionId":"...", "message": { "text": "Hello! 👋 ...", "quickReplies": [...] }, "timestamp":"..." }

# 3. Book an appointment
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"<id>","message":"I want to book an appointment"}'
```

---

## Supported Intents

| Intent | Triggers |
|--------|----------|
| `greeting` | hi, hello, hey, good morning… |
| `business_hours` | hours, open, schedule, timings… |
| `services_info` | services, what do you offer, info… |
| `appointment_booking` | book, appointment, schedule, consult… |
| `fallback` | anything else |

The **appointment booking** flow is multi-turn and collects:
1. Full name
2. Service selection (4 available)
3. Email or phone number
4. Preferred date/time
5. Confirmation

---

## Local Setup

### Prerequisites

- Node.js ≥ 20
- PostgreSQL running locally (or a connection string)
- npm ≥ 10

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```env
DATABASE_URL="******localhost:5432/receptionbot?schema=public"
PORT=3000
NODE_ENV=development
```

### 3. Set up the database

```bash
# Run migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate
```

### 4. Start the server

```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

The server starts at `http://localhost:3000`.

---

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with ts-node + nodemon (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled JS from `dist/` |
| `npm run lint` | ESLint with auto-fix |
| `npm run lint:check` | ESLint check only |
| `npm run format` | Prettier format |
| `npm run format:check` | Prettier check |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run DB migrations (dev) |
| `npm run prisma:migrate:prod` | Deploy migrations (prod) |
| `npm run prisma:studio` | Open Prisma Studio |

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Bootstrap – project structure, tooling, README |
| 2 | ✅ | MVP bot – intent routing, appointment flow |
| 3 | ✅ | Web channel – HTTP adapter endpoints |
| 4 | ✅ | Backend & storage – PostgreSQL + Prisma |
| 5 | 🔜 | Production hardening – auth, tests, Docker, observability |
