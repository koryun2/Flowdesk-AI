from rest_framework.routers import DefaultRouter

from .views import KnowledgeDocumentViewSet

router = DefaultRouter()
router.register("documents", KnowledgeDocumentViewSet, basename="document")

urlpatterns = router.urls
