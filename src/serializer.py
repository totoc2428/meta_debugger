"""Module pour sérialiser les données du Debugger en JSON."""

import json
from typing import Any, Dict, List

from .debugger import Debugger


def serialize_value(value: Any) -> Any:
    """Convertit une valeur en format JSON-sérialisable.

    Args:
        value: Valeur à convertir.

    Returns:
        Valeur sérialisable.
    """
    if isinstance(value, type):
        return {'__type__': 'class', 'name': value.__name__}
    elif isinstance(value, (str, int, float, bool, type(None))):
        return value
    elif isinstance(value, (list, tuple)):
        return [serialize_value(item) for item in value]
    elif isinstance(value, dict):
        return {str(k): serialize_value(v) for k, v in value.items()}
    elif hasattr(value, '__dict__'):
        return {
            '__type__': 'object',
            'class': value.__class__.__name__,
            'repr': repr(value)[:100]
        }
    else:
        return repr(value)[:100]


def serialize_method_call(call: Dict[str, Any]) -> Dict[str, Any]:
    """Sérialise un appel de méthode.

    Args:
        call: Dictionnaire de l'appel de méthode.

    Returns:
        Dictionnaire sérialisable.
    """
    return {
        'class': call['class'].__name__,
        'method': call['method'],
        'args': serialize_value(call['args']),
        'kwargs': serialize_value(call['kwargs'])
    }


def serialize_attribute_access(access: Dict[str, Any]) -> Dict[str, Any]:
    """Sérialise un accès à un attribut.

    Args:
        access: Dictionnaire de l'accès.

    Returns:
        Dictionnaire sérialisable.
    """
    return {
        'action': access['action'],
        'class': access['class'].__name__,
        'attribute': access['attribute'],
        'value': serialize_value(access['value'])
    }


def serialize_debugger() -> Dict[str, Any]:
    """Sérialise toutes les données du Debugger.

    Returns:
        Dictionnaire JSON-sérialisable avec method_calls et attribute_accesses.
    """
    return {
        'method_calls': [
            serialize_method_call(call)
            for call in Debugger.method_calls
        ],
        'attribute_accesses': [
            serialize_attribute_access(access)
            for access in Debugger.attribute_accesses
        ]
    }


def debugger_to_json(indent: int = 2) -> str:
    """Retourne les données du Debugger en JSON string.

    Args:
        indent: Indentation JSON.

    Returns:
        String JSON des données du Debugger.
    """
    return json.dumps(serialize_debugger(), indent=indent)
