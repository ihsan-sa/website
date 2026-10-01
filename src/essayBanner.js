// The essay banner under the draft's intro (App.js, EssayBanner): which essay it
// opens, and the clip it plays. The clip is the essay's own hero for now; to put
// the real Autobox video in its place, point `video` (and `poster`, one frame of
// it as WebP) at the new files here. Nothing else names them.
export const ESSAY_BANNER = {
  slug: 'autobox',
  video: '/writing/autobox/hero.mp4',
  // Shown by a browser that cannot play the video.
  gif: '/writing/autobox/hero.gif',
  // One frame of the clip (ffmpeg, WebP), shown before it plays and, with
  // reduced motion asked for, in its place.
  poster: '/images/banner/autobox-poster.webp',
  width: 1920,
  height: 1080,
};
