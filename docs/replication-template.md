# Replication Template

## Goal
- Turn DLH into a reusable system for launching additional niche authority sites with the same operating model.

## Reusable Layers
1. `content-registry.json`
2. `offers.json`
3. Smart Router
4. Publer generator
5. Quality gate
6. Event taxonomy
7. Email segmentation model

## What Must Become Configurable
- brand name
- domain
- legal constraints
- topic blacklist
- board taxonomy
- CTA offers
- email segments
- image prompt style

## Template Inputs For A New Site
- `site-config.json`
- `offers.json`
- `content-rules.md`
- `board-map.json`
- `email-segments.json`

## Rollout Sequence For Future Clones
1. define niche and blacklist
2. import seed topics
3. run keyword clustering
4. generate registry
5. create content and pins
6. run quality gate
7. generate Publer final file
8. launch email engine
