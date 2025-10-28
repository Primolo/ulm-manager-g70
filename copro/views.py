from django.views.generic import ListView
from .models import Reservation
from django.utils import timezone # Nécessaire pour filtrer les dates

# Affiche la liste des réservations futures
class ReservationListView(ListView):
    model = Reservation
    template_name = 'copro/reservation_list.html'
    context_object_name = 'reservations'
    
    def get_queryset(self):
        # Filtre les réservations pour n'afficher que celles qui ne sont pas terminées
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')
