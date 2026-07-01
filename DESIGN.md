---
name: LocalCloud Design System
description: The Minimalist Hypervisor visual specification for the desktop orchestrator.
colors:
  primary: "#6366f1"
  neutral-bg: "#0b0f17"
  neutral-card: "#111827"
  neutral-border: "#1f2937"
  neutral-text: "#f3f4f6"
  neutral-muted: "#9ca3af"
  accent-success: "#10b981"
  accent-warning: "#f59e0b"
  accent-error: "#ef4444"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#4f46e5"
  button-danger:
    backgroundColor: "{colors.accent-error}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  input-field:
    backgroundColor: "{colors.neutral-card}"
    textColor: "{colors.neutral-text}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
---

# Design System: LocalCloud

## 1. Overview

**Creative North Star: "The Minimalist Hypervisor"**

The Minimalist Hypervisor visual system is designed to convey absolute control, precision, and technical utility. Operating as a dark-first dashboard, it strips away decorative fluff (such as neon grid overlays or glowing text) to prioritize real-time telemetry, structured log outputs, and layout rhythm. The design operates with strict density rules, allocating maximum screen real estate to active processes, CPU/RAM monitoring, and clean log streams.

Interaction energy is tactile and responsive. Focus states use crisp, high-contrast borders and subtle scaling changes rather than soft glows. The overall aesthetic is dark, functional, and clean, borrowing structural confidence from interfaces like Coolify and Vercel.

**Key Characteristics:**
- Dark void background (`#0b0f17`) with solid, flat card containers (`#111827`).
- Flat depth hierarchy relying on tonal contrast instead of fuzzy box shadows.
- Maximum corner rounding capped at 12px to prevent a soft "AI-generated" look.
- Strict typography scale using the Nunito font family for high legibility.

## 2. Colors

All colors are chosen to ensure WCAG AA accessibility compliance, maintaining a contrast ratio of at least 4.5:1 for all text.

### Primary
- **Hypervisor Indigo** (`#6366f1`): Used for primary interactive accents, sliders, and key action buttons.

### Neutral
- **Dark Void** (`#0b0f17`): The default page background.
- **Card Slate** (`#111827`): Used for container, cards, and sidebar backgrounds to create clear visual segments.
- **Structural Border** (`#1f2937`): Thin borders used to outline containers and input components.
- **Ink White** (`#f3f4f6`): The primary body and heading text color.
- **Ink Muted** (`#9ca3af`): Used for secondary labels, helper text, and timestamps.

### Accents
- **Live Green** (`#10b981`): Represents active status, successful syncs, and CPU utilization.
- **Alert Amber** (`#f59e0b`): Represents connecting states, warning prompts, or resource warnings.
- **Halt Red** (`#ef4444`): Represents OOM crashes, disconnected states, or terminal delete/stop actions.

### Named Rules
**The Rarity Rule.** Saturated primary accents (`#6366f1`) must cover less than 10% of any given screen area. Their sparse use represents high intent.
**The Tint Contrast Rule.** Body text on tinted cards must always remain at `#f3f4f6` to guarantee a 4.5:1 contrast ratio against `#111827`.

## 3. Typography

**Display Font:** Nunito (with system-fallback)
**Body Font:** Nunito (with system-fallback)
**Label/Mono Font:** Courier New (or system monospace) for logs, paths, and ports.

Typography is selected for technical clarity. Display titles use tighter tracking, while body font size and line height focus on long-term readability without strain.

### Hierarchy
- **Display** (Bold (700), `1.5rem` / `24px`, `1.25`): Title headings of screens (e.g. DropZone, Dashboard).
- **Headline** (Semi-bold (600), `1.25rem` / `20px`, `1.3`): Subheaders or secondary card headers.
- **Title** (Medium (500), `1rem` / `16px`, `1.4`): Section dividers, card info titles.
- **Body** (Regular (400), `0.875rem` / `14px`, `1.5`): Default body paragraph and control label descriptions. Max line length: 70ch.
- **Label / Mono** (Medium (500), `0.75rem` / `12px`, letter-spacing: `0.02em`): Log files, timestamps, ports, status indicators, and slider indicators.

## 4. Elevation

Depth in this design system is expressed strictly through **Tonal Layering** and flat layouts. Traditional drop shadows are omitted to enforce a clean, engineering-focused interface.

- **Background Level (0)** (`#0b0f17`): Base workspace background.
- **Container Level (1)** (`#111827`): Used for dashboard cards, terminal outputs, and input layouts.
- **Border Outline (2)** (`1px solid #1f2937`): Emphasizes container boundaries.
- **Interactive Focus (3)** (`1px solid #6366f1`): Active focus bounds on input, slider, or chip selection.

### Named Rules
**The Flat-By-Default Rule.** Do not use shadow blurs (`box-shadow`) to lift elements. Depth is built using flat contrast boundaries (`#111827` on top of `#0b0f17` with a `#1f2937` border).

## 5. Components

### Buttons
- **Shape:** Soft rounded corners with 6px radius (`rounded-sm`).
- **Primary:** Background color `#6366f1` with text `#f3f4f6`. Padding `8px 16px`.
- **Danger:** Background color `#ef4444` with text `#f3f4f6`. Padding `8px 16px`.
- **Hover / Focus:** Interactive buttons scale down slightly (`active:scale-[0.98]`) and transitions happen over `150ms`. Focus state is indicated by a clean outline (`focus-visible:ring-2 focus-visible:ring-indigo-500`).

### Cards / Containers
- **Corner Style:** Rounded corners with 12px radius (`rounded-lg`).
- **Background:** `#111827` with 60% opacity (`bg-gray-900/60`) and a backdrop blur filter for glassmorphic depth.
- **Border:** Outlined with a thin border (`1px solid #1f2937`).
- **Internal Padding:** Spaced uniformly using `24px` (`p-6`).

### Inputs / Fields
- **Style:** Background `#111827`, border `1px solid #1f2937`, text color `#f3f4f6`, rounded `6px` (`rounded-sm`), padding `8px 12px`.
- **Focus:** Highlighted with a solid border transition to `#6366f1` and active outline scale.

### Navigation / Telemetry Cards
- **Status Indicators:** Flat rounded indicators with live color accents representing connection health.
- **Charts:** High-contrast `recharts` graphs using solid fill gradients (`#6366f1` or `#10b981`) with flat, clean axes.

## 6. Do's and Don'ts

### Do:
- **Do** maintain a strict 4.5:1 text-to-background contrast ratio (Ink White text `#f3f4f6` on Card Slate `#111827`).
- **Do** enforce a maximum card corner radius of 12px.
- **Do** use native, raw command arrays when spawning execution binaries to avoid command injection.
- **Do** limit primary accent usage to less than 10% of total interface area.

### Don't:
- **Don't** use border-left/right greater than 1px as a colored stripe on cards or alerts.
- **Don't** use gradient text (e.g. `background-clip: text` with a gradient) for functional headers.
- **Don't** combine a card border with a soft drop shadow (blur radius ≥ 16px) on the same element.
- **Don't** use arbitrary z-index values; use the semantic scale (dropdown: 100, modal-backdrop: 200, modal: 300, toast: 400).
- **Don't** let text overflow its containers on mobile/tablet viewports; clamp font sizes properly.
