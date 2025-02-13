---

draft: true
date: 2025-02-10 
categories:
    - tutorials
tags:
    - documentation
    - mkdocs
    - python-package
    - ci/cd
    - uv

comments: true

---

# How to Document a Python Package

Documentation is an essential part of any software project, especially for Python packages. In this guide, we'll explore the best practices for documenting a Python package using tools like MkDocs, MkDocStrings, and Univelcity.

<!-- more -->
# Introduction
```bash
.
├── CHANGELOG.md
├── README.md
├── assets/
├── your_package_name/
├── tests/
├── pyproject.toml
└── uv.lock
```

- Install mkdocs-material for documentation:
    ```bash
    uv add mkdocs-material "mkdocstrings[python]" --optional docs
    uv sync --all-extras
    ```

    ??? quote "Output in pyproject.toml"
        ```toml
        ...

        [project.optional-dependencies]
        docs = [
            "mkdocs-material>=9.6.3",
            "mkdocstrings[python]>=0.28.0",
        ]

        ...
        ```

- Create a `docs` using the following command:
    ```bash
    mkdocs new .
    ```