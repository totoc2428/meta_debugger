"""Module contenant la métaclasse Meta pour le débogage."""

import functools
from typing import Any, Callable, Dict, Tuple, Type

from .debugger import Debugger


class Meta(type):
    """Métaclasse qui collecte les accès aux attributs et appels de méthodes.
    
    Cette métaclasse permet de surveiller toutes les interactions avec les
    instances des classes qui l'utilisent, en enregistrant :
    - Les appels de méthodes (avec arguments)
    - Les accès en lecture/écriture aux attributs
    """
    
    # Ensemble des noms de méthodes internes à ignorer pour éviter la récursion
    _INTERNAL_METHODS = frozenset({
        '__getattribute__', '__setattr__', '__delattr__',
        '__class__', '__dict__', '__doc__', '__module__',
        '__weakref__', '__slots__'
    })
    
    def __new__(
        mcs,
        name: str,
        bases: Tuple[Type, ...],
        dct: Dict[str, Any]
    ) -> Type:
        """Crée une nouvelle classe avec interception des accès.
        
        Args:
            name: Nom de la classe.
            bases: Tuple des classes parentes.
            dct: Dictionnaire des attributs de la classe.
            
        Returns:
            La nouvelle classe avec les intercepteurs installés.
        """
        # Créer d'abord la classe pour avoir une référence stable
        cls = super().__new__(mcs, name, bases, dct)
        
        # Définir le gestionnaire de lecture d'attributs (GET)
        def logged_getattribute(self: Any, attr_name: str) -> Any:
            # Utiliser object.__getattribute__ pour éviter la récursion infinie
            val = object.__getattribute__(self, attr_name)
            
            # Ne pas enregistrer les accès aux méthodes internes
            if attr_name not in Meta._INTERNAL_METHODS:
                Debugger.attribute_accesses.append({
                    'action': 'get',
                    'class': cls,
                    'attribute': attr_name,
                    'value': val
                })
            return val
        
        # Définir le gestionnaire d'écriture d'attributs (SET)
        def logged_setattr(self: Any, attr_name: str, value: Any) -> None:
            Debugger.attribute_accesses.append({
                'action': 'set',
                'class': cls,
                'attribute': attr_name,
                'value': value
            })
            object.__setattr__(self, attr_name, value)
        
        # Injecter les intercepteurs dans la classe
        cls.__getattribute__ = logged_getattribute  # type: ignore
        cls.__setattr__ = logged_setattr  # type: ignore
        
        # Emballer les méthodes pour capturer les appels
        for attr_name, attr_value in dct.items():
            if callable(attr_value) and not attr_name.startswith('__'):
                setattr(cls, attr_name, mcs._wrap_method(cls, attr_name, attr_value))
            elif attr_name == '__init__':
                setattr(cls, attr_name, mcs._wrap_method(cls, attr_name, attr_value))
        
        return cls
    
    @staticmethod
    def _wrap_method(cls: Type, method_name: str, func: Callable) -> Callable:
        """Emballe une méthode pour enregistrer ses appels.
        
        Args:
            cls: La classe à laquelle appartient la méthode.
            method_name: Le nom de la méthode.
            func: La fonction originale.
            
        Returns:
            Une fonction wrapper qui enregistre les appels.
        """
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            Debugger.method_calls.append({
                'class': cls,
                'method': method_name,
                'args': args,
                'kwargs': kwargs
            })
            return func(*args, **kwargs)
        return wrapper
