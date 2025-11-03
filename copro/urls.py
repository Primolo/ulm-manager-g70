from django.contrib import admin
from django.urls import path, include 

urlpatterns = [
    # 1. URLS DU THÈME JET (OBLIGATOIRES AVANT /admin/)
    path('jet/', include('jet.urls', 'jet')),
    # 2. URLS DU DASHBOARD JET (Souvent manquant, cause du 500)
    path('jet/dashboard/', include('jet.dashboard.urls', 'jet-dashboard')), 
    
    path('admin/', admin.site.urls),
    path('', include('copro.urls')), 
]
