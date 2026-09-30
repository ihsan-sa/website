---
title: Autobox
date: 2026-09-30
draft: true
summary: I often get asked “Are you working right now? Why are you on Slack?” The answer is that I’m talking to up to 80+ agents running on Autobox, my orchestration system which runs on a small server at home.
---

I often get asked “Are you working right now? Why are you on Slack?” The answer is that I’m talking to up to 80+ agents running on Autobox, my orchestration system which runs on a small server at home.

## How does Autobox work?

Everything starts with a slack channel: every channel in slack goes to an ephemeral claude code session running in a tmux on my server. When the context of that session passes 15%, it hands-off seamlessly to a successor, giving the illusion that it’s just one session the whole time.

Every planning session works towards short and long term goals for that project with an automatic “wake” which keeps sessions on track. When I give work to a planning session, it can execute it via three paths:

1. Subagent → small scoped work like file edits or research
2. Worker → spawned via claude -p (e.g. less defined failure investigation and fix)
3. Sub-orchestrator → gets its own channel and acts a sub-planning session (e.g. advanced feature implementation which requires close collaboration with user)

*insert diagram*

**Sandboxing;** Workers can be spawned in containerized sandboxes for dangerous work or simply for full autonomy with full permission granted.

### Model/harness agnostic

While the system was originally built on top of claude code’s harness, it can be made to be harness/model agnostic, which is what i am currently working on. Some claude code sessions will already launch codex reviews and thinking tasks using GPT astra 6.

### Interconnection

The most powerful part of the system is the interconnectedness of the systems. Notably, planning sessions, workers, and subagents can talk to one another to gain more context into various systems and past/current/future goals and work. A master permissions session handles modifying agent and system permissions → essentially a glorified auto-mode classifier for Autobox.

### Research first, low context approach

A research first and low context approach is core to both maintaining a lightweight and flexible system which both evolves as models do and as information both within and outside the system changes. Agents are spawned with short and general instructions, and are instructed to consult and write to the system library. This library stores information on all projects and is indexed and managed by a search engine and librarian. Agents have varying levels of access depending on which projects they work on.

### Self-improvement

### Landing PRs
