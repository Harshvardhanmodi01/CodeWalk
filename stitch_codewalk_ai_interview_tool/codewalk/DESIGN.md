---
name: CodeWalk
colors:
  surface: '#0d1515'
  surface-dim: '#0d1515'
  surface-bright: '#333b3b'
  surface-container-lowest: '#080f10'
  surface-container-low: '#151d1e'
  surface-container: '#192122'
  surface-container-high: '#232b2c'
  surface-container-highest: '#2e3637'
  on-surface: '#dce4e5'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#dce4e5'
  inverse-on-surface: '#2a3233'
  outline: '#849495'
  outline-variant: '#3b494b'
  surface-tint: '#00dbe9'
  primary: '#dbfcff'
  on-primary: '#00363a'
  primary-container: '#00f0ff'
  on-primary-container: '#006970'
  inverse-primary: '#006970'
  secondary: '#e0b6ff'
  on-secondary: '#4c007d'
  secondary-container: '#6d11ad'
  on-secondary-container: '#d7a4ff'
  tertiary: '#fff5de'
  on-tertiary: '#3b2f00'
  tertiary-container: '#fed639'
  on-tertiary-container: '#715d00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#7df4ff'
  primary-fixed-dim: '#00dbe9'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#f2daff'
  secondary-fixed-dim: '#e0b6ff'
  on-secondary-fixed: '#2e004e'
  on-secondary-fixed-variant: '#6a0baa'
  tertiary-fixed: '#ffe179'
  tertiary-fixed-dim: '#eac324'
  on-tertiary-fixed: '#231b00'
  on-tertiary-fixed-variant: '#554500'
  background: '#0d1515'
  on-background: '#dce4e5'
  surface-variant: '#2e3637'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  sidebar-width: 280px
---

## Brand & Style
The design system is engineered to bridge the gap between high-stakes technical assessment and a premium developer environment. The brand personality is precise, authoritative, and sophisticated, evoking the focus of a midnight coding session.

The visual style is **High-Contrast / Modern Developer**, utilizing a deep dark-mode foundation with electric accents. It draws inspiration from modern IDEs and low-level terminal interfaces, favoring sharp edges and high-density information layouts. The emotional goal is to provide candidates with a "flow-state" environment while signaling to recruiters that this is a top-tier, AI-native technical platform.

## Colors
The palette is rooted in a "Deep Charcoal" base (`#0D1117`) to reduce eye strain during long interview sessions. 

- **Primary (Electric Cyan):** Used for AI-driven insights, active cursor states, and primary calls to action. It should feel "glowing" against the dark background.
- **Secondary (Deep Purple):** Reserved for technical metadata and secondary branding elements.
- **Surface Scale:** Layers are defined by incremental lightening of the charcoal base. Surface-1 (`#161B22`) for sidebars, Surface-2 (`#21262D`) for cards and input backgrounds.
- **Syntax:** Follows a high-legibility dark theme optimized for code reviews, using standard Git-inspired success and error tones for terminal output.

## Typography
This design system employs a dual-font strategy to distinguish between UI and Content. 

- **Geist Sans:** Used for all UI labels, navigation, and body copy. Its geometric precision fits the technical aesthetic while maintaining readability.
- **JetBrains Mono:** Used for all code blocks, terminal prompts, and data-heavy tables. 
- **Formatting:** Use Uppercase for `label-sm` to create a "tab" or "metadata" feel. Headlines should use tight letter-spacing to maintain a modern, "compact" look.

## Layout & Spacing
The layout follows a **Fluid Grid** model with a sidebar-heavy architecture common in IDEs. 

- **The Workspace:** A 3-column layout is standard: Navigator (left), Code Editor (center), and AI/Terminal (right).
- **Rhythm:** All spacing is derived from a 4px baseline. Use 8px for internal component padding and 16px or 24px for section gaps.
- **Responsiveness:** On tablet, the AI/Terminal collapses into a bottom drawer. On mobile, the editor takes priority with a tabbed interface for switching between files and terminal output.

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows.

- **Stacking:** The background is the lowest level. Sidebars and Panels sit on Surface-1. Overlays and Modals sit on Surface-2.
- **Borders:** Every container must have a 1px solid border (`#30363D`). This mimics the "pane" feel of a code editor.
- **Active State Glow:** Primary buttons and active input focus use a `0px 0px 12px` outer glow using the Primary Cyan color at 30% opacity to simulate a CRT or backlit display.

## Shapes
The shape language is **Soft (0.25rem)**. 

While the aesthetic is "sharp," a literal 0px radius feels overly aggressive. A 4px radius (`rounded-sm`) is the standard for cards, buttons, and inputs. 

- **Buttons/Inputs:** 4px radius.
- **Badges/Tags:** 2px radius (Git-style).
- **Code Highlights:** 0px radius for line selections to maintain vertical continuity.

## Components
- **Terminal Inputs:** Should feature a persistent `>` or `$` prefix in Primary Cyan. Backgrounds should be blacker than the surface color to denote an "inset" area.
- **Buttons:** 
  - *Primary:* Solid Cyan background, black text, subtle outer glow.
  - *Ghost:* No background, 1px Primary border, Cyan text.
- **Badges:** Small, rectangular tags with subtle borders. Use success/error colors for build statuses and primary/secondary for tech stack tags.
- **Code Blocks:** Must include line numbers in a muted gray gutter. The active line should have a subtle horizontal highlight.
- **Status Indicators:** Progress bars should be thin (4px height) and use a solid color (no gradients) to maintain the "system" feel.
- **Cards:** No shadows. Use 1px borders and a slightly lighter background than the main canvas.