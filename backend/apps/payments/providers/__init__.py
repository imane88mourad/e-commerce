"""Payment provider abstraction.

Each provider implements the same interface so the rest of the codebase
is provider-agnostic.  To wire a real gateway (Baridimob, CIB, Stripe…
if/when available for Algeria) just subclass ``PaymentProvider`` and
register the slug in ``get_provider()``.
"""

from .base import PaymentProvider
from .mock import MockProvider


def get_provider(slug: str) -> PaymentProvider:
    """Return an instantiated provider by slug.

    Supported slugs (extend as needed):
        mock   – sandbox / test provider
    """
    registry = {
        'mock': MockProvider,
    }
    cls = registry.get(slug)
    if cls is None:
        raise ValueError(f"Unknown payment provider: {slug}")
    return cls()
