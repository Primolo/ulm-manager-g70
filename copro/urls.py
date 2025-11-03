from django.urls import path
# Importe la vue du dashboard de ton application
from .views import ReservationListView 

urlpatterns = [
    # Définit le Dashboard comme la page d'accueil de l'application
    path('', ReservationListView.as_view(), name='reservation_list'),
    # Future URL pour le formulaire du Logbook
    # path('logbook/add/', LogEntryCreateView.as_view(), name='logentry_add'), 
]
