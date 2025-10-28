from pathlib import Path

# ************************************************************
# 1. IMPORTS ET DÉFINITION DE BASE_DIR (DOIT ÊTRE EN TÊTE)
# ************************************************************
import os
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ************************************************************
# 2. VARIABLES DE BASE (Peuvent suivre directement BASE_DIR)
# ************************************************************
SECRET_KEY = os.environ.get('SECRET_KEY', 'default-key-tres-secrete-pour-le-local') # Utilise l'import 'os'
DEBUG = os.environ.get('DEBUG') == 'True' # Pour la production, nous fixons DEBUG à False sur Render

# Sécurité: La liste des hôtes autorisés (Render va remplir cela avec ton URL)
ALLOWED_HOSTS = ['*'] 


# ************************************************************
# 3. APPLICATIONS
# ************************************************************
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    'copro.apps.CoproConfig', 
]


# ************************************************************
# 4. MIDDLEWARE (Intergiciels pour Sessions, Utilisateurs, Sécurité)
# ************************************************************
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# ************************************************************
# 5. TEMPLATES (Configuration du Moteur HTML)
# ************************************************************
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'], # Utilise BASE_DIR défini en haut
        'APP_DIRS': True, 
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


# ************************************************************
# 6. CONFIGURATION RENDU ET BASE DE DONNÉES
# ************************************************************

# Configuration de la base de données pour Render (PostgreSQL)
# Utilise dj_database_url pour se connecter à la variable d'environnement DATABASE_URL
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES = {'default': dj_database_url.config(default=DATABASE_URL, conn_max_age=600)}


# Configuration des Fichiers Statiques (CSS/JS) pour Render
# Utilise BASE_DIR défini en haut
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATIC_URL = '/static/'


# Correction du Warning Django (pour une meilleure pérennité des identifiants)
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
