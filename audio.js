/* =========================================================================
   audio.js - 结果歌曲片段播放器
   页面只有一个 <audio id="result-audio"> 实例，事件只注册一次。
   音频路径只从 data.js 的 SONG_AUDIO 读取（唯一事实源），不做第二套映射。
   播放的 MP3 就是最终剪辑片段：从 0 秒开始，播到文件自然结束，不裁切、不定时暂停、不循环。
   ========================================================================= */
(function (global) {
  'use strict';

  var DATA = global.SDY_DATA;

  var PLAYER_STATES = Object.freeze({
    IDLE: 'idle',
    LOADING: 'loading',
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    ENDED: 'ended',
    BLOCKED: 'blocked',
    ERROR: 'error'
  });

  var STATE_MESSAGES = {
    idle: '',
    loading: '正在准备歌曲片段',
    ready: '点击播放，听一段与你最接近的歌',
    playing: '',
    paused: '已暂停',
    ended: '这段播完了',
    blocked: '点击播放按钮即可听取歌曲片段',
    error: '歌曲片段暂时无法播放'
  };

  var el = {};                 // DOM 引用
  var audio = null;            // 唯一 HTMLAudioElement
  var bound = false;           // 事件是否已注册
  var currentSongId = null;
  var state = PLAYER_STATES.IDLE;
  var seeking = false;
  var lastError = null;
  var onStateChange = null;

  /* ---------------- 工具 ---------------- */

  function formatTime(seconds) {
    if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) return '--:--';
    var total = Math.floor(seconds);
    var m = Math.floor(total / 60);
    var s = total % 60;
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function trackFor(songId) {
    if (!songId || !DATA || !DATA.SONG_AUDIO) return null;
    if (!Object.prototype.hasOwnProperty.call(DATA.SONG_AUDIO, songId)) return null;
    return DATA.SONG_AUDIO[songId];
  }

  function showAudioMessage(text) {
    if (el.message) el.message.textContent = text || '';
  }

  function logAudioDebugError(error) {
    lastError = error
      ? (error.message || error.name || String(error))
      : null;
  }

  /* ---------------- 状态与界面 ---------------- */

  function setAudioPlayerState(next) {
    state = next;
    if (el.root) el.root.setAttribute('data-player-state', next);

    var playing = next === PLAYER_STATES.PLAYING;
    if (el.toggle) {
      el.toggle.textContent = playing ? '暂停' : '播放';
      el.toggle.setAttribute('aria-label', playing ? '暂停歌曲片段' : '播放歌曲片段');
      el.toggle.disabled = next === PLAYER_STATES.ERROR;
    }
    if (el.replay) el.replay.hidden = next !== PLAYER_STATES.ENDED;
    if (el.reload) el.reload.hidden = next !== PLAYER_STATES.ERROR;
    if (el.range) {
      var ready = next !== PLAYER_STATES.IDLE && next !== PLAYER_STATES.LOADING &&
        next !== PLAYER_STATES.ERROR && audio && isFinite(audio.duration);
      el.range.disabled = !ready;
    }
    showAudioMessage(STATE_MESSAGES[next] || '');
    if (typeof onStateChange === 'function') onStateChange(next);
  }

  function renderTime() {
    if (!audio) return;
    if (el.current) el.current.textContent = formatTime(audio.currentTime);
    if (el.duration) el.duration.textContent = formatTime(audio.duration);
    if (el.range && !seeking) {
      if (isFinite(audio.duration) && audio.duration > 0) {
        el.range.max = String(Math.floor(audio.duration * 100) / 100);
        el.range.value = String(audio.currentTime);
      } else {
        el.range.value = '0';
      }
    }
    if (el.fill) {
      var pct = (isFinite(audio.duration) && audio.duration > 0)
        ? Math.min(100, (audio.currentTime / audio.duration) * 100)
        : 0;
      el.fill.style.transform = 'scaleX(' + (pct / 100) + ')';
    }
  }

  /* ---------------- 事件 ---------------- */

  function bindEvents() {
    if (bound || !audio) return;
    bound = true;

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('seeking', onSeeking);
    audio.addEventListener('seeked', onSeeked);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    if (el.toggle) el.toggle.addEventListener('click', onToggleClick);
    if (el.replay) el.replay.addEventListener('click', replayResultAudio);
    if (el.reload) el.reload.addEventListener('click', onReloadClick);
    if (el.range) {
      el.range.addEventListener('pointerdown', onRangeDown);
      el.range.addEventListener('pointerup', onRangeUp);
      el.range.addEventListener('keydown', onRangeDown);
      el.range.addEventListener('keyup', onRangeUp);
      el.range.addEventListener('input', onRangeInput);
      el.range.addEventListener('change', onRangeCommit);
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    global.addEventListener('pagehide', onPageHide);
  }

  function unbindEvents() {
    if (!bound || !audio) return;
    bound = false;

    audio.removeEventListener('loadstart', onLoadStart);
    audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    audio.removeEventListener('canplay', onCanPlay);
    audio.removeEventListener('play', onPlay);
    audio.removeEventListener('pause', onPause);
    audio.removeEventListener('timeupdate', onTimeUpdate);
    audio.removeEventListener('seeking', onSeeking);
    audio.removeEventListener('seeked', onSeeked);
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('error', onError);

    if (el.toggle) el.toggle.removeEventListener('click', onToggleClick);
    if (el.replay) el.replay.removeEventListener('click', replayResultAudio);
    if (el.reload) el.reload.removeEventListener('click', onReloadClick);
    if (el.range) {
      el.range.removeEventListener('pointerdown', onRangeDown);
      el.range.removeEventListener('pointerup', onRangeUp);
      el.range.removeEventListener('keydown', onRangeDown);
      el.range.removeEventListener('keyup', onRangeUp);
      el.range.removeEventListener('input', onRangeInput);
      el.range.removeEventListener('change', onRangeCommit);
    }

    document.removeEventListener('visibilitychange', onVisibilityChange);
    global.removeEventListener('pagehide', onPageHide);
  }

  function onLoadStart() { setAudioPlayerState(PLAYER_STATES.LOADING); }

  function onLoadedMetadata() {
    // 总时长只来自真实元数据
    renderTime();
    if (state === PLAYER_STATES.LOADING) setAudioPlayerState(PLAYER_STATES.READY);
  }

  function onCanPlay() {
    renderTime();
    if (state === PLAYER_STATES.LOADING || state === PLAYER_STATES.IDLE) {
      setAudioPlayerState(PLAYER_STATES.READY);
    }
  }

  function onPlay() { setAudioPlayerState(PLAYER_STATES.PLAYING); }

  function onPause() {
    if (state === PLAYER_STATES.ENDED) return;
    if (audio && audio.ended) return;
    setAudioPlayerState(PLAYER_STATES.PAUSED);
  }

  function onTimeUpdate() { renderTime(); }
  function onSeeking() { renderTime(); }
  function onSeeked() { renderTime(); }

  function onEnded() {
    renderTime();
    setAudioPlayerState(PLAYER_STATES.ENDED); // 不循环
  }

  function onError() {
    var code = audio && audio.error ? audio.error.code : 0;
    logAudioDebugError({ message: 'audio error code ' + code });
    setAudioPlayerState(PLAYER_STATES.ERROR);
  }

  function onToggleClick() {
    if (!audio) return;
    if (audio.paused || audio.ended) playResultAudio();
    else pauseResultAudio();
  }

  function onReloadClick() {
    if (!currentSongId) return;
    prepareResultAudio(currentSongId);
  }

  function onRangeDown() { seeking = true; }
  function onRangeUp() { seeking = false; }

  function onRangeInput() {
    if (!audio || !el.range) return;
    if (el.fill && isFinite(audio.duration) && audio.duration > 0) {
      el.fill.style.transform = 'scaleX(' + (Number(el.range.value) / audio.duration) + ')';
    }
    if (el.current) el.current.textContent = formatTime(Number(el.range.value));
  }

  function onRangeCommit() {
    if (!audio || !el.range) return;
    var next = Number(el.range.value);
    if (isFinite(audio.duration) && isFinite(next)) {
      audio.currentTime = Math.min(Math.max(next, 0), audio.duration);
    }
    seeking = false;
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') pauseResultAudio();
  }

  function onPageHide() {
    pauseResultAudio();
    if (audio) {
      try { audio.removeAttribute('src'); audio.load(); } catch (e) { /* 忽略 */ }
    }
  }

  /* ---------------- 公开方法 ---------------- */

  function init(refs, options) {
    el = refs || {};
    audio = el.audio || null;
    onStateChange = options && options.onStateChange;
    if (!audio) return false;
    audio.loop = false;
    audio.preload = 'none';
    bindEvents();
    setAudioPlayerState(PLAYER_STATES.IDLE);
    return true;
  }

  // 只准备命中的一首；不预加载 19 首，不在此阶段播放
  function prepareResultAudio(songId) {
    if (!audio) return false;
    var track = trackFor(songId);
    if (!track) {
      logAudioDebugError({ message: '非法 songId：' + songId });
      setAudioPlayerState(PLAYER_STATES.ERROR);
      return false;
    }

    try { audio.pause(); } catch (e) { /* 忽略 */ }
    lastError = null;
    seeking = false;
    currentSongId = songId;

    try { audio.currentTime = 0; } catch (e) { /* 尚未加载元数据时忽略 */ }
    audio.src = track.src;           // 相对路径，兼容 GitHub Pages 子目录
    audio.preload = 'metadata';
    audio.load();

    if (el.title) el.title.textContent = '《' + track.title + '》';
    if (el.range) { el.range.value = '0'; el.range.max = '100'; }
    if (el.fill) el.fill.style.transform = 'scaleX(0)';
    if (el.current) el.current.textContent = '0:00';
    if (el.duration) el.duration.textContent = '--:--';

    setAudioPlayerState(PLAYER_STATES.LOADING);
    return true;
  }

  // 必须在用户手势的同一个事件里调用
  function playResultAudio() {
    if (!audio || !currentSongId) return null;
    if (audio.ended) {
      try { audio.currentTime = 0; } catch (e) { /* 忽略 */ }
    }
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function (error) {
        setAudioPlayerState(PLAYER_STATES.BLOCKED);
        showAudioMessage('点击播放按钮即可听取歌曲片段');
        logAudioDebugError(error);
      });
    }
    return playPromise;
  }

  function pauseResultAudio() {
    if (!audio) return;
    if (!audio.paused) {
      try { audio.pause(); } catch (e) { /* 忽略 */ }
    }
  }

  function replayResultAudio() {
    if (!audio) return;
    try { audio.currentTime = 0; } catch (e) { /* 忽略 */ }
    playResultAudio();
  }

  function resetResultAudio() {
    if (!audio) return;
    pauseResultAudio();
    try {
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    } catch (e) { /* 忽略 */ }
    currentSongId = null;
    lastError = null;
    seeking = false;
    if (el.title) el.title.textContent = '';
    if (el.current) el.current.textContent = '0:00';
    if (el.duration) el.duration.textContent = '--:--';
    if (el.range) { el.range.value = '0'; el.range.disabled = true; }
    if (el.fill) el.fill.style.transform = 'scaleX(0)';
    setAudioPlayerState(PLAYER_STATES.IDLE);
  }

  function destroyResultAudio() {
    resetResultAudio();
    unbindEvents();
  }

  function getDebugInfo() {
    var track = trackFor(currentSongId);
    return {
      songId: currentSongId,
      title: track ? track.title : null,
      file: track ? track.file : null,
      src: track ? track.src : null,
      resolvedUrl: audio && audio.currentSrc ? audio.currentSrc : (track ? track.src : null),
      state: state,
      currentTime: audio ? audio.currentTime : 0,
      duration: audio ? audio.duration : NaN,
      lastError: lastError
    };
  }

  global.SDY_AUDIO = {
    PLAYER_STATES: PLAYER_STATES,
    init: init,
    prepareResultAudio: prepareResultAudio,
    playResultAudio: playResultAudio,
    pauseResultAudio: pauseResultAudio,
    replayResultAudio: replayResultAudio,
    resetResultAudio: resetResultAudio,
    destroyResultAudio: destroyResultAudio,
    setAudioPlayerState: setAudioPlayerState,
    showAudioMessage: showAudioMessage,
    logAudioDebugError: logAudioDebugError,
    formatTime: formatTime,
    getDebugInfo: getDebugInfo,
    getState: function () { return state; },
    getCurrentSongId: function () { return currentSongId; }
  };
})(typeof window !== 'undefined' ? window : this);
