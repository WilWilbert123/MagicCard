# Enterprise Employee ID Card Platform - System Architecture

## Architecture Overview
The platform connects multi-branch HR administrators, fleet touchscreen KIOSK terminals, and physical MagicCard card printers backed by Supabase (PostgreSQL, Auth, Storage, Realtime, and RLS).

```
                         CLOUDFLARE (WAF / Edge SSL)
                                     |
                                     v
                          VERCEL (Edge Network)
                                     |
                                     v
                    ┌──────────────────────────────────┐
                    │          NEXT.JS 15+             │
                    │  ├── HR Portal (/hr/*)           │
                    │  ├── Touchscreen KIOSK (/kiosk)  │
                    │  └── Edge & Node Server APIs     │
                    └────────┬─────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            v                                 v
┌───────────────────────────┐     ┌────────────────────────────┐
│      SUPABASE CLOUD       │     │     BRANCH KIOSK STATION   │
│ ├── PostgreSQL (RLS)      │     │ ├── Chromium Kiosk Browser │
│ ├── Supabase Auth         │     │ ├── Local Agent (:7125)    │
│ ├── Supabase Storage      │     │ ├── MagicCard Trust ID     │
│ └── Realtime Channels     │     │ └── Magicard 300 Duo       │
└───────────────────────────┘     └────────────────────────────┘
```

## Key Architectural Decisions
1. **Single Source of Truth**: The `CardTemplateJSON` schema in `packages/card-engine` defines both front and back surfaces, dynamic bindings, and physical CR80 dimensions.
2. **Local KIOSK Agent**: Browser code NEVER talks directly to hardware drivers. The standalone daemon runs on loopback port `7125` using authenticated HMAC headers.
3. **Idempotent Print Pipeline**: Every job requires a UUID `idempotencyKey`, preventing double-prints if an operator or employee presses PRINT multiple times.
4. **Immutable Template Publishing**: Published templates cannot be overwritten destructively. A new version row is committed with SHA-256 checksums, and fleet KIOSKs synchronize automatically.
