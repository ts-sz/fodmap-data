# fodmap-data

A clean, machine-readable mirror of the [gut-check](https://github.com/gut-check/gut-check.github.io) FODMAP food database, auto-synced every Monday.

**Total foods:** 296 · **Low FODMAP:** 229 · **Moderate:** 27 · **High:** 40

## Data URL

```
https://raw.githubusercontent.com/YOUR_USERNAME/fodmap-data/main/fodmap.json
```

Replace `YOUR_USERNAME` with your GitHub username.

### Quick examples

**curl:**
```bash
curl -s https://raw.githubusercontent.com/YOUR_USERNAME/fodmap-data/main/fodmap.json | jq '.[] | select(.name=="Garlic")'
```

**JavaScript (browser or Node):**
```javascript
const foods = await fetch('https://raw.githubusercontent.com/YOUR_USERNAME/fodmap-data/main/fodmap.json').then(r => r.json());
const garlic = foods.find(f => f.name === 'Garlic');
console.log(garlic.level);  // "high"
console.log(garlic.alternatives);  // ["Garlic-infused oil", "Chives", "Asafoetida"]
```

## Schema

Each entry in `fodmap.json`:

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

| Field | Type | Meaning |
|---|---|---|
| `name` | string | Food name |
| `category` | string | One of: `beverages`, `condiments`, `dairy`, `fruits`, `grains`, `proteins`, `nuts_seeds`, `legumes`, `prepared`, `alcohol`, `vegetables` |
| `category_title` | string | Human-readable category name |
| `emoji` | string or null | Visual icon |
| `level` | string | `"low"` (safe), `"moderate"` (limit), `"high"` (avoid) |
| `serving` | string or null | Safe serving size if specified |
| `portions` | object or null | Thresholds for portion-dependent foods (keys: `low`, `moderate`, `high`) |
| `fodmap_types` | array or null | Which FODMAPs: `fructans`, `lactose`, `fructose`, `gos`, `sorbitol`, `mannitol` |
| `reasons` | array or null | Why it's problematic (populated mostly for high/portion-dependent foods) |
| `alternatives` | array or null | Safer substitutes |

`fodmap.meta.json` contains sync metadata (last sync date, upstream commit, totals).

## How the sync works

A GitHub Actions workflow runs every Monday at 06:00 UTC (and can be triggered manually from the Actions tab). It:

1. Clones the upstream `gut-check` repo
2. Parses `foodData` and `foodDetails` from their `index.html`
3. Flattens and sorts into a clean JSON array
4. Commits only if the data actually changed

See [`.github/workflows/weekly-sync.yml`](.github/workflows/weekly-sync.yml) and [`scripts/extract.js`](scripts/extract.js).

## Credits

- Upstream project: [gut-check](https://github.com/gut-check/gut-check.github.io) (MIT)
- FODMAP classifications: [Monash University FODMAP research](https://www.monashfodmap.com)

## Disclaimer

For informational purposes only. FODMAP tolerance varies between individuals and the data here is a simplified snapshot — always consult a registered dietitian before starting a low-FODMAP diet, and prefer the official Monash FODMAP app for authoritative portion guidance.

## License

MIT — see [LICENSE](LICENSE). Applies to the extraction code and JSON structure. The underlying FODMAP food data originates from Monash University research and is used for informational purposes only.
