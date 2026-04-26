# 🐍 Python Requirements Checker

> **Audita tu `requirements.txt`** — compara versiones con PyPI y detecta vulnerabilidades de seguridad con OSV.dev. Todo en tu navegador. Sin servidor, sin subidas, sin seguimiento.

<p align="center">
  <a href="https://dominocrasher119.github.io/requirements-checker/" target="_blank"><kbd>🚀 Pruébalo online</kbd></a>
</p>

---

## ✨ Funcionalidades

- **Arrastra y suelta** tu `requirements.txt` — o haz clic para seleccionarlo
- **Consulta a PyPI** — obtiene la última versión disponible de cada paquete
- **Escáner de vulnerabilidades OSV** — revisa cada versión contra la base de datos de vulnerabilidades de código abierto
- **Código de colores por severidad** — crítico, alto, medio, bajo, seguro, desconocido
- **Filtros y búsqueda** — encuentra paquetes por nombre o nivel de gravedad
- **Ordenación** — haz clic en cualquier columna para ordenar
- **Descarga actualizada** — exporta un `requirements.txt` renovado
- **100 % en cliente** — tu archivo nunca sale de tu máquina

---

## 🛠️ Cómo usarlo

1. Ve a la **[app online](https://dominocrasher119.github.io/requirements-checker/)**
2. Suelta tu `requirements.txt` en la zona de carga (o haz clic para seleccionarlo)
3. Espera unos segundos mientras se consultan PyPI y OSV
4. Revisa la tabla de resultados — busca, filtra por severidad, ordena columnas
5. Haz clic en **Download updated** para obtener un `requirements.txt` actualizado
6. Haz clic en **New file** para empezar de nuevo

También puedes probarlo con un **archivo de ejemplo** para ver cómo funciona.

---

## 📦 Ejemplo

`requirements.txt` de entrada:

```
requests==2.18.0
django==2.0.0
pillow==5.0.0
numpy
```

Resultado:
| Paquete | Versión fijada | Última | Severidad |
|---------|---------------|--------|-----------|
| requests | 2.18.0 | 2.32.3 | 🔴 Medium |
| django | 2.0.0 | 5.2 | 🔴 High |
| pillow | 5.0.0 | 11.2.1 | 🟡 Low |
| numpy | — | 2.2.4 | 🟢 Safe |

---

## 🧱 Tecnologías

| Tecnología | Propósito |
|------------|-----------|
| [API JSON de PyPI](https://warehouse.pypa.io/api-reference/json.html) | Consulta de últimas versiones |
| [API de OSV.dev](https://osv.dev/) | Base de datos de vulnerabilidades |
| [Tailwind CSS](https://tailwindcss.com/) vía CDN | Estilos utilitarios |
| JavaScript puro | Toda la lógica, sin frameworks |

---

## 🧑‍💻 Estructura del proyecto

```
requirements-checker/
├── index.html        # Página principal (con configuración inline de Tailwind)
├── styles.css        # CSS personalizado (animaciones, tabla, zona de carga)
├── app.js            # Lógica completa de la aplicación
├── favicon.png       # Favicon (32×32)
├── favicon-16.png    # Favicon (16×16)
├── 404.html          # Página 404 personalizada
├── .nojekyll         # Configuración de GitHub Pages
├── readme/
│   ├── README.en.md  # Inglés
│   ├── README.es.md  # Este archivo
│   └── README.ca.md  # Catalán
└── README.md         # Selector de idioma
```

---

## 🤝 Contacto

Creado por **Bernat** — aka [Dominocrasher119](https://github.com/Dominocrasher119)

[![GitHub](https://img.shields.io/badge/GitHub-Dominocrasher119-181717?style=flat&logo=github)](https://github.com/Dominocrasher119)
[![Instagram](https://img.shields.io/badge/Instagram-@bernatmarin__-E4405F?style=flat&logo=instagram)](https://instagram.com/bernatmarin_/)

---

## 📄 Licencia

MIT — úsalo, fórkalo, mejóralo.
