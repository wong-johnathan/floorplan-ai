# Competitive Analysis

## HDB Interior Design Web App

| Field | Value |
|-------|-------|
| **Date** | 2026-06-03 |

---

## 1. Overview

Five main competitors in the interior design + AI + 3D space:

| Competitor | Type | Starting Price | Our Advantage |
|------------|------|---------------|---------------|
| **RoomGPT** | 2D AI image generator | Free / $10-15/mo | We have actual 3D models, not just 2D img2img |
| **Planner 5D** | Manual 3D floor plan tool | $7.49/mo | AI consultant + auto-furnish; lower learning curve |
| **Coohom** | Professional 3D design | $30-40/mo | Affordable; AI-powered; simpler UX |
| **Foyr Neo** | AI-assisted 3D design | ~$49/mo | Cheaper; HDB-specific; conversational UX |
| **Havenly** | Human designer service | $79-899/project | AI-driven; instant; no human waiting |

---

## 2. Detailed Competitor Profiles

### 2.1 RoomGPT / RoomAI (roomgpt.io)

| Aspect | Detail |
|--------|--------|
| **Flow** | Upload photo → pick style → AI generates 2D redesigned room |
| **Styling** | 10-15 preset styles; no fine-grained control |
| **Furniture** | AI places automatically in 2D — often distorted scale |
| **Rendering** | Diffusion model (SD-based) — 2D img2img, no 3D |
| **Pricing** | Free (3-5 renders, watermarked, low-res) / $10-15/mo unlimited |
| **Weaknesses** | ❌ No 3D model — just 2D AI hallucinations ❌ Furniture can float, mismatch scale ❌ No floor plan support ❌ Can't edit specific items |
| **Borrow** | ✅ Ultra-simple UX: upload → style → done (3 clicks) |
| **Avoid** | ❌ No 3D means no real room editing — purely cosmetic |

### 2.2 Planner 5D

| Aspect | Detail |
|--------|--------|
| **Flow** | Draw floor plan / upload photo → manual furnish → render |
| **Styling** | Entirely manual — pick from catalog, set colours |
| **Furniture** | Full manual drag-and-drop in 2D/3D |
| **Rendering** | Cloud path tracing — minutes for high quality |
| **Pricing** | Free (limited catalog, watermarked) / $7.49/mo Pro |
| **Weaknesses** | ❌ Steep learning curve ❌ No AI styling ❌ Cloud render limit ❌ Clunky mobile |
| **Borrow** | ✅ Catalog approach for furniture ✅ 2D/3D sync is well done |
| **Avoid** | ❌ Making users place furniture themselves is high friction |

### 2.3 Coohom

| Aspect | Detail |
|--------|--------|
| **Flow** | Template → manual furnish → render (cloud) |
| **Styling** | Manual + pre-set themes; no AI |
| **Furniture** | Manual drag-and-drop with snap-to-wall |
| **Rendering** | Unreal Engine-based cloud rendering; supports VR/360° |
| **Pricing** | ~$30-40/mo (pro-focused) |
| **Weaknesses** | ❌ Expensive ❌ No AI features ❌ Complex UI ❌ Outdated 2D editor |
| **Borrow** | ✅ VR walkthrough and 360° panorama (P2 feature) ✅ Large 3D asset library |
| **Avoid** | ❌ Professional-only pricing excludes casual users |

### 2.4 Foyr Neo

| Aspect | Detail |
|--------|--------|
| **Flow** | Upload photo → AI creates floor plan → AI auto-furnishes → render |
| **Styling** | AI suggestions + manual override |
| **Furniture** | AI auto-placement + manual tweaking |
| **Rendering** | Cloud path tracing — seconds to minutes |
| **Pricing** | ~$49/mo (14-day free trial) |
| **Weaknesses** | ❌ Expensive for individuals ❌ AI placement can be generic ❌ No mobile app ❌ Slow for complex scenes |
| **Borrow** | ✅ AI auto-furnish is closest to what we want ✅ "Magic Room" concept |
| **Avoid** | ❌ Price is too high for Singapore HDB homeowners |

### 2.5 Havenly

| Aspect | Detail |
|--------|--------|
| **Flow** | Style quiz → matched with human designer → mood board |
| **Styling** | Human-curated from partner retailers |
| **Furniture** | 2D floor plan by designer |
| **Rendering** | No rendering — mood board only |
| **Pricing** | $79-899 per project |
| **Weaknesses** | ❌ Human-dependent (days wait) ❌ No 3D ❌ US/Canada only ❌ Expensive |
| **Borrow** | ✅ Style quiz is a good onboarding pattern |
| **Avoid** | ❌ Human bottleneck — AI is the whole point |

---

## 3. Gap Analysis: What Nobody Does Well

| Gap | Current State | Our Opportunity |
|-----|--------------|-----------------|
| **Conversational styling** | All competitors use presets or manual pickers | AI design consultant that asks, learns, iterates |
| **Per-room independent styling** | Most apply one style to entire room/unit | Each room has its own design brief |
| **HDB/BTO-specific** | Global tools assume standard rooms | Our admin-curated BTO templates fit perfectly |
| **Auto-furnish with control** | Foyr does it but expensive; RoomGPT does it but no control | Option C templates: curated sets, user can accept/reject items |
| **SketchUp export** | None offer this | Power users edit in SketchUp, re-import |
| **Floor plan wall editing** | None allow knocking down walls, merging rooms, or changing layouts | Wall segment editor with structural wall awareness, load-bearing constraints |
| **Singapore-specific materials** | None know about vinyl, homogeneous tiles, HDB constraints | AI consultant uses HDB-appropriate suggestions |
| **Price for Singapore market** | Cheapest is $7.49/mo (Planner 5D); richest is free | We can offer generous free tier (limited renders) |

---

## 4. Competitive Positioning

```
                            Manual Control →
                              Low            High
                            ┌─────────────────────────┐
                    Free    │  RoomGPT       │         │
                            │                │ Planner │
                       AI   │    ★ US ★     │   5D    │
                    Power   │  (Our Spot)    │         │
                            │                │ Coohom  │
                    Paid    │  Foyr Neo      │         │
                            │                │ Havenly │
                            └─────────────────────────┘
```

**Our spot (★):** Free-to-start, AI-powered, medium control — the sweet spot no competitor fully occupies for the Singapore HDB market.

---

## 5. Recommendations (What to Copy, What to Skip)

### Copy

| From | What | How |
|------|------|-----|
| RoomGPT | Simplicity of "upload → style → done" | Flat type selection takes 2 clicks |
| Foyr Neo | AI auto-furnish + manual override | Option C templates with accept/reject |
| Havenly | Style quiz onboarding | AI consultant asks initial broad question |
| Planner 5D | 2D/3D synchronized views | Floor plan overlay in viewport |
| Coohom | 360°/VR walkthrough | Phase 2 feature |

### Skip

| From | What | Why |
|------|------|------|
| RoomGPT | Pure 2D img2img (no 3D) | Users can't edit the room, only re-prompt |
| Planner 5D | Manual furniture placement | High friction; AI should do the first pass |
| Coohom | Professional pricing | Too expensive for target audience |
| Havenly | Human designers | Kills the instant, AI-first value prop |

---

## 6. Key Takeaway

**No competitor combines all three:** (1) actual 3D model, (2) AI conversational styling, (3) Singapore/HDB-specific. That's the entire product thesis.

Foyr Neo is closest in vision (AI + 3D) but costs $49/mo and isn't Singapore-aware. If we can deliver the same quality for free (basic) or cheap and HDB-native, we win that segment.
