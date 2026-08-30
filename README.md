# Grammar Master

Grammar Master is a Next.js writing assistant for grammar correction, tone-based rewriting, translation, and synonym generation. The app is intentionally free-only, using Groq for AI processing and MongoDB for user and prompt persistence.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Free-Only Policy](#free-only-policy)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Upstash Setup](#upstash-setup)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Scripts](#scripts)
- [Notes](#notes)

## Features

- Grammar correction
- Text comparison and correction
- Translation
- Synonym generation
- Tone-based rewriting
- Redis-backed rate limiting for production
- MongoDB-backed user and prompt tracking

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15, React 18, TypeScript |
| Database | MongoDB + Mongoose |
| AI | Groq SDK |
| Rate limiting | Upstash Redis (production), in-memory fallback (local) |
| Styling | Bootstrap + custom SCSS |

## Free-Only Policy

This project is designed to stay free-only. There is no paid plan logic — `plan` is normalized to `free` at runtime on every request.

Enforced rules:

- `plan` is restricted to `free`
- Prompt limit is fixed at `1000` per user
- AI routes enforce a per-user rate limit
- Upstash Redis backs rate limiting in production when configured

## Getting Started

```bash
git clone https://github.com/daivikawasthi01/Grammar-Master.git
cd Grammar-Master
npm install
cp .env.example .env.local
```

Fill in the required variables in `.env.local` (see [Environment Variables](#environment-variables)), then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Yes | Random secret used to sign auth tokens |
| `NEXTAUTH_SECRET` | Yes | Random secret for NextAuth (different from `JWT_SECRET`) |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` locally, your production URL when deployed |
| `GROQ_API_KEY` | Yes | API key from Groq, used by every AI route |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL, enables production rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST token (write-enabled, not readonly) |

```env
MONGODB_URI=mongodb://127.0.0.1:27017/grammar-master
JWT_SECRET=your-long-random-secret
NEXTAUTH_SECRET=your-different-long-random-secret
NEXTAUTH_URL=http://localhost:3000
GROQ_API_KEY=your_groq_api_key_here
UPSTASH_REDIS_REST_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token_here
```

**Notes:**
- Use different random values for `JWT_SECRET` and `NEXTAUTH_SECRET`.
- The rate limiter uses `incr`, `expire`, and `ttl`, so the Upstash token must be write-enabled, not readonly.
- If Upstash variables are missing, the app automatically falls back to an in-memory rate limiter for local development.

## Upstash Setup

1. Create a Redis database in the [Upstash console](https://console.upstash.com).
2. Copy the REST URL and REST token from the database details page.
3. Add both to `.env.local` for local development, and to your Vercel project's environment variables for production.

If Upstash is not configured, rate limiting still works locally via the in-memory fallback — no setup required to run the app.

## Running Locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Deployment

This app deploys cleanly to [Vercel](https://vercel.com). Set the following in your Vercel project's environment variables:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-production-domain.com
GROQ_API_KEY=your_groq_key
UPSTASH_REDIS_REST_URL=https://your-upstash-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

Redeploy after adding or updating any environment variable.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm test` | Run the test suite |

## Notes

- Prompt limit and plan behavior are centralized in `src/lib/free-plan.ts`.
- AI routes are rate-limited and cache short-lived responses to reduce duplicate calls to Groq.