# Brand source art

Reference only. **Nothing here ships** — the footer icons are inline SVG in
`src/components/SocialLinks.astro`, and these are the files those glyphs came
out of, kept so a later change can be checked against the originals.

| File | What was taken from it |
| --- | --- |
| `Instagram_logo_2022.svg` | The white cutout path — the camera outline alone. The gradient squircle behind it was dropped. |
| `Octicons-mark-github.svg` | The single path, verbatim. Only the fill changed. |
| `LinkedIn_icon.svg.webp` | Nothing. It is a raster image despite the `.svg` in its name, so the `in` glyph in the component was **authored**, not converted. |

Two deliberate deviations from the platforms' brand guidelines, both to keep the
marks inside this site's rules:

- Every glyph is reduced to one colour and inherits `currentColor`, so it can be
  tinted from the magenta→volt ramp on hover. Instagram permits a one-colour
  glyph; the gradient badge would have been the only colour on the site arriving
  from outside that ramp.
- LinkedIn's rounded-square container is dropped and only the `in` kept. The
  brief bans rounded corners, and that bug would otherwise have owned the only
  ones on the site.
