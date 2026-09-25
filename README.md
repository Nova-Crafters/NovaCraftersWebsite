# NovaCrafters

The website for NovaCrafters, a 501(c)(3) nonprofit that builds free websites for certified nonprofits. Live at https://nova-crafters.com.

Plain HTML, CSS, and JavaScript with no build step, hosted on GitHub Pages.

- `index.html`, `about.html`, `contact.html`: the three pages; `404.html` for missing pages
- `styles.css`: all styles
- `nav.js`: menu, scroll effects, and footer year (every page)
- `scene.js`: the 3D background (every page)
- `contact.js`: contact form validation and sending (via Formspree)

When you change `styles.css` or any `.js` file, bump the `?v=` number on its links in every page so visitors and the Cloudflare cache load the new version.
