# website

Source for the [DashyNMS](https://github.com/DashyNMS/desktop) landing page, published via GitHub Pages at [dashynms.pckp.net](https://dashynms.pckp.net/).

Plain HTML/CSS, no build step. `index.html` is the page, `assets/` holds styles and images.

## Local preview

Open `index.html` directly in a browser, or serve the folder:

```
python -m http.server 8000
```

## Publishing

GitHub Pages should be configured (Settings → Pages) to deploy from the `main` branch, `/` (root). The `CNAME` file points the custom domain at this repo.
