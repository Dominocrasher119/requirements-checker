# 🐍 Python Requirements Checker

> **Audit your `requirements.txt`** — compare pinned versions against PyPI, detect security vulnerabilities with OSV.dev, all in your browser. No server, no uploads, no tracking.

<p align="center">
  <a href="https://dominocrasher119.github.io/requirements-checker/" target="_blank"><kbd>🚀 Try it live</kbd></a>
</p>

---

## ✨ Features

- **Drag & drop** your `requirements.txt` — or click to browse
- **PyPI lookup** — fetches the latest version for each package
- **OSV vulnerability scan** — checks every pinned version against the Open Source Vulnerabilities database
- **Severity color coding** — critical, high, medium, low, safe, unknown
- **Filter & search** — find packages by name or severity level
- **Sort** — click any column header to sort
- **Download updated** — exports a new `requirements.txt` with pinned versions (even from unpinned constraints)
- **100 % client-side** — your file never leaves your machine

---

## 🛠️ How to use

1. Go to the **[live app](https://dominocrasher119.github.io/requirements-checker/)**
2. Drop your `requirements.txt` on the upload zone (or click to select)
3. Wait a few seconds while PyPI and OSV are queried
4. Review the results table — search, filter by severity, sort columns
5. Click **Download updated** to get a refreshed `requirements.txt`
6. Click **New file** to start over

You can also try it with a **sample file** to see how it works.

---

## 📦 Example

Input `requirements.txt`:

```
requests==2.18.0
django==2.0.0
pillow==5.0.0
numpy
```

What you get:
| Package | Pinned | Latest | Severity |
|---------|--------|--------|----------|
| requests | 2.18.0 | 2.32.3 | 🔴 Medium |
| django | 2.0.0 | 5.2 | 🔴 High |
| pillow | 5.0.0 | 11.2.1 | 🟡 Low |
| numpy | — | 2.2.4 | 🟢 Safe |

---

## 🧱 Tech stack

| Technology | Purpose |
|------------|---------|
| [PyPI JSON API](https://warehouse.pypa.io/api-reference/json.html) | Latest version lookup |
| [OSV.dev API](https://osv.dev/) | Vulnerability database |
| [Tailwind CSS](https://tailwindcss.com/) via CDN | Utility-first styling |
| Vanilla JS | All logic, no frameworks |

---

## 🧑‍💻 Project structure

```
requirements-checker/
├── index.html        # Main page (includes inline Tailwind config)
├── styles.css        # Custom CSS (animations, table, drop zone)
├── app.js            # Full application logic
├── favicon.png       # Favicon (32×32)
├── favicon-16.png    # Favicon (16×16)
├── 404.html          # Custom 404 page
├── .nojekyll         # GitHub Pages config
├── readme/
│   ├── README.en.md  # This file
│   ├── README.es.md  # Spanish
│   └── README.ca.md  # Catalan
└── README.md         # Language selector
```

---

## 🤝 Contact

Created by **Bernat** — aka [Dominocrasher119](https://github.com/Dominocrasher119)

[![GitHub](https://img.shields.io/badge/GitHub-Dominocrasher119-181717?style=flat&logo=github)](https://github.com/Dominocrasher119)
[![Instagram](https://img.shields.io/badge/Instagram-@bernatmarin__-E4405F?style=flat&logo=instagram)](https://instagram.com/bernatmarin_/)

---

## 📄 License

MIT — use it, fork it, improve it.
