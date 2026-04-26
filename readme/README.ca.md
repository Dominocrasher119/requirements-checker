# 🐍 Python Requirements Checker

> **Audita el teu `requirements.txt`** — compara versions amb PyPI i detecta vulnerabilitats de seguretat amb OSV.dev. Tot al teu navegador. Sense servidor, sense pujades, sense seguiment.

<p align="center">
  <a href="https://dominocrasher119.github.io/requirements-checker/" target="_blank"><kbd>🚀 Prova-ho online</kbd></a>
</p>

---

## ✨ Funcionalitats

- **Arrossega i deixa anar** el teu `requirements.txt` — o fes clic per seleccionar-lo
- **Consulta a PyPI** — obté la darrera versió disponible de cada paquet
- **Escàner de vulnerabilitats OSV** — revisa cada versió contra la base de dades de vulnerabilitats de codi obert
- **Codi de colors per severitat** — crític, alt, mitjà, baix, segur, desconegut
- **Filtres i cerca** — troba paquets per nom o nivell de gravetat
- **Ordenació** — fes clic a qualsevol columna per ordenar
- **Descàrrega actualitzada** — exporta un `requirements.txt` renovat
- **100 % al client** — el teu fitxer mai surt de la teva màquina

---

## 🛠️ Com utilitzar-lo

1. Ves a la **[app online](https://dominocrasher119.github.io/requirements-checker/)**
2. Deixa anar el teu `requirements.txt` a la zona de càrrega (o fes clic per seleccionar-lo)
3. Espera uns segons mentre es consulten PyPI i OSV
4. Revisa la taula de resultats — cerca, filtra per severitat, ordena columnes
5. Fes clic a **Download updated** per obtenir un `requirements.txt` actualitzat
6. Fes clic a **New file** per començar de nou

També pots provar-ho amb un **fitxer d'exemple** per veure com funciona.

---

## 📦 Exemple

`requirements.txt` d'entrada:

```
requests==2.18.0
django==2.0.0
pillow==5.0.0
numpy
```

Resultat:
| Paquet | Versió fixada | Darrera | Severitat |
|--------|--------------|---------|-----------|
| requests | 2.18.0 | 2.32.3 | 🔴 Medium |
| django | 2.0.0 | 5.2 | 🔴 High |
| pillow | 5.0.0 | 11.2.1 | 🟡 Low |
| numpy | — | 2.2.4 | 🟢 Safe |

---

## 🧱 Tecnologies

| Tecnologia | Propòsit |
|------------|----------|
| [API JSON de PyPI](https://warehouse.pypa.io/api-reference/json.html) | Consulta de darreres versions |
| [API d'OSV.dev](https://osv.dev/) | Base de dades de vulnerabilitats |
| [Tailwind CSS](https://tailwindcss.com/) via CDN | Estils utilitaris |
| JavaScript pur | Tota la lògica, sense frameworks |

---

## 🧑‍💻 Estructura del projecte

```
requirements-checker/
├── index.html        # Pàgina principal (amb configuració inline de Tailwind)
├── styles.css        # CSS personalitzat (animacions, taula, zona de càrrega)
├── app.js            # Lògica completa de l'aplicació
├── favicon.png       # Favicon (32×32)
├── favicon-16.png    # Favicon (16×16)
├── 404.html          # Pàgina 404 personalitzada
├── .nojekyll         # Configuració de GitHub Pages
├── readme/
│   ├── README.en.md  # Anglès
│   ├── README.es.md  # Castellà
│   └── README.ca.md  # Aquest fitxer
└── README.md         # Selector d'idioma
```

---

## 🤝 Contacte

Creat per **Bernat** — àlies [Dominocrasher119](https://github.com/Dominocrasher119)

[![GitHub](https://img.shields.io/badge/GitHub-Dominocrasher119-181717?style=flat&logo=github)](https://github.com/Dominocrasher119)
[![Instagram](https://img.shields.io/badge/Instagram-@bernatmarin__-E4405F?style=flat&logo=instagram)](https://instagram.com/bernatmarin_/)

---

## 📄 Llicència

MIT — fes-lo servir, forqueja'l, millora'l.
