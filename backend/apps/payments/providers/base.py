"""Abstract base for payment providers.

Every concrete provider must implement:
    - ``initiate_payment``  → dict with at least ``payment_url``
    - ``verify_webhook``    → True / False
    - ``parse_webhook``     → dict with ``status``, ``transaction_id``, ``amount``
"""

from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any


@dataclass
class PaymentInitiation:
    """Result returned by ``initiate_payment``."""
    provider: str
    payment_url: str
    reference: str
    raw: dict | None = None


@dataclass
class WebhookResult:
    """Parsed webhook payload."""
    status: str            # 'paid' | 'failed' | 'cancelled'
    transaction_id: str
    amount: Decimal
    reference: str
    raw: dict | None = None


class PaymentProvider(ABC):
    """Base class that every payment gateway must subclass."""

    slug: str = ''

    @abstractmethod
    def initiate_payment(
        self,
        *,
        order_id: int,
        amount: Decimal,
        currency: str = 'DZD',
        description: str = '',
        metadata: dict[str, Any] | None = None,
    ) -> PaymentInitiation:
        """Start a payment and return where to redirect the user."""

    @abstractmethod
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        """Return True if the webhook signature is authentic."""

    @abstractmethod
    def parse_webhook(self, body: bytes) -> WebhookResult:
        """Extract payment outcome from the raw webhook body."""
