// The owner's photos on the draft at PREVIEW_PATH. They are not on the front page until
// he approves them there. Each file in public/images/side/ is a web copy, 900px on its
// long edge, with no EXIF or GPS: never add an original. `alt` says what is in the
// frame and nothing about who. Order in a list = order down that margin (or along the
// strip). The side columns are fitted to the page height at runtime (App.js
// SidePhotos), so a column may show fewer than all of its photos; extras go last.

const L = { width: 900, height: 600 };
const P = { width: 600, height: 900 };

export const SIDE_PHOTOS = {
  left: [
    { src: '/images/side/red-canyon-sky.webp', ...P, alt: 'Red sandstone cliffs under a clear blue sky, green brush below' },
    { src: '/images/side/champhorent-sign.webp', ...L, alt: 'Road sign for Champhorent, St Christophe en Oisans, above a 30 speed limit sign' },
    { src: '/images/side/waterfall.webp', ...P, alt: 'A thin waterfall dropping down a dark, mossy rock face' },
    { src: '/images/side/chipmunk.webp', ...L, alt: 'A chipmunk on a stretch of pale sandstone' },
    { src: '/images/side/canyon-pool.webp', ...P, alt: 'Green water at the foot of a curving canyon wall' },
    { src: '/images/side/transamerica-pyramid.webp', ...P, alt: 'A pointed white tower above concrete office blocks against a deep blue sky' },
  ],
  right: [
    { src: '/images/side/alps-peaks-grass.webp', ...L, alt: 'Snow-streaked mountains behind tall dry grass' },
    { src: '/images/side/winding-road.webp', ...P, alt: 'A road winding down through a canyon, seen from above' },
    { src: '/images/side/bird-on-post.webp', ...L, alt: 'A black and orange bird perched on a weathered wooden post' },
    { src: '/images/side/sea-rocks-cliff.webp', ...P, alt: 'Dark rocks in white surf below a steep green slope' },
    { src: '/images/side/cliff-road-forest.webp', ...L, alt: 'A stone-walled road cut into a cliff above a pine forest' },
    { src: '/images/side/canyon-wall.webp', ...P, alt: 'A small tree against a streaked orange canyon wall' },
    { src: '/images/side/night-road.webp', ...L, alt: 'An empty desert road at night under stars' },
    { src: '/images/side/golden-gate-bridge.webp', ...L, alt: 'A red suspension bridge tower beside a bay, green hills across the water' },
  ],
  // Phone only: one row above the name.
  strip: [
    { src: '/images/side/red-canyon-sky.webp', ...P, alt: 'Red sandstone cliffs under a clear blue sky, green brush below' },
    { src: '/images/side/golden-gate-bridge.webp', ...L, alt: 'A red suspension bridge tower beside a bay, green hills across the water' },
    { src: '/images/side/chipmunk.webp', ...L, alt: 'A chipmunk on a stretch of pale sandstone' },
    { src: '/images/side/waterfall.webp', ...P, alt: 'A thin waterfall dropping down a dark, mossy rock face' },
    { src: '/images/side/bird-on-post.webp', ...L, alt: 'A black and orange bird perched on a weathered wooden post' },
    { src: '/images/side/night-road.webp', ...L, alt: 'An empty desert road at night under stars' },
  ],
};
