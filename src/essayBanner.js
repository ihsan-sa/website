// The essay banner under the draft's intro (App.js, EssayBanner): which essay it
// opens, and the clip it plays. The clip is the essay's own hero GIF (720 wide, a
// 14 s loop of the film's signature shot), so the banner and the essay share one
// download. A GIF rather than the .mp4 because a GIF autoplays everywhere, Safari's
// Low Power Mode included, which blocks muted video autoplay. To change it, point
// `gif` and `poster` at new files here; nothing else names them.
export const ESSAY_BANNER = {
  slug: 'autobox',
  gif: '/writing/autobox/hero.gif',
  // One frame of the clip (ffmpeg, WebP, under 60 KB), shown in the GIF's place when
  // reduced motion is asked for, so the GIF never loads.
  poster: '/writing/autobox/hero-poster.webp',
  width: 720,
  height: 405,
};
