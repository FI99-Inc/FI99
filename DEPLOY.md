# Deploying fi99.ca to Vercel

The site is fully static (`astro build` → `dist/`). No adapter, no server
functions, no environment variables.

## 1. Push the repo

Create a repo on GitHub (or GitLab/Bitbucket) and push:

```sh
git remote add origin git@github.com:YOUR_ORG/fi99.git
git push -u origin main
```

## 2. Create the Vercel project

Either import in the dashboard or use the CLI.

**Dashboard:** [vercel.com/new](https://vercel.com/new) → import the repo.
Vercel auto-detects Astro. Confirm:

- Framework preset: **Astro**
- Build command: `npm run build`
- Output directory: `dist`

**CLI:**

```sh
npm i -g vercel
vercel          # link + preview deploy, accept the detected Astro defaults
vercel --prod   # production deploy
```

Every push to `main` now deploys to production; every other branch gets a
preview URL.

## 3. Point fi99.ca at Vercel

In the Vercel dashboard: **Project → Settings → Domains → Add** → enter
`fi99.ca`. Also add `www.fi99.ca` and set it to redirect to the apex.

Vercel then shows the DNS records it wants. Two routes — pick one:

### Option A — keep your current registrar's DNS (A/CNAME)

At your registrar (where fi99.ca is registered), add the records exactly as
shown on the project's Domains screen — do not copy values from docs or
memory, the dashboard is the source of truth. As of Vercel's current docs
these are typically:

| Type  | Name | Value                  |
| ----- | ---- | ---------------------- |
| A     | `@`  | `216.198.79.1`         |
| CNAME | `www`| `<the cname shown in the dashboard>` |

### Option B — hand DNS to Vercel (nameservers)

On the same Domains screen choose the **Vercel nameservers** option, then at
your registrar replace the nameservers with the two Vercel shows you
(currently `ns1.vercel-dns.com` and `ns2.vercel-dns.com`). Simplest
long-term: Vercel manages records and certificates automatically.

Either way, wait for DNS to propagate (minutes to a few hours). Vercel
issues the TLS certificate automatically once the domain verifies.

## 4. Post-deploy checklist

- `https://fi99.ca/` renders, `www.fi99.ca` redirects to apex
- `https://fi99.ca/sitemap-index.xml` and `/robots.txt` resolve
- Paste a page URL into an OG debugger (e.g. opengraph.xyz) — the 1200×630
  card with the wordmark should appear
- All `// TODO(fi99):` placeholders replaced before announcing:
  `grep -rn "TODO(fi99)" src/`
