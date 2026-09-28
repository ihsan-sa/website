---
title: Talking to my server all day
date: 2026-09-28
summary: One computer at home runs my projects, coursework and job search through Claude Code agents, and I steer it from Slack.
standfirst: One computer at home runs my projects, my coursework and my job search through Claude Code agents, and I steer it from Slack.
draft: true
---
I get asked "are you working? why are you on slack?" Well i'm not, I'm just talking to my 80+ claude code sessions which run on my server via Autobox, my orchestration system.

That's the short version. This post is the longer one: what the server is, what it runs, and what I actually use it for.

## What it is

autobox is one Linux machine at home that runs Claude Code sessions all day. It has no screen. I give it work from Slack, usually from my phone. Each project has a planning session, and that session hands pieces of work to agents that each get their own git worktree, so they can't overwrite each other. When an agent finishes, its change goes up as a pull request and waits to be landed.

From 26 August to 27 September it landed about 810 pull requests, and every one was written by an agent.[^count] Much of what it builds is its own tooling. The general part of it is public as ihsan-sa/autobox.

![From my phone to the public repo: I talk to one planning session per project, it hands work to agents that each have their own copy of the code, a rule table checks every command they run, and the lander is the only way a change reaches the server's code. What gets published to GitHub passes an identity check first.](autobox-arch.svg)

There is no manager agent. Creating worktrees, opening pull requests, keeping the task board and sending notifications are all scripts, and they cost no tokens. The model does the parts that need judgement: planning, writing and reviewing. That also keeps each session's context small, which on this server is most of what the work costs.

Starting a piece of work is one line. This one opens a track in my career project and hands it an instruction:

```sh
cc career outreach --go "Draft the note to the infra team and put it in the outreach doc"
```

## The lander

Nobody reads these changes before they merge, so the tests have to run on exactly what will exist afterwards. The lander is the only thing on the server that merges. It combines the change with the latest main, runs the tests on that merged result rather than on the branch, and merges only when the suite passes and a model review of the diff passes too. If either one is missing or fails, the change stays open. After a merge it restarts only the parts that changed.

> Merge queues at GitHub and GitLab already test the merged result for people's code; what I did was apply the same rule to work no person reads first.

![Every change reaches main the same way: a planning session splits the work, an agent builds it in its own copy on its own branch, the lander tests the merged result, and a change that fails is sent back to the agent with the reason.](autobox-loop.svg)

## The hook and the shared library

Before an agent runs a command, a hook checks it against a permission table. When I changed one rule, I replayed 14,663 commands the agents had really run through the old and the new rules, and the change newly blocked 270 of them, 1.8%. That is a false-alarm number. It tells me what the rule would cost before it shipped. I don't yet have a number for how many harmful commands the hook stops.

Every agent also reads one shared library of the server's journals, decisions and landing records before it states a fact about the server. That lets a session stay small: when it gets long, it writes a journal and hands over to a fresh one, and the new session picks up where the last one stopped without carrying its whole history.

## How I build these

In everything I build, the model's judgement does the planning, the design and the review, and deterministic scripts and gates sit between those steps. I call it soft, hard, soft. On autobox, scripts do the bookkeeping, a permission hook decides what an agent may run and the lander decides what merges. In hwde, my circuit board harness, subagents design the board and 57 scripts check it.

I also keep the harnesses thin: glue over Claude Code's own runtime, with short prompts and few fixed steps. Heavy prompts and fixed procedures get written around what today's model gets wrong, and they get in the way of the next one. I want a better model to make my systems better without a rewrite, so the server's own code is meant to shrink as the platform takes over what it does.

When something goes wrong, the session writes a record: what failed, and who or what noticed. On 27 September there were 1,664 records, and the server had caught 83% of them without me. Records that repeat get grouped, the groups that keep coming back get investigated, and the fix lands through the same lander as any other change.

I also pointed a sandboxed autoresearch loop at the part of the server that posts status to Slack. It ran 21 experiments on that mechanism and kept 16, and in the simulation it measured against, Slack API calls fell from 5,366 a day to 619. Those are simulated calls, not a month of live traffic. I don't call the server self-improving, because nothing I have measures that it gets better over time. What I can show is the mechanism.

## What I use it for

hwde runs on it, and that harness has taken 16 boards from a written brief toward something you can order; 2 of them have been ordered. It has built 47 interactive lessons across 14 of my courses. A timer reads the course site every 10 minutes and files what's new, and each course keeps a record of where I'm weak that the lesson tutors read.

It writes and files its own documentation in a library with numbered revisions, which is where the notes below come from. It also handles my job applications: the resume variants, the letters, and the outreach plan all live in a project on it. Other people use it too. Members get a sandboxed workspace and their own lessons, and a question sent to it by e-mail comes back as a built explanation.

![A Slack thread on my phone: I ask one project's planning session where a piece of work stands, and it answers in the thread with what landed and what it's doing next.](screenshot-slack.png)

So when I'm on Slack, that's usually what's happening. I'm reading a reply from one of those sessions and typing the next instruction.

## Further reading

- [autobox technical note](https://library.ihsan.cc/d/006-0032-A): how the server is put together and how a change gets from an agent's worktree to main (4 pages).
- [The agentic systems inside autobox (public)](https://library.ihsan.cc/d/001-0006-A): the agent systems that run on the server, written for a reader outside it (12 pages).

[^count]: Counted on 27 September with `git log --first-parent --since=2026-08-26` on the server's repository, where every commit is one landing. The number moves every day.
