"""Mock / sandbox payment provider.

Used for:
    - development
    - automated tests
    - demo / staging

The "payment page" simply presents a mock form that instantly
returns success or failure depending on the amount:

    - even amount  → success
    - odd amount   → failure

This avoids any real gateway while still exercising the full
checkout → webhook → confirmation flow end-to-end.
"""

from __future__ import annotations
import hashlib
import hmac
import json
import os
import secrets
from decimal import Decimal

from .base import PaymentProvider, PaymentInitiation, WebhookResult


class MockProvider(PaymentProvider):
    slug = 'mock'

    @property
    def _secret(self) -> str:
        return os.environ.get('MOCK_WEBHOOK_SECRET', 'mock-secret-dev')

    # ------------------------------------------------------------------
    # Initiate
    # ------------------------------------------------------------------
    def initiate_payment(
        self,
        *,
        order_id: int,
        amount: Decimal,
        currency: str = 'DZD',
        description: str = '',
        metadata: dict | None = None,
    ) -> PaymentInitiation:
        reference = f'MOCK-{order_id}-{secrets.token_hex(4).upper()}'

        # Build a URL that the frontend will load as a "mock payment page".
        # In dev the page is served by the Next.js frontend; in prod it
        # would be a standalone hosted page.
        base_url = os.environ.get('NEXT_PUBLIC_FRONTEND_URL', 'http://localhost:3000')
        payment_url = (
            f'{base_url}/payment/mock'
            f'?order_id={order_id}'
            f'&amount={amount}'
            f'&currency={currency}'
            f'&reference={reference}'
        )

        return PaymentInitiation(
            provider=self.slug,
            payment_url=payment_url,
            reference=reference,
            raw={'description': description, 'metadata': metadata or {}},
        )

    # ------------------------------------------------------------------
    # Webhook verification
    # ------------------------------------------------------------------
    def verify_webhook(self, headers: dict, body: bytes) -> bool:
        signature = headers.get('X-Mock-Signature', '')
        expected = hmac.new(
            self._secret.encode(), body, hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected)

    # ------------------------------------------------------------------
    # Webhook parsing
    # ------------------------------------------------------------------
    def parse_webhook(self, body: bytes) -> WebhookResult:
        data = json.loads(body)
        amount = Decimal(str(data.get('amount', '0')))
        status = 'paid' if data.get('status') == 'success' else 'failed'

        return WebhookResult(
            status=status,
            transaction_id=data.get('transaction_id', ''),
            amount=amount,
            reference=data.get('reference', ''),
            raw=data,
        )
