// The process log. One entry per step, oldest first. Body strings may hold simple HTML.
window.TG = window.TG || {};
TG.log = [
  {
    n: '000',
    date: '2026-10-12',
    who: 'CLAUDE',
    title: 'Exploratory interface prototype (before this board)',
    body: [
      'A first sketch of what the online exhibition could feel like: a CRT desktop whose wallpaper is a live 3D hill. The visitor "goes outside" and walks a trail of three placeholder works (Refik Anadol, Daniel Ambrosi, Sarah Friend). Lives at <a href="../">/</a>.',
      'Direction is still open. Recorded here so the board starts from what already existed.',
    ],
  },
  {
    n: '001',
    date: '2026-10-29',
    who: 'HUMAN',
    title: 'Brief',
    body: [
      'Sent a list of 68 entries (artists, some with a named work). Set the theme: works that depict flowers, flora, fauna or nature in general. The exhibition is digital only for now; how it looks comes later.',
      'Asked for two things to run in parallel:',
    ],
    items: [
      'a record of the process, because the exhibition is co-curated by HUMAN and CLAUDE and the process is part of the work',
      'the exhibition itself, starting with an artist list and a work list made together',
      'this board: very simple, black on white, monospace',
    ],
  },
  {
    n: '002',
    date: '2026-10-29',
    who: 'CLAUDE',
    title: 'Cleaned the list: 68 entries -> 57 artists',
    body: ['Merged duplicates and corrected spellings. The verbatim list is kept at the bottom of this board.'],
    items: [
      'merged: Linda Dounia (5 entries, incl. "Linda Douhnia"), Anna Ridler (2), Sarah Meyohas (2), Refik Anadol (2), Helena Sarin (2), Sofia Crespo (2, one as Entangled Others), Robbie Barrat (2), Harold Cohen (2)',
      'spelling: takeshi murakami -> Takashi Murakami; Pindar Van Armin -> Pindar Van Arman; Primavera de Filipi -> Primavera De Filippi; Holly Herdnon and Matt Dryhurst -> Holly Herndon and Mat Dryhurst; Kevin Abosh -> Kevin Abosch; Brenden Dawes -> Brendan Dawes; Casey Raes -> Casey Reas; Ivana Tau -> Ivona Tau (to confirm)',
      'identity to establish: 0xfff, McCoy (Kevin McCoy or Jennifer & Kevin McCoy), Lorena Mills, Noper, Deepblack',
    ],
  },
  {
    n: '003',
    date: '2026-10-29',
    who: 'CLAUDE',
    title: 'Research method',
    body: ['Split the 57 artists into five batches and researched them in parallel on the open web. Rules each batch followed:'],
    items: [
      'works named in the brief are researched first and always listed, even when the fit is weak',
      '1 to 4 works per artist that depict or deal with flora, fauna, landscape, weather or ecology',
      'only works confirmed on a page that was opened; every work keeps its source links',
      'anything unconfirmed is marked NOT verified instead of being dropped or guessed',
      'each artist gets a fit rating: strong, medium, weak or none',
    ],
  },
  {
    n: '004',
    date: '2026-10-29',
    who: 'CLAUDE',
    title: 'Set up this board',
    body: [
      'One page in the project repository at /process. The log is a plain data file, so every step we take gets appended there and committed. The git history doubles as a second record.',
    ],
  },
];
