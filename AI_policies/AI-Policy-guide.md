# AI Policy Guide

## Purpose

This guide is the canonical reference for AI policy iteration, route tuning, and training evaluation.
Future AI-AK optimization should follow this guide instead of using scattered notes in temporary plans.

## Core Principle

Do not rewrite the route system casually.
Optimize within the existing route framework first:

- `MENQING_SPEED`
- `OPEN_SPEED`
- `HALF_FLUSH`
- `ALL_PUNGS`
- `HONOR_HEAVY`

The first priority is to make route execution stable, interpretable, and aligned with the intended human-designed style.

## AI-AK Target Style

AI-AK is not a random safety bot and not a simplistic honor-dump bot.
Its style should be:

- clear route commitment
- recognizable early-game structure building
- restrained but purposeful opening
- preference for shape quality over noisy early claims
- route-consistent discard order instead of generic heuristic cleanup

### Expected early-game behavior

In the opening stage, AI-AK should usually:

- preserve menqing unless claim value is clear
- avoid defaulting to discard winds/dragons just because they are singletons
- first remove obvious weak number waste when such waste exists
- avoid noisy early chow/peng that does not clearly improve route speed or route value
- keep discard order explainable from route choice

### What AI-AK should not do

- opening with habitual `东 / 中 / 北 / 西 / 发 / 白` cleanup regardless of shape
- opening the hand too early with low-value chow/peng
- flipping route frequently
- claiming tiles that do not improve shanten-like state, ready draws, or route strength
- behaving like a generic discard heuristic instead of a route-driven character

## Route Intent

### MENQING_SPEED

Intent:

- preserve closed-hand structure
- improve shape efficiently
- break menqing only when speed gain is real

Rules:

- early claim must require clear gain
- claim should usually reduce shanten-like pressure or materially improve effective draws
- honor claims in opening should be stricter than mid/late claims

### OPEN_SPEED

Intent:

- accelerate once hand structure already supports fast completion

Rules:

- opening is acceptable only when route already supports tempo conversion
- avoid fake speed where opening reduces long-term improvement

### HALF_FLUSH

Intent:

- concentrate into one suit plus honors

Rules:

- discard off-suit numbers early
- honor support is acceptable
- do not break target suit discipline casually

### ALL_PUNGS

Intent:

- favor pair/triplet conversion

Rules:

- peng/kong can be aggressive
- chow is generally route-breaking

### HONOR_HEAVY

Intent:

- preserve honor-heavy value routes

Rules:

- number chow should be rejected
- honor claims may be encouraged
- this route must be rare and explainable, not accidental

## Opening Discipline

Opening discipline is the highest-risk area and must be protected.

### Opening stage definition

Treat these as opening indicators:

- concealed hand still around 11 to 14 tiles
- no exposed melds yet
- route still in observation or early commitment

### Opening discard priorities

Prefer this order:

1. obvious weak number waste
2. off-route suit waste
3. structurally isolated terminal waste
4. isolated honors only when number waste is not clearly worse

### Opening claim rules

Early chow/peng should require at least one of:

- lower shanten-like value
- clearly higher ready-draw count
- clearly higher improving-draw count
- strong route gain
- explicit route-consistent conversion into `ALL_PUNGS`, `HALF_FLUSH`, or strong `OPEN_SPEED`

Do not open just because:

- the tile is claimable
- the route score is only slightly higher
- an honor pair looks superficially attractive

## Training Metrics

Training should not be judged by win rate alone.

The following metrics matter:

- `routeCommitRate`
- `routeFlipPerGame`
- `badOpenRate`
- hu rate
- draw rate
- self-draw / discard-win balance
- menqing win rate
- big-hand rate

### Metric interpretation

`routeCommitRate`

- should be stable, but not artificially locked at extreme levels
- too low means no route identity
- too high with poor outcomes may indicate rigid route fixation

`routeFlipPerGame`

- should stay low
- repeated flips usually mean weak route confidence or noisy heuristics

`badOpenRate`

- this is a key guardrail
- any opening that breaks menqing without clear structural gain should count as suspicious
- this metric must remain heavily penalized in training

### Current guidance

- keep strong penalty on `badOpenRate`
- treat `0 hu / all draw` results as route execution failure, not acceptable stability
- do not allow training to optimize for cosmetic route consistency while losing all finishing power

## Live Policy vs Training Policy

Live bot logic and training evaluator must stay aligned.

Whenever opening or discard logic changes:

- update live route discard/claim logic
- update training discard/claim logic if it mirrors the same decision family
- add or update regression tests

Do not let training converge toward a behavior that live bot logic actively rejects.

## Regression Requirements

Every significant policy adjustment should try to preserve or add tests for:

- AI-AK opening does not default to dumping single honors before obvious number waste
- route-blocked early chow is rejected
- all-pungs route blocks chow and supports peng
- honor-heavy route rejects number claims
- ting preview and settlement regressions remain unaffected by AI policy changes

## Iteration Method

Use this sequence for future work:

1. identify one behavior-level problem
2. determine whether it is a discard issue, route issue, or claim issue
3. make the smallest route-consistent fix
4. run targeted regression tests
5. run quick `1 * 20` training/evaluation
6. inspect logs for behavioral change, not just summary metrics
7. only then consider stronger tuning

## What Counts As A Good Change

A good policy change should improve at least one of these without breaking route identity:

- fewer meaningless early honor dumps
- fewer bad openings
- clearer discard order from chosen route
- better conversion from structure to ready state
- lower draw-only runs

## What To Avoid

- replacing route logic with broad generic heuristics
- overfitting one trace example
- pushing AI-AK into random aggression
- using training score alone as proof of correctness
- large strategy rewrites without first exhausting constrained fixes

## Working Rule For Future Iterations

When in doubt:

- keep the route framework
- tighten entry conditions
- prefer interpretable behavior
- optimize for stable style first, then finish rate
