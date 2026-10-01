// The essay banner under the draft's intro (App.js, EssayBanner): which essay it
// opens, and the clip it plays. The clip is the essay's own hero (a web encode:
// H.264, 1280 wide, no audio, +faststart), so the banner and the essay share one
// download. To change it, point `video` and `poster` at new files here; nothing else
// names them. There is no GIF fallback: a browser that cannot play the clip keeps
// the poster.
export const ESSAY_BANNER = {
  slug: 'autobox',
  video: '/writing/autobox/hero.mp4',
  // One frame of the clip (ffmpeg, WebP, under 60 KB), shown before it plays and, with
  // reduced motion asked for, in its place.
  poster: '/writing/autobox/hero-poster.webp',
  width: 1280,
  height: 720,
};
