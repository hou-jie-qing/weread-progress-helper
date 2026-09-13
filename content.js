(function () {
  'use strict';

  // ==================== 微信公众号阅读进度 ====================
  (function WeChatMPProgress() {
    if (window.__tabReadProgressV11__) return;
    window.__tabReadProgressV11__ = true;

    const NICKNAME_SELECTOR = '#js_wx_follow_nickname';
    const CONTENT_SELECTOR = '#js_content';
    const STYLE_ID = 'tab-read-progress-v11-style';
    const ROOT_CLASS = 'tab-read-progress-v11';
    const LABEL_CLASS = 'tab-read-progress-v11-label';
    const VALUE_CLASS = 'tab-read-progress-v11-value';

    let ticking = false;
    let rootEl = null;
    let observer = null;
    let keepAliveTimer = null;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function getNicknameEl() {
      return document.querySelector(NICKNAME_SELECTOR);
    }

    function getContentEl() {
      return document.querySelector(CONTENT_SELECTOR);
    }

    function cleanupOldNodes() {
      const oldSelectors = [
        '#wx-native-read-progress',
        '.tab-read-progress-v9',
        '.tab-read-progress-v10',
        '.tab-read-progress-v11'
      ];

      oldSelectors.forEach(function (selector) {
        document.querySelectorAll(selector).forEach(function (el) {
          if (selector === '.tab-read-progress-v11' && el === rootEl) return;
          el.remove();
        });
      });

      const oldStyleIds = [
        'wx-native-read-progress-style-v8',
        'tab-read-progress-v9-style',
        'tab-read-progress-v10-style'
      ];

      oldStyleIds.forEach(function (id) {
        const styleEl = document.getElementById(id);
        if (styleEl) styleEl.remove();
      });
    }

    function injectStyle() {
      if (document.getElementById(STYLE_ID)) return;

      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .${ROOT_CLASS} {
          display: inline-flex !important;
          align-items: center !important;
          margin-left: 8px !important;
          font: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
          font-weight: normal !important;
          color: inherit !important;
          opacity: .9 !important;
          white-space: nowrap !important;
          vertical-align: baseline !important;
          pointer-events: none !important;
          user-select: none !important;
        }

        .${ROOT_CLASS} .${LABEL_CLASS},
        .${ROOT_CLASS} .${VALUE_CLASS} {
          font: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
          font-weight: normal !important;
          color: inherit !important;
        }

        .${ROOT_CLASS} .${VALUE_CLASS} {
          margin-left: 2px !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    function createProgressNode() {
      const nicknameEl = getNicknameEl();
      if (!nicknameEl) {
        console.warn('[ReadProgress V11] Nickname element not found:', NICKNAME_SELECTOR);
        return null;
      }

      const root = document.createElement('span');
      root.className = ROOT_CLASS;
      root.setAttribute('data-tab-read-progress', 'v11');
      root.setAttribute('aria-hidden', 'true');

      const label = document.createElement('span');
      label.className = LABEL_CLASS;
      label.textContent = '已读';

      const value = document.createElement('span');
      value.className = VALUE_CLASS;
      value.textContent = '1%';

      root.appendChild(label);
      root.appendChild(value);
      nicknameEl.appendChild(root);

      return root;
    }

    function ensureProgressNode() {
      const nicknameEl = getNicknameEl();
      if (!nicknameEl) return null;

      if (!rootEl || !rootEl.isConnected || rootEl.parentElement !== nicknameEl) {
        const existing = nicknameEl.querySelector(`.${ROOT_CLASS}[data-tab-read-progress="v11"]`);
        rootEl = existing || createProgressNode();
      }

      return rootEl;
    }

    function setDisplay(progress) {
      const root = ensureProgressNode();
      if (!root) return;

      const valueEl = root.querySelector(`.${VALUE_CLASS}`);
      if (!valueEl) return;

      const text = progress + '%';
      if (valueEl.textContent !== text) {
        valueEl.textContent = text;
      }
    }

    function getScrollTop() {
      return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    }

    function isAtAbsoluteTop() {
      return getScrollTop() <= 0;
    }

    function isInReadingZone() {
      const contentEl = getContentEl();
      if (!contentEl) return false;
      if (isAtAbsoluteTop()) return false;

      const rect = contentEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const unlockLine = viewportHeight * 0.08;

      return rect.top <= unlockLine;
    }

    function isAtBottom() {
      const contentEl = getContentEl();
      if (!contentEl) return false;

      const rect = contentEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      return rect.bottom <= viewportHeight + 1;
    }

    function calculateProgress() {
      const contentEl = getContentEl();
      if (!contentEl) return 1;
      if (!isInReadingZone()) return 1;
      if (isAtBottom()) return 100;

      const rect = contentEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const contentHeight = contentEl.offsetHeight || rect.height || 0;

      if (contentHeight <= 0) return 1;

      const unlockLine = viewportHeight * 0.08;
      const scrollTop = getScrollTop();

      const contentTopAbsolute = scrollTop + rect.top;
      const contentBottomAbsolute = contentTopAbsolute + contentHeight;

      const startScrollY = Math.max(0, contentTopAbsolute - unlockLine);
      const endScrollY = Math.max(startScrollY + 1, contentBottomAbsolute - viewportHeight);
      const totalScrollable = Math.max(endScrollY - startScrollY, 1);
      const currentScrollable = clamp(scrollTop - startScrollY, 0, totalScrollable);

      let progress = Math.round((currentScrollable / totalScrollable) * 100);

      if (progress < 1) progress = 1;
      if (progress > 99) progress = 99;

      return clamp(progress, 1, 100);
    }

    function updateProgress() {
      if (!ensureProgressNode()) return;

      if (!isInReadingZone()) {
        setDisplay(1);
        return;
      }

      if (isAtBottom()) {
        setDisplay(100);
        return;
      }

      setDisplay(calculateProgress());
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(function () {
        ticking = false;
        updateProgress();
      });
    }

    function setupObserver() {
      if (observer) observer.disconnect();

      const nicknameEl = getNicknameEl();
      if (!nicknameEl) return;

      const observeTarget = nicknameEl.parentNode || nicknameEl;

      observer = new MutationObserver(function () {
        ensureProgressNode();
        updateProgress();
      });

      observer.observe(observeTarget, {
        childList: true,
        subtree: true
      });
    }

    function setupKeepAlive() {
      if (keepAliveTimer) clearInterval(keepAliveTimer);

      keepAliveTimer = setInterval(function () {
        ensureProgressNode();
        updateProgress();
      }, 1200);
    }

    function init() {
      console.log('[ReadProgress V11] Initializing...');

      cleanupOldNodes();
      injectStyle();
      ensureProgressNode();
      setDisplay(1);

      window.addEventListener('scroll', requestUpdate, { passive: true });
      window.addEventListener('resize', requestUpdate, { passive: true });

      setupObserver();
      setupKeepAlive();

      [0, 100, 300, 800].forEach(function (delay) {
        setTimeout(updateProgress, delay);
      });

      console.log('[ReadProgress V11] Ready. Top shows 1%.');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();

  // ==================== 微信读书阅读进度 ====================
  (function WeChatReadProgress() {
    if (window.__wr_progress_native_nav_v4) return;
    window.__wr_progress_native_nav_v4 = true;

    document.querySelectorAll('[data-wr-native-progress="1"]').forEach(el => el.remove());
    document.querySelectorAll('[data-wr-mp-progress="1"]').forEach(el => el.remove());

    let progressEl = null;
    let lastText = '';
    let lastTheme = '';

    function isMPArticle() {
      return location.pathname.startsWith('/web/mp/reader/');
    }

    function getTopBar() {
      return document.querySelector('.readerTopBar_right');
    }

    function isReadingPage() {
      if (isMPArticle()) return !!document.querySelector('.wr_mp_reader');
      return !!getTopBar();
    }

    function getWindowScrollInfo() {
      const cur = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      const max = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      ) - window.innerHeight;
      return { cur, max };
    }

    function getElementScrollInfo(el) {
      if (!el) return null;
      return {
        cur: el.scrollTop || 0,
        max: (el.scrollHeight || 0) - (el.clientHeight || 0)
      };
    }

    function getThemeMode() {
      const text = document.body?.innerText || '';

      if (text.includes('浅色')) return 'dark';
      if (text.includes('深色')) return 'light';

      const bodyStyle = window.getComputedStyle(document.body);
      const bg = bodyStyle.backgroundColor || '';
      const match = bg.match(/\d+/g);

      if (match && match.length >= 3) {
        const r = parseInt(match[0], 10);
        const g = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness < 128 ? 'dark' : 'light';
      }

      return 'light';
    }

    function applyTheme() {
      const el = ensureProgressEl();
      if (!el) return;

      const theme = getThemeMode();
      if (theme === lastTheme) return;

      if (theme === 'dark') {
        el.style.color = 'rgba(255,255,255,.88)';
      } else {
        el.style.color = 'rgba(0,0,0,.72)';
      }

      lastTheme = theme;
    }

    function ensureProgressEl() {
      const topBar = getTopBar();
      if (!topBar) return null;

      if (progressEl && document.contains(progressEl)) {
        if (progressEl.parentElement === topBar) return progressEl;
        progressEl.remove();
        progressEl = null;
      }

      progressEl = document.createElement('span');
      progressEl.setAttribute('data-wr-native-progress', '1');
      progressEl.style.cssText = `
        display: none;
        margin-right: 18px;
        color: rgba(0,0,0,.72);
        font-size: 14px;
        font-weight: 400;
        line-height: 1;
        white-space: nowrap;
        user-select: none;
        vertical-align: middle;
        position: relative;
        top: 0;
        letter-spacing: 0;
        font-family: inherit;
        pointer-events: none;
        flex: 0 0 auto;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        transition: color .2s ease;
      `;

      topBar.insertBefore(progressEl, topBar.firstChild);

      const label = document.createElement('span');
      label.textContent = '已读';
      label.style.cssText = 'opacity: .85; margin-right: 2px;';

      const value = document.createElement('span');
      value.textContent = '1%';

      progressEl.appendChild(label);
      progressEl.appendChild(value);

      return progressEl;
    }

    function showText(text) {
      const el = ensureProgressEl();
      if (!el) return;

      applyTheme();

      const valueEl = el.lastElementChild;
      if (!valueEl) return;

      if (text !== lastText) {
        valueEl.textContent = text;
        lastText = text;
      }

      el.style.display = 'inline-block';
    }

    function hideText() {
      const el = ensureProgressEl();
      if (!el) return;
      el.style.display = 'none';
    }

    function getMPScrollTarget() {
      const iframe = document.querySelector('.mp_content iframe');
      if (iframe) {
        try {
          const docEl = iframe.contentDocument?.documentElement;
          const body = iframe.contentDocument?.body;

          const a = docEl ? getElementScrollInfo(docEl) : null;
          const b = body ? getElementScrollInfo(body) : null;

          if (a && a.max > 20 && a.cur > 0) return { type: 'element', el: docEl };
          if (b && b.max > 20 && b.cur > 0) return { type: 'element', el: body };
          if (a && a.max > 20) return { type: 'element', el: docEl };
          if (b && b.max > 20) return { type: 'element', el: body };
        } catch (e) { }
      }

      const mpReader = document.querySelector('.wr_mp_reader');
      const mpInfo = mpReader ? getElementScrollInfo(mpReader) : null;
      if (mpInfo && mpInfo.max > 20) return { type: 'element', el: mpReader };

      const win = getWindowScrollInfo();
      if (win.max > 20) return { type: 'window' };

      return null;
    }

    function getBookCandidates() {
      const selectors = [
        '.app_content',
        '.readerChapterContent',
        '.readerContent',
        '.wr_readerContent',
        '.renderTargetContainer',
        '.wr_verticalReader',
        '.wr_reader',
        'main'
      ];

      const list = [];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) continue;

        const info = getElementScrollInfo(el);
        if (!info) continue;

        list.push({
          type: 'element',
          el,
          sel,
          max: info.max,
          cur: info.cur
        });
      }

      const win = getWindowScrollInfo();
      list.push({
        type: 'window',
        el: document.documentElement,
        sel: 'window',
        max: win.max,
        cur: win.cur
      });

      return list.sort((a, b) => b.max - a.max);
    }

    function hasPagerSignals() {
      const text = document.body?.innerText || '';
      if (text.includes('上一页') && text.includes('下一页')) return true;
      if (text.includes('左右翻页阅读')) return true;
      return false;
    }

    function getBookModeAndTarget() {
      const candidates = getBookCandidates();
      const best = candidates[0];

      if (!best) return { mode: 'unknown', target: null };

      const verticalInner = candidates.find(
        x => x.type === 'element' && x.sel !== 'main' && x.max > 80
      );
      if (verticalInner) {
        return { mode: 'vertical', target: verticalInner };
      }

      if (best.type === 'window' && best.max > 120) {
        return { mode: 'vertical', target: best };
      }

      if (hasPagerSignals()) {
        return { mode: 'horizontal', target: null };
      }

      if (best.max > 80) {
        return { mode: 'vertical', target: best };
      }

      return { mode: 'horizontal', target: null };
    }

    function getScrollInfoFromTarget(target) {
      if (!target) return null;
      if (target.type === 'window') return getWindowScrollInfo();
      return getElementScrollInfo(target.el);
    }

    function calcPct(info) {
      if (!info || info.max <= 0) return 1;

      let pct = Math.floor((info.cur / info.max) * 100);

      if (pct <= 0) pct = 1;
      if (pct > 100) pct = 100;

      return pct;
    }

    function update() {
      if (!isReadingPage()) {
        hideText();
        return;
      }

      let info = null;

      if (isMPArticle()) {
        const target = getMPScrollTarget();
        if (!target) {
          hideText();
          return;
        }

        info = target.type === 'window'
          ? getWindowScrollInfo()
          : getElementScrollInfo(target.el);

        if (!info || info.max <= 0) {
          hideText();
          return;
        }
      } else {
        const result = getBookModeAndTarget();

        if (result.mode !== 'vertical' || !result.target) {
          hideText();
          return;
        }

        info = getScrollInfoFromTarget(result.target);

        if (!info || info.max <= 0) {
          hideText();
          return;
        }
      }

      let pct = calcPct(info);
      if (pct <= 0) pct = 1;

      showText(`${pct}%`);
    }

    setInterval(update, 220);
    window.addEventListener('scroll', update, true);
    document.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
  })();

  // ==================== 小鹅通课程阅读进度 ====================
  (function XiaoEProgress() {
    if (window.__xe_read_progress_v12__) return;
    window.__xe_read_progress_v12__ = true;

    const ROOT_ID = 'xe-read-progress-v12';
    const BAR_SELECTOR = '.muti_btn_box';
    const AREA_SELECTOR = '.course-botom-area';
    const CATALOG_TEXT = '课程目录';

    let rootEl = null;

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function isXiaoeCoursePage() {
      if (!/\.?(xet\.pomoho\.com|xiaoe-tech\.com|xiaoeknow\.com|xeknow\.com)$/i.test(location.hostname)) return false;
      return location.pathname.startsWith('/p/course/');
    }

    function getBottomBar() {
      return document.querySelector(BAR_SELECTOR);
    }

    function findBarFallback() {
      // 兜底：通过"课程目录"文字定位底部栏
      const all = document.querySelectorAll('figcaption, span, div');
      for (const el of all) {
        if (el.children.length !== 0) continue;
        if (el.textContent.trim() !== CATALOG_TEXT) continue;
        const figure = el.closest('figure');
        if (figure && figure.parentElement) return figure.parentElement;
      }
      return null;
    }

    function getInsertAnchor(bar) {
      const area = bar.querySelector(AREA_SELECTOR);
      if (area) return { parent: bar, before: area };
      const figure = bar.querySelector('figure');
      if (figure && figure.nextElementSibling) {
        return { parent: bar, before: figure.nextElementSibling };
      }
      return { parent: bar, before: null };
    }

    function createProgressNode(bar) {
      const anchor = getInsertAnchor(bar);

      const root = document.createElement('div');
      root.id = ROOT_ID;
      root.setAttribute('aria-hidden', 'true');
      root.style.cssText = [
        'flex: 0 0 auto',
        'display: flex',
        'align-items: center',
        'margin-left: 4px',
        'margin-right: 10px',
        'font-size: 14px',
        'font-weight: 500',
        'color: rgb(74, 76, 91)',
        'line-height: 1',
        'white-space: nowrap',
        'user-select: none',
        'pointer-events: none'
      ].join(';');

      const label = document.createElement('span');
      label.textContent = '已读';
      label.style.cssText = 'opacity: .85; margin-right: 2px;';

      const value = document.createElement('span');
      value.textContent = '1%';

      root.appendChild(label);
      root.appendChild(value);

      if (anchor.before) {
        anchor.parent.insertBefore(root, anchor.before);
      } else {
        anchor.parent.appendChild(root);
      }

      return root;
    }

    function ensureProgressNode() {
      const bar = getBottomBar() || findBarFallback();
      if (!bar) {
        if (rootEl) rootEl.style.display = 'none';
        return null;
      }

      if (rootEl && rootEl.isConnected && rootEl.parentElement === bar) {
        rootEl.style.display = '';
        return rootEl;
      }

      if (rootEl && rootEl.isConnected) rootEl.remove();

      // 防止重复注入
      const existing = bar.querySelector('#' + ROOT_ID);
      if (existing) {
        rootEl = existing;
        rootEl.style.display = '';
        return rootEl;
      }

      rootEl = createProgressNode(bar);
      return rootEl;
    }

    function setDisplay(pct) {
      const root = ensureProgressNode();
      if (!root) return;

      const valueEl = root.lastElementChild;
      if (!valueEl) return;

      const text = pct + '%';
      if (valueEl.textContent !== text) valueEl.textContent = text;
    }

    function getScrollPct() {
      const doc = document.documentElement;
      const cur = window.scrollY || doc.scrollTop || document.body.scrollTop || 0;
      const max = Math.max(doc.scrollHeight, document.body.scrollHeight) - window.innerHeight;

      if (max <= 20) return null; // 页面不可滚动

      // 已滚动到页面底部 → 100%
      if (cur >= max - 1) return 100;

      let pct = Math.round((cur / max) * 100);
      if (pct < 1) pct = 1;
      if (pct > 99) pct = 99;
      return pct;
    }

    function parseTimeText(str) {
      // 匹配 "00:12/81:14" 这类 当前时间/总时长 文本
      const m = /^(\d{1,2}):(\d{1,2})\/(\d{1,3}):(\d{1,2})$/.exec((str || '').trim());
      if (!m) return null;
      const cur = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      const dur = parseInt(m[3], 10) * 60 + parseInt(m[4], 10);
      if (!(dur > 0)) return null;
      return { cur, dur };
    }

    function getAudioPct() {
      // 1) 原生 audio / video 元素
      for (const media of document.querySelectorAll('audio, video')) {
        if (media.duration > 0 && media.currentTime > 0) {
          return clamp(Math.round((media.currentTime / media.duration) * 100), 1, 100);
        }
      }

      // 2) 自定义播放器的时间文本（如 "03:25/81:14"）
      const spans = document.querySelectorAll('span, div');
      for (const el of spans) {
        if (el.children.length !== 0) continue;
        const t = parseTimeText(el.textContent);
        if (t && t.cur > 0) {
          return clamp(Math.round((t.cur / t.dur) * 100), 1, 100);
        }
      }

      return null;
    }

    let ticking = false;

    function updateProgress() {
      if (!isXiaoeCoursePage()) {
        if (rootEl) rootEl.style.display = 'none';
        return;
      }

      const root = ensureProgressNode();
      if (!root) return;

      // 优先音频播放进度，其次滚动进度
      const audioPct = getAudioPct();
      if (audioPct !== null) {
        setDisplay(audioPct);
        return;
      }

      const scrollPct = getScrollPct();
      if (scrollPct !== null) {
        setDisplay(scrollPct);
        return;
      }

      setDisplay(1);
    }

    function requestUpdate() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        updateProgress();
      });
    }

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });

    // SPA 路由切换 / 课程目录切课 兜底
    setInterval(updateProgress, 800);

    [0, 200, 600, 1500].forEach(function (delay) {
      setTimeout(updateProgress, delay);
    });
  })();
})();
