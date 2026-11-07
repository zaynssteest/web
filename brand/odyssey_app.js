/* ==============================================================================
 * Odyssey.cc — Core Client Application & CS2 Cheat Menu Suite
 * 1. Immediate Network Silencer (zero RSC prefetch leaks in DevTools)
 * 2. Canvas Eye Animation (60fps ASCII eye -> odyssey.cc -> black hold -> slow fade)
 * 3. CS:GO / CS2 Cheat Menu GUI (Draggable, Resizable, Evalate/Neverlose Layout)
 * 4. Welcome Screen with Live Interactive 60fps Feature Simulation
 * 5. Full Screen Tabs (Welcome, Rage, Anti-Aim, Visuals, Misc, Skins, Settings)
 * 6. Floating Inspector & Color Picker matching reference images
 * 7. Atmospheric Wallpaper & Drag-and-Drop Image Uploader
 * ============================================================================== */

(function () {
  'use strict';

  // ── 0. IMMEDIATE RSC & NETWORK PREFETCH SILENCER ─────────────────────────────
  var _origFetch = window.fetch;
  if (_origFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var isRsc = url.indexOf('_rsc') !== -1 ||
                  url.indexOf('/login?_rsc') !== -1 ||
                  url.indexOf('/register?_rsc') !== -1 ||
                  url.indexOf('/forgot?_rsc') !== -1;
      if (!isRsc && init && init.headers) {
        var h = init.headers;
        if (h['RSC'] || h['Next-Router-Prefetch'] || h['Next-Router-State-Tree']) {
          isRsc = true;
        }
      }
      if (isRsc) {
        return Promise.resolve(new Response('', {
          status: 200,
          headers: {
            'Content-Type': 'text/x-component',
            'Cache-Control': 'public, max-age=31536000, immutable'
          }
        }));
      }
      return _origFetch.apply(this, arguments);
    };
  }

  // Intercept XHR
  var _origXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === 'string' && (url.indexOf('_rsc') !== -1 || url.indexOf('rsc=') !== -1)) {
      this._blocked = true;
    }
    return _origXHROpen.apply(this, arguments);
  };
  var _origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this._blocked) return;
    return _origXHRSend.apply(this, arguments);
  };

  // Remove prefetch links
  var _linkObs = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      for (var j = 0; j < muts[i].addedNodes.length; j++) {
        var n = muts[i].addedNodes[j];
        if (n.nodeName === 'LINK' && n.rel === 'prefetch') {
          var h = n.href || '';
          if (h.indexOf('_rsc') !== -1 || h.indexOf('/login') !== -1 || h.indexOf('/register') !== -1 || h.indexOf('/forgot') !== -1) {
            if (n.parentNode) n.parentNode.removeChild(n);
          }
        }
      }
    }
  });
  if (document.documentElement) {
    _linkObs.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ── 1. REAL-TIME CANVAS EYE INTRO ANIMATION ─────────────────────────────────
  function startIntroAnimation(onComplete) {
    var overlay = document.createElement('div');
    overlay.id = 'odyssey-intro-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:#090909;z-index:9999999;user-select:none;cursor:pointer;';

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
    overlay.appendChild(canvas);

    var skipHint = document.createElement('div');
    skipHint.style.cssText = 'position:absolute;bottom:24px;right:28px;font-family:monospace;font-size:10.5px;color:rgba(176,142,244,0.35);letter-spacing:2px;text-transform:uppercase;pointer-events:none;';
    skipHint.textContent = 'CLICK OR SPACE TO SKIP';
    overlay.appendChild(skipHint);

    document.body.appendChild(overlay);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    var ended = false, raf = 0;

    function finish() {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKey);
      overlay.removeEventListener('click', finish);

      // Slower, smoother atmospheric fade into the menu (1.6s)
      overlay.style.transition = 'opacity 1.6s cubic-bezier(0.2, 0.8, 0.2, 1)';
      overlay.style.opacity = '0';
      setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (onComplete) onComplete();
      }, 1650);
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') finish();
    }
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('click', finish);

    var t0 = performance.now();
    // Total animation: 6.8s (allows longer hold of pure black after odyssey.cc text resolves)
    var duration = 6.8;

    function loop(now) {
      if (ended) return;
      var t = (now - t0) / 1000;
      var frameNo = Math.floor(t * 30);
      var size = Math.max(8, Math.min(12, Math.round(w / 110)));
      var tall = h > w * 1.1;

      ctx.fillStyle = '#090909';
      ctx.fillRect(0, 0, w, h);

      if (window.Paranoia && window.Paranoia.drawEyeChars && window.Paranoia.drawName) {
        // Master alpha: text fades out smoothly by t = 5.0, then stays pure black until 6.8s
        var master = Math.min(1, Math.max(0, (t - 0.05) / 0.65)) *
                     (1 - Math.min(1, Math.max(0, (t - 4.9) / 0.45)));

        var e = window.Paranoia.eyeState('calm', t + 0.5);
        var open = Math.min(1, Math.max(0, (t - 0.2) / 1.0)) *
                   (1 - Math.min(1, Math.max(0, (t - 2.8) / 0.6)));
        e.open *= open;
        var shatter = Math.min(1, Math.max(0, (t - 2.7) / 0.9));
        var scanY = ((t * 0.42) % 1.25) * h - 0.1 * h;

        if (open > 0.01 && shatter < 0.999) {
          window.Paranoia.drawEyeChars(ctx, w, h, e, {
            cell: size,
            share: 0.9,
            master: master,
            shatter: shatter,
            cy: tall ? h * 0.35 : h * 0.5,
            scanY: scanY
          });
        }

        // odyssey.cc name resolves between t = 3.0 and 4.6
        var resolveName = Math.min(1, Math.max(0, (t - 3.0) / 1.4));
        if (resolveName > 0.001) {
          window.Paranoia.drawName(ctx, w, h, size, tall ? h * 0.62 : h * 0.5, {
            resolve: resolveName,
            master: master,
            frame: frameNo,
            sweep: t > 4.4 ? (t - 4.4) / 0.5 * 70 - 5 : -1
          }, tall, 0.82);
        }
      }

      if (t >= duration) {
        finish();
        return;
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
  }

  // ── 2. CS:GO / CS2 CHEAT MENU GUI ─────────────────────────────────────────────
  function initCheatMenu() {
    if (document.getElementById('odyssey-cheat-gui')) return;

    var DEFAULT_BG = '/brand/bg-clean.png';
    var STORAGE_KEY_BG = 'odyssey_wallpaper';

    /* ─── SCOPED CSS STYLING ─── */
    var style = document.createElement('style');
    style.id = 'odyssey-cheat-style';
    style.textContent = `
      * { box-sizing: border-box; }

      #odyssey-cheat-gui {
        position: fixed; inset: 0; z-index: 99999;
        pointer-events: none; user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
        font-size: 12px; color: #d0cfee;
      }
      #odyssey-cheat-gui.active { pointer-events: auto; }

      /* Fullscreen Wallpaper */
      #ody-wallpaper {
        position: absolute; inset: 0;
        background-size: cover; background-position: center; background-repeat: no-repeat;
        transition: background-image 0.25s ease;
      }
      #ody-wall-overlay {
        position: absolute; inset: 0;
        background: radial-gradient(circle at 50% 35%, rgba(14, 13, 24, 0.32) 0%, rgba(9, 8, 14, 0.84) 100%),
                    linear-gradient(180deg, rgba(9, 8, 14, 0.4) 0%, rgba(9, 8, 14, 0.85) 100%);
      }

      /* Floating Wallpaper Pill Toolbar */
      #ody-wall-tools {
        position: absolute; bottom: 20px; right: 24px; z-index: 10;
        display: flex; align-items: center; gap: 10px;
        background: rgba(16, 15, 25, 0.88); backdrop-filter: blur(20px);
        border: 1px solid rgba(203, 169, 249, 0.16); padding: 6px 14px;
        border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.65);
      }
      #ody-wall-tools label {
        cursor: pointer; display: flex; align-items: center; gap: 6px;
        font-size: 11px; font-weight: 500; color: #d2c1fa; transition: color .15s;
      }
      #ody-wall-tools label:hover { color: #ffffff; }
      #ody-wall-tools button {
        background: none; border: none; color: #7a7989; cursor: pointer;
        font-size: 11px; padding: 2px 6px; border-radius: 4px; transition: all .15s;
      }
      #ody-wall-tools button:hover { color: #ff6b6b; background: rgba(255,107,107,0.12); }

      /* ── Main Cheat Menu Window ── */
      #ody-window {
        position: absolute; top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 940px; height: 585px;
        min-width: 740px; min-height: 440px;
        max-width: 96vw; max-height: 94vh;
        background: rgba(14, 13, 22, 0.96);
        backdrop-filter: blur(28px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.075);
        border-radius: 12px;
        box-shadow: 0 32px 100px rgba(0, 0, 0, 0.95),
                    0 0 0 1px rgba(203, 169, 249, 0.12),
                    inset 0 1px 0 rgba(255, 255, 255, 0.08);
        display: flex; flex-direction: column; z-index: 5;
        overflow: hidden; resize: both;
        animation: odyWinPop 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes odyWinPop {
        from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
        to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }

      /* Titlebar */
      #ody-titlebar {
        height: 44px;
        background: rgba(12, 11, 18, 0.98);
        border-bottom: 1px solid rgba(255, 255, 255, 0.055);
        display: flex; align-items: center; padding: 0 14px 0 12px;
        cursor: move; gap: 12px; flex-shrink: 0;
      }
      .ody-logo {
        width: 26px; height: 26px; border-radius: 7px; flex-shrink: 0;
        background: linear-gradient(135deg, #c4a5f7 0%, #7c3aff 100%);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 12px rgba(203, 169, 249, 0.45);
        color: #fff; font-size: 13px; font-weight: 900;
      }
      .ody-breadcrumb {
        display: flex; align-items: center; gap: 6px;
        font-size: 11.5px; font-weight: 500; color: #5a596c;
      }
      .ody-breadcrumb .root { color: #5a596c; display: flex; align-items: center; gap: 4px; }
      .ody-breadcrumb .sep  { color: #3e3d50; font-size: 9px; }
      .ody-breadcrumb .curr { color: #e2e1f2; font-weight: 600; }

      .ody-search-wrap {
        flex: 1; max-width: 220px; position: relative; margin-left: auto;
      }
      .ody-search-icon {
        position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
        font-size: 11px; color: #4e4d60; pointer-events: none;
      }
      .ody-search-input {
        width: 100%; height: 25px;
        background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 5px; padding: 0 8px 0 24px;
        font-size: 11px; color: #d8d7e8; outline: none; font-family: inherit;
        transition: border-color .15s, box-shadow .15s;
      }
      .ody-search-input::placeholder { color: #3f3e50; }
      .ody-search-input:focus {
        border-color: rgba(203, 169, 249, 0.4);
        box-shadow: 0 0 10px rgba(203, 169, 249, 0.15);
      }

      .ody-badge {
        font-size: 10px; color: #cba9f9; letter-spacing: .4px;
        background: rgba(203, 169, 249, 0.1); border: 1px solid rgba(203, 169, 249, 0.22);
        padding: 3px 8px; border-radius: 4px; font-weight: 600; white-space: nowrap;
      }
      .ody-grid-btn {
        width: 24px; height: 24px; border-radius: 5px; border: 1px solid rgba(255, 255, 255, 0.06);
        background: rgba(255, 255, 255, 0.03); display: flex; align-items: center; justify-content: center;
        color: #7a798d; cursor: pointer; transition: all .15s;
      }
      .ody-grid-btn:hover { color: #cba9f9; background: rgba(203, 169, 249, 0.1); border-color: rgba(203, 169, 249, 0.25); }

      /* Body Layout */
      #ody-body {
        display: flex; flex: 1; min-height: 0; overflow: hidden; position: relative;
      }

      /* Narrow icon sidebar */
      #ody-sidebar {
        width: 48px; flex-shrink: 0;
        background: rgba(11, 10, 17, 0.95);
        border-right: 1px solid rgba(255, 255, 255, 0.045);
        display: flex; flex-direction: column;
        align-items: center; padding: 12px 0; gap: 6px;
      }
      .ody-tab-btn {
        width: 36px; height: 36px; border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        color: #454458; cursor: pointer; position: relative;
        transition: color .18s, background .18s, box-shadow .18s;
      }
      .ody-tab-btn svg { width: 17px; height: 17px; fill: currentColor; }
      .ody-tab-btn:hover { color: #d0cfee; background: rgba(255, 255, 255, 0.04); }
      .ody-tab-btn.active {
        color: #cba9f9; background: rgba(203, 169, 249, 0.12);
        box-shadow: 0 0 14px rgba(203, 169, 249, 0.18);
      }
      .ody-tab-btn.active::before {
        content: ''; position: absolute; left: -6px; top: 8px; bottom: 8px;
        width: 2.5px; background: #cba9f9; border-radius: 0 2px 2px 0;
        box-shadow: 0 0 8px rgba(203, 169, 249, 0.7);
      }
      .ody-tooltip {
        position: absolute; left: 46px; top: 50%; transform: translateY(-50%);
        background: rgba(16, 15, 24, 0.96); border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 5px; padding: 4px 10px; font-size: 10.5px; color: #e0dff0;
        white-space: nowrap; pointer-events: none; opacity: 0;
        transition: opacity .12s; z-index: 100;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      }
      .ody-tab-btn:hover .ody-tooltip { opacity: 1; }

      /* Tab Content Views */
      #ody-content {
        flex: 1; display: flex; overflow: hidden; min-width: 0; position: relative;
      }
      .ody-view { flex: 1; display: none; overflow: hidden; }
      .ody-view.active { display: flex; }

      /* ── WELCOME VIEW ── */
      #ody-view-welcome { flex-direction: row; }
      .ody-welcome-left {
        width: 240px; flex-shrink: 0;
        background: rgba(12, 11, 18, 0.65);
        border-right: 1px solid rgba(255, 255, 255, 0.045);
        display: flex; flex-direction: column;
        padding: 16px 12px; gap: 4px; overflow-y: auto;
      }
      .ody-welcome-header {
        font-size: 9.5px; font-weight: 700; letter-spacing: 1.1px;
        text-transform: uppercase; color: #464558; padding: 0 6px; margin-bottom: 8px;
      }
      .ody-mod-card {
        display: flex; align-items: center; gap: 11px;
        padding: 9px 12px; border-radius: 8px; cursor: pointer;
        color: #727184; transition: all .18s; border: 1px solid transparent;
      }
      .ody-mod-card:hover { background: rgba(255, 255, 255, 0.035); color: #c4c3d8; }
      .ody-mod-card.active {
        background: rgba(203, 169, 249, 0.1); color: #cba9f9;
        border-color: rgba(203, 169, 249, 0.2);
        box-shadow: 0 0 14px rgba(203, 169, 249, 0.08);
      }
      .ody-mod-icon {
        width: 28px; height: 28px; border-radius: 6px;
        background: rgba(255, 255, 255, 0.045);
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; flex-shrink: 0;
      }
      .ody-mod-card.active .ody-mod-icon { background: rgba(203, 169, 249, 0.15); }
      .ody-mod-info { display: flex; flex-direction: column; gap: 1px; }
      .ody-mod-name { font-size: 12px; font-weight: 600; }
      .ody-mod-desc { font-size: 9.5px; color: #444356; line-height: 1.25; }
      .ody-mod-card.active .ody-mod-desc { color: #8575a6; }

      .ody-welcome-preview {
        flex: 1; display: flex; flex-direction: column; background: rgba(8, 7, 13, 0.85);
      }
      .ody-prev-hdr {
        height: 36px; border-bottom: 1px solid rgba(255, 255, 255, 0.045);
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 16px; flex-shrink: 0;
      }
      .ody-prev-title { font-size: 11px; font-weight: 600; color: #cba9f9; }
      .ody-prev-fps   { font-size: 10px; color: #4caf50; letter-spacing: .5px; font-weight: 600; }
      #ody-prev-cv { flex: 1; width: 100%; display: block; }

      /* ── TWO-COLUMN CHEAT MENU LAYOUT (Rage / Anti-Aim / Visuals) ── */
      .ody-cols { display: flex; flex: 1; overflow: hidden; }
      .ody-panel {
        flex: 1; display: flex; flex-direction: column;
        border-right: 1px solid rgba(255, 255, 255, 0.04);
        overflow-y: auto; min-width: 200px; padding: 6px 0;
      }
      .ody-panel:last-child { border-right: none; }
      .ody-panel::-webkit-scrollbar { width: 3px; }
      .ody-panel::-webkit-scrollbar-thumb { background: rgba(203, 169, 249, 0.14); border-radius: 2px; }

      .ody-gh {
        font-size: 9px; font-weight: 700; letter-spacing: 1.3px;
        text-transform: uppercase; color: #424155;
        padding: 10px 14px 4px; margin-top: 2px;
      }

      /* Module Row */
      .ody-mrow {
        display: flex; align-items: center; justify-content: space-between;
        padding: 5px 14px; min-height: 29px; cursor: pointer;
        transition: background .12s; border-radius: 4px; margin: 1px 4px;
      }
      .ody-mrow:hover { background: rgba(255, 255, 255, 0.03); }
      .ody-mrow.selected {
        background: rgba(203, 169, 249, 0.08);
        border: 1px solid rgba(203, 169, 249, 0.16);
      }
      .ody-mrow-l { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
      .ody-mrow-label {
        font-size: 11.5px; font-weight: 400; color: #c5c4d8;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .ody-mrow-sub {
        font-size: 9px; color: #454457; line-height: 1.3;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        max-width: 220px;
      }
      .ody-mrow-r { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

      /* Dots Button */
      .ody-dots {
        font-size: 11px; color: #363548; cursor: pointer;
        padding: 1px 4px; border-radius: 3px; line-height: 1;
        transition: color .12s, background .12s; letter-spacing: 1px;
      }
      .ody-dots:hover, .ody-dots.active { color: #cba9f9; background: rgba(203, 169, 249, 0.14); }

      /* Toggle Switch */
      .ody-sw {
        width: 30px; height: 15px; border-radius: 8px;
        background: #1e1d2c; cursor: pointer; position: relative; flex-shrink: 0;
        transition: background .18s, box-shadow .18s;
      }
      .ody-sw::after {
        content: ''; position: absolute;
        top: 2px; left: 2px; width: 11px; height: 11px; border-radius: 50%;
        background: #4a495d; transition: transform .18s, background .18s;
      }
      .ody-sw.on {
        background: #7c3aff;
        box-shadow: 0 0 10px rgba(124, 58, 255, 0.45);
      }
      .ody-sw.on::after { transform: translateX(15px); background: #ffffff; }

      /* Select Dropdown */
      .ody-sel {
        background: rgba(25, 24, 36, 0.9); border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px; padding: 2px 7px;
        color: #cba9f9; font-size: 10.5px; outline: none; cursor: pointer; font-family: inherit;
      }
      .ody-sel option { background: #131221; color: #e0dff0; }

      /* ── FLOATING INSPECTOR CARD (MATCHING REFERENCE IMAGE) ── */
      #ody-inspector {
        position: absolute; top: 12px; right: 14px; width: 235px;
        background: rgba(14, 13, 22, 0.96);
        backdrop-filter: blur(24px);
        border: 1px solid rgba(203, 169, 249, 0.2);
        border-radius: 10px;
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(203, 169, 249, 0.1);
        display: flex; flex-direction: column;
        z-index: 20; overflow: hidden;
        animation: odyInspIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes odyInspIn {
        from { opacity: 0; transform: translateY(-6px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      #ody-inspector-hdr {
        height: 34px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 12px; flex-shrink: 0; background: rgba(19, 18, 28, 0.85);
      }
      #ody-inspector-title { font-size: 11px; font-weight: 600; color: #c4c3d8; }
      #ody-inspector-close {
        font-size: 15px; color: #4a495d; cursor: pointer; line-height: 1;
        transition: color .12s;
      }
      #ody-inspector-close:hover { color: #ff6b6b; }
      #ody-inspector-body {
        padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;
        max-height: 480px; overflow-y: auto;
      }
      #ody-inspector-body::-webkit-scrollbar { width: 3px; }
      #ody-inspector-body::-webkit-scrollbar-thumb { background: rgba(203, 169, 249, 0.14); border-radius: 2px; }

      .ody-insp-sec {
        font-size: 9px; font-weight: 700; letter-spacing: 1.1px;
        text-transform: uppercase; color: #424155; margin-top: 4px;
      }
      .ody-insp-row {
        display: flex; align-items: center; justify-content: space-between;
        min-height: 24px; font-size: 11px;
      }
      .ody-insp-label { font-size: 11px; color: #8e8d9e; }
      .ody-insp-input {
        width: 90px; height: 21px;
        background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px; color: #cba9f9; font-size: 10px; padding: 0 6px;
        text-align: right; outline: none; font-family: inherit;
      }

      /* Sliders */
      .ody-sl-grp { display: flex; flex-direction: column; gap: 4px; }
      .ody-sl-hdr { display: flex; justify-content: space-between; font-size: 10.5px; color: #6f6e80; }
      .ody-sl-val { color: #cba9f9; font-weight: 600; }
      .ody-range {
        -webkit-appearance: none; width: 100%; height: 2.5px; border-radius: 1.5px;
        background: #1f1e2e; outline: none; cursor: pointer;
      }
      .ody-range::-webkit-slider-thumb {
        -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%;
        background: #cba9f9; box-shadow: 0 0 8px rgba(203, 169, 249, 0.6); cursor: pointer;
      }

      /* Transition Curve Canvas */
      #ody-curve-cv {
        width: 100%; height: 75px; border-radius: 6px; display: block;
        background: rgba(10, 9, 16, 0.9); border: 1px solid rgba(255, 255, 255, 0.05);
        cursor: crosshair;
      }

      /* Color Swatch & Trigger */
      .ody-color-trigger {
        display: flex; align-items: center; gap: 6px; cursor: pointer;
      }
      .ody-color-swatch {
        width: 16px; height: 16px; border-radius: 4px;
        background: #cba9f9; box-shadow: 0 0 8px rgba(203, 169, 249, 0.5);
      }
      .ody-color-tag {
        font-size: 10px; font-family: monospace; color: #cba9f9;
        background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 2px 6px; border-radius: 4px;
      }

      /* Attached Color Picker Card */
      #ody-color-picker-card {
        margin-top: 4px; padding: 8px; border-radius: 6px;
        background: rgba(10, 9, 16, 0.95); border: 1px solid rgba(255, 255, 255, 0.06);
        display: flex; flex-direction: column; gap: 6px;
      }
      #ody-col-map {
        width: 100%; height: 80px; border-radius: 5px; display: block; cursor: crosshair;
      }
      #ody-hue-slider {
        width: 100%; height: 9px; border-radius: 4px; cursor: pointer;
        background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
        position: relative;
      }
      #ody-hue-thumb {
        position: absolute; top: -3px; width: 15px; height: 15px;
        border-radius: 50%; border: 2px solid #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.6); pointer-events: none;
        transform: translateX(-50%); left: 75%;
      }

      /* Single Column View (Settings / Skins) */
      .ody-single { flex: 1; overflow-y: auto; padding: 10px 0; display: flex; flex-direction: column; }
      .ody-single::-webkit-scrollbar { width: 3px; }
      .ody-single::-webkit-scrollbar-thumb { background: rgba(203, 169, 249, 0.14); border-radius: 2px; }

      .ody-btn {
        display: inline-flex; align-items: center; justify-content: center;
        height: 28px; padding: 0 14px; border-radius: 5px; cursor: pointer;
        font-size: 11.5px; font-weight: 600; border: 1px solid;
        transition: all .15s; font-family: inherit;
      }
      .ody-btn-primary { background: rgba(203, 169, 249, 0.14); border-color: rgba(203, 169, 249, 0.3); color: #cba9f9; }
      .ody-btn-primary:hover { background: rgba(203, 169, 249, 0.22); }
      .ody-btn-ghost { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.1); color: #c0bdd8; }
      .ody-btn-ghost:hover { background: rgba(255, 255, 255, 0.08); }

      .ody-key {
        font-size: 9.5px; color: #cba9f9;
        background: rgba(203, 169, 249, 0.1); border: 1px solid rgba(203, 169, 249, 0.22);
        padding: 2px 7px; border-radius: 3px; font-weight: 600;
      }

      /* Resize Grip */
      .ody-grip {
        position: absolute; right: 4px; bottom: 4px;
        width: 10px; height: 10px; opacity: .25; pointer-events: none;
        background: linear-gradient(135deg, transparent 50%, #cba9f9 50%);
      }
    `;
    document.head.appendChild(style);

    /* ─── SIDEBAR SVG ICONS ─── */
    var IC = {
      welcome: '<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
      rage:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4" stroke="currentColor" stroke-width="2"/></svg>',
      antiaim: '<svg viewBox="0 0 24 24"><path d="M12 2L4 6v6c0 5.5 3.8 10.7 8 12 4.2-1.3 8-6.5 8-12V6l-8-4zm0 11h6c-.5 4.1-3.3 7.8-6 9V13H6V7.3l6-3v8.7z"/></svg>',
      visuals: '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>',
      misc:    '<svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>',
      skins:   '<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.22 19.59 10.56 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-4 9c-.83 0-1.5-.67-1.5-1.5S7.17 9 8 9s1.5.67 1.5 1.5S8.83 12 8 12zm4-3c-.83 0-1.5-.67-1.5-1.5S11.17 6 12 6s1.5.67 1.5 1.5S12.83 9 12 9zm4 3c-.83 0-1.5-.67-1.5-1.5S15.17 9 16 9s1.5.67 1.5 1.5S16.83 12 16 12z"/></svg>',
      settings:'<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
    };

    /* ─── ROW BUILDER HELPERS ─── */
    function sw(on) {
      return '<div class="ody-sw' + (on ? ' on' : '') + '" onclick="this.classList.toggle(\'on\')"></div>';
    }
    function dots(label) {
      return '<span class="ody-dots" data-insp="' + label + '">···</span>';
    }
    function row(label, right, sub, selected) {
      return '<div class="ody-mrow' + (selected ? ' selected' : '') + '">' +
        '<div class="ody-mrow-l"><span class="ody-mrow-label">' + label + '</span>' +
        (sub ? '<span class="ody-mrow-sub">' + sub + '</span>' : '') +
        '</div><div class="ody-mrow-r">' + right + '</div></div>';
    }
    function gh(name) { return '<div class="ody-gh">' + name + '</div>'; }
    function sel(opts, si) {
      return '<select class="ody-sel">' + opts.map(function(o, i) {
        return '<option' + (i === si ? ' selected' : '') + '>' + o + '</option>';
      }).join('') + '</select>';
    }
    function slrow(label, valId, min, max, val, unit) {
      return '<div class="ody-mrow"><div class="ody-mrow-l"><span class="ody-mrow-label">' + label + '</span></div>' +
        '<div class="ody-mrow-r"><div class="ody-sl-grp" style="width:120px">' +
        '<div class="ody-sl-hdr"><span></span><span class="ody-sl-val" id="' + valId + '">' + val + (unit || '') + '</span></div>' +
        '<input type="range" class="ody-range" min="' + min + '" max="' + max + '" value="' + val + '" ' +
        'oninput="document.getElementById(\'' + valId + '\').textContent=this.value+\'' + (unit || '') + '\'">' +
        '</div></div></div>';
    }

    /* ─── DOM INJECTION ─── */
    var root = document.createElement('div');
    root.id = 'odyssey-cheat-gui';
    root.className = 'active';

    root.innerHTML = `
      <div id="ody-wallpaper"></div>
      <div id="ody-wall-overlay"></div>

      <div id="ody-wall-tools">
        <label for="ody-wall-input">🖼 Wallpaper</label>
        <input type="file" id="ody-wall-input" accept="image/*" style="display:none">
        <button id="ody-wall-reset">Reset</button>
      </div>

      <div id="ody-window">
        <!-- Titlebar -->
        <div id="ody-titlebar">
          <div class="ody-logo">𝝮</div>
          <div class="ody-breadcrumb">
            <span class="root"><span style="color:#cba9f9">🪶</span> Priority</span>
            <span class="sep">›</span>
            <span class="curr" id="ody-crumb">Welcome</span>
          </div>
          <div class="ody-search-wrap">
            <span class="ody-search-icon">🔍</span>
            <input type="text" class="ody-search-input" id="ody-search" placeholder="Search for modules...">
          </div>
          <span class="ody-badge">odyssey.cc Beta</span>
          <div class="ody-grid-btn" id="ody-toggle-inspector" title="Toggle Inspector Panel">⊞</div>
        </div>

        <div id="ody-body">
          <!-- Sidebar -->
          <div id="ody-sidebar">
            <div class="ody-tab-btn active" data-tab="welcome" title="Welcome">${IC.welcome}<span class="ody-tooltip">Welcome</span></div>
            <div class="ody-tab-btn" data-tab="rage" title="Rage Aimbot">${IC.rage}<span class="ody-tooltip">Rage</span></div>
            <div class="ody-tab-btn" data-tab="antiaim" title="Anti-Aim">${IC.antiaim}<span class="ody-tooltip">Anti-Aim</span></div>
            <div class="ody-tab-btn" data-tab="visuals" title="Visuals / ESP">${IC.visuals}<span class="ody-tooltip">Visuals</span></div>
            <div class="ody-tab-btn" data-tab="misc" title="Movement & Misc">${IC.misc}<span class="ody-tooltip">Misc</span></div>
            <div class="ody-tab-btn" data-tab="skins" title="Skin Changer">${IC.skins}<span class="ody-tooltip">Skins</span></div>
            <div class="ody-tab-btn" data-tab="settings" title="Settings">${IC.settings}<span class="ody-tooltip">Settings</span></div>
          </div>

          <!-- Content container -->
          <div id="ody-content">

            <!-- 1. WELCOME TAB -->
            <div class="ody-view active" id="ody-view-welcome">
              <div class="ody-welcome-left">
                <div class="ody-welcome-header">Feature Showcase</div>
                <div class="ody-mod-card active" data-mod="visuals">
                  <div class="ody-mod-icon">👁️</div>
                  <div class="ody-mod-info">
                    <div class="ody-mod-name">Visuals / ESP</div>
                    <div class="ody-mod-desc">Chams, boxes, skeleton, radar</div>
                  </div>
                </div>
                <div class="ody-mod-card" data-mod="aimbot">
                  <div class="ody-mod-icon">🎯</div>
                  <div class="ody-mod-info">
                    <div class="ody-mod-name">Rage Aimbot</div>
                    <div class="ody-mod-desc">Silent aim, multipoint, exploits</div>
                  </div>
                </div>
                <div class="ody-mod-card" data-mod="antiaim">
                  <div class="ody-mod-icon">🛡️</div>
                  <div class="ody-mod-info">
                    <div class="ody-mod-name">Anti-Aim &amp; Desync</div>
                    <div class="ody-mod-desc">Inverter, fake lag, angles</div>
                  </div>
                </div>
                <div class="ody-mod-card" data-mod="misc">
                  <div class="ody-mod-icon">⚡</div>
                  <div class="ody-mod-info">
                    <div class="ody-mod-name">Movement &amp; Misc</div>
                    <div class="ody-mod-desc">Auto bhop, strafer, rank reveal</div>
                  </div>
                </div>
                <div class="ody-mod-card" data-mod="skins">
                  <div class="ody-mod-icon">🎨</div>
                  <div class="ody-mod-info">
                    <div class="ody-mod-name">Skin Changer</div>
                    <div class="ody-mod-desc">Knives, gloves, agent models</div>
                  </div>
                </div>
              </div>
              <div class="ody-welcome-preview">
                <div class="ody-prev-hdr">
                  <span class="ody-prev-title" id="ody-prev-title">Visuals / ESP — Live Tactical Simulation</span>
                  <span class="ody-prev-fps">● 60 FPS</span>
                </div>
                <canvas id="ody-prev-cv"></canvas>
              </div>
            </div>

            <!-- 2. RAGE TAB (EXACT REPLICA OF EVALATE REFERENCE IMAGES) -->
            <div class="ody-view" id="ody-view-rage">
              <div class="ody-cols">
                <!-- Col 1 -->
                <div class="ody-panel">
                  ${gh('Targeting')}
                  ${row('Silent Aim', dots('Silent Aim') + sw(true))}
                  ${row('Auto Fire', dots('Auto Fire') + sw(false))}
                  ${row('Auto Wall', dots('Auto Wall') + sw(true))}
                  ${row('Automatic Scope', dots('Auto Scope') + sw(true))}
                  ${gh('Accuracy &amp; Exploits')}
                  ${row('Double Tap', dots('Double Tap') + sw(true), '', true)}
                  ${row('Hide Shots', dots('Hide Shots') + sw(true))}
                  ${row('Quick Stop', sw(true))}
                  ${row('Multipoint Hitbox', dots('Multipoint') + sw(false))}
                  ${row('Damage Override', sw(true))}
                  ${row('Hitchance Override', sw(false))}
                  ${gh('Safety')}
                  ${row('Safe Points', dots('Safe Points') + sw(false))}
                  ${row('Dynamic Hitboxes', dots('Dynamic Hitboxes') + sw(true))}
                  ${row('Delay Shot', sw(true))}
                </div>

                <!-- Col 2 -->
                <div class="ody-panel">
                  ${gh('Anti-Aim')}
                  ${row('Pitch Angle', sw(true))}
                  ${row('Yaw Base', dots('Yaw Base') + sw(false))}
                  ${row('Desync Inverter', sw(true), 'Offsets horizontal body angle while airborne.')}
                  ${row('Fake Lag', sw(false))}
                  ${row('Slow Walk', dots('Slow Walk') + sw(true))}
                  ${row('Subtick Deflection', sw(false))}
                  ${gh('Angles &amp; Desync')}
                  ${row('Roll Angle', sw(false))}
                  ${row('Edge Detection', sw(true))}
                  ${row('Freestanding', sw(false))}
                  ${row('Manual Direction', sw(false))}
                  ${row('Air Angles', dots('Air Angles') + sw(true))}
                  ${row('Extended Limits', sw(false))}
                  ${row('Micro Movement', dots('Micro Movement') + sw(true))}
                  ${gh('Subcategory')}
                </div>
              </div>

              <!-- Floating Inspector Panel (shown by default like in reference screenshot) -->
              <div id="ody-inspector">
                <div id="ody-inspector-hdr">
                  <span id="ody-inspector-title">Pitch Override</span>
                  <div style="display:flex;align-items:center;gap:6px">
                    <span class="ody-dots">···</span>
                    <span id="ody-inspector-close">×</span>
                  </div>
                </div>
                <div id="ody-inspector-body">
                  <div class="ody-sl-grp">
                    <div class="ody-sl-hdr">
                      <span>Air Yaw Offset <span style="color:#cba9f9;font-size:9px">▲</span></span>
                      <span class="ody-sl-val" id="ody-sl-v">65.4%</span>
                    </div>
                    <input type="range" class="ody-range" min="0" max="100" value="65.4" step="0.1"
                      oninput="document.getElementById('ody-sl-v').textContent=this.value+'%'">
                  </div>

                  <div class="ody-insp-row">
                    <span class="ody-insp-label">Activation Trigger</span>
                    <select class="ody-sel"><option>Jumping</option><option>Falling</option><option>Standing</option></select>
                  </div>

                  <div class="ody-insp-row">
                    <span class="ody-insp-label">Invert On Land</span>
                    <span class="ody-dots">···</span>
                  </div>

                  <div class="ody-insp-row">
                    <span class="ody-insp-label">Subtick Offset <span style="color:#cba9f9;font-size:9px">▲</span></span>
                    <input type="text" class="ody-insp-input" value="0.045 ms">
                  </div>

                  <div class="ody-insp-sec">Transition Curve</div>
                  <canvas id="ody-curve-cv"></canvas>

                  <div class="ody-insp-sec">Visual Indicator</div>
                  <div class="ody-insp-row">
                    <span class="ody-insp-label">Color Swatch</span>
                    <div class="ody-color-trigger" id="ody-col-trigger">
                      <span class="ody-color-tag" id="ody-hex-display">#CBA9F9</span>
                      <div class="ody-color-swatch" id="ody-swatch-box"></div>
                    </div>
                  </div>

                  <!-- Color Picker Box -->
                  <div id="ody-color-picker-card">
                    <canvas id="ody-col-map"></canvas>
                    <div id="ody-hue-slider"><div id="ody-hue-thumb"></div></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 3. ANTI-AIM TAB -->
            <div class="ody-view" id="ody-view-antiaim">
              <div class="ody-cols">
                <div class="ody-panel">
                  ${gh('Stance &amp; Pitch')}
                  ${row('Enable Anti-Aim', sw(true))}
                  ${row('Pitch Override', sel(['Down (−89°)', 'Up (+89°)', 'Zero (0°)', 'Jitter'], 0))}
                  ${row('Yaw Base', sel(['At Crosshair', 'Backwards', 'Spinbot', 'Static'], 1))}
                  ${slrow('Yaw Offset', 'v-yaw', -180, 180, 180, '°')}
                  ${gh('Desync Controls')}
                  ${row('Desync Mode', sel(['Static', 'Jitter', 'Balance'], 0))}
                  ${row('Invert Keybind', '<span class="ody-key">ALT</span>')}
                  ${row('LBY Breaker', sw(true))}
                </div>
                <div class="ody-panel">
                  ${gh('Fake Lag')}
                  ${row('Enable Fake Lag', sw(true))}
                  ${slrow('Lag Limit', 'v-fl', 1, 16, 14, ' ticks')}
                  ${row('Fluctuate Ticks', sw(true))}
                  ${row('Adaptive Lag on Peek', sw(true))}
                  ${gh('Exploit Angles')}
                  ${row('Break LC on Jump', sw(true))}
                  ${row('Teleport Distance', sel(['Standard', 'Extended', 'Maximum'], 1))}
                </div>
              </div>
            </div>

            <!-- 4. VISUALS TAB -->
            <div class="ody-view" id="ody-view-visuals">
              <div class="ody-cols">
                <div class="ody-panel">
                  ${gh('Player ESP')}
                  ${row('Enemy Boxes', dots('Boxes') + sw(true))}
                  ${row('Corner Style', sw(true))}
                  ${row('Box Fill', sw(true))}
                  ${row('Player Skeleton', dots('Skeleton') + sw(true))}
                  ${row('Health Bar', sw(true))}
                  ${row('Armor Bar', sw(true))}
                  ${row('Player Name', sw(true))}
                  ${row('Weapon Icon', sw(true))}
                  ${row('Distance Indicator', sw(true))}
                </div>
                <div class="ody-panel">
                  ${gh('Chams &amp; Glow')}
                  ${row('Enemy Chams', dots('Chams') + sw(true))}
                  ${row('Chams Material', sel(['Glow Violet', 'Metallic Gloss', 'Flat Color', 'Glass Wire'], 0))}
                  ${row('Visible Through Walls', sw(true))}
                  ${gh('World &amp; Radar')}
                  ${row('Dropped Weapons', sw(true))}
                  ${row('C4 Bomb Timer', sw(true))}
                  ${row('Grenade Trajectory', sw(true))}
                  ${row('Tactical Radar', sw(true))}
                </div>
              </div>
            </div>

            <!-- 5. MISC TAB -->
            <div class="ody-view" id="ody-view-misc">
              <div class="ody-cols">
                <div class="ody-panel">
                  ${gh('Movement')}
                  ${row('Auto Bunnyhop', sw(true))}
                  ${row('Auto Strafe', sw(true))}
                  ${row('Strafe Mode', sel(['Legit Adaptive', 'Directional Rage', 'Silent Circular'], 1))}
                  ${row('Fast Stop (Quick Stop)', sw(true))}
                  ${row('Edge Jump', sw(false))}
                  ${row('Velocity Spoofing', sw(true))}
                </div>
                <div class="ody-panel">
                  ${gh('Utility &amp; Bypass')}
                  ${row('Rank Reveal', sw(true))}
                  ${row('Auto Accept Match', sw(true))}
                  ${row('Clantag Spoofer (odyssey.cc)', sw(true))}
                  ${row('Anti-Untrusted Check', '<span style="color:#4caf50;font-size:10px;font-weight:700">● SECURE</span>')}
                  ${gh('Keybinds')}
                  ${row('Panic Key', '<span class="ody-key">F12</span>')}
                  ${row('Thirdperson Toggle', '<span class="ody-key">MOUSE4</span>')}
                </div>
              </div>
            </div>

            <!-- 6. SKINS TAB -->
            <div class="ody-view" id="ody-view-skins">
              <div class="ody-cols">
                <div class="ody-panel">
                  ${gh('Knife Changer')}
                  ${row('Enable Knife Changer', sw(true))}
                  ${row('Knife Model', sel(['Karambit', 'Butterfly Knife', 'M9 Bayonet', 'Skeleton Knife'], 0))}
                  ${row('Knife Finish', sel(['Fade (100% 99.8)', 'Doppler Phase 2', 'Marble Fade', 'Gamma Doppler'], 0))}
                  ${row('Paint Seed', '<input type="text" class="ody-insp-input" value="412" style="width:55px">')}
                  ${row('Float Value', '<input type="text" class="ody-insp-input" value="0.0001" style="width:65px">')}
                  ${gh('Glove Changer')}
                  ${row('Enable Gloves', sw(true))}
                  ${row('Glove Model', sel(['Sport Gloves (Vice)', 'Specialist (Crimson Kimono)', 'Driver Gloves (King Snake)'], 0))}
                </div>
                <div class="ody-panel">
                  ${gh('Weapon Skins')}
                  ${row('Enable Weapon Skins', sw(true))}
                  ${row('AK-47', sel(['Fire Serpent', 'Redline', 'Vulcan', 'Case Hardened (Blue Gem)'], 0))}
                  ${row('M4A4', sel(['Howl', 'Asiimov', 'The Emperor'], 0))}
                  ${row('AWP', sel(['Dragon Lore', 'Gungnir', 'Medusa', 'Asiimov'], 0))}
                  ${row('Desert Eagle', sel(['Blaze', 'Printstream', 'Code Red'], 0))}
                  ${gh('Agent Changer')}
                  ${row('CT Agent', sel(['Cmdr. Davida "Goggles" Fernandez', 'Michael Syfers'], 0))}
                  ${row('T Agent', sel(['Sir Bloody Darryl Royale', 'The Elite Mr. Muhlik'], 0))}
                </div>
              </div>
            </div>

            <!-- 7. SETTINGS TAB -->
            <div class="ody-view" id="ody-view-settings">
              <div class="ody-single">
                ${gh('Configuration Presets')}
                ${row('Active Preset', sel(['HVH Matchmaking 2026', 'Semi-Rage Premier (Undetected)', 'Legit Closet Matchmaking'], 0))}
                <div class="ody-mrow" style="gap:8px;padding:8px 14px">
                  <button class="ody-btn ody-btn-primary">Save Config</button>
                  <button class="ody-btn ody-btn-ghost">Load Config</button>
                  <button class="ody-btn ody-btn-ghost">Export to Clipboard</button>
                </div>
                ${gh('Menu Preferences')}
                ${row('Menu Toggle Key', '<span class="ody-key">INSERT</span>')}
                ${slrow('Menu Opacity', 'v-op', 50, 100, 96, '%')}
                ${row('Background Wallpaper', '<label for="ody-wall-input" style="cursor:pointer;color:#cba9f9;font-size:11px;text-decoration:underline">Choose Image File…</label>')}
                ${gh('Subscription &amp; Client')}
                ${row('Client Version', '<span style="color:#cba9f9;font-family:monospace">v2.4.1 (odyssey-win64)</span>')}
                ${row('Account License', '<span style="color:#4caf50;font-size:11px;font-weight:700">● Lifetime VIP</span>')}
              </div>
            </div>

          </div>
        </div>

        <div class="ody-grip"></div>
      </div>
    `;

    document.body.appendChild(root);

    /* ─── WALLPAPER MANAGEMENT ─── */
    var wallEl = document.getElementById('ody-wallpaper');
    var savedWall = localStorage.getItem(STORAGE_KEY_BG) || DEFAULT_BG;
    wallEl.style.backgroundImage = 'url("' + savedWall + '")';

    document.getElementById('ody-wall-input').addEventListener('change', function () {
      if (this.files && this.files[0]) {
        var r = new FileReader();
        r.onload = function (e) {
          wallEl.style.backgroundImage = 'url("' + e.target.result + '")';
          try { localStorage.setItem(STORAGE_KEY_BG, e.target.result); } catch (err) {}
        };
        r.readAsDataURL(this.files[0]);
      }
    });

    document.getElementById('ody-wall-reset').addEventListener('click', function () {
      wallEl.style.backgroundImage = 'url("' + DEFAULT_BG + '")';
      localStorage.removeItem(STORAGE_KEY_BG);
    });

    window.addEventListener('dragover', function (e) { e.preventDefault(); });
    window.addEventListener('drop', function (e) {
      e.preventDefault();
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) {
        var r = new FileReader();
        r.onload = function (ev) {
          wallEl.style.backgroundImage = 'url("' + ev.target.result + '")';
          try { localStorage.setItem(STORAGE_KEY_BG, ev.target.result); } catch (err) {}
        };
        r.readAsDataURL(f);
      }
    });

    /* ─── DRAGGABLE WINDOW ─── */
    var win = document.getElementById('ody-window');
    var titlebar = document.getElementById('ody-titlebar');
    var isDragging = false, ox = 0, oy = 0;

    titlebar.addEventListener('mousedown', function (e) {
      if (e.target.closest('.ody-search-wrap') || e.target.closest('.ody-grid-btn')) return;
      isDragging = true;
      var r = win.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      win.style.transform = 'none';
      win.style.left = r.left + 'px';
      win.style.top = r.top + 'px';
      e.preventDefault();
    });

    window.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      win.style.left = Math.max(10, Math.min(e.clientX - ox, window.innerWidth - 100)) + 'px';
      win.style.top  = Math.max(10, Math.min(e.clientY - oy, window.innerHeight - 60)) + 'px';
    });

    window.addEventListener('mouseup', function () { isDragging = false; });

    /* ─── INSERT KEY TOGGLE ─── */
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Insert') {
        win.style.display = (win.style.display === 'none') ? 'flex' : 'none';
      }
    });

    /* ─── TAB NAVIGATION ─── */
    var tabBtns  = root.querySelectorAll('.ody-tab-btn');
    var tabViews = root.querySelectorAll('.ody-view');
    var crumb    = document.getElementById('ody-crumb');
    var tabNames = {
      welcome: 'Welcome',
      rage: 'Rage',
      antiaim: 'Anti-Aim',
      visuals: 'Visuals',
      misc: 'Misc',
      skins: 'Skins',
      settings: 'Settings'
    };
    var tabIcons = {
      welcome: '🏠',
      rage: '🔫',
      antiaim: '🛡️',
      visuals: '👁️',
      misc: '⚡',
      skins: '🎨',
      settings: '⚙️'
    };

    function selectTab(id) {
      tabBtns.forEach(function (b) {
        if (b.getAttribute('data-tab') === id) b.classList.add('active');
        else b.classList.remove('active');
      });
      tabViews.forEach(function (v) { v.classList.remove('active'); });
      crumb.innerHTML = (tabIcons[id] || '') + ' ' + (tabNames[id] || id);
      var view = document.getElementById('ody-view-' + id);
      if (view) view.classList.add('active');
      if (id === 'welcome') {
        setTimeout(initLivePreview, 40);
      } else if (id === 'rage') {
        setTimeout(initInspectorCanvases, 40);
      }
    }

    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-tab');
        selectTab(id);
      });
    });

    var urlParams = new URLSearchParams(window.location.search);
    var startTab = urlParams.get('tab');
    if (startTab && tabNames[startTab]) {
      selectTab(startTab);
    }

    /* ─── SEARCH FILTER ─── */
    document.getElementById('ody-search').addEventListener('input', function () {
      var q = this.value.toLowerCase().trim();
      root.querySelectorAll('.ody-mrow').forEach(function (r) {
        r.style.display = (!q || r.textContent.toLowerCase().includes(q)) ? 'flex' : 'none';
      });
    });

    /* ─── WELCOME SCREEN MODULE SWITCHER ─── */
    var modCards = root.querySelectorAll('.ody-mod-card');
    var prevTitle = document.getElementById('ody-prev-title');
    var currentModule = 'visuals';

    modCards.forEach(function (card) {
      card.addEventListener('click', function () {
        modCards.forEach(function (c) { c.classList.remove('active'); });
        card.classList.add('active');
        currentModule = card.getAttribute('data-mod');
        var titles = {
          visuals: 'Visuals / ESP — Live Tactical Simulation',
          aimbot:  'Rage Aimbot — Dynamic FOV & Bone Target Simulation',
          antiaim: 'Anti-Aim & Desync — 3D Angle Compass Simulation',
          misc:    'Movement — Bunnyhop & Velocity Graph HUD',
          skins:   'Skin Changer — Karambit Doppler Phase 2 Showcase'
        };
        prevTitle.textContent = titles[currentModule] || 'Live Tactical Simulation';
      });
    });

    /* ─── INSPECTOR TOGGLE & DOTS INTERACTION ─── */
    var inspector = document.getElementById('ody-inspector');
    var inspClose = document.getElementById('ody-inspector-close');
    var inspToggle = document.getElementById('ody-toggle-inspector');

    if (inspClose) {
      inspClose.addEventListener('click', function () {
        inspector.style.display = 'none';
      });
    }
    if (inspToggle) {
      inspToggle.addEventListener('click', function () {
        inspector.style.display = (inspector.style.display === 'none') ? 'flex' : 'none';
        if (inspector.style.display !== 'none') setTimeout(initInspectorCanvases, 40);
      });
    }

    root.addEventListener('click', function (e) {
      var d = e.target.closest('.ody-dots');
      if (!d) return;
      var title = d.getAttribute('data-insp');
      if (title) {
        document.getElementById('ody-inspector-title').textContent = title + ' Override';
        inspector.style.display = 'flex';
        setTimeout(initInspectorCanvases, 40);
      }
    });

    /* ─── INSPECTOR CANVASES: BEZIER TRANSITION CURVE & COLOR PICKER ─── */
    function initInspectorCanvases() {
      // 1. Bezier Curve Canvas
      var cc = document.getElementById('ody-curve-cv');
      if (cc) {
        var dpr = window.devicePixelRatio || 1;
        var cw = cc.offsetWidth || 210;
        var ch = cc.offsetHeight || 75;
        cc.width  = Math.round(cw * dpr);
        cc.height = Math.round(ch * dpr);
        var cctx = cc.getContext('2d');
        cctx.setTransform(1, 0, 0, 1, 0, 0);
        cctx.scale(dpr, dpr);

        // Coordinate Grid
        cctx.strokeStyle = 'rgba(255,255,255,0.05)';
        cctx.lineWidth = 1;
        for (var i = 0; i <= 4; i++) {
          cctx.beginPath(); cctx.moveTo(i / 4 * cw, 0); cctx.lineTo(i / 4 * cw, ch); cctx.stroke();
          cctx.beginPath(); cctx.moveTo(0, i / 4 * ch); cctx.lineTo(cw, i / 4 * ch); cctx.stroke();
        }

        // Smooth S-Curve Bezier
        cctx.strokeStyle = '#cba9f9';
        cctx.lineWidth = 2;
        cctx.shadowColor = 'rgba(203,169,249,0.7)';
        cctx.shadowBlur = 8;
        cctx.beginPath();
        cctx.moveTo(12, ch - 12);
        cctx.bezierCurveTo(cw * 0.35, ch - 12, cw * 0.45, 12, cw - 12, 12);
        cctx.stroke();
        cctx.shadowBlur = 0;

        // Start & End Anchor Circles
        cctx.fillStyle = '#fff';
        cctx.beginPath(); cctx.arc(12, ch - 12, 3.5, 0, Math.PI * 2); cctx.fill();
        cctx.beginPath(); cctx.arc(cw - 12, 12, 3.5, 0, Math.PI * 2); cctx.fill();
      }

      // 2. Color Map & Hue Slider
      var mapCv = document.getElementById('ody-col-map');
      if (mapCv) {
        var dpr2 = window.devicePixelRatio || 1;
        var mw = mapCv.offsetWidth || 210;
        var mh = mapCv.offsetHeight || 80;
        mapCv.width  = Math.round(mw * dpr2);
        mapCv.height = Math.round(mh * dpr2);
        var mctx = mapCv.getContext('2d');
        mctx.setTransform(1, 0, 0, 1, 0, 0);
        mctx.scale(dpr2, dpr2);
        var hue = 270;

        function renderColorMap() {
          var gH = mctx.createLinearGradient(0, 0, mw, 0);
          gH.addColorStop(0, '#ffffff');
          gH.addColorStop(1, 'hsl(' + hue + ', 100%, 50%)');
          mctx.fillStyle = gH;
          mctx.fillRect(0, 0, mw, mh);

          var gV = mctx.createLinearGradient(0, 0, 0, mh);
          gV.addColorStop(0, 'transparent');
          gV.addColorStop(1, '#000000');
          mctx.fillStyle = gV;
          mctx.fillRect(0, 0, mw, mh);

          // Picker Indicator Ring
          var rx = mw * 0.76, ry = mh * 0.28;
          mctx.beginPath();
          mctx.arc(rx, ry, 5, 0, Math.PI * 2);
          mctx.strokeStyle = '#fff';
          mctx.lineWidth = 2;
          mctx.stroke();
        }
        renderColorMap();

        var hueSlider = document.getElementById('ody-hue-slider');
        var hueThumb  = document.getElementById('ody-hue-thumb');
        if (hueSlider) {
          hueSlider.addEventListener('click', function (ev) {
            var rect = hueSlider.getBoundingClientRect();
            var pct = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
            hue = Math.round(pct * 360);
            hueThumb.style.left = (pct * 100) + '%';
            renderColorMap();
            var box = document.getElementById('ody-swatch-box');
            if (box) box.style.background = 'hsl(' + hue + ', 70%, 65%)';
          });
        }
      }
    }

    /* ─── LIVE 60 FPS TACTICAL PREVIEW SIMULATION ─── */
    var pRaf = 0;
    function initLivePreview() {
      var cv = document.getElementById('ody-prev-cv');
      if (!cv) return;
      var pctx = cv.getContext('2d');
      var pdpr = window.devicePixelRatio || 1;
      var pw = 0, ph = 0;

      function pResize() {
        pw = cv.clientWidth || 400;
        ph = cv.clientHeight || 400;
        cv.width  = Math.round(pw * pdpr);
        cv.height = Math.round(ph * pdpr);
        pctx.setTransform(1, 0, 0, 1, 0, 0);
        pctx.scale(pdpr, pdpr);
      }
      pResize();

      cancelAnimationFrame(pRaf);
      var frameCount = 0;

      function draw() {
        if (pw !== cv.clientWidth || ph !== cv.clientHeight) pResize();
        pctx.clearRect(0, 0, pw, ph);

        // Dark background grid
        pctx.fillStyle = '#090812';
        pctx.fillRect(0, 0, pw, ph);

        pctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
        pctx.lineWidth = 1;
        for (var xi = 0; xi < pw; xi += 32) {
          pctx.beginPath(); pctx.moveTo(xi, 0); pctx.lineTo(xi, ph); pctx.stroke();
        }
        for (var yi = 0; yi < ph; yi += 32) {
          pctx.beginPath(); pctx.moveTo(0, yi); pctx.lineTo(pw, yi); pctx.stroke();
        }

        frameCount++;

        if (currentModule === 'visuals') {
          // ── HIGH-FIDELITY CS2 ESP TACTICAL SIMULATION ──
          var cx = pw * 0.44;
          var cy = ph * 0.5;
          var bw = 100, bh = 188;
          var bx = cx - bw / 2;
          var by = cy - bh / 2 + Math.sin(frameCount * 0.04) * 3;
          var cL = 16;

          // Glowing Corner Brackets
          pctx.strokeStyle = '#cba9f9';
          pctx.lineWidth = 2.2;
          pctx.shadowColor = 'rgba(203, 169, 249, 0.8)';
          pctx.shadowBlur = 10;
          // TL
          pctx.beginPath(); pctx.moveTo(bx, by + cL); pctx.lineTo(bx, by); pctx.lineTo(bx + cL, by); pctx.stroke();
          // TR
          pctx.beginPath(); pctx.moveTo(bx + bw - cL, by); pctx.lineTo(bx + bw, by); pctx.lineTo(bx + bw, by + cL); pctx.stroke();
          // BR
          pctx.beginPath(); pctx.moveTo(bx + bw, by + bh - cL); pctx.lineTo(bx + bw, by + bh); pctx.lineTo(bx + bw - cL, by + bh); pctx.stroke();
          // BL
          pctx.beginPath(); pctx.moveTo(bx + cL, by + bh); pctx.lineTo(bx, by + bh); pctx.lineTo(bx, by + bh - cL); pctx.stroke();
          pctx.shadowBlur = 0;

          // Chams Glow Body Fill
          pctx.fillStyle = 'rgba(203, 169, 249, 0.09)';
          pctx.fillRect(bx, by, bw, bh);

          // Detailed Tactical Player Model (Anatomy & Armor)
          var hx = cx, hy = by + 26;
          // Head / Helmet
          pctx.strokeStyle = '#cba9f9';
          pctx.lineWidth = 1.8;
          pctx.fillStyle = 'rgba(203, 169, 249, 0.25)';
          pctx.beginPath(); pctx.arc(hx, hy, 11, 0, Math.PI * 2); pctx.fill(); pctx.stroke();
          // Visor Goggles
          pctx.fillStyle = '#7c3aff';
          pctx.fillRect(hx - 7, hy - 2, 14, 4);

          // Torso / Plate Carrier Rig
          var tx1 = hx - 14, ty1 = hy + 13, tw = 28, th = 42;
          pctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          pctx.strokeRect(tx1, ty1, tw, th);
          // Mag pouches
          pctx.fillStyle = 'rgba(203, 169, 249, 0.3)';
          pctx.fillRect(tx1 + 4, ty1 + 22, 6, 14);
          pctx.fillRect(tx1 + 11, ty1 + 22, 6, 14);
          pctx.fillRect(tx1 + 18, ty1 + 22, 6, 14);

          // Arms & Held Rifle (AK-47 / M4)
          pctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
          pctx.lineWidth = 2;
          // Left arm
          pctx.beginPath(); pctx.moveTo(tx1, ty1 + 4); pctx.lineTo(tx1 - 12, ty1 + 26); pctx.lineTo(hx - 2, ty1 + 34); pctx.stroke();
          // Right arm
          pctx.beginPath(); pctx.moveTo(tx1 + tw, ty1 + 4); pctx.lineTo(tx1 + tw + 10, ty1 + 26); pctx.lineTo(hx + 12, ty1 + 32); pctx.stroke();
          // Rifle silhouette
          pctx.strokeStyle = '#cba9f9';
          pctx.lineWidth = 3.5;
          pctx.beginPath(); pctx.moveTo(hx - 22, ty1 + 36); pctx.lineTo(hx + 24, ty1 + 28); pctx.stroke();
          // Barrel & stock
          pctx.lineWidth = 1.5;
          pctx.beginPath(); pctx.moveTo(hx + 24, ty1 + 28); pctx.lineTo(hx + 38, ty1 + 25); pctx.stroke();

          // Pelvis & Legs
          var py = ty1 + th;
          pctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          pctx.lineWidth = 2;
          // Left leg & combat boot
          pctx.beginPath();
          pctx.moveTo(hx - 7, py); pctx.lineTo(bx + 22, py + 52); pctx.lineTo(bx + 18, by + bh - 2); pctx.lineTo(bx + 26, by + bh - 2);
          pctx.stroke();
          // Right leg & combat boot
          pctx.beginPath();
          pctx.moveTo(hx + 7, py); pctx.lineTo(bx + bw - 22, py + 52); pctx.lineTo(bx + bw - 18, by + bh - 2); pctx.lineTo(bx + bw - 26, by + bh - 2);
          pctx.stroke();

          // Joint Node Dots (Skeleton ESP)
          pctx.fillStyle = '#cba9f9';
          [[hx, hy], [tx1, ty1 + 4], [tx1 + tw, ty1 + 4], [tx1 - 12, ty1 + 26], [tx1 + tw + 10, ty1 + 26],
           [hx - 7, py], [hx + 7, py], [bx + 22, py + 52], [bx + bw - 22, py + 52]].forEach(function(pt) {
            pctx.beginPath(); pctx.arc(pt[0], pt[1], 2.2, 0, Math.PI * 2); pctx.fill();
          });

          // Health Bar (Gradient Green)
          var hp = 84, hpH = (hp / 100) * bh;
          pctx.fillStyle = 'rgba(0,0,0,0.6)';
          pctx.fillRect(bx - 9, by, 4, bh);
          var hpGrad = pctx.createLinearGradient(0, by + bh, 0, by);
          hpGrad.addColorStop(0, '#f44336');
          hpGrad.addColorStop(0.3, '#ffeb3b');
          hpGrad.addColorStop(1, '#4caf50');
          pctx.fillStyle = hpGrad;
          pctx.fillRect(bx - 9, by + (bh - hpH), 4, hpH);

          // Armor Bar (Cyan/Blue)
          pctx.fillStyle = 'rgba(0,0,0,0.6)';
          pctx.fillRect(bx - 15, by, 3, bh);
          pctx.fillStyle = '#29b6f6';
          pctx.fillRect(bx - 15, by + 12, 3, bh - 12);

          // Player Name & Flags
          pctx.font = 'bold 11px monospace';
          pctx.fillStyle = '#ffffff';
          pctx.textAlign = 'center';
          pctx.fillText('enemy_1337', cx, by - 18);

          pctx.font = '9.5px monospace';
          pctx.fillStyle = '#4caf50';
          pctx.fillText('84 HP · $4,200', cx, by - 6);

          // Bottom Weapon Bar
          pctx.font = 'bold 10px monospace';
          pctx.fillStyle = '#cba9f9';
          pctx.fillText('AK-47 · 30/90 · 14.2m', cx, by + bh + 16);

          // Right ESP Flags
          pctx.textAlign = 'left';
          pctx.font = '9px monospace';
          pctx.fillStyle = '#29b6f6'; pctx.fillText('HK', bx + bw + 6, by + 16);
          pctx.fillStyle = '#ff9800'; pctx.fillText('FLASH', bx + bw + 6, by + 28);
          pctx.fillStyle = '#e040fb'; pctx.fillText('RELOAD', bx + bw + 6, by + 40);

          // Top-Right Tactical Radar
          var rx = pw - 54, ry = 54, rr = 36;
          pctx.strokeStyle = 'rgba(203, 169, 249, 0.3)';
          pctx.lineWidth = 1;
          pctx.beginPath(); pctx.arc(rx, ry, rr, 0, Math.PI * 2); pctx.stroke();
          pctx.beginPath(); pctx.moveTo(rx - rr, ry); pctx.lineTo(rx + rr, ry); pctx.stroke();
          pctx.beginPath(); pctx.moveTo(rx, ry - rr); pctx.lineTo(rx, ry + rr); pctx.stroke();

          // Radar Sweep Line
          var ang = frameCount * 0.04;
          pctx.strokeStyle = 'rgba(203, 169, 249, 0.7)';
          pctx.beginPath();
          pctx.moveTo(rx, ry);
          pctx.lineTo(rx + Math.cos(ang) * rr, ry + Math.sin(ang) * rr);
          pctx.stroke();

          // Radar Enemy Blip
          var blipAng = frameCount * 0.02 + 1.2;
          var bx2 = rx + Math.cos(blipAng) * 22;
          var by2 = ry + Math.sin(blipAng) * 22;
          pctx.fillStyle = '#f44336';
          pctx.beginPath(); pctx.arc(bx2, by2, 3.5, 0, Math.PI * 2); pctx.fill();

        } else if (currentModule === 'aimbot') {
          // ── RAGE AIMBOT SIMULATION ──
          var acx = pw / 2, acy = ph / 2;
          var fovR = 75 + Math.sin(frameCount * 0.05) * 8;

          pctx.strokeStyle = 'rgba(203, 169, 249, 0.35)';
          pctx.lineWidth = 1.5;
          pctx.beginPath(); pctx.arc(acx, acy, fovR, 0, Math.PI * 2); pctx.stroke();

          // Center Crosshair
          pctx.strokeStyle = '#cba9f9';
          pctx.lineWidth = 1.5;
          pctx.beginPath();
          pctx.moveTo(acx - 10, acy); pctx.lineTo(acx - 3, acy);
          pctx.moveTo(acx + 3, acy); pctx.lineTo(acx + 10, acy);
          pctx.moveTo(acx, acy - 10); pctx.lineTo(acx, acy - 3);
          pctx.moveTo(acx, acy + 3); pctx.lineTo(acx, acy + 10);
          pctx.stroke();

          // Dynamic Head Target Bone
          var tx = acx + Math.sin(frameCount * 0.035) * 36;
          var ty = acy + Math.cos(frameCount * 0.035) * 26;
          pctx.fillStyle = 'rgba(124, 58, 255, 0.25)';
          pctx.strokeStyle = '#7c3aff';
          pctx.lineWidth = 1.8;
          pctx.beginPath(); pctx.arc(tx, ty, 14, 0, Math.PI * 2); pctx.fill(); pctx.stroke();

          // Snap Line
          pctx.strokeStyle = 'rgba(203, 169, 249, 0.65)';
          pctx.setLineDash([4, 4]);
          pctx.beginPath(); pctx.moveTo(acx, acy); pctx.lineTo(tx, ty); pctx.stroke();
          pctx.setLineDash([]);

          pctx.font = '11px monospace';
          pctx.fillStyle = '#cba9f9';
          pctx.textAlign = 'center';
          pctx.fillText('TARGET LOCKED: HEAD (HITCHANCE 98% · MULTIPOINT)', pw / 2, ph - 24);

        } else if (currentModule === 'antiaim') {
          // ── ANTI-AIM COMPASS SIMULATION ──
          var aax = pw / 2, aay = ph / 2, aar = 68;
          pctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          pctx.lineWidth = 1.5;
          pctx.beginPath(); pctx.arc(aax, aay, aar, 0, Math.PI * 2); pctx.stroke();

          // Fake Angle (Spinbot)
          var fa = frameCount * 0.08;
          var fx = aax + Math.cos(fa) * aar, fy = aay + Math.sin(fa) * aar;
          pctx.strokeStyle = '#f44336'; pctx.lineWidth = 2.5;
          pctx.shadowColor = '#f44336'; pctx.shadowBlur = 8;
          pctx.beginPath(); pctx.moveTo(aax, aay); pctx.lineTo(fx, fy); pctx.stroke();
          pctx.fillStyle = '#f44336'; pctx.beginPath(); pctx.arc(fx, fy, 4.5, 0, Math.PI * 2); pctx.fill();

          // Real Angle
          var ra = Math.sin(frameCount * 0.02) * 0.4 + Math.PI;
          var rx2 = aax + Math.cos(ra) * aar, ry2 = aay + Math.sin(ra) * aar;
          pctx.strokeStyle = '#4caf50'; pctx.shadowColor = '#4caf50';
          pctx.beginPath(); pctx.moveTo(aax, aay); pctx.lineTo(rx2, ry2); pctx.stroke();
          pctx.fillStyle = '#4caf50'; pctx.beginPath(); pctx.arc(rx2, ry2, 4.5, 0, Math.PI * 2); pctx.fill();
          pctx.shadowBlur = 0;

          pctx.font = '10px monospace'; pctx.textAlign = 'center';
          pctx.fillStyle = '#ff6b6b'; pctx.fillText('FAKE YAW: 180°', fx, fy - 16);
          pctx.fillStyle = '#4caf50'; pctx.fillText('REAL YAW: -58°', rx2, ry2 - 16);

        } else if (currentModule === 'misc') {
          // ── SPEEDOMETER & BHOP GRAPH ──
          pctx.strokeStyle = 'rgba(203, 169, 249, 0.7)';
          pctx.lineWidth = 1.8;
          pctx.beginPath();
          for (var xi2 = 0; xi2 <= pw; xi2 += 3) {
            var v2 = Math.abs(Math.sin(xi2 * 0.04 + frameCount * 0.09)) * ph * 0.32;
            if (xi2 === 0) pctx.moveTo(xi2, ph * 0.52 - v2);
            else pctx.lineTo(xi2, ph * 0.52 - v2);
          }
          pctx.stroke();

          var curSpeed = 310 + Math.round(Math.abs(Math.sin(frameCount * 0.08)) * 125);
          pctx.font = 'bold 15px monospace';
          pctx.fillStyle = '#cba9f9';
          pctx.textAlign = 'center';
          pctx.fillText('SPEED: ' + curSpeed + ' u/s', pw / 2, 40);

          pctx.font = '10px monospace';
          pctx.fillStyle = '#4caf50';
          pctx.fillText('AUTO-BHOP ACTIVE · STRAFE SYNC 99.4%', pw / 2, ph - 24);

        } else if (currentModule === 'skins') {
          // ── KNIFE SHOWCASE ──
          pctx.font = 'bold 14px monospace';
          pctx.fillStyle = '#cba9f9';
          pctx.textAlign = 'center';
          pctx.fillText('★ Karambit | Doppler (Phase 2)', pw / 2, 36);

          var kx = pw / 2, ky = ph / 2;
          pctx.save();
          pctx.translate(kx, ky);
          pctx.rotate(-Math.PI / 4 + Math.sin(frameCount * 0.02) * 0.12);

          // Knife Blade (Doppler Pink / Purple gradient)
          var kGrad = pctx.createLinearGradient(-10, -60, 10, 30);
          kGrad.addColorStop(0, '#cba9f9');
          kGrad.addColorStop(0.5, '#e040fb');
          kGrad.addColorStop(1, '#7c4dff');
          pctx.fillStyle = kGrad;
          pctx.shadowColor = '#e040fb';
          pctx.shadowBlur = 12;

          pctx.beginPath();
          pctx.moveTo(0, -65);
          pctx.lineTo(9, -24);
          pctx.lineTo(5, 32);
          pctx.lineTo(-5, 32);
          pctx.lineTo(-9, -24);
          pctx.closePath();
          pctx.fill();
          pctx.shadowBlur = 0;

          // Knife Handle
          pctx.fillStyle = '#1c1b28';
          pctx.fillRect(-7, 30, 14, 28);
          // Ring
          pctx.strokeStyle = '#cba9f9';
          pctx.lineWidth = 2.5;
          pctx.beginPath();
          pctx.arc(0, 68, 9, 0, Math.PI * 2);
          pctx.stroke();

          pctx.restore();

          pctx.font = '10px monospace';
          pctx.fillStyle = 'rgba(203, 169, 249, 0.7)';
          pctx.textAlign = 'center';
          pctx.fillText('Float: 0.000142 · Paint Seed: 412', pw / 2, ph - 24);
        }

        pRaf = requestAnimationFrame(draw);
      }
      draw();
    }

    // Initialize welcome live preview
    setTimeout(initLivePreview, 80);
    setTimeout(initInspectorCanvases, 100);
  }

  // ── 3. BOOTSTRAPPER ──
  function boot() {
    initCheatMenu();
    var params = new URLSearchParams(window.location.search);
    if (params.get('nointro') === '1') return;

    startIntroAnimation(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
