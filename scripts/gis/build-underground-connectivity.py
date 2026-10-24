#!/usr/bin/env python3
"""Build an exploratory block graph from Taipei sewer/stormwater pipes."""

from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

import geopandas as gpd

ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DATA = ROOT / "apps" / "web" / "public" / "data"
LANDUSE_PATH = PUBLIC_DATA / "taipei-landuse-detail-merged.geojson"
OUTPUT_PATH = PUBLIC_DATA / "underground-connectivity.json"
TARGET_CRS = "EPSG:3826"
MAX_MANHOLE_TO_BLOCK_M = 30.0
DISTANCE_DECAY_M = 100.0
MAX_HOPS = 2
EXCLUDED_LAND_USES = ("河川區", "河道用地", "行水區", "高速公路用地")

SYSTEM_FILES = (
    (
        "sewer",
        PUBLIC_DATA / "taipei-sewer-pipes.geojson",
        PUBLIC_DATA / "taipei-sewer-manholes.geojson",
    ),
    (
        "stormwater",
        PUBLIC_DATA / "taipei-stormwater-pipes.geojson",
        PUBLIC_DATA / "taipei-stormwater-manholes.geojson",
    ),
)


def normalize_identifier(value: object) -> str | None:
    if value is None:
        return None
    identifier = str(value).strip()
    return identifier if identifier and identifier.lower() != "nan" else None


def nearest_component(point, components, spatial_index) -> int | None:
    candidates = spatial_index.query(
        point.buffer(MAX_MANHOLE_TO_BLOCK_M), predicate="intersects"
    )
    if len(candidates) == 0:
        return None
    index = min(
        (int(candidate) for candidate in candidates),
        key=lambda candidate: components.geometry.iloc[candidate].distance(point),
    )
    return (
        index
        if components.geometry.iloc[index].distance(point)
        <= MAX_MANHOLE_TO_BLOCK_M
        else None
    )


