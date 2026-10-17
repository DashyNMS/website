// Release notes, fetched live from GitHub Releases.
//
// <div data-releases="DashyNMS/desktop" data-view="page">   full release notes page
// <div data-releases="DashyNMS/desktop" data-view="teaser"> "What's new" block
// <span data-release-version="DashyNMS/desktop">v1.0.0</span>  kept as-is if GitHub can't be reached
//
// The notes come back as HTML GitHub has already rendered and sanitised
// (Accept: application/vnd.github.html+json), so there's no Markdown library.

(function () {
  const CACHE_MINUTES = 10;
  const requests = {};
  let uid = 0;

  function load(repo) {
    if (requests[repo]) return requests[repo];
    const key = "releases:" + repo;
    try {
      const cached = JSON.parse(sessionStorage.getItem(key));
      if (cached && Date.now() - cached.at < CACHE_MINUTES * 60000) {
        return (requests[repo] = Promise.resolve(cached.releases));
      }
    } catch (e) { /* storage blocked: just fetch */ }

    requests[repo] = fetch("https://api.github.com/repos/" + repo + "/releases?per_page=30", {
      headers: { Accept: "application/vnd.github.html+json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error("GitHub said " + r.status);
        return r.json();
      })
      .then((list) => {
        const releases = list
          .filter((r) => !r.draft)
          .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
        try {
          sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), releases }));
        } catch (e) { /* ignore */ }
        return releases;
      });
    return requests[repo];
  }

  // Latest stable release, and the latest preview only if it's newer.
  function pick(releases) {
    const stable = releases.find((r) => !r.prerelease) || null;
    const preview = releases.find((r) => r.prerelease) || null;
    const newer = preview && (!stable || new Date(preview.published_at) > new Date(stable.published_at));
    return { stable, preview: newer ? preview : null };
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

  // GitHub's HTML, tidied for this site.
  function notes(release) {
    const body = el("div", { class: "release-body" });
    body.innerHTML = release.body_html || "<p>No notes for this release.</p>";
    const first = body.firstElementChild;
    if (first && first.tagName === "H1") first.remove(); // repeats the version
    body.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href.startsWith("/")) a.href = "https://github.com" + href;
      a.rel = "noopener";
    });
    return body;
  }

  function rendered(release) {
    const box = document.createElement("div");
    box.innerHTML = release.body_html || "";
    return box;
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
    const p = rendered(release).querySelector(":scope > p");
    if (!p) return "";
    const lead = p.querySelector(":scope > strong:first-child");
    if (lead) lead.remove();
    return p.textContent.trim() ? sentence(p.textContent, 160) : "";
  }

  // Top-level bullets that start in bold: the bold text, and the first sentence after it.
  // Sub-bullets are skipped: their bold text ("Load more") isn't a feature.
  function highlights(release, count) {
    return [...rendered(release).querySelectorAll(":scope > ul > li > strong:first-child")]
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
    if (!exe) return null;
    const mb = Math.max(1, Math.round(exe.size / 1048576));
    return el("a", { class: "btn btn-primary", href: exe.browser_download_url }, "Download (" + mb + " MB)");
  }

  function head(release, label) {
    return el("div", { class: "release-head" },
      el("div", null,
        el("span", { class: "release-tag" + (release.prerelease ? " is-preview" : "") }, label),
        el("h2", null, version(release)),
        el("p", { class: "release-date" }, "Released " + fmtDate(release.published_at))),
      el("div", { class: "cta-row" },
        download(release),
        el("a", { class: "btn btn-secondary", href: release.html_url }, "View on GitHub")));
  }

  function renderPage(root, releases) {
    const { stable, preview } = pick(releases);
    root.textContent = "";

    const current = [stable, preview].filter(Boolean);
    const panels = current.map((r) => {
      const panel = el("article", { class: "release-card" }, head(r, r.prerelease ? "Preview" : "Latest release"), notes(r));
      if (r.prerelease) {
        panel.insertBefore(el("p", { class: "release-note" },
          "Previews are early builds of the next version, for trying new features before they’re finished. They may have rough edges."),
          panel.children[1]);
      }
      return panel;
    });

    if (panels.length > 1) {
      const tabs = el("div", { class: "release-tabs", role: "tablist" });
      current.forEach((r, i) => {
        const tab = el("button", { role: "tab", type: "button", "aria-selected": i === 0 ? "true" : "false" },
          r.prerelease ? "Preview " : "Release ", el("span", null, version(r)));
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
      const toggle = el("input", { type: "checkbox", id: "release-previews-" + ++uid });
      const draw = () => {
        list.textContent = "";
        older
          .filter((r) => toggle.checked || !r.prerelease)
          .forEach((r) => {
            const d = el("details", null,
              el("summary", null,
                el("strong", null, version(r)),
                r.prerelease ? el("span", { class: "release-tag is-preview" }, "Preview") : null,
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
          el("label", null, toggle, " Show previews")),
        list);
    }
  }

  function renderTeaser(root, releases) {
    const { stable, preview } = pick(releases);
    if (!stable && !preview) return;
    const main = stable || preview;
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
          preview && stable
            ? el("p", { class: "release-preview-line" },
                el("span", { class: "release-tag is-preview" }, "Preview"),
                " ", el("a", { href: page + "#preview" }, version(preview)), " is out, with what’s coming next.")
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
        if (location.hash === "#preview") root.querySelector('.release-tabs [role="tab"]:last-child')?.click();
      })
      .catch(() => (root.dataset.view === "teaser" ? root.remove() : fail(root, repo)));
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
