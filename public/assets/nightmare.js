// Nightmare mode: deliberately hostile to automation. No ids, no test ids,
// random class names, text drawn by CSS or canvas, covered and moving buttons,
// closed shadow roots, nested frames and popups that interrupt at random.
// Every level is still solvable by automation; working out how is the exercise.
(function () {
  'use strict';

  const main = document.querySelector('main');
  const rnd = (n) => Math.floor(Math.random() * n);
  const between = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[rnd(list.length)];
  const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  // Class names are random on every load, so they can't be used as selectors.
  const usedNames = new Set();
  const cls = () => {
    let name;
    do { name = String.fromCharCode(97 + rnd(26)) + Math.random().toString(36).slice(2, 7); } while (usedNames.has(name));
    usedNames.add(name);
    return name;
  };
  const sheet = document.createElement('style');
  document.head.append(sheet);
  const css = (text) => sheet.append(text + '\n');

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };
  // Text drawn with ::before never exists in the DOM, so text locators can't see it.
  const ghostText = (node, text) => {
    const name = cls();
    node.classList.add(name);
    css(`.${name}::before{content:${JSON.stringify(text)}}`);
  };
  // A div that behaves like a button for people (click, Enter, Space) but has no role.
  const fakeButton = (className, label, onPress) => {
    const node = make('div', className);
    node.tabIndex = 0;
    ghostText(node, label);
    node.addEventListener('click', onPress);
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); }
    });
    return node;
  };

  const C = {
    lead: cls(), progress: cls(), wrap: cls(), card: cls(), locked: cls(), done: cls(), head: cls(),
    state: cls(), goal: cls(), status: cls(), btn: cls(), quiet: cls(), shake: cls(), banner: cls(), veil: cls(),
  };
  css(`.${C.lead}{color:var(--muted);margin:0 0 8px}`);
  css(`.${C.progress}{font-weight:600;margin:0 0 20px}`);
  css(`.${C.wrap}{display:flex;flex-direction:column;gap:16px}`);
  css(`.${C.card}{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px;position:relative}`);
  css(`.${C.locked}{opacity:.35;filter:blur(1.5px);user-select:none}`);
  css(`.${C.done}{border-color:var(--ok)}`);
  css(`.${C.head}{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}`);
  css(`.${C.head} h2{margin:0;font-size:1.1rem}`);
  css(`.${C.state}{font-size:.8rem;font-weight:700;color:var(--muted)}`);
  css(`.${C.goal}{color:var(--muted);margin:0 0 12px}`);
  css(`.${C.status}{min-height:1.4em;margin-top:10px;font-size:.9rem;color:var(--muted)}`);
  css(`.${C.btn}{display:inline-block;font:inherit;font-weight:600;cursor:pointer;padding:8px 16px;border-radius:6px;border:1px solid var(--accent);background:var(--accent);color:var(--accent-text);user-select:none}`);
  css(`.${C.quiet}{background:var(--surface-2);color:var(--text);border-color:var(--border)}`);
  css(`.${C.shake}{animation:${C.shake} .3s}`);
  css(`@keyframes ${C.shake}{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`);
  css(`.${C.banner}{background:var(--ok-bg);color:var(--ok);font-weight:700;padding:14px 18px;border-radius:8px;margin:0 0 20px}`);
  css(`.${C.veil}{position:fixed;inset:0;display:flex;justify-content:center;padding:16px}`);

  const title = make('h1', null, 'Nightmare mode');
  const lead = make('p', C.lead, 'No ids. No test ids. No solutions. Class names, text, positions and timings change on every load, popups interrupt you, and buttons hide behind, move away from or pretend to be other things. Every level can be beaten by automation: working out how is the challenge.');
  const rules = make('p', C.lead, 'Levels unlock one at a time. Reload the page to start over with a fresh set of surprises.');
  const progress = make('p', C.progress);
  const wrap = make('div', C.wrap);
  main.append(title, lead, rules, progress, wrap);

  // ---- Level framework ----------------------------------------------------
  const levels = [];
  const level = (name, goal, build) => levels.push({ name, goal, build, starts: [], stops: [] });
  let solved = 0;
  let finished = false;
  const startedAt = Date.now();

  // ---- 1. Text that isn't in the DOM, with look-alike decoys ---------------
  level('Ghost text', 'Click the button that says <strong>Begin</strong>.', (body, api) => {
    // Cyrillic е/В/і and a dotless ı look identical to Latin letters.
    const labels = shuffle(['Begin', 'Bеgin', 'Begın', 'Begin!', 'Вegin', 'Bеgіn']);
    const row = make('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px';
    labels.forEach((label) => row.append(fakeButton(C.btn, label, () => (label === 'Begin' ? api.win() : api.fail('Look closer.')))));
    body.append(row);
  });

  // ---- 2. The real button is under a pane of glass that catches clicks ----
  level('Under glass', 'Press the <strong>Next</strong> button that is hiding under the glass.', (body, api) => {
    const row = make('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;align-items:center';
    const real = rnd(3);
    for (let i = 0; i < 3; i++) {
      const holder = make('div');
      holder.style.cssText = 'position:relative;padding:10px';
      const button = make('button', C.btn, 'Next');
      // Every button gets glass so they all look the same; only the real one's glass blocks the mouse.
      const glass = make('div');
      glass.style.cssText = `position:absolute;inset:0;z-index:2;border-radius:8px;background:rgba(127,127,127,.04);pointer-events:${i === real ? 'auto' : 'none'}`;
      if (i === real) {
        button.addEventListener('click', () => api.win());
        glass.addEventListener('click', () => api.fail('You clicked the glass.'));
      } else {
        button.addEventListener('click', () => api.fail('That one is a fake.'));
      }
      holder.append(button, glass);
      row.append(holder);
    }
    body.append(row);
  });

  // ---- 3. A button that runs away from the mouse ---------------------------
  level('Runaway', 'Press <strong>Catch me</strong>.', (body, api) => {
    const arena = make('div');
    arena.style.cssText = 'position:relative;height:180px;border:1px dashed var(--border);border-radius:8px;overflow:hidden';
    const button = make('button', C.btn, 'Catch me');
    button.style.cssText = 'position:absolute;left:10px;top:10px;transition:left .08s,top .08s';
    const jump = () => {
      button.style.left = between(0, Math.max(0, arena.clientWidth - button.offsetWidth - 2)) + 'px';
      button.style.top = between(0, Math.max(0, arena.clientHeight - button.offsetHeight - 2)) + 'px';
    };
    button.addEventListener('pointerenter', jump);
    button.addEventListener('click', () => api.win());
    arena.append(button);
    body.append(arena);
    let timer;
    api.onStart(() => { jump(); timer = setInterval(jump, 1200); });
    api.onStop(() => { clearInterval(timer); button.removeEventListener('pointerenter', jump); });
  });

  // ---- 4. Scrambled letters and an input inside a closed shadow root ------
  level('Secret word', 'Type the secret word shown below into the box and press Enter.', (body, api) => {
    const word = pick(['mushroom', 'locator', 'timeout', 'selector', 'flaky', 'fixture', 'headless', 'viewport']);
    const display = make('div');
    display.style.cssText = 'position:relative;display:flex;gap:2px;font:700 1.6rem var(--mono);letter-spacing:2px;margin-bottom:12px';
    // DOM order is shuffled and CSS "order" puts the letters back for the eye...
    const letters = [...word].map((ch, i) => { const s = make('span', null, ch); s.style.order = i; return s; });
    // ...and invisible extra letters pollute textContent and innerText.
    const junk = Array.from({ length: 4 }, () => {
      const s = make('span', null, pick([...'abcdefghijklmnopqrstuvwxyz']));
      s.style.cssText = 'position:absolute;font-size:0';
      return s;
    });
    shuffle([...letters, ...junk]).forEach((s) => display.append(s));

    // A closed shadow root: page.locator() and querySelector can't reach inside.
    const host = make('div');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = '<style>input{font:inherit;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text);width:min(260px,100%)}</style><input autocomplete="off" spellcheck="false">';
    root.querySelector('input').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      if (e.target.value.trim().toLowerCase() === word) api.win();
      else api.fail('Nope.');
    });
    body.append(display, host);
  });

  // ---- 5. Buttons painted on a canvas --------------------------------------
  level('Painted buttons', 'Click <strong>GO</strong>.', (body, api) => {
    const canvas = make('canvas');
    canvas.width = 480;
    canvas.height = 150;
    canvas.style.cssText = 'max-width:100%;border:1px solid var(--border);border-radius:8px;cursor:pointer;background:var(--surface-2)';
    const labels = shuffle(['GO', 'G0', 'NO', 'STOP']); // "G0" uses a zero
    const colours = shuffle(['#1f7a4d', '#b42318', '#8a5a00', '#2f5bd3']);
    const slots = shuffle([0, 1, 2, 3]);
    const boxes = labels.map((label, i) => ({ label, x: 20 + slots[i] * 115 + rnd(10), y: 25 + rnd(50), w: 95, h: 50, colour: colours[i] }));
    const ctx = canvas.getContext('2d');
    boxes.forEach((b) => {
      ctx.fillStyle = b.colour;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#fff';
      ctx.font = '700 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    });
    canvas.addEventListener('click', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) * canvas.width) / r.width;
      const y = ((e.clientY - r.top) * canvas.height) / r.height;
      const hit = boxes.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
      if (!hit) api.fail('That was just paint.');
      else if (hit.label === 'GO') api.win();
      else api.fail('Wrong button.');
    });
    body.append(canvas);
  });

  // ---- 6. A list that re-renders constantly, with hidden characters --------
  level('Shuffling shelf', '', (body, api) => {
    const fruits = shuffle(['Apple', 'Banana', 'Cherry', 'Damson', 'Elderberry', 'Fig', 'Guava', 'Kiwi', 'Lychee', 'Mango', 'Papaya', 'Quince']).slice(0, 8);
    const target = pick(fruits);
    api.goal(`Click <strong>${target}</strong>.`);
    const list = make('ul');
    list.style.cssText = 'list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px';
    // A zero-width space somewhere in each word breaks exact text matching.
    const hide = (s) => { const at = 1 + rnd(s.length - 1); return s.slice(0, at) + '​' + s.slice(at); };
    const render = () => {
      list.replaceChildren(...shuffle(fruits).map((fruit) => {
        const item = make('li', `${C.btn} ${C.quiet}`, hide(fruit));
        item.addEventListener('click', () => (fruit === target ? api.win() : api.fail('Wrong fruit.')));
        return item;
      }));
    };
    render();
    const timer = setInterval(render, 700); // every element is replaced, so held references go stale
    api.onStop(() => clearInterval(timer));
    body.append(list);
  });

  // ---- 7. A button that ignores clicks until it has "hydrated" -------------
  level('Sleepy button', 'Press <strong>Confirm</strong>. It only listens once it has woken up.', (body, api) => {
    const button = make('button', C.btn, 'Confirm');
    button.style.cursor = 'wait';
    let awake = false;
    let timer;
    const snooze = (ms) => {
      clearTimeout(timer);
      awake = false;
      button.style.cursor = 'wait';
      timer = setTimeout(() => { awake = true; button.style.cursor = 'pointer'; }, ms);
    };
    // Clicking too early silently pushes the wake-up time back.
    button.addEventListener('click', () => (awake ? api.win() : snooze(between(2000, 4000))));
    api.onStart(() => snooze(between(2000, 6000)));
    api.onStop(() => clearTimeout(timer));
    body.append(button);
  });

  // ---- 8. A frame inside a frame, with a decoy -----------------------------
  level('Frame inside a frame', 'Prove you are human: tick the right box, two frames deep.', (body, api) => {
    const k = { b: cls(), x: cls() };
    const style = `<style>body{font:15px system-ui,sans-serif;margin:8px;color:#1d1d1b;background:#f7f7f5}iframe{border:1px solid #ccc;width:100%;height:64px;margin-top:6px;background:#fff}.${k.b}{display:inline-flex;gap:8px;align-items:center;cursor:pointer;user-select:none}.${k.x}{width:18px;height:18px;border:2px solid #555;border-radius:3px;display:inline-flex;align-items:center;justify-content:center}</style>`;
    const box = (text, ok) => `${style}<span class="${k.b}" onclick="this.firstChild.textContent='✓';parent.parent.postMessage({nightmare:'frames',ok:${ok}},'*')"><span class="${k.x}"></span>${text}</span>`;
    const attr = (html) => html.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const order = shuffle([['I am definitely a human', true], ['I am a robot, beep boop', false]]);
    const outer = `${style}<p>Somewhere in here…</p>${order.map(([text, ok]) => `<iframe srcdoc="${attr(box(text, ok))}"></iframe>`).join('')}`;
    const frame = make('iframe');
    frame.srcdoc = outer;
    frame.style.cssText = 'width:100%;height:210px;border:1px solid var(--border);border-radius:8px;background:#f7f7f5';
    const onMessage = (e) => {
      if (!e.data || e.data.nightmare !== 'frames') return;
      if (e.data.ok) api.win(); else api.fail('Beep boop. Wrong frame.');
    };
    window.addEventListener('message', onMessage);
    api.onStop(() => window.removeEventListener('message', onMessage));
    body.append(frame);
  });

  // ---- 9. A timed key sequence drawn with CSS ------------------------------
  level('Simon says', 'Press <strong>Start</strong>, then press the arrow keys shown, in order, within 5 seconds.', (body, api) => {
    const arrows = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
    const show = make('div');
    show.style.cssText = 'display:flex;gap:12px;font-size:2rem;margin-top:12px;min-height:2.6rem';
    let sequence = [];
    let position = 0;
    let timer;
    const reset = (message) => { sequence = []; show.replaceChildren(); clearTimeout(timer); api.fail(message); };
    const begin = () => {
      sequence = Array.from({ length: 5 }, () => pick(Object.keys(arrows)));
      position = 0;
      show.replaceChildren(...sequence.map((key) => { const s = make('span'); ghostText(s, arrows[key]); return s; }));
      clearTimeout(timer);
      timer = setTimeout(() => reset('Too slow.'), 5000);
      api.say('');
    };
    const onKey = (e) => {
      if (!api.active() || !sequence.length || !(e.key in arrows)) return;
      e.preventDefault();
      if (e.key !== sequence[position]) return reset('Wrong key. Press Start again.');
      show.children[position].style.opacity = '.3';
      position++;
      if (position === sequence.length) { clearTimeout(timer); api.win(); }
    };
    document.addEventListener('keydown', onKey);
    api.onStop(() => { document.removeEventListener('keydown', onKey); clearTimeout(timer); });
    body.append(fakeButton(C.btn, 'Start', begin), show);
  });

  // ---- 10. A home-made slider with no role and a hidden value --------------
  level('Exactly 42', 'Set the slider to exactly <strong>42</strong>, then press <strong>Lock in</strong>.', (body, api) => {
    const track = make('div');
    track.style.cssText = 'position:relative;height:8px;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;max-width:420px;margin:34px 10px 18px';
    const thumb = make('div');
    thumb.tabIndex = 0;
    thumb.style.cssText = 'position:absolute;top:50%;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:var(--accent);cursor:grab;touch-action:none';
    // The value is only visible while dragging or using the keyboard.
    const tip = make('div');
    tip.style.cssText = 'position:absolute;bottom:26px;left:50%;transform:translateX(-50%);font:600 .8rem var(--mono);background:var(--text);color:var(--bg);padding:1px 6px;border-radius:4px;display:none;pointer-events:none';
    thumb.append(tip);
    track.append(thumb);
    let value = 0;
    const set = (v) => { value = Math.max(0, Math.min(100, Math.round(v))); thumb.style.left = value + '%'; tip.textContent = value; };
    set(pick([3, 17, 61, 88, 95]));
    let dragging = false;
    thumb.addEventListener('pointerdown', (e) => { dragging = true; thumb.setPointerCapture(e.pointerId); tip.style.display = 'block'; });
    thumb.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const r = track.getBoundingClientRect();
      set(((e.clientX - r.left) / r.width) * 100);
    });
    thumb.addEventListener('pointerup', () => { dragging = false; tip.style.display = 'none'; });
    thumb.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      set(value + step);
      tip.style.display = 'block';
    });
    thumb.addEventListener('blur', () => { tip.style.display = 'none'; });
    body.append(track, fakeButton(C.btn, 'Lock in', () => (value === 42 ? api.win() : api.fail('Not quite.'))));
  });

  // ---- Build the cards (DOM order shuffled, visual order by CSS) ----------
  const cards = levels.map((lv, i) => {
    const card = make('section', `${C.card} ${C.locked}`);
    card.style.order = i;
    card.inert = true;
    const head = make('div', C.head);
    const state = make('span', C.state, 'LOCKED');
    head.append(make('h2', null, `Level ${i + 1}: ${lv.name}`), state);
    const goal = make('p', C.goal);
    goal.innerHTML = lv.goal;
    const body = make('div');
    const status = make('div', C.status);
    card.append(head, goal, body, status);
    lv.card = card;
    lv.state = state;
    lv.status = status;
    lv.build(body, {
      active: () => solved === i && !finished,
      win: () => complete(i),
      say: (message) => { status.textContent = message; },
      fail: (message) => {
        if (solved !== i) return;
        status.textContent = message;
        card.classList.remove(C.shake);
        void card.offsetWidth; // restart the animation
        card.classList.add(C.shake);
      },
      goal: (html) => { goal.innerHTML = html; },
      onStart: (fn) => lv.starts.push(fn),
      onStop: (fn) => lv.stops.push(fn),
    });
    return card;
  });
  shuffle(cards).forEach((card) => wrap.append(card));

  function unlock(i) {
    const lv = levels[i];
    lv.card.inert = false;
    lv.card.classList.remove(C.locked);
    lv.state.textContent = 'IN PROGRESS';
    progress.textContent = `Level ${i + 1} of ${levels.length}`;
    lv.starts.forEach((fn) => fn());
  }

  function complete(i) {
    if (solved !== i || finished) return;
    const lv = levels[i];
    lv.stops.forEach((fn) => fn());
    lv.card.classList.add(C.done);
    lv.state.textContent = 'SOLVED';
    lv.status.textContent = 'Solved.';
    solved++;
    if (solved < levels.length) unlock(solved);
    else finish();
  }

  function finish() {
    finished = true;
    annoyances.forEach(clearTimeout);
    const secs = Math.round((Date.now() - startedAt) / 1000);
    progress.textContent = 'All levels cleared.';
    main.insertBefore(make('div', C.banner, `You escaped the nightmare in ${Math.floor(secs / 60)}m ${secs % 60}s.`), progress);
  }

  unlock(0);

  // ---- Interruptions -------------------------------------------------------
  const annoyances = [];
  const later = (fn, ms) => annoyances.push(setTimeout(() => { if (!finished) fn(); }, ms));

  // A cookie wall (nothing is stored). Which button closes it changes every time.
  function cookieWall(again) {
    const veil = make('div', C.veil);
    veil.style.cssText = 'z-index:50;background:rgba(0,0,0,.55);align-items:flex-end';
    const box = make('div', C.card);
    box.style.cssText = 'max-width:520px;width:100%;margin-bottom:16px';
    const text = make('p', null, again
      ? 'Are you sure? Our cookies are delicious and completely fictional.'
      : 'We use cookies to make this page worse. (Not really: nothing is stored or tracked.)');
    const row = make('div');
    row.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap';
    const accept = fakeButton(C.btn, pick(['OK', 'Fine', 'Accept', 'Sure']), () => {
      veil.remove();
      later(newsletter, between(8000, 15000));
      later(chat, between(12000, 20000));
      later(() => alert('Your session is about to expire. (It is not.)'), between(10000, 25000));
    });
    accept.style.cssText = 'font-size:.7rem;padding:2px 8px;opacity:.75';
    const reject = fakeButton(C.btn, pick(['Reject all', 'No thanks', 'Decline']), () => {
      veil.remove();
      later(() => cookieWall(true), 1500);
    });
    reject.style.cssText = 'font-size:1.1rem;padding:12px 28px';
    shuffle([accept, reject]).forEach((b) => row.append(b));
    box.append(text, row);
    veil.append(box);
    document.body.append(veil);
  }

  // A newsletter popup that keeps coming back. Close it with the × or Escape.
  function newsletter() {
    const veil = make('div', C.veil);
    veil.style.cssText = 'z-index:40;background:rgba(0,0,0,.4);align-items:center';
    const box = make('div', C.card);
    box.style.cssText = 'max-width:380px;width:100%';
    const close = make('span');
    ghostText(close, '×');
    close.style.cssText = 'position:absolute;top:6px;right:12px;font-size:1.5rem;cursor:pointer;line-height:1';
    const email = make('input');
    email.type = 'email';
    email.placeholder = 'you@example.com';
    email.style.margin = '6px 0 10px';
    const subscribe = make('button', C.btn, 'Subscribe');
    const dismiss = () => {
      veil.remove();
      document.removeEventListener('keydown', onEscape);
      later(newsletter, between(30000, 45000));
    };
    const onEscape = (e) => { if (e.key === 'Escape') dismiss(); };
    close.addEventListener('click', dismiss);
    subscribe.addEventListener('click', dismiss);
    document.addEventListener('keydown', onEscape);
    box.append(close, make('h2', null, pick(['Wait! Before you go…', 'Don’t miss out!', 'Psst…'])), make('p', null, 'Subscribe to a newsletter that does not exist.'), email, subscribe);
    veil.append(box);
    document.body.append(veil);
  }

  // A chat bubble that slides over the bottom-right corner now and then.
  function chat() {
    const bubble = make('div', C.card, '👋 Need help? Nobody is here.');
    bubble.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:30;max-width:260px;box-shadow:0 6px 24px rgba(0,0,0,.25)';
    document.body.append(bubble);
    // Removal uses a plain timer so the bubble still leaves after the page is beaten.
    setTimeout(() => { bubble.remove(); later(chat, between(20000, 35000)); }, 6000);
  }

  later(() => cookieWall(false), between(500, 2500));
})();
