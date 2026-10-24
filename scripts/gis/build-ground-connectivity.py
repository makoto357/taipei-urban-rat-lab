#!/usr/bin/env python3
"""Build the exploratory two-hop ground-connectivity factor.

Requires geopandas, shapely, pyproj and pyogrio. Run from the repository root.
The output is a compact block-id lookup consumed by the web risk model.
"""

from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString
from shapely.ops import nearest_points

ROOT = Path(__file__).resolve().parents[2]
PREPARE = ROOT.parent / "prepare" / "data" / "processed" / "geojson"
PUBLIC_DATA = ROOT / "apps" / "web" / "public" / "data"

LANDUSE_PATH = PUBLIC_DATA / "taipei-landuse-detail-merged.geojson"
ROAD_AREA_PATH = PREPARE / "taipei-road-8m.geojson"
ROAD_LINE_PATH = PREPARE / "taipei-road-size.geojson"
OUTPUT_PATH = PUBLIC_DATA / "ground-connectivity.json"

TARGET_CRS = "EPSG:3826"
CANDIDATE_DISTANCE_M = 100.0
DISTANCE_DECAY_M = 50.0
MAX_HOPS = 2
UNKNOWN_ROAD_WEIGHT = 0.25
EXCLUDED_LAND_USES = ("河川區", "河道用地", "行水區", "高速公路用地")


def parse_width(value: object) -> float | None:
    if isinstance(value, (int, float)) and math.isfinite(value) and value > 0:
        return float(value)
    match = re.search(r"\d+(?:\.\d+)?", str(value or ""))
    if not match:
        return None
    width = float(match.group())
    return width if width > 0 else None


def road_weight(width: float) -> float:
    if width < 8:
        return 1.0
    if width < 12:
        return 0.60
    if width < 20:
        return 0.25
    if width < 30:
        return 0.08
    return 0.01


def barrier_for_connector(
    connector: LineString,
    road_areas: gpd.GeoDataFrame,
    road_area_index,
    road_lines: gpd.GeoDataFrame,
    road_line_index,
) -> tuple[float, list[float], bool]:
    area_hits = road_area_index.query(connector, predicate="intersects")
    if len(area_hits):
        unique_roads: dict[str, float | None] = {}
        for index in area_hits:
            row = road_areas.iloc[index]
            road_id = str(row.get("ROAD_ID") or f"area:{index}")
            width = parse_width(row.get("ROADWIDTH"))
            previous = unique_roads.get(road_id)
            if previous is None or (width is not None and width > previous):
                unique_roads[road_id] = width
        widths = [width for width in unique_roads.values() if width is not None]
        unknown = any(width is None for width in unique_roads.values())
        weight = math.prod(road_weight(width) for width in widths)
        if unknown:
            weight *= UNKNOWN_ROAD_WEIGHT
        return weight, widths, unknown

    line_hits = road_line_index.query(connector, predicate="intersects")
    if len(line_hits):
        widths = [
            width
            for index in line_hits
            if (width := parse_width(road_lines.iloc[index].get("road_width")))
            is not None
        ]
        unknown = len(widths) < len(line_hits)
        if not widths:
            return UNKNOWN_ROAD_WEIGHT, [], True
        # The centerline file is fallback evidence; use the strongest crossed barrier once.
        weight = min(road_weight(width) for width in widths)
        if unknown:
            weight *= UNKNOWN_ROAD_WEIGHT
        return weight, widths, unknown

    return 1.0, [], False


def build_graph(
    components: gpd.GeoDataFrame,
    road_areas: gpd.GeoDataFrame,
    road_lines: gpd.GeoDataFrame,
) -> tuple[dict[int, list[tuple[int, float]]], dict[str, int]]:
    graph: dict[int, list[tuple[int, float]]] = defaultdict(list)
    stats = {"candidateEdges": 0, "acceptedEdges": 0, "unknownRoadEdges": 0}
    component_index = components.sindex
    road_area_index = road_areas.sindex
    road_line_index = road_lines.sindex

    for left_index, left in enumerate(components.geometry):
        candidates = component_index.query(
            left.buffer(CANDIDATE_DISTANCE_M), predicate="intersects"
        )
        for right_index in candidates:
            right_index = int(right_index)
            if right_index <= left_index:
                continue
            stats["candidateEdges"] += 1
            right = components.geometry.iloc[right_index]
            gap = left.distance(right)
            if not math.isfinite(gap) or gap > CANDIDATE_DISTANCE_M:
                continue
            start, end = nearest_points(left, right)
            if start.is_empty or end.is_empty:
                continue
            connector = LineString([start, end])
            barrier, _, unknown = barrier_for_connector(
                connector,
                road_areas,
                road_area_index,
                road_lines,
                road_line_index,
            )
            effective_distance = max(gap, 1.0)
            weight = math.exp(-effective_distance / DISTANCE_DECAY_M) * barrier
            if weight <= 0:
                continue
            graph[left_index].append((right_index, weight))
            graph[right_index].append((left_index, weight))
            stats["acceptedEdges"] += 1
            if unknown:
                stats["unknownRoadEdges"] += 1
    return graph, stats


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

    road_areas = gpd.read_file(ROAD_AREA_PATH).to_crs(TARGET_CRS)
    road_areas = road_areas[road_areas.geometry.notna() & ~road_areas.geometry.is_empty]
    road_lines = gpd.read_file(ROAD_LINE_PATH).to_crs(TARGET_CRS)
    road_lines = road_lines[road_lines.geometry.notna() & ~road_lines.geometry.is_empty]

    graph, graph_stats = build_graph(components, road_areas, road_lines)
    edges = [
        [left, right, round(weight, 6)]
        for left, neighbors in graph.items()
        for right, weight in neighbors
        if left < right
    ]

    output = {
        "model": "ground-connectivity-v2",
        "status": "exploratory_unvalidated",
        "generatedAt": "2026-10-24",
        "parameters": {
            "crs": TARGET_CRS,
            "candidateDistanceM": CANDIDATE_DISTANCE_M,
            "distanceDecayM": DISTANCE_DECAY_M,
            "maxHops": MAX_HOPS,
            "unknownRoadWeight": UNKNOWN_ROAD_WEIGHT,
            "excludedLandUses": list(EXCLUDED_LAND_USES),
        },
        "counts": {
            "blocks": len(landuse),
            "components": len(components),
            **graph_stats,
        },
        "blockIds": components["blockId"].astype(str).tolist(),
        "componentIds": components["componentId"].astype(str).tolist(),
        "edges": edges,
    }
    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(json.dumps(output["counts"], ensure_ascii=False, indent=2))
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
