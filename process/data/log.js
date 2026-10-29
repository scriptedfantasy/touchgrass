// The process log, set in the format of a play script. Oldest entry first; append new entries at the end.
// { date } starts a day, { who, say } is something Lukas or Claude said, { dir } is an action, set like a stage direction.
// An entry with brief: true unfolds the artist list as Lukas sent it (data/brief.js).
window.TG = window.TG || {};
TG.log = [
  { date: '12.10.2026' },
  { dir: 'An earlier sketch of the exhibition sits in the repository: a CRT desktop, a grassy hill outside it, three placeholder works on a trail.' },

  { date: '29.10.2026' },
  { who: 'LUKAS', say: 'Here are my artists. Find their works with flowers, flora, fauna, nature. I want to co-curate this with you, and keep a record of how we do it. Black on white. Monospace.', brief: true },
  { who: 'CLAUDE', say: '68 entries. 57 artists once the duplicates merge. Eight names are misspelled, five I can\'t place yet. I\'ll research in five batches.' },
  { dir: 'Claude sends five researchers out and sets up this board.' },
  { who: 'LUKAS', say: 'Add Jakob Kudsk Steensen.' },
  { who: 'CLAUDE', say: 'Added. 58.' },
  { dir: 'The researchers return. Most artist and gallery sites were blocked to them. They worked from search results.' },
  { who: 'CLAUDE', say: '130 works. I rated each artist\'s fit: strong, medium, weak, none. Read "verified" as "confirmed in search results" until we check the links by hand.' },
  { who: 'CLAUDE', say: 'A proposal: six threads run through the list. Flowers as tokens. Nature that owns itself. The machine dreams a garden. Lost and extinct. The first digital plants. Actually touching grass.' },
  { who: 'CLAUDE', say: 'And questions. Is Sarah Friend\'s "touch grass" gentle automata (touching grass)? McCoy\'s "Forrests" Lens Organic? Mocan\'s "picknick" World Upstream? Lorena Mills Lorna Mills? Who is 0xfff? Where is Once Upon a Flower? Which Vanessa Rosa? And six artists show no nature work.' },
  { who: 'LUKAS', say: 'Yes, yes, yes, yes. 0xfff is 0xfff.love. Tall Grass was shown at The Pixel Prize. Here is Once Upon a Flower on ArtPoint. Drop Vanessa Rosa, add Monica Rizzolli. Herndon and Dryhurst made a series of early GPT images full of nature iconography.' },
  { who: 'LUKAS', say: 'Make the board very concise. The log should read like a play. I am Lukas, you are Claude.' },
  { who: 'LUKAS', say: 'And no fit recommendations. That is my job.' },
  { who: 'CLAUDE', say: 'Understood. The ratings are gone from the board and the data, and so are the research notes that judged fit.' },
  { who: 'CLAUDE', say: 'Rizzolli brings Fragments of an Infinite Field: an invented plant species in 1,024 fields of foliage. The Herndon and Dryhurst series is Infinite Images, made with OpenAI\'s first DALL-E in 2021, grown out from an idyllic mountain landscape. 0xfff.love and ArtPoint are blocked to me, so Tall Grass and Once Upon a Flower rest on your links.' },
  { who: 'LUKAS', say: 'I need a list of artists, the works of theirs that relate, and the links so I can check. This will be an archive of sorts, like Mindy Seu\'s Cyberfeminism Index. Different interface, same intent: aggregate as many digital artworks about nature as possible.' },
  { dir: 'Claude rewrites the log in the format of a play script and sets the longlist out for checking: each work on one line, its sources under it.' },
  { who: 'CLAUDE', say: 'The longlist below is that list: 58 artists, 131 works, every source linked. To grow it into an archive, I can go two ways: more works by these 58 artists, or new artists beyond your list. Which first?' },
  { who: 'LUKAS', say: 'The board should not be written as a play. It is a log that takes its format from a play. It should still read as a log.' },
  { dir: 'Claude turns the acts and scenes back into numbered, dated log entries and keeps the speaker names and stage directions.' },
  { who: 'CLAUDE', say: 'Done. The question above is still open: more works by these 58 artists, or new artists first?' },
  { who: 'LUKAS', say: 'Fetch images of the artworks that fit our theme, from the links you found.' },
  { dir: 'Claude tries all 195 source sites. The session\'s network policy refuses every one of them, Wikipedia included.' },
  { who: 'CLAUDE', say: 'I can\'t reach any of them from here. Once the network access is opened, I\'ll pull an image from each source page, look at each one, and keep the ones that show the work. Which images fit the theme stays your call.', open: true },
];
