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

## Project subdomains

Projects live on their own hosts but answer under `fi99.ca`. Subdomains are
independent of the apex — a CNAME on a label doesn't touch the Pages A
records in step 3, so the two can't collide, and the projects don't have to
share a host.

Both records live at Namecheap (fi99.ca runs BasicDNS —
`dns1/dns2.registrar-servers.com`) under **Advanced DNS**. Namecheap appends
the domain itself, so Host is the bare label, never the full name:

```
CNAME  ploton  80062a06e552adc6.vercel-dns-017.com.   → Vercel project `plot-on`
CNAME  write   12g3nd.github.io.                      → GitHub repo `write`
```

### ploton.fi99.ca → Vercel

Added on the `plot-on` project (team `12g3nds-projects`) under Settings →
Domains. Vercel prints the CNAME target and issues the certificate itself.

That target is account-specific. Most docs — and most older projects — show
the generic `cname.vercel-dns.com`; this account gets
`80062a06e552adc6.vercel-dns-017.com`. Always use what the dashboard prints.

Deployment Protection on the project is `all_except_custom_domains`, which
is why `ploton.fi99.ca` is public while the generated `*.vercel.app` URLs
sit behind Vercel auth. Nothing to configure — but switching it to "all"
would take the custom domain dark too.

`ploton-zeta.vercel.app` stays aliased as a fallback. It costs nothing.

### write.fi99.ca → GitHub Pages (repo `write`)

A second Pages site under the same account is fine: one site per repo, each
with its own custom domain, routed by Host header. The apex stays with this
repo. Set it in the `write` repo under Settings → Pages — Source **GitHub
Actions**, Custom domain `write.fi99.ca`.

The CNAME target is the *account* host, `12g3nd.github.io` — never the repo
name, and never the apex A records.

Three things that mislead here:

- **`12g3nd.github.io` 301s to `www.jarabana.com`**, because the user-site
  repo claims that domain. Harmless — DNS only points at GitHub's edge and
  Host routing does the rest — but it makes the Pages settings page offer
  "a domain other than `www.jarabana.com`", which reads like a misconfig
  and isn't.
- **`public/CNAME` is ignored** when publishing from an Actions workflow;
  the Settings field is the only thing that counts. This repo has no CNAME
  file either, which is why `fi99.ca` works.
- **A custom domain serves at the root**, so the app's base path must be
  root too. In `write` that means `base: '/'` in `vite.config.ts` *and*
  `pathSegmentsToKeep = 0` in the spa-github-pages `public/404.html`. Miss
  the second and the home page looks perfect while every deep link and
  refresh bounces to a broken URL. Its React Router reads
  `basename={import.meta.env.BASE_URL}`, so it follows Vite on its own.

The trade: `base: '/'` means `12g3nd.github.io/write/` no longer works. A
build only has one root.

#### When the DNS check fails but DNS is fine

GitHub caches a failed check. Save the custom domain before the CNAME
exists or propagates and Settings → Pages sits on `InvalidDNSError`
("Domain's DNS record could not be retrieved") and refuses to issue a
certificate — even once DNS is correct and the site already answers over
HTTP. Confirm DNS is genuinely fine before touching anything else:

```powershell
# authoritative answer, straight from Namecheap's nameserver
Resolve-DnsName write.fi99.ca -Server dns1.registrar-servers.com
```

```sh
curl -sI http://write.fi99.ca | head -1   # 200 = GitHub is already routing it
```

A 200 there is the tell: if GitHub serves the right repo's HTML over plain
HTTP, the DNS is correct and only the cached check is holding up the
certificate.

If both look right, click **Check again**. If it stays red, **Remove** the
custom domain, save, then re-enter it and save — that re-triggers
provisioning. Usually minutes; GitHub allows up to an hour.

`fi99.ca` has no CAA records, so nothing restricts which CA may issue. If
you ever add one, it has to include `letsencrypt.org` or Pages certificates
stop renewing.

### Adding the next one

1. Deploy the project somewhere that terminates TLS for custom domains.
2. Add the domain **on that host first** — it tells you the CNAME target.
3. Add the CNAME at Namecheap, bare label as Host.
4. Wait for the host's own check to go green, then enforce HTTPS.
5. Only then point `src/data/projects.js` at the new link — the workflow
   deploys on push to `main`, so landing it early ships a dead link.

### Domain verification is not actually on

Despite the TXT record sitting in the Namecheap panel, GitHub reports both
`fi99.ca` and `write.fi99.ca` as `protected_domain_state: "unverified"`:

```sh
gh api repos/12g3nd/FI99/pages --jq '.cname, .protected_domain_state'
```

Nothing resolves at `_github-pages-challenge-12g3nd.fi99.ca`, so that record
is not doing the job its name suggests. Practically this means the domain is
unprotected: an unused `*.fi99.ca` label could be claimed on Pages by
someone else's repo.

Before fixing that, know the trade-off. Verification restricts publishing to
repos **owned by the verifying account**, and it covers immediate subdomains.
So verifying `fi99.ca` under `12g3nd` would lock out any subdomain served
from a collaborator's own repo — `wattsleft.fi99.ca` from
`OmarBadawy07/watts-left`, for instance. The ways out are to keep such a
project on a host where Pages verification has no say (Vercel, Cloudflare),
or to move the repo under `12g3nd`. Verification also stops one level down:
`a.b.fi99.ca` stays unprotected either way.

## Trade-offs vs Vercel (for the record)

- No per-branch preview deployments (Actions can be extended to do it, but
  it's not built in).
- DNS is static IPs, no managed nameserver option.
- Deploys are a minute or two slower (full Actions run per push).

None of these matter for a static studio site. If previews ever matter,
the site deploys to Vercel unchanged: import the repo at vercel.com/new
(framework preset Astro, output `dist`) and follow the domain prompts.
