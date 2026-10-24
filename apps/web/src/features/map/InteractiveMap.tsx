import { useEffect } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useDataMap, type DataLayerKey } from "./engine/useDataMap";
import "./interactive-map.css";

const ENGINE_LAYERS_BY_UI_KEY: Record<string, DataLayerKey[]> = {
  "cit-rat": ["ratReports"],
  "cit-bait": ["baitReports"],
  gov: [],
  "gov-evidence": ["officialEvidence"],
  "gov-excluded": ["officialNoEvidence"],
  "bait-citizen": ["baitReports"],
  control: [],
  "control-contraceptive": ["controlContraceptive"],
  "control-rodenticide": ["controlRodenticide"],
  "control-unknown": ["controlUnknown"],
  market: ["markets"],
  restaurant: ["restaurants"],
  "trash-bin": ["trashBins"],
  "garbage-stop": ["garbageStops"],
  park: ["parks"],
  "vacant-space": ["vacantSpaces"],
  sewer: ["sewer"],
  stormwater: ["stormwater"],
  capture: ["captureEncounters"],
  "genetic-relationship": ["geneticSamples", "geneticRelationshipNodes"],
  "genetic-parent": ["geneticParentRelationships"],
  "genetic-sibling": ["geneticSiblingRelationships"],
  "genetic-other": ["geneticOtherRelationships"],
  "rat-landuse": ["ratLanduse"],
  "risk-citizen": ["riskCitizen"],
  "risk-government": ["riskGovernment"],
  "risk-food-source": ["riskFoodSource"],
  "risk-shelter": ["riskShelter"],
  "risk-ground-movement": ["riskGroundMovement"],
  "risk-underground-movement": ["riskUndergroundMovement"],
  "cmp-risk": ["ratLanduse"],
  "cmp-obs": [
    "ratReports",
    "officialEvidence",
    "officialNoEvidence",
    "riskCitizen",
    "riskGovernment",
  ],
  "cmp-bait": [
    "baitReports",
    "controlContraceptive",
    "controlRodenticide",
    "controlUnknown",
  ],
  "cmp-env": [
    "markets",
    "restaurants",
    "trashBins",
    "garbageStops",
    "parks",
    "vacantSpaces",
    "sewer",
    "stormwater",
    "riskFoodSource",
    "riskShelter",
  ],
  "cmp-research": [
    "sampleRecords",
    "captureEncounters",
    "geneticSamples",
    "geneticRelationshipNodes",
    "geneticParentRelationships",
    "geneticSiblingRelationships",
    "geneticOtherRelationships",
  ],
  "cmp-ground-movement": ["riskGroundMovement"],
  "cmp-underground-movement": ["riskUndergroundMovement"],
};

export const getEngineLayers = (uiLayerKey: string): DataLayerKey[] =>
  ENGINE_LAYERS_BY_UI_KEY[uiLayerKey] ?? [];

interface InteractiveMapProps {
  visibleDataLayers: DataLayerKey[];
  selectedDistrict: string;
}

export function InteractiveMap({
  visibleDataLayers,
  selectedDistrict,
}: InteractiveMapProps) {
  const { mapContainerRef, setVisibleDataLayers, selectDistrict } =
    useDataMap();
  const visibilityKey = [...visibleDataLayers].sort().join("|");

  useEffect(() => {
    setVisibleDataLayers(visibleDataLayers);
  }, [visibilityKey]);

  useEffect(() => {
    selectDistrict(selectedDistrict);
  }, [selectedDistrict]);

  return (
    <div
      ref={mapContainerRef}
      className="project-map absolute inset-0"
      aria-label="資料分析地圖"
    />
  );
}
