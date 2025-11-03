from django.contrib import admin
from django.urls import path, include 

urlpatterns = [
    # 1. URLS DU THÈME JET (DOIT ÊTRE EN PREMIER)
    path('jet/', include('jet.urls', 'jet')),
    # 2. URLS DU DASHBOARD JET
    path('jet/dashboard/', include('jet.dashboard.urls', 'jet-dashboard')),
    # ----------------------------------------
    path('admin/', admin.site.urls),
    # Lie les URLs de l'application 'copro' à la racine du site
    path('', include('copro.urls')), 
]
