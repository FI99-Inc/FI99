# Deploying fi99.ca to GitHub Pages

The site is fully static (`astro build` → `dist/`), so GitHub Pages can host
it directly — no Vercel involved. The workflow at
`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

> Note: GitHub Pages is free for **public** repos. A private repo needs a
> paid GitHub plan for Pages.

## 1. Push the repo

Create a repo on GitHub and push:

```sh
git remote add origin git@github.com:YOUR_USER/fi99.git
git push -u origin main
```

The push triggers the deploy workflow. It will fail its deploy step until
Pages is enabled — that's expected; do step 2 and re-run it (or push again).

## 2. Enable GitHub Pages

Repo → **Settings → Pages**:

- Under **Build and deployment → Source**, choose **GitHub Actions**.

That's it — the checked-in workflow handles install, build, and publish.

## 3. Point fi99.ca at GitHub

### DNS records (at your registrar)

For the apex domain, add four **A** records on `@`:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Optionally add the matching **AAAA** records for IPv6:

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

For `www`, add a **CNAME** record pointing to `YOUR_USER.github.io`
(your GitHub username/org, not the repo name).

Check GitHub's current docs if anything looks off — these IPs are
GitHub's published Pages addresses as of mid-2026.

### Tell GitHub about the domain

Repo → **Settings → Pages → Custom domain**: enter `fi99.ca` and save.
GitHub runs a DNS check, then provisions a TLS certificate. Once it's
issued, tick **Enforce HTTPS**.

Also strongly recommended: **profile Settings → Pages → Add a verified
domain** for `fi99.ca`. This proves domain ownership account-wide and
prevents anyone else from claiming the domain on Pages if the repo is ever
deleted or renamed.

`www.fi99.ca` will redirect to the apex automatically once both records
exist and the custom domain is set.

## 4. Post-deploy checklist

- `https://fi99.ca/` renders; `www.fi99.ca` redirects to apex; HTTPS enforced
- `https://fi99.ca/sitemap-index.xml` and `/robots.txt` resolve
- The 404 page works: visit any bogus path (Pages serves Astro's `404.html`)
- Paste a page URL into an OG debugger (e.g. opengraph.xyz) — the 1200×630
  card with the wordmark should appear
- All `// TODO(fi99):` placeholders replaced before announcing:
  `grep -rn "TODO(fi99)" src/`

## Trade-offs vs Vercel (for the record)

- No per-branch preview deployments (Actions can be extended to do it, but
  it's not built in).
- DNS is static IPs, no managed nameserver option.
- Deploys are a minute or two slower (full Actions run per push).

None of these matter for a static studio site. If previews ever matter,
the site deploys to Vercel unchanged: import the repo at vercel.com/new
(framework preset Astro, output `dist`) and follow the domain prompts.
