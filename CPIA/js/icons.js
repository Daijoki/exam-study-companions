/*
 * Custom icon definitions for the CIP exam prep tool.
 *
 * All icons are defined as inline SVG strings.  Each icon uses
 * `stroke="currentColor"` so the icon will inherit the text color
 * of its parent element.  Icons are sized via the surrounding
 * container's font-size – the `width` and `height` attributes are
 * both set to `1em` so that they scale naturally alongside text.
 *
 * To add a new icon simply extend the `ICONS` object below.  The
 * keys should describe the purpose of the icon and the values should
 * contain valid SVG markup (with a single root `<svg>` element).
 */

(() => {
  // Guard against multiple injections of this file.  If ICONS has
  // already been defined on the window object we bail early to avoid
  // overwriting existing icons.
  if (window.ICONS) return;

  /**
   * A map of icon names to their SVG definitions.  The icons are
   * deliberately minimal and rely on stroke outlines rather than
   * filled shapes so they remain crisp at small sizes.  All paths
   * have `stroke-linecap="round"` and `stroke-linejoin="round"` set
   * implicitly via the attributes on the root `<svg>` element.
   */
  const ICONS = {
    /**
     * An outline of a document with a folded corner and two lines of
     * content.  Used for the Documents tab and related UI elements.
     */
    /**
     * A refined document icon depicting a sheet of paper with a folded
     * corner and two lines of text.  The shape has rounded corners
     * and minimal details to remain legible at small sizes.
     */
    // Documents: two stacked pages with lines to suggest multiple
    // documents in a repository.  The front page includes three
    // horizontal rules, while the back page peeks out from behind.
    documents: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <!-- Simplified document: a single page with a folded corner and two lines of text.
           This reduces visual clutter while still conveying a document. -->
      <rect x="5" y="4" width="14" height="16" rx="2" ry="2" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="16" y2="16" />
    </svg>`,

    /**
     * An open book with two symmetrical halves.  Used for the
     * Glossary tab.
     */
    /**
     * A dictionary/glossary icon composed of three vertical bars
     * representing reference columns.  Horizontal strokes at the
     * top and bottom unify the bars into a single bound volume.
     */
    // Glossary: an open book with two pages and a centre fold.  The
    // left and right pages curve outward slightly to imply an open
    // volume.  A centre line separates the pages, hinting at a
    // dictionary or reference book.
    glossary: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <!-- left page -->
      <path d="M4 7c0-2 1-3 3-3h5v14H7c-2 0-3-1-3-3V7z"/>
      <!-- right page -->
      <path d="M20 7c0-2-1-3-3-3h-5v14h5c2 0 3-1 3-3V7z"/>
      <!-- centre fold -->
      <line x1="12" y1="4" x2="12" y2="18"/>
    </svg>`,

    /**
     * A simple hourglass created from two crossing diagonals and two
     * horizontal lines.  Represents the Historical Foundations tab.
     */
    /**
     * An hourglass symbolising the passage of time in the
     * Historical Foundations section.  Two triangles joined at
     * their tips represent sand flowing between the chambers,
     * while horizontal bars form the top and bottom of the glass.
     */
    history: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <!-- Historical timeline: a horizontal line with three milestones.  Each
           circle marks a key moment in history, conveying that this
           section explores past events. -->
      <line x1="3" y1="12" x2="21" y2="12" />
      <circle cx="6" cy="12" r="1.5" fill="none" />
      <circle cx="12" cy="12" r="1.5" fill="none" />
      <circle cx="18" cy="12" r="1.5" fill="none" />
    </svg>`,

    /**
     * A clipboard with two horizontal lines, suitable for the
     * Knowledge Checks (quiz) tab.
     */
    /**
     * A knowledge-check icon depicting a simple checklist on a card.
     * A rounded rectangle contains two lines for questions and a
     * checkmark indicating completion.
     */
    quiz: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <!-- Knowledge check card. A rounded rectangle holds a single,
           prominent check mark. The check mark fills most of the
           card to clearly differentiate it from the documents icon. -->
      <rect x="5" y="4" width="14" height="16" rx="2" ry="2" />
      <!-- Large check mark spanning the card -->
      <polyline points="7,14 11,18 17,8" />
    </svg>`,

    /**
     * Two overlapping flashcards drawn with line segments.  The shapes
     * are scaled up and offset significantly so the overlapping effect
     * is obvious at small sizes.  Several horizontal rules on the
     * front card suggest content without creating filled areas.
     */
    study: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <!-- Back card outline (larger, offset down/right) -->
      <line x1="9" y1="3" x2="21" y2="3"/>
      <line x1="21" y1="3" x2="21" y2="18"/>
      <line x1="21" y1="18" x2="9" y2="18"/>
      <line x1="9" y1="18" x2="9" y2="3"/>
      <!-- Front card outline (shifted up/left) -->
      <line x1="3" y1="7" x2="15" y2="7"/>
      <line x1="15" y1="7" x2="15" y2="22"/>
      <line x1="15" y1="22" x2="3" y2="22"/>
      <line x1="3" y1="22" x2="3" y2="7"/>
      <!-- Lines on the front card -->
      <line x1="4" y1="12" x2="14" y2="12"/>
      <line x1="4" y1="15" x2="14" y2="15"/>
      <line x1="4" y1="18" x2="14" y2="18"/>
    </svg>`,

    /**
     * A simple list icon composed of bullet circles and horizontal lines.
     * Used for switching back to list view from study mode.
     */
    list: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="7" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="6" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <circle cx="6" cy="17" r="1.5" fill="currentColor" stroke="none"/>
      <line x1="9" y1="7" x2="18" y2="7"/>
      <line x1="9" y1="12" x2="18" y2="12"/>
      <line x1="9" y1="17" x2="18" y2="17"/>
    </svg>`,

    /**
     * A shuffle icon featuring two crossing paths with arrow heads at
     * their ends.  Used to shuffle flashcards.
     */
    shuffle: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <!-- A shuffle icon drawn as two crossing arrows.  Each arrow
           travels from left to right but moves through different
           vertical positions, suggesting the mixing of cards.  The
           arrowheads are larger to emphasise direction even when
           the label is hidden. -->
      <!-- Top arrow: starts high, descends through the middle, and ends mid height -->
      <path d="M3 6h5l6 6h5" />
      <!-- Bottom arrow: starts low, ascends through the middle, and ends near the top -->
      <path d="M3 18h5l6-6h5" />
      <!-- Arrowheads: triangles pointing right at the end of each path -->
      <polyline points="19 10 23 12 19 14" />
    </svg>`,

    /**
     * A direction/swap icon composed of a vertical line with arrow
     * heads at both ends.  Used to toggle the study direction.
     */
    direction: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="6" x2="12" y2="18"/>
      <polyline points="9 9 12 6 15 9"/>
      <polyline points="9 15 12 18 15 15"/>
    </svg>`,

    /**
     * A check mark used to denote completed or viewed items and
     * correct quiz answers.
     */
    check: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 13l4 4L19 7"/>
    </svg>`,

    /**
     * A cross mark used for incorrect answers in the quiz module.
     */
    cross: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <line x1="6" y1="6" x2="18" y2="18"/>
      <line x1="6" y1="18" x2="18" y2="6"/>
    </svg>`,

    /**
     * An outline star used for unsaved items.  Uses only a stroke so
     * the interior remains transparent.
     */
    starOutline: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>`,

    /**
     * A filled star used for saved items.  The path is filled so the
     * icon appears solid.
     */
    starFilled: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>`

    /**
     * A refined lightbulb symbolising insight.  A circular bulb
     * transitions into a narrow neck and base, with two horizontal
     * filaments suggesting the screw threads.  Used for "What We
     * Learned" callouts.
     */
    ,lessons: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3a5 5 0 0 0-5 5c0 2 1 3 2 4s1 2 1 3v3h6v-3c0-1 .333-2 1-3s2-2 2-4a5 5 0 0 0-5-5z"/>
      <line x1="10" y1="20" x2="14" y2="20"/>
      <line x1="10" y1="22" x2="14" y2="22"/>
    </svg>`

    /**
     * A shield representing regulatory protections.  The top arcs
     * gently slope to a strong point at the bottom, conveying
     * strength and security.  Used for "Related Protections" lists.
     */
    ,protections: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2l7 4v6c0 4-3 8-7 9-4-1-7-5-7-9V6l7-4z"/>
    </svg>`

    /**
     * A warning symbol used for "Why This Was Needed" items. A
     * triangle with an exclamation mark inside conveys attention and
     * highlights gaps or needs that led to regulatory changes. The circle at the
     * bottom helps the mark read clearly at small sizes.
     */
    ,wrong: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L3 21h18L12 3z"/>
      <line x1="12" y1="10" x2="12" y2="14"/>
      <circle cx="12" cy="17" r="1"/>
    </svg>`

    /**
     * An external link indicator.  The square represents the current
     * document, while the arrow pointing up and to the right shows
     * that the link will open in a new tab or window.
     */
    ,externalLink: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="7" width="14" height="14" rx="2" ry="2"/>
      <polyline points="14,3 21,3 21,10"/>
      <line x1="21" y1="3" x2="14" y2="10"/>
    </svg>`

    /**
     * Navigation arrow pointing to the left.  Used for "Previous"
     * actions such as moving to the prior flashcard.
     */
    ,prev: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <polyline points="15 19 8 12 15 5"/>
    </svg>`

    /**
     * Navigation arrow pointing to the right.  Used for "Next"
     * actions such as moving to the next flashcard.
     */
    ,next: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <polyline points="9 5 16 12 9 19"/>
    </svg>`

    /**
     * Icon for empty search results.  A document with a question
     * mark hints that nothing was found matching the criteria.  The
     * question mark is drawn as text to keep the design simple.
     */
    ,noResults: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3h7l5 5v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
      <polyline points="12 3 12 8 17 8"/>
      <text x="12" y="16" text-anchor="middle" font-size="8" fill="currentColor" font-family="Arial, sans-serif">?</text>
    </svg>`

    /**
     * A generic error indicator.  A circle surrounds an
     * exclamation point to communicate that something went wrong at
     * a system or loading level.  This is distinct from the
     * triangular warning used for ethical issues.
     */
    ,error: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <circle cx="12" cy="16" r="1"/>
    </svg>`

    /**
     * The primary branding star for the CIP tool.  A classic five‑point
     * star drawn with a single outline.  Using this familiar symbol
     * in the header aligns with the original design and helps users
     * immediately recognise the product.  The stroke inherits the
     * surrounding colour so it stands out on the gradient header.
     */
    ,title: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
      <!-- Primary branding star: four points for a unique look.  A small
           cross-shaped sparkle in the upper right echoes the
           original design.  The star is filled while the sparkle
           uses strokes so it remains delicate. -->
      <path d="M12 2 L14 8 L22 12 L14 16 L12 22 L10 16 L2 12 L10 8 Z" fill="currentColor" stroke="none"/>
      <!-- Glimmer: a plus-shaped sparkle.  Lines are extended to be
           clearly visible at small sizes. -->
      <line x1="18.5" y1="3.5" x2="18.5" y2="5.5" />
      <line x1="17.5" y1="4.5" x2="19.5" y2="4.5" />
    </svg>`

    ,
    /**
     * Pen / note icons used for contextual annotations.
     */
    noteOutline: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
    </svg>`,
    noteFilled: `<svg width="1em" height="1em" viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg" fill="currentColor"
        stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
        stroke-linejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
    </svg>`
  };

  // Expose the ICONS map globally.  Consumers can access
  // `window.ICONS.documents` etc. to retrieve the SVG markup.
  window.ICONS = ICONS;
})();