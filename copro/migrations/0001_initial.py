# Fichier de migration initial (création de toutes les tables)

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CopropietaireProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('part_proprieté', models.DecimalField(decimal_places=2, default=0.0, max_digits=5, verbose_name='Part de propriété (%)')),
                ('numero_licence', models.CharField(blank=True, max_length=50, null=True, verbose_name='Numéro de Licence ULM')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='LogEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('duree_vol', models.DecimalField(decimal_places=2, max_digits=5, verbose_name='Durée du Vol (h.mm)')),
                ('heures_moteur_total', models.DecimalField(decimal_places=2, max_digits=7, verbose_name='Heures Moteur (Total)')),
                ('date_vol', models.DateTimeField(auto_now_add=True, verbose_name="Date et Heure de l'Enregistrement")),
                ('aerodrome_depart', models.CharField(max_length=50, verbose_name='Aérodrome de Départ')),
                ('aerodrome_arrivee', models.CharField(max_length=50, verbose_name="Aérodrome d'Arrivée")),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes (Maintenance, Carburant, Observations)')),
                # CORRECTION DE CASSE ET D'IMPORTATION (Référence par chaîne)
                ('pilote', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='copro.CopropietaireProfile', verbose_name='Pilote')),
            ],
            options={
                'verbose_name': 'Entrée Journal de Bord',
                'verbose_name_plural': 'Journal de Bord',
                'ordering': ['-date_vol'],
            },
        ),
        migrations.CreateModel(
            name='Reservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date_debut', models.DateTimeField(verbose_name='Début de la réservation')),
                ('date_fin', models.DateTimeField(verbose_name='Fin de la réservation')),
                ('motif', models.TextField(blank=True, max_length=500, null=True, verbose_name='Motif / Destination (Optionnel)')),
                # CORRECTION DE CASSE ET D'IMPORTATION (Référence par chaîne)
                ('coproprietaire', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='copro.CopropietaireProfile', verbose_name='Réservé par')),
            ],
            options={
                'verbose_name': 'Réservation ULM G70',
                'verbose_name_plural': 'Réservations ULM G70',
                'ordering': ['date_debut'],
            },
        ),
    ]
