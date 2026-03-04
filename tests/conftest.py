"""Configuration pytest pour les tests."""

import pytest

from src import Debugger


@pytest.fixture(autouse=True)
def clear_debugger():
    """Nettoie le Debugger avant chaque test."""
    Debugger.clear()
    yield
    Debugger.clear()
