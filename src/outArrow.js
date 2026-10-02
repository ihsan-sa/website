// The ↗ that ends a link leaving the site, drawn as an SVG so every device shows the same
// small arrow (iOS draws the text glyph from a fallback font, with a long shaft). The static
// build uses the same markup string; keep the two in step.
const OUT_ARROW_SVG =
  '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10L10 2M4 2H10V8"/></svg>';

module.exports = { OUT_ARROW_SVG };
