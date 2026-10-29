// Renders the process board from data/brief.js, data/script.js and data/research.js.
(function () {
  const TG = window.TG || {};
  const script = TG.script || [];
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
  <p>A process board, written as a play.</p>
</header>
<section class="cast" aria-label="Dramatis personae">
  <p class="who">LUKAS</p><p>curator</p>
  <p class="who">CLAUDE</p><p>curator</p>
</section>`;
  }

  function renderScript() {
    const lines = script.map(l => {
      if (l.act) return `<h3 class="act">${esc(l.act)}</h3>`;
      if (l.scene) return `<p class="scene">${esc(l.scene)}</p>`;
      if (l.dir) return `<p class="dir">(${esc(l.dir)})</p>`;
      const list = l.brief
        ? `<details><summary>the list, ${brief.length} lines</summary><pre>${esc(brief.join('\n'))}</pre></details>` : '';
      return `<div class="line${l.open ? ' open' : ''}"><p class="who">${esc(l.who)}</p><div class="say"><p>${esc(l.say)}</p>${list}</div></div>`;
    }).join('');
    return `
<section aria-labelledby="h-script">
  <h2 id="h-script">Script</h2>
  <div class="script">${lines}</div>
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

  document.getElementById('board').innerHTML = renderHead() + renderScript() + renderLonglist();
})();
