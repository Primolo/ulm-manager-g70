import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Utilisation du client Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Configuration Supabase
// IMPORTANT : Dans un environnement Vercel, vous DEVEZ injecter ces variables
// d'environnement (VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY).
const supabaseUrl = typeof VITE_SUPABASE_URL !== 'undefined' ? VITE_SUPABASE_URL : null;
const supabaseAnonKey = typeof VITE_SUPABASE_ANON_KEY !== 'undefined' ? VITE_SUPABASE_ANON_KEY : null;

// Initialisation du client Supabase
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Identifiant d'application par défaut pour les tables publiques (utilisé ici pour le schéma Supabase)
const appId = 'ulm-manager-default-id';
const AIRCRAFT_ID = 'G70'; // ID fixe pour l'ULM unique
const DEMO_STORAGE_KEY = 'ulm_manager_demo_data';

// Initialisation des données de démo par défaut
const getInitialDemoData = () => ({
    aircraft: { id: AIRCRAFT_ID, name: 'ULM G70 (Demo)', fixed_cost_annual: 4500.0, latest_tach_hour: 0.0 },
    co_owners: [],
    reservations: [],
    flight_logs: [],
    expenses: [],
    expense_categories: [
        { id: '1', value: 'maintenance', label: 'Maintenance (Prévue)' },
        { id: '2', value: 'fees', label: 'Frais Aérodrome' },
        { id: '3', value: 'other', label: 'Autre' }
    ]
});

// Gère la persistance locale du mode démo
let demoDataStore = getInitialDemoData();

const loadDemoData = () => {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (stored) {
        demoDataStore = JSON.parse(stored);
    } else {
        demoDataStore = getInitialDemoData();
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoDataStore));
    }
    return demoDataStore;
};

const saveDemoData = (store) => {
    demoDataStore = store;
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoDataStore));
    // Dispatch un événement pour forcer la mise à jour des états React
    window.dispatchEvent(new Event('demoDataUpdated'));
};


// --- CONSTANTES ET FONCTIONS UTILITAIRES ---

// Styles Tailwind CSS réutilisables
const PrimaryButtonStyle = "w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-200 ease-in-out";
const SecondaryButtonStyle = "w-full py-2 px-4 bg-white text-indigo-600 border border-indigo-200 font-semibold rounded-xl shadow-md hover:bg-gray-50 transition duration-200 ease-in-out";
const MobileInputStyle = "w-full p-4 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-lg";
const CardStyle = "bg-white p-6 rounded-2xl shadow-xl";

// --- FONCTIONS SUPABASE/DEMO POUR LE TEMPS RÉEL ET CRUD ---

// Écoute en temps réel d'une table Supabase
const subscribeToTable = (tableName, setState, primaryKey = 'id') => {
    if (!supabase) {
        // --- MODE DÉMO ---
        const demoData = demoDataStore[tableName];
        if (tableName === 'aircraft') {
            setState(demoData); // Aircraft est un objet
        } else {
            setState(demoData.map(item => ({ ...item, id: item[primaryKey] })));
        }
        
        // Écouteur d'événement global pour les mises à jour en mode démo
        const listener = () => {
            const updatedDemoData = demoDataStore[tableName];
            if (tableName === 'aircraft') {
                setState(updatedDemoData);
            } else {
                setState(updatedDemoData.map(item => ({ ...item, id: item[primaryKey] })));
            }
        };
        window.addEventListener('demoDataUpdated', listener);
        return () => window.removeEventListener('demoDataUpdated', listener);
    }

    // --- MODE SUPABASE ---
    // (Logique inchangée pour Supabase)
    // Fonction de récupération initiale
    const fetchInitialData = async () => {
        const { data, error } = await supabase
            .from(tableName)
            .select('*');

        if (error) {
            console.error(`Erreur de chargement initial pour ${tableName}:`, error);
        } else {
            // Firestore utilise doc.id, Supabase utilise la PK (souvent 'id')
            setState(data.map(item => ({ ...item, id: item[primaryKey] })));
        }
    };

    fetchInitialData();

    // Écouteur temps réel
    const subscription = supabase
        .channel(tableName)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, (payload) => {
            fetchInitialData(); // Re-fetch pour simplifier le traitement des modifications
        })
        .subscribe();

    return () => {
        supabase.removeChannel(subscription);
    };
};

