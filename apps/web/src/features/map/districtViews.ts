/** 各行政區選取時地圖要移到的大致中心與縮放（概略值，只用來讓使用者更快找到位置）。 */
export const DISTRICT_VIEWS: Record<string, { center: [number, number]; zoom: number }> = {
  中正區: { center: [121.5198, 25.0324], zoom: 14 },
  大同區: { center: [121.513, 25.0633], zoom: 14 },
  中山區: { center: [121.533, 25.0685], zoom: 13.5 },
  松山區: { center: [121.5775, 25.05], zoom: 14 },
  大安區: { center: [121.5436, 25.0267], zoom: 13.5 },
  萬華區: { center: [121.499, 25.034], zoom: 14 },
  信義區: { center: [121.57, 25.03], zoom: 13.5 },
  士林區: { center: [121.525, 25.105], zoom: 12.5 },
  北投區: { center: [121.5, 25.138], zoom: 12.5 },
  內湖區: { center: [121.588, 25.083], zoom: 13 },
  南港區: { center: [121.607, 25.038], zoom: 13.5 },
  文山區: { center: [121.57, 24.988], zoom: 13 },
};
