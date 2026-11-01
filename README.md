# Test Automation Playground

A public website for practising UI and API test automation (Selenium, Playwright, Cypress, WebdriverIO, Postman, REST Assured…). Plain HTML/CSS/JS plus a small PHP API, so it runs on any cPanel host with no build step.

| Page | What it practises |
| --- | --- |
| `login.html` → `secure.html` | Valid/invalid login, error messages, lockout after 3 failures, logout, protected page redirect |
| `forms.html` | Every input type, validation messages, file upload, JSON result |
| `tables.html` | Sorting, filtering, pagination, inline edit, delete with `confirm()` |
| `dynamic.html` | Explicit waits: delayed elements, hidden vs removed, enable/disable, random IDs, progress bar, overlay |
| `interactions.html` | alert/confirm/prompt, modal, drag & drop, hover, double/right click, keys, iframe, new tab/popup, shadow DOM |
| `shop.html` | End-to-end: search, cart, quantities, promo code `SAVE10`, checkout, order number |
| `api.html` + `/api/*` | REST CRUD with bearer auth, per-user sandboxes, status codes, delays, echo |

Every element has an `id` and/or `data-testid`. Practice login: `practice` / `SuperSecret123`.

## Layout

```
public/            ← everything here is uploaded to the web root (public_html)
  api/index.php    ← API router (PHP 7.4+); data lives in api/data/ (created at runtime, not deployed)
scripts/serve.ps1         local preview server
scripts/watch-deploy.ps1  upload-on-save to cPanel
.github/workflows/deploy.yml  deploy on push to main
```

## Preview locally

```bash
powershell -ExecutionPolicy Bypass -File scripts/serve.ps1
```

Open http://localhost:8080/. The API only works once deployed (PHP runs on the server).

## cPanel: create an FTP account

1. cPanel → **FTP Accounts** → create e.g. `deploy@yourdomain.com`.
2. Set its **Directory** to `public_html` (or a subdomain folder). The account then sees that folder as `/`.
3. Note the FTP server name shown under **Configure FTP Client** (often `ftp.yourdomain.com`).

## Option A: deploy on every save

1. Copy `deploy.config.example.json` to `deploy.config.json` and fill in host, username and password. It's in `.gitignore`.
2. Run, and leave it running while you edit:

```bash
powershell -ExecutionPolicy Bypass -File scripts/watch-deploy.ps1 -Full
```

`-Full` uploads everything once first; drop it afterwards to only push changes. Deleted files are deleted on the server too. If you get a certificate error, your host presents a certificate for its own hostname: either use that hostname as `host`, or set `"ignoreCertErrors": true`.

## Option B: deploy from GitHub Actions

1. Install Git, create a GitHub repo and push this folder to its `main` branch.
2. In the repo, **Settings → Secrets and variables → Actions**:
   - Secrets: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
   - Variables (optional): `FTP_SERVER_DIR` (default `./`, which is right when the FTP account is rooted at public_html as above; use `public_html/` if you log in with your main cPanel account), `SITE_URL` (e.g. `https://playground.yourdomain.com`) to run a smoke test after deploy.
3. Every push to `main` lints the PHP and uploads only the changed files. You can also run it manually from the **Actions** tab.

Use one option per environment, or both: Actions for the real site, watch-deploy for a staging subdomain.
