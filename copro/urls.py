from django.urls import path
from .views import ReservationListView

urlpatterns = [
    # L'adresse principale de l'application sera vide ('')
    path('', ReservationListView.as_view(), name='reservation_list'),
]
