from django.views.generic import TemplateView # Change de ListView à TemplateView

# --- Les autres imports ne sont plus nécessaires pour l'instant ---
# from .models import Reservation
# from django.utils import timezone 

# Affiche la liste des réservations futures (temporairement en TemplateView)
class ReservationListView(TemplateView):
    # Lien vers le fichier HTML. AUCUN code de base de données n'est exécuté.
    template_name = 'copro/reservation_list.html'
    
    # Nous n'avons pas besoin de get_queryset() pour l'instant
    
# --- Fin de la vue ---
