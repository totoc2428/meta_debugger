"""Exemple d'utilisation de la métaclasse Meta pour le débogage.

Ce module démontre comment utiliser la métaclasse Meta pour surveiller
les accès aux attributs et les appels de méthodes.
"""

from src import Debugger, Meta


class Foo(metaclass=Meta):
    """Classe d'exemple utilisant la métaclasse Meta."""
    
    def __init__(self, x: int) -> None:
        """Initialise l'instance avec une valeur x."""
        self.x = x
    
    def bar(self, v: int) -> tuple:
        """Retourne un tuple contenant x et v."""
        return (self.x, v)


def main() -> None:
    """Fonction principale démontrant l'utilisation."""
    # Réinitialiser le debugger
    Debugger.clear()
    
    # Créer une instance et appeler une méthode
    a = Foo(1)
    result = a.bar(2)
    
    print("=== Appels de méthodes ===")
    for call in Debugger.method_calls:
        print(f"  {call['method']}: args={call['args']}")
    
    print("\n=== Accès aux attributs ===")
    for access in Debugger.attribute_accesses:
        print(f"  {access['action']} {access['attribute']} = {access['value']}")
    
    print(f"\nRésultat de bar(2): {result}")


if __name__ == "__main__":
    main()
