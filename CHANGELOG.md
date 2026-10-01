# Changelog

## v46 · Beta 0.27 / Responsive Fixed Cards
### Added
- Responsive overrides for the six fixed summary cards.
- A mobile, tablet and desktop layout that keeps the same hierarchy.
- Smoother spacing and tighter card density on small screens.

### Changed
- The Story still uses fixed cards, but now adapts better to different screen sizes.
- The communication layer stays compact without changing the underlying motor.
- The top-right Update button stays hidden.

### Notes
- The analysis still comes from the same motor; only the presentation layer became fully responsive.

## v45 · Beta 0.26 / Fixed Cards
### Added
- Six fixed summary cards for the main Story surface.
- Compact lines with icons, chips and text bars to keep the scroll short.
- Story sync from the saved draft in `localStorage`.

### Changed
- The Story no longer depends on modals or accordions.
- The top-right Update button stays hidden.
- The analysis now reads as a compact set of fixed cards instead of a second interaction layer.

### Notes
- The analysis still comes from the same motor; only the communication layer changed.

## v44 · Beta 0.25 / Story Sync
### Added
- A sync bridge so the Story rerenders when the saved draft changes.

### Changed
- The Story started to follow the selected composition more reliably.

## v43 · Beta 0.24 / Modal Observer
### Added
- Observer-driven Story rerendering.

### Changed
- The Story reacted to composition changes through localStorage and DOM sync.
