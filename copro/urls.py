from django.urls import path
from .views import (
    ReservationListView, LogEntryCreateView, ReservationCreateView, LogbookListView,
    ReservationJsonFeed  # <-- Ajout de l'import
)

urlpatterns = [
    path('', ReservationListView.as_view(), name='reservation_list'),
    path('reservation/add/', ReservationCreateView.as_view(), name='reservation_add'), 
    path('logbook/add/', LogEntryCreateView.as_view(), name='logentry_add'), 
    path('logbook/', LogbookListView.as_view(), name='logbook_list'), 
    
    # --- NOUVELLE URL pour le FLUX DE DONNÉES JSON ---
    path('api/reservations/', ReservationJsonFeed.as_view(), name='reservation_feed'), 
]
