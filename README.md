# Levitate Blinds Card

Premium, custom Lovelace cards for Home Assistant blinds — one built for
**Top-Down Bottom-Up (TDBU)** blinds such as the Smartwings Levitate series, and
a matching one for ordinary up/down blinds so a whole house of blinds looks like
one set of controls.

| Card | Use it for |
| :--- | :--- |
| `custom:levitate-blinds-card` | TDBU blinds — a top rail and a bottom rail, independently positioned. |
| `custom:levitate-shade-card` | A plain up/down blind or roller shade — one motor, one entity. |

Both ship in the same file, so installing once gives you both in the card
picker. They share the same visuals, gestures, options and theming.

Traditional cover cards in Home Assistant only support a single position slider, making TDBU blinds awkward to control. This card solves that by providing a unified, visual, and intuitive interface that mirrors the physical blinds.

![Preview Placeholder](https://raw.githubusercontent.com/davemyers-dev/ha-smartwings-levitate/main/preview.png)
*(Note: Add a screenshot of the card to your repo and name it `preview.png`)*

## ✨ Features

- **Visual Editor Support:** Fully editable from the Home Assistant UI! No YAML required.
- **True-to-Life Visualization:** A dynamic window graphic that shows the actual fabric moving up and down as you adjust the rails.
- **Dual Independent Sliders:** Vertical sliders for both the Top Rail and Bottom Rail.
- **A Matching Card for Ordinary Blinds:** Plain up/down blinds get the same look and the same gestures, so mixed rooms stay consistent.
- **Built for Touch:** Each rail has a 44 px finger-sized grab zone that owns the vertical gesture, so dragging a rail never scrolls the dashboard out from under you.
- **Tap Actions:** Tap a rail for the more-info dialog (or any action you configure), tap the track to send the nearest rail there, tap a moving rail to stop it.
- **Keyboard & Screen Reader Friendly:** Rails are focusable sliders with arrow-key control and live ARIA values.
- **Group Support:** Works perfectly with Home Assistant Native Cover Groups to control an entire room's top or bottom rails simultaneously.
- **Themeable:** Respects your Home Assistant theme variables (card background, primary colors, text colors).

---

## 👆 How the card is controlled

| Gesture | What happens |
| :--- | :--- |
| **Drag a rail** | Moves that rail. The grab zone is 44 px tall and reaches past both sides of the track, so you do not have to hit the thin bar itself. A translucent ghost rail previews where the blind will end up; the command is sent when you let go. |
| **Tap a rail** | Runs `tap_action` — the more-info dialog by default. |
| **Tap a rail that is moving** | Stops that rail (`cover.stop_cover`). Disable with `stop_on_tap: false`. |
| **Tap the track** | Sends the nearest rail to the spot you tapped. Disable with `tap_to_position: false`. |
| **Tap the name** | Runs `tap_action` for the top entity (or the bottom one if no top is configured). |
| **Swipe over the track** | Scrolls the dashboard, as normal. |
| **Focus a rail + arrow keys** | `↑`/`↓` nudge by 1%, `PgUp`/`PgDn` by 10%, `Home`/`End` jump to fully up/down, `Enter` runs the tap action. |

Rails cannot be dragged past each other, and the card holds the position you
asked for for a few seconds so it does not snap back while the motor is still
reporting its old position.

On a plain up/down blind the same gestures apply to its single rail — the moving
edge of the fabric.

**Blinds that only open and close.** If a cover does not support
`set_cover_position`, there is nowhere to drag to, so the card adapts: it draws
the blind fully open or fully closed from the entity state, presents the rail as
a button rather than a slider (including to screen readers), and a tap opens or
closes it — or stops it while it is moving. Set `tap_action` explicitly if you
would rather have that tap do something else.

> **Prefer to grab the blind anywhere?** Set `drag_anywhere: true` and a press
> anywhere on the track grabs the nearest rail immediately. The trade-off is
> that the browser then hands every vertical gesture over the card to the card,
> so you cannot scroll the dashboard by swiping across it.

---

## 📦 Installation

### Option 1: HACS Custom Repository (Recommended)
1. Open **HACS** in your Home Assistant instance.
2. Click the three dots in the top right corner and select **Custom repositories**.
3. In the **Repository** field enter:
   ```
   https://github.com/davemyers-dev/ha-smartwings-levitate
   ```
4. Set **Type** to **Dashboard** (this category was called *Lovelace* / *Plugin* in older HACS versions).
5. Click **Add**, then close the dialog.
6. Search for **Levitate Blinds Card** in HACS and open it.
7. Click **Download** and confirm. HACS installs the card to
   `/config/www/community/ha-smartwings-levitate/levitate-blinds-card.js` and registers the
   Lovelace resource for you automatically.
8. Reload your browser with a hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
9. Add the card to a dashboard — it appears in the card picker as **Levitate Blinds Card**.

> **Note:** This repository has no tagged GitHub releases, so HACS will offer the default
> branch (`main`). If HACS does not show a version to download, enable **Show beta versions**
> in the download dialog, or pick the `main` branch from the version dropdown.

### Option 2: Manual
1. Download `levitate-blinds-card.js` from this repository.
2. Copy the file into your `/config/www/` directory in Home Assistant.
3. Go to **Settings** -> **Dashboards** -> **Three dots (top right)** -> **Resources**.
4. Click **Add Resource**:
   - URL: `/local/levitate-blinds-card.js`
   - Resource type: `JavaScript Module`
5. Refresh your browser cache.

---

## ⚙️ Configuration

Add the card to your dashboard using the manual YAML editor.

### Basic TDBU Blind

```yaml
type: custom:levitate-blinds-card
name: Kitchen Window
top_entity: cover.kitchen_blinds_top
bottom_entity: cover.kitchen_blinds_bottom
```

### A Plain Up/Down Blind

One motor, one entity — the matching card for roller blinds, cellular shades and
anything else that just goes up and down:

```yaml
type: custom:levitate-shade-card
name: Landing Blind
entity: cover.landing_blind
```

The card uses Home Assistant's usual cover scale, where `100` is fully open and
`0` is fully closed. The fabric is drawn hanging from the top of the window with
the rail at its bottom edge, which is how a roller blind hangs. If yours instead
rises from the window sill, add `fabric_from: bottom` and the drawing flips to
match — the position numbers stay exactly the same.

```yaml
type: custom:levitate-shade-card
name: Bathroom
entity: cover.bathroom_blind
fabric_from: bottom
```

### Room Group Control (Advanced)

If you have multiple TDBU blinds in one room (e.g., Left, Center, Right), you can control them all at once! 

1. Create a **Cover Group** Helper for all your Top rails (`cover.den_blinds_top_group`).
2. Create a **Cover Group** Helper for all your Bottom rails (`cover.den_blinds_bottom_group`).
3. Use those groups in the card:

```yaml
type: custom:levitate-blinds-card
name: Den Blinds (All)
top_entity: cover.den_blinds_top_group
bottom_entity: cover.den_blinds_bottom_group
```

---

## 📊 Configuration Options

### `custom:levitate-blinds-card` (TDBU)

| Name | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `type` | string | **Required** | Must be `custom:levitate-blinds-card` |
| `top_entity` | string | — | The entity ID of your top rail motor. Must be a `cover` entity. Optional if `bottom_entity` is set. |
| `bottom_entity` | string | — | The entity ID of your bottom rail motor. Must be a `cover` entity. Optional if `top_entity` is set. |

### `custom:levitate-shade-card` (single motor)

| Name | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `type` | string | **Required** | Must be `custom:levitate-shade-card` |
| `entity` | string | **Required** | The entity ID of the blind. Must be a `cover` entity. |
| `fabric_from` | string | `top` | Which edge the fabric is anchored to: `top` for a roller or standard blind, `bottom` for one that rises from the sill. Only changes the drawing — positions stay on Home Assistant's scale. |
| `invert` | boolean | `false` | Set this if the card draws the blind covered when it is really open. See below. |

#### If the card looks inverted

The card fills in the part of the window the blind is actually covering, so the
fabric colour grows as the blind closes. If yours does the opposite, one of two
things is happening:

1. **The entity reports position backwards.** Home Assistant's convention is
   `100` = open, `0` = closed, but some integrations report how far the blind
   has travelled down instead. Home Assistant can't tell either — it decides
   `open` vs `closed` purely from that number — so the whole UI is inverted, not
   just this card. Check by opening the entity's more-info dialog: if it says
   100% while the blind is physically down, add `invert: true`.
2. **It is on the TDBU card with a single `top_entity`.** There, the fabric is
   drawn hanging *below* the top rail, down to where the bottom rail would be —
   correct for a top-down TDBU blind, upside down for a roller. Use
   `custom:levitate-shade-card` with `entity:` instead.

### Shared by both cards

| Name | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `name` | string | `Blind` | Friendly name displayed at the top of the card. |
| `slim` | boolean | `false` | Compact layout for narrow dashboard columns. |
| `height` | number | `200` (`150` slim) | Height of the track in pixels. A taller track means more travel per pixel — easier to place a rail precisely on a phone. |
| `tap_action` | object | `{action: more-info}` | Action for a tap on a rail or on the name. Supports `more-info`, `toggle`, `navigate`, `url`, `perform-action` and `none`. On a cover without position support, leaving this unset makes a tap open/close instead. |
| `tap_to_position` | boolean | `true` | Tapping the track sends the nearest rail to that spot. |
| `stop_on_tap` | boolean | `true` | Tapping a rail that is opening or closing stops it. |
| `drag_anywhere` | boolean | `false` | Press anywhere on the track to grab the nearest rail. Prevents swipe-scrolling over the card. |

### Actions

```yaml
type: custom:levitate-blinds-card
name: Kitchen Window
top_entity: cover.kitchen_blinds_top
bottom_entity: cover.kitchen_blinds_bottom
height: 260              # a taller track is easier to aim at on a phone
tap_action:
  action: perform-action
  perform_action: scene.turn_on
  target:
    entity_id: scene.kitchen_morning
```

---

## 🎨 Theming & Styling

This card automatically adapts to your active Home Assistant theme. If you want to customize it further using `card-mod`, the following CSS variables are utilized:

- `--ha-card-background` / `--card-background-color`: The main background of the card.
- `--primary-color`: The color of the "fabric" and the slider thumbs.
- `--secondary-background-color`: The background color of the window frame/track.
- `--primary-text-color`: The color of the main title and of the rails.
- `--ha-card-border-radius`: The rounding of the card corners.

---

## 🛠️ How it Works

The TDBU card assumes each of your two `cover` entities reports where its rail
sits, using the standard 0-100 `current_position` attribute:
* `100%` means the rail is fully at the **top** (ceiling).
* `0%` means the rail is fully at the **bottom** (floor).

When you slide the Top rail down, it sends a `set_cover_position` command to lower the percentage. When you slide the Bottom rail up, it increases the percentage. The blue "fabric" is dynamically drawn between the two rail coordinates.

The single-motor card instead uses the ordinary cover meaning of position —
`100%` is open, `0%` is closed — because that is what a normal blind reports. It
draws one rail at the moving edge of the fabric and fills in the covered part of
the window behind it. With `fabric_from: bottom` the drawing is mirrored, and
the card mirrors the numbers with it, so what it sends to Home Assistant is
always on Home Assistant's own scale.

### Why dragging used to fight with scrolling

Touch browsers decide who owns a vertical gesture the moment your finger lands,
based on the `touch-action` of the element you touched. Earlier versions marked
the rails `pan-y` — which tells the browser "vertical drags here belong to the
page" — so the dashboard scrolled and the card was handed a `pointercancel`. The
rails now sit inside 44 px hit zones marked `touch-action: none`, so a gesture
that starts on a rail belongs to the card and nothing else can take it away. The
rest of the track keeps `pan-y`, which is what leaves the dashboard scrollable.

---

## 🚀 Development & Live Deployment (for AI Agents)

In this specific Home Assistant setup, the card is deployed as an **inline dashboard resource** directly in the Lovelace config database.

- **Resource ID:** `15dcbde015b040c3aacc79da07fc3a71`
- **Url:** `/local/levitate-blinds-card.js`
- **Resource Type:** `module`

### Deployment Steps
To deploy live updates:
1. Edit `levitate-blinds-card.js` locally.
2. Commit and push the code changes to GitHub.
3. Update the parent repo (`jlapenna/home-assistant`) submodule tracking reference and push it as well.
4. Run the Home Assistant MCP tool:
   - `ha_config_set_dashboard_resource` with:
     - `resource_id`: `"15dcbde015b040c3aacc79da07fc3a71"`
     - `content`: Complete content of `levitate-blinds-card.js`
     - `url`: `/local/levitate-blinds-card.js`
     - `res_type`: `module`
5. Perform a **hard reload / clear cache** (`Ctrl+Shift+R` or `Cmd+Shift+R`) on your browser dashboard to fetch the updated resource.

