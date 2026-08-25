const LEVITATE_BLINDS_CARD_VERSION = "1.1.0";

const HIT_SIZE = 44;        // px - minimum comfortable touch target
const DRAG_THRESHOLD = 3;   // px - movement before a press becomes a drag
const SCROLL_ESCAPE = 8;    // px - movement on the track means the user is scrolling, not tapping
const OPTIMISTIC_MS = 4000; // ms - ignore incoming state right after we command a position
const KEY_COMMIT_MS = 400;  // ms - debounce for keyboard adjustments

const DEFAULT_TAP_ACTION = { action: "more-info" };

function fireEvent(node, type, detail, options = {}) {
  const event = new CustomEvent(type, {
    bubbles: options.bubbles !== false,
    cancelable: false,
    composed: options.composed !== false,
    detail,
  });
  node.dispatchEvent(event);
  return event;
}

class LevitateBlindsCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._rendered = false;
  }

  setConfig(config) {
    this._config = config || {};
    if (!this._rendered) {
      this.render();
    } else {
      this.syncValues();
    }
  }

  set hass(hass) {
    this._hass = hass;
    this.populateEntityList();
  }

  // Offer every cover entity as a datalist suggestion so the entity fields are
  // usable without leaving the editor.
  populateEntityList() {
    if (!this._rendered || !this._hass) return;
    const list = this.shadowRoot.getElementById('cover-entities');
    const covers = Object.keys(this._hass.states)
      .filter((id) => id.startsWith('cover.'))
      .sort();
    if (list.childElementCount === covers.length) return;
    list.innerHTML = covers.map((id) => `<option value="${id}"></option>`).join('');
  }

  // Push values back into the inputs without rebuilding the DOM - rebuilding
  // steals focus from whatever field the user is typing in.
  syncValues() {
    const active = this.shadowRoot.activeElement;
    const set = (id, value) => {
      const el = this.shadowRoot.getElementById(id);
      if (!el || el === active) return;
      if (el.type === 'checkbox') el.checked = !!value;
      else el.value = value ?? '';
    };
    set('name', this._config.name);
    set('top_entity', this._config.top_entity);
    set('bottom_entity', this._config.bottom_entity);
    set('slim', this._config.slim);
    set('height', this._config.height);
    set('tap_to_position', this._config.tap_to_position !== false);
    set('stop_on_tap', this._config.stop_on_tap !== false);
    set('drag_anywhere', this._config.drag_anywhere);
    set('tap_action', (this._config.tap_action || DEFAULT_TAP_ACTION).action || 'more-info');
  }

  render() {
    if (!this._config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .card-config {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
        }
        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        label {
          font-size: 14px;
          color: var(--secondary-text-color);
          margin-bottom: 8px;
        }
        .checkbox-group label {
          margin-bottom: 0;
          cursor: pointer;
        }
        .hint {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
          opacity: 0.8;
        }
        input[type="text"],
        input[type="number"],
        select {
          padding: 10px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
        }
        input:focus, select:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--primary-color);
        }
      </style>
      <div class="card-config">
        <datalist id="cover-entities"></datalist>
        <div class="input-group">
          <label for="name">Name (Optional)</label>
          <input type="text" id="name" value="${this._config.name || ''}" placeholder="e.g. Kitchen Blinds">
        </div>
        <div class="input-group">
          <label for="top_entity">Top Rail Entity (Optional if Bottom configured)</label>
          <input type="text" id="top_entity" list="cover-entities" value="${this._config.top_entity || ''}" placeholder="cover.my_blind_top">
        </div>
        <div class="input-group">
          <label for="bottom_entity">Bottom Rail Entity (Optional if Top configured)</label>
          <input type="text" id="bottom_entity" list="cover-entities" value="${this._config.bottom_entity || ''}" placeholder="cover.my_blind_bottom">
        </div>
        <div class="input-group">
          <label for="height">Track Height (px)</label>
          <input type="number" id="height" min="90" max="600" step="10" value="${this._config.height ?? ''}" placeholder="${this._config.slim ? 150 : 200}">
          <div class="hint">A taller track makes the rails easier to hit and to place precisely.</div>
        </div>
        <div class="input-group">
          <label for="tap_action">Tap Action (on a rail)</label>
          <select id="tap_action">
            <option value="more-info">More info dialog</option>
            <option value="toggle">Toggle (open / close)</option>
            <option value="none">Nothing</option>
          </select>
          <div class="hint">Use YAML for <code>navigate</code>, <code>url</code> or <code>perform-action</code>.</div>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="tap_to_position" ${this._config.tap_to_position !== false ? 'checked' : ''}>
          <label for="tap_to_position">Tap the track to move the nearest rail there</label>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="stop_on_tap" ${this._config.stop_on_tap !== false ? 'checked' : ''}>
          <label for="stop_on_tap">Tap a moving rail to stop it</label>
        </div>
        <div class="input-group">
          <div class="checkbox-group">
            <input type="checkbox" id="drag_anywhere" ${this._config.drag_anywhere ? 'checked' : ''}>
            <label for="drag_anywhere">Drag from anywhere on the track</label>
          </div>
          <div class="hint">Grabs the nearest rail wherever you touch the track. The dashboard can no longer be scrolled by swiping over this card.</div>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="slim" ${this._config.slim ? 'checked' : ''}>
          <label for="slim">Slim Mode (Compact layout)</label>
        </div>
      </div>
    `;
    this._rendered = true;
    this.populateEntityList();

    const value = (id) => this.shadowRoot.getElementById(id).value.trim();
    const checked = (id) => this.shadowRoot.getElementById(id).checked;

    const updateConfig = () => {
      const height = parseInt(value('height'), 10);
      const tapAction = value('tap_action');

      const newConfig = {
        ...this._config,
        name: value('name'),
        top_entity: value('top_entity'),
        bottom_entity: value('bottom_entity'),
        slim: checked('slim'),
        tap_to_position: checked('tap_to_position'),
        stop_on_tap: checked('stop_on_tap'),
        drag_anywhere: checked('drag_anywhere'),
      };

      if (Number.isFinite(height)) newConfig.height = height;
      else delete newConfig.height;

      // Preserve any advanced tap_action authored in YAML; only swap the type.
      const existing = this._config.tap_action || DEFAULT_TAP_ACTION;
      newConfig.tap_action = existing.action === tapAction ? existing : { action: tapAction };

      this._config = newConfig;
      const event = new Event("config-changed", { bubbles: true, composed: true });
      event.detail = { config: newConfig };
      this.dispatchEvent(event);
    };

    ['name', 'top_entity', 'bottom_entity', 'height'].forEach((id) => {
      this.shadowRoot.getElementById(id).addEventListener('input', updateConfig);
    });
    ['slim', 'tap_to_position', 'stop_on_tap', 'drag_anywhere', 'tap_action'].forEach((id) => {
      this.shadowRoot.getElementById(id).addEventListener('change', updateConfig);
    });

    this.syncValues();
  }
}
customElements.define('levitate-blinds-card-editor', LevitateBlindsCardEditor);


class LevitateBlindsCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.activeRail = null;
    this.optimisticTimeout = 0;
    this.optimisticTop = null;
    this.optimisticBottom = null;
    this.dragTopPos = null;
    this.dragBottomPos = null;
    this.currentTopPos = null;
    this.currentBottomPos = null;
    this._drag = null;      // active rail drag
    this._press = null;     // pending press on the track (long-press or tap)
    this._keyTimer = null;
  }

  static getConfigElement() {
    return document.createElement("levitate-blinds-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:levitate-blinds-card",
      name: "Levitate Blinds",
      top_entity: "",
      bottom_entity: "",
      slim: false
    };
  }

  setConfig(config) {
    this.config = config;
    this.initDom();
  }

  get isDragging() {
    return !!(this._drag && this._drag.moved);
  }

  get hasTop() { return !!this.config.top_entity; }
  get hasBottom() { return !!this.config.bottom_entity; }

  trackHeight() {
    const fallback = this.config.slim ? 150 : 200;
    const h = parseInt(this.config.height, 10);
    return Number.isFinite(h) ? Math.min(600, Math.max(90, h)) : fallback;
  }

  initDom() {
    const isSlim = !!this.config.slim;
    const trackHeight = this.trackHeight();
    const railHeight = isSlim ? 12 : 16;
    const hitHeight = Math.max(HIT_SIZE, railHeight);

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          padding: ${isSlim ? '12px 10px' : '20px 24px'};
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: ${isSlim ? '8px' : '16px'};
          background: var(--ha-card-background, var(--card-background-color, white));
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, none);
          box-sizing: border-box;
          width: 100%;
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .container {
          position: relative;
          width: ${isSlim ? '40px' : '80px'};
          height: ${trackHeight}px;
          background: var(--secondary-background-color, #e0e0e0);
          border-radius: 8px;
          border: 2px solid var(--divider-color, #ccc);
          /* By default the track itself still scrolls the dashboard and only
             the rail hit zones below claim the vertical gesture. With
             drag_anywhere the whole track claims it instead. */
          touch-action: ${this.config.drag_anywhere ? 'none' : 'pan-y'};
          overflow: visible;
        }
        .fabric {
          position: absolute;
          left: 0;
          right: 0;
          background: var(--state-cover-active-color, var(--state-active-color, var(--primary-color, #03a9f4)));
          opacity: 0.6;
          pointer-events: none;
          transition: top 0.3s ease, bottom 0.3s ease;
        }
        .fabric.ghost {
          position: absolute;
          left: 0;
          right: 0;
          background: var(--state-cover-active-color, var(--state-active-color, var(--primary-color, #03a9f4)));
          opacity: 0.25;
          pointer-events: none;
          z-index: 2;
          display: none;
        }
        .rail {
          position: absolute;
          left: ${isSlim ? '-2px' : '-4px'};
          right: ${isSlim ? '-2px' : '-4px'};
          height: ${railHeight}px;
          margin-top: -${railHeight / 2}px;
          background: var(--primary-text-color, #444);
          border-radius: ${isSlim ? '3px' : '4px'};
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          z-index: 3;
          display: flex;
          justify-content: center;
          align-items: center;
          /* All pointer handling lives on the oversized .hit zones. */
          pointer-events: none;
          transition: top 0.3s ease;
        }
        .rail::after {
          content: '';
          width: ${isSlim ? '16px' : '24px'};
          height: ${isSlim ? '2px' : '3px'};
          background: var(--card-background-color, rgba(255,255,255,0.6));
          border-radius: 1px;
        }
        .rail.moving {
          animation: rail-pulse 1.1s ease-in-out infinite;
        }
        @keyframes rail-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rail, .fabric { transition: none; }
          .rail.moving { animation: none; }
        }
        .rail.ghost {
          position: absolute;
          left: ${isSlim ? '-2px' : '-4px'};
          right: ${isSlim ? '-2px' : '-4px'};
          height: ${railHeight}px;
          margin-top: -${railHeight / 2}px;
          background: var(--primary-text-color, #444);
          border-radius: ${isSlim ? '3px' : '4px'};
          opacity: 0.4;
          border: 1px dashed var(--card-background-color, white);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          z-index: 4;
          display: none;
          justify-content: center;
          align-items: center;
          pointer-events: none;
          transform: scale(1);
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .rail.ghost::after {
          content: '';
          width: ${isSlim ? '16px' : '24px'};
          height: ${isSlim ? '2px' : '3px'};
          background: var(--card-background-color, rgba(255,255,255,0.6));
          border-radius: 1px;
        }
        .container.dragging .rail,
        .container.dragging .fabric {
          transition: none !important;
        }
        .container.dragging .rail.ghost {
          transform: scale(1.15);
        }
        /* Invisible, finger-sized grab area centred on each rail. It reaches
           past the track on both sides and owns the vertical gesture
           (touch-action: none) so a drag here never scrolls the dashboard. */
        .hit {
          position: absolute;
          left: -16px;
          right: -16px;
          height: ${hitHeight}px;
          margin-top: -${hitHeight / 2}px;
          z-index: 5;
          background: transparent;
          border-radius: 8px;
          touch-action: none;
          cursor: grab;
          transition: top 0.3s ease;
        }
        .hit:active { cursor: grabbing; }
        .hit:focus { outline: none; }
        .hit:focus-visible {
          outline: 2px solid var(--primary-color, #03a9f4);
          outline-offset: 2px;
        }
        /* Focus is set on press so that the keyboard can take over afterwards -
           but a finger or a mouse should not leave a focus ring behind. */
        .hit.pointer-focus:focus-visible { outline: none; }
        .container.dragging .hit { transition: none !important; }
        .name {
          font-weight: 500;
          font-size: ${isSlim ? '12px' : '18px'};
          color: var(--primary-text-color);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          cursor: pointer;
          border-radius: 4px;
        }
        .name:focus-visible {
          outline: 2px solid var(--primary-color, #03a9f4);
          outline-offset: 2px;
        }
        .error {
          color: var(--error-color, red);
          font-size: 13px;
          text-align: center;
          padding: 8px;
        }
      </style>
      <ha-card>
        <div class="name" id="name" role="button" tabindex="0">${this.config.name || 'Blind'}</div>
        <div id="error-msg" class="error" style="display: none;"></div>
        <div class="container" id="container">
          <div class="fabric" id="fabric"></div>
          <div class="fabric ghost" id="fabric-ghost"></div>
          <div class="rail top" id="rail-top"></div>
          <div class="rail bottom" id="rail-bottom"></div>
          <div class="rail ghost top" id="rail-ghost-top"></div>
          <div class="rail ghost bottom" id="rail-ghost-bottom"></div>
          <div class="hit top" id="hit-top" role="slider" tabindex="0"
               aria-label="Top rail" aria-valuemin="0" aria-valuemax="100"></div>
          <div class="hit bottom" id="hit-bottom" role="slider" tabindex="0"
               aria-label="Bottom rail" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
      </ha-card>
    `;

    this.container = this.shadowRoot.getElementById('container');
    this.railTop = this.shadowRoot.getElementById('rail-top');
    this.railBottom = this.shadowRoot.getElementById('rail-bottom');
    this.railGhostTop = this.shadowRoot.getElementById('rail-ghost-top');
    this.railGhostBottom = this.shadowRoot.getElementById('rail-ghost-bottom');
    this.hitTop = this.shadowRoot.getElementById('hit-top');
    this.hitBottom = this.shadowRoot.getElementById('hit-bottom');
    this.fabric = this.shadowRoot.getElementById('fabric');
    this.fabricGhost = this.shadowRoot.getElementById('fabric-ghost');
    this.errorMsg = this.shadowRoot.getElementById('error-msg');
    this.nameEl = this.shadowRoot.getElementById('name');

    this.hitTop.addEventListener('pointerdown', (e) => this.onRailPointerDown(e, 'top'));
    this.hitBottom.addEventListener('pointerdown', (e) => this.onRailPointerDown(e, 'bottom'));
    this.hitTop.addEventListener('keydown', (e) => this.onRailKeyDown(e, 'top'));
    this.hitBottom.addEventListener('keydown', (e) => this.onRailKeyDown(e, 'bottom'));
    [this.hitTop, this.hitBottom].forEach((hit) => {
      hit.addEventListener('keydown', () => hit.classList.remove('pointer-focus'));
      hit.addEventListener('blur', () => hit.classList.remove('pointer-focus'));
    });

    // Pointer capture retargets move/up events to the .hit element, but they
    // still bubble to the container - so one set of listeners here covers both
    // rail drags and track presses without double handling.
    this.container.addEventListener('pointerdown', (e) => this.onTrackPointerDown(e));
    this.container.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.container.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.container.addEventListener('pointercancel', (e) => this.onPointerCancel(e));

    this.nameEl.addEventListener('click', () => this.runAction(this.config.tap_action, this.primaryEntity()));
    this.nameEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      this.runAction(this.config.tap_action, this.primaryEntity());
    });
  }

  primaryEntity() {
    return this.config.top_entity || this.config.bottom_entity || null;
  }

  entityFor(rail) {
    return rail === 'top' ? this.config.top_entity : this.config.bottom_entity;
  }

  positionFor(rail) {
    return rail === 'top' ? (this.currentTopPos ?? 100) : (this.currentBottomPos ?? 0);
  }

  /* ------------------------------------------------------------------ *
   *  Pointer handling
   * ------------------------------------------------------------------ */

  // Both hit zones are 44px tall, so near a closed blind they overlap. Rather
  // than letting z-order decide, always grab whichever rail is closest.
  pickRail(clientY) {
    if (!this.hasTop && !this.hasBottom) return null;
    if (!this.hasTop) return 'bottom';
    if (!this.hasBottom) return 'top';

    const rect = this.container.getBoundingClientRect();
    const yTop = rect.top + rect.height * (100 - (this.currentTopPos ?? 100)) / 100;
    const yBottom = rect.top + rect.height * (100 - (this.currentBottomPos ?? 0)) / 100;
    const dTop = Math.abs(clientY - yTop);
    const dBottom = Math.abs(clientY - yBottom);
    if (dTop === dBottom) return clientY <= yTop ? 'top' : 'bottom';
    return dTop < dBottom ? 'top' : 'bottom';
  }

  onRailPointerDown(e, fallbackRail) {
    if (!e.isPrimary || this._drag) return;
    const rail = this.pickRail(e.clientY) || fallbackRail;
    if (!this.entityFor(rail)) return;

    // Safe to swallow the default here: touch-action is none on this element,
    // so the browser was never going to scroll from it anyway.
    e.preventDefault();
    e.currentTarget.classList.add('pointer-focus');
    e.currentTarget.focus({ preventScroll: true });

    this._drag = {
      id: e.pointerId,
      rail,
      startY: e.clientY,
      target: e.currentTarget,
      moved: false,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  onTrackPointerDown(e) {
    if (!e.isPrimary || this._drag || this._press) return;
    // Hit zones handle their own presses; everything else is the bare track.
    if (e.target.classList && e.target.classList.contains('hit')) return;
    if (!this.hasTop && !this.hasBottom) return;

    if (this.config.drag_anywhere) {
      const rail = this.pickRail(e.clientY);
      if (!rail || !this.entityFor(rail)) return;
      e.preventDefault();
      this._drag = {
        id: e.pointerId,
        rail,
        startY: e.clientY,
        target: this.container,
        moved: false,
        track: true,
      };
      try { this.container.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      return;
    }

    // Remember the press so that a tap (as opposed to a scroll) can place a rail.
    this._press = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  onPointerMove(e) {
    if (this._press && e.pointerId === this._press.id) {
      const moved = Math.abs(e.clientY - this._press.y) > SCROLL_ESCAPE ||
                    Math.abs(e.clientX - this._press.x) > SCROLL_ESCAPE;
      if (moved) this.cancelPress();   // the user is scrolling the dashboard
      return;
    }

    const drag = this._drag;
    if (!drag || e.pointerId !== drag.id) return;

    if (!drag.moved) {
      if (Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD) return;
      drag.moved = true;
      this.beginDragVisuals(drag.rail);
      this.haptic('selection');
    }
    this.applyDragPosition(e.clientY);
  }

  onPointerUp(e) {
    if (this._press && e.pointerId === this._press.id) {
      const y = this._press.y;
      this.cancelPress();
      this.handleTrackTap(y);
      return;
    }

    const drag = this._drag;
    if (!drag || e.pointerId !== drag.id) return;
    this._drag = null;
    this.activeRail = null;
    this.releaseCapture(drag);

    if (!drag.moved) {
      if (drag.track) this.handleTrackTap(drag.startY);
      else this.handleRailTap(drag.rail);
      return;
    }

    this.endDragVisuals();
    const position = drag.rail === 'top' ? this.dragTopPos : this.dragBottomPos;
    if (position !== null && position !== undefined) this.commit(drag.rail, position);
  }

  onPointerCancel(e) {
    if (this._press && e.pointerId === this._press.id) {
      this.cancelPress();
      return;
    }
    const drag = this._drag;
    if (!drag || e.pointerId !== drag.id) return;
    this._drag = null;
    this.activeRail = null;
    this.releaseCapture(drag);
    this.endDragVisuals();
    this.updateVisuals();   // discard the aborted drag, snap back to real state
  }

  releaseCapture(drag) {
    try { drag.target.releasePointerCapture(drag.id); } catch (err) { /* ignore */ }
  }

  cancelPress() {
    this._press = null;
  }

  beginDragVisuals(rail) {
    this.activeRail = rail;
    this.dragTopPos = this.currentTopPos;
    this.dragBottomPos = this.currentBottomPos;
    this.container.classList.add('dragging');
    this.fabricGhost.style.display = 'block';
    if (rail === 'top') this.railGhostTop.style.display = 'flex';
    else this.railGhostBottom.style.display = 'flex';
    this.updateGhostVisuals();
  }

  endDragVisuals() {
    this.container.classList.remove('dragging');
    this.fabricGhost.style.display = 'none';
    this.railGhostTop.style.display = 'none';
    this.railGhostBottom.style.display = 'none';
  }

  applyDragPosition(clientY) {
    const rail = this.activeRail;
    if (!rail) return;
    const rect = this.container.getBoundingClientRect();
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    const position = this.clampPosition(rail, Math.round(100 - (y / rect.height) * 100));
    if (rail === 'top') this.dragTopPos = position;
    else this.dragBottomPos = position;
    this.updateGhostVisuals();
  }

  // Rails cannot cross each other.
  clampPosition(rail, position) {
    position = Math.max(0, Math.min(100, position));
    if (rail === 'top' && this.hasBottom) {
      return Math.max(position, this.currentBottomPos ?? 0);
    }
    if (rail === 'bottom' && this.hasTop) {
      return Math.min(position, this.currentTopPos ?? 100);
    }
    return position;
  }

  /* ------------------------------------------------------------------ *
   *  Taps, keyboard and actions
   * ------------------------------------------------------------------ */

  handleRailTap(rail) {
    const entity = this.entityFor(rail);
    const state = entity && this._hass ? this._hass.states[entity] : null;

    // A tap on a rail that is on its way somewhere is a stop request.
    if (this.config.stop_on_tap !== false && state &&
        (state.state === 'opening' || state.state === 'closing')) {
      this._hass.callService('cover', 'stop_cover', { entity_id: entity });
      this.haptic('medium');
      return;
    }
    this.runAction(this.config.tap_action, entity);
  }

  handleTrackTap(clientY) {
    if (this.config.tap_to_position === false) {
      this.runAction(this.config.tap_action, this.primaryEntity());
      return;
    }
    const rail = this.pickRail(clientY);
    if (!rail || !this.entityFor(rail)) return;

    const rect = this.container.getBoundingClientRect();
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    this.commit(rail, this.clampPosition(rail, Math.round(100 - (y / rect.height) * 100)));
  }

  onRailKeyDown(e, rail) {
    if (!this.entityFor(rail)) return;
    const current = this.positionFor(rail);
    let next;

    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight': next = current + 1; break;
      case 'ArrowDown':
      case 'ArrowLeft': next = current - 1; break;
      case 'PageUp': next = current + 10; break;
      case 'PageDown': next = current - 10; break;
      case 'Home': next = 100; break;
      case 'End': next = 0; break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.handleRailTap(rail);
        return;
      default: return;
    }

    e.preventDefault();
    next = this.clampPosition(rail, next);
    if (next === current) return;

    // Move now, send once the user stops pressing keys.
    if (rail === 'top') { this.currentTopPos = next; this.optimisticTop = next; }
    else { this.currentBottomPos = next; this.optimisticBottom = next; }
    this.optimisticTimeout = Date.now() + OPTIMISTIC_MS;
    this.updateVisuals();

    clearTimeout(this._keyTimer);
    this._keyTimer = setTimeout(() => this.callSetPosition(rail, next), KEY_COMMIT_MS);
  }

  commit(rail, position) {
    if (rail === 'top') { this.currentTopPos = position; this.optimisticTop = position; }
    else { this.currentBottomPos = position; this.optimisticBottom = position; }
    // Hold the commanded position briefly so the card does not snap back while
    // the motor is still reporting its old spot.
    this.optimisticTimeout = Date.now() + OPTIMISTIC_MS;
    this.updateVisuals();
    this.callSetPosition(rail, position);
    this.haptic('light');
  }

  callSetPosition(rail, position) {
    const entity = this.entityFor(rail);
    if (!entity || !this._hass) return;
    this._hass.callService('cover', 'set_cover_position', {
      entity_id: entity,
      position: position,
    });
  }

  runAction(actionConfig, entityId) {
    const cfg = actionConfig || DEFAULT_TAP_ACTION;
    const action = cfg.action || 'more-info';
    const target = cfg.entity || entityId;

    switch (action) {
      case 'none':
        return;
      case 'more-info':
        if (target) fireEvent(this, 'hass-more-info', { entityId: target });
        return;
      case 'toggle':
        if (target && this._hass) {
          this._hass.callService('homeassistant', 'toggle', { entity_id: target });
        }
        return;
      case 'navigate':
        if (!cfg.navigation_path) return;
        history.pushState(null, '', cfg.navigation_path);
        fireEvent(window, 'location-changed', { replace: false });
        return;
      case 'url':
        if (cfg.url_path) window.open(cfg.url_path, cfg.new_tab === false ? '_self' : '_blank');
        return;
      case 'call-service':
      case 'perform-action': {
        const service = cfg.perform_action || cfg.service;
        if (!service || !this._hass) return;
        const [domain, name] = service.split('.', 2);
        if (!domain || !name) return;
        this._hass.callService(domain, name, cfg.data || cfg.service_data || {}, cfg.target);
        return;
      }
      default:
        console.warn(`levitate-blinds-card: unsupported action "${action}"`);
    }
  }

  haptic(type) {
    try {
      fireEvent(window, 'haptic', type, { composed: false });
    } catch (err) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ *
   *  State
   * ------------------------------------------------------------------ */

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;

    if (!this.hasTop && !this.hasBottom) {
      this.container.style.display = 'none';
      this.showError('Please configure at least one blind entity.');
      return;
    }
    this.container.style.display = 'block';

    const topState = this.hasTop ? hass.states[this.config.top_entity] : null;
    const bottomState = this.hasBottom ? hass.states[this.config.bottom_entity] : null;

    if ((this.hasTop && !topState) || (this.hasBottom && !bottomState)) {
      this.showError('Entity not found. Check entity IDs.');
      return;
    }
    this.clearError();

    this.railTop.classList.toggle('moving',
      !!topState && (topState.state === 'opening' || topState.state === 'closing'));
    this.railBottom.classList.toggle('moving',
      !!bottomState && (bottomState.state === 'opening' || bottomState.state === 'closing'));

    if (this.isDragging) return;

    const realTop = topState ? (topState.attributes.current_position ?? 0) : 100;
    const realBottom = bottomState ? (bottomState.attributes.current_position ?? 0) : 0;

    if (this.optimisticTimeout && Date.now() < this.optimisticTimeout) {
      this.currentTopPos = this.optimisticTop !== null ? this.optimisticTop : realTop;
      this.currentBottomPos = this.optimisticBottom !== null ? this.optimisticBottom : realBottom;

      // The motor caught up - drop the lock early.
      if ((this.optimisticTop === null || Math.abs(realTop - this.optimisticTop) <= 2) &&
          (this.optimisticBottom === null || Math.abs(realBottom - this.optimisticBottom) <= 2)) {
        this.optimisticTimeout = 0;
        this.optimisticTop = null;
        this.optimisticBottom = null;
        this.currentTopPos = realTop;
        this.currentBottomPos = realBottom;
      }
    } else {
      this.optimisticTimeout = 0;
      this.optimisticTop = null;
      this.optimisticBottom = null;
      this.currentTopPos = realTop;
      this.currentBottomPos = realBottom;
    }
    this.updateVisuals();
  }

  showError(message) {
    this.errorMsg.innerText = message;
    this.errorMsg.style.display = 'block';
  }

  clearError() {
    this.errorMsg.style.display = 'none';
  }

  updateVisuals() {
    const topY = this.hasTop ? (100 - (this.currentTopPos ?? 100)) : 0;
    const bottomY = this.hasBottom ? (100 - (this.currentBottomPos ?? 0)) : 100;

    this.placeRail(this.railTop, this.hitTop, this.hasTop, topY, this.currentTopPos ?? 100);
    this.placeRail(this.railBottom, this.hitBottom, this.hasBottom, bottomY, this.currentBottomPos ?? 0);

    const [minY, maxY] = this.fabricBounds(topY, bottomY);
    this.fabric.style.top = minY + "%";
    this.fabric.style.bottom = (100 - maxY) + "%";
  }

  placeRail(rail, hit, enabled, y, position) {
    if (!enabled) {
      rail.style.display = 'none';
      hit.style.display = 'none';
      return;
    }
    rail.style.display = 'flex';
    rail.style.top = y + '%';
    hit.style.display = 'block';
    hit.style.top = y + '%';
    hit.setAttribute('aria-valuenow', String(position));
    hit.setAttribute('aria-valuetext', `${position}% from the bottom`);
  }

  fabricBounds(topY, bottomY) {
    if (this.hasTop && this.hasBottom) return [Math.min(topY, bottomY), Math.max(topY, bottomY)];
    if (this.hasTop) return [topY, 100];
    return [0, bottomY];
  }

  updateGhostVisuals() {
    const dragTop = this.activeRail === 'top' ? this.dragTopPos : this.currentTopPos;
    const dragBottom = this.activeRail === 'bottom' ? this.dragBottomPos : this.currentBottomPos;

    const topY = this.hasTop ? (100 - (dragTop ?? 100)) : 0;
    const bottomY = this.hasBottom ? (100 - (dragBottom ?? 0)) : 100;

    if (this.activeRail === 'top' && this.hasTop) {
      this.railGhostTop.style.top = topY + "%";
    }
    if (this.activeRail === 'bottom' && this.hasBottom) {
      this.railGhostBottom.style.top = bottomY + "%";
    }

    const [minY, maxY] = this.fabricBounds(topY, bottomY);
    this.fabricGhost.style.top = minY + "%";
    this.fabricGhost.style.bottom = (100 - maxY) + "%";
  }

  disconnectedCallback() {
    clearTimeout(this._keyTimer);
    this.cancelPress();
    if (this._drag) {
      this.releaseCapture(this._drag);
      this._drag = null;
      this.activeRail = null;
    }
  }

  cardHeight() {
    const isSlim = !!this.config?.slim;
    // track + card padding + name row + gap
    return this.trackHeight() + (isSlim ? 24 + 18 + 8 : 40 + 26 + 16);
  }

  getCardSize() {
    return Math.max(2, Math.ceil(this.cardHeight() / 50));
  }

  getGridOptions() {
    const rows = Math.max(2, Math.ceil(this.cardHeight() / 56));
    return this.config?.slim
      ? { rows, columns: 3, min_rows: rows, min_columns: 2 }
      : { rows, columns: 6, min_rows: rows, min_columns: 3 };
  }
}

customElements.define('levitate-blinds-card', LevitateBlindsCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "levitate-blinds-card",
  name: "Levitate Blinds Card",
  description: "A specialized card for Top-Down Bottom-Up and single-motor blinds.",
  preview: true,
  documentationURL: "https://github.com/davemyers-dev/ha-smartwings-levitate"
});

console.info(
  `%c LEVITATE-BLINDS-CARD %c v${LEVITATE_BLINDS_CARD_VERSION} `,
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);
