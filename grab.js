/*
 * imagelinkgrab — grab every menu item (category + name + image link) on a page.
 *
 * Use it two ways:
 *   1. Paste this whole file into the browser DevTools Console, press Enter.
 *   2. Use the one-line bookmarklet in bookmarklet.txt (same code, packed).
 *
 * Built for deliveryhero / foodora menu pages. It walks each category section
 * (div.dish-category-section), then every product tile (li[data-testid="menu-product"])
 * inside it, pulling the item name and its image link. Output is grouped:
 *
 *   Category
 *       - Name
 *       - link
 *       - Name 2
 *       - link 2
 *
 * Image link per tile comes from:
 *   - <img src> / data-src / lazy attrs / srcset
 *   - inline style="background-image:url(...)" (lazy-loaded-dish-photo divs)
 *   - computed background-image
 *
 * If no category sections are found it falls back to grabbing every image link.
 *
 * Shows a floating panel with the grouped text + Copy and Download buttons.
 */
(function () {
  "use strict";

  // Only keep image URLs matching this. Set to null to grab every image.
  var ONLY = /^https:\/\/images\.deliveryhero\.io\/image\//i;

  function clean(u) {
    if (!u) return null;
    u = u.trim().replace(/^["']|["']$/g, "");
    if (!u || u === "none" || u.indexOf("data:") === 0) return null; // skip base64
    try {
      u = new URL(u, location.href).href; // resolve relative -> absolute
    } catch (e) {
      return null;
    }
    if (ONLY && !ONLY.test(u)) return null; // drop anything not the wanted format
    return u;
  }

  // pull the first url(...) out of a css value
  function fromCss(value) {
    if (!value || value === "none") return null;
    var m = /url\(\s*(['"]?)(.*?)\1\s*\)/.exec(value);
    return m ? clean(m[2]) : null;
  }

  // srcset: "a.jpg 150w, b.jpg 300w" -> first candidate
  function fromSrcset(value) {
    if (!value) return null;
    var first = value.split(",")[0];
    return first ? clean(first.trim().split(/\s+/)[0]) : null;
  }

  var LAZY_ATTRS = [
    "src", "data-src", "data-original", "data-lazy-src",
    "data-bg", "data-background-image", "data-image", "data-thumb"
  ];

  // find the image link inside a single product tile (or any element subtree)
  function imgFrom(root) {
    var els = root.querySelectorAll("img,source,[style],*");
    for (var i = 0; i < els.length; i++) {
      var el = els[i], u;
      var tag = el.tagName;
      if (tag === "IMG" || tag === "SOURCE") {
        for (var j = 0; j < LAZY_ATTRS.length; j++) {
          u = clean(el.getAttribute(LAZY_ATTRS[j]));
          if (u) return u;
        }
        u = fromSrcset(el.getAttribute("srcset"));
        if (u) return u;
      }
      if (el.style && el.style.backgroundImage) {
        u = fromCss(el.style.backgroundImage);
        if (u) return u;
      }
      var bg = getComputedStyle(el).backgroundImage;
      u = fromCss(bg);
      if (u) return u;
    }
    return null;
  }

  function txt(el) {
    return el ? (el.textContent || "").trim().replace(/\s+/g, " ") : "";
  }

  // ---- walk the menu: category -> items ----
  var groups = []; // [{ category, items: [{ name, link }] }]
  var sections = document.querySelectorAll(".dish-category-section");

  sections.forEach(function (sec) {
    var title =
      txt(sec.querySelector(".dish-category-title")) ||
      txt(sec.querySelector('[data-testid="menu-category-section-title"]')) ||
      "Uncategorized";

    var items = [];
    sec.querySelectorAll('[data-testid="menu-product"]').forEach(function (li) {
      var name = txt(li.querySelector('[data-testid="menu-product-name"]'));
      var link = imgFrom(li);
      if (name || link) items.push({ name: name, link: link });
    });

    if (items.length) groups.push({ category: title, items: items });
  });

  // ---- fallback: no category sections, grab every image link ----
  if (!groups.length) {
    var seen = new Set();
    document.querySelectorAll("img,source,[style],*").forEach(function (el) {
      var u = null, tag = el.tagName;
      if (tag === "IMG" || tag === "SOURCE") {
        for (var j = 0; j < LAZY_ATTRS.length; j++) {
          u = clean(el.getAttribute(LAZY_ATTRS[j]));
          if (u) seen.add(u);
        }
        u = fromSrcset(el.getAttribute("srcset"));
        if (u) seen.add(u);
      }
      if (el.style && el.style.backgroundImage) {
        u = fromCss(el.style.backgroundImage);
        if (u) seen.add(u);
      }
      u = fromCss(getComputedStyle(el).backgroundImage);
      if (u) seen.add(u);
    });
    groups.push({
      category: "Images",
      items: Array.from(seen).map(function (u) { return { name: "", link: u }; })
    });
  }

  // ---- build grouped text ----
  var lines = [];
  var itemCount = 0;
  groups.forEach(function (g) {
    lines.push(g.category);
    g.items.forEach(function (it) {
      itemCount++;
      if (it.name) lines.push("    - " + it.name);
      lines.push("    - " + (it.link || "(no image)"));
    });
    lines.push(""); // blank line between categories
  });
  var text = lines.join("\n").replace(/\n+$/, "\n");

  console.log(
    "%cimagelinkgrab: " + itemCount + " items in " + groups.length + " categories",
    "color:#d70f64;font-weight:bold"
  );
  console.log(text);
  window.__menuItems = groups; // structured data, also in console

  // ---- floating UI ----
  var old = document.getElementById("__ilg_panel");
  if (old) old.remove();

  var box = document.createElement("div");
  box.id = "__ilg_panel";
  box.style.cssText =
    "position:fixed;top:12px;right:12px;z-index:2147483647;width:420px;max-height:80vh;" +
    "display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #ddd;" +
    "border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:13px/1.4 system-ui,sans-serif;";

  var head = document.createElement("div");
  head.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #eee;";
  head.innerHTML =
    '<strong style="color:#d70f64">imagelinkgrab</strong>' +
    '<span style="color:#666">' + itemCount + " items</span>";

  var spacer = document.createElement("div");
  spacer.style.flex = "1";
  head.appendChild(spacer);

  function mkBtn(label) {
    var b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      "cursor:pointer;border:0;border-radius:6px;padding:5px 10px;margin-left:6px;" +
      "background:#d70f64;color:#fff;font:inherit;";
    return b;
  }

  var copyBtn = mkBtn("Copy");
  copyBtn.onclick = function () {
    navigator.clipboard.writeText(text).then(function () {
      copyBtn.textContent = "Copied!";
      setTimeout(function () { copyBtn.textContent = "Copy"; }, 1200);
    });
  };

  var dlBtn = mkBtn("Download");
  dlBtn.onclick = function () {
    var blob = new Blob([text], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "menu-items.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  var closeBtn = mkBtn("✕");
  closeBtn.style.background = "#888";
  closeBtn.onclick = function () { box.remove(); };

  head.appendChild(copyBtn);
  head.appendChild(dlBtn);
  head.appendChild(closeBtn);

  var body = document.createElement("textarea");
  body.readOnly = true;
  body.value = text;
  body.style.cssText =
    "flex:1;border:0;outline:0;resize:none;padding:10px 12px;font:12px/1.5 monospace;" +
    "white-space:pre;overflow:auto;min-height:200px;";

  box.appendChild(head);
  box.appendChild(body);
  document.body.appendChild(box);
})();
