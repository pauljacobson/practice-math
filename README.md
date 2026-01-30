# Practice Math

An AI-powered math tutor chat app for kids, built with Vite + Preact on the frontend and Cloudflare Workers on the backend.

Students interact with a Claude-powered AI tutor that explains math concepts step by step, renders equations with LaTeX, and generates interactive geometry diagrams.

## Features

- **AI math tutoring** — Claude answers math questions with patient, step-by-step explanations
- **LaTeX rendering** — Math equations rendered with KaTeX (inline and display mode)
- **Interactive diagrams** — Geometry questions produce draggable JSXGraph diagrams
- **Passkey authentication** — Passwordless login via WebAuthn (Touch ID, Face ID, security keys)
- **Persistent conversations** — Chat history stored in D1, survives page refreshes and sessions
- **Image uploads** — Attach photos of math problems for Claude's vision API
- **Streaming responses** — Real-time response display via Server-Sent Events

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + Preact |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Sessions | Cloudflare KV |
| Auth | WebAuthn / Passkeys via @simplewebauthn |
| AI | Anthropic Claude API (claude-haiku-4-5) |
| Math rendering | KaTeX (CDN) |
| Diagrams | JSXGraph (CDN) |
| Markdown | marked + DOMPurify |

## Local Development

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Install dependencies
npm install

# Add your API key
echo "ANTHROPIC_API_KEY=your-key-here" > .dev.vars

# Create the local database
npm run db:migrate
```

### Running

Start both servers in separate terminals:

```bash
# Terminal 1: Cloudflare Worker (port 8787)
npm run worker:dev

# Terminal 2: Vite dev server (port 5173)
npm run dev
```

Open http://localhost:5173, register with a username and passkey, and start asking math questions.

## Project Structure

```
practice-math/
├── src/                    # Frontend (Vite + Preact)
│   ├── components/         # Preact components (AuthView, ChatView, etc.)
│   ├── lib/                # API client, auth, message rendering
│   └── styles/             # CSS
├── worker/                 # Cloudflare Worker backend
│   ├── handlers/           # Route handlers (auth, chat, upload)
│   └── lib/                # Claude API, DB queries, sessions, passkeys
├── migrations/             # D1 database schema
└── reference/              # Legacy reference code
```

## Security

- Passkey-based authentication (no passwords stored)
- Session cookies (httpOnly, SameSite)
- DOMPurify HTML sanitization on all rendered content
- JSXGraph code execution sandboxed with blocklist validation and global shadowing
- System prompt hardened against prompt injection
- Message length limits enforced server-side

## License

MIT
