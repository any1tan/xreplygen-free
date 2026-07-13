import type {
  GenerateRepliesResponse,
  InterfaceLanguage,
  ReplyLanguage,
  ReplyMode,
  ReplySite,
} from '../shared';

(() => {
  const ROOT_ID = 'xra-shadow-root-host';
  const POSITION_KEY = 'xreplygen-composer-position-v2';
  const globalState = window as Window & { __xraCleanup?: () => void };
  const controller = new AbortController();

  const modeOptions: Array<{ value: ReplyMode; key: 'attract' | 'agree' | 'question' | 'counter' }> = [
    { value: 'attract', key: 'attract' },
    { value: 'agree', key: 'agree' },
    { value: 'question', key: 'question' },
    { value: 'counter', key: 'counter' },
  ];

  const replyLanguageOptions: Array<{ value: ReplyLanguage; label: string }> = [
    { value: 'auto', label: 'auto' },
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'pt', label: 'Português' },
    { value: 'ru', label: 'Русский' },
    { value: 'ar', label: 'العربية' },
  ];

  type ContentCopy = {
    angle: string;
    replyLanguage: string;
    autoLanguage: string;
    modes: Record<(typeof modeOptions)[number]['key'], string>;
    generate: string;
    generating: string;
    close: string;
    drag: string;
    chooseDraft: string;
    clickToInsert: string;
    draftStatus: string;
    escToClose: string;
    readingPost: string;
    generatingDraft: string;
    retrying: string;
    missingEditor: string;
    missingPost: string;
    extensionReloaded: string;
    retry: string;
    chooseNote: string;
    insert: string;
    keyboardHint: (count: number) => string;
    another: string;
  };

  const contentCopy: Record<'zh' | 'en', ContentCopy> = {
    zh: {
      angle: '生成角度',
      replyLanguage: '回复语言',
      autoLanguage: '跟随推文',
      modes: { attract: '贴题', agree: '补充', question: '提问', counter: '观点' },
      generate: '生成',
      generating: '生成中',
      close: '关闭 XReplyGen',
      drag: '拖动移动，双击复位',
      chooseDraft: '选择一条草稿',
      clickToInsert: '点击即填入',
      draftStatus: '草稿状态',
      escToClose: 'Esc 关闭',
      readingPost: '正在读取这条帖子…',
      generatingDraft: '正在生成草稿…',
      retrying: '正在换一个角度…',
      missingEditor: '没有找到当前回复框。',
      missingPost: '没有读到当前帖子内容。打开具体帖子，或在回复框里再试。',
      extensionReloaded: '扩展刚被重新加载。刷新 X 页面后再试。',
      retry: '重试',
      chooseNote: '先选一句，再按自己的语气改半句。',
      insert: '填入',
      keyboardHint: (count) => `按 1${count > 1 ? `-${count}` : ''} 也可填入`,
      another: '换一条',
    },
    en: {
      angle: 'Draft angle',
      replyLanguage: 'Reply language',
      autoLanguage: 'Match post',
      modes: { attract: 'On point', agree: 'Add on', question: 'Ask', counter: 'Viewpoint' },
      generate: 'Generate',
      generating: 'Generating',
      close: 'Close XReplyGen',
      drag: 'Drag to move. Double-click to reset.',
      chooseDraft: 'Choose a draft',
      clickToInsert: 'Click to insert',
      draftStatus: 'Draft status',
      escToClose: 'Esc to close',
      readingPost: 'Reading this post…',
      generatingDraft: 'Generating a draft…',
      retrying: 'Trying a different angle…',
      missingEditor: 'No reply box found.',
      missingPost: 'Could not read this post. Open the post, or try again from its reply box.',
      extensionReloaded: 'The extension was reloaded. Refresh X and try again.',
      retry: 'Try again',
      chooseNote: 'Choose one, then make it sound like you.',
      insert: 'Insert',
      keyboardHint: (count) => `Press 1${count > 1 ? `-${count}` : ''} to insert`,
      another: 'Another one',
    },
  };

  type DragState = {
    pointerId: number;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  };

  type FloatingPosition = {
    left: number;
    top: number;
  };

  let observer: MutationObserver | null = null;
  let activeEditor: HTMLElement | null = null;
  let activeMode: ReplyMode = 'attract';
  let interfaceLanguage: 'zh' | 'en' = resolveInterfaceLanguage('auto');
  let defaultReplyLanguage: ReplyLanguage = 'auto';
  let activeReplyLanguage: ReplyLanguage = 'auto';
  let hasManualLanguageSelection = false;
  let activeTrigger: HTMLButtonElement | null = null;
  let lastReplies: string[] = [];
  let dragState: DragState | null = null;
  let isUserPositioned = Boolean(readStoredPosition());
  let cachedPostKey = '';
  let cachedPostText = '';

  void syncPreferences();
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.defaultLanguage || changes.interfaceLanguage)) {
      void syncPreferences();
    }
  });

  function resolveInterfaceLanguage(value: InterfaceLanguage | unknown): 'zh' | 'en' {
    if (value === 'zh' || value === 'en') return value;
    return /^zh(?:-|$)/i.test(navigator.language || '') ? 'zh' : 'en';
  }

  function normalizeReplyLanguage(value: unknown): ReplyLanguage {
    return replyLanguageOptions.some((option) => option.value === value) ? (value as ReplyLanguage) : 'auto';
  }

  function getCopy(): ContentCopy {
    return contentCopy[interfaceLanguage];
  }

  async function syncPreferences(): Promise<void> {
    const stored = await chrome.storage.local.get(['defaultLanguage', 'interfaceLanguage']);
    const nextInterfaceLanguage = resolveInterfaceLanguage(stored.interfaceLanguage);
    const nextDefaultLanguage = normalizeReplyLanguage(stored.defaultLanguage);
    const shouldRefresh =
      nextInterfaceLanguage !== interfaceLanguage ||
      nextDefaultLanguage !== defaultReplyLanguage;

    interfaceLanguage = nextInterfaceLanguage;
    defaultReplyLanguage = nextDefaultLanguage;
    if (!hasManualLanguageSelection) {
      activeReplyLanguage = defaultReplyLanguage;
    }

    if (shouldRefresh && document.getElementById(ROOT_ID)) {
      document.getElementById(ROOT_ID)?.remove();
      if (activeEditor && document.contains(activeEditor)) {
        renderToolbar();
        positionRoot(activeEditor);
      }
    }
  }

  try {
    globalState.__xraCleanup?.();
  } catch {
    // A reloaded extension can leave an invalidated content-script context behind.
  }
  document.getElementById(ROOT_ID)?.remove();

  globalState.__xraCleanup = () => {
    controller.abort();
    observer?.disconnect();
    stopDragging();
    document.getElementById(ROOT_ID)?.remove();
  };

  document.addEventListener(
    'focusin',
    (event) => {
      const editor = findReplyEditor(event.target);
      if (editor) activateEditor(editor);
    },
    { signal: controller.signal }
  );

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest(`#${ROOT_ID}`)) return;

      const editor = findReplyEditor(target);
      if (editor) {
        activateEditor(editor);
        return;
      }

      if (!target.closest('[role="textbox"], [contenteditable="true"], textarea')) {
        hideRoot();
      }
    },
    { signal: controller.signal }
  );

  document.addEventListener(
    'keyup',
    () => {
      const editor = findReplyEditor(document.activeElement);
      if (editor) activateEditor(editor);
    },
    { signal: controller.signal }
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        hideRoot();
        return;
      }

      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        isTypingTarget(event.target)
      ) {
        return;
      }

      const choice = Number.parseInt(event.key, 10);
      if (!Number.isInteger(choice) || choice < 1 || choice > lastReplies.length) return;

      const editor = activeEditor;
      if (!editor || !document.contains(editor)) return;
      event.preventDefault();
      insertReply(editor, lastReplies[choice - 1]);
      hideRoot();
    },
    { signal: controller.signal }
  );

  window.addEventListener('resize', () => positionRoot(), { signal: controller.signal });
  window.addEventListener('scroll', () => positionRoot(), {
    signal: controller.signal,
    capture: true,
  });

  observer = new MutationObserver(() => {
    if (activeEditor && !document.contains(activeEditor)) hideRoot();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  function activateEditor(editor: HTMLElement): void {
    if (!isReplyContext(editor)) {
      hideRoot();
      return;
    }

    activeEditor = editor;
    renderToolbar();
    positionRoot(editor);
  }

  function renderToolbar(): void {
    const root = ensureRoot();
    const shadow = root.shadowRoot;
    if (!shadow) return;

    const modeSelect = shadow.querySelector<HTMLSelectElement>('.xra-mode');
    const languageSelect = shadow.querySelector<HTMLSelectElement>('.xra-language');
    const trigger = shadow.querySelector<HTMLButtonElement>('.xra-generate');
    const close = shadow.querySelector<HTMLButtonElement>('.xra-close');

    if (modeSelect && !modeSelect.dataset.bound) {
      modeSelect.dataset.bound = 'true';
      modeSelect.addEventListener('change', () => {
        activeMode = modeSelect.value as ReplyMode;
      });
    }

    if (languageSelect) {
      languageSelect.value = activeReplyLanguage;
      if (!languageSelect.dataset.bound) {
        languageSelect.dataset.bound = 'true';
        languageSelect.addEventListener('change', () => {
          activeReplyLanguage = normalizeReplyLanguage(languageSelect.value);
          hasManualLanguageSelection = true;
        });
      }
    }

    if (trigger && !trigger.dataset.bound) {
      trigger.dataset.bound = 'true';
      trigger.addEventListener('click', (event) => {
        if (!event.isTrusted) return;
        const editor = activeEditor;
        if (!editor) {
          renderPanel({ ok: false, error: getCopy().missingEditor });
          return;
        }
        void generateReply(activeMode, editor, trigger);
      });
    }

    if (close && !close.dataset.bound) {
      close.dataset.bound = 'true';
      close.addEventListener('click', () => hideRoot());
    }
  }

  function ensureRoot(): HTMLElement {
    const existing = document.getElementById(ROOT_ID);
    if (existing?.shadowRoot) return existing;

    existing?.remove();
    const host = document.createElement('div');
    host.id = ROOT_ID;
    document.body.append(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const copy = getCopy();
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          left: 12px;
          top: 12px;
          z-index: 2147483646;
          width: min(372px, calc(100vw - 24px));
          color: #0f1419;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          pointer-events: none;
        }
        * { box-sizing: border-box; }
        button, select { font: inherit; }
        .xra-shell {
          width: 100%;
          pointer-events: auto;
        }
        .xra-toolbar {
          display: flex;
          min-height: 42px;
          align-items: center;
          gap: 8px;
          padding: 5px 6px 5px 8px;
          border: 1px solid #cfd9de;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 4px 16px rgba(15, 20, 25, 0.12);
          backdrop-filter: blur(14px);
        }
        .xra-drag-handle {
          display: inline-flex;
          min-width: 106px;
          align-items: center;
          gap: 7px;
          border: 0;
          padding: 0;
          background: transparent;
          color: #0f1419;
          cursor: grab;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          text-align: left;
          user-select: none;
        }
        .xra-drag-handle:active,
        :host([data-dragging="true"]) .xra-drag-handle,
        :host([data-dragging="true"]) .xra-panel-heading {
          cursor: grabbing;
        }
        .xra-mark {
          display: grid;
          width: 25px;
          height: 25px;
          place-items: center;
          border-radius: 50%;
          background: #0f1419;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
        }
        .xra-controls {
          display: flex;
          min-width: 0;
          flex: 1;
          justify-content: flex-end;
          gap: 5px;
        }
        .xra-mode,
        .xra-language {
          min-width: 0;
          max-width: 78px;
          border: 0;
          border-radius: 999px;
          padding: 0 7px;
          outline: none;
          background: #eff3f4;
          color: #536471;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
        }
        .xra-generate,
        .xra-regenerate,
        .xra-retry {
          min-height: 30px;
          border: 0;
          border-radius: 999px;
          padding: 0 13px;
          background: #1d9bf0;
          color: #fff;
          cursor: pointer;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }
        .xra-generate:hover,
        .xra-regenerate:hover,
        .xra-retry:hover { background: #1a8cd8; }
        .xra-generate:disabled,
        .xra-mode:disabled,
        .xra-language:disabled { cursor: wait; opacity: 0.66; }
        .xra-close {
          display: grid;
          width: 28px;
          min-width: 28px;
          height: 28px;
          place-items: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #536471;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }
        .xra-close:hover { background: #eff3f4; color: #0f1419; }
        .xra-panel {
          display: none;
          margin-bottom: 7px;
          overflow: hidden;
          border: 1px solid #cfd9de;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.98);
          box-shadow: 0 10px 28px rgba(15, 20, 25, 0.16);
          backdrop-filter: blur(14px);
        }
        .xra-panel[data-open="true"] { display: block; }
        .xra-panel-inner { padding: 12px; }
        .xra-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #0f1419;
          cursor: grab;
          font-size: 13px;
          font-weight: 800;
          user-select: none;
        }
        .xra-panel-heading small { color: #536471; font-size: 11px; font-weight: 600; }
        .xra-note,
        .xra-status,
        .xra-error,
        .xra-keyboard-hint {
          margin-top: 6px;
          color: #536471;
          font-size: 12px;
          line-height: 1.45;
        }
        .xra-status { display: flex; align-items: center; gap: 8px; }
        .xra-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #cfe9fb;
          border-top-color: #1d9bf0;
          border-radius: 50%;
          animation: xra-spin 0.8s linear infinite;
        }
        @keyframes xra-spin { to { transform: rotate(360deg); } }
        .xra-list { display: grid; gap: 7px; margin-top: 10px; }
        .xra-candidate {
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr) auto;
          align-items: start;
          gap: 8px;
          width: 100%;
          border: 1px solid #d9e2e7;
          border-radius: 12px;
          padding: 10px;
          background: #fff;
          color: #0f1419;
          cursor: pointer;
          text-align: left;
        }
        .xra-candidate:hover { border-color: #1d9bf0; background: #f7fbff; }
        .xra-candidate-number {
          display: grid;
          width: 22px;
          height: 22px;
          place-items: center;
          border-radius: 50%;
          background: #eff3f4;
          color: #536471;
          font-size: 11px;
          font-weight: 800;
        }
        .xra-candidate-copy {
          min-width: 0;
          white-space: pre-wrap;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.42;
        }
        .xra-candidate-action { padding-top: 2px; color: #1d9bf0; font-size: 11px; font-weight: 800; }
        .xra-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 10px;
          border-top: 1px solid #eff3f4;
          padding-top: 10px;
        }
        .xra-keyboard-hint { margin: 0; color: #8899a6; font-size: 11px; }
        .xra-regenerate,
        .xra-retry { min-height: 29px; padding: 0 11px; }
        .xra-error { color: #b42318; white-space: pre-wrap; }
        .xra-retry { margin-top: 10px; }
        @media (max-width: 520px) {
          :host { width: min(350px, calc(100vw - 16px)); }
          .xra-toolbar { padding-left: 7px; gap: 5px; }
          .xra-drag-handle { min-width: 82px; }
          .xra-mode,
          .xra-language { max-width: 66px; }
          .xra-generate { padding: 0 10px; }
        }
        @media (prefers-color-scheme: dark) {
          :host { color: #e7e9ea; }
          .xra-toolbar,
          .xra-panel { border-color: #38444d; background: rgba(0, 0, 0, 0.97); }
          .xra-drag-handle,
          .xra-panel-heading,
          .xra-candidate { color: #e7e9ea; }
          .xra-mark { background: #eff3f4; color: #0f1419; }
          .xra-mode,
          .xra-language,
          .xra-close:hover { background: #16181c; color: #8b98a5; }
          .xra-panel-heading small,
          .xra-note,
          .xra-status,
          .xra-keyboard-hint { color: #8b98a5; }
          .xra-candidate { border-color: #38444d; background: #000; }
          .xra-candidate:hover { border-color: #1d9bf0; background: #061723; }
          .xra-candidate-number { background: #16181c; color: #8b98a5; }
          .xra-footer { border-top-color: #16181c; }
        }
      </style>
      <div class="xra-shell">
        <section class="xra-panel" aria-live="polite" aria-atomic="true"></section>
        <div class="xra-toolbar" role="toolbar" aria-label="XReplyGen">
          <button class="xra-drag-handle" type="button" title="${copy.drag}" aria-label="${copy.drag}">
            <span class="xra-mark" aria-hidden="true">X</span>
            <span>XReplyGen</span>
          </button>
          <div class="xra-controls">
            <select class="xra-mode" aria-label="${copy.angle}">
              ${modeOptions.map((option) => `<option value="${option.value}">${copy.modes[option.key]}</option>`).join('')}
            </select>
            <select class="xra-language" aria-label="${copy.replyLanguage}">
              ${replyLanguageOptions
                .map((option) => `<option value="${option.value}">${option.value === 'auto' ? copy.autoLanguage : option.label}</option>`)
                .join('')}
            </select>
            <button class="xra-generate" type="button">${copy.generate}</button>
            <button class="xra-close" type="button" aria-label="${copy.close}">×</button>
          </div>
        </div>
      </div>
    `;

    bindDragInteractions(host, shadow);
    return host;
  }

  function bindDragInteractions(host: HTMLElement, shadow: ShadowRoot): void {
    shadow.addEventListener('pointerdown', (event) => {
      if (!(event instanceof PointerEvent)) return;
      const target = event.target;
      if (!(target instanceof Element) || event.button !== 0) return;
      const handle = target.closest('.xra-drag-handle, .xra-panel-heading');
      if (!handle) return;

      const bounds = host.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: bounds.left,
        startTop: bounds.top,
      };
      host.dataset.dragging = 'true';
      isUserPositioned = true;
      event.preventDefault();
      (handle as HTMLElement).setPointerCapture?.(event.pointerId);
      window.addEventListener('pointermove', moveDraggedRoot, { passive: false });
      window.addEventListener('pointerup', finishDragging);
      window.addEventListener('pointercancel', finishDragging);
    });

    shadow.addEventListener('dblclick', (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('.xra-drag-handle, .xra-panel-heading')) return;
      isUserPositioned = false;
      localStorage.removeItem(POSITION_KEY);
      stopDragging();
      positionRoot();
    });
  }

  function moveDraggedRoot(event: PointerEvent): void {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const root = document.getElementById(ROOT_ID);
    if (!root) {
      stopDragging();
      return;
    }

    const bounds = root.getBoundingClientRect();
    const left = clamp(dragState.startLeft + event.clientX - dragState.startX, 8, Math.max(8, window.innerWidth - bounds.width - 8));
    const top = clamp(dragState.startTop + event.clientY - dragState.startY, 8, Math.max(8, window.innerHeight - Math.min(bounds.height, window.innerHeight - 16) - 8));
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    event.preventDefault();
  }

  function finishDragging(event?: PointerEvent): void {
    if (event && dragState && event.pointerId !== dragState.pointerId) return;
    const root = document.getElementById(ROOT_ID);
    if (root && isUserPositioned) {
      writeStoredPosition({
        left: Number.parseFloat(root.style.left),
        top: Number.parseFloat(root.style.top),
      });
    }
    stopDragging();
  }

  function stopDragging(): void {
    window.removeEventListener('pointermove', moveDraggedRoot);
    window.removeEventListener('pointerup', finishDragging);
    window.removeEventListener('pointercancel', finishDragging);
    dragState = null;
    document.getElementById(ROOT_ID)?.removeAttribute('data-dragging');
  }

  function positionRoot(editor = activeEditor): void {
    const root = document.getElementById(ROOT_ID);
    if (!root || !editor || !document.contains(editor)) return;

    const width = Math.min(372, Math.max(280, window.innerWidth - 24));
    root.style.width = `${width}px`;

    if (isUserPositioned) {
      const stored = readStoredPosition();
      if (stored) {
        root.style.left = `${clamp(stored.left, 8, Math.max(8, window.innerWidth - width - 8))}px`;
        root.style.top = `${clamp(stored.top, 8, Math.max(8, window.innerHeight - 56))}px`;
        return;
      }
    }

    const editorBounds = editor.getBoundingClientRect();
    const rootHeight = Math.max(root.getBoundingClientRect().height, 44);
    const left = clamp(editorBounds.right - width, 12, Math.max(12, window.innerWidth - width - 12));
    const belowTop = editorBounds.bottom + 8;
    const aboveTop = editorBounds.top - rootHeight - 8;
    const top = belowTop + rootHeight <= window.innerHeight - 12 ? belowTop : Math.max(12, aboveTop);
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
  }

  async function generateReply(
    mode: ReplyMode,
    editor: HTMLElement,
    trigger: HTMLButtonElement,
    options: { regenerate?: boolean } = {}
  ): Promise<void> {
    const copy = getCopy();
    activeMode = mode;
    activeTrigger = trigger;
    lastReplies = [];
    setLoading(trigger, true);
    renderPanel({ ok: false, loading: true, message: options.regenerate ? copy.retrying : copy.readingPost });
    await nextFrame();

    if (!canMessageExtension()) {
      renderPanel({ ok: false, error: copy.extensionReloaded });
      setLoading(trigger, false);
      return;
    }

    const postText = getCurrentTweetText(editor);
    if (!postText) {
      renderPanel({ ok: false, error: copy.missingPost });
      setLoading(trigger, false);
      return;
    }

    renderPanel({ ok: false, loading: true, message: copy.generatingDraft });
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'generate-replies',
        mode,
        tweetText: postText,
        replyLanguage: activeReplyLanguage,
        site: getCurrentSite(),
        pageUrl: location.href,
        regenerate: options.regenerate,
        nonce: options.regenerate ? `${Date.now()}-${Math.random().toString(36).slice(2)}` : undefined,
      })) as GenerateRepliesResponse;
      renderPanel(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const normalized = message.toLowerCase();
      renderPanel({
        ok: false,
        error:
          normalized.includes('context invalidated') ||
          normalized.includes('extension context') ||
          normalized.includes('sendmessage') ||
          !canMessageExtension()
            ? copy.extensionReloaded
            : message || copy.retry,
      });
    } finally {
      setLoading(trigger, false);
    }
  }

  function renderPanel(
    response: GenerateRepliesResponse & { loading?: boolean; message?: string }
  ): void {
    const copy = getCopy();
    const panel = ensureRoot().shadowRoot?.querySelector<HTMLElement>('.xra-panel');
    if (!panel) return;

    panel.replaceChildren();
    panel.dataset.open = 'true';
    panel.setAttribute('aria-busy', response.loading ? 'true' : 'false');

    const inner = document.createElement('div');
    inner.className = 'xra-panel-inner';
    const heading = document.createElement('div');
    heading.className = 'xra-panel-heading';
    heading.title = copy.drag;
    heading.innerHTML = response.ok
      ? `<span>${copy.chooseDraft}</span><small>${copy.clickToInsert}</small>`
      : `<span>${copy.draftStatus}</span><small>${copy.escToClose}</small>`;
    inner.append(heading);

    if (response.loading) {
      const status = document.createElement('div');
      status.className = 'xra-status';
      status.innerHTML = `<span class="xra-spinner" aria-hidden="true"></span><span>${escapeHtml(response.message || copy.generatingDraft)}</span>`;
      inner.append(status);
      panel.append(inner);
      requestAnimationFrame(() => positionRoot());
      return;
    }

    if (!response.ok || !response.replies?.length) {
      const error = document.createElement('p');
      error.className = 'xra-error';
      error.textContent = response.error || copy.retry;
      inner.append(error);

      if (activeEditor && activeTrigger && document.contains(activeEditor)) {
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'xra-retry';
        retry.textContent = copy.retry;
        retry.addEventListener('click', (event) => {
          if (!event.isTrusted || !activeEditor || !activeTrigger) return;
          void generateReply(activeMode, activeEditor, activeTrigger, { regenerate: true });
        });
        inner.append(retry);
      }

      panel.append(inner);
      requestAnimationFrame(() => positionRoot());
      return;
    }

    lastReplies = response.replies;
    const note = document.createElement('p');
    note.className = 'xra-note';
    note.textContent = copy.chooseNote;
    inner.append(note);

    const list = document.createElement('div');
    list.className = 'xra-list';
    response.replies.forEach((reply, index) => {
      const candidate = document.createElement('button');
      candidate.type = 'button';
      candidate.className = 'xra-candidate';
      candidate.setAttribute('aria-label', `${copy.insert} ${index + 1}`);
      candidate.innerHTML = `
        <span class="xra-candidate-number">${index + 1}</span>
        <span class="xra-candidate-copy"></span>
        <span class="xra-candidate-action">${copy.insert}</span>
      `;
      candidate.querySelector<HTMLElement>('.xra-candidate-copy')!.textContent = reply;
      candidate.addEventListener('click', (event) => {
        if (!event.isTrusted || !activeEditor) return;
        insertReply(activeEditor, reply);
        hideRoot();
      });
      list.append(candidate);
    });
    inner.append(list);

    const footer = document.createElement('div');
    footer.className = 'xra-footer';
    const keyboardHint = document.createElement('p');
    keyboardHint.className = 'xra-keyboard-hint';
    keyboardHint.textContent = copy.keyboardHint(response.replies.length);
    footer.append(keyboardHint);

    const regenerate = document.createElement('button');
    regenerate.type = 'button';
    regenerate.className = 'xra-regenerate';
    regenerate.textContent = copy.another;
    regenerate.addEventListener('click', (event) => {
      if (!event.isTrusted || !activeEditor || !activeTrigger || !document.contains(activeEditor)) return;
      void generateReply(activeMode, activeEditor, activeTrigger, { regenerate: true });
    });
    footer.append(regenerate);
    inner.append(footer);
    panel.append(inner);
    requestAnimationFrame(() => positionRoot());
  }

  function setLoading(trigger: HTMLButtonElement, loading: boolean): void {
    const shadow = document.getElementById(ROOT_ID)?.shadowRoot;
    shadow?.querySelectorAll<HTMLButtonElement>('.xra-generate').forEach((button) => {
      button.disabled = loading;
      button.textContent = loading ? getCopy().generating : getCopy().generate;
    });
    shadow?.querySelectorAll<HTMLSelectElement>('.xra-mode, .xra-language').forEach((select) => {
      select.disabled = loading;
    });
    trigger.disabled = loading;
  }

  function hideRoot(): void {
    activeEditor = null;
    activeTrigger = null;
    lastReplies = [];
    document.getElementById(ROOT_ID)?.remove();
  }

  function findReplyEditor(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null;
    const direct = target.closest<HTMLElement>('[role="textbox"][contenteditable="true"], [contenteditable="true"], textarea');
    if (direct) return direct;

    const scope = target.closest<HTMLElement>('[data-testid="tweetTextarea_0"], form, [role="dialog"], article, section');
    return scope?.querySelector<HTMLElement>('[role="textbox"][contenteditable="true"], [contenteditable="true"], textarea') ?? null;
  }

  function isReplyContext(editor: HTMLElement): boolean {
    if (isNonReplyEditor(editor)) return false;

    const editorHints = `${editor.getAttribute('aria-label') || ''} ${editor.getAttribute('data-testid') || ''}`.toLowerCase();
    const container = findComposerContainer(editor);
    const text = (container?.textContent || '').toLowerCase();
    const saysReplying = text.includes('replying to') || text.includes('回复给') || text.includes('正在回复');
    const hasReplyButton = Boolean(container?.querySelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]'));
    const saysReply = text.includes('reply') || text.includes('回复') || text.includes('发布回复');
    const inQuoteOrReplyDialog = Boolean(editor.closest('[role="dialog"]')) && !isMainComposer(editor);
    const inStatusPage = /\/status\/\d+/.test(location.pathname) && isInMain(editor) && !isMainComposer(editor);
    const inTimelineReply = hasReplyButton && looksLikeTimelineReply(editor) && !isMainComposer(editor);
    const composeReply = location.pathname === '/compose/post' && (saysReplying || saysReply);

    return editorHints.includes('reply') || editorHints.includes('回复') || saysReplying || inQuoteOrReplyDialog || inStatusPage || inTimelineReply || composeReply;
  }

  function isNonReplyEditor(editor: HTMLElement): boolean {
    const hints = [
      editor.getAttribute('type'),
      editor.getAttribute('aria-label'),
      editor.getAttribute('placeholder'),
      editor.getAttribute('name'),
      editor.getAttribute('id'),
      editor.getAttribute('role'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hints.includes('search') || hints.includes('subscribe') || hints.includes('email');
  }

  function isMainComposer(editor: HTMLElement): boolean {
    const dialog = editor.closest('[role="dialog"]');
    const text = dialog?.textContent || '';
    return text.includes('What is happening') || text.includes('有什么新鲜事') || text.includes('发生了什么');
  }

  function isInMain(editor: HTMLElement): boolean {
    return Boolean(document.querySelector('main')?.contains(editor));
  }

  function looksLikeTimelineReply(editor: HTMLElement): boolean {
    if (getStatusArticle()) return true;
    let current: HTMLElement | null = editor;
    for (let depth = 0; current && depth < 10; depth += 1) {
      const article = current.querySelector('article');
      if (article && !article.contains(editor)) return true;
      current = current.parentElement;
    }
    return Array.from(document.querySelectorAll('main article')).slice(-8).some((article) => Boolean(readPostText(article)));
  }

  function findComposerContainer(editor: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = editor;
    for (let depth = 0; current && depth < 14; depth += 1) {
      const hasEditor = Boolean(current.querySelector('[role="textbox"][contenteditable="true"]'));
      const hasReplyButton = Boolean(current.querySelector('[data-testid="tweetButtonInline"], [data-testid="tweetButton"]'));
      const hasTextarea = Boolean(current.querySelector('[data-testid="tweetTextarea_0"]'));
      const text = (current.textContent || '').toLowerCase();
      const saysReplying = text.includes('replying to') || text.includes('回复给') || text.includes('正在回复');
      if ((hasEditor && hasReplyButton) || hasTextarea || (hasEditor && saysReplying)) return current;
      current = current.parentElement;
    }
    return editor.closest<HTMLElement>('[role="dialog"] form') || editor.closest('form') || editor.parentElement;
  }

  function getCurrentSite(): ReplySite {
    const host = location.hostname.toLowerCase();
    return host === 'x.com' || host === 'twitter.com' ? 'x' : 'generic';
  }

  function getCurrentTweetText(editor: HTMLElement): string {
    const key = `${location.pathname}${location.search}`;
    const isStatusPage = /\/status\/\d+/.test(location.pathname);
    if (isStatusPage && cachedPostKey === key && cachedPostText) return cachedPostText;

    const statusArticle = getStatusArticle();
    const directPost = statusArticle ? readPostText(statusArticle) : '';
    if (directPost) return isStatusPage ? cachePost(key, directPost) : directPost;

    const quotedOrModalPost = getQuotedOrModalPost(editor);
    if (quotedOrModalPost) return isStatusPage ? cachePost(key, quotedOrModalPost) : quotedOrModalPost;

    const scope = editor.closest('[role="dialog"]') || document.querySelector('main') || document.body;
    const articles = Array.from(scope.querySelectorAll('article')).slice(-8);
    for (let index = articles.length - 1; index >= 0; index -= 1) {
      const article = articles[index];
      if (!(article.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const text = readPostText(article);
      if (text) return isStatusPage ? cachePost(key, text) : text;
    }
    return '';
  }

  function getQuotedOrModalPost(editor: HTMLElement): string {
    const scope = editor.closest<HTMLElement>('[role="dialog"]') || (location.pathname === '/compose/post' ? document.querySelector('main') || document.body : null);
    if (!scope) return '';

    const textBlocks = Array.from(scope.querySelectorAll<HTMLElement>('[data-testid="tweetText"]'))
      .filter((block) => !block.contains(editor) && !editor.contains(block))
      .map((block) => ({
        text: getText(block),
        isAfter: Boolean(editor.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_FOLLOWING),
        isBefore: Boolean(editor.compareDocumentPosition(block) & Node.DOCUMENT_POSITION_PRECEDING),
      }))
      .filter((item) => isPostText(item.text));

    const after = textBlocks.find((item) => item.isAfter);
    if (after) return after.text;
    const before = [...textBlocks].reverse().find((item) => item.isBefore);
    if (before) return before.text;

    const statusLinks = Array.from(scope.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'))
      .filter((link) => !link.closest('[role="textbox"], [contenteditable="true"], textarea'))
      .map((link) => ({
        link,
        isAfter: Boolean(editor.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING),
        isBefore: Boolean(editor.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_PRECEDING),
      }));

    const candidates = [...statusLinks.filter((item) => item.isAfter), ...statusLinks.filter((item) => item.isBefore).reverse()];
    for (const { link } of candidates) {
      const quoted = findQuotedPostContainer(link, scope, editor);
      const text = quoted ? sanitizePostText(getText(quoted)) : '';
      if (isPostText(text)) return text;
    }
    return '';
  }

  function findQuotedPostContainer(link: HTMLAnchorElement, scope: Element, editor: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = link.parentElement;
    for (let depth = 0; current && current !== scope && depth < 8; depth += 1) {
      const containsEditor = current.contains(editor);
      const hasStatusLink = Boolean(current.querySelector('a[href*="/status/"]'));
      const text = getText(current);
      if (!containsEditor && hasStatusLink && isPostText(text) && text.length <= 1400) return current;
      current = current.parentElement;
    }
    return null;
  }

  function getStatusArticle(): HTMLElement | null {
    return /\/status\/\d+/.test(location.pathname) ? document.querySelector<HTMLElement>('main article') : null;
  }

  function readPostText(article: Element): string {
    const text = Array.from(article.querySelectorAll<HTMLElement>('[data-testid="tweetText"]'))
      .map((block) => getText(block))
      .filter(Boolean)
      .join('\n')
      .trim();
    return text || getText(article).slice(0, 900);
  }

  function sanitizePostText(value: string): string {
    return value
      .replace(/\b(Reply|Repost|Like|View|Post|Cancel)\b/g, ' ')
      .replace(/\b(回复|转帖|喜欢|查看|发布|取消)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 900);
  }

  function isPostText(value: string): boolean {
    const text = value.replace(/\s+/g, ' ').trim();
    if (text.length < 2) return false;
    const normalized = text.toLowerCase();
    return ![
      'post your reply',
      'what is happening',
      'replying to',
      'add photos',
      'show more',
      '发布你的回复',
      '有什么新鲜事',
      '回复给',
      '添加照片',
      '显示更多',
    ].some((placeholder) => normalized === placeholder || normalized.startsWith(`${placeholder} `));
  }

  function getText(element: Element | null): string {
    return (element?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function cachePost(key: string, text: string): string {
    cachedPostKey = key;
    cachedPostText = text;
    return text;
  }

  function insertReply(editor: HTMLElement, reply: string): void {
    const value = reply.trim();
    if (!value) return;

    if (editor instanceof HTMLTextAreaElement || editor instanceof HTMLInputElement) {
      editor.focus();
      setNativeValue(editor, value);
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'insertReplacementText', data: value }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    editor.focus();
    const selected = document.execCommand('selectAll', false);
    const inserted = document.execCommand('insertText', false, value);
    if (!selected || !inserted) {
      const target = editor.querySelector<HTMLElement>('[data-text="true"]') || editor;
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.execCommand('delete', false);
      document.execCommand('insertText', false, value);
    }
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    requestAnimationFrame(() => {
      removeDuplicatedEditorText(editor, value);
      window.setTimeout(() => removeDuplicatedEditorText(editor, value), 0);
    });
  }

  function removeDuplicatedEditorText(editor: HTMLElement, value: string): void {
    const visibleText = Array.from(editor.querySelectorAll('[data-text="true"]')).map((node) => node.textContent || '').join('');
    const rootText = editor.textContent || '';
    if (visibleText !== value || rootText !== `${value}${value}`) return;

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    const strayNodes: Text[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text;
      if (!text.parentElement?.closest('[data-text="true"]') && text.textContent?.trim()) strayNodes.push(text);
    }
    strayNodes.forEach((node) => node.remove());
  }

  function setNativeValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const prototype = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor?.set) descriptor.set.call(input, value);
    else input.value = value;
  }

  function canMessageExtension(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome.runtime?.sendMessage === 'function';
  }

  function isTypingTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && Boolean(target.closest('input, textarea, [contenteditable="true"]'));
  }

  function readStoredPosition(): FloatingPosition | null {
    try {
      const raw = localStorage.getItem(POSITION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as FloatingPosition;
      return Number.isFinite(parsed.left) && Number.isFinite(parsed.top) ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeStoredPosition(position: FloatingPosition): void {
    if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) return;
    try {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    } catch {
      // Position memory is a convenience only; generation must still work without storage.
    }
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value: string): string {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return value.replace(/[&<>'"]/g, (character) => entities[character] || character);
  }

  function nextFrame(): Promise<void> {
    return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  }
})();