def main() -> None:
    landuse = gpd.read_file(LANDUSE_PATH).to_crs(TARGET_CRS)
    landuse = landuse[landuse.geometry.notna() & ~landuse.geometry.is_empty].copy()
    excluded = landuse["使用分區"].fillna("").map(
        lambda value: any(name in str(value) for name in EXCLUDED_LAND_USES)
    )
    landuse = landuse[~excluded].copy()
    landuse["blockId"] = landuse["編號"].astype(str)
    components = landuse[["blockId", "geometry"]].explode(index_parts=True)
    components = components.reset_index(names=["featureIndex", "componentIndex"])
    components["componentId"] = (
        components["blockId"].astype(str)
        + ":"
        + components["componentIndex"].astype(str)
    )
    components.geometry = components.geometry.make_valid()
    component_index = components.sindex

    network_pair_weights: dict[str, dict[tuple[int, int], float]] = {}
    stats = {
        "pipes": 0,
        "manholes": 0,
        "mappedManholes": 0,
        "unmappedManholes": 0,
        "sameBlockPipes": 0,
        "unmappedPipes": 0,
        "invalidEndpointIds": 0,
        "unknownEndpointPipes": 0,
    }
    system_counts: dict[str, dict[str, int]] = {}

    for system, pipe_path, manhole_path in SYSTEM_FILES:
        manholes = gpd.read_file(manhole_path).to_crs(TARGET_CRS)
        pipes = gpd.read_file(pipe_path).to_crs(TARGET_CRS)
        manholes = manholes[
            manholes.geometry.notna() & ~manholes.geometry.is_empty
        ].copy()
        pipes = pipes[pipes.geometry.notna() & ~pipes.geometry.is_empty].copy()

        if (
            "system" in manholes
            and not manholes["system"].fillna(system).eq(system).all()
        ):
            raise ValueError(f"{manhole_path.name} contains a non-{system} manhole")
        if "system" in pipes and not pipes["system"].fillna(system).eq(system).all():
            raise ValueError(f"{pipe_path.name} contains a non-{system} pipe")

        manhole_ids = manholes["manholeId"].dropna().astype(str)
        duplicated_ids = manhole_ids[manhole_ids.duplicated()].unique().tolist()
        if duplicated_ids:
            raise ValueError(
                f"{manhole_path.name} has duplicate manhole IDs: {duplicated_ids[:5]}"
            )
        known_manhole_ids = set(manhole_ids)

        pair_weights: dict[tuple[int, int], float] = defaultdict(float)
        current_counts = {
            "pipes": len(pipes),
            "manholes": len(manholes),
            "mappedManholes": 0,
            "unmappedManholes": 0,
            "sameBlockPipes": 0,
            "unmappedPipes": 0,
            "invalidEndpointIds": 0,
            "unknownEndpointPipes": 0,
        }
        stats["manholes"] += len(manholes)
        stats["pipes"] += len(pipes)

        manhole_components: dict[str, int] = {}
        for row in manholes.itertuples():
            manhole_id = normalize_identifier(row.manholeId)
            if manhole_id is None:
                current_counts["unmappedManholes"] += 1
                stats["unmappedManholes"] += 1
                continue
            component = nearest_component(row.geometry, components, component_index)
            if component is None:
                current_counts["unmappedManholes"] += 1
                stats["unmappedManholes"] += 1
                continue
            current_counts["mappedManholes"] += 1
            stats["mappedManholes"] += 1
            manhole_components[manhole_id] = component

        for row in pipes.itertuples():
            upstream_id = normalize_identifier(row.upstreamId)
            downstream_id = normalize_identifier(row.downstreamId)
            if upstream_id is None or downstream_id is None:
                current_counts["invalidEndpointIds"] += 1
                stats["invalidEndpointIds"] += 1
                continue
            if (
                upstream_id not in known_manhole_ids
                or downstream_id not in known_manhole_ids
            ):
                current_counts["unknownEndpointPipes"] += 1
                stats["unknownEndpointPipes"] += 1
                continue

            # Connectivity is established only by the pipe's explicit endpoint IDs.
            # Geometry proximity between unrelated pipes is never used as a fallback.
            upstream = manhole_components.get(upstream_id)
            downstream = manhole_components.get(downstream_id)
            if upstream is None or downstream is None:
                current_counts["unmappedPipes"] += 1
                stats["unmappedPipes"] += 1
                continue
            if upstream == downstream:
                current_counts["sameBlockPipes"] += 1
                stats["sameBlockPipes"] += 1
                continue
            try:
                source_length = float(row.lengthM)
            except (TypeError, ValueError):
                source_length = math.nan
            length = (
                source_length
                if math.isfinite(source_length)
                else row.geometry.length
            )
            weight = math.exp(-max(length, 1.0) / DISTANCE_DECAY_M)
            pair = (min(upstream, downstream), max(upstream, downstream))
            pair_weights[pair] = max(pair_weights[pair], weight)

        network_pair_weights[system] = pair_weights
        current_counts["edges"] = len(pair_weights)
        system_counts[system] = current_counts

    networks = {
        system: {
            "edges": [
                [left, right, round(weight, 6)]
                for (left, right), weight in sorted(pair_weights.items())
            ],
            "counts": system_counts[system],
        }
        for system, pair_weights in network_pair_weights.items()
    }
    # Keep a union edge list for backwards compatibility. The web model uses the
    # named networks above so a two-hop path cannot switch systems.
    union_pair_weights: dict[tuple[int, int], float] = defaultdict(float)
    for pair_weights in network_pair_weights.values():
        for pair, weight in pair_weights.items():
            union_pair_weights[pair] = max(union_pair_weights[pair], weight)
    edges = [
        [left, right, round(weight, 6)]
        for (left, right), weight in sorted(union_pair_weights.items())
    ]
    output = {
        "model": "underground-connectivity-v2",
        "status": "exploratory_unvalidated",
        "generatedAt": "2026-10-24",
        "parameters": {
            "crs": TARGET_CRS,
            "maxManholeToBlockM": MAX_MANHOLE_TO_BLOCK_M,
            "distanceDecayM": DISTANCE_DECAY_M,
            "maxHops": MAX_HOPS,
            "direction": "undirected_potential_connectivity",
            "networkIsolation": "sewer_and_stormwater_propagated_separately",
            "pipeConnectivity": "explicit_upstream_and_downstream_manhole_ids_only",
            "excludedLandUses": list(EXCLUDED_LAND_USES),
        },
        "counts": {
            "blocks": len(landuse),
            "components": len(components),
            "edges": len(edges),
            **stats,
            "bySystem": system_counts,
        },
        "blockIds": components["blockId"].astype(str).tolist(),
        "componentIds": components["componentId"].astype(str).tolist(),
        "edges": edges,
        "networks": networks,
    }
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(json.dumps(output["counts"], ensure_ascii=False, indent=2))
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
