# Counted numbers on the site

The AI rows' lines (autobox's "over 1,100 PRs across 18 repos", the Hive's PRs, hwde's
boards, lesson-builder's lessons and the chip flow's circuits) can show numbers the box
counts instead of ones typed by hand. The text keeps a placeholder, and the build fills it from
`src/stats.json`. The page stays plain HTML with no script, and nothing on it connects to
the box.

## Writing the placeholder

| Placeholder | Shows | Example |
|---|---|---|
| `{autobox.prs}` | merged PRs not made by the Hive, rounded down to the hundred below | `1,300` |
| `{autobox.repos}` | repos with at least one of those, exact | `24` |
| `{hive.prs}` | merged PRs the Hive made (a `dispatch/` branch), rounded the same way | `700` |
| `{hive.repos}` | repos with at least one of those, exact | `17` |
| `{hive.day}` | the day the shown numbers were last counted, as the page writes dates | `22 October 2026` |
| `{hwde.boards}` | products in `ihsan-sa/boards`' `register.yaml` | `28` |
| `{lessons.count}` | lessons in `ihsan-sa/lessons`, the folders under `lessons/<course>/claude_lessons/` | `57` |
| `{lessons.topics}` | courses with at least one lesson | `14` |
| `{chip.circuits}` | designs in `ihsan-sa/chip-flow`, the folders under `corpus/<skill>/` | `13` |

So the line is written `over {autobox.prs} PRs across {autobox.repos} repos`.

- **In the library's Markdown** (`content/site-text.md`), write `{autobox.prs}` as it is;
  a pull writes it back unchanged.
- **In the LaTeX content PDF**, type `\{autobox.prs\}`, which the PDF prints as
  `{autobox.prs}`. A pull (`npm run content-pdf -- pull <number>`) writes it into
  `src/content.json` unchanged.
- **In `src/content.json`**, write `{autobox.prs}` as it is.

Both builds fill it: `src/App.js` for the React page and `scripts/build-static.js` for the
static pages, through `src/fillStats.js`. A placeholder that `src/stats.json` doesn't have,
such as a typo, fails the build instead of showing braces on the site.

## Where the numbers come from

`node scripts/stats.js count` prints the counts and writes nothing. It asks GitHub for
every repo the box's account owns and adds up each one's merged pull requests. In the same
pass it searches each repo for the merged PRs from a `dispatch/` branch, which every Hive run
pushes: those are the Hive's, and autobox's count leaves them out, so the two rows never count
one PR twice. One more query reads the three projects' files the table names, at their
default branch.

The lander's `queue.log` would be the box's own record, but it only starts on 2026-09-01,
so it misses everything merged before the lander ran: on 2026-09-30 it had 787 PRs across
15 repos, while GitHub had 1,394 across 24. Only GitHub could ever have given the line's
"1,100 across 18".

`prs` is rounded down to the hundred strictly below the count, because the line says
"over". So 1,101 to 1,199 read `1,100`, and exactly 1,100 reads `1,000`. `merged` holds
the exact count and `asOf` the day the shown text last changed; `hive.day` is that day
written out. The other counts are exact.

## Refreshing it

`node scripts/stats.js update` counts, then compares the shown numbers (every one but
`merged`, `asOf` and `hive.day`) with `src/stats.json` on `origin/main`. When they match it prints `unchanged` and stops, so a
quiet night makes no commit. When they differ it pushes a branch `stats/<date>` that
changes only `src/stats.json`, opens a PR and queues it with `cc-land queue website <n>`,
so the usual gates and review land it. While an earlier `stats/` PR is still open it does
nothing.

### The nightly run

A systemd user timer, `website-stats.timer`, runs `node scripts/stats.js update` in
`~/dev/website` every night at 04:15 UTC. The owner approved it on 2026-09-30. The same
service then runs `node scripts/clips.js update`, which brings in new clips from the video
agent (docs/clips.md). Its two units are:

`~/.config/systemd/user/website-stats.service`

```
[Unit]
Description=website: refresh the autobox line's counted numbers

[Service]
Type=oneshot
WorkingDirectory=%h/dev/website
Environment=PATH=%h/bin:%h/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/env node scripts/stats.js update
ExecStart=/usr/bin/env node scripts/clips.js update
TimeoutStartSec=1200
```

`~/.config/systemd/user/website-stats.timer`

```
[Unit]
Description=website: refresh the autobox line's counted numbers nightly

[Timer]
OnCalendar=*-*-* 04:15:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
```

`systemctl --user list-timers website-stats.timer` shows the next run, and
`journalctl --user -u website-stats.service` shows what the last one did. Running
`node scripts/stats.js update` in `~/dev/website` by hand does the same thing once.
