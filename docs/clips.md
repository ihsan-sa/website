# Clips from the video agent

The site's animated clips (the essay's figures, the front page's essay banner and the AI-work
rows) come from the video agent. It puts each finished clip in one drop folder, and every night
`scripts/clips.js` turns whatever is new there into the site's files and opens a PR for it. No
website session has to convert anything by hand.

## The drop (for the video agent)

Put finished clips in `~/.cc/state/website/clips-gif/`, named after the slot they fill:

| File | Becomes |
|---|---|
| `<name>.gif` | the site's animated WebP, converted for you |
| `<name>.mp4` (optional) | the video the clip opens to, copied as it is (H.264, faststart, up to 25 MB) |
| `<name>-poster.webp` (optional) | the still shown when motion is turned off; without one, the GIF's first frame is used |

The names in use are `hero` (the 14 s loop, 720 px), `board` (the hwde boards film, 640 px), `library`, `lessons` (640 px) and
`library-6fps`, `lessons-6fps` (the front page's lighter cuts). Keep a GIF to the size and frame
rate in `~/.cc/state/iiks1/video-max-quality/web/GIF-SETTINGS.txt`; the WebP comes out at about
half the GIF's size and should stay under about 2.5 MB. Overwrite a file to replace a clip, and
write it whole (copy to a temporary name, then `mv`), because a half-written GIF fails the
conversion. A new name that `src/clips.json` doesn't map, such as `newname.gif`, is reported and
left alone until a website session adds a line for it there. `hero-full.gif` is ignored.

## How it decides and converts

`src/clips.json` maps each name to the site's files and records, under `from`, the sha256 of the
drop file each was made from. A drop file whose hash differs is newer. Hashes, not times, decide
it, because a git checkout resets every file's time.

A GIF becomes an animated WebP with `ffmpeg -c:v libwebp -lossless 0 -q:v 70
-compression_level 6 -loop 0`, as the hand-made ones were. When the result is over `maxBytes`, it
tries again at quality 60, 50 and 40. The conversion fails if the WebP's frame count or size,
read with PIL, differs from the GIF's. When a clip's size changes, the width and height beside its
URL in `src/content.json` and `src/essayBanner.js` change too. The essay's markdown names only the
file, so it needs nothing.

## Running it

- `node scripts/clips.js check` prints each newer drop file, or `nothing newer`, and writes nothing.
- `node scripts/clips.js update` does the same check against `origin/main`'s `src/clips.json`.
  When something is newer it converts it in a worktree off `origin/main`, pushes a branch
  `clips/<date>`, opens a PR and queues it on the lander, so the usual gates and review land it.
  While an earlier `clips/` PR is open it waits.
- `--drop DIR` reads another folder, and `update --dry-run` builds the commit off `HEAD`, prints
  its diff and pushes nothing.

It runs every night as the second `ExecStart` of `website-stats.service`, after the stats
refresh (docs/stats.md has the unit). A path-triggered unit would react sooner, but it would fire
while the agent is still copying and open one PR per file, so the nightly run batches them instead.
