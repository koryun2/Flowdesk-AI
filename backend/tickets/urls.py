from rest_framework.routers import DefaultRouter

from .views import TagViewSet, TicketViewSet

router = DefaultRouter()
router.register("tickets", TicketViewSet, basename="ticket")
router.register("tags", TagViewSet, basename="tag")

urlpatterns = router.urls
