# Deployment

The contents of `public/` are uploaded over FTPS to a cPanel host. There are two ways to do it: automatically from GitHub Actions on every push, or from your own machine every time you save a file.

## cPanel setup (once)

1. **Domains → Create A New Domain:** add the subdomain (e.g. `testautomation.example.com`). Untick **Share document root** so it gets its own folder, e.g. `/home/<user>/testautomation.example.com`.
2. **FTP Accounts:** create an account whose **Directory** is exactly that folder. Uploads can then never touch any other site on the account.
3. **DNS:** if cPanel manages your DNS, the subdomain works straight away. If DNS is at Cloudflare (or elsewhere), add an **A record** for the subdomain pointing at your server's IP (cPanel → General Information → Shared IP Address). Proxied is fine for the website; use SSL/TLS mode **Full**.
4. **FTP host name:** use your server's real hostname (it's in the cPanel URL, e.g. `server123.yourhost.com`). `ftp.yourdomain.com` only works if that DNS record exists and is *not* proxied, since Cloudflare's proxy can't carry FTP.

## Option A: GitHub Actions (recommended)

`.github/workflows/deploy.yml` runs on every push to `main` (and manually from the **Actions** tab). It checks the PHP for syntax errors, uploads only the files that changed, then fetches the home page and `/api/health` on the live site.

Repository **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `FTP_SERVER` | server hostname, no `ftp://` or port |
| Secret | `FTP_USERNAME` | the folder-scoped FTP account |
| Secret | `FTP_PASSWORD` | its password |
| Variable | `SITE_URL` | e.g. `https://testautomation.example.com` (enables the post-deploy check) |
| Variable | `FTP_SERVER_DIR` | optional; defaults to `./`, the FTP account's own folder |

The action stores `.ftp-deploy-sync-state.json` on the server to know what changed. Deleting it forces a full re-upload.

## Option B: deploy on save (Windows)

`scripts/watch-deploy.ps1` watches `public/` and uploads each file as soon as you save it (and deletes files you delete). It needs only Windows PowerShell.

1. Copy `deploy.config.example.json` to `deploy.config.json` and fill in host, username and password. This file is git-ignored; never commit it.
2. Run it and leave it open while you work. `-Full` uploads everything once first.

```bash
powershell -ExecutionPolicy Bypass -File scripts/watch-deploy.ps1 -Full
```

If you see a certificate error, `host` doesn't match the certificate your server presents. Use the server's own hostname rather than setting `ignoreCertErrors`.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `getaddrinfo ENOTFOUND` | `FTP_SERVER` isn't a real hostname: a typo, a prefix, or an `ftp.` record that doesn't exist |
| `530 Login authentication failed` | Wrong FTP username or password |
| Subdomain shows the main site | The subdomain still shares `public_html`; give it its own document root |
| Post-deploy check fails but the upload passed | DNS for the subdomain is missing or still propagating |
