from django.contrib import admin
from django.urls import path, include 

urlpatterns = [
    path('admin/', admin.site.urls),
    # Lie les URLs de l'application 'copro' à la racine du site
    path('', include('copro.urls')), 
]
