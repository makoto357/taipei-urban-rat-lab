# Taipei Rat Lab — English research-platform video

This is a second, independently editable video. The Chinese short video's entry point, scenes, timing, theme, capture files, audio analysis, render commands, and output names are unchanged.

## Preview and render

From this `video/` directory:

```sh
npm run dev:en
npm run render:en
npm run render:en:nobgm
npm run render:en:music
```

The English entry point is `src/en-2min/index.tsx`. The original remains `src/index.ts` (`npm run dev`, `npm run render`).

| English composition                | Audio    | Output                                              |
| ---------------------------------- | -------- | --------------------------------------------------- |
| `TaipeiRatLabEnglish2Min`          | BGM only | `out/en-2min/taipei-rat-lab-english.mp4`            |
| `TaipeiRatLabEnglish2MinNoBgm`     | Silent   | `out/en-2min/taipei-rat-lab-english-nobgm.mp4`      |
| `TaipeiRatLabEnglish2MinMusicOnly` | BGM only | `out/en-2min/taipei-rat-lab-english-music-only.mp4` |

All three are 1920×1080, 30 fps, 3,429 frames / 114.30 seconds. Product screenshot windows are 14:9. Maps remain static within each capture. Only form contents scroll. Native Chinese product UI is explained by English titles and scene cards; this does not implement product localization. The film uses music with fade-in/out, without bottom captions or spoken narration. Essential model limitations, survey caveats, and simulated-data disclosures remain in the scene cards.

## Where to edit

- `src/en-2min/content.json`: English chapter labels, headings, scene copy, and scene bar ranges.
- `src/en-2min/Scenes.tsx`: scene layouts and animation.
- `src/en-2min/timing.ts`: frame rounding, audio offset, and scene timing.
- `src/en-2min/Main.tsx`: picture, BGM mix, and progress line.
- `public/en-2min/`: new captures, extracted synthetic example, and provenance manifests.
- `analysis/fun-time.en-2min.analysis.json`: new music analysis; original analysis remains intact.

Existing Chinese form screenshots in `public/tex/` are reused read-only. No new dependencies were added.

The opening has its own editorial layout: a large three-line headline and a quiet evidence note balance the updated homepage capture. `public/en-2min/home.png` is captured at 1344×864 (14:9), keeping desktop navigation visible. Refresh just this image with `npm run capture:en:home`; the command merges its provenance entry without recapturing other screens or modifying the Chinese video's `public/tex/home.png`.

The second and final slides use the project name **Taipei Rat Lab**. The second slide restores the original orange background, cream title card, hard shadow, and four category badges. The closing restores the three-capture montage, central closing message, and prototype disclosure.

The dedicated `/risk-model` page is distinct from the risk-model map tab. Its scene plays a 20.97-second UI recording: scroll to the factors, click a factor checkbox, scroll to the connectivity simulator, click underground and ground mode buttons, then scroll to data and limitations. Refresh the recording with `npm run capture:en:model:motion`. Static reference captures remain available via `npm run capture:en:model`. Both commands preserve the other captures.

`capture/capture-model-motion.mjs` records 629 native browser frames at 1344×864 and encodes a silent 30 fps H.264 video using the installed Remotion FFmpeg package. It verifies the changed example score and pressed button states. A capture-only pointer makes the real clicks visible without changing or intercepting application controls. It uses local UI and blocks cloud requests. Temporary JPEG frames are removed after encoding. `risk-model-demo.json` records scroll positions, control events, phase boundaries, and frame count. The composition plays the muted recording with BGM as its only audio source.

## Music remap

The previous 20 ms analysis implied 125 BPM. A new 10 ms onset analysis fits a continuous tempo/phase grid over the first **125 seconds**, yielding **126 BPM**, offset **0.20 seconds**. This is a pulse-grid estimate; the analysis does not automatically identify musical downbeats.

The English track trims the first 6 audio frames. All scene boundaries are rounded from absolute bar positions, avoiding accumulated rounding drift. Sixty bars produce 114.30 seconds at 30 fps. Observed energy changes in the source guide the edit:

