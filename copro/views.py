from django.views.generic import ListView, CreateView
from django.urls import reverse_lazy
from django.utils import timezone
from django.shortcuts import render 

# 1. IMPORTER LES MODÈLES EN PREMIER
from .models import Reservation, LogEntry 
# 2. IMPORTER LES FORMULAIRES EN DERNIER
from .forms import ReservationForm, LogEntryForm 


# --- Vues du Dashboard ---
# ... (Les classes de vues sont inchangées et utilisent les objets modèles et formulaires)

class ReservationListView(ListView):
    model = Reservation
    template_name = 'copro/reservation_list.html'
    context_object_name = 'object_list'
    def get_queryset(self):
        return Reservation.objects.filter(date_fin__gte=timezone.now()).order_by('date_debut')

class LogEntryCreateView(CreateView):
    model = LogEntry
    form_class = LogEntryForm
    template_name = 'copro/logentry_form.html'
    success_url = reverse_lazy('reservation_list')

class ReservationCreateView(CreateView):
    model = Reservation
    form_class = ReservationForm
    template_name = 'copro/reservation_form.html'
    success_url = reverse_lazy('reservation_list')

class LogbookListView(ListView):
    model = LogEntry
    template_name = 'copro/logbook_list.html'
    context_object_name = 'logbook_entries' 
    def get_queryset(self):
        return LogEntry.objects.all().select_related('pilote').order_by('-date_vol')
