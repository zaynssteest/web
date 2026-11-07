/*
 * odyssey.cc brand, for the web. One file, no dependencies, no build step.
 *
 *   <script src="paranoia-brand.js"></script>
 *
 *   <paranoia-eye size="256" variant="calm"></paranoia-eye>                     the eye, in characters
 *   <paranoia-eye size="64" mode="pixel" variant="blink"></paranoia-eye>        the eye as pixel art, for small sizes
 *   <paranoia-name width="640" animate></paranoia-name>                         the name, resolving out of noise
 *   Paranoia.intro({ variant: 'eye', sound: true }).then(...)                   a full screen intro
 *   Paranoia.favicon.start()                                                    an animated favicon
 *
 * Variants of the eye: calm, scan, sleepy, alert, blink, spin. Everything is drawn on a canvas, nothing is loaded.
 * Colours: Paranoia.colors. Settings: attributes on the elements, or the options object of the functions (see README.md).
 */
(function (global) {
  'use strict';

  var colors = {
    accent: [176, 142, 244], accentHi: [214, 194, 250], accentLo: [106, 85, 146],
    text: [226, 226, 226], dim: [138, 138, 138], border: [62, 62, 62], panel: [32, 32, 32], bg: [9, 9, 9]
  };
  var WORD = 'odyssey';
  var FONT = '"JetBrains Mono", "Cascadia Mono", Consolas, "Courier New", monospace';

  function sat(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function smooth(a, b, x) { var t = sat((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function hash2(x, y) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) & 0xffff) / 65535;
  }
  function rgba(c, k, a) {
    var r = Math.min(255, Math.round(c[0] * k)), g = Math.min(255, Math.round(c[1] * k)), b = Math.min(255, Math.round(c[2] * k));
    return 'rgba(' + r + ',' + g + ',' + b + ',' + (a === undefined ? 1 : a) + ')';
  }

  /* ---- the eye: a field of brightness and what it is ------------------------------------------------------------------------ */

  // kinds: 0 skin or the white of the eye, 1 iris, 2 pupil, 3 a line of the lid or a lash
  var KIND_SKIN = 0, KIND_IRIS = 1, KIND_PUPIL = 2, KIND_LINE = 3;
  var LASHES = [-1.05, -0.78, -0.5, -0.2, 0.12, 0.42, 0.72, 1.0];
  var out = { lum: 0, kind: 0 };

  function field(x, y, e, lashes) {
    out.lum = 0; out.kind = KIND_SKIN;
    var ex = 1.45, ax = Math.abs(x) / ex;
    if (ax >= 1) return out;
    var shape = Math.pow(1 - Math.pow(ax, 1.7), 1.05);
    var up = 0.60 * e.open * shape, lo = -0.46 * e.open * shape;
    if (lashes && e.open > 0.25) {
      for (var i = 0; i < LASHES.length; i++) {
        var lx = LASHES[i], axl = Math.abs(lx) / ex;
        var lidY = 0.60 * e.open * Math.pow(1 - Math.pow(axl, 1.7), 1.05);
        var len = 0.24 + 0.16 * (1 - axl);
        var dx0 = lx * 0.5, dy0 = 1, n = Math.sqrt(dx0 * dx0 + dy0 * dy0);
        dx0 /= n; dy0 /= n;
        var px = x - lx, py = y - lidY;
        var t = sat((px * dx0 + py * dy0) / len);
        var qx = px - dx0 * t * len, qy = py - dy0 * t * len;
        if (Math.sqrt(qx * qx + qy * qy) < 0.03 * (1 - 0.5 * t)) { out.lum = 0.85; out.kind = KIND_LINE; return out; }
      }
    }
    var d = Math.min(up - y, y - lo);
    var crease = 0.60 * 1.32 * shape * (0.6 + 0.4 * e.open);
    if (Math.abs(y - crease) < 0.02 && y > up) { out.lum = 0.55; out.kind = KIND_LINE; return out; }
    if (y > up + 0.03 || y < lo - 0.03) return out;
    if (y > up || y < lo) { out.lum = 0.95; out.kind = KIND_LINE; return out; }
    if (d < 0.034) { out.lum = 1; out.kind = KIND_LINE; return out; }
    var lum = 0.10 + 0.14 * (1 - ax);
    lum *= 0.5 + 0.5 * smooth(0, 0.25, d);
    var dx = x - e.gx, dy = y - e.gy, r = Math.sqrt(dx * dx + dy * dy), ri = 0.50;
    out.lum = lum;
    if (r < ri) {
      var k = r / ri, ang = Math.atan2(dy, dx);
      var spoke = 0.5 + 0.5 * Math.cos(ang * 12 + e.spin);
      lum = 0.30 + 0.55 * spoke * (0.35 + 0.65 * k);
      out.kind = KIND_IRIS;
      if (k > 0.86) lum = 0.9 * (1 - smooth(0.86, 1, k)) + 0.1;
      else if (k > 0.8) lum = 0.95;
      if ((dx * dx) / (e.slit * e.slit) + (dy * dy) / (0.36 * 0.36) < 1) { lum = 0; out.kind = KIND_PUPIL; }
      var hx = dx + 0.20, hy = dy - 0.20;
      if (hx * hx + hy * hy < 0.006) { lum = 1; out.kind = KIND_LINE; }
      lum *= 0.55 + 0.45 * smooth(0, 0.2, d);
      out.lum = lum;
    }
    return out;
  }

  /* ---- how the eye moves: every variant is a loop of four seconds ---------------------------------------------------------- */

  var GAZE_X = [0, -0.45, 0.40, 0.04], GAZE_Y = [0, 0.04, -0.06, -0.08];
  var VARIANTS = ['calm', 'scan', 'sleepy', 'alert', 'blink', 'spin'];
  var TAU = Math.PI * 2;

  function lid(t, at, width) { var u = (t - at) / width; return Math.abs(u) < 1 ? 1 - Math.abs(u) : 0; }

  function eyeState(variant, time) {
    var T = 4, t = ((time % T) + T) % T, w = TAU / T;
    var e = { open: 1, gx: 0, gy: 0, slit: 0.105 + 0.035 * Math.sin(t * w), spin: -t / T * TAU };
    switch (variant) {
      case 'scan':      // a slow sweep from side to side, the iris turning with it
        e.gx = 0.5 * Math.sin(t * w); e.gy = 0.04 * Math.sin(t * w * 2);
        e.slit = 0.1; e.spin = -t / T * TAU * 2;
        break;
      case 'sleepy':    // the lids sink and rise, once, with a long blink at the bottom
        e.open = 0.30 + 0.70 * (0.5 + 0.5 * Math.cos(t * w)) * (1 - 0.9 * lid(t, 2, 0.35));
        e.gx = 0.02; e.gy = -0.1; e.slit = 0.16; e.spin = 0;
        break;
      case 'alert':     // a still look, then the pupil opens wide and shrinks back
        e.gx = 0.01 * Math.sin(t * w * 30); e.gy = 0.006 * Math.sin(t * w * 26);
        e.slit = 0.07 + 0.2 * smooth(0.9, 1.0, t) * (1 - smooth(2.2, 3.4, t));
        e.spin = -t / T * TAU * 3;
        break;
      case 'blink':     // looking ahead, two quick blinks and a slow one
        e.open = 1 - 0.92 * Math.max(lid(t, 0.9, 0.16), lid(t, 1.3, 0.16), lid(t, 2.8, 0.3));
        e.gx = 0.02 * Math.sin(t * w); e.gy = 0;
        break;
      case 'spin':      // the iris turns fast and the gaze goes round
        e.gx = 0.28 * Math.cos(t * w); e.gy = 0.10 * Math.sin(t * w);
        e.spin = -t / T * Math.PI * 6;
        break;
      default: {        // calm: looks to four places, blinks once
        var seg = Math.floor(t), since = t - seg, snap = smooth(0, 0.14, since);
        var prev = (seg + 3) % 4, cur = seg % 4;
        e.open = 1 - 0.92 * lid(t, 2.55, 0.16);
        e.gx = GAZE_X[cur] * snap + GAZE_X[prev] * (1 - snap) + 0.010 * Math.sin(t * w * 26);
        e.gy = GAZE_Y[cur] * snap + GAZE_Y[prev] * (1 - snap) + 0.006 * Math.sin(t * w * 24);
      }
    }
    return e;
  }

  /* ---- the eye in characters ---------------------------------------------------------------------------------------------- */

  var metricsCache = {};
  function cellMetrics(ctx, size) {
    var key = size + FONT;
    if (!metricsCache[key]) {
      ctx.save();
      ctx.font = 'bold ' + size + 'px ' + FONT;
      metricsCache[key] = { adv: ctx.measureText('o').width, lh: size };
      ctx.restore();
    }
    return metricsCache[key];
  }

  /*
   * Draws the eye into a canvas context of w x h pixels. opts: cell (font size in px, default 9), share (0..1 of the width, default 0.9),
   * master (brightness, default 1), shatter (0..1, share of cells that have gone), cx, cy (the middle, default the middle), scanY.
   */
  function drawEyeChars(ctx, w, h, e, opts) {
    opts = opts || {};
    var size = opts.cell || 9, master = opts.master === undefined ? 1 : opts.master, shatter = opts.shatter || 0;
    var m = cellMetrics(ctx, size), adv = m.adv, lh = m.lh;
    var R = Math.min(Math.min(w, h) * 0.5 * 0.95, w * 0.5 / 1.5 * 0.97) * (opts.share === undefined ? 0.9 : opts.share);
    var cx = opts.cx === undefined ? w / 2 : opts.cx, cy = opts.cy === undefined ? h / 2 : opts.cy;
    var c0 = Math.floor((cx - 1.5 * R) / adv), c1 = Math.ceil((cx + 1.5 * R) / adv);
    var r0 = Math.floor((cy - 1.1 * R) / lh), r1 = Math.ceil((cy + 0.7 * R) / lh);
    var cols = c1 - c0 + 1, rows = r1 - r0 + 1, n = cols * rows;
    if (cols < 2 || rows < 2) return;
    var lum = new Float32Array(n), iris = new Float32Array(n), kind = new Uint8Array(n), cls = new Uint8Array(n), edge = new Uint8Array(n);
    var lashes = size * 1 > 0;
    for (var gy = 0; gy < rows; gy++) {
      for (var gx = 0; gx < cols; gx++) {
        var sum = 0, ir = 0, k = 0, n3 = 0;
        for (var sy = 0; sy < 2; sy++) {
          for (var sx = 0; sx < 2; sx++) {
            var px = (c0 + gx + (sx + 0.5) / 2) * adv, py = (r0 + gy + (sy + 0.5) / 2) * lh;
            var f = field((px - cx) / R, (cy - py) / R, e, lashes);
            if (f.kind === KIND_LINE) n3++; else sum += f.lum;
            if (f.kind === KIND_IRIS) ir += 0.25;
            if (f.kind === KIND_PUPIL && k !== KIND_LINE) k = KIND_PUPIL;
          }
        }
        if (n3 >= 2) k = KIND_LINE;
        var i = gy * cols + gx;
        lum[i] = sum * 0.25; iris[i] = ir; kind[i] = k;
        cls[i] = k === KIND_LINE ? 3 : (k === KIND_PUPIL ? 2 : (ir > 0.4 ? 1 : 0));
      }
    }
    function C(x, y) { return x < 0 || y < 0 || x >= cols || y >= rows ? 0 : cls[y * cols + x]; }
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var kk = C(x, y);
        var en = kk === 3 || ((kk === 1 || kk === 2) && (C(x - 1, y) !== kk || C(x + 1, y) !== kk || C(x, y - 1) !== kk || C(x, y + 1) !== kk));
        edge[y * cols + x] = en ? 1 : 0;
      }
    }
    function E(x, y) { return x < 0 || y < 0 || x >= cols || y >= rows ? 0 : edge[y * cols + x]; }

    ctx.save();
    ctx.font = 'bold ' + size + 'px ' + FONT;
    ctx.textBaseline = 'top';
    var scanY = opts.scanY === undefined ? -1e9 : opts.scanY;
    for (var yy = 0; yy < rows; yy++) {
      var band = Math.exp(-Math.pow(((r0 + yy) * lh - scanY) / (lh * 3), 2));
      for (var xx = 0; xx < cols; xx++) {
        var idx = yy * cols + xx, kc = cls[idx];
        if (shatter > 0 && hash2(c0 + xx, r0 + yy + 5) < shatter * 0.97) continue;
        var crt = ((r0 + yy) & 1) ? 0.86 : 1;
        var gain = master * crt * (1 + 0.5 * band) * 1.25;
        var ch, col;
        if (E(xx, yy)) {
          var hh = E(xx - 1, yy) + E(xx + 1, yy), vv = E(xx, yy - 1) + E(xx, yy + 1);
          var d1 = E(xx + 1, yy - 1) + E(xx - 1, yy + 1), d2 = E(xx - 1, yy - 1) + E(xx + 1, yy + 1);
          ch = '-'; var best = hh;
          if (vv > best) { best = vv; ch = '|'; }
          if (d1 > best) { best = d1; ch = '/'; }
          if (d2 > best) { best = d2; ch = '\\'; }
          col = kc === 3 ? rgba(colors.text, gain * 1.1) : rgba(colors.accentHi, gain);
        } else {
          if (lum[idx] < 0.05 || kc === 2) continue;
          ch = WORD.charAt(((c0 + xx) + (r0 + yy) * 3) % WORD.length);
          var s = sat(lum[idx] * 1.25);
          col = kc === 1 ? rgba(colors.accent, (0.35 + 0.65 * s) * gain) : rgba(colors.dim, (0.25 + 0.6 * s) * gain);
        }
        ctx.fillStyle = col;
        ctx.fillText(ch, Math.floor((c0 + xx) * adv), Math.floor((r0 + yy) * lh));
      }
    }
    ctx.restore();
  }

  /* ---- the eye as pixel art ---------------------------------------------------------------------------------------------- */

  var pixelCanvases = {};

  /*
   * Draws the pixel eye into ctx at x, y, size w x h. n is the number of pixels across (default 32); every pixel is a square block.
   * opts: bg (colour or null for transparent), ys (how much taller than the logo eye, default 1.5).
   */
  function drawEyePixels(ctx, x, y, w, h, e, opts) {
    opts = opts || {};
    var n = opts.pixels || 32, ys = opts.ys || 1.5, ny = Math.round(n * h / w);
    var key = n + 'x' + ny;
    var buf = pixelCanvases[key];
    if (!buf) { buf = pixelCanvases[key] = document.createElement('canvas'); buf.width = n; buf.height = ny; }
    var bctx = buf.getContext('2d'), img = bctx.createImageData(n, ny), d = img.data;
    var R = n * 0.97 / 3, lashes = n >= 64;
    var ee = { open: e.open, gx: e.gx, gy: e.gy, slit: n < 64 ? 0.2 : e.slit, spin: e.spin };
    var bg = opts.bg === undefined ? colors.bg : opts.bg;
    for (var py = 0; py < ny; py++) {
      for (var px = 0; px < n; px++) {
        var n3 = 0, n2 = 0, n1 = 0, ns = 0, lumSum = 0;
        for (var sy = 0; sy < 4; sy++) {
          for (var sx = 0; sx < 4; sx++) {
            var f = field((px + (sx + 0.5) / 4 - n * 0.5) / R, (ny * 0.5 - (py + (sy + 0.5) / 4)) / R / ys, ee, lashes);
            if (f.kind === KIND_LINE) n3++;
            else if (f.kind === KIND_PUPIL) n2++;
            else if (f.kind === KIND_IRIS) { n1++; lumSum += f.lum; }
            else if (f.lum > 0.04) { ns++; lumSum += f.lum; }
          }
        }
        var r = bg ? bg[0] : 0, g = bg ? bg[1] : 0, b = bg ? bg[2] : 0, a = bg ? 255 : 0;
        if (n3 >= 3) { r = g = b = 240; a = 255; }
        else if (n2 >= 7) { r = g = b = 9; a = 255; }
        else if (n1 >= 6) {
          var k = 0.55 + 0.6 * (lumSum / n1);
          r = Math.min(255, 176 * k); g = Math.min(255, 142 * k); b = Math.min(255, 244 * k); a = 255;
        } else if (ns >= 6) { var l = lumSum / ns; r = 34 + 130 * l; g = r; b = r + 8; a = 255; }
        var o = (py * n + px) * 4;
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = a;
      }
    }
    bctx.putImageData(img, 0, 0);
    var keep = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, x, y, w, h);
    ctx.imageSmoothingEnabled = keep;
  }

  /* ---- the name ----------------------------------------------------------------------------------------------------------- */

  var P = ['.....', '.....', '####.', '#...#', '#...#', '#...#', '####.', '#....', '#....'];
  var A = ['.....', '.....', '.###.', '....#', '.####', '#...#', '#...#', '.####', '.....'];
  var R_ = ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....', '.....', '.....'];
  var N = ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#', '.....', '.....'];
  var O = ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.', '.....', '.....'];
  var I = ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.', '.....', '.....'];
  var DOT = ['.', '.', '.', '.', '.', '.', '#', '.', '.'];
  var M = ['.......', '.......', '.##.##.', '#..#..#', '#..#..#', '#..#..#', '#..#..#', '.......', '.......'];
  var D = ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####', '.....', '.....'];
  var Y = ['.....', '.....', '#...#', '#...#', '#...#', '.####', '....#', '####.', '.....'];
  var S = ['.....', '.....', '.####', '#....', '.###.', '....#', '####.', '.....', '.....'];
  var E = ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.', '.....', '.....'];
  var C = ['.....', '.....', '.####', '#....', '#....', '#....', '.####', '.....', '.....'];
  var GLYPHS_NAME = [O, D, Y, S, S, E, Y], GLYPHS_IM = [DOT, C, C];

  function pixelWidth(list) { var w = 0; list.forEach(function (g) { w += g[0].length + 1; }); return w - 1; }
  var NOISE = '01+=*#/\\|<>-_.:%$&@';

  /*
   * Draws glyphs as blocks of characters. look: { resolve (0 noise .. 1 the letters), master, sweep (x in glyph pixels, -1 none),
   * frame, accentFrom (index of the first accent glyph), light (dark on white) }.
   */
  function drawGlyphs(ctx, list, bw, bh, ox, oy, adv, lh, look) {
    var x = 0, total = pixelWidth(list) + 1, master = look.master === undefined ? 1 : look.master;
    var resolve = look.resolve === undefined ? 1 : look.resolve, frame = look.frame || 0;
    ctx.save();
    ctx.textBaseline = 'top';
    for (var gi = 0; gi < list.length; gi++) {
      var g = list[gi], accent = look.accentFrom !== undefined && gi >= look.accentFrom;
      for (var row = 0; row < 9; row++) {
        for (var col = 0; col < g[0].length; col++) {
          if (g[row].charAt(col) !== '#') continue;
          var px = x + col;
          var hh = hash2(px, row + 100) * 0.55 + px / total * 0.45;
          var front = resolve * 1.12 - 0.06;
          var done = hh < front, glow = sat(1 - Math.abs(hh - front) * 14);
          if (done) {
            var back = look.light ? (accent ? [214, 200, 238] : [206, 206, 212]) : (accent ? [88, 70, 136] : [62, 62, 72]);
            ctx.fillStyle = rgba(back, look.light ? 1 : master, look.light ? master : 1);
            ctx.fillRect(Math.floor((ox + px * bw) * adv), Math.floor((oy + row * bh) * lh), Math.ceil(bw * adv), Math.ceil(bh * lh));
          }
          for (var by = 0; by < bh; by++) {
            for (var bx = 0; bx < bw; bx++) {
              var cx = ox + px * bw + bx, cy = oy + row * bh + by;
              var ch, col2, v = 1 - 0.30 * ((row * bh + by) / (9 * bh));
              if (!done) {
                ch = NOISE.charAt(Math.floor(hash2(cx * 7 + (frame >> 1), cy + 3) * NOISE.length));
                var nv = 0.25 + 0.35 * hash2(cx + frame, cy);
                col2 = accent ? rgba([140, 110, 200], nv * 1.5, master) : rgba([180, 180, 200], nv * 1.5, master);
              } else {
                ch = WORD.charAt((cx + cy * 3) % WORD.length);
                var base = look.light ? (accent ? [110, 80, 190] : [24 + 120 * (1 - v), 24 + 120 * (1 - v), 30 + 120 * (1 - v)]) :
                  (accent ? [176, 142, 244] : [238, 238, 242]);
                var k = look.light ? 1 : (accent ? 0.8 + 0.2 * v : v);
                var rr = base[0] * k, gg = base[1] * k, bb = base[2] * k;
                if (look.sweep !== undefined && look.sweep >= 0) {
                  var dd = (px - look.sweep) / 5, s = Math.exp(-dd * dd) * 0.7;
                  rr += (255 - rr) * s; gg += (255 - gg) * s; bb += (255 - bb) * s;
                }
                if (glow > 0) { rr += (255 - rr) * glow; gg += (255 - gg) * glow; bb += (255 - bb) * glow; }
                col2 = rgba([rr, gg, bb], 1.5, master);
              }
              ctx.fillStyle = col2;
              ctx.fillText(ch, Math.floor(cx * adv), Math.floor(cy * lh));
            }
          }
        }
      }
      x += g[0].length + 1;
    }
    ctx.restore();
  }

  // the name centred on a row, on one line (wide) or two (tall). Returns nothing.
  function drawName(ctx, w, h, size, centerY, look, tall, share) {
    var m = cellMetrics(ctx, size), adv = m.adv, lh = m.lh, cols = Math.floor(w / adv);
    ctx.font = 'bold ' + size + 'px ' + FONT;
    share = share || 0.82;
    var row = Math.round(centerY / lh);
    function blocks(pw) { var bw = Math.max(1, Math.floor(cols * share / pw)); return [bw, Math.max(1, Math.round(bw * adv / lh))]; }
    var l = {}; for (var k in look) l[k] = look[k];
    if (!tall) {
      var all = GLYPHS_NAME.concat(GLYPHS_IM), pw = pixelWidth(all), b = blocks(pw);
      l.accentFrom = 7;
      drawGlyphs(ctx, all, b[0], b[1], Math.floor((cols - pw * b[0]) / 2), Math.round(row - 4.5 * b[1]), adv, lh, l);
    } else {
      var pa = pixelWidth(GLYPHS_NAME), pb = pixelWidth(GLYPHS_IM), b2 = blocks(pa), ox = Math.floor((cols - pa * b2[0]) / 2), oy = Math.round(row - 9.5 * b2[1]);
      l.accentFrom = undefined;
      drawGlyphs(ctx, GLYPHS_NAME, b2[0], b2[1], ox, oy, adv, lh, l);
      l.accentFrom = 0;
      drawGlyphs(ctx, GLYPHS_IM, b2[0], b2[1], ox + (pa - pb) * b2[0], oy + 10 * b2[1], adv, lh, l);
    }
  }

  /* ---- the elements ------------------------------------------------------------------------------------------------------- */

  var reduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function Canvas2D(host, w, h) {
    var dpr = Math.min(global.devicePixelRatio || 1, 3);
    var cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.style.display = 'block';
    var ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    host.appendChild(cv);
    return { cv: cv, ctx: ctx, dpr: dpr };
  }

  // <paranoia-eye size="256" mode="characters|pixel" variant="calm|scan|sleepy|alert|blink|spin" speed="1" background="#090909" static>
  function EyeElement() { return Reflect.construct(HTMLElement, [], EyeElement); }
  EyeElement.prototype = Object.create(HTMLElement.prototype);
  EyeElement.prototype.constructor = EyeElement;
  EyeElement.prototype.connectedCallback = function () {
    var self = this;
    var size = parseInt(this.getAttribute('size') || '256', 10);
    var wide = size, tall = Math.round(size * 0.62);
    this.style.display = this.style.display || 'inline-block';
    this.style.lineHeight = '0';
    var c = Canvas2D(this, wide, this.getAttribute('mode') === 'pixel' ? Math.round(wide * 0.62) : tall);
    var pixel = this.getAttribute('mode') === 'pixel';
    var bgAttr = this.getAttribute('background');
    var visible = true, t0 = performance.now(), raf = 0;
    function bgColour() {
      if (!bgAttr) return null;
      var m = /^#?([0-9a-f]{6})$/i.exec(bgAttr);
      return m ? [parseInt(m[1].substr(0, 2), 16), parseInt(m[1].substr(2, 2), 16), parseInt(m[1].substr(4, 2), 16)] : null;
    }
    function draw(now) {
      var variant = self.getAttribute('variant') || 'calm', speed = parseFloat(self.getAttribute('speed') || '1');
      var t = (now - t0) / 1000 * speed;
      if (self.hasAttribute('static') || reduced) t = 0.55;
      var e = eyeState(variant, t), ctx = c.ctx, w = wide, h = c.cv.height / c.dpr;
      ctx.clearRect(0, 0, w, h);
      var bg = bgColour();
      if (bg) { ctx.fillStyle = rgba(bg, 1); ctx.fillRect(0, 0, w, h); }
      if (pixel) {
        drawEyePixels(ctx, 0, 0, w, h, e, { pixels: parseInt(self.getAttribute('pixels') || '32', 10), bg: bg });
      } else {
        var cell = Math.max(5, Math.round(size / 36));
        var rr = Math.min(h * 0.475, w * 0.3233);
        drawEyeChars(ctx, w, h, e, { cell: cell, share: 1, cy: h * 0.5 + rr * 0.2 });
      }
    }
    function frame(now) {
      if (visible) draw(now);
      if (!(self.hasAttribute('static') || reduced)) raf = requestAnimationFrame(frame);
    }
    this._stop = function () { cancelAnimationFrame(raf); };
    if ('IntersectionObserver' in global) {
      this._io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; });
      this._io.observe(this);
    }
    raf = requestAnimationFrame(frame);
  };
  EyeElement.prototype.disconnectedCallback = function () { if (this._stop) this._stop(); if (this._io) this._io.disconnect(); };

  // <paranoia-name width="640" animate style="white-accent|white|accent" tall>
  function NameElement() { return Reflect.construct(HTMLElement, [], NameElement); }
  NameElement.prototype = Object.create(HTMLElement.prototype);
  NameElement.prototype.constructor = NameElement;
  NameElement.prototype.connectedCallback = function () {
    var self = this;
    var w = parseInt(this.getAttribute('width') || '640', 10), tall = this.hasAttribute('tall');
    var size = Math.max(5, Math.round(w / (tall ? 90 : 150)));
    var h = Math.round(size * (tall ? 24 : 12) * (tall ? 1.1 : 1.1)) + size * 6;
    this.style.display = this.style.display || 'inline-block';
    this.style.lineHeight = '0';
    var c = Canvas2D(this, w, h);
    var animate = this.hasAttribute('animate') && !reduced, t0 = performance.now(), raf = 0, done = false;
    function draw(resolve, now) {
      var look = { resolve: resolve, master: 1, frame: Math.floor((now - t0) / 33), sweep: resolve >= 1 ? ((now - t0) / 1000 * 40) % 100 - 15 : -1 };
      if (!self.hasAttribute('sweep')) look.sweep = -1;
      var mode = self.getAttribute('look') || 'white-accent';
      if (mode === 'white') look.accentFrom = 99;
      c.ctx.clearRect(0, 0, w, h);
      drawName(c.ctx, w, h, size, h / 2, look, tall, 0.96);
    }
    function frame(now) {
      var r = animate ? smooth(0.2, 1.6, (now - t0) / 1000) : 1;
      draw(r, now);
      if (r < 1 || self.hasAttribute('sweep')) raf = requestAnimationFrame(frame); else done = true;
    }
    this.replay = function () { t0 = performance.now(); animate = !reduced; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); };
    this._stop = function () { cancelAnimationFrame(raf); };
    raf = requestAnimationFrame(frame);
  };
  NameElement.prototype.disconnectedCallback = function () { if (this._stop) this._stop(); };

  if (global.customElements && global.Reflect && Reflect.construct) {
    try {
      Object.setPrototypeOf(EyeElement, HTMLElement);
      Object.setPrototypeOf(NameElement, HTMLElement);
      if (!customElements.get('paranoia-eye')) customElements.define('paranoia-eye', EyeElement);
      if (!customElements.get('paranoia-name')) customElements.define('paranoia-name', NameElement);
    } catch (err) { /* old browser: the functions still work */ }
  }

  /* ---- the intro ------------------------------------------------------------------------------------------------------- */

  // a short sound made of oscillators and noise, like the one in the videos
  function sting(variant) {
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    var ac = new AC(), now = ac.currentTime, master = ac.createGain();
    master.gain.value = 0.7; master.connect(ac.destination);
    function tone(freq, start, dur, gain, endFreq) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(freq, now + start);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, now + start + dur);
      g.gain.setValueAtTime(0.0001, now + start);
      g.gain.exponentialRampToValueAtTime(gain, now + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.connect(g); g.connect(master); o.start(now + start); o.stop(now + start + dur + 0.05);
    }
    function noise(start, dur, gain) {
      var buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1500; g.gain.value = gain;
      s.buffer = buf; s.connect(f); f.connect(g); g.connect(master); s.start(now + start);
    }
    if (variant !== 'eye') {
      noise(0.2, 1.3, 0.12); tone(300, 0.2, 1.3, 0.05, 1700);
      tone(52, 1.5, 1.0, 0.5); tone(1318.5, 1.5, 0.9, 0.12); tone(1760, 1.5, 0.8, 0.08);
    } else {
      tone(55, 0, 3.9, 0.2, 130);
      [1.5, 2.25, 2.95].forEach(function (s) { tone(1900, s, 0.09, 0.18); });
      noise(3.0, 0.95, 0.1); tone(700, 3.0, 0.95, 0.05, 3300);
      tone(48, 4.05, 0.95, 0.5); tone(1318.5, 4.05, 0.95, 0.12); tone(1760, 4.05, 0.9, 0.08); tone(2637, 4.05, 0.8, 0.06);
    }
    return ac;
  }

  /*
   * Paranoia.intro(opts) plays a full screen intro and resolves when it is gone.
   * opts: variant 'eye' (5 s), 'short' (2.5 s), 'scan' (3.4 s, a line sweeps over the name as it resolves) or 'glitch' (2.6 s, the name flickers in), sound (default false; browsers need a click first), skippable (default true),
   * parent (default document.body), background (default #090909), cell (font size of the characters, default 10).
   */
  function intro(opts) {
    opts = opts || {};
    var variant = opts.variant || 'eye', dur = variant === 'eye' ? 5 : (variant === 'scan' ? 3.4 : (variant === 'glitch' ? 2.6 : 2.5));
    var parent = opts.parent || document.body;
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:' + (opts.background || '#090909') + ';cursor:' + (opts.skippable === false ? 'default' : 'pointer');
    parent.appendChild(box);
    var w = box.clientWidth || global.innerWidth, h = box.clientHeight || global.innerHeight;
    var c = Canvas2D(box, w, h), ctx = c.ctx, size = opts.cell || 10, tall = h > w * 1.1;
    var ac = opts.sound ? sting(variant) : null;
    return new Promise(function (resolve) {
      var t0 = performance.now(), raf = 0, ended = false;
      function end() {
        if (ended) return; ended = true;
        cancelAnimationFrame(raf);
        box.style.transition = 'opacity .3s'; box.style.opacity = '0';
        setTimeout(function () { box.remove(); if (ac) ac.close(); resolve(); }, 320);
      }
      if (opts.skippable !== false) { box.addEventListener('click', end); global.addEventListener('keydown', function onKey(ev) { if (ev.key === 'Escape' || ev.key === ' ' || ev.key === 'Enter') { global.removeEventListener('keydown', onKey); end(); } }); }
      if (reduced) { setTimeout(end, 600); }
      function frame(now) {
        var t = (now - t0) / 1000, frameNo = Math.floor(t * 30);
        ctx.fillStyle = opts.background || '#090909'; ctx.fillRect(0, 0, w, h);
        if (variant === 'scan') {
          var ms = smooth(0, 0.3, t) * (1 - smooth(3.0, 3.4, t));
          var sw = t > 0.2 ? ((t - 0.2) / 1.6 % 1) * 110 - 10 : -1;
          drawName(ctx, w, h, size, h / 2, { resolve: smooth(0.3, 2.2, t), master: ms, frame: frameNo, sweep: t < 2.9 ? sw : -1 }, tall, 0.82);
          ctx.fillStyle = 'rgba(176,142,244,' + (0.18 * ms) + ')';
          ctx.fillRect(0, ((t * 0.55) % 1.2 - 0.1) * h, w, 2);
        } else if (variant === 'glitch') {
          var mg = smooth(0, 0.2, t) * (1 - smooth(2.3, 2.6, t)), fl = t < 1.5 && hash2(frameNo, 7) > 0.55 ? 0.3 + 0.5 * hash2(frameNo, 11) : 1;
          var jx = t < 1.5 && hash2(frameNo, 3) > 0.7 ? Math.round((hash2(frameNo, 5) - 0.5) * size * 3) : 0;
          ctx.save(); ctx.translate(jx, 0);
          drawName(ctx, w, h, size, h / 2, { resolve: smooth(0.1, 1.5, t), master: mg * fl, frame: frameNo, sweep: t > 1.5 ? (t - 1.5) / 0.7 * 70 - 5 : -1 }, tall, 0.82);
          ctx.restore();
        } else if (variant === 'short') {
          var m = smooth(0, 0.3, t) * (1 - smooth(2.15, 2.5, t));
          drawName(ctx, w, h, size, h / 2, { resolve: smooth(0.25, 1.5, t), master: m, frame: frameNo, sweep: t > 1.5 ? (t - 1.5) / 0.6 * 70 - 5 : -1 }, tall, 0.82);
        } else {
          var master = smooth(0.05, 0.7, t) * (1 - smooth(4.65, 5, t));
          var e = eyeState('calm', t + 0.5);
          var open = smooth(0.3, 1.3, t) * (1 - smooth(3.05, 3.6, t));
          e.open *= open;
          var shatter = smooth(3.0, 3.9, t), scanY = ((t * 0.42) % 1.25) * h - 0.1 * h;
          if (open > 0.01 && shatter < 0.999) drawEyeChars(ctx, w, h, e, { cell: size, share: 0.9, master: master, shatter: shatter, cy: tall ? h * 0.3 : h * 0.5, scanY: scanY });
          var resolveName = smooth(3.15, 4.3, t);
          if (resolveName > 0.001)
            drawName(ctx, w, h, size, tall ? h * 0.62 : h * 0.5, { resolve: resolveName, master: master, frame: frameNo, sweep: t > 4.3 ? (t - 4.3) / 0.45 * 70 - 5 : -1 }, tall, 0.82);
        }
        if (t >= dur) { end(); return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    });
  }

  /* ---- the favicon -------------------------------------------------------------------------------------------------------- */

  var faviconState = null;
  var favicon = {
    // Paranoia.favicon.start({ variant: 'blink', interval: 120 }): the pixel eye as the tab icon. stop() puts the old icon back.
    start: function (opts) {
      opts = opts || {};
      if (faviconState) return;
      var link = document.querySelector('link[rel~="icon"]'), old = link ? link.href : null, created = false;
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); created = true; }
      var cv = document.createElement('canvas'); cv.width = cv.height = 32;
      var ctx = cv.getContext('2d'), t0 = performance.now();
      function tick() {
        var e = eyeState(opts.variant || 'blink', (performance.now() - t0) / 1000);
        ctx.clearRect(0, 0, 32, 32);
        drawEyePixels(ctx, 0, 0, 32, 32, e, { pixels: 32, bg: null });
        link.type = 'image/png'; link.href = cv.toDataURL('image/png');
      }
      tick();
      faviconState = { timer: setInterval(tick, opts.interval || 120), link: link, old: old, created: created };
    },
    stop: function () {
      if (!faviconState) return;
      clearInterval(faviconState.timer);
      if (faviconState.created) faviconState.link.remove(); else if (faviconState.old) faviconState.link.href = faviconState.old;
      faviconState = null;
    },
    // one frame as a data URL, to use as a static icon
    frame: function (variant, time) {
      var cv = document.createElement('canvas'); cv.width = cv.height = 32;
      var ctx = cv.getContext('2d');
      drawEyePixels(ctx, 0, 0, 32, 32, eyeState(variant || 'calm', time === undefined ? 0.55 : time), { pixels: 32, bg: null });
      return cv.toDataURL('image/png');
    }
  };

  global.Paranoia = {
    colors: colors, variants: VARIANTS, eyeState: eyeState,
    drawEyeChars: drawEyeChars, drawEyePixels: drawEyePixels, drawName: drawName,
    intro: intro, favicon: favicon, sting: sting
  };

  /* ---- Canvas-based Odyssey Intro (Pure Code, No MP4) ------------------------------------------------------------------ */
  function runIntroOnCanvas(cv, onEnd) {
    if (!cv) return function () {};
    var ended = false;
    var raf = 0;
    var ac = null;
    try { ac = sting('eye'); } catch (err) {}

    function finish() {
      if (ended) return;
      ended = true;
      cancelAnimationFrame(raf);
      global.removeEventListener('resize', resize);
      global.removeEventListener('keydown', onKey);
      cv.removeEventListener('click', finish);
      if (ac) { try { ac.close(); } catch (e) {} }
      if (onEnd) onEnd();
    }

    function onKey(ev) {
      if (ev.key === 'Escape' || ev.key === ' ' || ev.key === 'Enter') finish();
    }
    global.addEventListener('keydown', onKey);
    cv.addEventListener('click', finish);

    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var ctx = cv.getContext('2d');
    var w = 0, h = 0;

    function resize() {
      w = cv.clientWidth || global.innerWidth;
      h = cv.clientHeight || global.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    }
    resize();
    global.addEventListener('resize', resize);

    var t0 = performance.now();
    var dur = 4.8;

    function frame(now) {
      if (ended) return;
      var t = (now - t0) / 1000;
      var frameNo = Math.floor(t * 30);
      var size = Math.max(8, Math.min(12, Math.round(w / 110)));
      var tall = h > w * 1.1;

      ctx.fillStyle = '#090909';
      ctx.fillRect(0, 0, w, h);

      var master = smooth(0.05, 0.7, t) * (1 - smooth(4.45, 4.8, t));
      var e = eyeState('calm', t + 0.5);
      var open = smooth(0.2, 1.2, t) * (1 - smooth(2.9, 3.5, t));
      e.open *= open;
      var shatter = smooth(2.8, 3.7, t);
      var scanY = ((t * 0.42) % 1.25) * h - 0.1 * h;

      if (open > 0.01 && shatter < 0.999) {
        drawEyeChars(ctx, w, h, e, {
          cell: size,
          share: 0.9,
          master: master,
          shatter: shatter,
          cy: tall ? h * 0.35 : h * 0.5,
          scanY: scanY
        });
      }

      var resolveName = smooth(3.0, 4.2, t);
      if (resolveName > 0.001) {
        drawName(ctx, w, h, size, tall ? h * 0.62 : h * 0.5, {
          resolve: resolveName,
          master: master,
          frame: frameNo,
          sweep: t > 4.1 ? (t - 4.1) / 0.5 * 70 - 5 : -1
        }, tall, 0.82);
      }

      if (t >= dur) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return finish;
  }

  global.runOdysseyIntro = runIntroOnCanvas;

})(typeof window !== 'undefined' ? window : this);
