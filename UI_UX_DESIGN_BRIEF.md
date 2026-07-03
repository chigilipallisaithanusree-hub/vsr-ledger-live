# VSR Ledger — UI/UX Design Brief

**Project Name:** VSR Ledger  
**Project Type:** Mobile-first Full Stack Micro ERP & Business Ledger Web Application  
**Design Philosophy:** Premium, Modern, Minimal, Elegant, Calming  
**Design Standard Reference:** Stripe Dashboard, Linear, Raycast, Apple Business Apps  

---

## 1. Brand Identity & Visual Language

VSR Ledger is a highly customized single-user enterprise workspace. Unlike traditional grey, cluttered corporate ERP systems, VSR Ledger uses a warm, calming, premium natural color spectrum that feels like high-end Swiss design software. It is optimized for daily professional use, offering maximum layout clarity, beautiful negative space, and excellent legibility.

### 1.1. Brand Personality Tokens
- **Professional:** Accurate accounting-first layout grids.
- **Calm:** Eyesafe, soft background temperatures that reduce cognitive fatigue during long sessions.
- **Premium:** Subtle glassmorphic elevations, micro-shadows, and elegant premium modern typography pairings.

---

## 2. STRICT Color Palette & Materiality

All interface states, components, backgrounds, and borders **MUST** adhere strictly to the following hex tokens. No other color shades are permitted.

```
+-----------------------------------------------------------------------------+
|                                COLOR MATRIX                                 |
|                                                                             |
|   +-----------------------+   +-------------------+   +-----------------+   |
|   |     Matcha Cream      |   |    Milky Honey    |   |   Soft White    |   |
|   |       #9CA764         |   |      #F1E8C7      |   |     #FFFDF8     |   |
|   |  (Primary Actions)    |   |  (App Background) |   |  (Card Canvas)  |   |
|   +-----------------------+   +-------------------+   +-----------------+   |
|                                                                             |
|   +-----------------------+   +-------------------+   +-----------------+   |
|   |      Dark Charcoal    |   |    Warm Stone     |   |   Sand Border   |   |
|   |       #2E2A25         |   |      #6A655C      |   |     #DDD3B3     |   |
|   |    (Primary Text)     |   | (Secondary Text)  |   | (Muted Borders) |   |
|   +-----------------------+   +-------------------+   +-----------------+   |
+-----------------------------------------------------------------------------+
```

### 2.1. Base Palette Values

| Color Layer | Hex Token | CSS Variable | Applied Use Case |
| :--- | :--- | :--- | :--- |
| **Primary (Matcha Cream)** | `#9CA764` | `--color-primary` | Navigation Drawer highlights, primary action buttons, selected tabs, progress bars, active toggle checks. |
| **Background (Milky Honey)** | `#F1E8C7` | `--color-background` | Entire app background canvas, form sheets, content containers. |
| **Cards (Soft White)** | `#FFFDF8` | `--color-card` | Dashboard cards, dialog boxes, drawers, ledger lists. |
| **Primary Text** | `#2E2A25` | `--color-text-primary` | High-contrast body, prominent headings, list titles, currency text. |
| **Secondary Text** | `#6A655C` | `--color-text-secondary` | Captions, dates, inactive tab items, secondary table headers. |
| **Borders** | `#DDD3B3` | `--color-border` | Thin cards framing, input focus rings, horizontal table separators. |
| **Success** | `#4CAF50` | `--color-success` | Paid invoice status, positive ledger balances, quantity increase logs. |
| **Warning** | `#D4A017` | `--color-warning` | Partially paid statuses, low stock threshold warnings, draft quotations. |
| **Danger** | `#D9534F` | `--color-danger` | Unpaid invoices, critical low stocks, deletion dialogues, error indicators. |

### 2.2. Materiality: Glassmorphic Overlay Design
To establish visual depth and modern premium quality, a selected set of components use subtle **Glassmorphism**:
- **Applied to:** Dashboard Cards, Popovers, Notes Widget, Quick Add sheets, and Notification list drawers.
- **Glass CSS Styling Spec:**
  ```css
  background: rgba(255, 253, 248, 0.45); /* Soft White at 45% Opacity */
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid rgba(221, 211, 179, 0.5); /* Sand border at 50% Opacity */
  box-shadow: 0 8px 32px 0 rgba(46, 42, 37, 0.05); /* Soft Dark Charcoal shadow */
  ```

---

## 3. Premium Typography Scale

Typical generic dashboards rely on system fonts like Roboto or Inter. To stand out as a premium bespoke application, VSR Ledger pairs **Outfit** (for headers and display items) with **Plus Jakarta Sans** (for standard reading and UI controls), while reserving **JetBrains Mono** for numerical accounting ledgers.

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@theme {
  --font-sans: "Plus Jakarta Sans", sans-serif;
  --font-display: "Outfit", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}
