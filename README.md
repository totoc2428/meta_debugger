# Meta Python - Debugger Metaclass & AST Visualizer

Une métaclasse Python pour le débogage automatique des accès aux attributs et des appels de méthodes, avec une interface web interactive pour visualiser l'AST (Abstract Syntax Tree).

## Description

Ce projet implémente une métaclasse `Meta` qui permet de surveiller automatiquement :

- **Les appels de méthodes** : avec tous les arguments (args et kwargs)
- **Les accès aux attributs** : en lecture (get) et en écriture (set)

De plus, une **interface web** permet de :

- Éditer du code Python avec **CodeMirror 6** (syntax highlighting)
- Visualiser l'**AST** en tree view interactif et en graphe **D3.js**
- Exécuter le code directement dans le navigateur avec **Pyodide**
- Inspecter les traces du Debugger (method_calls, attribute_accesses)

## Interface Web

![AST Visualizer](docs/screenshot.png)

### Lancer avec Docker

```bash
# Build et lancement
docker compose up --build

# Accéder à l'interface
# http://localhost:8080
```

### Mode développement (hot reload)

```bash
# Utiliser le profil dev avec montage de volumes
docker compose --profile dev up web-dev
```

### Raccourcis clavier

- `Ctrl+Enter` : Exécuter le code
- Tree view : Cliquer sur un nœud pour voir le code correspondant dans l'éditeur
- Graphe : Zoom avec la molette, pan avec drag

## Installation

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd meta_python

# Installer les dépendances de développement
pip install -e ".[dev]"
```

## Utilisation

```python
from src import Meta, Debugger

class MaClasse(metaclass=Meta):
    def __init__(self, valeur):
        self.valeur = valeur

    def ma_methode(self, x):
        return self.valeur + x

# Utilisation
obj = MaClasse(10)
result = obj.ma_methode(5)

# Consulter les logs
print("Appels de méthodes:", Debugger.method_calls)
print("Accès aux attributs:", Debugger.attribute_accesses)
```

## Structure du projet

```
meta_python/
├── src/
│   ├── __init__.py
│   ├── ast_parser.py  # Parser AST vers JSON
│   ├── debugger.py    # Classe Debugger pour la collecte des données
│   ├── meta.py        # Métaclasse Meta
│   └── serializer.py  # Sérialisation JSON des données
├── web/
│   ├── index.html     # Page principale
│   ├── css/
│   │   └── styles.css # Styles (thème sombre)
│   └── js/
│       ├── main.js          # Orchestrateur
│       ├── editor.js        # CodeMirror 6
│       ├── pyodide-runner.js # Exécution Python
│       ├── ast-tree.js      # Tree view
│       └── ast-graph.js     # Graphe D3.js
├── tests/
│   ├── __init__.py
│   ├── conftest.py    # Configuration pytest
│   └── test_meta.py   # Tests unitaires
├── Dockerfile         # Image Docker nginx
├── docker-compose.yml # Configuration Docker
├── nginx.conf         # Configuration nginx
├── main.py            # Exemple d'utilisation
├── pyproject.toml     # Configuration du projet
└── README.md
```

## Tests

```bash
# Lancer les tests
pytest

# Avec couverture
pytest --cov=src --cov-report=html
```

## Format des données collectées

### Appels de méthodes

```python
{
    'class': <class 'MaClasse'>,  # Objet classe (pas une string)
    'method': '__init__',          # Nom de la méthode
    'args': (instance, 10),        # Arguments incluant self
    'kwargs': {}                   # Arguments nommés
}
```

### Accès aux attributs

```python
{
    'action': 'set',               # 'set' ou 'get'
    'class': <class 'MaClasse'>,   # Objet classe
    'attribute': 'valeur',         # Nom de l'attribut
    'value': 10                    # Valeur
}
```

## Technologies utilisées

| Composant            | Technologie              |
| -------------------- | ------------------------ |
| Backend Python       | Métaclasse, module `ast` |
| Éditeur de code      | CodeMirror 6             |
| Exécution navigateur | Pyodide                  |
| Visualisation AST    | D3.js v7                 |
| Serveur web          | nginx:alpine             |
| Conteneurisation     | Docker                   |

## Licence

MIT
