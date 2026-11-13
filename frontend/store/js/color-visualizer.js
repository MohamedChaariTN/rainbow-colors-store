/* ===== RAINBOW COLORS — COLOR VISUALIZER =====
 * Real interior photographs with accurate wall segmentation masks.
 * Each room ships three layers:
 *   • the untouched photograph,
 *   • a lighting map (the walls normalised, alpha-baked on the wall mask),
 *   • the wall mask used to clip the paint layer.
 * The paint colour is multiplied only inside the mask, so furniture, floors,
 * ceilings, windows, doors, cabinets and decorations are never touched.
 */
(function initColorVisualizer() {
  'use strict';

  if (window.__rcColorVisualizerReady) return;
  window.__rcColorVisualizerReady = true;

  var DEFAULT_ROOM = 'salon';
  var root = document.documentElement;

  var previewStage = document.getElementById('rc-preview-stage');
  var previewBase = document.getElementById('rc-preview-base');
  var previewLight = document.getElementById('rc-preview-light');
  var previewTitle = document.getElementById('rc-preview-title');
  var previewDesc = document.getElementById('rc-preview-desc');
  var chip = document.getElementById('rc-preview-chip');
  var nameOut = document.getElementById('rc-preview-name');
  var hexOut = document.getElementById('rc-preview-hex');
  var captionName = document.getElementById('rc-preview-caption-name');
  var captionHex = document.getElementById('rc-preview-caption-hex');
  var captionRoom = document.getElementById('rc-preview-room');
  var live = document.getElementById('rc-live');
  var resetButton = document.getElementById('rc-reset');
  var paletteRoot = document.getElementById('rc-palette');
  var familiesRoot = document.getElementById('rc-families');
  var searchInput = document.getElementById('rc-palette-search');
  var countOut = document.getElementById('rc-palette-count');
  var totalOut = document.getElementById('rc-palette-total');

  var roomButtons = Array.prototype.slice.call(document.querySelectorAll('.rc-room'));
  if (!previewStage || !roomButtons.length || !paletteRoot) return;

  var library = window.RCColorPalette && window.RCColorPalette.families ? window.RCColorPalette.families : [];
  var swatchButtons = [];
  var familySections = [];

  var state = {
    room: DEFAULT_ROOM,
    roomLabel: '',
    name: '',
    hex: '',
    family: 'all',
    query: ''
  };

  /* ---------- helpers ---------- */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function announce(message) {
    if (live) live.textContent = message;
  }

  function hexToRgb(hex) {
    var value = String(hex || '').replace('#', '').trim();
    if (value.length === 3) {
      value = value.charAt(0) + value.charAt(0) + value.charAt(1) + value.charAt(1) + value.charAt(2) + value.charAt(2);
    }
    if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function rgbToHex(rgb) {
    var channel = function (value) {
      var rounded = Math.max(0, Math.min(255, Math.round(value)));
      return ('0' + rounded.toString(16)).slice(-2).toUpperCase();
    };
    return '#' + channel(rgb.r) + channel(rgb.g) + channel(rgb.b);
  }

  /* amount > 0 lightens towards white, amount < 0 darkens towards black. */
  function shade(hex, amount) {
    var rgb = hexToRgb(hex);
    if (!rgb) return hex;
    var target = amount >= 0 ? 255 : 0;
    var ratio = Math.abs(amount);
    return rgbToHex({
      r: rgb.r + (target - rgb.r) * ratio,
      g: rgb.g + (target - rgb.g) * ratio,
      b: rgb.b + (target - rgb.b) * ratio
    });
  }

  /* ---------- palette rendering ---------- */
  function renderPalette() {
    if (!library.length) return;

    var allButton = el('button', 'rc-family-chip is-active', 'Toutes');
    allButton.type = 'button';
    allButton.setAttribute('data-family', 'all');
    allButton.setAttribute('aria-pressed', 'true');
    familiesRoot.appendChild(allButton);

    library.forEach(function (family) {
      var chipButton = el('button', 'rc-family-chip', family.label);
      chipButton.type = 'button';
      chipButton.setAttribute('data-family', family.id);
      chipButton.setAttribute('aria-pressed', 'false');
      familiesRoot.appendChild(chipButton);

      var section = el('section', 'rc-family');
      section.setAttribute('data-family', family.id);
      section.setAttribute('role', 'group');
      var titleId = 'rc-family-' + family.id;
      section.setAttribute('aria-labelledby', titleId);

      var title = el('h3', 'rc-family__title', family.label);
      title.id = titleId;
      var counter = el('span', 'rc-family__count', String(family.colors.length));
      title.appendChild(counter);
      section.appendChild(title);

      var grid = el('div', 'rc-swatches');
      family.colors.forEach(function (entry) {
        var name = entry[0];
        var hex = entry[1];
        var button = el('button', 'rc-swatch');
        button.type = 'button';
        button.setAttribute('data-name', name);
        button.setAttribute('data-hex', hex);
        button.setAttribute('data-family', family.id);
        button.setAttribute('aria-pressed', 'false');
        button.setAttribute('title', name + ' ' + hex);

        var sample = el('span', 'rc-swatch__chip');
        sample.style.background = hex;

        var label = el('span', 'rc-swatch__label');
        var labelName = el('span', 'rc-swatch__name', name);
        var labelHex = el('span', 'rc-swatch__hex', hex);
        label.appendChild(labelName);
        label.appendChild(labelHex);
        sample.appendChild(label);

        button.appendChild(sample);
        grid.appendChild(button);
        swatchButtons.push(button);
      });
      section.appendChild(grid);
      paletteRoot.appendChild(section);
      familySections.push(section);
    });

    if (totalOut) totalOut.textContent = String(swatchButtons.length);
    updateCount();
  }

  function visibleSwatches() {
    return swatchButtons.filter(function (button) {
      return !button.hidden;
    });
  }

  function updateCount() {
    var visible = visibleSwatches().length;
    if (countOut) {
      countOut.textContent = visible === swatchButtons.length
        ? swatchButtons.length + ' teintes'
        : visible + ' teinte' + (visible > 1 ? 's' : '') + ' sur ' + swatchButtons.length;
    }
  }

  function applyFilters() {
    var query = state.query.trim().toLowerCase();
    swatchButtons.forEach(function (button) {
      var familyMatch = state.family === 'all' || button.getAttribute('data-family') === state.family;
      var textMatch = !query
        || (button.getAttribute('data-name') || '').toLowerCase().indexOf(query) > -1
        || (button.getAttribute('data-hex') || '').toLowerCase().indexOf(query) > -1;
      button.hidden = !(familyMatch && textMatch);
    });

    familySections.forEach(function (section) {
      var shown = Array.prototype.slice.call(section.querySelectorAll('.rc-swatch')).some(function (button) {
        return !button.hidden;
      });
      section.hidden = !shown;
    });

    updateCount();
  }

  function selectFamily(familyId) {
    state.family = familyId;
    Array.prototype.slice.call(familiesRoot.querySelectorAll('.rc-family-chip')).forEach(function (chipButton) {
      var isActive = chipButton.getAttribute('data-family') === familyId;
      chipButton.classList.toggle('is-active', isActive);
      chipButton.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    applyFilters();
  }

  /* ---------- room handling ---------- */
  function roomById(id) {
    for (var i = 0; i < roomButtons.length; i++) {
      if (roomButtons[i].getAttribute('data-room') === id) return roomButtons[i];
    }
    return null;
  }

  /* The mask is applied straight on the paint layer with an absolute URL so it
     never resolves against the stylesheet location. */
  function applyMask(photoElement, maskPath) {
    if (!photoElement || !maskPath) return;
    var paint = photoElement.querySelector('.rc-photo__paint');
    if (!paint) return;
    var url = new URL(maskPath, document.baseURI).href;
    paint.style.webkitMaskImage = 'url("' + url + '")';
    paint.style.maskImage = 'url("' + url + '")';
    paint.style.webkitMaskSize = '100% 100%';
    paint.style.maskSize = '100% 100%';
    paint.style.webkitMaskRepeat = 'no-repeat';
    paint.style.maskRepeat = 'no-repeat';
  }

  function applyRoom(id) {
    var button = roomById(id) || roomById(DEFAULT_ROOM);
    if (!button) return;

    state.room = button.getAttribute('data-room');
    state.roomLabel = button.getAttribute('data-label') || '';

    var scene = button.getAttribute('data-scene');
    var mask = button.getAttribute('data-mask');
    var light = button.getAttribute('data-light');

    if (previewBase && scene) previewBase.setAttribute('src', scene);
    if (previewLight && light) previewLight.setAttribute('src', light);
    if (previewStage && mask) {
      previewStage.style.setProperty('--rc-photo-mask', 'url("' + new URL(mask, document.baseURI).href + '")');
      applyMask(previewStage, mask);
    }

    roomButtons.forEach(function (item) {
      var isActive = item === button;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (captionRoom) captionRoom.textContent = state.roomLabel;
    updateCopy();
  }

  /* Every room thumbnail carries its own mask so the preview stays consistent. */
  function applyThumbMasks() {
    roomButtons.forEach(function (button) {
      var photo = button.querySelector('.rc-photo');
      applyMask(photo, button.getAttribute('data-mask'));
    });
  }

  /* ---------- colour handling ---------- */
  function paintWalls(hex) {
    root.style.setProperty('--rc-paint', hex);
    root.classList.add('rc-paint-on');
  }

  function clearPaint() {
    root.style.setProperty('--rc-paint', 'transparent');
    root.classList.remove('rc-paint-on');
  }

  function updateCopy() {
    var hasColor = !!state.hex;
    var title = state.roomLabel + (hasColor ? ' avec les murs peints en ' + state.name : ' — photo originale');
    var desc = hasColor
      ? 'Aperçu de la pièce ' + state.roomLabel + ' où les murs sont peints en ' + state.name +
        ' (' + state.hex + '). Le mobilier, le sol et la lumière restent inchangés.'
      : 'Aperçu de la pièce ' + state.roomLabel + ' dans sa version d\'origine. Le mobilier, le sol et la lumière sont intacts.';

    if (previewTitle) previewTitle.textContent = title;
    if (previewDesc) previewDesc.textContent = desc;
    if (nameOut) nameOut.textContent = hasColor ? state.name : 'Photo originale';
    if (hexOut) hexOut.textContent = hasColor ? state.hex : 'Aucune teinte appliquée';
    if (captionName) captionName.textContent = hasColor ? state.name : 'Photo originale';
    if (captionHex) captionHex.textContent = hasColor ? state.hex : '';
  }

  function applyColor(name, hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return false;
    state.name = name || '';
    state.hex = String(hex).toUpperCase();

    swatchButtons.forEach(function (button) {
      var isActive = (button.getAttribute('data-hex') || '').toUpperCase() === state.hex;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    paintWalls(state.hex);
    if (chip) chip.style.background = state.hex;
    updateCopy();
    announce(state.roomLabel + ' — murs peints en ' + state.name + ' (' + state.hex + ').');
    return true;
  }

  function clearColor() {
    state.name = '';
    state.hex = '';
    swatchButtons.forEach(function (button) {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
    });
    clearPaint();
    if (chip) chip.style.background = '#8a7a63';
    updateCopy();
  }

  function reset() {
    applyRoom(DEFAULT_ROOM);
    clearColor();
    announce('Visualiseur réinitialisé : photo originale.');
  }

  function selectColorByHex(hex) {
    var target = String(hex || '').toUpperCase();
    for (var i = 0; i < swatchButtons.length; i++) {
      if ((swatchButtons[i].getAttribute('data-hex') || '').toUpperCase() === target) {
        applyColor(swatchButtons[i].getAttribute('data-name'), swatchButtons[i].getAttribute('data-hex'));
        return true;
      }
    }
    return false;
  }

  /* ---------- events ---------- */
  roomButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      applyRoom(button.getAttribute('data-room'));
      announce(state.hex
        ? state.roomLabel + ' — murs peints en ' + state.name + ' (' + state.hex + ').'
        : state.roomLabel + ' sélectionnée.');
    });
  });

  familiesRoot.addEventListener('click', function (event) {
    var chipButton = event.target.closest('.rc-family-chip');
    if (!chipButton) return;
    selectFamily(chipButton.getAttribute('data-family'));
  });

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      state.query = searchInput.value || '';
      applyFilters();
    });
  }

  paletteRoot.addEventListener('click', function (event) {
    var swatch = event.target.closest('.rc-swatch');
    if (!swatch) return;
    applyColor(swatch.getAttribute('data-name'), swatch.getAttribute('data-hex'));
  });

  paletteRoot.addEventListener('keydown', function (event) {
    var swatch = event.target.closest('.rc-swatch');
    if (!swatch) return;
    var visible = visibleSwatches();
    var index = visible.indexOf(swatch);
    if (index < 0) return;
    var next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % visible.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + visible.length) % visible.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = visible.length - 1;
    if (next < 0) return;
    event.preventDefault();
    visible[next].focus();
    applyColor(visible[next].getAttribute('data-name'), visible[next].getAttribute('data-hex'));
  });

  if (resetButton) {
    resetButton.addEventListener('click', reset);
  }

  /* ---------- init ---------- */
  renderPalette();

  /* Safety net: the scroll-reveal engine hides any element that has not been
     revealed yet. The palette is much taller than the viewport, so it could
     never satisfy the reveal threshold on some screens and would stay
     invisible (but still clickable). The visualiser is always shown. */
  Array.prototype.slice.call(document.querySelectorAll('.rc-color-step, .rc-color-preview')).forEach(function (node) {
    node.classList.remove('rc-reveal');
    node.classList.add('rc-visible');
  });

  applyThumbMasks();
  applyRoom(DEFAULT_ROOM);
  clearColor();

  /* Small API used by automated checks. */
  window.RCColorVisualizer = {
    getState: function () {
      return {
        room: state.room,
        roomLabel: state.roomLabel,
        name: state.name,
        hex: state.hex,
        family: state.family,
        query: state.query,
        paint: getComputedStyle(root).getPropertyValue('--rc-paint').trim(),
        total: swatchButtons.length,
        visible: visibleSwatches().length,
        theme: root.getAttribute('data-theme')
      };
    },
    selectRoom: function (id) {
      applyRoom(id);
      return state.room;
    },
    selectColor: function (hex) {
      return selectColorByHex(hex);
    },
    selectFamily: selectFamily,
    search: function (query) {
      if (searchInput) searchInput.value = query;
      state.query = query || '';
      applyFilters();
      return visibleSwatches().length;
    },
    reset: reset
  };
})();
