"""Module Debugger pour collecter les appels de méthodes et accès aux attributs."""

from typing import Any, Dict, List


class Debugger:
    """Classe de débogage pour collecter les données d'accès aux attributs et appels de méthodes.
    
    Attributes:
        method_calls: Liste des appels de méthodes collectés.
        attribute_accesses: Liste des accès aux attributs collectés.
    """
    
    method_calls: List[Dict[str, Any]] = []
    attribute_accesses: List[Dict[str, Any]] = []
    
    @classmethod
    def clear(cls) -> None:
        """Réinitialise les listes de collecte."""
        cls.method_calls.clear()
        cls.attribute_accesses.clear()
