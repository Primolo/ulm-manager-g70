# ULMG70_Manager/settings.py (extrait)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # --- AJOUTER CETTE LIGNE ---
    'copro.apps.CoproConfig', 
]
#----------------------------------------------------
# MIDDLEWARE (Intergiciels pour Sessions, Utilisateurs, Sécurité)
#----------------------------------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware', # Nécessaire pour les formulaires (CSRF)
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
#----------------------------------------------------
# TEMPLATES (Configuration du Moteur HTML)
#----------------------------------------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'], # Utilise BASE_DIR pour chercher les templates à la racine du projet si besoin
        'APP_DIRS': True, # TRÈS IMPORTANT : Dit à Django de chercher dans copro/templates/
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]



# AJOUTER CETTE SECTION pour définir BASE_DIR de manière moderne et robuste
from pathlib import Path
# Configuration du Déploiement sur Render/Production
import dj_database_url # Nécessite 'dj-database-url' dans requirements.txt (AJOUTE-LE si ce n'est pas fait!)
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
# Sécurité: La liste des hôtes autorisés (Render va remplir cela avec ton URL)
# Remplacer 'ton-domaine.com' par ton URL Render
ALLOWED_HOSTS = ['*'] # * Pour commencer, puis mieux vaut spécifier l'URL Render

# Configuration de la base de données pour Render (PostgreSQL)
DATABASE_URL = os.environ.get('DATABASE_URL')
db_from_env = dj_database_url.config(default=DATABASE_URL, conn_max_age=500)
DATABASES = {'default': db_from_env}

# IMPORTANT: Sécurité. À remplacer par une vraie clé pour la production
# (Tu peux utiliser un générateur en ligne et stocker la clé sur Render)
SECRET_KEY = os.environ.get('SECRET_KEY', 'default-key-tres-secrete-pour-le-local')

# Configuration des Fichiers Statiques (CSS/JS) pour Render
# Utilise l'opérateur de division de Pathlib, plus moderne et cohérent :
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATIC_URL = '/static/'


# Correction du Warning Django (pour une meilleure pérennité des identifiants)
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


