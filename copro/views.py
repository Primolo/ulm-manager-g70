from django.views.generic import TemplateView, ListView # Importe ListView
from .models import Reservation # Importe le modèle
from django.utils import timezone 

# La vue du Dashboard / Liste des Réservations
class ReservationListView(ListView):
    template_name = 'copro/reservation_list.html'
    context_object_name = 'object_list' # Renommer pour être standard

    def get_queryset(self):
        # Récupère et filtre les réservations futures
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')

# Vue pour le Journal de Bord (sera complétée plus tard)
# ...