// Récupère une seule entrée (pour l'ULM et l'utilisateur)
const fetchSingleRecord = async (tableName, recordId, setState) => {
    if (!supabase) {
         // --- MODE DÉMO ---
         if (tableName === 'aircraft') {
            setState(demoDataStore.aircraft);
         }
         return;
    }

    // --- MODE SUPABASE ---
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', recordId) // Assumons que la clé primaire est 'id'
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = pas de ligne trouvée
        console.error(`Erreur de chargement de l'enregistrement ${recordId} dans ${tableName}:`, error);
    } else if (data) {
        setState({ ...data, id: recordId });
    }
};

// Mise à jour ou insertion
const upsertRecord = async (tableName, recordData, primaryKeyField = 'id') => {
    if (!supabase) {
        // --- SCÉNARIO MODE DÉMO (GRATUIT) ---
        console.warn(`MODE DÉMO: Tentative d'UPSERT local dans la table ${tableName}.`);
        
        let store = { ...demoDataStore };
        const key = tableName;

        if (key === 'aircraft') {
            store.aircraft = { ...store.aircraft, ...recordData };
        } else {
             // Ceci ne gère pas correctement les collections array en mode démo,
             // mais la seule collection array que nous upsert est gérée par insertRecord (co_owners).
             // Pour l'ULM, c'est un upsert simple qui est géré ci-dessus.
             console.error("UPSERT sur collection array non supporté en mode démo.");
        }
        
        saveDemoData(store);
        return { data: [recordData], error: null };
    }
    
    // --- MODE SUPABASE ---
    const { data, error } = await supabase
        .from(tableName)
        .upsert(recordData, { onConflict: primaryKeyField })
        .select();
    return { data, error };
};

