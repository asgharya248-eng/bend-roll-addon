# Tut Bend Effect — Product Page

Single-page site for the **Tut Bend Effect** Blender addon (Geometry Nodes bend & roll).

## Structure

```
index.html      page markup
styles.css      layout + layers
script.js       scroll-driven playback engine
frames/         124 WebP frames (0081–0204), alpha-preserving
download/       tut_bend_effect.zip (the addon)
```

## Layering

1. **Download button** sits *behind* the canvas (`.dl-behind`).
2. **Canvas** renders the frame sequence on top. Frames become transparent
   as the laptop screen rolls away, revealing the button through the alpha.
3. **Description** column (English) is fixed on the left.

Playback is a pure function of scroll position: scroll down plays forward,
scroll up plays in reverse.

## Run locally

```
python -m http.server 8000
```

Then open <http://localhost:8000>.
