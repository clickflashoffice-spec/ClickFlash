# Specification: ClickFlash Website Builder (Phase 5)

Based on the provided screenshots of `clickflash59.mypixieset.com`, we built a modular, block-based website engine.

## 🎨 Design DNA

- **Typography**: Elegant Serif (Hero) + Clean Sans-Serif (Body).
- **Accents**: Obsidian Gold (#d4af37).

## 🛠️ Architecture: The "State-Drive" Engine

Websites are defined as a JSON configuration stored in PocketBase.

### Components Built

1. **NavBlock**: Sticky header with logic to redirect "Download" to the gallery.
2. **HeroBlock**: Full-bleed background with animated CTAs.
3. **StoryBlock**: Split bio section.
4. **PortfolioGrid**: Curation masonry grid.
5. **SocialFeed**: Instagram integration strip.
6. **FooterBlock**: Branding and social links.

## 🚀 Execution

- [x] Foundation & Types.
- [x] Block Library Implementation.
- [x] Visual Builder UI (`/admin/sites/builder`).
