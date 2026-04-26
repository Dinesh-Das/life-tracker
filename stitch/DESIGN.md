---
name: Digital Sanctuary
colors:
  surface: '#0a160f'
  surface-dim: '#0a160f'
  surface-bright: '#303c34'
  surface-container-lowest: '#05110a'
  surface-container-low: '#121e17'
  surface-container: '#16221b'
  surface-container-high: '#212d25'
  surface-container-highest: '#2b3830'
  on-surface: '#d8e6db'
  on-surface-variant: '#c1c8c3'
  inverse-surface: '#d8e6db'
  inverse-on-surface: '#27332c'
  outline: '#8b928d'
  outline-variant: '#414844'
  surface-tint: '#a9cfbc'
  primary: '#a9cfbc'
  on-primary: '#14362a'
  primary-container: '#2d4f41'
  on-primary-container: '#9bc0ae'
  inverse-primary: '#436556'
  secondary: '#aecebe'
  on-secondary: '#19362a'
  secondary-container: '#304d40'
  on-secondary-container: '#9cbcac'
  tertiary: '#c1c8c5'
  on-tertiary: '#2b3230'
  tertiary-container: '#434a48'
  on-tertiary-container: '#b2b9b7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c5ebd8'
  primary-fixed-dim: '#a9cfbc'
  on-primary-fixed: '#002116'
  on-primary-fixed-variant: '#2b4d3f'
  secondary-fixed: '#c9ead9'
  secondary-fixed-dim: '#aecebe'
  on-secondary-fixed: '#032016'
  on-secondary-fixed-variant: '#304d40'
  tertiary-fixed: '#dde4e1'
  tertiary-fixed-dim: '#c1c8c5'
  on-tertiary-fixed: '#161d1b'
  on-tertiary-fixed-variant: '#414846'
  background: '#0a160f'
  on-background: '#d8e6db'
  surface-variant: '#2b3830'
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-padding: 32px
  gutter: 24px
  card-gap: 20px
---

## Brand & Style

This design system centers on the concept of a "Digital Sanctuary"—a high-performance workspace that prioritizes mental clarity and serenity. The style is a sophisticated evolution of **Glassmorphism**, moving away from chaotic vibrancy toward a more grounded, organic aesthetic. It utilizes deep, multi-layered green gradients that evoke a lush, forest-like atmosphere, viewed through the lens of high-end frosted glass. 

The personality is premium, academic, and calm. It targets users who seek focus in a high-stimulus world, offering a tactile yet ethereal interface that feels responsive and lightweight. The emotional response should be one of immediate decompression and quiet confidence.

## Colors

The palette is derived from botanical life and foggy landscapes. The core experience is "Dark" by default, using a **Deep Forest Green** (#1A261F) for the foundation to reduce eye strain.

- **Primary:** Deep Sage (#2D4F41) for meaningful actions and deep-set elements.
- **Secondary:** Mint Mist (#A7C7B7) for active states and highlights.
- **Tertiary:** Frosted White (#F0F7F4) for typography and iconography.
- **Accent:** Translucent layers are created with variations of white at 5% to 15% opacity, creating the signature glass effect against the organic background gradients.

## Typography

This system employs a high-contrast typographic pairing to balance tradition and modernity. **Newsreader** provides an editorial, authoritative feel for headlines, making content feel curated and timeless. **Manrope** is used for functional text, offering exceptional readability and a technical, clean counterpoint to the organic serif.

Hierarchies should be strictly enforced to maintain a "quiet" interface. Headlines use tighter letter spacing for a premium look, while labels utilize slight tracking and uppercase styling to ensure clarity even at small sizes against translucent backgrounds.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid hybrid** model. Content is organized into modular cards that sit within a structured 12-column grid, but the background gradients and glass layers feel expansive and borderless. 

Generous whitespace (negative space) is the most critical component of the "Sanctuary" aesthetic. Elements should never feel cramped; instead, they should "breathe" within their glass containers. We utilize a base 8px rhythm to ensure consistent alignment and predictable densities across all screen sizes.

## Elevation & Depth

Depth is achieved through **Backdrop Blurs** and **Luminance Tiers** rather than traditional black shadows. 

- **Level 1 (Base):** Deep forest gradient with a 40px background blur on any fixed navigation elements.
- **Level 2 (Cards):** 10-15% white opacity with a 20px - 30px backdrop blur. These feature a 1px solid white border at 20% opacity to define the edge.
- **Level 3 (Popovers/Modals):** 20% white opacity with a 40px blur and a subtle 1px inner glow (white, 15% opacity) to simulate the edge of a physical glass pane.

Shadows, when used, are extremely diffused and tinted with the primary forest green to prevent them from looking "dirty" on the green background.

## Shapes

The shape language is "Rounded-Soft." To complement the organic nature of the forest-inspired colors, hard corners are avoided entirely. Standard containers use a 1rem (16px) radius, while larger hero cards or focus areas may use up to 1.5rem (24px). This creates a friendly, approachable, and high-end feel that mimics polished stone or smooth glass.

## Components

- **Buttons:** Primary buttons are solid "Sage" (#2D4F41) with white text. Secondary buttons are glassmorphic with a 1px white border and no fill, transitioning to a light fill on hover.
- **Glass Cards:** The primary container. Must have `backdrop-filter: blur(24px)`, a 1px border (`rgba(255,255,255, 0.15)`), and a subtle linear gradient fill from top-left to bottom-right.
- **Inputs:** Clean, bottom-border only or very light glass fills. Focus states are indicated by an increase in border opacity rather than a color change.
- **Chips/Badges:** Small, high-blur capsules used for tagging. Text should be high-contrast "Mint Mist" to ensure legibility over the green background.
- **Progress Indicators:** Use soft, rounded bars with a "glowing" secondary green fill to represent life and growth.
- **Navigation Sidebar:** A full-height glass pane with a higher blur density (40px) to separate the navigation clearly from the main workspace content.