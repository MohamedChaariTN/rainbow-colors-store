/* Rainbow Colors — Light / Dark / System theme controller.
   Loaded synchronously in <head> so the resolved theme is applied before
   the stylesheet paints. The visible selector is added on DOMContentLoaded. */
(function () {
  'use strict';

  var STORAGE_KEY = 'rc_theme_preference';
  var VALID_PREFERENCES = { light: true, dark: true, system: true };
  var root = document.documentElement;
  var systemQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
  var currentPreference = readPreference();

  function normalizePreference(value) {
    return VALID_PREFERENCES[value] ? value : 'system';
  }

  function readPreference() {
    try {
      return normalizePreference(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return 'system';
    }
  }

  function resolvedTheme(preference) {
    if (preference === 'system') {
      return systemQuery && systemQuery.matches ? 'dark' : 'light';
    }
    return preference;
  }

  function updateThemeColor(theme) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', theme === 'dark' ? '#080808' : '#f7f3ea');
  }

  function updateControls() {
    var options = document.querySelectorAll('.rc-theme-option[data-theme-value]');
    for (var i = 0; i < options.length; i += 1) {
      var option = options[i];
      var isActive = option.getAttribute('data-theme-value') === currentPreference;
      option.setAttribute('aria-pressed', String(isActive));
      option.classList.toggle('is-active', isActive);
    }
  }

  function applyPreference(preference, persist) {
    currentPreference = normalizePreference(preference);
    var theme = resolvedTheme(currentPreference);

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-preference', currentPreference);
    root.style.colorScheme = theme;
    /* Match the canvas immediately, even before the stylesheet finishes. */
    root.style.backgroundColor = theme === 'dark' ? '#0a0a0a' : '#f7f3ea';
    root.style.color = theme === 'dark' ? '#eee7d6' : '#2f281e';
    updateThemeColor(theme);
    updateControls();

    if (persist) {
      try {
        window.localStorage.setItem(STORAGE_KEY, currentPreference);
      } catch (error) {
        /* A blocked storage API should never break the page. */
      }
    }
  }

  function setPreference(preference) {
    applyPreference(preference, true);
  }

  function sunIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>';
  }

  function monitorIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><rect x="2.5" y="3.5" width="19" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path></svg>';
  }

  function moonIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" focusable="false"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"></path></svg>';
  }

  function createSwitcher(modifier) {
    var switcher = document.createElement('div');
    switcher.className = 'rc-theme-switcher ' + modifier;
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'Choix du thème');
    switcher.innerHTML = [
      '<span class="rc-theme-switcher__label" aria-hidden="true">Apparence</span>',
      '<span class="rc-theme-switcher__options">',
      '<button type="button" class="rc-theme-option" data-theme-value="light" aria-label="Thème clair" title="Thème clair" aria-pressed="false">',
      sunIcon(),
      '<span class="rc-theme-option__text">Clair</span>',
      '</button>',
      '<button type="button" class="rc-theme-option" data-theme-value="system" aria-label="Thème système, suit le réglage de l’appareil" title="Thème système" aria-pressed="false">',
      monitorIcon(),
      '<span class="rc-theme-option__text">Système</span>',
      '</button>',
      '<button type="button" class="rc-theme-option" data-theme-value="dark" aria-label="Thème sombre" title="Thème sombre" aria-pressed="false">',
      moonIcon(),
      '<span class="rc-theme-option__text">Sombre</span>',
      '</button>',
      '</span>'
    ].join('');
    return switcher;
  }

  function mountSelector() {
    if (document.querySelector('.rc-theme-switcher')) {
      updateControls();
      return;
    }

    var actions = document.querySelector('.header-actions');
    var mobileMenu = document.querySelector('.mobile-menu');

    if (actions) {
      actions.insertBefore(createSwitcher('rc-theme-switcher--header'), actions.firstElementChild || null);
    }

    if (mobileMenu) {
      mobileMenu.appendChild(createSwitcher('rc-theme-switcher--mobile'));
    }

    if (!actions && !mobileMenu) {
      var dock = document.createElement('div');
      dock.className = 'rc-theme-dock';
      dock.appendChild(createSwitcher('rc-theme-switcher--standalone'));
      document.body.appendChild(dock);
      document.body.classList.add('rc-theme-standalone');
    }

    updateControls();
  }

  document.addEventListener('click', function (event) {
    var option = event.target.closest('.rc-theme-option[data-theme-value]');
    if (!option) return;
    setPreference(option.getAttribute('data-theme-value'));
  });

  if (systemQuery) {
    var handleSystemChange = function () {
      if (currentPreference === 'system') applyPreference('system', false);
    };
    if (typeof systemQuery.addEventListener === 'function') {
      systemQuery.addEventListener('change', handleSystemChange);
    } else if (typeof systemQuery.addListener === 'function') {
      systemQuery.addListener(handleSystemChange);
    }
  }

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY) return;
    applyPreference(normalizePreference(event.newValue), false);
  });

  window.RCTheme = {
    setPreference: setPreference,
    getPreference: function () { return currentPreference; },
    getResolvedTheme: function () { return resolvedTheme(currentPreference); }
  };

  /* Apply the saved/system theme before the browser paints the page. */
  applyPreference(currentPreference, false);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountSelector);
  } else {
    mountSelector();
  }
})();
