# B-roll Slot Filler System

A production-quality, schema-validated B-roll asset retrieval system that fills Director-provided "B-roll slots" with ranked candidate clips and suggested trims.

## Scope

This system **only** generates/retrieves B-roll assets. It does NOT control:
- Timeline placement (Director's responsibility)
- Final editing or captioning (Editor's responsibility)
- Video rendering

The Director provides slots with timing and constraints; this system returns the best B-roll candidates for each slot.

## Setup

### Environment Variables

Set `PEXELS_API_KEY` in your environment:

```
PEXELS_API_KEY=your_pexels_api_key_here
```

## API Endpoint

### `POST /api/v1/broll/fill-slots`

**Auth**: Required (JWT)

### Example Request

```json
{
  "slots": [
    {
      "slotId": "slot-1",
      "startMs": 5000,
      "endMs": 10000,
      "durationTargetMs": 4000,
      "purpose": "example",
      "intent": {
        "entities": [],
        "actions": ["batting"],
        "keywords": ["cricket", "sport"],
        "visualEnergy": "dynamic",
        "query": "cricket batting action"
      },
      "styleConstraints": {
        "cropMode": "any",
        "preferTags": ["sport"],
        "avoidTags": ["slow motion"]
      },
      "priority": 0.8
    }
  ],
  "topK": 5,
  "sourcePriority": ["pexels"],
  "globalRules": {
    "minGapMsBetweenSameAsset": 60000,
    "maxReusePerVideo": 1
  }
}
```

### Example Response

```json
{
  "slotResults": [
    {
      "slotId": "slot-1",
      "candidates": [
        {
          "assetId": "pexels:12345",
          "source": "pexels",
          "license": "stock",
          "previewUrl": "https://images.pexels.com/...",
          "downloadUrl": "https://player.vimeo.com/...",
          "durationMs": 8000,
          "width": 1920,
          "height": 1080,
          "tags": [],
          "suggestedTrim": { "inMs": 300, "outMs": 4300 },
          "fit": {
            "semanticScore": 0.55,
            "keywordScore": 0.4,
            "entityScore": 0,
            "durationFit": 1,
            "cropFit": 0.7,
            "styleFit": 0.5
          },
          "overallScore": 0.582,
          "reason": "good duration fit; crop compatible"
        }
      ]
    }
  ],
  "stats": {
    "slotsProcessed": 1,
    "providerCalls": 1,
    "cacheHits": 0
  }
}
```

## Architecture

```
src/systems/broll/
├── contracts.ts          # Zod schemas & TypeScript types
├── orchestrator.ts       # Main entry point: fillBrollSlots()
├── scoring.ts            # Ranking & scoring engine
├── trim.ts               # Suggested trim computation
├── providers/
│   ├── types.ts          # Provider adapter interface
│   └── pexels.ts         # Pexels Video API adapter
├── smoke-test.ts         # Smoke test script
└── README.md             # This file
```

## Scoring Weights

| Factor         | Weight |
|---------------|--------|
| Semantic Score | 0.35   |
| Keyword Score  | 0.20   |
| Duration Fit   | 0.20   |
| Crop Fit       | 0.15   |
| Style Fit      | 0.10   |

Entity score acts as a multiplier boost: `overall *= (1 + 0.25 * entityScore)`, capped at 1.

## Quality Gate

- Candidates with `overallScore >= 0.60` pass the quality gate
- At least 1 candidate is always returned per slot (marked "low confidence" if below threshold)

## Novelty / Dedup Rules

- Same asset won't appear in multiple slots unless necessary
- Configurable via `globalRules.minGapMsBetweenSameAsset` (default 60s)
- Configurable via `globalRules.maxReusePerVideo` (default 1)

## Running the Smoke Test

```bash
npx tsx src/systems/broll/smoke-test.ts
```

## Adding New Providers

Implement the `BrollProvider` interface from `providers/types.ts` and register in `orchestrator.ts`.
