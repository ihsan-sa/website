// The essay banners under the intro (App.js, EssayBanner, and scripts/build-static.js), in
// order: which essay each opens, the site-text key under `essays` that labels it, and the
// clip it plays, if any. A banner with no `gif` is text only. A slug that is not one of the
// page's essays is skipped. A clip is an animated WebP rather than an .mp4 because it is an
// image, so it autoplays everywhere, Safari's Low Power Mode included (Safari has played it
// since 14), which blocks muted video autoplay. A still image works the same way, with itself
// as its poster: The Hive's is its diagram in notation (public/writing/the-hive/hive.tex
// draws it). To change it, point `gif` and `poster` at new files here; nothing else names
// them. CommonJS, like fillStats.js, so the static build can require it.
const ESSAY_BANNERS = [
  {
    slug: 'the-hive',
    label: 'banner',
    gif: '/writing/the-hive/hive-thumb.svg',
    poster: '/writing/the-hive/hive-thumb.svg',
    width: 368,
    height: 207,
  },
];

module.exports = { ESSAY_BANNERS };
