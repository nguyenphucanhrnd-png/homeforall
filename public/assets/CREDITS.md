# Image credits

Every image in `/public` that is not our own work gets a row here **before** it is committed.

Rules (prompt §7.3):

- Real adoptable pets: only from the rescuing partner, with written permission. Record the partner and date of consent.
- Decorative images: Unsplash, Pexels or our own illustrations. Record licence, author and source URL.
- Pinterest is for mood boards only, never a source.
- No AI-generated photos of real adoptable pets.
- Every image needs VI + EN alt text and a defined aspect ratio where it is used.

| File | Author / owner | Source URL | Licence | Permission / date | Notes |
|---|---|---|---|---|---|
| `plates/s01–s09/*` (scroll scenes) | Google Gemini video model (master.mp4, 30 s, 1280×720) | design-refs/video/master.mp4 | **Terms not yet checked** (see design-refs/CREDITS.md) | Generated 2026-10-24 by `hfa_media.py` | AI-generated clay illustration; visible sparkle removed by pixel mask; interim 720p (not 4K). Disclosed on /about#illustrations |
| `stills/*.webp` (10 page headers) | Same master, frames at the times in master-timecodes.txt | design-refs/video/master.mp4 | **Terms not yet checked** | Generated 2026-10-24 by `hfa_media.py` | One distinct frame per page; 1280 px |
| `brand/logo*.png` | HomeForAll team (supplied logo) | — | Project-owned | 2026-10-24 | Cut-outs by scripts/brand/make-logo-assets.py |
| `demo-pets/HFA-0001…0012.webp` | Unknown (supplied by the team in `animal_picture/`, 2026-10-24) | — | Approved for publication by the project owner (2026-10-25) | — | Sample listings on the public site; EXIF stripped, ≤ 1200 px WebP. **Git-ignored and must not ship**: replace with partner photos (with written consent) before launch. Without the files the site shows illustrations |
