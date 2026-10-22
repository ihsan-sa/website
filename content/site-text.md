<!-- The site's text, built by scripts/content-md.js from src/content.json (the draft of
the next front page). Edit the words; each paragraph ends in a hidden marker saying where it
lives in the file, so leave the markers, and keep the text plain (no bold, links or lists).
A label in italics before a paragraph says what it is and is not part of the text. -->

# Ihsan Salari <!-- prototype.name -->

UWaterloo EE student building AI systems, after co‑ops in signal integrity, datacenter optics and RF for chip manufacturing. <!-- prototype.subtitle -->

I care deeply about the social and environmental impact of my work. With the advent of AI, I believe it is increasingly important for these values to inform decisions, whether on an individual, corporate, or societal level. <!-- prototype.about.0 -->

Every role I’ve held was in a field new to me, and each time I owned critical deliverables within weeks. At Fab2 I designed a 200 W GaN inverter for RF plasma in a day, achieving first plasma in 3 weeks. At Arista I worked with co‑founder Andy Bechtolsheim on the power architecture for next‑gen high‑density 12.8T XPO and co‑packaged optics. I also ensured signal integrity on PCIe Gen 5 and on the 224G links of leading 102.4T switches. <!-- prototype.about.1 -->

Six months ago I decided to work on AI projects, because I realized that was likely my future. Now a server of mine runs autonomous AI agents that I talk to over Slack. They build and manage my projects and my learning, from my AI PCB and chip design tools to lesson‑builder. <!-- prototype.about.2 -->

*Fold button, closed:* Show more <!-- prototype.aboutFold.more -->

*Fold button, open:* Show less <!-- prototype.aboutFold.less -->

*Link:* GitHub <!-- prototype.links.0.label -->

*Link:* LinkedIn <!-- prototype.links.1.label -->

*Link:* AI résumé <!-- prototype.links.2.label -->

*Link:* HW résumé <!-- prototype.links.3.label -->

*Contact button:* Save contact <!-- prototype.contactCard.label -->

*Contact button tooltip:* Save my contact card (.vcf) <!-- prototype.contactCard.title -->

## Experience <!-- prototype.experience.heading -->

### Fab2 (Atomic Semi) <!-- prototype.experience.items.0.name -->

RF Plasma Generation <!-- prototype.experience.items.0.text -->

*Where and when:* San Francisco, Summer ’26 <!-- prototype.experience.items.0.where -->

*On a phone:* RF plasma, ’26. <!-- prototype.experience.items.0.short -->

Designed a 200 W Class DE RF inverter in one day and reached first plasma in three weeks. Designed the Rogowski‑coil current sensor for a tens‑of‑MHz RF V‑I probe from a first‑principles model, and characterized the coils on a VNA. Built an end‑to‑end AI PCB design workflow in modular pieces for future use in the team’s existing design process. <!-- prototype.experience.items.0.result -->

### Arista Networks <!-- prototype.experience.items.1.name -->

Optics and Signal Integrity <!-- prototype.experience.items.1.text -->

*Where and when:* Santa Clara, Fall ’25 <!-- prototype.experience.items.1.where -->

*On a phone:* optics, ’25. <!-- prototype.experience.items.1.short -->

Worked with founder Andy Bechtolsheim and senior directors on power architecture definition and PMIC selection for next‑gen co‑packaged optics and 1.6T XPO high‑density pluggable modules. Debugged 224G PAM4 signal integrity on 70 GHz VNAs, which cleared two 102.4T switches for fabrication. <!-- prototype.experience.items.1.result -->

### aiRadar <!-- prototype.experience.items.2.name -->

High‑frequency Power Electronics <!-- prototype.experience.items.2.text -->

*Where and when:* Vancouver, Winter ’25 <!-- prototype.experience.items.2.where -->

*On a phone:* sonar power, ’25. <!-- prototype.experience.items.2.short -->

Redesigned a 3.5 MHz multi‑stage GaN dc‑dc converter end to end, from topology choice to STM32 firmware and bring‑up. <!-- prototype.experience.items.2.result -->

### University of Waterloo <!-- prototype.experience.items.3.name -->

BASc Electrical Engineering. 2024–2029. <!-- prototype.experience.items.3.text -->

*On a phone:* EE, 2024–29. <!-- prototype.experience.items.3.short -->

Class academic rep and WEEF engineering fund rep. GPA 87%. <!-- prototype.experience.items.3.result -->

## AI work <!-- prototype.aiWork.heading -->

### hwde <!-- prototype.aiWork.items.0.name -->

an AI PCB engineer, from brief to fabricated board. <!-- prototype.aiWork.items.0.text -->

*Under the name:* Designed 21 boards so far, with the latest, an amplifier, on order for testing. <!-- prototype.aiWork.items.0.sub -->

*On a phone:* an AI PCB engineer. <!-- prototype.aiWork.items.0.short -->

A multi‑stage agentic pipeline in the form of a Claude Code skill takes in a simple brief and produces a PCB design and fab package. Soft orchestration layered with deterministic evals and scripts ensures a pipeline which produces consistent, verifiable, and iteratively improvable outputs, while maintaining a flexible pipeline which evolves as models and harnesses do. <!-- prototype.aiWork.items.0.result -->