| Source time | Energy change | Editorial use                                              |
| ----------- | ------------- | ---------------------------------------------------------- |
| 30.68 s     | Drop          | Observations: slow down and distinguish evidence sources   |
| 36.39 s     | Return        | Transition toward environmental context                    |
| 61.15 s     | Rise          | Interactive model explanation and factor example           |
| 76.39 s     | Drop          | Hold the model interpretation before the research overview |
| 91.63 s     | Return        | Research evidence builds toward long-term validation       |
| 122.10 s    | Drop          | Original 64-bar endpoint; music now ends earlier at bar 60  |

Music attribution remains **Fun Time — Nikita Kondrashev (leberch), Pixabay asset 355594**; see `public/AUDIO.md` and `DESIGN.md`. The English composition reuses the same BGM file read-only. Music fades in/out; the default export contains no speech.

Music ends at **bar 60 (frame 3,429 / 114.30 seconds)**, with a one-second fade ending there. Adjust `BGM_END_FRAME` and `BGM_FADE_OUT_FRAMES` in `src/en-2min/timing.ts` to change this. The picture duration follows the final scene in `content.json`, currently also ending at bar 60.

## Story and data boundaries

| Bars  | Chapter                                                         |
| ----- | --------------------------------------------------------------- |
| 0–4   | Where should we investigate next?                               |
| 4–8   | Taipei Rat Lab — redesigned title slide                         |
| 8–12  | Citizen reporting / form scroll                                 |
| 12–16 | Structured field survey / form scroll                           |
| 16–20 | Observations tab and source distinctions                        |
| 20–24 | Environmental context                                           |
| 24–28 | Corrected A–B–C connectivity graph; D/E/F lower association     |
| 28–38 | Recorded `/risk-model` walkthrough: scrolling and real controls |
| 38–44 | Model map: 3:3:1:1 factors, connectivity, relative ranking      |
| 44–48 | Short field-research overview: sampling, recapture, genetics    |
| 48–52 | Proposed long-term research cycle                               |
| 52–56 | Literature list → research detail, after the research programme |
| 56–60 | Taipei Rat Lab — redesigned closing and data disclosure         |

The film has 13 scenes. Field research is a **7.62-second overview**, shortened from 13.33 seconds. It keeps the three method names, their role in long-term validation, and the simulation/route caveat. The freed time goes to the interactive model-page walkthrough. Individual IDs, trapping counts, dates, and specimen identifiers do not appear in the presentation. Detailed synthetic fixtures remain available for future editing.

The research maps use the repository's `synthetic_mock` data, including the Daan recapture and genetic layers. Genetic lines represent inferred relatedness, not observed travel. Long-term monitoring is explicitly a **proposed research workflow**, not a completed seasonal study or an existing timeline feature. Literature follows this section so viewers can return to the methods, findings, limitations, and original sources behind the research. No pathogen surveillance capability is claimed.

Model language follows the current implementation: only observation factors propagate, at most two links; surface, sewer, and stormwater paths remain separate; the strongest applicable path is retained. Food and shelter remain local. L1–L5 are relative ranks for the current factor selection; colours across different factor selections are not absolute comparisons. There is no numerical distance-decay formula scene.

The final card discloses: **Research prototype · Not an official government system. Survey, sampling, CMR, and genetic demonstration data are simulated.**

## Rebuild captures and research example

Start the website locally on `http://127.0.0.1:4173`, then:

```sh
npm run analyze:en
npm run capture:en
npm run capture:en:model:motion
npm run prepare:en
npm run verify:en
npm run typecheck
npm run preview:en
```

Capture uses a fresh signed-out browser context, blocks Firebase cloud data/auth/storage requests, and uses local repository data. It does not submit forms or read test-account credentials. The English capture folder has its own manifest.

The generated AI voice clips, their manifest, speech-generation utility, spoken script, and SRT export have been removed. Preparation and rendering do not recreate them. Edit the English headings and descriptions directly in `content.json`, and annotations in `Scenes.tsx`.

`prepare:en` refreshes the linked synthetic research example. `verify:en` checks music coverage, scene IDs, missing assets, gaps, overlaps, and the walkthrough's duration, silent audio setting, and recorded control events. Recapture the motion clip if its scene duration changes. `preview:en` renders a still from every chapter and an overview contact sheet at `out/en-2min/storyboard.png`.
