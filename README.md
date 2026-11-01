# Mario's Test Automation Playground

A free website built for practising test automation. Point Selenium, Playwright, Cypress, WebdriverIO, Postman, REST Assured or any other tool at it and work through realistic scenarios, from a first login test to full end-to-end and API suites.

Every practice page lists its exercises, each with a difficulty tag (green = beginner, amber = intermediate, red = advanced), an **Expected** box describing exactly what your test should verify, and a **Show me how** button with a commented TypeScript + Playwright solution. Solutions are kept out of the page until opened, so their text never interferes with your locators.

**Live site:** https://testautomation.marionobre.com/

## Why use it

- **Stable locators.** Every interactive element has an `id` and/or a `data-testid`, so you can focus on test design instead of fighting selectors. (A few elements are deliberately harder; those are called out below.)
- **Deterministic data.** The tables and API start from the same seed data every time, so assertions don't drift.
- **Realistic problems.** Delays, spinners, disabled states, overlays, iframes, shadow DOM and browser dialogs: the things that make real suites flaky.
- **No sign-up.** Everything is public. The practice account is `practice` / `SuperSecret123`.

## Practice areas

### Login (`login.html` → `secure.html`)

| Scenario | What happens |
| --- | --- |
| Valid login | Redirects to the secure area with "You logged into a secure area!" |
| Wrong username / password | Inline error in `[data-testid="flash"]` |
| Empty fields | "Username and password are required." |
| Three wrong passwords | Account locked for 30 seconds |
| "Remember me" | Username is pre-filled on the next visit |
| Open `secure.html` directly | Redirected back to login with an error |
| Log out | Back to login with a confirmation message |

**Try:** a data-driven test over valid and invalid credentials; a test for the lockout and its recovery.

### Forms (`forms.html`)

A registration form with text, email, phone, password, number, date, select, multi-select, radios, checkboxes, range slider, colour picker, file upload, a textarea with a live character counter and a terms checkbox. Submitting shows field-level errors, or a JSON summary of everything entered in `[data-testid="form-result"]`.

**Try:** fill every field type with your tool's API; assert each validation message; upload a file larger than 1 MB.

### Tables (`tables.html`)

47 employees with sorting on every column, a free-text filter, a department filter, page sizes of 5/10/25/50, inline salary editing, delete with a `confirm()` dialog, and a salary total that updates with the filter. Rows are `[data-testid="row-<id>"]` and cells carry `data-col="<column>"`.

**Try:** assert sort order across pages; read the whole table into a data structure; edit a salary and check the total.

### Dynamic content (`dynamic.html`)

Nine scenarios that each need a different waiting strategy:

1. An element that appears after a random 2–5 second load
2. Hidden with CSS vs removed from the DOM
3. An input that is enabled after an async call
4. Adding and removing elements
5. A button whose `id` changes on every page load (locate it another way)
6. A progress bar you have to stop at 75%
7. A status that goes Pending → Processing → Done
8. A button covered by an overlay for 3 seconds
9. "Load more" in batches until there's nothing left

**Try:** solve every one without a fixed sleep.

### Interactions (`interactions.html`)

JavaScript `alert`, `confirm` and `prompt`; an in-page modal; HTML5 drag and drop; a hover menu; double-click; a custom right-click menu; key press detection with modifiers; a form inside an iframe; links that open a new tab and a popup window; and a component inside an open **shadow root**.

**Try:** accept and dismiss each dialog; drag all tools into "Selected"; switch into the iframe and back; reach into the shadow DOM.

### Shop (`shop.html`)

A small end-to-end flow: search, filter by category, sort by price, add to cart (one product is out of stock and stock limits apply), change quantities, apply promo codes `SAVE10` or `HALFPRICE`, choose shipping and check out. The cart survives reloads. Postal codes must look like `1000-001`.

**Try:** a complete purchase that asserts the subtotal, discount, shipping and order total; an invalid promo code; checkout validation.

### Nightmare mode (`nightmare.html`)

Ten levels designed to be as hard to automate as possible, with **no solutions**. The page has no `id` or `data-testid` attributes (even the shared header loses them), class names are random on every load, and the levels sit in a shuffled order in the DOM while CSS shows them in sequence. Expect text drawn by CSS and canvas, look-alike Unicode letters, zero-width characters, buttons covered by glass or running from the mouse, a closed shadow root, a list that re-renders every 700 ms, a button that ignores early clicks, nested frames, a timed key sequence and a home-made slider. A cookie wall, a recurring newsletter popup, a chat bubble and a one-off `alert()` interrupt at random times. Every level is solvable by automation. Nothing is stored or tracked.

### Light and dark mode

Pages follow the visitor's system setting until the header toggle (`[data-testid="theme-toggle"]`) is clicked. The choice is stored in `localStorage` under `theme` and shown as `<html data-theme="light|dark">`, which is useful for visual regression or theme-switching tests.

## REST API

The API lives at `/api`, and `api.html` has a page where you can try requests in the browser.

- Reads are public. Writes need a bearer token from `POST /api/auth/login` with `{"username":"practice","password":"SuperSecret123"}`.
- Send an `X-Sandbox-Id: <your-name>` header to get **your own private data set**, so other people's tests never affect yours. Without it you share the `public` sandbox.
- Every sandbox resets to 12 seed users an hour after it was created, or immediately with `POST /api/reset`.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| POST | `/api/auth/login` | Returns `{ "token": "...", "tokenType": "Bearer" }`; 401 on bad credentials |
| GET | `/api/users?page=1&limit=6&search=qa` | Paginated and searchable |
| GET | `/api/users/{id}` | 404 if missing |
| POST | `/api/users` | `name` and `email` required → 201; 409 duplicate email; 422 invalid input |
| PUT / PATCH | `/api/users/{id}` | Replace / partially update |
| DELETE | `/api/users/{id}` | 204 |
| POST | `/api/reset` | Restore your sandbox's seed data |
| GET | `/api/status/{code}` | Responds with any status from 200 to 599 |
| GET | `/api/delay/{seconds}` | Slow response, up to 10 seconds |
| ANY | `/api/echo` | Returns the method, query, headers and body you sent |

```bash
curl -X POST https://testautomation.marionobre.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"practice","password":"SuperSecret123"}'
```

**Try:** a full create → read → update → delete chain; contract tests on the error bodies; a timeout test against `/api/delay/5`.

## Run it locally

The site is plain HTML, CSS and JavaScript with no build step. On Windows, with nothing to install:

```bash
powershell -ExecutionPolicy Bypass -File scripts/serve.ps1
```

Then open http://localhost:8080/. The API needs PHP, so locally `/api/*` returns 501. To run the API too, use any PHP 7.4+ server from the `public` folder (Apache with `.htaccess` enabled matches production).

## Project structure

```
public/                 the website (deployed as-is)
  *.html                one page per practice area
  assets/style.css      shared styles and light/dark colour tokens
  assets/theme.js       applies the saved theme before the page draws
  assets/nightmare.js   builds the nightmare page and its levels at runtime
  assets/app.js         shared header, footer, helpers and "Show me how" code rendering
  assets/favicon.svg    site icon
  api/index.php         REST API router (PHP 7.4+)
  api/.htaccess         routes /api/* to index.php and blocks the data folder
scripts/serve.ps1       local preview server
docs/DEPLOYMENT.md      how the site is deployed
```

## Contributing

Ideas for new practice scenarios are welcome. Keep new pages in the same style: every interactive element gets a stable `data-testid`, behaviour is deterministic unless randomness is the point of the exercise, and anything deliberately tricky is described on the page.
