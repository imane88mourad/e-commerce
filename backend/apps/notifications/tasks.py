"""
Celery tasks for async email sending.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, subject, to_email, html_content, from_email=None):
    """Send email asynchronously via Celery.

    Retries up to 3 times with 60s delay on failure.
    """
    from django.core.mail import EmailMultiAlternatives

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body='',
            from_email=from_email,
            to=[to_email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        logger.info(f"Email sent to {to_email}: {subject}")
    except Exception as exc:
        logger.error(f"Email failed to {to_email}: {exc}")
        raise self.retry(exc=exc)
