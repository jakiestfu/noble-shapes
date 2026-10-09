# Video

`@noble-shapes/video` makes educational MP4 clips from the same catalogue and renderer as the workbench. Each sequence introduces the floating, rotating model, presents short lessons, and then changes the highlighted face at a constant rate while the model keeps moving. Sections crossfade, and labeled bars show each section's duration and fill as it plays. Set `loops` to repeat that sequence within one video. A flat face remains fixed in the lower right, while the Schläfli notation and vertex, edge, and face counts stay on screen. The current clips are silent so narration or music can be added later without licensing assumptions.

The package is private to this workspace. FFmpeg with H.264 support must be available on `PATH` (or supplied with `--ffmpeg`). No YouTube credentials or upload step are involved.

From the repository root:

```sh
pnpm video:sample
pnpm --filter @noble-shapes/video sample:faces
```

Those write sample MP4s and PNG posters under `renders/video/`. The face tour example uses a violet small stellated dodecahedron and repeats the full sequence twice in 60 seconds. `renders/` is ignored by Git.

To make another clip after building the workspace packages:

```sh
pnpm --filter @noble-shapes/video render --shape cube --duration 12 --resolution 4k --output ../../renders/video/cube.mp4
```

Use a JSON config to define `chapters`, `shapeParameters`, and all rendering options. See [`examples/small-stellated-face-tour.json`](examples/small-stellated-face-tour.json). The CLI accepts overrides for the shape, length, loops, section timing, crossfade length, frame rate, size, palette, view, color, camera, rotation, float, face index, and text labels. `introFraction` and `faceTourFraction` reserve shares of each sequence; the remaining time is divided evenly among the lessons. The face tour defaults to 28% of each sequence, and `crossfadeSeconds` defaults to 0.6. A minimum of six frames per face is required. `4k` is 3840 × 2160; custom dimensions must be 16:9, even numbers, and no larger than 4K. Use `--help` for the complete list.

The vertex, edge, and face counts come directly from the selected geometry. Chapter prose and notation are supplied in the config so unusual forms can have reviewed, shape-specific explanations.
