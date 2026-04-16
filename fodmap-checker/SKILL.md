---
name: fodmap-checker
description: Check foods against a low-FODMAP diet database, explain why high-FODMAP foods trigger IBS symptoms, and suggest substitutions. Use when the user mentions FODMAP, IBS, gut issues, asks whether a food is safe, portion sizes, alternatives to garlic/onion, or reviews a recipe for digestive sensitivity.
license: MIT
compatibility: Requires the agent to be able to fetch a URL (web_fetch, curl, fetch, etc.). Food data source is a public GitHub raw JSON URL.
metadata:
  version: "1.0"
  data_source: "https://github.com/gut-check/gut-check.github.io"
  data_license: "MIT (upstream)"
  fodmap_reference: "Monash University FODMAP research"
---

# FODMAP Checker

Help the user navigate the low-FODMAP diet by looking up foods in a curated database and giving precise, portion-aware answers with substitutions when needed.

## When this skill runs

The user typically asks one of:

1. **Single-food check** — "Can I eat avocado?" / "Is garlic OK?" / "What about lentils?"
2. **Multi-food check** — "I have onions, rice, and eggs in the fridge, what can I make?"
3. **Recipe or meal review** — "Here's my pasta recipe, flag anything problematic"
4. **Substitution request** — "What can I use instead of garlic?"
5. **Category browse** — "What fruits are low FODMAP?"
6. **Explanation** — "Why is cauliflower high FODMAP?"

## Data source

The food database lives at a public GitHub URL as a single JSON file. Fetch it fresh when the skill triggers — it's small (~50 KB, 296 entries) and auto-syncs weekly.

**URL:** `https://raw.githubusercontent.com/ts-sz/fodmap-data/refs/heads/main/fodmap.json`

Fetch it with whatever tool is available — `web_fetch`, `fetch` in code, `curl` in bash. Cache the result in memory for the rest of the conversation; don't refetch on every question.

## Entry schema

Each food in the JSON has this shape:

```json
{
  "name": "Garlic",
  "category": "vegetables",
  "category_title": "Vegetables",
  "category_icon": "🥬",
  "emoji": "🧄",
  "level": "high",
  "serving": null,
  "portions": null,
  "fodmap_types": ["fructans"],
  "reasons": ["Very high in fructans", "Even small amounts trigger symptoms"],
  "alternatives": ["Garlic-infused oil", "Chives", "Asafoetida"]
}
```

Field meanings:

- `level` is the headline traffic-light: `low` (green, safe), `moderate` (amber, limit), `high` (red, avoid)
- `serving` is the safe serving size when one is specified (e.g. `"100ml"`, `"1 tbsp"`)
- `portions` is a thresholds object for foods whose level changes with quantity — e.g. `{"low": "50g", "moderate": "100g", "high": "150g+"}`. When present, this is the most important field to surface
- `fodmap_types`, `reasons`, `alternatives` are only populated for foods that need the extra context (usually high-FODMAP and portion-dependent foods, ~73 of the 296 entries)

## How to answer

### Single-food check

1. Find the food by exact name match first, then case-insensitive substring match
2. If not found, say so plainly — do not guess a FODMAP status from general knowledge. The user is on a restrictive diet; wrong answers have consequences
3. If found, lead with the verdict in plain language, then the portion info, then the "why" if relevant

**Template — low FODMAP food:**
> ✅ **{name}** is low FODMAP — safe to eat. {If `serving` is set: "Keep portions around {serving}."}

**Template — moderate FODMAP food:**
> ⚠️ **{name}** is moderate FODMAP — limit your portion. {If `serving` or `portions` is set, specify the safe amount.}

**Template — high FODMAP food:**
> ❌ **{name}** is high FODMAP — best avoided, especially during elimination phase.
>
> *Why:* {reasons joined naturally}
>
> *Try instead:* {alternatives joined naturally}

