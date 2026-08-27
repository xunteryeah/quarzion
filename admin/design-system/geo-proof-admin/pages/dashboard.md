# Admin Dashboard Override

This file overrides `../MASTER.md` for the GEO Proof administrator console.

## Visual Direction

- Use a light cosmic operations aesthetic inspired by the client portal: fog-white canvas, pale lavender and cyan ambient light, restrained glow, oversized overview headline, and layered product surfaces.
- Keep the product operational rather than promotional. Density remains high and tables stay crisp.
- Preserve one dark charcoal-violet control rail on the left so administrators can immediately distinguish this console from the client-facing portal.
- Avoid an all-black background, neon overload, heavy gradients, and decorative motion.

## Tokens

- Canvas: `#F4F3F8`
- Ink: `#18151F`
- Muted: `#6C6678`
- Violet signal: `#635BFF`
- Cyan signal: `#328FA3`
- Healthy: `#278861`
- Surface: `rgba(255,255,255,.76-.84)`
- Border: `rgba(218,213,229,.90)`
- Sidebar: `#25212F → #1D1A25`
- Radius: 8px for controls, 14-16px for operational cards, 22px for the overview hero only.

## Page Rules

- Overview headline: “系统正在运行。” with a two-line large type treatment.
- Put live status in a compact pill and keep metric figures in the mono font.
- Use glass only for major surfaces; table headers and rows must remain legible without excessive blur.
- Primary action buttons are ink-dark. Violet is reserved for active navigation, focus, system signals, and data emphasis.
- Account pool, task, exception, and audit pages retain their current information architecture and functional controls.
- All horizontal overflow must remain inside `.table-wrap`.
- At 760px the sidebar collapses to icons. At 520px toolbars stack and forms become single-column.
- Respect `prefers-reduced-motion`; no continuous decorative animation.
