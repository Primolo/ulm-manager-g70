from django.urls import path
from .views import ReservationListView

urlpatterns = [
    # Adresse de base : monapp.com/
    path('', ReservationListView.as_view(), name='reservation_list'),
]
