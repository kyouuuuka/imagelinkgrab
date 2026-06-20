# imagelinkgrab

Grab every image link on a webpage — directly from the page, no install, no server.

It pulls image URLs from `<img src>`, lazy attributes (`data-src`, etc.), `srcset`
candidates, `<meta og:image>`, icon/preload `<link>`s, **and** CSS
`background-image` (inline + computed). That last one is the important part: sites
like deliveryhero / foodora load menu photos as `background-image: url(...)` on a
`<div>`, not as `<img>`, so a plain "grab all img tags" tool misses them.

## Two ways to run it

### 1. Console (one time, any page)

1. Open the webpage.
2. Press `F12` → **Console** tab.
3. Paste the whole contents of [`grab.js`](grab.js), press Enter.
4. A panel appears top-right with the list. Click **Copy** or **Download**.

### 2. Bookmarklet (one click, reusable)

1. Open [`bookmarklet.txt`](bookmarklet.txt) and copy the whole line (starts with `javascript:`).
2. Make a new bookmark in your browser, paste it as the **URL**, name it `Grab images`.
3. On any page, click the bookmark → same panel pops up.

> Tip: scroll the page to the bottom first so lazy-loaded images actually load,
> then run it — only loaded images exist in the DOM.

## Output

- Floating panel with **Copy** / **Download** (`image-links.txt`) / close.
- Also logged to the console.
- Also stored in `window.__imageLinks` (array) for further poking.

## Rebuild the bookmarklet

After editing `grab.js`:

```bash
node -e 'const fs=require("fs");let s=fs.readFileSync("grab.js","utf8").replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");fs.writeFileSync("bookmarklet.txt","javascript:"+encodeURIComponent(s));'
```
