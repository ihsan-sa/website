// Click-to-enlarge for essay figures. A figure's image sits in an
// <a class="wr-figure__zoom" href="..."> (Writing.js and scripts/build-static.js
// both write it); a click, Enter or Space on it opens an overlay that plays its
// data-video full size, or shows the image itself enlarged when there is none.
// The overlay closes on Escape, the × button or a click on the backdrop, and
// gives focus back to the figure. With this script absent the link still works:
// it opens the video or image on its own.
//
// An essay's clips are animated WebP, which autoplays everywhere (a <picture> swaps in the
// poster under reduced motion); the overlay plays the .mp4 with controls, on the
// frame the figure shows (img.currentSrc: the clip, or the poster).
//
// One copy serves both kinds of essay page: Writing.js imports it, and
// build-static.js inlines this file in a <script>, so it holds no import or
// export and listens on the document rather than on any one element. Its look
// is the wr-zoom rules in Writing.css.
(function () {
  if (typeof document === 'undefined' || window.wrZoom) return;
  var open = null; // { root, trigger, overflow } while the overlay is up

  function close() {
    if (!open) return;
    var o = open;
    open = null;
    o.root.remove();
    document.documentElement.style.overflow = o.overflow;
    if (o.trigger.isConnected) o.trigger.focus();
  }

  function show(trigger) {
    close();
    var img = trigger.querySelector('img');
    var label = img ? img.alt : '';
    var video = trigger.getAttribute('data-video');
    var root = document.createElement('div');
    root.className = 'wr-zoom';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', label);
    var shut = document.createElement('button');
    shut.type = 'button';
    shut.className = 'wr-zoom__close';
    shut.setAttribute('aria-label', 'Close');
    shut.textContent = '×';
    shut.addEventListener('click', close);
    var media;
    if (video) {
      // Created only now, so the page downloads no video until someone asks for one.
      media = document.createElement('video');
      media.muted = true;
      media.defaultMuted = true;
      media.setAttribute('muted', '');
      media.setAttribute('playsinline', '');
      media.autoplay = true;
      media.loop = true;
      media.controls = true;
      media.preload = 'metadata';
      if (img) media.poster = img.currentSrc || img.src; // the GIF or poster holds the frame while it loads
      media.setAttribute('aria-label', label);
      media.src = video;
    } else {
      media = document.createElement('img');
      media.src = img ? img.currentSrc || img.src : trigger.href;
      media.alt = label;
    }
    media.className = 'wr-zoom__media';
    // The figure's own shape sizes the box at once, before the video has loaded: the
    // image's natural size, or its width and height while it is still loading.
    var w = img ? img.naturalWidth || Number(img.getAttribute('width')) : 0;
    var h = img ? img.naturalHeight || Number(img.getAttribute('height')) : 0;
    if (w && h) {
      media.classList.add('wr-zoom__media--sized');
      media.style.setProperty('--wr-zoom-ar', w + ' / ' + h);
    }
    root.addEventListener('click', function (e) {
      if (e.target === root) close();
    });
    root.appendChild(media);
    root.appendChild(shut);
    open = { root: root, trigger: trigger, overflow: document.documentElement.style.overflow };
    document.documentElement.style.overflow = 'hidden';
    document.body.appendChild(root);
    shut.focus();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.wr-figure__zoom');
    // A modified click keeps the link's own meaning: the video in a new tab.
    if (!t || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    show(t);
  });

  document.addEventListener('keydown', function (e) {
    if (open) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        // Focus stays inside: the × and the video's controls.
        var stops = open.root.querySelectorAll('button, video');
        var first = stops[0];
        var last = stops[stops.length - 1];
        var at = document.activeElement;
        if (!open.root.contains(at) || (e.shiftKey ? at === first : at === last)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
      return;
    }
    // Enter on a link clicks it already; Space would scroll the page.
    var t = e.key === ' ' && e.target.closest && e.target.closest('.wr-figure__zoom');
    if (!t) return;
    e.preventDefault();
    show(t);
  });

  window.wrZoom = { show: show, close: close };
})();
