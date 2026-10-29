// Renders the process board from data/brief.js, data/log.js and data/research.js.
(function () {
  const TG = window.TG || {};
  const log = TG.log || [];
  const research = TG.research || { artists: [] };
  const artists = research.artists || [];
  const brief = TG.brief || [];

  const FITS = ['strong', 'medium', 'weak', 'none'];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad(s, n) {
    s = String(s);
    return s.length >= n ? s : s + ' '.repeat(n - s.length);
  }
  function host(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; }
  }

  function renderHead() {
    const last = log[log.length - 1];
    const workCount = artists.reduce((n, a) => n + (a.works || []).length, 0);
    return `
<section class="head">
  <h1>Touch Grass &mdash; Nature's Representation Online</h1>
  <p>Process board. A running record of how this exhibition is being made.</p>
</section>
<dl class="meta">
  <dt>Curators</dt><dd>HUMAN + CLAUDE</dd>
  <dt>Format</dt><dd>digital only (for now)</dd>
  <dt>Phase</dt><dd>01 / artist list + work list</dd>
  <dt>Started</dt><dd>${esc(log[0] ? log[0].date : '')}</dd>
  <dt>Last step</dt><dd>#${esc(last ? last.n : '')} ${esc(last ? last.date : '')}</dd>
  <dt>Longlist</dt><dd>${artists.length} artists, ${workCount} works</dd>
</dl>`;
  }

  function renderLog() {
    const items = log.map(e => {
      const body = (e.body || []).map(p => `<p>${p}</p>`).join('');
      const list = e.items && e.items.length
        ? `<ul>${e.items.map(i => `<li>${i}</li>`).join('')}</ul>` : '';
      return `
<li class="entry${e.next ? ' next' : ''}" id="step-${esc(e.n)}">
  <p class="entry-head">#${esc(e.n)}  ${esc(e.date)}  ${pad(esc(e.who), 6)}  ${esc(e.title)}</p>
  <div class="entry-body">${body}${list}</div>
</li>`;
    }).join('');
    return `
<section aria-labelledby="h-log">
  <h2 id="h-log">Log</h2>
  <p class="muted">Newest step at the bottom. Who: HUMAN, CLAUDE or BOTH.</p>
  <ol class="log">${items}</ol>
</section>`;
  }

  function renderSummary() {
    if (!artists.length) return '';
    const counts = FITS.map(f => `${f}: ${artists.filter(a => a.fit === f).length}`).join('   ');
    const rows = artists.map(a => `
<tr>
  <td><a href="#${esc(a.id)}">${esc(a.id)}</a></td>
  <td class="wrap">${esc(a.artist)}</td>
  <td>${esc(a.fit)}</td>
  <td>${(a.works || []).length}</td>
  <td>${esc(a.status)}</td>
</tr>`).join('');
    return `
<section aria-labelledby="h-sum">
  <h2 id="h-sum">Longlist</h2>
  <p>${counts}</p>
  <p class="muted">fit = how closely the artist's work matches the theme, judged by CLAUDE from research. status = curatorial decision, set together.</p>
  <div class="scroll"><table>
    <thead><tr><th>id</th><th>artist</th><th>fit</th><th>works</th><th>status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
</section>`;
  }

  function renderWork(w) {
    const sources = (w.sources || []).map((u, i) =>
      `<a href="${esc(u)}" target="_blank" rel="noopener">[${i + 1}] ${esc(host(u))}</a>`).join(' ');
    const flags = [w.named_in_brief ? 'named in brief' : '', w.verified ? 'verified' : 'NOT verified']
      .filter(Boolean).join(', ');
    return `
<li class="work" id="${esc(w.id)}">
  <p class="work-title">${esc(w.id)}  ${esc(w.title)}${w.year ? ` <i>(${esc(w.year)})</i>` : ''}</p>
  <dl class="kv">
    <dt>medium</dt><dd>${esc(w.medium)}</dd>
    <dt>where</dt><dd>${esc(w.where)}</dd>
    <dt>nature</dt><dd>${esc((w.nature || []).join(', '))}</dd>
    <dt>why</dt><dd>${esc(w.why)}</dd>
    <dt>status</dt><dd>${esc(w.status)} / ${esc(flags)}</dd>
    <dt>sources</dt><dd>${sources || '&mdash;'}</dd>
  </dl>
</li>`;
  }

  function renderArtists() {
    if (!artists.length) return '';
    const filters = ['all'].concat(FITS).map(f =>
      `<button type="button" data-fit="${f}" aria-pressed="${f === 'all'}">${f}</button>`).join('');
    const items = artists.map(a => {
      const works = (a.works || []).length
        ? `<ol class="works">${a.works.map(renderWork).join('')}</ol>`
        : '<p>No fitting work found.</p>';
      return `
<li class="artist" id="${esc(a.id)}" data-fit="${esc(a.fit)}">
  <p class="artist-head">${esc(a.id)}  ${esc(a.artist)}  [fit: ${esc(a.fit)}] [status: ${esc(a.status)}]</p>
  <div class="artist-body">
    <dl class="kv">
      <dt>listed as</dt><dd>${esc((a.as_listed || []).join(' / '))}</dd>
      ${a.name_note ? `<dt>name</dt><dd>${esc(a.name_note)}</dd>` : ''}
      <dt>practice</dt><dd>${esc(a.practice)}</dd>
      ${a.notes ? `<dt>notes</dt><dd>${esc(a.notes)}</dd>` : ''}
    </dl>
    ${works}
  </div>
</li>`;
    }).join('<li aria-hidden="true"><hr></li>');
    return `
<section aria-labelledby="h-art">
  <h2 id="h-art">Artists + works</h2>
  <p class="muted">Research as of ${esc(research.updated || '')}. Every work links to the pages it was checked against.</p>
  <div class="filters" role="group" aria-label="Filter by fit">${filters}</div>
  <ol class="artists">${items}</ol>
</section>`;
  }

  function renderBrief() {
    return `
<section aria-labelledby="h-brief">
  <h2 id="h-brief">Source list</h2>
  <p class="muted">The list as HUMAN sent it in step #001, verbatim. ${brief.length} lines.</p>
  <pre class="brief">${esc(brief.join('\n'))}</pre>
</section>`;
  }

  const board = document.getElementById('board');
  board.innerHTML = renderHead() + renderLog() + renderSummary() + renderArtists() + renderBrief();

  // Fit filter: hides artist records whose fit does not match.
  const buttons = board.querySelectorAll('.filters button');
  const records = board.querySelectorAll('.artist');
  const seps = board.querySelectorAll('.artists > li[aria-hidden]');
  buttons.forEach(b => b.addEventListener('click', () => {
    const fit = b.dataset.fit;
    buttons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    records.forEach(r => { r.hidden = fit !== 'all' && r.dataset.fit !== fit; });
    seps.forEach(s => { s.hidden = fit !== 'all'; });
  }));
})();
