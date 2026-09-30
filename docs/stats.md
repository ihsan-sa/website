# Counted numbers on the site

The autobox line ("over 1,100 PRs across 18 repos") can show numbers the box counts
instead of ones typed by hand. The text keeps a placeholder, and the build fills it from
`src/stats.json`. The page stays plain HTML with no script, and nothing on it connects to
the box.

## Writing the placeholder

| Placeholder | Shows | Example |
|---|---|---|
| `{autobox.prs}` | merged PRs, rounded down to the hundred below | `1,300` |
| `{autobox.repos}` | repos with at least one merged PR, exact | `24` |

So the line is written `over {autobox.prs} PRs across {autobox.repos} repos`.

- **In the content PDF**, type `\{autobox.prs\}`, which the PDF prints as
  `{autobox.prs}`. A pull (`npm run content-pdf -- pull <number>`) writes it into
  `src/content.json` unchanged.
- **In `src/content.json`**, write `{autobox.prs}` as it is.

Both builds fill it: `src/App.js` for the React page and `scripts/build-static.js` for the
static pages, through `src/fillStats.js`. A placeholder that `src/stats.json` doesn't have,
such as a typo, fails the build instead of showing braces on the site.

## Where the numbers come from

`node scripts/stats.js count` prints the count and writes nothing. It asks GitHub for
every repo the box's account owns and adds up each one's merged pull requests.

The lander's `queue.log` would be the box's own record, but it only starts on 2026-09-01,
so it misses everything merged before the lander ran: on 2026-09-30 it had 787 PRs across
15 repos, while GitHub had 1,394 across 24. Only GitHub could ever have given the line's
"1,100 across 18".

`prs` is rounded down to the hundred strictly below the count, because the line says
"over". So 1,101 to 1,199 read `1,100`, and exactly 1,100 reads `1,000`. `merged` holds
the exact count and `asOf` the day the rounded text last changed.

## Refreshing it

`node scripts/stats.js update` counts, then compares the rounded text with
`src/stats.json` on `origin/main`. When they match it prints `unchanged` and stops, so a
quiet night makes no commit. When they differ it pushes a branch `stats/<date>` that
changes only `src/stats.json`, opens a PR and queues it with `cc-land queue website <n>`,
so the usual gates and review land it. While an earlier `stats/` PR is still open it does
nothing.

### The nightly run is not installed

Every scheduled job on the box is a systemd user timer that runs one fixed command, and
none of them runs a project's own script. So a nightly run needs a new unit, and
installing one needs the owner's approval. These two files would do it, once approved:

`~/.config/systemd/user/website-stats.service`

```
[Unit]
Description=website: refresh the autobox line's counted numbers

[Service]
Type=oneshot
WorkingDirectory=%h/dev/website
Environment=PATH=%h/bin:%h/.local/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/env node scripts/stats.js update
TimeoutStartSec=600
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

Then `systemctl --user daemon-reload && systemctl --user enable --now website-stats.timer`.
Until then, running `node scripts/stats.js update` in `~/dev/website` by hand does the
same thing once.