```

### 3.1. Type Hierarchy

| Level | Size (Rem/Px) | Font Family | Tracking / Weight | Applied Context |
| :--- | :--- | :--- | :--- | :--- |
| **Display Header 1** | `1.75rem (28px)` | Outfit | `-0.02em / Bold` | App Name logo, primary reports title. |
| **Display Header 2** | `1.25rem (20px)` | Outfit | `-0.01em / Semi-Bold` | Section headers, Drawer buyer name. |
| **Widget Title** | `0.95rem (15.2px)`| Outfit | `Normal / Semi-Bold` | Cards title, Modal titles. |
| **UI Body Bold** | `0.85rem (13.6px)`| Plus Jakarta Sans | `Normal / Semi-Bold` | Primary table names, buttons, active menu items. |
| **UI Body Regular** | `0.85rem (13.6px)`| Plus Jakarta Sans | `Normal / Regular` | Descriptions, invoice item names. |
| **Accounting Data** | `0.85rem (13.6px)`| JetBrains Mono | `Normal / Medium` | Numeric currency grids, SKU numbers, dates, timestamps. |
| **Form Captions** | `0.70rem (11.2px)`| Plus Jakarta Sans | `+0.05em / Bold (Caps)`| Field labels, helper texts, table headers. |

---

## 4. UI Layout Grid & Sizing Parameters

The application layout uses strict mathematical ratios to govern spacing, margins, and borders, ensuring consistent, balanced alignments on all screen sizes.

```
Mobile (Fluid Canvas)   -->   Tablet (8-Column Grid)   -->   Desktop (12-Column Grid)
[Padding: 16px (1rem)]        [Padding: 24px (1.5rem)]       [Padding: 32px (2rem)]
```

### 4.1. Spacing Token Variables
- **Base Spacing:** `4px (0.25rem)` increments.
- **Interactive Margins:** `16px (1rem)` on mobile devices; `32px (2rem)` on wide desktop displays.
- **Card Inner Padding:** `20px (1.25rem)` to provide generous white-space breathing room for content.
- **Table Line Density:** `12px (0.75rem)` vertical row padding to ensure text clusters look distinct.

### 4.2. Border Radius Token Scale
- **Small Corners (`r-sm`):** `4px` — applied to badges, check-marks, and tags.
- **Standard Medium (`r-md`):** `12px` — applied to input forms, selection dropdowns, and small widget cards.
- **Large Panels (`r-lg`):** `20px` — applied to system modules, large modal sheets, and the main background panels.

---

## 5. Module Interactive States

Every visual element must support high-fidelity tactile states to elevate the workspace to feel like a native desktop app:

### 5.1. Buttons & Interaction Feedback
- **Default State:** Matte background with solid contrasting text.
- **Hover/Pointer Focus:** 
  - Mild vertical float elevation: `transform: translateY(-1px) scale(1.01)`.
  - Accentuate Matcha Cream actions with a gentle background luminescence adjustment: `filter: brightness(1.05)`.
- **Active Click State:** Click compression: `transform: translateY(1px) scale(0.99)`.
- **Disabled State:** Solid grey fadeout (Opacity: 0.45) with cursor-not-allowed restrictions.

### 5.2. Input Controls & Focus States
- **Resting state:** Soft white base with a fine sand-coloured frame (`#DDD3B3`).
- **Focus ring:** Animated expand border. Ring outlines use a 2px offset colored in Matcha Cream (`#9CA764`) with smooth transitions.
  ```css
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  ```

---

## 6. Layout Adaptability Strategy

VSR Ledger operates natively across diverse user hardware, scaling dynamically to optimize reading density.

### 6.1. Mobile Screen UX Flow (Primary Canvas)
- **Navigation Drawer:** Slides completely off-canvas, triggered via a top header menu toggle.
- **Tabular Grids:** Wide multi-column tables are collapsed into single-column cards. Columns like SKU, Tax, and Date are hidden on mobile, showing only the Title and total currency value.
- **Action Buttons:** Fixed bottom-aligned sticky ribbons with massive tap targets (minimum height: 48px) to allow for comfortable, single-handed operation.

### 6.2. Desktop Screen UX Flow (Extended Canvas)
- **Left Navigation Sidebar:** Stays permanently pinned open to structure the workspace.
- **Dual-Pane Layouts:** Modules use side-by-side bento layouts (e.g., Ledger selection list on the left, full transaction statement rendering on the right).
- **Control Modals:** Modals are centered on screen with structured background dimmers (Opacity: 0.4) to maintain layout context.

---

## 7. Dynamic Widget Custom Specifications

### 7.1. Dashboard Pinned Notes Panel
- **Behavior:** Triggered via the top-right notes header icon. Slides up from the bottom on mobile as a bottom sheet (occupying 60% of vertical height), or opens as an elegant, glassmorphic dropdown popover on desktop.
- **Inner Elements:** A quick search-bar, scrollable categorised list (Memos, Reminders), note pin controls, and inline input boxes to draft quick thoughts in a single tap.

### 7.2. Notification Hub Drawer
- **Behavior:** Slides into view from the right margin.
- **Visual styling:** Employs the default glassmorphic overlay specifications, utilizing color-coded icon bullets:
  - **Red bullet (`#D9534F`):** Low Stock indicators.
  - **Yellow bullet (`#D4A017`):** Upcoming customer payments or invoice deadlines.
  - **Green bullet (`#4CAF50`):** System back-ups and automatic database reconciliations.

---

## 8. Micro-Animations

All animations must remain clean, subtle, and fast to ensure the interface feels snappy:

- **Global Transition Duration:** Speed matches standard web runtimes: `200ms` for hover feedback, `300ms` for panel entry fades.
- **Slide-in Panels (Mobile Bottom Sheets / Navigation):** Employs standard ease-out transitions:
  ```css
  transition: transform 350ms cubic-bezier(0.32, 0.94, 0.6, 1);
  ```
- **Loading Indicators:** Fine, infinite rotating circles styled in Matcha Cream (`#9CA764`). Skeletal layout grids use a soft, breathing opacity fade (breathing between 30% and 80% opacity every 1.5 seconds) to indicate loading states without visual distraction.
