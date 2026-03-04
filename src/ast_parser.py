"""Module pour parser du code Python en AST JSON sérialisable."""

import ast
import json
from typing import Any, Dict


class ASTParser:
    """Parse du code Python et convertit l'AST en structure JSON."""

    # Couleurs par type de nœud pour la visualisation
    NODE_COLORS: Dict[str, str] = {
        'Module': '#6c757d',
        'FunctionDef': '#0d6efd',
        'AsyncFunctionDef': '#0dcaf0',
        'ClassDef': '#6f42c1',
        'Return': '#dc3545',
        'Assign': '#198754',
        'AugAssign': '#20c997',
        'AnnAssign': '#20c997',
        'For': '#fd7e14',
        'AsyncFor': '#fd7e14',
        'While': '#fd7e14',
        'If': '#ffc107',
        'With': '#6610f2',
        'AsyncWith': '#6610f2',
        'Try': '#d63384',
        'ExceptHandler': '#d63384',
        'Call': '#e83e8c',
        'Name': '#adb5bd',
        'Constant': '#17a2b8',
        'Attribute': '#6ea8fe',
        'BinOp': '#ffda6a',
        'Compare': '#ffda6a',
        'BoolOp': '#ffda6a',
        'UnaryOp': '#ffda6a',
        'Lambda': '#0d6efd',
        'List': '#198754',
        'Dict': '#198754',
        'Tuple': '#198754',
        'Set': '#198754',
    }

    @staticmethod
    def parse(source_code: str) -> Dict[str, Any]:
        """Parse le code source et retourne l'AST en JSON.

        Args:
            source_code: Code Python à parser.

        Returns:
            Dictionnaire représentant l'AST.
        """
        try:
            tree = ast.parse(source_code)
            return {
                'success': True,
                'ast': ASTParser._node_to_dict(tree),
                'error': None
            }
        except SyntaxError as e:
            return {
                'success': False,
                'ast': None,
                'error': {
                    'message': str(e.msg) if e.msg else str(e),
                    'line': e.lineno,
                    'column': e.offset
                }
            }

    @staticmethod
    def _node_to_dict(node: ast.AST) -> Dict[str, Any]:
        """Convertit un nœud AST en dictionnaire.

        Args:
            node: Nœud AST à convertir.

        Returns:
            Dictionnaire représentant le nœud.
        """
        node_type = node.__class__.__name__
        result: Dict[str, Any] = {
            'type': node_type,
            'color': ASTParser.NODE_COLORS.get(node_type, '#adb5bd'),
        }

        # Ajouter les informations de position si disponibles
        if hasattr(node, 'lineno'):
            result['lineno'] = node.lineno
        if hasattr(node, 'col_offset'):
            result['col_offset'] = node.col_offset
        if hasattr(node, 'end_lineno'):
            result['end_lineno'] = node.end_lineno
        if hasattr(node, 'end_col_offset'):
            result['end_col_offset'] = node.end_col_offset

        # Traiter les champs du nœud
        children = []
        for field, value in ast.iter_fields(node):
            converted = ASTParser._convert_value(value)
            result[field] = converted

            # Collecter les enfants pour la structure arborescente
            if isinstance(value, ast.AST):
                children.append(converted)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, ast.AST):
                        children.append(ASTParser._node_to_dict(item))

        if children:
            result['children'] = children

        return result

    @staticmethod
    def _convert_value(value: Any) -> Any:
        """Convertit une valeur AST en valeur JSON-sérialisable.

        Args:
            value: Valeur à convertir.

        Returns:
            Valeur sérialisable.
        """
        if isinstance(value, ast.AST):
            return ASTParser._node_to_dict(value)
        elif isinstance(value, list):
            return [ASTParser._convert_value(item) for item in value]
        elif isinstance(value, (str, int, float, bool, type(None))):
            return value
        elif isinstance(value, bytes):
            return value.decode('utf-8', errors='replace')
        else:
            return str(value)

    @staticmethod
    def to_json(source_code: str, indent: int = 2) -> str:
        """Parse le code et retourne l'AST en JSON string.

        Args:
            source_code: Code Python à parser.
            indent: Indentation JSON.

        Returns:
            String JSON de l'AST.
        """
        return json.dumps(ASTParser.parse(source_code), indent=indent)
