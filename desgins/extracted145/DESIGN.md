---
name: CloudDrive Lumina
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444653'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757682'
  outline-variant: '#c4c5d5'
  surface-tint: '#455aa2'
  primary: '#000e3a'
  on-primary: '#ffffff'
  primary-container: '#002068'
  on-primary-container: '#758bd6'
  inverse-primary: '#b5c4ff'
  secondary: '#21638d'
  on-secondary: '#ffffff'
  secondary-container: '#96cfff'
  on-secondary-container: '#115983'
  tertiary: '#000e3b'
  on-tertiary: '#ffffff'
  tertiary-container: '#132455'
  on-tertiary-container: '#7d8cc4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#2b4289'
  secondary-fixed: '#cbe6ff'
  secondary-fixed-dim: '#93cdfc'
  on-secondary-fixed: '#001e30'
  on-secondary-fixed-variant: '#004b71'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b5c4ff'
  on-tertiary-fixed: '#041749'
  on-tertiary-fixed-variant: '#354477'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  success-gradient-start: '#002068'
  success-gradient-end: '#21638d'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  container-padding: 32px
  sidebar-width: 280px
  card-gap: 20px
---

## Brand & Style
CloudDrive Lumina embodies a **Corporate Modern** aesthetic with distinct **Glassmorphism** influences. The brand personality is professional, organized, and technologically advanced, yet approachable through soft environmental blurs and layered transparency.

The visual style focuses on "depth through clarity," utilizing semi-transparent surfaces and vibrant gradients to differentiate from traditional, flat enterprise software. It evokes a sense of high-performance reliability, suitable for technical teams and creative professionals who require a structured yet visually stimulating workspace.

## Colors
The palette is anchored by a deep **Midnight Navy (Primary)** and a **Cerulean Blue (Secondary)**, often used together in linear gradients to signify action and progress. 

- **Primary & Secondary:** Used for high-emphasis actions (Upload) and active states.
- **Surface System:** Utilizes a range of cool greys and off-whites (`#f7f9fb` to `#eceef0`) to create logical grouping without harsh borders.
- **Glass Effects:** Frequent use of white at low opacities (`white/40`, `white/50`) over light backgrounds to create a "frosted" look for hover states and secondary buttons.
- **Accents:** Error states use a high-visibility red (`#ba1a1a`), while successful progress indicators leverage the primary-to-secondary gradient.

## Typography
The system relies exclusively on **Inter**, a highly legible neo-grotesque font that reinforces the systematic and utilitarian nature of a cloud storage tool.

- **Headlines:** Use Semi-Bold (600) weights with slightly tight tracking at larger sizes to maintain a punchy, modern feel.
- **Body:** Standardized at 16px for optimal readability across data-heavy tables.
- **Labels:** Use Medium (500) or Semi-Bold (600) weights to provide clear hierarchy in navigation and metadata.
- **Scale:** High contrast between Display/Headline and Label sizes ensures clear content prioritization even in dense list views.

## Layout & Spacing
The layout follows a **Hybrid Grid** model:
- **Sidebar:** Fixed at 280px, creating a persistent anchor for navigation.
- **Main Canvas:** A fluid area that utilizes heavy container padding (32px) to ensure the interface feels airy.
- **The "8pt Grid":** All internal spacing, margins, and paddings are increments of an 8px base unit.
- **Mobile Adaptation:** Breakpoints occur at 768px (Tablet) and 480px (Mobile). On mobile, the sidebar collapses into a bottom drawer or "hamburger" menu, and display typography scales down to `headline-lg-mobile`.

## Elevation & Depth
Depth is created through **Tonal Layering** and **Glassmorphism**:
- **Level 0 (Background):** Solid `#f7f9fb`.
- **Level 1 (Main Content Card):** Large white surfaces with a very soft, diffused shadow (`rgba(0,0,0,0.04)`).
- **Level 2 (Active Elements/Menus):** Elements like the "New" button or Context Menus use `white/80` backdrop blurs (20px+) with semi-transparent borders to appear floating above the canvas.
- **Shadows:** Avoid heavy, dark shadows. Use ambient, low-opacity shadows that take on the hue of the primary color (e.g., `rgba(0,32,104,0.15)` for buttons).

## Shapes
The shape language is **highly rounded (Pill-shaped)**, emphasizing a soft, modern touch that offsets the data-heavy nature of the app.
- **Default (xl):** 1rem (16px) for navigation tabs and small buttons.
- **Large (lg):** 2rem (32px) for major container surfaces like the main file list.
- **Extra Large (xl):** 3rem (48px) for high-impact elements or specific decorative containers.
- **Full:** Used for profile avatars, status indicators, and progress bar ends.

## Components
- **Buttons:** 
  - *Primary:* Gradient fill (Navy to Cerulean), 12px vertical padding, pill-shaped, with a subtle blue-tinted shadow.
  - *Secondary (Glass):* `white/70` fill with a `1px` white border and backdrop blur.
- **Lists & Tables:** 
  - Use a clean grid layout with `1px` borders only on the bottom of header rows. 
  - Items should have a 2px transparent border that becomes visible or changes color on hover/focus for clear accessibility.
- **Context Menus:** 
  - Semi-transparent (`white/80`), blurred backgrounds, with rounded corners (16px). Items inside use clear icons in the primary color.
- **Input Fields:** 
  - Subtle inset shadows and `surface-container-highest/30` backgrounds. On focus, they transition to `white/80` with a 2px primary-colored ring.
- **Storage Indicators:** 
  - Progress bars use the core brand gradient with a "liquid" highlight effect (internal light shadow).
- **Navigation Tabs:** 
  - Pill-shaped with a background transition from transparent to `primary-container/30` for active states.