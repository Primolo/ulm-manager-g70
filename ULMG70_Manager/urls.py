from django.urls import path


urlpatterns = [
    # L'URL de ton dashboard
    path('', ReservationListView.as_view(), name='reservation_list'),
    # L'URL pour ajouter une entrée de Logbook (une fois que nous aurons rétabli la vue LogEntry)
    # path('logbook/add/', LogEntryCreateView.as_view(), name='logentry_add'), 
]
