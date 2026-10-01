---
title: Autobox
date: 2026-09-30
library: 012-0004
revision: N
pdf: https://library.ihsan.cc/files/012-0004-N.pdf
approved_by: Ihsan
approved_at: 2026-10-01
summary: how I built and use my agentic orchestration system.
standfirst: "How I built Autobox, the AI agents on a small home server that run my projects, and how I use it."
---

*For a deeper look at how Autobox works, there’s a [12-page technical write-up](https://library.ihsan.cc/p/HsAJRgs_GfofW_v0Sh8MDu5tOHlGXlP4).*

I often get asked “Are you working right now? Why are you on Slack?” The answer is that I’m talking to 80+ agents running on Autobox, my orchestration system which runs on a small server at home.

For example, the chip and board renders further down, which I asked for in Slack, went through four projects. The chip is an 8-bit counter that the chip-design skill took to a finished GF180 layout, and the board is a motor driver the hwde skill designed. A video session rendered both in Blender for a demo, a critic agent reviewed the stills, and the website session put them in this essay.

![Autobox at work](hero.gif)

## How Autobox works

Everything starts with a Slack channel: every channel in Slack goes to an ephemeral Claude Code session running in a tmux on my server. When the context of that session passes 15%, it hands off seamlessly to a successor, giving the illusion that it’s just one session the whole time. Handing off at low context prevents context rot, which is expensive in tokens and makes the results less sharp.

Every planning session works towards short- and long-term goals for that project with an automatic “wake” which keeps sessions on track. When I give work to a planning session, it can execute it via three paths:

1. Subagent → small scoped work like file edits or research
2. Worker → spawned via claude -p (e.g. less defined failure investigation and fix)
3. Sub-orchestrator → gets its own channel and acts as a sub-planning session (e.g. advanced feature implementation which requires close collaboration with user)

![The three ways a planning session hands off work](dispatch-paths.svg)

**Sandboxing;** workers can be spawned in containerized sandboxes for dangerous work or simply for full autonomy with full permission granted.

### Model/harness agnostic

While the system was originally built on top of Claude Code’s harness, it can be made to be harness/model agnostic, which is what I am currently working on. Some Claude Code sessions will already launch Codex reviews and thinking tasks using GPT Astra 6. Planning sessions run on Opus 5.5. Workers and reviewers get the cheapest model and effort level that holds quality, from Sonnet 5.5 for a well-specified task up to Fable 5.1 or Astra 6 for one that needs more intelligence.

Autobox relies on harnesses like Claude Code, Codex, and soon Cursor to carry out work. Relying on such continuously evolving tools adapted to the models they support enables an approach which adapts to newer, more capable models. Many internal tools such as diagram makers, documentation guides, or even /hwde PCB design or chip design flows are in the form of skills and rely on the main agent’s judgement to spawn workers and subagents, maintaining a flexible structure. This soft orchestration, layered with hard/deterministic checks run both at will and as part of gates, enables the construction of dynamically evolving architecture.

### Interconnection

The most powerful part of the system is the interconnectedness of its components. Notably, planning sessions, workers, and subagents can talk to one another to gain more context into various systems and past/current/future goals and work. A master permissions session handles modifying agent and system permissions → essentially a glorified auto-mode classifier for Autobox.

This is seen in the development of the firmware and bring-up skills. They were built at the same time, and the bring-up session needed commands the firmware manifest didn’t have yet, like arm, disarm and spin. It left its asks on the firmware session’s row, the firmware session added them before it landed, and the bring-up procedure was then generated from that manifest.

### Knowledge management: low context, research first

A research-first and low-context approach is core to maintaining a lightweight and flexible system that evolves as models do and as information within and outside the system changes. Agents are spawned with short and general instructions, and are instructed to consult and write to the system library. This library stores information on all projects and is indexed and managed by a search engine and librarian. Agents have varying levels of access depending on which projects they work on.

Knowledge and information are stored and sent in various manners which allow the system to grow and improve as the models do:

**Library;** everything Autobox writes (journals, docs, goals, failures, memory, etc.) gets filed in the library. Before agents do work or make a claim, they query the library via a search engine which is both algorithmic and agentic.

**Journals;** sessions keep a running markdown journal of completed work, what’s next and what failed. Future sessions ingest only select parts of the log when deeper insight into past work is needed in order to manage context.

**Task files;** new workers receive a short `task.md` with information on the job at hand.

**Boards;** projects file tasks to a board to track their progress and failures on a failure ledger.

**Messages;** agents message one another via either back-end sockets, Slack, or prompt injection into one another’s sessions.

**Forced context;** forced context is kept as small as possible (about 7–11k tokens, vs. Claude Code’s system prompt of around 22k). This includes a brief `CLAUDE.md` and a few other files which provide insight into how the system works, communication guidelines, etc.

### Self-improvement and autonomous development

**Failures;** agents scrape through past work, messages in Slack, and blatant failures and categorize them into a list of failures. Workers are then dispatched to make fixes and test them. The ledger holds about 2,000 records. The failure that recurs most right now is sessions carrying their context past the 150k line (587 records in the last two weeks), ahead of gates going red at landing (484).

**Iterative improvement;** some processes will go through iterative improvement flows, in some cases similar to Karpathy’s autoresearch. In those cases, individual scripts and processes are improved iteratively using a lightweight agent and graded checks. Other times, past events and data will be replayed and used to iteratively improve a system. For example, the PR lander was improved by replaying two days of landings (111 PRs) to yield a lander that, in the replay, ran 328 checks instead of 595 and got 95% of landings through within 116 minutes instead of 231.

**Ralph loops and north stars;** planning sessions utilize recurring wake calls and scheduled wakeups to restart stalled work or initiate investigation and implementation of new tasks to accomplish a broader goal.

**Raised problems;** when an agent loses time to the box’s own tools, it files a “raised-” row on the board saying what broke and what it cost. The planning session reads the board and decides what to fix, so the box’s problems get reported by the agents that hit them, not by me.

**Spend tiers;** how much the box takes on by itself is set by its spend tier: stop, essential, moderate or autonomous. On autonomous it finds, fixes and explores work on its own, lower tiers take on less of what it finds, and on stop it only answers me. In the last week the box used about $3,500 of tokens at API prices, and its own repository landed 219 PRs. The motor driver’s runs came to about $111.

### Landing PRs

Agents work in separate worktrees and on separate branches. In some cases, this new work can be deployed as a prototype for immediate use before the PR lands. In order for a PR to land, it must go through the lander. This system triggers a set of agent reviews as well as hard gates which are run adaptively based on the files that have been edited. Projects merge their own PRs: the gates and reviews decide, with no approval from me, and a red gate or a review finding still stops it and asks a person. Small PRs land alongside large ones, and large test suites are offloaded to another machine.

Late in September the lander was the slowest part of the box. One run of its test suite took two and a half hours, and over two days the slowest 5% of PRs waited seven hours before their checks started. Within a few days the lander changed in three ways. It now picks a PR’s checks from the files the PR touches, so a docs change skips the suite. When the box is busy, it sends checks to my laptop. And a PR with a handful of checks goes ahead of one with dozens, so small fixes stop waiting behind big ones.

## How I use Autobox

I use Autobox to manage my entire engineering, professional, and educational life. The system knows and develops my projects, supports me in defining my career trajectory, processes my schoolwork, notes, and materials into lessons to support my learning and identify weaknesses, and serves as a testbench for my investigations into AI research.

The best part of the system to me is the fact that it simply remembers what I need and does it. It is capable of inferring unspoken relationships between projects and picks up on minute details I mention and forget about. This makes it very powerful for cross-disciplinary and project work, and ensures very quick development.

### EDA

Autobox runs my AI-enabled PCB design flow called hwde. This includes both improvements/developments on the pipeline and also running PCB builds.

In addition to hwde, the box runs chip design flows for digital, analog, and mixed-signal designs, as well as firmware and new product integration/bring-up flows.

![The motor driver hwde designed, rendered in 3D from its KiCad board](pcb.gif)

![A small test chip from the chip flow, an 8-bit counter, its layout in 3D](chip.gif)

### Library

I built the library to manage all my documents, both human and AI written. Generating documentation is important for me to be able to understand the systems and findings the AI system has developed. In order to better track revisions and interact with and edit documents, I built an “AI Overleaf” which allows for easy tracking of documents and their versions, document numbering, and editing. Through this flow, I can easily edit documents by commenting on existing work, adding lines to be rephrased, or adding text to keep in my writing.

![The library](library.gif)

Every document gets a number such as 001-0004-B (project, document, revision), and a filed revision never changes. The recording shows the editor: I draw a box on the PDF and comment on it, change a line, or edit the LaTeX directly, then send the edits to the session that wrote the document, which files the next revision. The library holds 143 documents and 278 revisions so far.

### Lessons

The lesson-builder skill was the first agent system I built back in March to study for my exams. Today, it ingests course materials and my notes automatically and builds lessons and teaches me. The pipeline employs a range of breadth and depth agents. The former survey the topic area and resources at hand and make a research plan, while the latter drill into certain topics and compile in-depth course notes. Those notes are then reformatted into an outline by pedagogy agents, which decide on the best way to both explain the content and present it using available media. Specialist agents will then generate the media and put the lesson together. The tutor runs a system prompt shaped to teach effectively, and can generate graphs, diagrams, or videos.

![A lesson and its tutor](lessons.gif)

The recording shows a lesson on Fourier series. Its figures are live, and when I ask the tutor to draw what the filter does, it draws it into the chat.

## What’s next

Currently, the system is compute constrained. While the lander runs adaptive test suites, and some intense processes are handed off to my laptop when it is on, the server remains a 2017 i5 based machine. Beyond upgrading the hardware, I plan to further develop the self improvement flows and more specifically, the long horizon planning capabilities of the system. One function I would like to see implemented is long term goal setting and adjusting, where agents evaluate progress towards current goals, and brainstorm to set new ones. While Autobox often correctly chooses to engage in the same short term work trajectory I would have chosen, I have yet to consistently observe true open-ended, long-horizon work and exploration. That being said, I am increasingly moving towards this and look forward to seeing where it goes.

Another key priority is ensuring Autobox remains lightweight from a context perspective and flexible in the sense that much of the choice of how to approach a problem is left to the LLM to decide. This is important as it will ensure Autobox will have the greatest potential leap in capability as models improve. Switching to Opus 5.5 has already made the box’s work much cheaper and of higher quality. Part of this is also working towards making the framework model/harness agnostic so that various models can be run. I’ve also started benchmarking Autobox against a plain Claude Code session. A first small run on five SWE-bench Verified tasks showed the overhead but not yet the benefit: both solved all five, and the Autobox worker cost about 64% more. A larger round is next.
