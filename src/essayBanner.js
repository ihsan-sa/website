// The essay banners under the intro (App.js, EssayBanner, and scripts/build-static.js), in
// order: which essay each opens, the site-text key under `essays` that labels it, and the
// clip it plays, if any. A banner with no `gif` is text only. A slug that is not one of the
// page's essays is skipped. A clip is the essay's own hero clip (720 wide, a 14 s loop of
// the film's signature shot), so the banner and the essay share one download. An animated
// WebP rather than the .mp4 because it is an image, so it autoplays everywhere, Safari's
// Low Power Mode included (Safari has played it since 14), which blocks muted video
// autoplay. To change it, point `gif` and `poster` at new files here; nothing else names
// them. CommonJS, like fillStats.js, so the static build can require it.
const ESSAY_BANNERS = [
  { slug: 'the-hive', label: 'banner' },
  {
    slug: 'autobox',
    label: 'bannerEarlier',
    gif: '/writing/autobox/hero.webp',
    // One frame of the clip (ffmpeg, WebP, under 60 KB), shown in the clip's place when
    // reduced motion is asked for, so the clip never loads.
    poster: '/writing/autobox/hero-poster.webp',
    width: 720,
    height: 405,
  },
];

module.exports = { ESSAY_BANNERS };
