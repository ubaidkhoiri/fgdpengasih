# AGENTS.md

## Git

- Atomic commit. Satu perubahan logis per commit, pesan Bahasa Indonesia.
- Setiap ada perubahan wajib commit lokal.
- Push hanya jika user minta. Tanpa perintah eksplisit, jangan push.
- Jangan force push.

## Deploy

- Push ke `main` picu `.github/workflows/deploy.yml`. Urutan. `npm ci`, regen `wrangler types`, `npm run build`, `npx wrangler deploy`.
- Secret di GitHub repo Settings lalu Secrets and variables lalu Actions. `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID`.

## Local dev

- `npm run dev` untuk jalan lokal di `http://localhost:5173`.
- Jangan nilai build lokal saat dev server jalan karena lock folder `.svelte-kit`. CI yang verifikasi build.
