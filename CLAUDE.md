# Touch Grass

Online exhibition "Touch Grass: Nature's Representation Online", co-curated by Lukas (human) and Claude. Digital only for now. The aim is an archive of digital artworks about nature (flora, fauna, landscape, ecology), similar in intent to Mindy Seu's Cyberfeminism Index.

## Layout

- `index.html`, `css/`, `js/`: an early exploratory prototype of the exhibition interface (12.10.2026). The direction is still open.
- `process/`: the process board. Open `process/index.html` directly in a browser; it needs no server.
  - `data/log.js`: the process log. Append new entries at the end.
  - `data/research.js`: the longlist, with artists, candidate works and source links.
  - `data/brief.js`: the artist list as Lukas first sent it, verbatim. Do not edit.
  - `board.js`, `board.css`: render the board.

## Working rules from Lukas

- Claude does not rate or recommend fit. Judging which works fit the theme is Lukas's job. Keep fit ratings and evaluative wording out of the board and the data.
- The board is a log that takes its format from a play script. Every exchange gets an entry, with speakers LUKAS and CLAUDE plus italic stage directions for actions. Keep entries short. Dates go in `{ date: 'DD.MM.YYYY' }` rows. Mark the entry waiting on a reply with `open: true`, and remove that flag from the previous one.
- Black text on white, monospace, very concise.

## Data conventions

- Artist `status`: longlist | in | maybe | out. Work `status`: candidate | selected | rejected. Only Lukas's decisions change these.
- `verified: true` currently means the title, year and venue were confirmed in web search results only. The cloud session that did the research could not open any source page. Every link still needs checking by hand.
- `named_in_brief` marks works Lukas named or confirmed.
- IDs (A01, W001) are positional. Renumber when artists or works are added or removed.

## Open threads (as of 29.10.2026)

- Images: fetch an image for each work from its source pages, keep only images that show the work, and show them on the longlist. This was blocked in the cloud session by its network policy. The images are copies of artists' work, so check rights before anything is shown publicly.
- Growing the archive: more works by the current 58 artists, or new artists beyond the list. Waiting on Lukas.
- Unconfirmed details: 0xfff "Tall Grass" (year and medium), Linda Dounia "Once Upon a Flower" (from Lukas's ArtPoint link), Harold Cohen 0309-06 (what the image shows), and the identities of Noper and DeepBlack.
