/*
 * imagelinkgrab — grab every image link on a webpage.
 *
 * Use it two ways:
 *   1. Paste this whole file into the browser DevTools Console, press Enter.
 *   2. Use the one-line bookmarklet in bookmarklet.txt (same code, packed).
 *
 * It pulls image URLs from:
 *   - <img src> and <img data-src> / lazy attributes
 *   - srcset on <img> and <source> (every candidate)
 *   - inline style="background-image:url(...)"
 *   - computed background-image on every element (catches lazy-loaded divs
 *     like deliveryhero / foodora menu tiles)
 *   - <meta property="og:image"> and <link rel> icons / preloads
 *
 * Shows a floating panel with the deduped list + Copy and Download buttons.
 */
(function () {
  "use strict";

  var urls = new Set();

  // Only keep URLs matching this. Set to null to grab every image instead.
  var ONLY = /^https:\/\/images\.deliveryhero\.io\/image\/menu-import-gateway-prd\//;

  function add(u) {
    if (!u) return;
    u = u.trim().replace(/^["']|["']$/g, "");
    if (!u || u === "none" || u.indexOf("data:") === 0) return; // skip inline base64
    try {
      u = new URL(u, location.href).href; // resolve relative -> absolute
    } catch (e) {
      return;
    }
    if (ONLY && !ONLY.test(u)) return; // drop anything not the wanted format
    urls.add(u);
  }

  // url(...) values may hold several (rare), split conservatively.
  function fromCss(value) {
    if (!value || value === "none") return;
    var re = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
    var m;
    while ((m = re.exec(value))) add(m[2]);
  }

  // srcset: "a.jpg 150w, b.jpg 300w" -> a.jpg, b.jpg
  function fromSrcset(value) {
    if (!value) return;
    value.split(",").forEach(function (part) {
      add(part.trim().split(/\s+/)[0]);
    });
  }

  var LAZY_ATTRS = [
    "src", "data-src", "data-original", "data-lazy-src",
    "data-bg", "data-background-image", "data-image", "data-thumb"
  ];

  document.querySelectorAll("*").forEach(function (el) {
    var tag = el.tagName;

    if (tag === "IMG" || tag === "SOURCE") {
      LAZY_ATTRS.forEach(function (a) { add(el.getAttribute(a)); });
      fromSrcset(el.getAttribute("srcset"));
    }

    if (tag === "META") {
      var prop = (el.getAttribute("property") || el.getAttribute("name") || "").toLowerCase();
      if (prop.indexOf("image") !== -1) add(el.getAttribute("content"));
    }

    if (tag === "LINK") {
      var rel = (el.getAttribute("rel") || "").toLowerCase();
      if (/icon|image|preload|apple-touch/.test(rel)) add(el.getAttribute("href"));
    }

    // inline style first (cheap), then computed (catches everything else)
    if (el.style && el.style.backgroundImage) fromCss(el.style.backgroundImage);
    var bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none") fromCss(bg);
  });

  var list = Array.from(urls); // keep page order: first on page first, last last
  console.log("%cimagelinkgrab: found " + list.length + " image links", "color:#d70f64;font-weight:bold");
  console.log(list.join("\n"));
  window.__imageLinks = list; // also available in console as __imageLinks

  // ---- floating UI ----
  var old = document.getElementById("__ilg_panel");
  if (old) old.remove();

  var box = document.createElement("div");
  box.id = "__ilg_panel";
  box.style.cssText =
    "position:fixed;top:12px;right:12px;z-index:2147483647;width:380px;max-height:80vh;" +
    "display:flex;flex-direction:column;background:#fff;color:#111;border:1px solid #ddd;" +
    "border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:13px/1.4 system-ui,sans-serif;";

  var head = document.createElement("div");
  head.style.cssText =
    "display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #eee;";
  head.innerHTML =
    '<strong style="color:#d70f64">imagelinkgrab</strong>' +
    '<span style="color:#666">' + list.length + " links</span>";

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
    navigator.clipboard.writeText(list.join("\n")).then(function () {
      copyBtn.textContent = "Copied!";
      setTimeout(function () { copyBtn.textContent = "Copy"; }, 1200);
    });
  };

  var dlBtn = mkBtn("Download");
  dlBtn.onclick = function () {
    var blob = new Blob([list.join("\n")], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "image-links.txt";
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
  body.value = list.join("\n");
  body.style.cssText =
    "flex:1;border:0;outline:0;resize:none;padding:10px 12px;font:12px/1.5 monospace;" +
    "white-space:pre;overflow:auto;min-height:200px;";

  box.appendChild(head);
  box.appendChild(body);
  document.body.appendChild(box);
})();
