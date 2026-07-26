/* =========================================================================
   app.js - 状态、评分、渲染、Canvas 票根、保存与调试
   数据只来自 data.js（window.SDY_DATA），音频只来自 audio.js（window.SDY_AUDIO）。
   songId 是全项目唯一主键；中文歌名只用于展示。
   ========================================================================= */
(function () {
  'use strict';

  var DATA = window.SDY_DATA;
  var PLAYER = window.SDY_AUDIO;

  var EXPECTED_SONG_IDS = DATA.EXPECTED_SONG_IDS;
  var SONG_AUDIO = DATA.SONG_AUDIO;
  var DIMENSIONS = DATA.DIMENSIONS;
  var DIMENSION_WEIGHTS = DATA.DIMENSION_WEIGHTS;
  var QUESTIONS = DATA.QUESTIONS;
  var RESULTS = DATA.RESULTS;
  var TOUR_CONFIG = DATA.TOUR_CONFIG;

  var STORAGE_KEY = 'sdy.songticket.v2';
  var TOTAL_QUESTIONS = QUESTIONS.length;
  var SHOW_MINIPROGRAM_NOTE = false;
  var TICKET_W = 1080;
  var TICKET_H = 1440;

  /* =======================================================================
     1. 评分算法：确定性，无随机
     ======================================================================= */

  function emptyVector() {
    var v = {};
    for (var i = 0; i < DIMENSIONS.length; i++) v[DIMENSIONS[i]] = 0;
    return v;
  }

  function buildUserVector(answers) {
    var v = emptyVector();
    for (var i = 0; i < QUESTIONS.length; i++) {
      var pick = answers[i];
      if (pick == null) continue;
      var opt = QUESTIONS[i].options[pick];
      if (!opt) continue;
      for (var d in opt.v) {
        if (Object.prototype.hasOwnProperty.call(v, d)) v[d] += opt.v[d];
      }
    }
    return v;
  }

  function normalizeVector(v) {
    var sum = 0, i, d;
    for (i = 0; i < DIMENSIONS.length; i++) { d = DIMENSIONS[i]; sum += (v[d] || 0) * (v[d] || 0); }
    var len = Math.sqrt(sum);
    var out = emptyVector();
    if (len === 0) return out;
    for (i = 0; i < DIMENSIONS.length; i++) { d = DIMENSIONS[i]; out[d] = (v[d] || 0) / len; }
    return out;
  }

  function weightedCosine(a, b) {
    var dot = 0, na = 0, nb = 0, i, d, w;
    for (i = 0; i < DIMENSIONS.length; i++) {
      d = DIMENSIONS[i];
      w = DIMENSION_WEIGHTS[d] || 1;
      dot += w * (a[d] || 0) * (b[d] || 0);
      na += w * (a[d] || 0) * (a[d] || 0);
      nb += w * (b[d] || 0) * (b[d] || 0);
    }
    if (na === 0 || nb === 0) return 0;
    return dot / Math.sqrt(na * nb);
  }

  function weightedDistance(a, b) {
    var sum = 0, i, d, diff;
    for (i = 0; i < DIMENSIONS.length; i++) {
      d = DIMENSIONS[i];
      diff = (a[d] || 0) - (b[d] || 0);
      sum += (DIMENSION_WEIGHTS[d] || 1) * diff * diff;
    }
    return Math.sqrt(sum);
  }

  // FNV-1a：仅用于极接近时的稳定平分，绝不随刷新改变
  function stableHash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function scoreAll(answers) {
    var raw = buildUserVector(answers);
    var user = normalizeVector(raw);
    var seed = 'sdy|' + answers.join('-');
    var rows = RESULTS.map(function (song) {
      var songUnit = normalizeVector(song.vector);
      var cos = weightedCosine(user, songUnit);
      var dist = weightedDistance(user, songUnit);
      var closeness = 1 - Math.min(dist / 2.2, 1);
      var base = 0.72 * ((cos + 1) / 2) + 0.28 * closeness;
      var calibration = song.calibration || 0;
      var jitter = (stableHash(seed + '|' + song.songId) % 1000) / 1000 * 0.0008;
      return {
        songId: song.songId,
        title: song.title,
        cos: cos,
        distance: dist,
        calibration: calibration,
        score: base + calibration + jitter
      };
    });
    rows.sort(function (a, b) { return b.score - a.score; });
    return { rawVector: raw, userVector: user, rows: rows };
  }

  function resultBySongId(songId) {
    for (var i = 0; i < RESULTS.length; i++) if (RESULTS[i].songId === songId) return RESULTS[i];
    return null;
  }

  /* =======================================================================
     2. 本地状态
     ======================================================================= */

  var state = {
    index: 0,
    answers: new Array(TOTAL_QUESTIONS).fill(null),
    nickname: '',
    songId: null,
    ticketCode: null
  };

  var storageOK = (function () {
    try {
      var k = '__sdy_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function saveState() {
    if (!storageOK) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        index: state.index,
        answers: state.answers,
        nickname: state.nickname,
        songId: state.songId,
        ticketCode: state.ticketCode
      }));
    } catch (e) { /* 隐私模式或配额：静默降级为内存状态 */ }
  }

  function loadState() {
    if (!storageOK) return null;
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.answers)) return null;
      var answers = new Array(TOTAL_QUESTIONS).fill(null);
      for (var i = 0; i < TOTAL_QUESTIONS; i++) {
        var a = data.answers[i];
        answers[i] = (typeof a === 'number' && a >= 0 && a < 4) ? a : null;
      }
      return {
        index: Math.min(Math.max(parseInt(data.index, 10) || 0, 0), TOTAL_QUESTIONS - 1),
        answers: answers,
        nickname: typeof data.nickname === 'string' ? data.nickname : '',
        songId: resultBySongId(data.songId) ? data.songId : null,
        ticketCode: typeof data.ticketCode === 'string' ? data.ticketCode : null
      };
    } catch (e) { return null; }
  }

  function clearState() {
    state.index = 0;
    state.answers = new Array(TOTAL_QUESTIONS).fill(null);
    state.nickname = '';
    state.songId = null;
    state.ticketCode = null;
    if (!storageOK) return;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function answeredCount() {
    return state.answers.filter(function (a) { return a != null; }).length;
  }

  /* =======================================================================
     3. 工具与屏幕
     ======================================================================= */

  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  var SCREENS = ['intro', 'about', 'quiz', 'sign', 'issue', 'result'];
  var timers = [];
  function later(fn, ms) {
    var t = window.setTimeout(fn, reduceMotion ? Math.min(ms, 60) : ms);
    timers.push(t);
    return t;
  }
  function clearTimers() {
    timers.forEach(function (t) { window.clearTimeout(t); window.clearInterval(t); });
    timers = [];
  }

  function showScreen(name) {
    clearTimers();
    SCREENS.forEach(function (s) {
      var el = $('screen-' + s);
      if (!el) return;
      if (s === name) {
        el.hidden = false;
        el.style.animation = 'none';
        void el.offsetHeight;
        el.style.animation = '';
      } else {
        el.hidden = true;
      }
    });
    window.scrollTo(0, 0);
  }

  function toast(message, ms) {
    var el = $('toast');
    el.textContent = message;
    el.hidden = false;
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () { el.hidden = true; }, ms || 2600);
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function formatDate(d) {
    return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
  }
  function serialDate(d) {
    return '' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  // 票根编号 SDY-YYYYMMDD-XXXX：日期 + 本机生成的稳定片段，不宣称全球唯一，不上传
  function makeTicketCode() {
    var chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    var tail = '';
    var bytes = null;
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        bytes = new Uint8Array(4);
        window.crypto.getRandomValues(bytes);
      }
    } catch (e) { bytes = null; }
    for (var i = 0; i < 4; i++) {
      var n = bytes ? bytes[i] : Math.floor(Math.random() * 256);
      tail += chars.charAt(n % chars.length);
    }
    return 'SDY-' + serialDate(new Date()) + '-' + tail;
  }

  // 昵称清洗：去控制字符与换行，禁止 HTML 字符，中文按 2 计、英文按 1 计，上限 20
  function sanitizeNickname(input) {
    var s = String(input == null ? '' : input);
    s = s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029]/g, '');
    s = s.replace(/[<>&"'`\\]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    var out = '', width = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var w = ch.charCodeAt(0) > 255 ? 2 : 1;
      if (width + w > 20) break;
      out += ch;
      width += w;
    }
    return out;
  }

  function displayName() { return state.nickname ? state.nickname : '无名旅人'; }

  // 运行时结果对象：songId / title / personalityName / shortDescription / fullDescription / ticketCode
  function buildResultObject(songId) {
    var song = resultBySongId(songId);
    if (!song) return null;
    if (!state.ticketCode) { state.ticketCode = makeTicketCode(); saveState(); }
    return {
      songId: song.songId,
      title: song.title,
      album: song.album,
      personalityName: song.personalityName,
      shortDescription: song.shortDescription,
      fullDescription: song.fullDescription,
      keywords: song.keywords,
      symbol: song.symbol,
      ticketCode: state.ticketCode
    };
  }

  /* =======================================================================
     4. 答题
     ======================================================================= */

  var quizLocked = false;

  function renderQuestion() {
    var i = Math.min(Math.max(state.index, 0), TOTAL_QUESTIONS - 1);
    state.index = i;
    var q = QUESTIONS[i];

    $('q-counter').textContent = pad2(i + 1) + ' / ' + TOTAL_QUESTIONS;
    $('q-scene').textContent = q.scene;
    $('q-text').textContent = q.text;
    $('q-progress').style.width = ((i + 1) / TOTAL_QUESTIONS * 100) + '%';
    var pb = document.querySelector('.progress');
    if (pb) pb.setAttribute('aria-valuenow', String(i + 1));
    $('btn-prev').disabled = i === 0;

    var box = $('q-options');
    box.textContent = '';
    q.options.forEach(function (opt, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'option';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', state.answers[i] === idx ? 'true' : 'false');
      var mark = document.createElement('span');
      mark.className = 'option__mark';
      mark.setAttribute('aria-hidden', 'true');
      var text = document.createElement('span');
      text.className = 'option__text';
      text.textContent = opt.label;
      b.appendChild(mark);
      b.appendChild(text);
      b.addEventListener('click', function () { pickOption(idx, b); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          var n = b.nextElementSibling || box.firstElementChild;
          if (n) n.focus();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var p = b.previousElementSibling || box.lastElementChild;
          if (p) p.focus();
        }
      });
      box.appendChild(b);
    });
  }

  function pickOption(idx, btn) {
    if (quizLocked) return;
    quizLocked = true;
    state.answers[state.index] = idx;
    Array.prototype.forEach.call($('q-options').children, function (el) {
      el.setAttribute('aria-checked', 'false');
      el.classList.remove('option--picked');
    });
    btn.setAttribute('aria-checked', 'true');
    btn.classList.add('option--picked');
    saveState();

    later(function () {
      quizLocked = false;
      if (state.index < TOTAL_QUESTIONS - 1) {
        state.index += 1;
        saveState();
        renderQuestion();
        var first = $('q-options').firstElementChild;
        if (first) first.focus({ preventScroll: true });
      } else {
        goSign();
      }
    }, 300);
  }

  function goQuiz(index) {
    if (typeof index === 'number') state.index = index;
    showScreen('quiz');
    renderQuestion();
  }

  function goSign() {
    showScreen('sign');
    $('nickname').value = state.nickname || '';
  }

  /* =======================================================================
     5. 签发 → 揭晓
     ======================================================================= */

  var ISSUE_LINES = ['正在核对你的旧事……', '正在寻找与你最接近的那首歌……', '票根签发中……'];
  var pendingResult = null;
  var issuing = false;

  function runIssue(result) {
    issuing = true;
    pendingResult = result;
    showScreen('issue');
    var out = $('issue-live');
    var gate = $('issue-gate');
    gate.hidden = true;
    out.textContent = '';

    function done() {
      issuing = false;
      out.textContent = '票根已签发。';
      gate.hidden = false;
      var btn = $('btn-reveal');
      if (btn) btn.focus({ preventScroll: true });
    }

    if (reduceMotion) { out.textContent = ISSUE_LINES[ISSUE_LINES.length - 1]; later(done, 200); return; }

    var lineIndex = 0;
    function typeLine() {
      var text = ISSUE_LINES[lineIndex];
      var charIndex = 0;
      out.textContent = '';
      var iv = window.setInterval(function () {
        charIndex += 1;
        out.textContent = text.slice(0, charIndex);
        if (charIndex >= text.length) {
          window.clearInterval(iv);
          lineIndex += 1;
          if (lineIndex < ISSUE_LINES.length) later(typeLine, 150);
          else later(done, 260);
        }
      }, 34);
      timers.push(iv);
    }
    typeLine();
  }

  /* =======================================================================
     6. 结果页
     ======================================================================= */

  var currentResult = null;
  var ticketDataURL = null;
  var ticketBlob = null;

  function renderResult(result, options) {
    options = options || {};
    currentResult = result;

    $('r-serial').textContent = 'NO. ' + result.ticketCode;
    $('r-title').textContent = '《' + result.title + '》';
    $('r-persona').textContent = result.personalityName;
    $('r-album').textContent = '专辑《' + result.album + '》 / 签发于 ' + formatDate(new Date());
    $('r-short').textContent = result.shortDescription;

    var long = $('r-long');
    long.textContent = '';
    result.fullDescription.split('\n\n').forEach(function (p) {
      var el = document.createElement('p');
      el.textContent = p;
      long.appendChild(el);
    });

    var kw = $('r-keywords');
    kw.textContent = '';
    result.keywords.slice(0, 5).forEach(function (word) {
      var li = document.createElement('li');
      li.textContent = word;
      kw.appendChild(li);
    });

    showScreen('result');

    var steps = document.querySelectorAll('#reveal .reveal__step');
    Array.prototype.forEach.call(steps, function (el) { el.classList.remove('is-in'); });
    $('ticket-wrap').classList.remove('is-in');

    var delay = options.instant || reduceMotion ? 0 : 140;
    var gap = options.instant || reduceMotion ? 0 : 180;
    Array.prototype.forEach.call(steps, function (el, i) {
      later(function () { el.classList.add('is-in'); }, delay + i * gap);
    });

    buildTicketImage(result);
    later(function () { $('ticket-wrap').classList.add('is-in'); }, delay + steps.length * gap + 200);

    $('save-hint').textContent = isLongPressPlatform()
      ? '在 iOS 或微信里，长按上方票根即可保存到相册。'
      : '点击「保存票根」下载 PNG；在手机上也可以长按图片保存。';

    if (debugOn) renderDebug();
  }

  /* =======================================================================
     7. Canvas 票根（1080 × 1440，本地绘制，不含播放器与进度）
     ======================================================================= */

  var FONT_SERIF = '"Songti SC","STSong","Source Han Serif SC","SimSun",serif';
  var FONT_SANS = '"PingFang SC","MiSans","Microsoft YaHei","Hiragino Sans GB",sans-serif';
  var FONT_MONO = '"Arial Narrow","Helvetica Neue",Menlo,monospace';

  var TICKET_PAPER = '#e4e1d8';
  var TICKET_INK = '#11110f';
  var TICKET_DIM = '#68665f';
  var TICKET_RED = '#861820';
  var TICKET_SIGNAL = '#9ead54';

  function makeRandom(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function drawSpacedText(ctx, text, x, y, spacing) {
    var cx = x;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + spacing;
    }
    return cx - spacing;
  }

  function spacedWidth(ctx, text, spacing) {
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text.charAt(i)).width + spacing;
    return w - spacing;
  }

  function wrapLines(ctx, text, maxWidth, maxLines) {
    var lines = [], line = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      var test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
        if (maxLines && lines.length === maxLines) { line = ''; break; }
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      while (last && ctx.measureText(last + '…').width > maxWidth) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  function dashedLine(ctx, x1, y, x2, dash, gap, color, width) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.beginPath();
    for (var x = x1; x < x2; x += dash + gap) {
      ctx.moveTo(x, y);
      ctx.lineTo(Math.min(x + dash, x2), y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
  function rect(c, x, y, w, h) { c.beginPath(); c.rect(x, y, w, h); c.stroke(); }
  function poly(c, pts) {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  function arcLine(c, x, y, r, a1, a2) { c.beginPath(); c.arc(x, y, r, a1, a2); c.stroke(); }

  /* 19 个原创抽象符号，纯 Canvas 几何绘制，无图片依赖 */
  var SYMBOLS = {
    shoreName: function (c, s) {            // 莉莉安：岸线、远处的一点、留下的名字刻痕
      line(c, 0, s * .68, s, s * .68);
      circle(c, s * .74, s * .3, s * .11);
      line(c, s * .16, s * .82, s * .42, s * .82);
      line(c, s * .16, s * .9, s * .32, s * .9);
    },
    returnWing: function (c, s) {           // 鸽子：归途的两道翅膀 + 春天的芽
      poly(c, [[s * .1, s * .5], [s * .38, s * .3], [s * .62, s * .5]]);
      poly(c, [[s * .3, s * .68], [s * .58, s * .48], [s * .82, s * .68]]);
      line(c, s * .5, s * .78, s * .5, s * .96);
      line(c, s * .5, s * .86, s * .66, s * .78);
    },
    nightWater: function (c, s) {           // 董小姐：夜色水面的三道涟漪 + 一缕烟
      arcLine(c, s * .5, s * .62, s * .42, Math.PI, Math.PI * 2);
      arcLine(c, s * .5, s * .74, s * .3, Math.PI, Math.PI * 2);
      arcLine(c, s * .5, s * .86, s * .18, Math.PI, Math.PI * 2);
      line(c, s * .5, s * .1, s * .5, s * .38);
    },
    stripes: function (c, s) {              // 斑马，斑马：斑马纹，其中一道断开
      for (var i = 0; i < 5; i++) {
        var x = s * (.14 + i * .18);
        if (i === 3) { line(c, x, s * .18, x + s * .12, s * .5); line(c, x + s * .16, s * .62, x + s * .24, s * .84); }
        else line(c, x, s * .18, x + s * .22, s * .84);
      }
    },
    stairs: function (c, s) {               // 六层楼：六层楼梯，向右上重复
      for (var i = 0; i < 6; i++) {
        var y = s * (.88 - i * .14);
        line(c, s * (.08 + i * .12), y, s * (.36 + i * .12), y);
      }
    },
    compass: function (c, s) {              // 关忆北：指北针，北方箭头被擦成虚线
      circle(c, s * .5, s * .5, s * .38);
      line(c, s * .5, s * .12, s * .5, s * .3);
      line(c, s * .5, s * .7, s * .5, s * .88);
      line(c, s * .12, s * .5, s * .88, s * .5);
      c.save();
      c.setLineDash([6, 8]);
      poly(c, [[s * .38, s * .44], [s * .5, s * .22], [s * .62, s * .44]]);
      c.restore();
    },
    boat: function (c, s) {                 // 卡比巴拉的海：小船、桅杆、深海
      arcLine(c, s * .5, s * .44, s * .34, 0, Math.PI);
      line(c, s * .16, s * .44, s * .84, s * .44);
      line(c, s * .5, s * .1, s * .5, s * .44);
      line(c, s * .06, s * .68, s * .94, s * .68);
      line(c, s * .18, s * .84, s * .82, s * .84);
    },
    windowTree: function (c, s) {           // 连衣裙：窗、树、新芽
      rect(c, s * .1, s * .12, s * .48, s * .5);
      line(c, s * .34, s * .12, s * .34, s * .62);
      line(c, s * .1, s * .37, s * .58, s * .37);
      line(c, s * .78, s * .18, s * .78, s * .9);
      line(c, s * .78, s * .42, s * .62, s * .3);
      line(c, s * .78, s * .56, s * .94, s * .44);
    },
    bridge: function (c, s) {                // 安和桥：桥拱、环路、空座
      arcLine(c, s * .5, s * .62, s * .4, Math.PI, Math.PI * 2);
      line(c, s * .04, s * .62, s * .96, s * .62);
      line(c, s * .3, s * .62, s * .3, s * .78);
      line(c, s * .7, s * .62, s * .7, s * .78);
      rect(c, s * .42, s * .82, s * .16, s * .12);
    },
    heldBox: function (c, s) {               // 给抱着盒子的姑娘：抱住的盒子、盖线、系绳
      rect(c, s * .22, s * .44, s * .56, s * .4);
      line(c, s * .22, s * .56, s * .78, s * .56);
      line(c, s * .5, s * .44, s * .5, s * .84);
      arcLine(c, s * .5, s * .44, s * .3, Math.PI * 1.15, Math.PI * 1.85);
      circle(c, s * .5, s * .16, s * .09);
    },
    stampCut: function (c, s) {               // 与我交谈：审核印章 + 被划掉的文字块
      rect(c, s * .08, s * .12, s * .84, s * .34);
      line(c, s * .08, s * .29, s * .92, s * .29);
      line(c, s * .12, s * .62, s * .74, s * .62);
      line(c, s * .12, s * .74, s * .6, s * .74);
      line(c, s * .12, s * .86, s * .68, s * .86);
      c.save(); c.lineWidth = s * .02;
      line(c, s * .18, s * .92, s * .82, s * .56);
      c.restore();
    },
    sunStitch: function (c, s) {              // 谢谢你：落日、地平线、缝合线
      arcLine(c, s * .5, s * .56, s * .3, Math.PI, Math.PI * 2);
      line(c, s * .06, s * .56, s * .94, s * .56);
      for (var i = 0; i < 6; i++) line(c, s * (.2 + i * .12), s * .74, s * (.26 + i * .12), s * .84);
    },
    wellLoop: function (c, s) {               // 后记：井口 + 反复的循环箭头
      circle(c, s * .5, s * .6, s * .3);
      arcLine(c, s * .5, s * .6, s * .44, Math.PI * 1.15, Math.PI * 1.9);
      poly(c, [[s * .84, s * .5], [s * .92, s * .62], [s * .78, s * .64]]);
      line(c, s * .5, s * .12, s * .5, s * .3);
    },
    twoRoads: function (c, s) {               // 不陌生的人：两条相遇的路 + 一点暖光
      line(c, s * .06, s * .94, s * .5, s * .34);
      line(c, s * .94, s * .94, s * .5, s * .34);
      circle(c, s * .5, s * .2, s * .1);
      line(c, s * .32, s * .68, s * .68, s * .68);
    },
    emptyPort: function (c, s) {              // 空港曲：跑道、登船口、月亮
      line(c, s * .04, s * .78, s * .96, s * .78);
      c.save(); c.setLineDash([8, 10]);
      line(c, s * .04, s * .9, s * .96, s * .9);
      c.restore();
      rect(c, s * .16, s * .42, s * .3, s * .36);
      circle(c, s * .76, s * .26, s * .13);
    },
    questionStamp: function (c, s) {          // 知道：重复盖印的方块 + 一个问号
      rect(c, s * .1, s * .16, s * .44, s * .34);
      rect(c, s * .26, s * .3, s * .44, s * .34);
      arcLine(c, s * .5, s * .78, s * .14, Math.PI, Math.PI * 2.4);
      line(c, s * .5, s * .78, s * .5, s * .9);
      circle(c, s * .5, s * .96, s * .02);
    },
    gooseCup: function (c, s) {               // 落雁：落下的雁 + 杯中海
      poly(c, [[s * .12, s * .16], [s * .34, s * .34], [s * .56, s * .14]]);
      rect(c, s * .3, s * .5, s * .4, s * .34);
      line(c, s * .3, s * .64, s * .7, s * .64);
      line(c, s * .22, s * .9, s * .78, s * .9);
    },
    twoMountains: function (c, s) {           // 郭源潮：山前山后 + 两条不相交的线
      poly(c, [[s * .04, s * .6], [s * .3, s * .24], [s * .56, s * .6]]);
      poly(c, [[s * .44, s * .72], [s * .7, s * .36], [s * .96, s * .72]]);
      line(c, s * .04, s * .88, s * .44, s * .88);
      line(c, s * .56, s * .96, s * .96, s * .96);
    },
    houseLamp: function (c, s) {              // 再想想：很远的地平线、树桩、家中的灯
      line(c, s * .04, s * .3, s * .96, s * .3);
      rect(c, s * .12, s * .56, s * .3, s * .3);
      arcLine(c, s * .27, s * .56, s * .15, Math.PI, Math.PI * 2);
      circle(c, s * .74, s * .66, s * .12);
      line(c, s * .74, s * .78, s * .74, s * .92);
    }
  };

  function drawSymbol(ctx, symbolName, x, y, size, color) {
    var fn = SYMBOLS[symbolName];
    if (!fn) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.014);
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    try { fn(ctx, size); } catch (e) { /* 单个符号异常不影响整票 */ }
    ctx.restore();
  }

  function renderTicket(result, nickname, dateObj) {
    var canvas = document.createElement('canvas');
    canvas.width = TICKET_W;
    canvas.height = TICKET_H;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var M = 82;
    var W = TICKET_W, H = TICKET_H;
    var innerW = W - M * 2;
    var ink = TICKET_INK, dim = TICKET_DIM, accent = TICKET_RED, signal = TICKET_SIGNAL;

    ctx.fillStyle = TICKET_PAPER;
    ctx.fillRect(0, 0, W, H);
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,255,255,.24)');
    grad.addColorStop(.44, 'rgba(255,255,255,0)');
    grad.addColorStop(1, 'rgba(17,17,15,.07)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 极淡颗粒（确定性，同一票根每次一致）
    var rnd = makeRandom(stableHash(result.songId + result.ticketCode));
    for (var i = 0; i < 2400; i++) {
      ctx.fillStyle = 'rgba(20,20,20,' + (0.012 + rnd() * 0.026).toFixed(3) + ')';
      ctx.fillRect(rnd() * W, rnd() * H, 2, 2);
    }

    ctx.fillStyle = TICKET_RED;
    ctx.fillRect(0, 0, W, 232);
    ctx.fillStyle = signal;
    ctx.fillRect(0, 228, W, 4);

    ctx.strokeStyle = 'rgba(17,17,15,.48)';
    ctx.lineWidth = 2;
    ctx.strokeRect(34, 34, W - 68, H - 68);
    ctx.textBaseline = 'alphabetic';

    // 页眉
    ctx.fillStyle = TICKET_PAPER;
    ctx.font = '600 44px ' + FONT_SERIF;
    ctx.fillText('在宋冬野的歌里，你是谁', M, 112);
    ctx.fillStyle = signal;
    ctx.font = '400 20px ' + FONT_MONO;
    drawSpacedText(ctx, 'SONG PERSONALITY TICKET', M, 152, 3.4);
    ctx.strokeStyle = 'rgba(228,225,216,.34)';
    ctx.lineWidth = 1.5;
    line(ctx, M, 176, W - M, 176);

    // 编号行
    ctx.fillStyle = TICKET_PAPER;
    ctx.font = '400 24px ' + FONT_MONO;
    drawSpacedText(ctx, 'NO. ' + result.ticketCode, M, 211, 1.6);
    ctx.font = '400 22px ' + FONT_SANS;
    ctx.fillStyle = TICKET_PAPER;
    var validText = '长期有效';
    ctx.fillText(validText, W - M - ctx.measureText(validText).width, 211);

    // 符号
    drawSymbol(ctx, result.symbol, W - M - 168, 274, 168, signal);

    // 认领语 + 歌名
    ctx.fillStyle = dim;
    ctx.font = '400 23px ' + FONT_SANS;
    ctx.fillText('你最像宋冬野的', M, 458);

    var titleText = '《' + result.title + '》';
    var titleSize = 128;
    ctx.font = '600 ' + titleSize + 'px ' + FONT_SERIF;
    while (ctx.measureText(titleText).width > innerW && titleSize > 70) {
      titleSize -= 4;
      ctx.font = '600 ' + titleSize + 'px ' + FONT_SERIF;
    }
    var titleLead = titleSize * 1.16;
    var titleLines = wrapLines(ctx, titleText, innerW, 2);
    ctx.fillStyle = ink;
    var ty = 580;
    titleLines.forEach(function (ln, idx) { ctx.fillText(ln, M, ty + idx * titleLead); });
    var titleBottom = ty + (titleLines.length - 1) * titleLead;

    // 歌曲人格
    var py = titleBottom + 82;
    ctx.fillStyle = accent;
    ctx.font = '600 42px ' + FONT_SANS;
    var personaLines = wrapLines(ctx, result.personalityName, innerW, 2);
    personaLines.forEach(function (ln, idx) { ctx.fillText(ln, M, py + idx * 58); });
    var personaBottom = py + (personaLines.length - 1) * 58;

    // 专辑 + 关键词
    var ky = personaBottom + 72;
    ctx.strokeStyle = 'rgba(20,20,20,.2)';
    ctx.lineWidth = 1.5;
    line(ctx, M, ky - 40, W - M, ky - 40);
    ctx.font = '400 22px ' + FONT_MONO;
    ctx.fillStyle = dim;
    drawSpacedText(ctx, '专辑《' + result.album + '》', M, ky, 1.2);

    ctx.font = '400 25px ' + FONT_SANS;
    var kx = M, kwy = ky + 50;
    result.keywords.slice(0, 5).forEach(function (word, idx) {
      if (idx > 0) {
        ctx.fillStyle = signal;
        ctx.fillText(' / ', kx, kwy);
        kx += ctx.measureText(' / ').width;
      }
      ctx.fillStyle = '#2a2a27';
      ctx.fillText(word, kx, kwy);
      kx += ctx.measureText(word).width;
    });

    // 短解读（字号自适应，保证不越过穿孔线）
    var dy = kwy + 76;
    var descLimit = 1030;
    var sizeSteps = [[33, 57], [30, 53], [28, 50]];
    var descSize, descLead, descLines = null;
    for (var si = 0; si < sizeSteps.length; si++) {
      descSize = sizeSteps[si][0];
      descLead = sizeSteps[si][1];
      ctx.font = '400 ' + descSize + 'px ' + FONT_SERIF;
      var room = Math.max(2, Math.floor((descLimit - dy) / descLead) + 1);
      descLines = wrapLines(ctx, result.shortDescription, innerW, room);
      if (descLines.length <= room) break;
    }
    ctx.fillStyle = '#2a2a27';
    descLines.forEach(function (ln, idx) { ctx.fillText(ln, M, dy + idx * descLead); });
    var descBottom = dy + (descLines.length - 1) * descLead;

    // 撕票线上方的编辑信息行
    var infoY = Math.min(descBottom + 74, 1046);
    ctx.strokeStyle = 'rgba(20,20,20,.16)';
    line(ctx, M, infoY - 34, W - M, infoY - 34);
    ctx.fillStyle = dim;
    ctx.font = '400 18px ' + FONT_MONO;
    drawSpacedText(ctx, 'SONG PERSONALITY TICKET / ' + result.songId.toUpperCase(), M, infoY, 2.2);

    // 穿孔撕票线
    var perfY = 1088;
    dashedLine(ctx, 52, perfY, W - 52, 14, 12, 'rgba(20,20,20,.4)', 2);
    ctx.fillStyle = TICKET_PAPER;
    ctx.beginPath(); ctx.arc(34, perfY, 15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W - 34, perfY, 15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,20,.25)';
    ctx.lineWidth = 2;
    circle(ctx, 34, perfY, 15);
    circle(ctx, W - 34, perfY, 15);

    // 副券
    var sy = perfY + 62;
    var labelFont = '400 19px ' + FONT_MONO;
    var col2 = M + 322;

    ctx.fillStyle = dim;
    ctx.font = labelFont;
    drawSpacedText(ctx, 'NAME / 持票人', M, sy, 2.2);
    ctx.fillStyle = ink;
    ctx.font = '600 34px ' + FONT_SERIF;
    var nameLines = wrapLines(ctx, nickname, 470, 1);
    ctx.fillText(nameLines[0] || '无名旅人', M, sy + 46);

    ctx.fillStyle = dim;
    ctx.font = labelFont;
    drawSpacedText(ctx, 'ISSUED / 签发日期', M, sy + 108, 2.2);
    ctx.fillStyle = ink;
    ctx.font = '400 30px ' + FONT_MONO;
    drawSpacedText(ctx, formatDate(dateObj), M, sy + 150, 1.4);

    ctx.fillStyle = dim;
    ctx.font = labelFont;
    drawSpacedText(ctx, 'STUB NO. / 票根编号', col2, sy + 108, 2.2);
    ctx.fillStyle = ink;
    ctx.font = '400 27px ' + FONT_MONO;
    drawSpacedText(ctx, result.ticketCode, col2, sy + 150, 1.4);

    // 检票章
    ctx.save();
    ctx.translate(W - M - 94, sy + 66);
    ctx.rotate(-11 * Math.PI / 180);
    ctx.strokeStyle = accent;
    ctx.globalAlpha = .9;
    ctx.lineWidth = 3;
    circle(ctx, 0, 0, 88);
    circle(ctx, 0, 0, 80);
    ctx.fillStyle = accent;
    ctx.font = '600 34px ' + FONT_SERIF;
    var t1 = '已检票';
    ctx.fillText(t1, -ctx.measureText(t1).width / 2, -4);
    ctx.font = '400 15px ' + FONT_MONO;
    var t2 = 'ADMIT ONE';
    drawSpacedText(ctx, t2, -spacedWidth(ctx, t2, 3) / 2, 30, 3);
    ctx.font = '400 14px ' + FONT_MONO;
    var t3 = serialDate(dateObj);
    drawSpacedText(ctx, t3, -spacedWidth(ctx, t3, 2) / 2, -34, 2);
    ctx.restore();
    ctx.globalAlpha = 1;

    // 页脚
    ctx.strokeStyle = 'rgba(20,20,20,.2)';
    ctx.lineWidth = 1.5;
    line(ctx, M, H - 106, W - M, H - 106);
    ctx.fillStyle = ink;
    ctx.font = '400 26px ' + FONT_SERIF;
    ctx.fillText('此票记录的是此刻的你', M, H - 56);

    if (SHOW_MINIPROGRAM_NOTE) {
      ctx.fillStyle = 'rgba(122,122,116,.9)';
      ctx.font = '400 17px ' + FONT_SANS;
      var note = '小程序码将在正式版本接入';
      ctx.fillText(note, W - M - ctx.measureText(note).width, H - 58);
    }

    return canvas;
  }

  // 票根绘制与保存完全不依赖音频是否加载成功
  function buildTicketImage(result) {
    ticketDataURL = null;
    ticketBlob = null;
    var img = $('ticket-img');
    try {
      var canvas = renderTicket(result, displayName(), new Date());
      if (!canvas) throw new Error('canvas unavailable');
      ticketDataURL = canvas.toDataURL('image/png');
      img.src = ticketDataURL;
      img.alt = '数字票根：' + result.title + '，' + result.personalityName + '，持票人 ' + displayName();
      if (canvas.toBlob) canvas.toBlob(function (blob) { ticketBlob = blob; }, 'image/png');
    } catch (e) {
      img.removeAttribute('src');
      $('save-hint').textContent = '这台设备无法生成票根图片，但你的结果依然有效。';
    }
  }

  /* =======================================================================
     8. 保存兼容
     ======================================================================= */

  function isLongPressPlatform() {
    var ua = navigator.userAgent || '';
    var iOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return iOS || /MicroMessenger/i.test(ua);
  }

  var saving = false;
  function saveTicket() {
    if (!currentResult || saving) return;
    if (!ticketDataURL) { toast('票根还在生成，请稍等一下。'); return; }
    saving = true;
    window.setTimeout(function () { saving = false; }, 800);

    var filename = 'songdongye-result-' + currentResult.songId + '.png';

    if (isLongPressPlatform()) {
      toast('长按上方票根图片，选择「保存到相册」。', 3600);
      dropStamp();
      return;
    }
    try {
      var url = ticketBlob && window.URL && window.URL.createObjectURL
        ? window.URL.createObjectURL(ticketBlob)
        : ticketDataURL;
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (url !== ticketDataURL) {
        window.setTimeout(function () { window.URL.revokeObjectURL(url); }, 4000);
      }
      toast('票根已下载：' + filename, 3200);
      dropStamp();
    } catch (e) {
      toast('这台设备不支持直接下载，长按票根图片即可保存。', 3600);
    }
  }

  function dropStamp() {
    var wrap = $('ticket-wrap');
    if (!wrap || reduceMotion) return;
    var old = wrap.querySelector('.stamp');
    if (old) old.parentNode.removeChild(old);
    var stamp = document.createElement('div');
    stamp.className = 'stamp stamp--drop';
    stamp.setAttribute('aria-hidden', 'true');
    stamp.style.margin = '16px auto 0';
    stamp.innerHTML = '<span class="stamp__l1">已存</span><span class="stamp__l2">SAVED</span>';
    wrap.appendChild(stamp);
  }

  /* =======================================================================
     9. 调试模式
     ======================================================================= */

  var debugOn = false;
  var debugMode = null;      // 'result' | '1'
  var debugTimer = null;
  var debugShowScores = false;
  var validationError = null;

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function renderDebug() {
    var body = $('debug-body');
    if (!body) return;
    var info = PLAYER.getDebugInfo();
    var html = '';

    if (validationError) {
      html += '<h4>DATA VALIDATION</h4><table><tr><td>' + escapeHTML(validationError) + '</td></tr></table>';
    } else {
      html += '<h4>DATA VALIDATION</h4><table><tr><td>19 结果 / 19 音频 / 白名单一致</td><td>OK</td></tr></table>';
    }

    html += '<h4>AUDIO</h4><table>' +
      '<tr><td>songId</td><td>' + escapeHTML(info.songId || '-') + '</td></tr>' +
      '<tr><td>中文歌名</td><td>' + escapeHTML(info.title || '-') + '</td></tr>' +
      '<tr><td>file</td><td>' + escapeHTML(info.file || '-') + '</td></tr>' +
      '<tr><td>src</td><td>' + escapeHTML(info.src || '-') + '</td></tr>' +
      '<tr><td>resolved</td><td>' + escapeHTML(info.resolvedUrl || '-') + '</td></tr>' +
      '<tr><td>state</td><td>' + escapeHTML(info.state) + '</td></tr>' +
      '<tr><td>currentTime</td><td>' + info.currentTime.toFixed(2) + '</td></tr>' +
      '<tr><td>duration</td><td>' + (isFinite(info.duration) ? info.duration.toFixed(2) : '-') + '</td></tr>' +
      '<tr><td>lastError</td><td>' + escapeHTML(info.lastError || '-') + '</td></tr>' +
      '</table>';

    var result = scoreAll(state.answers);
    html += '<h4>USER VECTOR (RAW / UNIT)</h4><table>';
    DIMENSIONS.forEach(function (d) {
      html += '<tr><td>' + d + '</td><td>' + result.rawVector[d] + ' / ' + result.userVector[d].toFixed(3) + '</td></tr>';
    });
    html += '</table>';

    if (debugShowScores) {
      html += '<h4>RANKING (19)</h4><table>';
      result.rows.forEach(function (r, i) {
        html += '<tr' + (i === 0 ? ' class="debug__row--top"' : '') + '><td>' + pad2(i + 1) + ' ' +
          escapeHTML(r.title) + ' <span style="opacity:.55">' + escapeHTML(r.songId) + '</span></td><td>' +
          r.score.toFixed(4) + ' · cos ' + r.cos.toFixed(3) + ' · d ' + r.distance.toFixed(3) +
          ' · cal ' + r.calibration.toFixed(3) + '</td></tr>';
      });
      html += '</table>';

      html += '<h4>ANSWER CONTRIBUTION</h4><table>';
      state.answers.forEach(function (a, i) {
        if (a == null) { html += '<tr><td>Q' + pad2(i + 1) + '</td><td>-</td></tr>'; return; }
        var v = QUESTIONS[i].options[a].v;
        var parts = Object.keys(v).map(function (k) {
          return k.slice(0, 4) + (v[k] > 0 ? '+' : '') + v[k];
        }).join(' ');
        html += '<tr><td>Q' + pad2(i + 1) + ' · opt' + (a + 1) + '</td><td>' + parts + '</td></tr>';
      });
      html += '</table>';
    }

    body.innerHTML = html;
  }

  function fillDebugSelect() {
    var sel = $('debug-result');
    if (!sel) return;
    sel.textContent = '';
    // 只列出 19 个合法结果，excluded- 文件永不出现
    RESULTS.forEach(function (song) {
      var opt = document.createElement('option');
      opt.value = song.songId;
      opt.textContent = song.title + ' · ' + song.songId;
      sel.appendChild(opt);
    });
    if (state.songId) sel.value = state.songId;
    sel.addEventListener('change', function () {
      enterForcedResult(sel.value);
    });
  }

  function startDebugPolling() {
    if (debugTimer) window.clearInterval(debugTimer);
    debugTimer = window.setInterval(function () { if (debugOn) renderDebug(); }, 500);
  }

  /* =======================================================================
     10. 流程入口
     ======================================================================= */

  function readParams() {
    var out = {};
    var q = window.location.search.replace(/^\?/, '');
    if (!q) return out;
    q.split('&').forEach(function (pair) {
      if (!pair) return;
      var kv = pair.split('=');
      out[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
    });
    return out;
  }

  function issueResult() {
    var ranking = scoreAll(state.answers).rows;
    var topId = ranking[0] && ranking[0].songId;
    var song = resultBySongId(topId);
    if (!song) {          // 不做随机兜底：数据异常时明确报错
      toast('结果数据异常，请重新测试。', 3200);
      if (window.console) window.console.error('非法结果 songId：' + topId);
      return;
    }
    state.songId = song.songId;
    state.ticketCode = makeTicketCode();
    saveState();

    var result = buildResultObject(song.songId);
    PLAYER.prepareResultAudio(result.songId);   // 只预加载命中的一首
    runIssue(result);
  }

  function revealNow() {
    if (!pendingResult) return;
    var result = pendingResult;
    renderResult(result);
    PLAYER.playResultAudio();   // 与用户点击同一个事件中调用
  }

  function enterForcedResult(songId) {
    var song = resultBySongId(songId);
    if (!song) {
      toast('无效的歌曲结果 ID', 3200);
      if (window.console) window.console.warn('无效的歌曲结果 ID：' + songId);
      return false;
    }
    PLAYER.pauseResultAudio();
    PLAYER.resetResultAudio();
    if (answeredCount() < TOTAL_QUESTIONS) {
      state.answers = state.answers.map(function (a, i) { return a == null ? i % 4 : a; });
    }
    state.songId = song.songId;
    if (!state.ticketCode) state.ticketCode = makeTicketCode();
    var result = buildResultObject(song.songId);
    pendingResult = result;
    PLAYER.prepareResultAudio(result.songId);   // 加载真实 MP3，仍需用户点击后播放
    renderResult(result, { instant: true });
    return true;
  }

  function retest() {
    PLAYER.pauseResultAudio();
    PLAYER.resetResultAudio();
    currentResult = null;
    pendingResult = null;
    ticketDataURL = null;
    ticketBlob = null;
    var wrap = $('ticket-wrap');
    var oldStamp = wrap ? wrap.querySelector('.stamp') : null;
    if (oldStamp) oldStamp.parentNode.removeChild(oldStamp);
    var img = $('ticket-img');
    if (img) img.removeAttribute('src');
    clearState();
    showScreen('intro');
    $('intro-serial').textContent = 'NO. ' + makeTicketCode().slice(4);
    $('btn-resume').hidden = true;
  }

  function boot() {
    if (!$('screen-intro')) return;

    // 启动一致性验证：开发时抛错，生产界面不显示技术细节
    try {
      DATA.validateProjectData(RESULTS, QUESTIONS);
    } catch (e) {
      validationError = e.message;
      if (window.console) window.console.error('[SDY] 数据校验失败：' + e.message);
    }

    var params = readParams();
    debugMode = params.debug || null;
    debugOn = debugMode === '1' || debugMode === 'result' || debugMode === 'true';

    PLAYER.init({
      audio: $('result-audio'),
      root: $('player'),
      title: $('player-title'),
      toggle: $('player-toggle'),
      range: $('player-range'),
      fill: $('player-fill'),
      current: $('player-current'),
      duration: $('player-duration'),
      message: $('player-message'),
      replay: $('player-replay'),
      reload: $('player-reload')
    }, {
      onStateChange: function () { if (debugOn) renderDebug(); }
    });

    var saved = loadState();
    if (saved) {
      state.index = saved.index;
      state.answers = saved.answers;
      state.nickname = saved.nickname;
      state.songId = saved.songId;
      state.ticketCode = saved.ticketCode;
    }

    $('intro-serial').textContent = 'NO. ' + (state.ticketCode || makeTicketCode()).slice(4);

    /* ---- 事件 ---- */
    $('btn-start').addEventListener('click', function () { showScreen('about'); });
    $('btn-back-intro').addEventListener('click', function () { showScreen('intro'); });
    $('btn-enter-quiz').addEventListener('click', function () {
      if (state.songId) { clearState(); goQuiz(0); }
      else goQuiz(answeredCount() > 0 ? state.index : 0);
    });
    $('btn-resume').addEventListener('click', function () {
      if (state.songId && resultBySongId(state.songId)) {
        enterForcedResult(state.songId);
        return;
      }
      goQuiz(state.index);
    });
    $('btn-prev').addEventListener('click', function () {
      if (state.index > 0) { state.index -= 1; saveState(); renderQuestion(); }
    });
    $('btn-back-quiz').addEventListener('click', function () { goQuiz(TOTAL_QUESTIONS - 1); });

    $('sign-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('btn-issue');
      if (btn.disabled || issuing) return;
      btn.disabled = true;
      state.nickname = sanitizeNickname($('nickname').value);
      $('nickname').value = state.nickname;
      saveState();
      issueResult();
      window.setTimeout(function () { btn.disabled = false; }, 600);
    });
    $('nickname').addEventListener('blur', function () { this.value = sanitizeNickname(this.value); });

    $('btn-reveal').addEventListener('click', function () {
      var btn = this;
      if (btn.disabled) return;
      btn.disabled = true;
      revealNow();
      window.setTimeout(function () { btn.disabled = false; }, 800);
    });

    $('btn-save').addEventListener('click', saveTicket);
    $('btn-tour').addEventListener('click', function () {
      toast(TOUR_CONFIG && TOUR_CONFIG.message ? TOUR_CONFIG.message : '巡演信息将在正式版本中接入。', 2800);
    });
    $('btn-retest').addEventListener('click', retest);

    $('btn-debug-close').addEventListener('click', function () { $('debug').hidden = true; });
    $('btn-debug-clear').addEventListener('click', function () {
      clearState();
      toast('本地状态已清除。');
      renderDebug();
    });
    $('btn-debug-scores').addEventListener('click', function () {
      debugShowScores = !debugShowScores;
      renderDebug();
    });

    /* ---- 入口分支 ---- */
    if (debugOn) {
      $('debug').hidden = false;
      fillDebugSelect();
      renderDebug();
      startDebugPolling();
    }

    if (params.result) {
      if (enterForcedResult(params.result)) return;
      // 非法 ID：不随机回退，停在开场页并提示
    }

    if (state.songId && resultBySongId(state.songId)) {
      $('btn-resume').hidden = false;
      $('btn-resume').textContent = '查看上次的票根';
    } else if (answeredCount() > 0) {
      $('btn-resume').hidden = false;
      $('btn-resume').textContent = '继续上次的答题（' + answeredCount() + '/10）';
    }
    showScreen('intro');
  }

  // 供调试与自动化检查使用
  window.SDY_APP = {
    scoreAll: scoreAll,
    buildUserVector: buildUserVector,
    resultBySongId: resultBySongId,
    renderTicket: renderTicket,
    buildResultObject: buildResultObject,
    enterForcedResult: enterForcedResult,
    EXPECTED_SONG_IDS: EXPECTED_SONG_IDS,
    SONG_AUDIO: SONG_AUDIO,
    getState: function () { return state; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
