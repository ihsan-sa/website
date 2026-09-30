---
title: Autobox
date: 2026-09-30
draft: true
summary: I often get asked “Are you working right now? Why are you on Slack?” The answer is that I’m talking to up to 80+ agents running on Autobox, my orchestration system which runs on a small server at home.
---

I often get asked “Are you working right now? Why are you on Slack?” The answer is that I’m talking to up to 80+ agents running on Autobox, my orchestration system which runs on a small server at home.

![Autobox at work, from a phone](slack.gif)

## How Autobox works

Everything starts with a slack channel: every channel in slack goes to an ephemeral claude code session running in a tmux on my server. When the context of that session passes 15%, it hands-off seamlessly to a successor, giving the illusion that it’s just one session the whole time.

Every planning session works towards short and long term goals for that project with an automatic “wake” which keeps sessions on track. When I give work to a planning session, it can execute it via three paths:

1. Subagent → small scoped work like file edits or research
2. Worker → spawned via claude -p (e.g. less defined failure investigation and fix)
3. Sub-orchestrator → gets its own channel and acts a sub-planning session (e.g. advanced feature implementation which requires close collaboration with user)

![The three ways a planning session hands off work](dispatch-paths.svg)

**Sandboxing;** Workers can be spawned in containerized sandboxes for dangerous work or simply for full autonomy with full permission granted.

### Model/harness agnostic

While the system was originally built on top of claude code’s harness, it can be made to be harness/model agnostic, which is what i am currently working on. Some claude code sessions will already launch codex reviews and thinking tasks using GPT astra 6. As of the writing of this article, planning sessions run on Opus 5.5, while workers and reviewers run on models spanning from Sonnet 5.5, through Opus 5.5, to Fable 5.1 or Astra 6 at varying effort levels depending on how well specified the task is and whether it requires more intelligence.

Autobox relies on harnesses like Claude Code, Codex, and soon Cursor to carry out work. Relying on such continuously evolving tools adapted to the models they support enables an approach which adapts to newer, more capable models. Many internal tools such as diagram makers, documentation guides, or even /hwde PCB design or chip design flows are in the form of skills and rely on the main agent’s judgement to spawn workers and subagents, maintaining a flexible structure. This soft orchestration layered with hard/deterministic checks run both at will and as part of gates enabling the construction of dynamically evolving architecture.

### Interconnection

The most powerful part of the system is the interconnectedness of the systems. Notably, planning sessions, workers, and subagents can talk to one another to gain more context into various systems and past/current/future goals and work. A master permissions session handles modifying agent and system permissions → essentially a glorified auto-mode classifier for Autobox.

### Knowledge management: low context, research first

A research first and low context approach is core to both maintaining a lightweight and flexible system which both evolves as models do and as information both within and outside the system changes. Agents are spawned with short and general instructions, and are instructed to consult and write to the system library. This library stores information on all projects and is indexed and managed by a search engine and librarian. Agents have varying levels of access depending on which projects they work on.

Knowledge and information is stored and sent in various manners which allow the system to grow and improve as the models do:

1. Library → everything the box writes (journals, board rows, goals, docs, memory files, Slack messages, landing records and failures) is indexed as it's written. Before an agent claims something, it asks the library with `cc-lib ask` and gets back a small, capped answer instead of reading whole files.
2. Journals → every session keeps a running md journal of what it did, what's next and what went wrong. When a session hands off, its successor reads the journal first and asks its predecessor one batch of questions.
3. Task files → a worker starts from a task.md with its brief, and each round of its loop starts with fresh context: just the task.md and the end of its journal.
4. Boards and goals → each project has a board with one row per piece of work and a goals.md with its standing goals. A row points at the work; it isn't the brief itself.
5. Messages → sessions message each other by name, and events from the box's own scripts go through a broker that batches them, so a burst of them wakes a session only once.
6. Forced context → every session starts with a short role prompt with a few shared rules appended: how to hand out work, how to write, how to raise a problem, how to spend and how to use the library. A worker is also told to read its journal before anything else.
7. CLAUDE.md and memory → a short CLAUDE.md points to a few guides, which point to the specific docs, so an agent only reads as deep as it needs to. Memory files keep only rules loaded, and facts move to a file the library searches instead.
8. Failure ledger → when an agent gets something wrong, it records it with `cc-failures record`, and the ledger counts which kinds of failure come back.

### Self-improvement and autonomous development

**Failures;** Agents scrape through past work, messages in slack, and blatant failures and categorize them into a list of failures. Workers are then dispatched to make fixes and test them.

**Iterative improvement;** some processes will go through iterative improvement flows, in some cases similar to Karpathy’s autoresearch. In those cases, individual scripts and processes are improved iteratively using a lightweight agent and graded checks. Other times, past events and data will be replayed and used to iteratively improve a system. For example, the PR lander was improved by replaying two days of landings (111 PRs) to yield a lander that, in the replay, ran 328 checks instead of 595 and got its slowest landings (p95) through in 116 minutes instead of 231.

**Ralph loops and north stars;** planning sessions utilize recurring wake calls and scheduled wakeups to restart stalled work or initiate investigation and implementation of new tasks to accomplish a broader goal.

**Raised problems;** when an agent loses time to the box's own tools, it files a "raised-" row on the board saying what broke and what it cost. The planning session reads the board and decides what to fix, so the box's problems get reported by the agents that hit them, not by me.

**Self-landing;** projects merge their own PRs. Once a PR is ready, it's queued for the lander, and the gates and reviews decide, with no approval from me. A red gate or a review finding still stops it and asks a person.

**Spend tiers;** how much the box takes on by itself is one setting: stop, essential, moderate or autonomous. On autonomous it finds, fixes and explores work on its own, lower tiers take on less of what it finds, and on stop it only answers me.

### Landing PRs

Agents work in separate worktrees and on separate branches. In some cases, this new work can be deployed as a prototype for immediate use before the PR lands. In order for a PR to land, it must go through the lander. This system triggers a set of agent reviews as well as hard gates which are run adaptively based on the files that have been edited. Small PRs land alongside large ones, and large test suites are offloaded to another machine.

## How I use Autobox

I use autobox to manage my entire engineering, professional, and educational life. The system knows and develops my projects, supports me in defining my career trajectory, processes my schoolwork, notes, and materials into lessons to support my learning and identify weakness, and serves as a testbench for my investigations into AI research.

The best part of the system to me is the fact that it simply remembers what I need and does it. It is capable of inferring unspoken relationships between projects and picks up on minute details I mention and forget about. This makes it very powerful for cross disciplinary and project work, and ensures very quick development.

### Library

I built the library to manage all my documents, both human and AI written.

![The library](library.gif)

### Lessons

The lesson-builder skill was the first agent system I built back in march to study for my exams. Today, it ingests course materials and my notes automatically and builds lessons and teaches me.

![A lesson and its tutor](lessons.gif)
