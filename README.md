# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.17.1 create --template minimal --types ts --add sveltekit-adapter="adapter:cloudflare+cfTarget:workers" --no-download-check --install npm C:/Users/ubdd/_code/fgdpengasih
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Deploy

`.github/workflows/deploy.yml` deploys on every push to `main`. For it to work:

1. Push this repo to GitHub.
2. Create a Cloudflare API token with Workers permissions (edit templates: "Edit Cloudflare Workers").
3. In GitHub repo Settings → Secrets and variables → Actions, add:
   - `CLOUDFLARE_API_TOKEN` — the API token
   - `CLOUDFLARE_ACCOUNT_ID` — your Cloudflare account ID