**Template — portion-dependent food:**
> 🔶 **{name}** depends on portion:
> - Up to {portions.low}: low FODMAP
> - {portions.moderate}: moderate
> - {portions.high} or more: high
>
> {If alternatives exist, mention one option for bigger servings.}

### Multi-food check (e.g. fridge inventory, shopping list)

Group the foods by level and present as a compact list:

> **✅ Safe as-is:** {low foods}
> **⚠️ Limit the portion:** {moderate foods, with their safe serving}
> **❌ Skip or swap:** {high foods, with alternatives in parentheses}
> **❓ Not in the database:** {anything not found}

### Recipe review

Scan the ingredient list. For each ingredient:
- If low: don't mention it (reduce noise)
- If moderate or high: flag it with the verdict and a one-line fix
- End with a verdict for the whole recipe: ✅ as-is, ⚠️ with tweaks, or ❌ needs rework

### Substitution

Look up the food. If `alternatives` is populated, list them. If not (which happens for many low-FODMAP foods where substitution isn't the question), gently ask what the user is trying to avoid about it — they may have a different constraint (lactose, gluten, etc.).

### Category browse

Filter the array by `category` and by `level`. For "low FODMAP fruits", return all entries where `category === "fruits"` and `level === "low"`, sorted alphabetically. Keep the list scannable — names only, emojis if helpful, no details unless asked.

## Tone and framing

- Be direct. The user wants an answer, not a lecture. Lead with the verdict, put context below.
- Don't moralize about the diet. If someone asks "can I eat X", don't add unsolicited "but you should also consider..." unless it's a portion-dependent food where the nuance actually matters.
- Use the emoji/traffic-light consistently (✅ ⚠️ ❌ 🔶) — it's the visual shorthand users associate with FODMAP apps.
- Don't quote Monash or claim medical authority. Phrase findings as "this food is listed as high FODMAP" not "you must not eat this".
- If a food isn't in the database, say so. Don't invent a ruling.

## Limits and disclaimers

State these only when relevant — not at the start of every answer:

- The data is a snapshot, not a substitute for the Monash FODMAP app or a dietitian
- FODMAP tolerance varies by person — what's "moderate" on paper may be fine or may trigger symptoms individually
- The low-FODMAP diet is a **3-phase protocol** (elimination → reintroduction → personalization). Prolonged strict elimination harms the gut microbiome. If the user seems to be stuck in phase 1 for more than 6 weeks, gently mention that reintroduction is supposed to start
- For medical questions, defer to a dietitian

## Personalization (optional, advanced)

If the user has previously mentioned extra exclusions in the conversation (e.g. "I also avoid dairy and gluten"), filter the results to respect those too. A `low` FODMAP food that contains gluten is still off-limits for that user. Keep a lightweight mental model of their exclusions across the conversation; don't store anything persistently.

## Examples

**Example 1 — simple lookup:**
> User: Can I eat lentils?
>
> Assistant: ❌ **Lentils** are high FODMAP — best avoided during elimination.
>
> *Why:* They're high in GOS (galacto-oligosaccharides), which ferment in the gut.
>
> *Try instead:* Canned lentils, rinsed thoroughly (46g / ¼ cup is considered low). Firm tofu and tempeh are also good protein swaps.

**Example 2 — portion-dependent:**
> User: What about avocado?
>
> Assistant: 🔶 **Avocado** depends on portion:
> - Up to 30g (about 2 tablespoons): low FODMAP
> - 45g: moderate
> - 80g or more: high in sorbitol
>
> Small slices on toast are fine; half an avocado in guacamole isn't.

**Example 3 — fridge inventory:**
> User: I have chicken, onions, rice, broccoli, and an apple. What can I make?
>
> Assistant:
> **✅ Safe as-is:** Chicken, rice
> **⚠️ Limit the portion:** Broccoli (up to 75g / ¾ cup)
> **❌ Skip or swap:** Onion (use garlic-infused oil + chives), apple (try an orange or kiwi)
>
> A stir-fry with chicken, rice, broccoli florets, and garlic-infused oil would work well.
