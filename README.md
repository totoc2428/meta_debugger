# Meta Python - Debugger Metaclass

Une métaclasse Python pour le débogage automatique des accès aux attributs et des appels de méthodes.

## Description

Ce projet implémente une métaclasse `Meta` qui permet de surveiller automatiquement :

- **Les appels de méthodes** : avec tous les arguments (args et kwargs)
- **Les accès aux attributs** : en lecture (get) et en écriture (set)

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
│   ├── debugger.py    # Classe Debugger pour la collecte des données
│   └── meta.py        # Métaclasse Meta
├── tests/
│   ├── __init__.py
│   ├── conftest.py    # Configuration pytest
│   └── test_meta.py   # Tests unitaires
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

## Licence

MIT
