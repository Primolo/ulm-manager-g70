# copro/urls.py (Mise à jour)

from django.urls import path
from .views import ReservationListView, LogEntryCreateView # Importe la nouvelle vue

urlpatterns = [
    path('', ReservationListView.as_view(), name='reservation_list'),
    # --- URL pour ENREGISTRER UN VOL ---
    path('logbook/add/', LogEntryCreateView.as_view(), name='logentry_add'), 
]
