"""Tests pour la métaclasse Meta.

Ces tests vérifient que la métaclasse Meta collecte correctement :
- Les appels de méthodes (avec arguments)
- Les accès aux attributs (lecture et écriture)
"""

import pytest

from src import Debugger, Meta


class Foo(metaclass=Meta):
    """Classe de test utilisant la métaclasse Meta."""
    
    def __init__(self, x: int) -> None:
        """Initialise l'instance avec une valeur x."""
        self.x = x
    
    def bar(self, v: int) -> tuple:
        """Retourne un tuple contenant x et v."""
        return (self.x, v)


class TestMethodCalls:
    """Tests pour la collecte des appels de méthodes."""
    
    def test_method_calls_count(self) -> None:
        """Vérifie que tous les appels de méthodes sont collectés."""
        a = Foo(1)
        a.bar(2)
        
        calls = Debugger.method_calls
        assert len(calls) == 2
    
    def test_init_call_collected(self) -> None:
        """Vérifie que l'appel à __init__ est collecté avec les bons arguments."""
        a = Foo(1)
        
        calls = Debugger.method_calls
        assert len(calls) >= 1
        assert calls[0]['method'] == '__init__'
        assert calls[0]['args'] == (a, 1)
        assert calls[0]['class'] is Foo
    
    def test_bar_call_collected(self) -> None:
        """Vérifie que l'appel à bar est collecté avec les bons arguments."""
        a = Foo(1)
        a.bar(2)
        
        calls = Debugger.method_calls
        assert len(calls) == 2
        assert calls[1]['method'] == 'bar'
        assert calls[1]['args'] == (a, 2)
        assert calls[1]['class'] is Foo
    
    def test_kwargs_collected(self) -> None:
        """Vérifie que les kwargs sont aussi collectés."""
        a = Foo(x=42)
        
        calls = Debugger.method_calls
        assert calls[0]['kwargs'] == {'x': 42} or calls[0]['args'] == (a,)


class TestAttributeAccesses:
    """Tests pour la collecte des accès aux attributs."""
    
    def test_attribute_accesses_count(self) -> None:
        """Vérifie le nombre correct d'accès aux attributs."""
        a = Foo(1)
        a.bar(2)
        
        accesses = Debugger.attribute_accesses
        assert len(accesses) == 3
    
    def test_attribute_set_in_init(self) -> None:
        """Vérifie que l'écriture d'attribut dans __init__ est collectée."""
        Foo(1)
        
        accesses = Debugger.attribute_accesses
        assert len(accesses) >= 1
        assert accesses[0]['action'] == 'set'
        assert accesses[0]['attribute'] == 'x'
        assert accesses[0]['value'] == 1
        assert accesses[0]['class'] is Foo
    
    def test_method_get_collected(self) -> None:
        """Vérifie que l'accès à une méthode est aussi collecté."""
        a = Foo(1)
        a.bar(2)
        
        accesses = Debugger.attribute_accesses
        # L'accès à 'bar' devrait être collecté
        bar_accesses = [acc for acc in accesses if acc['attribute'] == 'bar']
        assert len(bar_accesses) == 1
        assert bar_accesses[0]['action'] == 'get'
    
    def test_attribute_get_collected(self) -> None:
        """Vérifie que la lecture d'attribut est collectée."""
        a = Foo(1)
        a.bar(2)
        
        accesses = Debugger.attribute_accesses
        # L'accès à 'x' dans bar devrait être collecté
        x_get_accesses = [
            acc for acc in accesses 
            if acc['attribute'] == 'x' and acc['action'] == 'get'
        ]
        assert len(x_get_accesses) == 1
        assert x_get_accesses[0]['value'] == 1


class TestMultipleClasses:
    """Tests avec plusieurs classes utilisant la métaclasse."""
    
    def test_multiple_classes_tracked_separately(self) -> None:
        """Vérifie que les classes sont correctement distinguées."""
        
        class Another(metaclass=Meta):
            def __init__(self, y: int) -> None:
                self.y = y
        
        foo = Foo(1)
        another = Another(2)
        
        calls = Debugger.method_calls
        
        foo_calls = [c for c in calls if c['class'] is Foo]
        another_calls = [c for c in calls if c['class'] is Another]
        
        assert len(foo_calls) == 1
        assert len(another_calls) == 1


class TestEdgeCases:
    """Tests des cas limites."""
    
    def test_attribute_modification(self) -> None:
        """Vérifie que la modification d'attribut est collectée."""
        a = Foo(1)
        a.x = 10
        
        set_accesses = [
            acc for acc in Debugger.attribute_accesses 
            if acc['action'] == 'set'
        ]
        assert len(set_accesses) == 2
        assert set_accesses[1]['value'] == 10
    
    def test_multiple_method_calls(self) -> None:
        """Vérifie que plusieurs appels à la même méthode sont collectés."""
        a = Foo(1)
        a.bar(2)
        a.bar(3)
        a.bar(4)
        
        bar_calls = [c for c in Debugger.method_calls if c['method'] == 'bar']
        assert len(bar_calls) == 3
