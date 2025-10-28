from django.views.generic import ListView

# --- Assure-toi que les imports des modèles et des outils sont en haut ---
from .models import Reservation
from django.utils import timezone 

# -------------------------------------------------------------------------

# Affiche la liste des réservations futures
class ReservationListView(ListView):
    model = Reservation
    template_name = 'copro/reservation_list.html'
    context_object_name = 'reservations'

    def get_queryset(self):
        # Cette ligne est maintenant propre
        # Elle demande toutes les réservations dont la date de fin est supérieure ou égale à maintenant
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')
