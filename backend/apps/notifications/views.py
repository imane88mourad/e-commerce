from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/
    List notifications for the current user.
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)


class NotificationUnreadCountView(APIView):
    """GET /api/notifications/unread-count/
    Returns the count of unread notifications.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})


class NotificationMarkReadView(APIView):
    """POST /api/notifications/<id>/read/
    Mark a single notification as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

        notif.mark_read()
        return Response({'status': 'ok'})


class NotificationMarkAllReadView(APIView):
    """POST /api/notifications/read-all/
    Mark all notifications as read for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response({'marked': count})
