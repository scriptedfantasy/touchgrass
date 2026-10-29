// Renders the process board from data/brief.js, data/log.js and data/research.js.
(function () {
  const TG = window.TG || {};
  const log = TG.log || [];
  const artists = (TG.research || {}).artists || [];
  const brief = TG.brief || [];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function host(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
  }

  function renderHead() {
    return `
<header class="head">
  <h1>Touch Grass</h1>
  <p>Nature's Representation Online</p>
  <p>Process board. Curated by Lukas and Claude.</p>
</header>`;
  }

  // Entries are numbered in order; date rows start a new day and take no number.
  function renderLog() {
    let n = 0;
    const rows = log.map(e => {
      if (e.date) return `<li class="date">${esc(e.date)}</li>`;
      const num = String(++n).padStart(3, '0');
      if (e.dir) return `<li class="entry dir"><span class="num">${num}</span><span class="who"></span><p>(${esc(e.dir)})</p></li>`;
      const list = e.brief
        ? `<details><summary>the list, ${brief.length} lines</summary><pre>${esc(brief.join('\n'))}</pre></details>` : '';
      return `<li class="entry${e.open ? ' open' : ''}"><span class="num">${num}</span><span class="who">${esc(e.who)}</span><div class="say"><p>${esc(e.say)}</p>${list}</div></li>`;
    }).join('');
    return `
<section aria-labelledby="h-log">
  <h2 id="h-log">Log</h2>
  <ol class="log">${rows}</ol>
</section>`;
  }

  function renderLonglist() {
    const nWorks = artists.reduce((n, a) => n + a.works.length, 0);
    const items = artists.map(a => {
      const works = a.works.map(w => {
        const links = (w.sources || []).map(u =>
          `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a>`).join('');
        const bits = [w.title + (w.year ? `, ${w.year}` : ''), w.where].filter(Boolean).map(esc).join('. ');
        return `<li>${w.verified ? '' : '* '}${bits}.${w.named_in_brief ? ' [brief]' : ''}<span class="links">${links}</span></li>`;
      }).join('');
      return `
<li class="artist" id="${esc(a.id)}">
  <p class="artist-head"><span>${esc(a.id)} ${esc(a.artist)}</span><span>${esc(a.status)}</span></p>
  ${works ? `<ul class="works">${works}</ul>` : '<p class="works none">no work found</p>'}
</li>`;
    }).join('');
    return `
<section aria-labelledby="h-long">
  <h2 id="h-long">Longlist</h2>
  <p>${artists.length} artists, ${nWorks} works. [brief] = named by Lukas. * = not verified. Links go to the sources.</p>
  <ol class="artists">${items}</ol>
</section>`;
  }

  document.getElementById('board').innerHTML = renderHead() + renderLog() + renderLonglist();
})();