*Image description:* Boards hwde designed, rendered in 3D from their KiCad files. <!-- prototype.aiWork.items.0.visual.alt -->

*Caption:* Boards hwde designed, rendered in Blender. <!-- prototype.aiWork.items.0.visual.caption -->

### autobox <!-- prototype.aiWork.items.1.name -->

autonomous agent orchestration on a remote server. <!-- prototype.aiWork.items.1.text -->

*Under the name:* Agents coordinate to develop projects in parallel and autonomously with little human oversight. {autobox.prs}+ PRs merged across {autobox.repos} repos, in 1,300+ agent hours. <!-- prototype.aiWork.items.1.sub -->

Agent orchestration system which runs on a server and autonomously develops projects and improves its own systems. Communication takes place via Slack, and agents follow thorough work patterns which abstract the user away, enabling autonomous development. Agents share a central library and exchange information via sockets and Slack in order to coordinate development. A PR lander runs reviews and adaptive tests based on edited files before merging. A self‑improvement flow catches failures and evaluates project status against goals to both improve current work and re‑evaluate said goals. <!-- prototype.aiWork.items.1.result -->

*Image description:* Diagram: a planning session, one per Slack channel, hands work down one of three paths: a subagent, a worker, or a sub-orchestrator. <!-- prototype.aiWork.items.1.figure.alt -->

*Caption:* How a planning session hands out work. <!-- prototype.aiWork.items.1.figure.caption -->

*Note:* For more details, read&#32; <!-- prototype.aiWork.items.1.note.text -->

*Note link:* the essay <!-- prototype.aiWork.items.1.note.label -->

### lesson-builder <!-- prototype.aiWork.items.2.name -->

course material into interactive lessons. <!-- prototype.aiWork.items.2.text -->

*Under the name:* 47 lessons across 14 topics, each with its own tutor, videos, interactive demos, graphs and more. <!-- prototype.aiWork.items.2.sub -->

*On a phone:* courses into lessons. <!-- prototype.aiWork.items.2.short -->

Builds interactive lessons with a chatbot tutor via custom content ingestion, supplemental research, and a thorough review pipeline. Lessons feature multimedia content, from videos to interactive demos, Desmos graphs, and SVGs. The chatbot is built on pedagogical theory and can generate content to better explain concepts. I’ve made 47 lessons spanning 14 topics. <!-- prototype.aiWork.items.2.result -->

*Image description:* A Slack post announces a lesson on Fourier series; the lesson opens and builds a square wave from sines as harmonics are added, the tutor answers a question beside it, and the lesson ends on quick-check questions. <!-- prototype.aiWork.items.2.visual.alt -->

*Caption:* A lesson, with its tutor docked beside it. <!-- prototype.aiWork.items.2.visual.caption -->

### chip design flow <!-- prototype.aiWork.items.3.name -->

AI chip design for digital, analog, and mixed‑signal. <!-- prototype.aiWork.items.3.text -->

*Under the name:* Designs tiles for Tiny Tapeout GF180 with soft orchestration over deterministic checks and iterative, script-based optimization. 13 circuits so far: digital, analog and mixed-signal. <!-- prototype.aiWork.items.3.sub -->

*On a phone:* AI chip design. <!-- prototype.aiWork.items.3.short -->

Three pipelines in the form of Claude Code skills aimed at digital, analog, and mixed‑signal design leverage a combination of deterministic checks and evals, iterative improvement flows based on Karpathy’s autoresearch, and a soft orchestration layer. These skills are being developed and used to design tiles for the Tiny Tapeout GF180 chip. <!-- prototype.aiWork.items.3.result -->

*Image description:* The layout of a small SPI FIFO chip tile, in 3D: it floats and turns over a dark grey background, showing rows of blue standard cells with gold routing packed into the middle and pale power rails running across. <!-- prototype.aiWork.items.3.visual.alt -->

*Caption:* A small SPI FIFO tile from the chip flow, its layout in 3D. <!-- prototype.aiWork.items.3.visual.caption -->

## Essays <!-- prototype.essays.heading -->

*Banner:* New essay <!-- prototype.essays.banner -->

## Projects <!-- prototype.projects.heading -->

*Heading link:* Hardware portfolio <!-- prototype.projects.headLink.label -->

### Ionic thruster <!-- prototype.projects.items.0.title -->

1.5 m/s of ionic wind and 40 mN of thrust. <!-- prototype.projects.items.0.result -->

### 3.5 MHz GaN converter <!-- prototype.projects.items.1.title -->

10–50 V in, 20 V out. <!-- prototype.projects.items.1.result -->

### Lorentz E&M solver <!-- prototype.projects.items.2.title -->

C++ that traces charged particles through electric and magnetic fields, with a hybrid RK4 and Euler integrator. <!-- prototype.projects.items.2.result -->

### USB‑C trigger board <!-- prototype.projects.items.3.title -->

140 W USB‑C Power Delivery on a 6‑layer board. <!-- prototype.projects.items.3.result -->

### Quad LED floodlight <!-- prototype.projects.items.4.title -->

### RP2040 business card <!-- prototype.projects.items.5.title -->
