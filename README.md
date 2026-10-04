# website

Source for [dashynms.pckp.net](https://dashynms.pckp.net/), the website for DashyNMS [Desktop](https://github.com/DashyNMS/desktop) and [Mobile](https://github.com/DashyNMS/mobile), published via GitHub Pages.

Plain HTML/CSS, no build step. All pages share `assets/css/style.css`.

## Structure

```
/                    home: both apps, side by side
/desktop/            DashyNMS Desktop
/desktop/privacy/    Desktop privacy policy
/desktop/support/    Desktop support
/mobile/             DashyNMS Mobile
/mobile/privacy/     Mobile privacy policy
/mobile/support/     Mobile support
/404.html            not-found page
```

The apps link to some of these pages, so don't move them:

- `/mobile/`, `/mobile/privacy/` and `/mobile/support/` are built into the mobile app (Settings → About).
- `/` is the publisher link in the desktop installer.
- `/assets/img/favicon.svg` is the logo in both apps' READMEs.

## Local preview

Serve the folder, since pages use root-relative paths:

```
python3 -m http.server 8000
```

## Publishing

GitHub Pages should be configured (Settings → Pages) to deploy from the `main` branch, `/` (root). The `CNAME` file points the custom domain at this repo.
