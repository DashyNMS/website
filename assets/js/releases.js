// Release notes, fetched live from GitHub Releases.
//
// <div data-releases="DashyNMS/desktop" data-view="page">   full release notes page
// <div data-releases="DashyNMS/desktop" data-view="teaser"> "What's new" block
// <span data-release-version="DashyNMS/desktop">v1.0.0</span>  kept as-is if GitHub can't be reached
//
// GitHub renders the Markdown. Copy only the markup this site supports into
// the live document, including when the response came from session storage.

(function () {
  const CACHE_MINUTES = 10;
  const PAGES = 3;
  const requests = {};
  let uid = 0;

  // Edge releases are builds of every commit, and aren't for this site.
  const isEdge = (r) => /-edge\.\d+$/.test(r.tag_name);
  const isStable = (r) => !r.draft && !r.prerelease;

  // What to call a prerelease. Nightlies were numbered previews until November 2026.
  const kind = (r) => (/-nightly\.\d+$/.test(r.tag_name) ? "Nightly" : "Preview");

  function github(repo, path) {
    return fetch("https://api.github.com/repos/" + repo + "/" + path, {
      headers: { Accept: "application/vnd.github.html+json" },
    }).then((r) => {
      if (!r.ok) throw new Error("GitHub said " + r.status);
      return r.json();
    });
  }

  // Every commit has an edge release, so the stable one can be a few pages back.
  async function list(repo) {
    const all = [];
    for (let page = 1; page <= PAGES; page++) {
      const some = await github(repo, "releases?per_page=100&page=" + page);
      all.push(...some);
      if (all.some(isStable) || some.length < 100) return all;
    }
    return all.concat(await github(repo, "releases/latest"));
  }

  function load(repo) {
    if (requests[repo]) return requests[repo];
    const key = "release-notes:" + repo;
    try {
      const cached = JSON.parse(sessionStorage.getItem(key));
      if (cached && Date.now() - cached.at < CACHE_MINUTES * 60000) {
        return (requests[repo] = Promise.resolve(cached.releases));
      }
    } catch (e) { /* storage blocked: just fetch */ }

    requests[repo] = list(repo)
      .then((all) => {
        const releases = all
          .filter((r) => !r.draft && !isEdge(r))
          .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
        try {
          sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), releases }));
        } catch (e) { /* ignore */ }
        return releases;
      });
    return requests[repo];
  }

  // Latest stable release, and the latest nightly (or preview) only if it's newer.
  function pick(releases) {
    const stable = releases.find((r) => !r.prerelease) || null;
    const nightly = releases.find((r) => r.prerelease) || null;
    const newer = nightly && (!stable || new Date(nightly.published_at) > new Date(stable.published_at));
    return { stable, nightly: newer ? nightly : null };
  }

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const version = (r) => (r.tag_name.startsWith("v") ? r.tag_name : "v" + r.tag_name);

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") node.className = v;
      else node.setAttribute(k, v);
    }
    for (const c of children) if (c != null) node.append(c);
    return node;
  }

  const noteTags = new Set([
    "a", "b", "blockquote", "br", "code", "dd", "del", "details", "div", "dl", "dt",
    "em", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "kbd", "li",
    "ol", "p", "pre", "s", "span", "strong", "sub", "summary", "sup", "table",
    "tbody", "td", "th", "thead", "tr", "ul",
  ]);

  function httpsUrl(value) {
    if (!value) return null;
    try {
      const url = new URL(value, "https://github.com/");
      return url.protocol === "https:" && !url.username && !url.password ? url : null;
    } catch {
      return null;
    }
  }

  function githubUrl(value) {
    const url = httpsUrl(value);
    return url?.origin === "https://github.com" ? url.href : null;
  }

  function copyNoteNode(node, parent) {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.append(node.textContent);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE ||
        node.namespaceURI !== "http://www.w3.org/1999/xhtml" ||
        !noteTags.has(node.localName)) return;

    const tag = node.localName;
    const copy = el(tag);
    if (tag === "a") {
      const href = node.getAttribute("href");
      const url = href?.startsWith("#") ? href : httpsUrl(href)?.href;
      if (url) copy.href = url;
      copy.rel = "noopener noreferrer";
    } else if (tag === "img") {
      const src = httpsUrl(node.getAttribute("src"));
      if (!src) return;
      copy.src = src.href;
      copy.alt = node.getAttribute("alt") || "";
      copy.loading = "lazy";
      copy.referrerPolicy = "no-referrer";
    }
    for (const child of node.childNodes) copyNoteNode(child, copy);
    parent.append(copy);
  }

  function parsedNotes(release) {
    return new DOMParser().parseFromString(release.body_html || "", "text/html").body;
  }

  function notes(release) {
    const body = el("div", { class: "release-body" });
    for (const node of parsedNotes(release).childNodes) copyNoteNode(node, body);
    const first = body.firstElementChild;
    if (first?.tagName === "H1") first.remove(); // repeats the version
    if (!body.textContent.trim() && !body.firstElementChild) {
      body.append(el("p", null, "No notes for this release."));
    }
    return body;
  }

  // First sentence of some text. If that's still long, end it at the last
  // natural break (a colon, dash, semicolon or comma), or failing that a word.
  function sentence(text, max) {
    text = text.replace(/\s+/g, " ").trim();
    const end = text.search(/[.!?](\s|$)/);
    if (end > 0) text = text.slice(0, end + 1);
    if (text.length <= max) return text;
    const head = text.slice(0, max);
    const brk = Math.max(...[": ", " - ", " – ", " — ", "; ", ", "].map((b) => head.lastIndexOf(b)));
    if (brk > max * 0.4) return head.slice(0, brk) + ".";
    return head.slice(0, head.lastIndexOf(" ")).replace(/[,;:\s]+$/, "") + "…";
  }

  const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // The line under the title: the opening paragraph, minus any bold tagline.
  function summary(release) {
    const p = parsedNotes(release).querySelector(":scope > p");
    if (!p) return "";
    const lead = p.querySelector(":scope > strong:first-child");
    if (lead) lead.remove();
    return p.textContent.trim() ? sentence(p.textContent, 160) : "";
  }

  // Top-level bullets that start in bold: the bold text, and the first sentence after it.
  // Sub-bullets are skipped: their bold text ("Load more") isn't a feature.
  function highlights(release, count) {
    return [...parsedNotes(release).querySelectorAll(":scope > ul > li > strong:first-child")]
      .slice(0, count)
      .map((s) => {
        const li = s.parentNode.cloneNode(true);
        li.querySelectorAll("ul, ol").forEach((n) => n.remove());
        li.querySelector("strong").remove();
        const rest = li.textContent.replace(/^[\s.:,–—-]+/, "");
        return {
          title: s.textContent.replace(/[.:,]\s*$/, ""),
          text: rest ? capitalise(sentence(rest, 110)) : "",
        };
      });
  }

  function download(release) {
    const exe = release.assets.find((a) => /\.(exe|msi|msix)$/i.test(a.name));
    const href = githubUrl(exe?.browser_download_url);
    if (!href) return null;
    const mb = Math.max(1, Math.round(exe.size / 1048576));
    return el("a", { class: "btn btn-primary", href }, "Download (" + mb + " MB)");
  }

  function head(release, label) {
    const href = githubUrl(release.html_url);
    return el("div", { class: "release-head" },
      el("div", null,
        el("span", { class: "release-tag" + (release.prerelease ? " is-preview" : "") }, label),
        el("h2", null, version(release)),
        el("p", { class: "release-date" }, "Released " + fmtDate(release.published_at))),
      el("div", { class: "cta-row" },
        download(release),
        href ? el("a", { class: "btn btn-secondary", href }, "View on GitHub") : null));
  }

  function renderPage(root, releases) {
    const { stable, nightly } = pick(releases);
    root.textContent = "";

    const current = [stable, nightly].filter(Boolean);
    if (!current.length) {
      root.append(el("p", { class: "release-error" },
        "There are no releases here yet. ",
        el("a", { href: "https://github.com/" + root.dataset.releases }, "Follow along on GitHub"), "."));
      return;
    }
    const panels = current.map((r) => {
      const panel = el("article", { class: "release-card" }, head(r, r.prerelease ? kind(r) : "Latest release"), notes(r));
      if (r.prerelease) {
        panel.insertBefore(el("p", { class: "release-note" },
          (kind(r) === "Preview" ? "Previews" : "Nightlies") + " are early builds of the next version, for trying new features before they’re finished. They may have rough edges."),
          panel.children[1]);
      }
      return panel;
    });

    if (panels.length > 1) {
      const tabs = el("div", { class: "release-tabs", role: "tablist" });
      current.forEach((r, i) => {
        const tab = el("button", { role: "tab", type: "button", "aria-selected": i === 0 ? "true" : "false" },
          r.prerelease ? kind(r) + " " : "Release ", el("span", null, version(r)));
        tab.addEventListener("click", () => {
          tabs.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-selected", j === i ? "true" : "false"));
          panels.forEach((p, j) => (p.hidden = j !== i));
        });
        tabs.append(tab);
      });
      panels.forEach((p, j) => (p.hidden = j !== 0));
      root.append(tabs);
    }
    panels.forEach((p) => root.append(p));

    const shown = new Set(current);
    const older = releases.filter((r) => !shown.has(r));
    if (older.length) {
      const list = el("div", { class: "release-history" });
      const toggle = el("input", { type: "checkbox", id: "release-nightlies-" + ++uid });
      const draw = () => {
        list.textContent = "";
        older
          .filter((r) => toggle.checked || !r.prerelease)
          .forEach((r) => {
            const d = el("details", null,
              el("summary", null,
                el("strong", null, version(r)),
                r.prerelease ? el("span", { class: "release-tag is-preview" }, kind(r)) : null,
                el("span", { class: "release-date" }, fmtDate(r.published_at))));
            d.addEventListener("toggle", () => { if (d.open && d.children.length === 1) d.append(notes(r)); }, { once: true });
            list.append(d);
          });
      };
      toggle.addEventListener("change", draw);
      draw();
      root.append(
        el("div", { class: "release-history-head" },
          el("h2", null, "Previous releases"),
          el("label", null, toggle, " Show early builds")),
        list);
    }
  }

  // A teaser with nothing to show takes its section with it, so no empty band is left.
  const dropTeaser = (root) => (root.closest("#whats-new") || root).remove();

  function renderTeaser(root, releases) {
    const { stable, nightly } = pick(releases);
    if (!stable && !nightly) return dropTeaser(root);
    const main = stable || nightly;
    const items = highlights(main, 4);
    const intro = summary(main);
    const page = root.dataset.page || "releases/";
    root.textContent = "";
    root.append(
      el("div", { class: "whats-new" },
        el("div", null,
          el("span", { class: "release-tag" + (main.prerelease ? " is-preview" : "") }, "What’s new"),
          el("h2", null, version(main)),
          el("p", { class: "release-date" }, "Released " + fmtDate(main.published_at)),
          intro ? el("p", { class: "release-summary" }, intro) : null),
        el("div", null,
          items.length
            ? el("ul", null, ...items.map((h) =>
                el("li", null, el("strong", null, h.title), h.text ? el("span", null, h.text) : null)))
            : null,
          nightly && stable
            ? el("p", { class: "release-preview-line" },
                el("span", { class: "release-tag is-preview" }, kind(nightly)),
                " ", el("a", { href: page + "#nightly" }, version(nightly)), " is out, with what’s coming next.")
            : null,
          el("a", { class: "btn btn-secondary", href: page }, "Read the release notes"))));
  }

  function fail(root, repo) {
    root.textContent = "";
    root.append(el("p", { class: "release-error" },
      "Release notes couldn’t be loaded just now. ",
      el("a", { href: "https://github.com/" + repo + "/releases" }, "See them on GitHub"), "."));
  }

  document.querySelectorAll("[data-releases]").forEach((root) => {
    const repo = root.dataset.releases;
    load(repo)
      .then((releases) => {
        if (root.dataset.view === "teaser") renderTeaser(root, releases);
        else renderPage(root, releases);
        // #preview is what earlier links used.
        if (location.hash === "#nightly" || location.hash === "#preview") root.querySelector('.release-tabs [role="tab"]:last-child')?.click();
      })
      .catch(() => (root.dataset.view === "teaser" ? dropTeaser(root) : fail(root, repo)));
  });

  document.querySelectorAll("[data-release-version]").forEach((span) => {
    load(span.dataset.releaseVersion)
      .then((releases) => {
        const { stable } = pick(releases);
        if (stable) span.textContent = version(stable);
      })
      .catch(() => {});
  });
})();
