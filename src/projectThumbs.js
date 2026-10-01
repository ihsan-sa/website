// Small web copies of the project tiles' images, for the draft at PREVIEW_PATH. The
// originals in content.json (up to 5,569 px and 3.2 MB) fill a tile about 200 px
// wide; each copy here is WebP, at most 600 px wide, so a phone at 3x stays sharp.
// The front page keeps the originals until the owner approves the draft. Make a new
// one with: ffmpeg -i <original> -vf scale=600:-2 -c:v libwebp -quality 78 <copy>.webp

export const PROJECT_THUMBS = {
  '/images/ionic.jpg': { src: '/images/thumbs/ionic.webp', width: 600, height: 506 },
  '/images/dcdc3500KHz.png': { src: '/images/thumbs/dcdc3500KHz.webp', width: 394, height: 186 },
  '/images/solverImage1.png': { src: '/images/thumbs/solverImage1.webp', width: 600, height: 448 },
  '/images/usb_c_trigger_board.jpg': { src: '/images/thumbs/usb_c_trigger_board.webp', width: 600, height: 660 },
  '/images/quad_high_power_floodlight.jpg': { src: '/images/thumbs/quad_high_power_floodlight.webp', width: 600, height: 328 },
  '/images/usb_business_card.jpg': { src: '/images/thumbs/usb_business_card.webp', width: 600, height: 366 },
};
