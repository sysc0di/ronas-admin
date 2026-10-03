/**
 * Hover is emulated in JavaScript instead of with the CSS `:hover`
 * pseudo-class.
 *
 * Touch browsers apply `:hover` to whatever was tapped and keep it applied
 * until the next tap somewhere else, so a phone ends up with one permanently
 * "hovered" card. Watching real pointer movement instead keeps the effect on
 * devices that have a mouse, and nowhere else.
 *
 * Opt an element in with the `data-hover-target` attribute, then style the
 * emulated state with the `is-hovered` class:
 *
 *   <a className="card" data-hover-target>...</a>
 *
 *   .card.is-hovered { ... }
 *
 * Mount `<HoverEmulation />` once, in the root layout.
 */

/** Attribute an element carries to opt into the emulated hover state. */
export const HOVER_TARGET_ATTR = "data-hover-target";

/** Class the emulation adds to every hovered `[data-hover-target]` ancestor. */
export const HOVER_CLASS = "is-hovered";

/**
 * Matches only where a mouse-like pointer that can actually hover is
 * present, so phones and tablets are excluded no matter their screen size.
 */
export const FINE_HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * Every `[data-hover-target]` ancestor of `node`, innermost first, so nested
 * targets light up together exactly as `:hover` would.
 */
export function hoverTargetsOf(node: Element | null): Element[] {
  const targets: Element[] = [];

  for (
    let element = node;
    element;
    element = element.parentElement
  ) {
    if (element.hasAttribute(HOVER_TARGET_ATTR)) {
      targets.push(element);
    }
  }

  return targets;
}