// Insertion
const insertRecord = async (tableName, recordData) => {
    if (!supabase) {
        // --- SCÉNARIO MODE DÉMO (GRATUIT) ---
        console.warn(`MODE DÉMO: Tentative d'INSERT local dans la table ${tableName}.`);
        
        let store = { ...demoDataStore };
        const key = tableName;
        
        // Assigner un ID unique pour le mode démo
        const newRecord = { ...recordData, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        
        if (Array.isArray(store[key])) {
            store[key] = [...store[key], newRecord];
        } else {
            console.error(`Tentative d'INSERT sur une collection inconnue ou non-array: ${key}`);
        }
        
        saveDemoData(store);
        return { data: [newRecord], error: null };
    }

    // --- MODE SUPABASE ---
    const { data, error } = await supabase
        .from(tableName)
        .insert(recordData)
        .select();
    return { data, error };
};


// --- COMPOSANTS DE VUES ---

// 1. Vue Administration
const AdminView = ({ pilots, aircraftData, expenseCategories, currentUserId }) => {
    const [newPilotEmail, setNewPilotEmail] = useState('');
    const [newPilotName, setNewPilotName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newFixedCost, setNewFixedCost] = useState(aircraftData.fixed_cost_annual || 0);

    // Simulation de l'ajout d'un pilote
    const handleAddPilot = async (e) => {
        e.preventDefault();
        
        const newPilot = {
            name: newPilotName,
            email: newPilotEmail,
            is_admin: false, // Colonne renommée pour Supabase (snake_case)
            // L'ID sera géré par insertRecord (UUID en mode démo, UID Supabase en mode réel)
        };

        const { error } = await insertRecord('co_owners', newPilot);

        if (error) {
            alert(`Erreur d'ajout: ${error.message}`);
        } else {
            setNewPilotEmail('');
            setNewPilotName('');
            alert(`Pilote ajouté. En mode démo, les co-propriétaires sont stockés localement.`);
        }
    };

    // Ajout d'une catégorie de dépense
    const handleAddCategory = async (e) => {
        e.preventDefault();
        
        const newCat = {
            value: newCategoryName.toLowerCase().replace(/\s/g, '_'),
            label: newCategoryName,
        };

        const { error } = await insertRecord('expense_categories', newCat);

        if (error) {
            alert(`Erreur d'ajout: ${error.message}`);
        } else {
            setNewCategoryName('');
            alert("Catégorie de dépense ajoutée.");
        }
    };

    // Mise à jour des coûts fixes de l'ULM
    const handleUpdateAircraft = async (e) => {
        e.preventDefault();
        
        const { error } = await upsertRecord('aircraft', {
            id: AIRCRAFT_ID, // Clé primaire
            name: aircraftData.name || 'ULM G70',
            fixed_cost_annual: parseFloat(newFixedCost),
            latest_tach_hour: aircraftData.latest_tach_hour || 0.0
        }, 'id');

        if (error) {
            alert(`Erreur de mise à jour: ${error.message}`);
        } else {
            alert("Coût fixe annuel mis à jour.");
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-800">Tableau de Bord Admin</h1>

            {/* Gestion des Co-propriétaires / Pilotes */}
            <div className={CardStyle}>
                <h2 className="text-2xl font-semibold mb-4 text-indigo-700">1. Gestion des Pilotes ({pilots.length})</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Formulaire d'ajout */}
                    <form onSubmit={handleAddPilot} className="space-y-3 p-4 border border-indigo-100 rounded-xl bg-indigo-50">
                        <h3 className="font-medium text-lg">Ajouter un Membre</h3>
                        <input
                            type="text"
                            placeholder="Nom complet"
                            value={newPilotName}
                            onChange={(e) => setNewPilotName(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email (pour identification)"
                            value={newPilotEmail}
                            onChange={(e) => setNewPilotEmail(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                            required
                        />
                        <button type="submit" className={PrimaryButtonStyle.replace('py-3', 'py-2')}>
                            Ajouter le Pilote
                        </button>
                    </form>

                    {/* Liste des Pilotes */}
                    <div className="space-y-2">
                        {pilots.map((p) => (
                            <div key={p.id} className="flex justify-between items-center p-3 border-b">
                                <div>
                                    <p className="font-semibold">{p.name}</p>
                                    <p className="text-sm text-gray-500 truncate">{p.id}</p>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${p.is_admin ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {p.is_admin ? 'Admin' : 'Membre'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Gestion ULM et Coûts Fixes */}
            <div className={CardStyle}>
                <h2 className="text-2xl font-semibold mb-4 text-indigo-700">2. ULM et Coûts Fixes</h2>
                <form onSubmit={handleUpdateAircraft} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'ULM</label>
                        <input
                            type="text"
                            value={aircraftData.name || 'ULM G70'}
                            readOnly
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3 bg-gray-100')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Coût Fixe Annuel (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 5000.00"
                            value={newFixedCost}
                            onChange={(e) => setNewFixedCost(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">Assurance, hangar, révision annuelle obligatoire, etc.</p>
                    </div>
                    <button type="submit" className={PrimaryButtonStyle.replace('py-3', 'py-2')}>
                        Mettre à jour les Coûts Fixes
                    </button>
                </form>
            </div>

            {/* Gestion des Catégories de Coûts */}
            <div className={CardStyle}>
                <h2 className="text-2xl font-semibold mb-4 text-indigo-700">3. Catégories de Dépenses (Champs pour les Coûts)</h2>
                <form onSubmit={handleAddCategory} className="space-y-3">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            placeholder="Nom de la nouvelle catégorie (Ex: Frais d'Aérodrome)"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                            required
                        />
                        <button type="submit" className={PrimaryButtonStyle.replace('py-3', 'py-2').replace('w-full', 'w-auto')}>
                            Ajouter
                        </button>
                    </div>
                </form>

                <div className="mt-4 flex flex-wrap gap-2">
                    {expenseCategories.map((cat) => (
                        <span key={cat.id} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full">
                            {cat.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 2. Composant Modale pour l'ajout de dépense
const AddExpenseModal = ({ isOpen, onClose, userId, expenseCategories }) => {
    const [date, setDate] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('Maintenance');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const newExpense = {
            date: date,
            cost: parseFloat(amount),
            type: type,
            description: description,
            user_id: userId,
        };

        const { error } = await insertRecord('expenses', newExpense);

        if (error) {
            alert(`Erreur d'enregistrement de la dépense: ${error.message}`);
        } else {
            // Réinitialisation et fermeture
            setAmount('');
            setDescription('');
            onClose();
            alert("Dépense enregistrée (localement ou sur Supabase).");
        }
    };

    if (!isOpen) return null;

    const allCategories = [
        { id: '0', value: 'Maintenance', label: 'Maintenance (Prévue)' },
        ...expenseCategories
    ];

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className={CardStyle + " w-full max-w-md"}>
                <h2 className="text-xl font-bold mb-4">Ajouter une Dépense Personnalisée</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de la Dépense</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Montant (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type de Dépense</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                            required
                        >
                            {allCategories.map(cat => (
                                <option key={cat.id} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3 h-20')}
                            placeholder="Ex: Achat d'une nouvelle radio, Frais de hangar trimestriels..."
                            required
                        ></textarea>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className={SecondaryButtonStyle.replace('w-full', 'w-auto px-4')}>
                            Annuler
                        </button>
                        <button type="submit" className={PrimaryButtonStyle.replace('w-full', 'w-auto px-4')}>
                            Enregistrer la Dépense
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// 3. Vue Comptabilité
const CostsView = ({ expenses, flightLogs, aircraftData, totalFlightHours, expenseCategories }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Calculs agrégés
    const totalMaintenanceCost = useMemo(() =>
        expenses.reduce((sum, exp) => sum + exp.cost, 0), [expenses]
    );

    const totalFuelCost = useMemo(() =>
        flightLogs.reduce((sum, log) => sum + log.fuel_cost_total, 0), [flightLogs]
    );

    const fixedCostAnnual = aircraftData.fixed_cost_annual || 0;

    // Coût Horaire Réel (CHR)
    const realHourlyCost = useMemo(() => {
        if (totalFlightHours === 0) return fixedCostAnnual > 0 ? 'Indéterminé' : 0;

        const totalOperationalCost = totalMaintenanceCost + totalFuelCost + fixedCostAnnual;
        return (totalOperationalCost / totalFlightHours).toFixed(2);
    }, [totalMaintenanceCost, totalFlightHours, fixedCostAnnual, totalFuelCost]);


    return (
        <div className="space-y-6 max-w-4xl mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-800">Comptabilité et Coût Horaire</h1>

            {/* Carte du Coût Horaire Réel */}
            <div className={CardStyle + " flex justify-between items-center bg-indigo-50 border-l-4 border-indigo-600"}>
                <div>
                    <p className="text-lg font-medium text-gray-600">Coût Horaire Réel (CHR)</p>
                    <p className="text-4xl font-extrabold text-indigo-700 mt-1">
                        {typeof realHourlyCost === 'string' ? realHourlyCost : `${realHourlyCost} €`}
                    </p>
                    {totalFlightHours > 0 && <p className="text-sm text-gray-500 mt-1">Basé sur {totalFlightHours.toFixed(1)} heures enregistrées.</p>}
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-3 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition"
                    title="Ajouter une Dépense"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
            </div>

            {/* Répartition des Coûts */}
            <div className={CardStyle}>
                <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Répartition Détaillée des Coûts Annuels</h2>
                <div className="space-y-3">
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-medium">1. Coûts Fixes Annuels (Hangar, Assurance, etc.)</span>
                        <span className="font-bold text-indigo-600">{fixedCostAnnual.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-medium">2. Coûts Variables (Maintenance & Dépenses Perso)</span>
                        <span className="font-bold text-indigo-600">{totalMaintenanceCost.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                        <span className="font-medium">3. Coût Carburant Total</span>
                        <span className="font-bold text-indigo-600">{totalFuelCost.toFixed(2)} €</span>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <h3 className="text-lg font-semibold mb-2">Formule du Coût Horaire Réel :</h3>
                    <p className="text-sm text-gray-700 font-mono overflow-x-auto">
                        (Coûts Fixes + Coûts Variables + Coût Carburant) / Heures Volées
                    </p>
                </div>
            </div>

            {/* Liste des Dépenses */}
            <div className={CardStyle}>
                <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Journal des Dépenses</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {expenses.length === 0 ? (
                        <p className="text-gray-500">Aucune dépense enregistrée.</p>
                    ) : (
                        expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map((exp) => (
                            <div key={exp.id} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="font-semibold">{exp.description}</p>
                                    <p className="text-xs text-indigo-500">{exp.type}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-red-600">-{exp.cost.toFixed(2)} €</p>
                                    <p className="text-xs text-gray-500">{new Date(exp.date).toLocaleDateString('fr-FR')}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <AddExpenseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userId={aircraftData.user_id} // Mocked user_id
                expenseCategories={expenseCategories} 
            />
        </div>
    );
};

// 4. Vue Loguer Vol (Mobile-Optimisée)
const LogFlightView = ({ userId, pilots, aircraftData }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [endTachHours, setEndTachHours] = useState('');
    const [fuelCost, setFuelCost] = useState('');
    const [pilot, setPilot] = useState(userId || ''); // Utilise l'UID de l'utilisateur actuel par défaut

    const lastTach = aircraftData.latest_tach_hour || 0.0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const endHours = parseFloat(endTachHours);
        const fuel = parseFloat(fuelCost);

        if (endHours <= lastTach) {
            alert(`L'heure TACH de fin (${endHours}) doit être supérieure à la dernière heure enregistrée (${lastTach}).`);
            return;
        }

        const duration = endHours - lastTach;

        const newLog = {
            date: date,
            user_id: pilot,
            duration_hours: duration,
            end_tach_hours: endHours,
            fuel_cost_total: fuel,
            start_tach_hours: lastTach,
            created_at: new Date().toISOString()
        };

        // 1. Enregistrer le vol
        const { error: logError } = await insertRecord('flight_logs', newLog);

        if (logError) {
            alert(`Erreur d'enregistrement du vol: ${logError.message}`);
            return;
        }

        // 2. Mettre à jour la dernière heure TACH de l'ULM
        const { error: updateError } = await upsertRecord('aircraft', {
            id: AIRCRAFT_ID,
            latest_tach_hour: endHours
        }, 'id');

        if (updateError) {
            alert(`Erreur de mise à jour de l'heure TACH: ${updateError.message}`);
        } else {
            // Réinitialisation du formulaire
            setEndTachHours('');
            setFuelCost('');
            alert(`Vol enregistré ! Durée: ${duration.toFixed(2)}h. Nouvelle heure TACH: ${endHours.toFixed(1)}.`);
        }
    };

    return (
        <div className="py-8 px-4 max-w-lg mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-center text-gray-800">Loguer un Vol Terminé</h1>
            <div className={CardStyle}>
                <p className="text-center mb-4 text-lg font-medium text-indigo-600">
                    Dernière Heure TACH enregistrée : <span className="text-2xl font-extrabold">{lastTach.toFixed(1)}h</span>
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date du Vol</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={MobileInputStyle}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pilote</label>
                        <select
                            value={pilot}
                            onChange={(e) => setPilot(e.target.value)}
                            className={MobileInputStyle}
                            required
                        >
                            <option value="">Sélectionner un pilote</option>
                            {pilots.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Heure TACH de Fin</label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder={lastTach > 0 ? `Doit être > ${lastTach.toFixed(1)}` : 'Heure tachymétrique après le vol'}
                            value={endTachHours}
                            onChange={(e) => setEndTachHours(e.target.value)}
                            className={MobileInputStyle}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Coût Carburant Total (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Coût du plein effectué"
                            value={fuelCost}
                            onChange={(e) => setFuelCost(e.target.value)}
                            className={MobileInputStyle}
                            required
                        />
                    </div>
                    <button type="submit" className={PrimaryButtonStyle}>
                        Enregistrer le Vol et Mettre à Jour TACH
                    </button>
                </form>
            </div>
        </div>
    );
};

// 5. Composant Calendrier des Réservations
const ReservationCalendar = ({ reservations, onDateSelect }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return { days, firstDay };
    };

    const { days, firstDay } = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

    const reservationsByDay = useMemo(() => {
        return reservations.reduce((acc, res) => {
            const dateKey = res.date.split('T')[0]; // Format YYYY-MM-DD
            acc[dateKey] = (acc[dateKey] || 0) + 1;
            return acc;
        }, {});
    }, [reservations]);

    const startDayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 0=Dim, 1=Lun. On veut Lundi=0

    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    const handlePrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const isToday = (date) => date.toDateString() === new Date().toDateString();

    const handleDayClick = (date) => {
        const dateString = date.toISOString().split('T')[0];
        onDateSelect(dateString);
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-2 text-indigo-600 rounded-full hover:bg-indigo-50">
                    &larr;
                </button>
                <h3 className="font-semibold text-xl text-gray-800">
                    {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={handleNextMonth} className="p-2 text-indigo-600 rounded-full hover:bg-indigo-50">
                    &rarr;
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium mb-2">
                {dayNames.map(day => <div key={day} className="text-gray-500">{day}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startDayOffset }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10"></div>
                ))}
                {days.map((day, index) => {
                    const dateKey = day.toISOString().split('T')[0];
                    const count = reservationsByDay[dateKey] || 0;
                    const isReserved = count > 0;
                    const isConflict = count > 1;

                    return (
                        <div
                            key={index}
                            onClick={() => handleDayClick(day)}
                            className={`h-10 flex items-center justify-center rounded-lg cursor-pointer transition 
                                ${isToday(day) ? 'bg-indigo-100 border-2 border-indigo-600 font-bold' : 'hover:bg-gray-100'}
                                ${isReserved ? 'text-indigo-800' : 'text-gray-700'}`}
                        >
                            {day.getDate()}
                            {isReserved && (
                                <span className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${isConflict ? 'bg-red-500' : 'bg-green-500'}`}></span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


// 6. Vue Réservation
const ReserveView = ({ userId, reservations, currentPilot }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('12:00');
    const [title, setTitle] = useState('');

    const handleDateSelect = (dateString) => {
        setSelectedDate(dateString);
    };

    const reservationsForSelectedDay = useMemo(() => {
        return reservations.filter(res => res.date.startsWith(selectedDate));
    }, [reservations, selectedDate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const reservationStart = new Date(`${selectedDate}T${startTime}:00`);
        const reservationEnd = new Date(`${selectedDate}T${endTime}:00`);

        if (reservationEnd <= reservationStart) {
            alert("L'heure de fin doit être après l'heure de début.");
            return;
        }

        const newReservation = {
            date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            title: title,
            user_id: userId,
            pilot_name: currentPilot.name || 'Pilote Inconnu',
            created_at: new Date().toISOString()
        };

        const { error } = await insertRecord('reservations', newReservation);

        if (error) {
            alert(`Erreur d'enregistrement de la réservation: ${error.message}`);
        } else {
            // Réinitialisation
            setTitle('');
            alert("Réservation enregistrée avec succès !");
        }
    };

    return (
        <div className="py-8 px-4 max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Colonne du Calendrier */}
            <div className={CardStyle}>
                <h1 className="text-2xl font-bold mb-4 text-gray-800">Calendrier des Réservations</h1>
                <ReservationCalendar reservations={reservations} onDateSelect={handleDateSelect} />
                <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
                    <h2 className="text-lg font-semibold mb-2 text-indigo-700">Réservations du {new Date(selectedDate).toLocaleDateString('fr-FR')}</h2>
                    {reservationsForSelectedDay.length === 0 ? (
                        <p className="text-sm text-gray-600">Aucune réservation pour cette date.</p>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {reservationsForSelectedDay.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((res) => (
                                <div key={res.id} className="flex justify-between text-sm p-2 bg-white rounded-lg shadow-sm">
                                    <span className="font-medium truncate">{res.title || "Réservation ULM"}</span>
                                    <span className="text-indigo-500">{res.start_time} - {res.end_time}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Colonne du Formulaire */}
            <div className={CardStyle}>
                <h2 className="text-2xl font-bold mb-4 text-indigo-700">Créer une Nouvelle Réservation</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Sélectionnée</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3 bg-indigo-100')}
                            required
                            readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">Cliquez sur le calendrier pour changer la date.</p>
                    </div>

                    <div className="flex space-x-4">
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heure de Début</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                                required
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heure de Fin</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description / Titre</label>
                        <input
                            type="text"
                            placeholder="Ex: Vol local, Maintenance"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={MobileInputStyle.replace('text-lg', 'text-base p-3')}
                            required
                        />
                    </div>

                    <button type="submit" className={PrimaryButtonStyle}>
                        Confirmer la Réservation
                    </button>
                </form>
            </div>
        </div>
    );
};


// 7. Vue Tableau de Bord
const DashboardView = ({ aircraftData, pilots, totalFlightHours, realHourlyCost, isConnected }) => {
    const lastTach = aircraftData.latest_tach_hour || 0.0;

    const PilotCard = ({ icon, label, value, unit, color }) => (
        <div className={CardStyle + " flex items-center space-x-4 border-l-4 border-" + color + "-500"}>
            <div className={`p-3 rounded-full bg-${color}-100 text-${color}-600`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value} {unit}</p>
            </div>
        </div>
    );

    return (
        <div className="py-8 px-4 max-w-6xl mx-auto space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold text-indigo-700">{aircraftData.name || "ULM G70"} Manager</h1>
                <p className="text-xl text-gray-500 mt-2">Bienvenue, {pilots.find(p => p.is_admin)?.name || 'Pilote'} !</p>
            </div>

            {!isConnected && (
                <div className="text-center p-4 bg-yellow-100 text-yellow-800 border border-yellow-400 rounded-xl">
                    <p className="font-semibold">MODE DÉMO: La base de données Supabase n'est pas connectée. Les données sont sauvegardées localement dans votre navigateur.</p>
                </div>
            )}

            {/* Cartes d'Indicateurs Clés */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PilotCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                    label="Heure TACH Actuelle"
                    value={lastTach.toFixed(1)}
                    unit="h"
                    color="indigo"
                />
                <PilotCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>}
                    label="Coût Horaire Réel (Estimé)"
                    value={typeof realHourlyCost === 'string' ? realHourlyCost : parseFloat(realHourlyCost).toFixed(2)}
                    unit="€"
                    color="green"
                />
                <PilotCard
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.212 0M9 17v-2m3 2v-2m3 2v-2M12 6V4"></path></svg>}
                    label="Co-propriétaires Enregistrés"
                    value={pilots.length}
                    unit=""
                    color="red"
                />
            </div>

            {/* Prochaines Réservations */}
            <div className={CardStyle}>
                <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Heures de Vol Totales</h2>
                <div className="p-4 bg-indigo-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-600">Total cumulé depuis le début :</p>
                    <p className="text-3xl font-extrabold text-indigo-700 mt-1">{totalFlightHours.toFixed(1)} h</p>
                </div>
            </div>
        </div>
    );
};


// --- COMPOSANT PRINCIPAL ---
const App = () => {
    const [page, setPage] = useState('dashboard');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentPilot, setCurrentPilot] = useState({ name: 'Chargement...', is_admin: false });

    // Données temps réel de la base de données
    const [aircraftData, setAircraftData] = useState({});
    const [pilots, setPilots] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [flightLogs, setFlightLogs] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [demoRefresh, setDemoRefresh] = useState(0); // Compteur pour forcer le refresh démo

    const isConnected = !!supabase;

    // 1. Mise en place de l'écouteur de mise à jour pour le mode démo
    useEffect(() => {
        if (isConnected) return;
        loadDemoData(); // Charge les données initiales du localStorage

        const handleDemoUpdate = () => {
            setDemoRefresh(r => r + 1); // Force le re-render en mode démo
        };

        window.addEventListener('demoDataUpdated', handleDemoUpdate);
        return () => window.removeEventListener('demoDataUpdated', handleDemoUpdate);
    }, [isConnected]);
    
    // 2. Chargement des données (Mode Supabase ou Mode Démo)
    useEffect(() => {
        // Le `demoRefresh` force le rechargement des données locales
        const refreshKey = isConnected ? 1 : demoRefresh; 
        
        // Écouteur ULM (Singleton)
        const fetchAndSubscribeAircraft = async () => {
             // Récupération initiale de l'ULM
            await fetchSingleRecord('aircraft', AIRCRAFT_ID, setAircraftData);
            
            if (!isConnected) return; // Le mode démo est géré par subscribeToTable

            // Création si inexistant (pour la première utilisation)
            const { data: aircraft } = await supabase.from('aircraft').select('*').eq('id', AIRCRAFT_ID).single();
            if (!aircraft) {
                await upsertRecord('aircraft', {
                    id: AIRCRAFT_ID,
                    name: 'ULM G70',
                    fixed_cost_annual: 4500.0,
                    latest_tach_hour: 0.0
                }, 'id');
            }
        };
        fetchAndSubscribeAircraft();

        const unsubPilots = subscribeToTable('co_owners', (data) => {
            setPilots(data);
            setIsPilotsLoaded(true); // Marquer les pilotes comme chargés
        }, 'id');

        const unsubReservations = subscribeToTable('reservations', setReservations);
        const unsubLogs = subscribeToTable('flight_logs', setFlightLogs);
        const unsubExpenses = subscribeToTable('expenses', setExpenses);
        const unsubCategories = subscribeToTable('expense_categories', setExpenseCategories);

        let aircraftSubscription = null;
        if (isConnected) {
            // L'écouteur de l'ULM est séparé car il est un singleton
            aircraftSubscription = supabase
                .channel('aircraft_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'aircraft' }, (payload) => {
                    // Mise à jour si l'ULM est affecté
                    if (payload.new.id === AIRCRAFT_ID) {
                        setAircraftData(payload.new);
                    }
                })
                .subscribe();
        }


        return () => {
            unsubPilots();
            unsubReservations();
            unsubLogs();
            unsubExpenses();
            unsubCategories();
            if (aircraftSubscription) {
                supabase.removeChannel(aircraftSubscription);
            }
        };
    }, [isConnected, demoRefresh]); // Dépend de isConnected et du compteur de rafraîchissement démo

    // 3. Gestion de l'authentification et du profil
    useEffect(() => {
        if (!isPilotsLoaded) return; // Attend que la liste des pilotes soit chargée

        const checkAuthAndProfile = async () => {
            let currentUserId;
            let existingProfile;
            let isFirstUser;
            let userData;

            if (!isConnected) {
                // --- MODE DÉMO ---
                currentUserId = localStorage.getItem('demo_user_id') || crypto.randomUUID();
                localStorage.setItem('demo_user_id', currentUserId);
            } else {
                // --- MODE SUPABASE ---
                let user = (await supabase.auth.getSession()).data.session?.user;
                if (!user) {
                    const { data } = await supabase.auth.signInAnonymously();
                    user = data.user;
                }
                currentUserId = user.id;
            }

            setUserId(currentUserId);
            existingProfile = pilots.find(p => p.id === currentUserId);
            isFirstUser = pilots.length === 0;

            if (existingProfile) {
                userData = existingProfile;
            } else {
                // Création du profil pour le nouvel utilisateur (ID démo ou UID Supabase)
                const newProfile = {
                    id: currentUserId, 
                    name: `Pilote-${currentUserId.substring(0, 4)}`,
                    email: isConnected ? 'N/A (Anonyme)' : 'demo@ulm.test',
                    is_admin: isFirstUser, // Le premier utilisateur devient admin
                    created_at: new Date().toISOString()
                };

                const { data: profileData, error: profileError } = await insertRecord('co_owners', newProfile);

                if (profileError) {
                    console.warn("Erreur de création de profil, réessai de récupération:", profileError);
                    userData = newProfile; 
                } else {
                     userData = profileData?.[0] || newProfile;
                }
            }

            setCurrentPilot(userData);
            setIsAdmin(userData.is_admin || false);
            setIsAuthReady(true);
        };

        checkAuthAndProfile();

        // Écoute des changements d'état d'authentification Supabase (uniquement en mode réel)
        if (isConnected) {
            const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
                if (session?.user) {
                    checkAuthAndProfile(); // Re-vérifie le profil
                }
            });

            return () => {
                authListener?.subscription.unsubscribe();
            };
        }
    }, [isConnected, isPilotsLoaded, pilots]);


    // Calcul du Coût Horaire et des Heures Totales
    const totalFlightHours = useMemo(() =>
        flightLogs.reduce((sum, log) => sum + log.duration_hours, 0), [flightLogs]
    );

    const totalMaintenanceCost = useMemo(() =>
        expenses.reduce((sum, exp) => sum + exp.cost, 0), [expenses]
    );

    const totalFuelCost = useMemo(() =>
        flightLogs.reduce((sum, log) => sum + log.fuel_cost_total, 0), [flightLogs]
    );

    const fixedCostAnnual = aircraftData.fixed_cost_annual || 0;

    const realHourlyCost = useMemo(() => {
        if (totalFlightHours === 0) return fixedCostAnnual > 0 ? 'Indéterminé' : 0;
        const totalOperationalCost = totalMaintenanceCost + totalFuelCost + fixedCostAnnual;
        return (totalOperationalCost / totalFlightHours).toFixed(2);
    }, [totalMaintenanceCost, totalFlightHours, fixedCostAnnual, totalFuelCost]);


    const renderContent = () => {
        if (!isAuthReady) {
            return <div className="text-center p-20 text-indigo-600 font-semibold">Chargement de l'Authentification...</div>;
        }

        const allCategories = [
            { value: 'fuel', label: 'Carburant' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'fees', label: 'Frais d\'Aérodrome' },
            { value: 'other', label: 'Autre' },
            ...expenseCategories
        ];

        switch (page) {
            case 'dashboard':
                return <DashboardView
                    aircraftData={aircraftData}
                    pilots={pilots}
                    totalFlightHours={totalFlightHours}
                    realHourlyCost={realHourlyCost}
                    isConnected={isConnected}
                />;
            case 'reserve':
                return <ReserveView
                    userId={userId}
                    pilots={pilots}
                    reservations={reservations}
                    currentPilot={currentPilot}
                />;
            case 'log-flight':
                return <LogFlightView
                    userId={userId}
                    pilots={pilots}
                    aircraftData={aircraftData}
                />;
            case 'costs':
                return <CostsView
                    expenses={expenses}
                    flightLogs={flightLogs}
                    aircraftData={aircraftData}
                    totalFlightHours={totalFlightHours}
                    expenseCategories={expenseCategories}
                />;
            case 'admin':
                if (!isAdmin) return <div className="text-center p-20 text-red-600 font-semibold">Accès Refusé. Droits Admin Requis.</div>;
                return <AdminView
                    pilots={pilots}
                    aircraftData={aircraftData}
                    expenseCategories={expenseCategories}
                    currentUserId={userId}
                />;
            default:
                return <DashboardView />;
        }
    };

    const navItems = [
        { name: 'Tableau de Bord', page: 'dashboard' },
        { name: 'Réservation', page: 'reserve' },
        { name: 'Loguer Vol', page: 'log-flight' },
        { name: 'Comptabilité', page: 'costs' },
    ];

    if (isAdmin) {
        navItems.push({ name: 'Admin', page: 'admin' });
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <header className="bg-white shadow-md sticky top-0 z-40">
                <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-2xl font-bold text-indigo-600">ULM G70</span>
                        </div>
                        <div className="flex space-x-2 sm:space-x-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.page}
                                    onClick={() => setPage(item.page)}
                                    className={`px-3 py-2 text-sm font-medium transition duration-150 ease-in-out border-b-2
                                        ${page === item.page ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-indigo-600 hover:border-gray-300'}
                                    `}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>
            </header>

            <main>
                {renderContent()}
            </main>

            {/* Bouton Loguer Vol rapide sur mobile */}
            {page !== 'log-flight' && (
                <button
                    onClick={() => setPage('log-flight')}
                    className="md:hidden fixed bottom-4 right-4 p-4 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-700 transition"
                    title="Loguer un Vol"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
            )}
        </div>
    );
};

export default App;
