---
title: AI PCB Design Tool
date: 2026-10-22
summary: How my AI PCB design flow works, and the working amplifier board it designed.
standfirst: On AI PCB design: from brief to working board
blurb: On AI PCB design: from brief to working board
library: 003-0004
revision: D
pdf: https://library.ihsan.cc/files/003-0004-D.pdf
approved_by: Ihsan
approved_at: 2026-10-22
---

*This essay is also a [6-page PDF](https://library.ihsan.cc/p/KaIgYn5Ma5l8Ea-1xM7hKvCuO8H41tmC).*

## Introduction

This essay details the development, real use, and extensions of an AI PCB design flow. Similar to *The Hive*, the flow leverages a soft judgement layer which calls and develops deterministic scripts and evals, which themselves are required to pass review. The flow has designed a working audio amplifier board, and is being developed alongside ASIC, FW, NPIE, and CAD flows to carry out the development of entire products.

## Design of an AI PCB flow

### Goal

The goal with this AI PCB flow is to enable brief-to-manufacturing-files automated PCB generation while also making it possible to isolate specific parts of the flow to aid with manual PCB designs.

### Soft judgement calls deterministic tools at will

In order to enable dynamic improvement of the system, both as models improve and failures are identified, deterministic tools and procedures are presented to the model and used at will. The judgement layer receives a brief and can then choose to use any of the available tools and procedures to best execute the design. It may also develop and file its own tools and procedures for later runs to use. Since obsolete tools and procedures quietly stop getting chosen by models, with new ones replacing them, the benefit of deterministic steps is maintained without them holding the system back as models outgrow the current tools. The final design must, however, be backed by empirical simulation and eval results. Hence, while the judgement layer may choose how/which deterministic tools it uses, the empirical test and simulation results must pass review by an independent reviewer.

This is the core functioning principle of [*The Hive*](https://ihsan.cc/writing/the-hive), where deterministic tools and scripts are extended to become modules, and where agents receive context into current system operation rather than explicit instructions on how to carry out work.

### Initial architecture

The very first architecture was a rigid, step-by-step pipeline. This pipeline would take in a brief, complete research, then design the schematic, proceed to layout, routing, and finally checks/DFM, and fab. Initial testing, however, revealed that such an approach was far too rigid and made it difficult for later steps to correct previous ones, or even enable much creativity in terms of the model's choices.

In order to increase flexibility, the pipeline became a Claude Code skill which contained procedures, agent team structures, and scripts. This enabled a soft orchestration layer to call deterministic tools to both generate structures and evaluate designs. However, this arrangement still effectively forced the judgement layer to use the scripts available, and it was difficult for the model to upgrade or remove obsolete tools while adding new ones. This yielded a static system and prompted the current architecture.

## Using the flow

Using the flow is as simple as giving a design objective and desired human involvement in the design process. A brief could be one line, or a whole detailed spec document. With an underspecified brief in fully autonomous mode, the judgement layer will make decisions for the user and carry the design through to completion.

The PCB flow roughly follows the spec -> research -> design -> schematic -> placement -> layout -> DFM -> fab package process, but this is done at will based on the resources it has. It can choose to go backwards in these steps, or even fully skip some if it really wanted to. Ultimately, however, the final design must be backed by deterministic script and eval results. Hence, a highly unconventional process is likely to fail these tests and require a rebuild.

The flow is able to connect to manufacturer and supplier APIs, such as JLCPCB or DigiKey, in order to choose parts which are in stock or estimate cost.

The final products of a fully autonomous flow are the manufacturing files and a few documents, including a detailed design report explaining all the model's decisions and a highlight document covering high-level design choices.

## Audio amp from brief to working PCB

I instructed the flow to design a simple class D audio amp. Specifically, I told it to design the same board GPT Astra 6 designed. It found a write-up from JLCPCB where they tested Astra 6 by designing an audio amplifier, and designed one itself. About 9 hours and $126[^cost] later, it produced manufacturing files, BOM, and CPL, as well as documentation, which I uploaded to JLCPCB and ordered as is.

The flow produced a bring-up document with measurement and test instructions, and processed data captured on the oscilloscope and subsequently produced a report. The audio amplifier worked as designed, and drove hi-fi tower speakers at up to 20 W with nice qualitative sound quality, and quantitative test results in line with the intended design figures.

![The board as JLCPCB assembled it, still in its panel.](hwde-amplifier.webp)

On the bench, on a 12 V supply with both channels driving 6 Ω speakers, its clean output was 10.9 W per channel at 0.37% THD (500 Hz), and its efficiency about 90% at 1 kHz. It clipped at its own 12 V rail, not at the source.

### How it did against the design

The brief set no performance numbers, since it only asked for a copy of the reference board, so most of the targets were ones the flow worked out for itself. Two of them were met. The design said the board would clip at its own 12 V rail on a full line-level input, and the flat tops start at about 11.8 V. It expected 90 to 93% efficiency, and the bench measured 90% at 4.1 W per channel at 1 kHz, so that one was met, just. Power per channel came up short: the design expected 15.6 W into 4 Ω and 8.4 W into 8 Ω at 1% THD, while the bench gave 10.9 W clean at 500 Hz but was clipping by 10.1 W at 100 Hz and by 8.6 W at 1 kHz. The chip's temperature was meant to stay under 125 °C, with about 85 °C estimated, and it hasn't been measured. The brief's own target was a board of 44 × 34 mm or smaller, and the board missed it at 53.6 × 36.8 mm, because heat came first.

Power is the one real miss on the bench. At 100 Hz the board clipped at 10.1 W, where the design expected about 15.6 W clean into 4 Ω, and at 1 kHz it was already clipping at 8.6 W. My bench supply was capped at 2.1 A, below the 2.9 A the design says both channels draw at full power into 4 Ω, and the flat tops sagged about a volt as the supply drooped, so the supply may have given out before the board did. A run on a bigger supply would settle it.

![Distortion against power for each tone I captured, 100 Hz to 1 kHz. Open circles are the design's estimates at 1% THD. The speaker was under 5 Ω in the bass and 7.5 Ω at 1 kHz.](amp-thd-vs-power.png)

The design's own checks weren't all clean either. Its verification gate never passed: the flow proposed eight findings as waivers, and I ordered the board without signing them. The one that matters is thermal, and nobody has measured the chip's temperature yet.

### The board and what it cost

The board is 53.6 × 36.8 mm, on two layers of 1.6 mm FR-4 with 2 oz copper. It has 39 parts from 16 BOM lines, all surface-mount on the top side, so JLCPCB assembled the whole thing. Power, audio and the speakers connect to bare wire pads.

I ordered ten assembled boards on 30 September. Ten bare boards with a 24-hour build cost $5.00, assembly of all ten $87.73 and shipping by DHL $32.26, so the order came to $124.99. Designing it cost $126.02 in AI spend.[^cost]

That comes to about $9.27 a board, or $12.50 with shipping, so designing the board cost about as much as the whole order. Most of the AI spend went on two stages: architecture, which included picking parts JLCPCB stocks, and placement, which ran twice because the nets between the amp chip and its inductors wouldn't route the first time.

![Estimated API spend by design stage, from the run's cost record.](ai-spend-by-stage.png)

## Other PCBs

While only the audio amp was manufactured, many other boards were designed.

![Three-phase motor driver, 4 layers](bldc-motor-driver.png)

![ESP32-C3 sensor node, 2 layers](esp32c3-node.png)

![GaN RF inverter, 4 layers](gan-rf-inverter.png)

More boards the flow has taken to a routed layout are in the [showcase](https://github.com/ihsan-sa/hwde) on GitHub.

## Beyond PCB design: ASIC, FW, NPIE, CAD, and product

PCB design often requires decisions which spill over into firmware development, mechanical design, or entire product design and bring-up. Hence, this flow exists within an ecosystem of flows spanning firmware, new product integration, CAD, product design, and mixed-signal chip design. These flows can talk to one another on the hive, my orchestration system which hosts my projects, to design full products. Testing and development of this system are still underway.

Additionally, the mixed-signal chip design flow is built in a very similar fashion, and heavily leverages deterministic tools and test suites. The analog portion shares many similarities with the PCB design flow. Currently, the mixed-signal design flow is building a PLL for a Tiny Tapeout chip.

## RSI in PCB and other flows

Recursive self-improvement (RSI) in these flows behaves similarly to how it does in the hive. Projects such as this one which live on the hive benefit from the hive's own self-improvement processes and hence are a subset of its self-improvement. These flows identify deficiencies with available tools, develop new ones, and archive old ones. These tools are informed by previous builds, enabling continuous improvement on top of model improvement.

## Next steps

I am continuing the development of this flow, specifically observing how tools evolve and get replaced. I have already observed significant improvement in PCB generation since the release of Claude Opus 5.5 over its predecessors, although I acknowledge this observation is largely qualitative.

Developing strong evals and deterministic tools is a critical part of both ensuring models can weigh their own designs and allowing humans to grade PCB designs. Scripts like these already exist to generate scores and feedback on signal integrity, power delivery, etc., and more are being developed. I am able to leverage my experience in hardware design and signal integrity/RF to steer the development of these tools alongside the high-level architecture.

[^cost]: Estimated API spend in US dollars, across the run's 14 Claude Code sessions.
