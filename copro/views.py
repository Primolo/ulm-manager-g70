from django.views.generic import ListView

# Imports nécessaires en tête de fichier pour la pérennité
from .models import Reservation
from django.utils import timezone 

# Affiche la liste des réservations futures
class ReservationListView(ListView):
    # Lien vers le fichier HTML
    template_name = 'copro/reservation_list.html'
    
    # Nom de la variable utilisée dans le template HTML
    context_object_name = 'reservations'

    def get_queryset(self):
        # Récupère le queryset. On ne définit pas le modèle ici pour éviter une erreur
        # lors de l'initialisation. On filtre directement les réservations futures.
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')
