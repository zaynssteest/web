/* Odyssey.cc CS:GO / CS2 Cheat Menu GUI
 * Inspired by Evalate / Neverlose / Skeet aesthetic
 * Floating, resizable, draggable box with custom background image support
 */
(function() {
  'use strict';

  var DEFAULT_BG = '/brand/bg-cheat.png';
  var STORAGE_KEY_BG = 'odyssey_cheat_bg';
  var STORAGE_KEY_CFG = 'odyssey_cheat_cfg';

  // Create stylesheet
  var css = `
    /* Odyssey Menu Root */
    #odyssey-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    #odyssey-container.active {
      pointer-events: auto;
    }

    /* Background image backdrop on login screen */
    #odyssey-backdrop {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      filter: brightness(0.4) contrast(1.1);
      transition: filter 0.3s ease, background-image 0.3s ease;
      z-index: 1;
    }
    #odyssey-backdrop-vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(14,13,20,0.4) 0%, rgba(9,9,12,0.85) 100%),
                  linear-gradient(to bottom, rgba(9,9,12,0.6) 0%, rgba(9,9,12,0.3) 50%, rgba(9,9,12,0.9) 100%);
      z-index: 2;
    }

    /* Floating background controls toolbar */
    #odyssey-bg-tools {
      position: absolute;
      bottom: 18px;
      right: 20px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(18,17,24,0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(203,169,249,0.18);
      padding: 6px 14px;
      border-radius: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      font-size: 11px;
      color: #b08ef4;
    }
    #odyssey-bg-tools label {
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: 500;
      color: #cba9f9;
      transition: color 0.15s;
    }
    #odyssey-bg-tools label:hover { color: #ffffff; }
    #odyssey-bg-tools button {
      background: transparent;
      border: none;
      color: #8b8a99;
      cursor: pointer;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    #odyssey-bg-tools button:hover { color: #ff6b6b; background: rgba(255,107,107,0.1); }

    /* The Main Floating Cheat Menu Window */
    #odyssey-window {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 860px;
      height: 560px;
      min-width: 680px;
      min-height: 440px;
      max-width: 95vw;
      max-height: 92vh;
      background: rgba(14, 13, 20, 0.94);
      backdrop-filter: blur(28px) saturate(180%);
      border: 1px solid rgba(203, 169, 249, 0.18);
      border-radius: 12px;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.85),
                  0 0 1px 1px rgba(203, 169, 249, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      z-index: 5;
      overflow: hidden;
      resize: both;
      user-select: none;
      animation: odysseyFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes odysseyFadeIn {
      from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
      to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    /* Top Titlebar */
    #odyssey-titlebar {
      height: 44px;
      background: rgba(20, 19, 28, 0.6);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      padding: 0 16px;
      cursor: move;
      flex-shrink: 0;
      gap: 16px;
    }
    .odyssey-logo-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: linear-gradient(135deg, #cba9f9 0%, #7c4dff 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 14px rgba(203, 169, 249, 0.5);
      color: #0e0d14;
      font-size: 13px;
      font-weight: 900;
    }
    .odyssey-breadcrumbs {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
    }
    .odyssey-bc-root { color: #8b8a99; }
    .odyssey-bc-sep { color: #5a5968; font-size: 10px; }
    .odyssey-bc-curr { color: #e2e1ec; font-weight: 600; }

    /* Search bar in header */
    .odyssey-search-wrap {
      flex: 1;
      max-width: 240px;
      position: relative;
      margin-left: auto;
    }
    .odyssey-search-input {
      width: 100%;
      height: 26px;
      background: rgba(26, 25, 36, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 0 10px 0 26px;
      font-size: 11px;
      color: #e2e1ec;
      outline: none;
      transition: all 0.2s;
    }
    .odyssey-search-input:focus {
      border-color: rgba(203, 169, 249, 0.4);
      background: rgba(30, 29, 42, 0.9);
      box-shadow: 0 0 10px rgba(203, 169, 249, 0.15);
    }
    .odyssey-search-icon {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      color: #6a6978;
      pointer-events: none;
    }

    /* Window Controls & Badges */
    .odyssey-badge-tag {
      font-size: 10px;
      color: #cba9f9;
      background: rgba(203, 169, 249, 0.12);
      border: 1px solid rgba(203, 169, 249, 0.25);
      padding: 2px 7px;
      border-radius: 4px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .odyssey-win-btns {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .odyssey-win-btn {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.15s;
    }
    .odyssey-win-btn:hover { opacity: 1; }
    .odyssey-win-close { background: #ff5f56; }
    .odyssey-win-min { background: #ffbd2e; }

    /* Main Menu Workspace */
    #odyssey-body {
      display: flex;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    /* Left Icon Sidebar */
    #odyssey-sidebar {
      width: 52px;
      background: rgba(16, 15, 23, 0.8);
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0;
      gap: 10px;
      flex-shrink: 0;
    }
    .odyssey-tab-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6d6c7d;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .odyssey-tab-btn:hover {
      color: #e2e1ec;
      background: rgba(255, 255, 255, 0.04);
    }
    .odyssey-tab-btn.active {
      color: #cba9f9;
      background: rgba(203, 169, 249, 0.12);
      box-shadow: 0 0 16px rgba(203, 169, 249, 0.2);
    }
    .odyssey-tab-btn.active::before {
      content: '';
      position: absolute;
      left: -8px;
      top: 8px;
      bottom: 8px;
      width: 3px;
      background: #cba9f9;
      border-radius: 0 2px 2px 0;
      box-shadow: 0 0 8px #cba9f9;
    }

    /* Content Area (Columns) */
    #odyssey-content {
      flex: 1;
      display: flex;
      padding: 14px 16px;
      gap: 14px;
      overflow-y: auto;
      overflow-x: hidden;
      min-width: 0;
    }
    .odyssey-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 220px;
    }
    .odyssey-column-inspector {
      width: 260px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Groups / Cards */
    .odyssey-card {
      background: rgba(18, 17, 26, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .odyssey-card-title {
      font-size: 10px;
      font-weight: 700;
      color: #6a6979;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Toggles & Options */
    .odyssey-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 24px;
      font-size: 12px;
      color: #d1d0dd;
      transition: color 0.15s;
    }
    .odyssey-row:hover { color: #ffffff; }
    .odyssey-row-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .odyssey-row-label { font-size: 12px; font-weight: 400; }
    .odyssey-row-sub { font-size: 9px; color: #6a6978; line-height: 1.2; }
    .odyssey-row-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Switch Component */
    .odyssey-switch {
      width: 32px;
      height: 16px;
      border-radius: 8px;
      background: #252433;
      position: relative;
      cursor: pointer;
      transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s;
      flex-shrink: 0;
    }
    .odyssey-switch::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #8b8a99;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s;
    }
    .odyssey-switch.on {
      background: #7c4dff;
      box-shadow: 0 0 10px rgba(124, 77, 255, 0.5);
    }
    .odyssey-switch.on::after {
      transform: translateX(16px);
      background: #ffffff;
    }

    /* Pill buttons (...) */
    .odyssey-btn-dots {
      color: #5a5969;
      font-size: 11px;
      cursor: pointer;
      padding: 0 4px;
      border-radius: 4px;
      transition: color 0.15s;
    }
    .odyssey-btn-dots:hover { color: #cba9f9; }

    /* Dropdowns */
    .odyssey-select {
      background: rgba(26, 25, 36, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 5px;
      padding: 3px 8px;
      color: #cba9f9;
      font-size: 11px;
      outline: none;
      cursor: pointer;
    }
    .odyssey-select option { background: #161522; color: #e2e1ec; }

    /* Sliders */
    .odyssey-slider-wrap {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 0;
    }
    .odyssey-slider-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #b0afbe;
    }
    .odyssey-slider-val {
      color: #cba9f9;
      font-weight: 600;
      font-size: 11px;
    }
    .odyssey-range {
      -webkit-appearance: none;
      width: 100%;
      height: 3px;
      border-radius: 2px;
      background: #252433;
      outline: none;
      cursor: pointer;
    }
    .odyssey-range::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: #cba9f9;
      box-shadow: 0 0 8px #cba9f9;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .odyssey-range::-webkit-slider-thumb:hover { transform: scale(1.25); }

    /* Inspector Card Specifics */
    .odyssey-curve-canvas {
      width: 100%;
      height: 90px;
      background: rgba(14, 13, 20, 0.8);
      border: 1px solid rgba(203, 169, 249, 0.12);
      border-radius: 6px;
      display: block;
      cursor: crosshair;
    }

    /* Color Picker Widget */
    .odyssey-color-picker {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .odyssey-color-box {
      width: 100%;
      height: 70px;
      border-radius: 6px;
      cursor: crosshair;
      position: relative;
    }
    .odyssey-color-hue {
      width: 100%;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
      cursor: pointer;
    }
    .odyssey-color-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 10px;
      color: #8b8a99;
      margin-top: 2px;
    }
    .odyssey-color-hex-tag {
      background: rgba(26, 25, 36, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: #cba9f9;
      font-family: monospace;
      font-size: 10px;
    }
    .odyssey-color-swatch-prev {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      background: #cba9f9;
      box-shadow: 0 0 8px rgba(203,169,249,0.5);
    }

    /* Scrollbar */
    #odyssey-content::-webkit-scrollbar { width: 4px; }
    #odyssey-content::-webkit-scrollbar-track { background: transparent; }
    #odyssey-content::-webkit-scrollbar-thumb { background: rgba(203, 169, 249, 0.2); border-radius: 2px; }
    #odyssey-content::-webkit-scrollbar-thumb:hover { background: rgba(203, 169, 249, 0.4); }

    /* Resize handle indicator bottom-right */
    .odyssey-resize-grip {
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 10px;
      height: 10px;
      pointer-events: none;
      opacity: 0.35;
      background: linear-gradient(135deg, transparent 50%, #cba9f9 50%);
    }
  `;

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Template HTML for the Cheat Menu Window
  var html = `
    <div id="odyssey-backdrop"></div>
    <div id="odyssey-backdrop-vignette"></div>

    <div id="odyssey-bg-tools">
      <label for="odyssey-file-upload">🖼️ Change Background</label>
      <input type="file" id="odyssey-file-upload" accept="image/*" style="display:none">
      <button id="odyssey-bg-reset" title="Reset to default background">Reset</button>
    </div>

    <div id="odyssey-window">
      <!-- Top Titlebar -->
      <div id="odyssey-titlebar">
        <div class="odyssey-logo-icon">𝝮</div>
        <div class="odyssey-breadcrumbs">
          <span class="odyssey-bc-root">Odyssey</span>
          <span class="odyssey-bc-sep">›</span>
          <span class="odyssey-bc-curr" id="odyssey-bc-label">Rage</span>
        </div>

        <div class="odyssey-search-wrap">
          <span class="odyssey-search-icon">🔍</span>
          <input type="text" class="odyssey-search-input" id="odyssey-search" placeholder="Search for modules...">
        </div>

        <span class="odyssey-badge-tag">odyssey.cc Beta</span>

        <div class="odyssey-win-btns">
          <button class="odyssey-win-btn odyssey-win-min" id="odyssey-btn-min" title="Minimize"></button>
          <button class="odyssey-win-btn odyssey-win-close" id="odyssey-btn-close" title="Close (Press INS to reopen)"></button>
        </div>
      </div>

      <!-- Main Body -->
      <div id="odyssey-body">
        <!-- Sidebar Navigation -->
        <div id="odyssey-sidebar">
          <div class="odyssey-tab-btn active" data-tab="rage" title="Rage Aimbot">🎯</div>
          <div class="odyssey-tab-btn" data-tab="antiaim" title="Anti-Aim">🛡️</div>
          <div class="odyssey-tab-btn" data-tab="visuals" title="Visuals / ESP">👁️</div>
          <div class="odyssey-tab-btn" data-tab="misc" title="Misc & Movement">⚡</div>
          <div class="odyssey-tab-btn" data-tab="skins" title="Skins">🎨</div>
          <div class="odyssey-tab-btn" data-tab="settings" title="Settings & Config">⚙️</div>
        </div>

        <!-- Content Area -->
        <div id="odyssey-content">
          <!-- Column 1: Targeting & Exploits -->
          <div class="odyssey-column">
            <div class="odyssey-card" data-cat="targeting">
              <div class="odyssey-card-title">Targeting</div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Silent Aim</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Auto Fire</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Auto Wall</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Automatic Scope</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
            </div>

            <div class="odyssey-card" data-cat="exploits">
              <div class="odyssey-card-title">Accuracy & Exploits</div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Double Tap</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Hide Shots</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Quick Stop</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Multipoint Hitbox</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Damage Override</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Hitchance Override</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
            </div>

            <div class="odyssey-card" data-cat="safety">
              <div class="odyssey-card-title">Safety</div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Safe Points</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Dynamic Hitboxes</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Delay Shot</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 2: Anti-Aim & Desync -->
          <div class="odyssey-column">
            <div class="odyssey-card" data-cat="antiaim">
              <div class="odyssey-card-title">Anti-Aim</div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Pitch Angle</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Yaw Base</span>
                <div class="odyssey-row-right">
                  <select class="odyssey-select">
                    <option>Backward</option>
                    <option>Forward</option>
                    <option>Spinbot</option>
                  </select>
                </div>
              </div>
              <div class="odyssey-row">
                <div class="odyssey-row-left">
                  <span class="odyssey-row-label">Desync Inverter</span>
                  <span class="odyssey-row-sub">Offsets horizontal body angle while airborne.</span>
                </div>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Fake Lag</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Slow Walk</span>
                <div class="odyssey-row-right">
                  <span class="odyssey-btn-dots">•••</span>
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Subtick Deflection</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
            </div>

            <div class="odyssey-card" data-cat="angles">
              <div class="odyssey-card-title">Angles & Desync</div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Roll Angle</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Edge Detection</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Freestanding</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Manual Direction</span>
                <div class="odyssey-row-right">
                  <select class="odyssey-select">
                    <option>Automatic</option>
                    <option>Keybind</option>
                  </select>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Air Angles</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Extended Limits</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
              <div class="odyssey-row">
                <span class="odyssey-row-label">Micro Movement</span>
                <div class="odyssey-row-right">
                  <div class="odyssey-switch on" onclick="this.classList.toggle('on')"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Column 3: Floating Sub-Inspector (Matching Screenshot Right Panel) -->
          <div class="odyssey-column-inspector">
            <div class="odyssey-card">
              <div class="odyssey-card-title">
                <span>Pitch Override</span>
                <span class="odyssey-btn-dots">•••</span>
              </div>

              <!-- Air Yaw Slider -->
              <div class="odyssey-slider-wrap">
                <div class="odyssey-slider-header">
                  <span>Air Yaw Offset <span style="color:#cba9f9">▲</span></span>
                  <span class="odyssey-slider-val" id="ody-val-airyaw">65.4%</span>
                </div>
                <input type="range" class="odyssey-range" min="0" max="100" value="65.4" step="0.1"
                  oninput="document.getElementById('ody-val-airyaw').textContent=this.value+'%'">
              </div>

              <!-- Activation Trigger Dropdown -->
              <div class="odyssey-row" style="margin-top:4px">
                <span class="odyssey-row-label">Activation Trigger</span>
                <select class="odyssey-select">
                  <option>Jumping</option>
                  <option>Falling</option>
                  <option>Standing</option>
                </select>
              </div>

              <!-- Invert on Land -->
              <div class="odyssey-row">
                <span class="odyssey-row-label">Invert On Land</span>
                <span class="odyssey-btn-dots">•••</span>
              </div>

              <!-- Subtick Offset Input -->
              <div class="odyssey-row">
                <span class="odyssey-row-label">Subtick Offset <span style="color:#cba9f9">▲</span></span>
                <input type="text" style="width:90px;height:20px;background:#1a1924;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#cba9f9;font-size:10px;padding:0 6px;text-align:right" value="0.045 ms">
              </div>

              <!-- Transition Curve Editor -->
              <div style="margin-top:6px">
                <div class="odyssey-card-title" style="margin-bottom:6px">Transition Curve</div>
                <canvas id="odyssey-curve-canvas" class="odyssey-curve-canvas"></canvas>
              </div>

              <!-- Visual Indicator Color Picker -->
              <div style="margin-top:6px" class="odyssey-color-picker">
                <div class="odyssey-card-title">Visual Indicator</div>
                <canvas id="odyssey-color-box" class="odyssey-color-box"></canvas>
                <div id="odyssey-color-hue" class="odyssey-color-hue"></div>
                <div class="odyssey-color-footer">
                  <div style="display:flex;align-items:center;gap:6px">
                    <div id="odyssey-color-prev" class="odyssey-color-swatch-prev"></div>
                    <span id="odyssey-color-hex" class="odyssey-color-hex-tag">#CBA9F9</span>
                  </div>
                  <span style="font-size:9px;color:#6a6979">ALPHA: 100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="odyssey-resize-grip"></div>
    </div>
  `;

  // Inject into DOM
  var root = document.createElement('div');
  root.id = 'odyssey-container';
  root.className = 'active';
  root.innerHTML = html;
  document.body.appendChild(root);

  // Background Image Handling
  var backdrop = document.getElementById('odyssey-backdrop');
  var savedBg = localStorage.getItem(STORAGE_KEY_BG) || DEFAULT_BG;
  backdrop.style.backgroundImage = 'url("' + savedBg + '")';

  var uploadInput = document.getElementById('odyssey-file-upload');
  uploadInput.addEventListener('change', function() {
    var file = uploadInput.files[0];
    if (file) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var dataUrl = e.target.result;
        backdrop.style.backgroundImage = 'url("' + dataUrl + '")';
        try { localStorage.setItem(STORAGE_KEY_BG, dataUrl); } catch(err) {}
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('odyssey-bg-reset').addEventListener('click', function() {
    backdrop.style.backgroundImage = 'url("' + DEFAULT_BG + '")';
    localStorage.removeItem(STORAGE_KEY_BG);
  });

  // Drag and Drop Image onto window/backdrop
  window.addEventListener('dragover', function(e) { e.preventDefault(); });
  window.addEventListener('drop', function(e) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      var file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          backdrop.style.backgroundImage = 'url("' + ev.target.result + '")';
          try { localStorage.setItem(STORAGE_KEY_BG, ev.target.result); } catch(err) {}
        };
        reader.readAsDataURL(file);
      }
    }
  });

  // Draggable Window Logic
  var win = document.getElementById('odyssey-window');
  var titlebar = document.getElementById('odyssey-titlebar');
  var isDragging = false;
  var dragOffsetX = 0, dragOffsetY = 0;

  titlebar.addEventListener('mousedown', function(e) {
    if (e.target.closest('.odyssey-search-wrap') || e.target.closest('.odyssey-win-btns')) return;
    isDragging = true;
    var rect = win.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    win.style.transform = 'none';
    win.style.left = rect.left + 'px';
    win.style.top = rect.top + 'px';
  });

  window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var x = e.clientX - dragOffsetX;
    var y = e.clientY - dragOffsetY;
    var maxX = window.innerWidth - 100;
    var maxY = window.innerHeight - 60;
    x = Math.max(10, Math.min(x, maxX));
    y = Math.max(10, Math.min(y, maxY));
    win.style.left = x + 'px';
    win.style.top = y + 'px';
  });

  window.addEventListener('mouseup', function() {
    isDragging = false;
  });

  // Window Controls
  var isMin = false;
  var origHeight = '560px';
  document.getElementById('odyssey-btn-min').addEventListener('click', function() {
    if (!isMin) {
      origHeight = win.style.height || '560px';
      win.style.height = '44px';
      win.style.resize = 'none';
      document.getElementById('odyssey-body').style.display = 'none';
      isMin = true;
    } else {
      win.style.height = origHeight;
      win.style.resize = 'both';
      document.getElementById('odyssey-body').style.display = 'flex';
      isMin = false;
    }
  });

  document.getElementById('odyssey-btn-close').addEventListener('click', function() {
    win.style.display = 'none';
  });

  // Toggle with INSERT key
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Insert') {
      win.style.display = (win.style.display === 'none') ? 'flex' : 'none';
    }
  });

  // Sidebar Tab Switching & Breadcrumbs
  var tabButtons = document.querySelectorAll('.odyssey-tab-btn');
  var bcLabel = document.getElementById('odyssey-bc-label');
  var tabNames = {
    rage: 'Rage',
    antiaim: 'Anti-Aim',
    visuals: 'Visuals',
    misc: 'Misc',
    skins: 'Skins',
    settings: 'Settings'
  };

  tabButtons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      tabButtons.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var tabKey = btn.getAttribute('data-tab');
      bcLabel.textContent = tabNames[tabKey] || 'Rage';
    });
  });

  // Search Filter
  var searchInput = document.getElementById('odyssey-search');
  searchInput.addEventListener('input', function() {
    var query = searchInput.value.toLowerCase().trim();
    var rows = document.querySelectorAll('.odyssey-row');
    rows.forEach(function(row) {
      var text = row.textContent.toLowerCase();
      if (!query || text.includes(query)) {
        row.style.display = 'flex';
      } else {
        row.style.display = 'none';
      }
    });
  });

  // Transition Curve Interactive Canvas
  function initCurveEditor() {
    var cv = document.getElementById('odyssey-curve-canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var dpr = window.devicePixelRatio || 1;

    function resize() {
      var w = cv.clientWidth;
      var h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    resize();

    // Cubic bezier control points: P0=(0,h), P1, P2, P3=(w,0)
    var p1x = 0.25, p1y = 0.8;
    var p2x = 0.75, p2y = 0.2;

    function draw() {
      var w = cv.clientWidth;
      var h = cv.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (var x = 0; x < w; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (var y = 0; y < h; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Curve Area Gradient
      var grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(203, 169, 249, 0.25)');
      grad.addColorStop(1, 'rgba(124, 77, 255, 0.02)');

      var cp1x = p1x * w, cp1y = p1y * h;
      var cp2x = p2x * w, cp2y = p2y * h;

      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, w, 0);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Main Curve Stroke
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, w, 0);
      ctx.strokeStyle = '#cba9f9';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#cba9f9';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Handle lines & points
      ctx.strokeStyle = 'rgba(203, 169, 249, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(cp1x, cp1y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w, 0); ctx.lineTo(cp2x, cp2y); ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cp1x, cp1y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cp2x, cp2y, 4, 0, Math.PI * 2); ctx.fill();
    }
    draw();

    var draggingPoint = 0;
    cv.addEventListener('mousedown', function(e) {
      var rect = cv.getBoundingClientRect();
      var mx = (e.clientX - rect.left) / cv.clientWidth;
      var my = (e.clientY - rect.top) / cv.clientHeight;
      var d1 = Math.hypot(mx - p1x, my - p1y);
      var d2 = Math.hypot(mx - p2x, my - p2y);
      if (d1 < 0.15) draggingPoint = 1;
      else if (d2 < 0.15) draggingPoint = 2;
      else draggingPoint = 1;
    });
    window.addEventListener('mousemove', function(e) {
      if (!draggingPoint) return;
      var rect = cv.getBoundingClientRect();
      var mx = Math.max(0, Math.min(1, (e.clientX - rect.left) / cv.clientWidth));
      var my = Math.max(0, Math.min(1, (e.clientY - rect.top) / cv.clientHeight));
      if (draggingPoint === 1) { p1x = mx; p1y = my; }
      else if (draggingPoint === 2) { p2x = mx; p2y = my; }
      draw();
    });
    window.addEventListener('mouseup', function() { draggingPoint = 0; });
  }

  // Interactive Color Picker
  function initColorPicker() {
    var box = document.getElementById('odyssey-color-box');
    var hue = document.getElementById('odyssey-color-hue');
    var prev = document.getElementById('odyssey-color-prev');
    var hexTag = document.getElementById('odyssey-color-hex');
    if (!box || !hue) return;

    var currentHue = 270;
    var currentSat = 0.32;
    var currentVal = 0.98;

    function renderBox() {
      var ctx = box.getContext('2d');
      var w = box.clientWidth, h = box.clientHeight;
      box.width = w; box.height = h;

      ctx.fillStyle = 'hsl(' + currentHue + ', 100%, 50%)';
      ctx.fillRect(0, 0, w, h);

      var whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
      whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
      whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = whiteGrad;
      ctx.fillRect(0, 0, w, h);

      var blackGrad = ctx.createLinearGradient(0, 0, 0, h);
      blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
      blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = blackGrad;
      ctx.fillRect(0, 0, w, h);

      // Current point handle
      var px = currentSat * w;
      var py = (1 - currentVal) * h;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    renderBox();

    function updateColor() {
      // HSV to HEX
      var h = currentHue / 360, s = currentSat, v = currentVal;
      var r, g, b, i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
      }
      var hex = '#' + [r, g, b].map(function(x) {
        var str = Math.round(x * 255).toString(16);
        return str.length === 1 ? '0' + str : str;
      }).join('').toUpperCase();

      prev.style.background = hex;
      prev.style.boxShadow = '0 0 10px ' + hex + '88';
      hexTag.textContent = hex;
      renderBox();
    }

    var isPickingBox = false;
    box.addEventListener('mousedown', function(e) {
      isPickingBox = true;
      var rect = box.getBoundingClientRect();
      currentSat = Math.max(0, Math.min(1, (e.clientX - rect.left) / box.clientWidth));
      currentVal = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / box.clientHeight));
      updateColor();
    });
    window.addEventListener('mousemove', function(e) {
      if (!isPickingBox) return;
      var rect = box.getBoundingClientRect();
      currentSat = Math.max(0, Math.min(1, (e.clientX - rect.left) / box.clientWidth));
      currentVal = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / box.clientHeight));
      updateColor();
    });
    window.addEventListener('mouseup', function() { isPickingBox = false; });

    var isPickingHue = false;
    hue.addEventListener('mousedown', function(e) {
      isPickingHue = true;
      var rect = hue.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / hue.clientWidth));
      currentHue = pct * 360;
      updateColor();
    });
    window.addEventListener('mousemove', function(e) {
      if (!isPickingHue) return;
      var rect = hue.getBoundingClientRect();
      var pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / hue.clientWidth));
      currentHue = pct * 360;
      updateColor();
    });
    window.addEventListener('mouseup', function() { isPickingHue = false; });
  }

  // Initialize interactive elements once visible
  setTimeout(function() {
    initCurveEditor();
    initColorPicker();
  }, 100);

  // Show/Hide based on route
  function syncRoute() {
    var path = window.location.pathname;
    // Show on login or root when auth is pending
    var isAuthPage = (path === '/' || path === '/login' || path === '/register' || path === '/forgot');
    if (isAuthPage) {
      root.style.display = 'block';
    } else {
      root.style.display = 'none';
    }
  }

  var pushState = history.pushState;
  history.pushState = function() {
    pushState.apply(history, arguments);
    syncRoute();
  };
  window.addEventListener('popstate', syncRoute);
  syncRoute();
})();
