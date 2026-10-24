# CMR and genetic mock-data spatial revision

Generated deterministically on 2026-10-23. Distances were calculated in TWD97 / TM2 zone 121 (EPSG:3826); JSON coordinates remain CRS84. The inputs were the three requested GIS datasets. Road overlap is not accumulated: each route uses the widest known intersected road once, and width 0 remains unknown.

| Metric | Before | After |
|---|---:|---:|
| CMR count | 30 | 30 |
| CMR Q25 / median / Q75 | 4134.9 / 6953.2 / 8643.5 m | 8.8 / 17.2 / 37.1 m |
| CMR maximum | 12735.9 m | 148.7 m |
| CMR >200 m | 30 | 0 |
| CMR bins 0–20 / 20–50 / 50–100 / 100–200 m | — | 16 / 10 / 3 / 1 (53.3% / 33.3% / 10.0% / 3.3%) |
| Related-pair Q25 / median / Q75 | 0.0 / 971.8 / 2470.8 m | 9.9 / 17.6 / 30.7 m |
| Related-pair maximum | 5213.1 m | 178.8 m |
| Related pairs >330 m | 47 | 0 |
| Cross-block related pairs | 48 | 11 |
| Genetic relationship documents | 72 | 62 |
| Genetic individuals in positive pairs | 48 / 60 | 44 / 98 |
| Operational blocks / maximum sites per block | 60 / 1 | 62 / 3 |

## Changes and remaining limitations

- Preserved all seven collection files, schemas, timestamps, analysis IDs, capture/genetic references, and every retained document ID. Removed 51 arbitrary relationship documents rather than treating the relationship collection as an exhaustive pair matrix.
- Left official observations and control records byte-for-byte unchanged; their originals are also in the backup.
- Relocated complete trapping-site records and all nested event/capture coordinates, rather than changing isolated recapture points.
- Kept known-individual genetic samples attached to their recorded first-capture events. Environmental samples still have no rat identity.
- Operational block IDs use the containing merged land-use polygon as a proxy for a street block. This is a synthetic constraint, not an official block identifier.
- Road-crossing weights are candidate-selection heuristics, not measured crossing probabilities or biological limits.
- The relationship graph uses deterministic family roles for parent-offspring, full-sibling, and half-sibling edges; “other_related” and “uncertain” remain intentionally nonspecific.
- The relationship collection contains positive or potentially positive pairs only. Individuals absent from this collection may still have valid genetic samples.
- Ten extended-kin relationships connect nearby Daan blocks; they are kept as “other_related” rather than assigning unsupported direct family roles.
- Genetic sampling overlaps 45 of 60 CMR encounters (75%): every CMR individual has a first-capture specimen and fifteen also have a recapture specimen. Capture/mark records remain more numerous than genetic specimens.
