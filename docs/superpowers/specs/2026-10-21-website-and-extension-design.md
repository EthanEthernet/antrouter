# AntRouter as a website and a Chrome extension

**Date:** 2026-10-21
**Status:** approved design, awaiting spec review

## Goal

Turn the single-file prototype (`index.html`) into a tabbed website that the same folder can also load as a Chrome extension popup. The site is served from GitHub Pages. The extension is loaded with Chrome's "Load unpacked" on the same folder.

The design also takes in the professor's feedback: **the chat box goes at the top**, and the long scrolling page becomes **tabs**.

## Decisions

| Question | Decision | Why |
|---|---|---|
| What the extension does | Toolbar **popup** | The cheapest useful form, and it reuses the website. An on-site overlay for ChatGPT, Claude and Gemini stays on the roadmap. |
| Tooling | **Plain files, native ES modules, no build** | No libraries are needed yet. Nobody on the team has to install Node to run the site. Pages and Chrome both load the folder as-is. Moving to Vite later is easy because the code will already use ES modules. |
| Page structure | **Tabs**, with the chat at the top | Professor feedback. Tabs also let the full app fit in a popup. |
| Where Mandu lives | **Always visible**, next to the tab content | Gear bought in the Shop shows up on Mandu immediately, and he reacts to quests and routes from any tab. |
| Popup vs site | **Same page.** The popup is `index.html?popup` in a compact layout | One page and one script to maintain. The popup gets every tab except the tour. |

## Layout

```
┌──────────────────────────────────────────────┐
│ AntRouter                 Lv2 Forager · 40 🍞│  header
│ [Any app] [Claude] [ChatGPT] [Gemini]        │
│ ┌──────────────────────────────┐ [Route]     │  chat (always at top)
│ │ Ask anything…                │             │
│ └──────────────────────────────┘             │
│ sample · sample · sample                     │
├──────────────────────────────────────────────┤
│ Route · Trails · Progress · Shop · About  ▶  │  tab bar (▶ = tour, site only)
├───────────────────────┬──────────────────────┤
│                       │                      │
│   Mandu terminal      │   active tab         │
│   (always visible)    │                      │
│                       │                      │
└───────────────────────┴──────────────────────┘
```

- **Narrow screens (under about 860px) and the popup:** Mandu stacks above the tab content. In the popup he renders at a smaller font so the whole app fits within Chrome's 800×600 limit.
- **Header:** level and crumbs are always visible. They replace the old stand-alone progress card as the at-a-glance view.

### Tabs

| Tab | Contents (moved from the current page) |
|---|---|
| **Route** (default) | The result card (pick, reason, reroute chips, Good route, Open in / Copy prompt) and the core-loop strip with its hint |
| **Trails** | "Your trails" (learned bias), the belly split per family, and "Reset trails and belly" |
| **Progress** | Level, XP bar, badges, quests and the quest counter |
| **Shop** | Gear items and "Reset level, crumbs and gear" |
| **About** | The four mood cards, "Why an anteater" and the tour button |

### Tab behavior

- Routing a prompt switches to **Route**.
- Finishing a quest or earning a badge shows the existing toast and puts a dot on the **Progress** tab until it is opened.
- The last open tab is remembered in `localStorage` (`antrouter:tab`).
- Tabs use proper tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, arrow-key navigation).
- The Pet, Nap, Wake and Zot! buttons stay under the Mandu terminal, so they work from every tab.

### Tour

The 1-minute tour keeps its sandboxed-progress behavior. It now switches tabs instead of scrolling: Route for asking, routing and rerouting, Trails for learning, Progress for level-up, Shop for gear. It is hidden in the popup.

## Files

```
index.html            the one app page (markup only, no inline script)
manifest.json         Chrome MV3 manifest; action.default_popup = "index.html?popup"
css/app.css           all styles, including the .popup compact layout
src/models.js         MODELS, PLATFORMS, OPEN handoff links (data only)
src/router.js         classify, score, applyBias, rank, decide + reason text (pure, no DOM)
src/storage.js        the antrouter: localStorage wrapper (get/set, try/catch)
src/mandu.js          createMandu(screenEl, statusEl) → { routeTo, queueEat, pet, zot, nap, wake, setGear, … }
src/game.js           XP, crumbs, levels, quests, badges, shop; emits events (levelup, quest, badge)
src/result.js         renders the result card into a given element
src/app.js            tabs, chat, wiring between modules, toasts, tour, popup mode
icons/                extension icons (16/48/128 px), made from Mandu's face
tests/router.test.js  node --test checks for the router
versions/             unchanged
```

### Module boundaries

- **`router.js`** has no DOM access and no storage access. It takes the prompt text, platform and bias as arguments. This keeps it testable in Node and ready to be replaced by a model-based classifier later.
- **`mandu.js`** owns the animation loop, moods, belly and gear drawing. It reads belly counts and worn gear through values it is given, so it doesn't reach into `game.js`.
- **`game.js`** owns the progress state and its persistence. It knows nothing about the DOM. `app.js` listens to its events and turns them into toasts, tab dots and Mandu reactions.
- **`app.js`** is the only file that touches the page layout.

## Extension specifics

- **Manifest V3:** `name`, `version`, `action.default_popup`, `icons`. No permissions are requested. Handoff uses normal links with `target="_blank"`, which open new tabs from a popup without needing the `tabs` permission.
- **No inline scripts.** MV3 blocks them, which is why all JS lives in `src/` and loads as `<script type="module" src="src/app.js">`. Inline `style=""` attributes and `innerHTML` with styles are allowed.
- **Fonts:** keep the Google Fonts stylesheet. The default extension CSP does not restrict styles or fonts. If the fonts fail to load (offline), the page falls back to system fonts.
- **Storage:** the popup uses the extension's own `localStorage`. Website progress and extension progress are **separate**, because browser storage is per-site. Syncing them would need accounts, which are on the roadmap and out of scope here.
- **Popup sizing:** in popup mode the body is fixed at 780×580 so Chrome's popup frame doesn't clip it.

## Unchanged

- Mandu's drawing, moods, animations and easter eggs.
- Router scoring, model ratings and learned-bias rules: +8 for a reroute target, −4 for the original pick, +3 for Good route.
- Existing `localStorage` keys, so anyone who already played keeps their progress.
- `versions/v1-before-progression/`, `docs/`, `media/`, `tools/record-tour.js`. The tour recorder's selectors are updated only where markup changed.

## Testing

- **Automated** (`node --test tests/`; optional, needs Node):
  - Each of the six sample prompts gets the same task type and top pick as the current prototype.
  - Platform filtering only returns that vendor's models.
  - Bias from a reroute changes the ranking as expected.
- **Manual** in Chrome, on the website (served locally) and in the popup (Load unpacked):
  - Every tab opens, the last tab is remembered, and keyboard navigation works.
  - Route, reroute, Good route, Open in Claude/ChatGPT, and Copy prompt for Gemini.
  - Buy and wear gear, and see it on Mandu while on the Shop tab.
  - Finish a quest and see the Progress tab dot.
  - Run the tour end to end, and check that it restores your progress afterwards.
  - Narrow window (phone width): Mandu stacks above the tabs with no horizontal scroll.
  - Reduced motion: Mandu draws one still frame, and everything else works.

## Out of scope

- On-site extension mode (an overlay on chatgpt.com, claude.ai or gemini.google.com).
- Syncing progress between the site and the extension, and accounts.
- Publishing to the Chrome Web Store (zip and listing). Load unpacked is enough for the class.
- Any change to how routing decides.
