import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'; // CORRIGÉ : Utilisation de l'import CDN
import { ArrowLeft, ArrowRight, LogIn, LogOut, User, DollarSign, Calendar, Settings, Send, Plus, Trash2, Edit } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// --- CONFIGURATION ET INITIALISATION ---

// IMPORTANT: Ces variables sont nécessaires pour la connexion Supabase
// Elles doivent être définies dans les variables d'environnement de Vercel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';

const isSupabaseConfigured = supabaseUrl !== 'YOUR_SUPABASE_URL_HERE' && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE';

// Initialisation du client Supabase
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Identifiant d'application par défaut pour le mode démo
const AIRCRAFT_ID = 'G70'; 
const DEMO_STORAGE_KEY = 'ulm_manager_demo_data';

// --- MODE DÉMO PERSISTANCE LOCALE ---

const getInitialDemoData = () => ({
    aircraft: { id: AIRCRAFT_ID, name: 'ULM G70 (Demo)', fixed_cost_annual: 4500.0, latest_tach_hour: 0.0 },
    co_owners: [],
    reservations: [],
    flight_logs: [],
    expenses: [],
    expense_categories: [
        { id: uuidv4(), value: 'maintenance', label: 'Maintenance (Prévue)', is_fixed: false },
        { id: uuidv4(), value: 'fees', label: 'Frais Aérodrome', is_fixed: false },
        { id: uuidv4(), value: 'insurance', label: 'Assurance Annuelle', is_fixed: true }
    ]
});

const loadDemoData = () => {
    try {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Erreur de chargement des données de démo:", e);
    }
    const initialData = getInitialDemoData();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initialData));
    return initialData;
};

const saveDemoData = (store) => {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(store));
    // Déclenche un événement pour que le hook useDataService puisse se mettre à jour
    window.dispatchEvent(new Event('demoDataUpdated')); 
};

// --- FONCTIONS SUPABASE/DEMO POUR LE TEMPS RÉEL ET CRUD ---

// Écoute en temps réel d'une table Supabase ou charge les données de démo
const subscribeToTable = (tableName, setState, primaryKey = 'id') => {
    
    // --- MODE DÉMO ---
    if (!isSupabaseConfigured) {
        // Fonction pour mettre à jour l'état à partir du store de démo
        const updateStateFromDemo = () => {
            const demoData = loadDemoData();
            // Utilise 'co_owners' pour l'état 'pilots'
            const data = demoData[tableName] || demoData.co_owners || []; 
            setState(data);
        };
        
        updateStateFromDemo(); // Chargement initial

        // Écouteur d'événement global pour les mises à jour en mode démo
        const listener = () => updateStateFromDemo();
        window.addEventListener('demoDataUpdated', listener);
        
        return () => window.removeEventListener('demoDataUpdated', listener);
    }
    
    // --- MODE SUPABASE ---
    
    const fetchData = async () => {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) {
            console.error(`Erreur de chargement de ${tableName}:`, error);
        } else {
            setState(data);
        }
    };
    
    fetchData(); // Chargement initial

    // Écouteur temps réel Supabase
    const channel = supabase
        .channel(`public:${tableName}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
            fetchData();
        })
        .subscribe();
        
    return () => {
        supabase.removeChannel(channel);
    };
};

// Récupère une seule entrée (pour l'ULM)
const fetchSingleRecord = async (tableName, recordId, setState) => {
    
    // --- MODE DÉMO ---
    if (!isSupabaseConfigured) {
        const demoData = loadDemoData();
        if (tableName === 'aircraft') {
            setState(demoData.aircraft);
        }
        return;
    }
    
    // --- MODE SUPABASE ---
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', recordId)
        .single();
        
    if (error && error.code !== 'PGRST116') { // PGRST116 = pas de ligne trouvée
        console.error(`Erreur de chargement d'enregistrement unique ${tableName} (${recordId}):`, error);
    } else if (data) {
        setState(data);
    }
};


// --- HOOK PRINCIPAL : useDataService ---

const useDataService = () => {
    const [dataState, setDataState] = useState({
        aircraft: getInitialDemoData().aircraft,
        pilots: [],
        reservations: [],
        flightLogs: [],
        expenses: [],
        expenseCategories: getInitialDemoData().expense_categories,
        isDemo: !isSupabaseConfigured,
        authLoading: true,
        dataLoading: true,
    });
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);

    const isDemo = dataState.isDemo;

    // Supabase Auth Listener
    useEffect(() => {
        if (!isSupabaseConfigured) {
            setUser(null); 
            setProfile(null);
            setDataState(prev => ({ ...prev, authLoading: false }));
            return;
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user || null;
                setUser(currentUser);
                setDataState(prev => ({ ...prev, authLoading: false }));

                if (currentUser) {
                    await fetchAndSyncProfile(currentUser.id, currentUser.email);
                } else {
                    setProfile(null);
                }
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // --- Fonction de synchronisation du profil ---
    const fetchAndSyncProfile = useCallback(async (userId, userEmail) => {
        if (!supabase) return;

        const { data: profileData, error } = await supabase
            .from('co_owners')
            .select('*')
            .eq('uid', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // 404 (pas trouvé) est ok
            console.error("Erreur de chargement du profil:", error);
            setProfile(null);
        } else if (profileData) {
            setProfile(profileData);
        } else if (userEmail) {
             // CRÉATION DU PROFIL si l'utilisateur est authentifié mais n'a pas d'entrée co_owners
             const newProfile = {
                uid: userId,
                name: userEmail.split('@')[0],
                email: userEmail,
                is_admin: false, // Sera mis à jour par l'admin plus tard
             };
             const { data: newProfileData, error: insertError } = await supabase
                 .from('co_owners')
                 .insert([newProfile])
                 .select()
                 .single();
             
             if (insertError) {
                console.error("Erreur de création du profil:", insertError);
             } else {
                setProfile(newProfileData);
             }
        }
    }, []);

    // --- Fonctions CRUD (Unified) ---

    const insertRecord = useCallback(async (tableName, record) => {
        if (isDemo) {
            // Mode Démo: Simuler l'insertion locale
            let store = loadDemoData();
            // Assure que la bonne clé est utilisée pour les collections de démo
            const storeKey = tableName === 'pilots' ? 'co_owners' : tableName; 
            
            record.id = uuidv4();
            record.created_at = new Date().toISOString();
            store[storeKey].push(record);
            saveDemoData(store);
            return { data: record, error: null };
        }
        
        const { data, error } = await supabase.from(tableName).insert([record]).select().single();
        return { data, error };
    }, [isDemo]);

    const upsertRecord = useCallback(async (tableName, record, primaryKeyField = 'id') => {
        if (isDemo) {
            // Mode Démo: Simuler la mise à jour locale
            let store = loadDemoData();
            const storeKey = tableName === 'pilots' ? 'co_owners' : tableName;

            const index = store[storeKey].findIndex(r => r[primaryKeyField] === record[primaryKeyField]);
            if (index > -1) {
                store[storeKey][index] = { ...store[storeKey][index], ...record };
            } else {
                // Si ce n'est pas une mise à jour, on insère
                record.id = uuidv4();
                record.created_at = new Date().toISOString();
                store[storeKey].push(record);
            }
            saveDemoData(store);
            return { data: record, error: null };
        }
        
        const { data, error } = await supabase.from(tableName).upsert(record).select().single();
        return { data, error };
    }, [isDemo]);

    // --- Temps Réel / Chargement de Données ---

    useEffect(() => {
        const tablesToLoad = [
            { name: 'aircraft', stateKey: 'aircraft', single: true },
            { name: 'co_owners', stateKey: 'pilots' }, // Supabase table: co_owners, React state: pilots
            { name: 'reservations', stateKey: 'reservations' },
            { name: 'flight_logs', stateKey: 'flightLogs' },
            { name: 'expenses', stateKey: 'expenses' },
            { name: 'expense_categories', stateKey: 'expenseCategories' }
        ];

        let subscriptions = [];

        if (isDemo) {
            // Chargement initial pour le mode démo
            const demoData = loadDemoData();
            setDataState(prev => ({
                ...prev,
                aircraft: demoData.aircraft,
                pilots: demoData.co_owners,
                reservations: demoData.reservations,
                flightLogs: demoData.flight_logs,
                expenses: demoData.expenses,
                expenseCategories: demoData.expense_categories,
                dataLoading: false,
            }));
            
            // Écouteur global pour que la démo se mette à jour après une sauvegarde
            const listener = () => {
                const updatedDemoData = loadDemoData();
                setDataState(prev => ({
                    ...prev,
                    aircraft: updatedDemoData.aircraft,
                    pilots: updatedDemoData.co_owners,
                    reservations: updatedDemoData.reservations,
                    flightLogs: updatedDemoData.flight_logs,
                    expenses: updatedDemoData.expenses,
                    expenseCategories: updatedDemoData.expense_categories,
                }));
            };
            window.addEventListener('demoDataUpdated', listener);
            return () => window.removeEventListener('demoDataUpdated', listener);

        } else if (isSupabaseConfigured) {
            setDataState(prev => ({ ...prev, dataLoading: true }));
            
            tablesToLoad.forEach(table => {
                if (!table.single) {
                    subscriptions.push(subscribeToTable(table.name, (data) => {
                        setDataState(prev => ({ ...prev, [table.stateKey]: data }));
                    }));
                } else {
                    fetchSingleRecord(table.name, AIRCRAFT_ID, (data) => {
                         setDataState(prev => ({ ...prev, [table.stateKey]: data }));
                    });
                }
            });

            setDataState(prev => ({ ...prev, dataLoading: false }));
        }

        return () => {
            subscriptions.forEach(unsub => unsub());
        };
    }, [isDemo]);

    // L'Admin est le premier pilote ou celui qui a le flag dans la DB
    const isAdmin = useMemo(() => {
        if (!profile) return false;
        // Le premier utilisateur inscrit est désigné comme admin
        return profile.is_admin || (dataState.pilots.length === 1 && dataState.pilots[0].uid === profile.uid); 
    }, [profile, dataState.pilots]);


    return {
        ...dataState,
        user,
        profile,
        isAdmin,
        authLoading: dataState.authLoading,
        dataLoading: dataState.dataLoading,
        insertRecord,
        upsertRecord,
    };
};

// --- COMPOSANTS DE VUES ---

// Constantes pour les styles
const PrimaryButtonStyle = "w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-200 ease-in-out";
const SecondaryButtonStyle = "w-full py-2 px-4 bg-white text-indigo-600 border border-indigo-200 font-semibold rounded-xl shadow-md hover:bg-gray-50 transition duration-200 ease-in-out";
const MobileInputStyle = "w-full p-4 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-lg";
const CardStyle = "bg-white p-6 rounded-2xl shadow-xl";

// ------------------------------------
// VUE : LOGIN ET INSCRIPTION
// ------------------------------------

const LoginPage = ({ setView }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        
        if (!isSupabaseConfigured) {
            setMessage("Erreur: Le mode démo ne supporte pas la connexion par email. Veuillez configurer Supabase.");
            setLoading(false);
            return;
        }

        if (isSignUp) {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                setMessage(`Erreur d'inscription: ${error.message}`);
            } else {
                setMessage("Inscription réussie ! Veuillez vérifier votre email pour confirmer.");
                setIsSignUp(false); // Passe en mode login après l'inscription
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setMessage(`Erreur de connexion: ${error.message}`);
            } else {
                // L'écouteur onAuthStateChange gérera le changement d'état
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                    {isSignUp ? "Créer un Compte Pilote" : "Connexion Co-propriétaire"}
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={MobileInputStyle}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Mot de passe"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={MobileInputStyle}
                            disabled={loading}
                        />
                    </div>
                    {message && (
                        <p className={`text-center text-sm ${message.includes('Erreur') ? 'text-red-500' : 'text-green-600'}`}>
                            {message}
                        </p>
                    )}
                    <button
                        type="submit"
                        className={PrimaryButtonStyle}
                        disabled={loading}
                    >
                        {loading ? "Chargement..." : isSignUp ? "S'inscrire" : "Se Connecter"}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                        disabled={loading}
                    >
                        {isSignUp ? "Déjà un compte? Connectez-vous" : "Pas de compte? Inscrivez-vous"}
                    </button>
                </div>
                {!isSupabaseConfigured && (
                     <div className="mt-8 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded">
                        <p className="font-semibold">Mode Démo Actif:</p>
                        <p className="text-sm">Connexion impossible. L'application utilise la persistance locale du navigateur.</p>
                     </div>
                )}
            </div>
        </div>
    );
};

// ------------------------------------
// COMPOSANT : CALENDRIER (dans Réserver)
// ------------------------------------

const ReservationCalendar = ({ reservations, onDateSelect }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay(); // 0 = Dimanche

    const startDay = (firstDayOfMonth(currentMonth) + 6) % 7; // Lundi = 0
    const totalDays = daysInMonth(currentMonth);

    const getDayReservations = useCallback((day) => {
        const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return reservations.filter(res => res.date === dateString);
    }, [reservations, currentMonth]);

    const daysArray = useMemo(() => {
        const days = [];
        for (let i = 0; i < startDay; i++) {
            days.push({ key: `empty-${i}`, day: '', classes: 'bg-gray-50' });
        }
        for (let i = 1; i <= totalDays; i++) {
            const res = getDayReservations(i);
            const isConflict = res.length > 1;
            const classes = res.length > 0 ? (isConflict ? 'bg-red-100 hover:bg-red-200' : 'bg-green-100 hover:bg-green-200') : 'hover:bg-gray-100';
            days.push({ key: `day-${i}`, day: i, classes, reservations: res, isConflict });
        }
        return days;
    }, [currentMonth, totalDays, startDay, getDayReservations]);

    const changeMonth = (amount) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1));
    };

    const handleDayClick = (day) => {
        if (day.day) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day.day);
            onDateSelect(date.toISOString().substring(0, 10)); // Format YYYY-MM-DD
        }
    };

    return (
        <div className={CardStyle}>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 text-indigo-600 rounded-full hover:bg-indigo-50"><ArrowLeft size={18} /></button>
                <h2 className="text-xl font-semibold text-gray-800">
                    {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => changeMonth(1)} className="p-2 text-indigo-600 rounded-full hover:bg-indigo-50"><ArrowRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-600">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                    <div key={day} className="py-2">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {daysArray.map(day => (
                    <div
                        key={day.key}
                        className={`py-2 px-1 rounded-lg cursor-pointer transition ${day.classes}`}
                        onClick={() => handleDayClick(day)}
                    >
                        {day.day}
                        {day.reservations?.length > 0 && (
                            <div className={`w-1 h-1 rounded-full mx-auto mt-0.5 ${day.isConflict ? 'bg-red-600' : 'bg-green-600'}`}></div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


// ------------------------------------
// VUE : TABLEAU DE BORD
// ------------------------------------

const DashboardView = ({ aircraft, pilots, reservations, flightLogs, expenses, dataLoading, isDemo, profile, setView }) => {
    const totalFlightHours = flightLogs.reduce((acc, log) => acc + parseFloat(log.duration_hours || 0), 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + parseFloat(exp.cost || 0), 0);
    const annualFixedCost = parseFloat(aircraft?.fixed_cost_annual || 0);

    // Calcul du coût horaire réel
    const costPerHour = useMemo(() => {
        if (totalFlightHours === 0) return (annualFixedCost + totalExpenses);
        return (annualFixedCost + totalExpenses) / totalFlightHours;
    }, [annualFixedCost, totalExpenses, totalFlightHours]);

    const nextReservation = useMemo(() => {
        const now = new Date();
        return reservations
            .filter(res => new Date(`${res.date}T${res.start_time}:00`) > now)
            .sort((a, b) => new Date(`${a.date}T${a.start_time}:00`) - new Date(`${b.date}T${b.start_time}:00`))[0];
    }, [reservations]);


    if (dataLoading) return <LoadingScreen />;

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Tableau de Bord ({aircraft.name})</h1>

            {isDemo && (
                <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-xl shadow-md">
                    <p className="font-semibold">Mode Démo Actif</p>
                    <p className="text-sm">Les données sont stockées **localement** dans votre navigateur (persistance non partagée).</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Coût Horaire Réel Estimé" value={`${costPerHour.toFixed(2)} €`} icon={DollarSign} color="text-green-600" />
                <Card title="Heures de Vol Totales" value={`${totalFlightHours.toFixed(1)} h`} icon={Calendar} color="text-indigo-600" />
                <Card title="Dernière Heure Tachymétrique" value={`${aircraft.latest_tach_hour.toFixed(1)} h`} icon={Settings} color="text-yellow-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <section className={CardStyle}>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Prochaine Réservation</h2>
                        {nextReservation ? (
                            <div className="border-l-4 border-indigo-500 pl-4 py-2 bg-indigo-50 rounded-lg">
                                <p className="text-lg font-semibold">{nextReservation.pilot_name || 'Pilote inconnu'}</p>
                                <p className="text-sm text-gray-600">
                                    {new Date(nextReservation.date).toLocaleDateString('fr-FR')} de {nextReservation.start_time} à {nextReservation.end_time}
                                </p>
                                <p className="text-sm mt-1">Motif: {nextReservation.title}</p>
                            </div>
                        ) : (
                            <p className="text-gray-500">Aucune réservation à venir. <span className="text-indigo-600 cursor-pointer" onClick={() => setView('reserve')}>Réserver maintenant.</span></p>
                        )}
                    </section>

                    <section className={CardStyle}>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Derniers Vols (Logbook)</h2>
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                            {flightLogs.slice(0, 5).map(log => (
                                <div key={log.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">{log.pilot_name} ({new Date(log.date).toLocaleDateString('fr-FR')})</span>
                                        <span className="text-sm text-gray-600">Fin Tachymètre: {log.end_tach_hours} h</span>
                                    </div>
                                    <span className="text-indigo-600 font-bold">{log.duration_hours} h</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <section className={CardStyle}>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Accès Rapide</h2>
                        <button className={`${PrimaryButtonStyle} mb-3`} onClick={() => setView('logFlight')}>
                            <div className="flex items-center justify-center">
                                <Plus size={18} className="mr-2" /> Loguer un Nouveau Vol
                            </div>
                        </button>
                        <button className={SecondaryButtonStyle} onClick={() => setView('reserve')}>
                            <div className="flex items-center justify-center">
                                <Calendar size={18} className="mr-2" /> Nouvelle Réservation
                            </div>
                        </button>
                    </section>
                </div>
            </div>
        </div>
    );
};

// ------------------------------------
// VUE : RÉSERVER
// ------------------------------------

const ReserveView = ({ user, pilots, reservations, insertRecord, setView }) => {
    const [reservationData, setReservationData] = useState({
        title: '',
        date: new Date().toISOString().substring(0, 10),
        start_time: '09:00',
        end_time: '12:00',
    });
    const [message, setMessage] = useState('');

    const handleDateSelect = (dateString) => {
        setReservationData(prev => ({ ...prev, date: dateString }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const pilotProfile = pilots.find(p => p.uid === user.id);
        if (!pilotProfile) {
            setMessage("Erreur: Profil pilote non trouvé. Veuillez contacter l'administrateur.");
            return;
        }

        const newReservation = {
            ...reservationData,
            user_id: user.id,
            pilot_name: pilotProfile.name || user.email,
        };

        const { error } = await insertRecord('reservations', newReservation);

        if (error) {
            setMessage(`Erreur de réservation: ${error.message}`);
        } else {
            setMessage("Réservation enregistrée avec succès !");
            setReservationData({
                title: '',
                date: new Date().toISOString().substring(0, 10),
                start_time: '09:00',
                end_time: '12:00',
            });
        }
    };

    const selectedDayReservations = useMemo(() => {
        return reservations.filter(res => res.date === reservationData.date)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [reservations, reservationData.date]);

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Planifier une Réservation</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <ReservationCalendar reservations={reservations} onDateSelect={handleDateSelect} />

                    <section className={CardStyle}>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Réservation pour le {new Date(reservationData.date).toLocaleDateString('fr-FR')}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Motif du vol</label>
                                <input
                                    type="text"
                                    value={reservationData.title}
                                    onChange={(e) => setReservationData(p => ({ ...p, title: e.target.value }))}
                                    required
                                    className="w-full p-2 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
                                    <input
                                        type="time"
                                        value={reservationData.start_time}
                                        onChange={(e) => setReservationData(p => ({ ...p, start_time: e.target.value }))}
                                        required
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
                                    <input
                                        type="time"
                                        value={reservationData.end_time}
                                        onChange={(e) => setReservationData(p => ({ ...p, end_time: e.target.value }))}
                                        required
                                        className="w-full p-2 border border-gray-300 rounded-lg"
                                    />
                                </div>
                            </div>
                            
                            {message && (
                                <p className={`text-center text-sm p-2 rounded ${message.includes('succès') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {message}
                                </p>
                            )}
                            <button type="submit" className={PrimaryButtonStyle}>
                                Confirmer la Réservation
                            </button>
                        </form>
                    </section>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <section className={CardStyle}>
                        <h2 className="text-xl font-bold mb-4 text-gray-800">Réservations du Jour</h2>
                        {selectedDayReservations.length > 0 ? (
                            <div className="space-y-3">
                                {selectedDayReservations.map(res => (
                                    <div key={res.id} className={`p-3 rounded-lg ${res.isConflict ? 'bg-red-50' : 'bg-indigo-50'} border-l-4 ${res.isConflict ? 'border-red-500' : 'border-indigo-500'}`}>
                                        <p className="font-semibold">{res.pilot_name}</p>
                                        <p className="text-sm text-gray-600">{res.start_time} - {res.end_time}</p>
                                        <p className="text-xs mt-1 italic">{res.title}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Aucune autre réservation pour cette date.</p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

// ------------------------------------
// VUE : LOGUER VOL
// ------------------------------------

const LogFlightView = ({ aircraft, flightLogs, pilots, insertRecord, upsertRecord, user, setView }) => {
    const [logData, setLogData] = useState({
        date: new Date().toISOString().substring(0, 10),
        duration_hours: '',
        fuel_cost_total: '',
    });
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const duration = parseFloat(logData.duration_hours);
        const fuelCost = parseFloat(logData.fuel_cost_total);
        const currentTach = parseFloat(aircraft.latest_tach_hour);

        if (isNaN(duration) || duration <= 0 || isNaN(fuelCost) || logData.duration_hours === '' || logData.fuel_cost_total === '') {
            setMessage("Veuillez entrer des valeurs numériques valides et positives pour la durée et le coût du carburant.");
            return;
        }

        const pilotProfile = pilots.find(p => p.uid === user.id); // Utiliser user.id au lieu de supabase?.auth.user()?.id
        if (!pilotProfile) {
            setMessage("Erreur: Profil pilote non trouvé. Veuillez vous reconnecter.");
            return;
        }

        const newEndTach = currentTach + duration;

        const newLog = {
            date: logData.date,
            user_id: pilotProfile.uid,
            pilot_name: pilotProfile.name || user.email,
            duration_hours: duration,
            end_tach_hours: newEndTach, // Nouvelle heure tachymétrique
            fuel_cost_total: fuelCost,
        };

        // 1. Enregistre le nouveau vol
        const { error: logError } = await insertRecord('flight_logs', newLog);

        // 2. Met à jour l'heure tachymétrique de l'ULM et enregistre le coût
        if (!logError) {
            const { error: aircraftUpdateError } = await upsertRecord('aircraft', {
                id: AIRCRAFT_ID,
                latest_tach_hour: newEndTach,
            }, 'id');

            // 3. Enregistre le coût du carburant comme une dépense variable
            const { error: expenseError } = await insertRecord('expenses', {
                date: logData.date,
                cost: fuelCost,
                type: 'carburant', // Nouvelle catégorie implicite
                description: `Carburant pour vol de ${duration.toFixed(1)}h`,
                user_id: pilotProfile.uid,
            });

            if (aircraftUpdateError || expenseError) {
                // Log l'erreur mais considère l'opération principale (le log de vol) comme réussie pour l'utilisateur
                setMessage(`Vol logué avec succès, mais une erreur est survenue lors de la mise à jour des coûts/ULM.`);
                console.error("Erreur de mise à jour secondaire:", aircraftUpdateError, expenseError);
            } else {
                setMessage(`Vol de ${duration.toFixed(1)}h logué avec succès ! Nouvelle heure Tachymètre: ${newEndTach.toFixed(1)} h`);
            }
            
            // Réinitialiser le formulaire
            setLogData({
                date: new Date().toISOString().substring(0, 10),
                duration_hours: '',
                fuel_cost_total: '',
            });

        } else {
            setMessage(`Erreur critique lors de l'enregistrement du vol: ${logError.message}`);
        }
    };

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Loguer un Vol Terminé</h1>

            <section className={CardStyle}>
                <h2 className="text-xl font-bold mb-6 text-gray-800">Informations de Vol</h2>
                
                <div className="mb-6 p-4 bg-indigo-50 rounded-xl">
                    <p className="text-sm font-semibold text-indigo-800">Heure Tachymétrique de Début (Base):</p>
                    <p className="text-2xl font-extrabold text-indigo-600">{aircraft.latest_tach_hour.toFixed(1)} h</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">Durée du Vol (Heures, ex: 1.5)</label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 1.5"
                            value={logData.duration_hours}
                            onChange={(e) => setLogData(p => ({ ...p, duration_hours: e.target.value }))}
                            required
                            className={MobileInputStyle}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-2">Coût Total du Carburant (€)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 150.00"
                            value={logData.fuel_cost_total}
                            onChange={(e) => setLogData(p => ({ ...p, fuel_cost_total: e.target.value }))}
                            required
                            className={MobileInputStyle}
                        />
                    </div>

                    <div className="pt-4 border-t">
                        <p className="text-lg font-medium text-gray-700">Heure Tachymétrique de Fin Estimée:</p>
                        <p className="text-2xl font-extrabold text-green-600">
                            {(parseFloat(aircraft.latest_tach_hour) + parseFloat(logData.duration_hours || 0)).toFixed(1)} h
                        </p>
                    </div>

                    {message && (
                        <p className={`text-center text-sm p-2 rounded ${message.includes('succès') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </p>
                    )}

                    <button type="submit" className={PrimaryButtonStyle}>
                        <div className="flex items-center justify-center">
                            <Send size={18} className="mr-2" /> Valider le Vol et Mettre à Jour
                        </div>
                    </button>
                </form>
            </section>
        </div>
    );
};

// ------------------------------------
// VUE : COMPTABILITÉ
// ------------------------------------

const CostsView = ({ aircraft, flightLogs, expenses, expenseCategories, insertRecord, user }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newExpense, setNewExpense] = useState({ cost: '', type: 'fees', description: '', date: new Date().toISOString().substring(0, 10) });
    const [message, setMessage] = useState('');

    const totalFlightHours = flightLogs.reduce((acc, log) => acc + parseFloat(log.duration_hours || 0), 0);
    
    // Calcul des coûts
    const calculatedCosts = useMemo(() => {
        const fixed = parseFloat(aircraft.fixed_cost_annual || 0);
        const variableMaintenance = expenses
            .filter(e => e.type !== 'carburant')
            .reduce((acc, exp) => acc + parseFloat(exp.cost || 0), 0);
        const fuel = expenses
            .filter(e => e.type === 'carburant')
            .reduce((acc, exp) => acc + parseFloat(exp.cost || 0), 0);

        const totalCost = fixed + variableMaintenance + fuel;
        const costPerHour = totalFlightHours > 0 ? totalCost / totalFlightHours : totalCost;

        return { fixed, variableMaintenance, fuel, totalCost, costPerHour };
    }, [aircraft, expenses, totalFlightHours]);

    const handleExpenseSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const cost = parseFloat(newExpense.cost);
        if (isNaN(cost) || cost <= 0) {
            setMessage("Veuillez entrer un coût valide.");
            return;
        }

        const expenseToSave = {
            ...newExpense,
            cost: cost,
            user_id: user.id, // Utilisation de user.id
        };

        const { error } = await insertRecord('expenses', expenseToSave);

        if (error) {
            setMessage(`Erreur d'enregistrement: ${error.message}`);
        } else {
            setMessage("Dépense enregistrée avec succès !");
            setNewExpense({ cost: '', type: 'fees', description: '', date: new Date().toISOString().substring(0, 10) });
            setIsModalOpen(false);
        }
    };

    const AddExpenseModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className={`${CardStyle} w-full max-w-lg`}>
                <h2 className="text-2xl font-bold mb-4">Ajouter une Dépense</h2>
                <form onSubmit={handleExpenseSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" value={newExpense.date} onChange={(e) => setNewExpense(p => ({ ...p, date: e.target.value }))} required className="w-full p-2 border rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Type de Dépense</label>
                        <select value={newExpense.type} onChange={(e) => setNewExpense(p => ({ ...p, type: e.target.value }))} required className="w-full p-2 border rounded-lg">
                            <option value="carburant">Carburant</option>
                            {expenseCategories.map(cat => (
                                <option key={cat.id} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Coût (€)</label>
                        <input type="number" step="0.01" value={newExpense.cost} onChange={(e) => setNewExpense(p => ({ ...p, cost: e.target.value }))} required className="w-full p-2 border rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea value={newExpense.description} onChange={(e) => setNewExpense(p => ({ ...p, description: e.target.value }))} className="w-full p-2 border rounded-lg" rows="2" />
                    </div>
                    {message && <p className="text-sm text-red-500">{message}</p>}
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 border rounded-xl hover:bg-gray-100">Annuler</button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Enregistrer</button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Comptabilité & Coûts</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Section Coût Horaire */}
                <section className={`${CardStyle} lg:col-span-1`}>
                    <h2 className="text-2xl font-bold mb-4 text-gray-800">Coût Horaire Réel</h2>
                    <p className="text-4xl font-extrabold text-indigo-600 mb-6">
                        {calculatedCosts.costPerHour.toFixed(2)} €/h
                    </p>
                    <p className="text-sm text-gray-700 mb-2">
                        Le coût horaire est calculé en divisant le coût total (Fixe + Maintenance + Carburant) par les heures de vol réelles ({totalFlightHours.toFixed(1)} h).
                    </p>
                    <p className="text-xs text-gray-500">
                        Total Coûts: {calculatedCosts.totalCost.toFixed(2)} €
                    </p>
                </section>

                {/* Section Dépenses ventilées */}
                <section className={`${CardStyle} lg:col-span-2`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">Ventilation des Coûts Annuels</h2>
                        <button onClick={() => setIsModalOpen(true)} className="flex items-center text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
                            <Plus size={16} className="mr-1" /> Ajouter Dépense
                        </button>
                    </div>

                    <div className="space-y-3">
                        <CostItem label="Coûts Fixes Annuels (ex: Assurance)" value={calculatedCosts.fixed} />
                        <CostItem label="Frais Variables & Maintenance" value={calculatedCosts.variableMaintenance} />
                        <CostItem label="Carburant Total" value={calculatedCosts.fuel} />
                        
                        <div className="pt-4 border-t-2 mt-4 flex justify-between font-extrabold text-xl text-gray-900">
                            <span>TOTAL DES COÛTS</span>
                            <span>{calculatedCosts.totalCost.toFixed(2)} €</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Liste des Dépenses */}
            <section className={CardStyle}>
                <h2 className="text-xl font-bold mb-4 text-gray-800">Historique Détaillé des Dépenses</h2>
                <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Coût (€)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map(exp => (
                                <tr key={exp.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(exp.date).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{exp.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">{parseFloat(exp.cost).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {isModalOpen && <AddExpenseModal />}
        </div>
    );
};

const CostItem = ({ label, value }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{value.toFixed(2)} €</span>
    </div>
);

// ------------------------------------
// VUE : ADMINISTRATION
// ------------------------------------

const AdminView = ({ aircraft, pilots, expenseCategories, upsertRecord, user, isAdmin, insertRecord }) => {
    const [aircraftName, setAircraftName] = useState(aircraft.name);
    const [fixedCost, setFixedCost] = useState(aircraft.fixed_cost_annual);
    const [message, setMessage] = useState('');
    const [newCategory, setNewCategory] = useState({ label: '', is_fixed: false });

    useEffect(() => {
        setAircraftName(aircraft.name);
        setFixedCost(aircraft.fixed_cost_annual);
    }, [aircraft]);

    const handleAircraftUpdate = async (e) => {
        e.preventDefault();
        setMessage('');

        const newFixedCost = parseFloat(fixedCost);
        if (isNaN(newFixedCost) || newFixedCost < 0) {
            setMessage("Veuillez entrer un coût fixe valide.");
            return;
        }

        const { error } = await upsertRecord('aircraft', {
            id: AIRCRAFT_ID,
            name: aircraftName,
            fixed_cost_annual: newFixedCost,
        }, 'id');

        if (error) {
            setMessage(`Erreur de mise à jour: ${error.message}`);
        } else {
            setMessage("ULM et coûts fixes mis à jour avec succès !");
        }
    };

    const handleNewCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.label.trim()) return;

        const categoryToSave = {
            label: newCategory.label.trim(),
            value: newCategory.label.toLowerCase().replace(/\s/g, '_'),
            is_fixed: newCategory.is_fixed,
        };

        const { error } = await insertRecord('expense_categories', categoryToSave);

        if (error) {
            setMessage(`Erreur d'ajout de catégorie: ${error.message}`);
        } else {
            setMessage("Nouvelle catégorie de dépense ajoutée.");
            setNewCategory({ label: '', is_fixed: false });
        }
    };
    
    // Fonction de changement de statut Admin/Membre
    const toggleAdminStatus = async (pilot) => {
        if (pilot.uid === user.id) {
            setMessage("Vous ne pouvez pas modifier votre propre statut d'administrateur.");
            return;
        }

        const { error } = await upsertRecord('co_owners', {
            uid: pilot.uid,
            is_admin: !pilot.is_admin,
        }, 'uid');

        if (error) {
            setMessage(`Erreur de mise à jour du rôle: ${error.message}`);
        }
    };

    if (!isAdmin) {
        return (
            <div className="p-8 text-center bg-red-50 rounded-xl m-8">
                <h1 className="text-2xl font-bold text-red-700">Accès Refusé</h1>
                <p className="text-red-600 mt-2">Seuls les administrateurs peuvent accéder à ce tableau de bord.</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <h1 className="text-3xl font-extrabold text-gray-900">Tableau de Bord Administration</h1>

            {message && (
                <p className={`text-center text-sm p-2 rounded ${message.includes('Erreur') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gestion ULM et Coûts Fixes */}
                <section className={`${CardStyle} lg:col-span-1`}>
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Gestion ULM & Coûts Fixes</h2>
                    <form onSubmit={handleAircraftUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nom ULM</label>
                            <input
                                type="text"
                                value={aircraftName}
                                onChange={(e) => setAircraftName(e.target.value)}
                                required
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Coût Fixe Annuel (€)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={fixedCost}
                                onChange={(e) => setFixedCost(e.target.value)}
                                required
                                className="w-full p-2 border border-gray-300 rounded-lg"
                            />
                        </div>
                        <button type="submit" className={PrimaryButtonStyle}>Mettre à Jour ULM</button>
                    </form>
                </section>

                {/* Gestion Catégories de Coûts */}
                <section className={`${CardStyle} lg:col-span-2`}>
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Catégories de Dépenses</h2>
                    
                    <form onSubmit={handleNewCategory} className="flex space-x-2 mb-4">
                        <input
                            type="text"
                            placeholder="Nom de la nouvelle catégorie (ex: Vidange)"
                            value={newCategory.label}
                            onChange={(e) => setNewCategory(p => ({ ...p, label: e.target.value }))}
                            required
                            className="flex-grow p-2 border border-gray-300 rounded-lg"
                        />
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">Ajouter</button>
                    </form>

                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {expenseCategories.map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                                <span>{cat.label}</span>
                                <span className="text-xs text-indigo-500">{cat.is_fixed ? '(Fixe)' : '(Variable)'}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            
            {/* Gestion des Pilotes */}
            <section className={CardStyle}>
                <h2 className="text-xl font-bold mb-4 text-gray-800">Gestion des Co-propriétaires (Pilotes)</h2>
                <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom du Pilote</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID (ID Supabase)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pilots.map(pilot => (
                                <tr key={pilot.uid}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pilot.name}</td>
                                    <td className="px-6 py-4 text-xs text-gray-500">{pilot.uid.substring(0, 8)}...</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pilot.is_admin ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                            {pilot.is_admin ? 'Administrateur' : 'Membre'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => toggleAdminStatus(pilot)}
                                            disabled={pilot.uid === user.id}
                                            className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400"
                                            title={pilot.uid === user.id ? "Impossible de modifier son propre rôle" : `Basculer vers ${pilot.is_admin ? 'Membre' : 'Admin'}`}
                                        >
                                            {pilot.is_admin ? 'Rétrograder' : 'Promouvoir'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};


// ------------------------------------
// COMPOSANT PRINCIPAL (APP)
// ------------------------------------

const Card = ({ title, value, icon: Icon, color }) => (
    <div className={`${CardStyle} flex items-start space-x-4`}>
        <div className={`p-3 rounded-full ${color} bg-opacity-10`} style={{ backgroundColor: `${color}10` }}>
            <Icon size={24} className={color} />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
    </div>
);

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-xl text-gray-600 font-semibold">Chargement des données...</p>
    </div>
);

const App = () => {
    const [view, setView] = useState('dashboard'); // 'dashboard', 'reserve', 'logFlight', 'costs', 'admin'
    const { 
        user, profile, isAdmin, authLoading, dataLoading, isDemo,
        aircraft, pilots, reservations, flightLogs, expenses, expenseCategories,
        insertRecord, upsertRecord
    } = useDataService();
    
    // Détermine la vue à afficher
    const renderView = () => {
        if (authLoading) return <LoadingScreen />;

        if (!user && !isDemo) {
            // Si pas d'utilisateur et Supabase est configuré, forcer la connexion
            return <LoginPage setView={setView} />;
        }

        if (dataLoading) return <LoadingScreen />;
        
        const viewProps = { user, profile, isAdmin, setView, insertRecord, upsertRecord, aircraft, pilots, reservations, flightLogs, expenses, expenseCategories, isDemo };

        switch (view) {
            case 'reserve':
                return <ReserveView {...viewProps} />;
            case 'logFlight':
                return <LogFlightView {...viewProps} />;
            case 'costs':
                return <CostsView {...viewProps} />;
            case 'admin':
                return <AdminView {...viewProps} />;
            case 'dashboard':
            default:
                return <DashboardView {...viewProps} />;
        }
    };

    const handleLogout = async () => {
        if (isDemo) {
            // En mode démo, on simule la déconnexion
            window.location.reload(); 
            return;
        }
        await supabase.auth.signOut();
        // Le onAuthStateChange gère la redirection vers LoginPage
    };

    const navItems = [
        { id: 'dashboard', label: 'Tableau de Bord', icon: Calendar },
        { id: 'reserve', label: 'Réservation', icon: Plus },
        { id: 'logFlight', label: 'Loguer Vol', icon: Send },
        { id: 'costs', label: 'Comptabilité', icon: DollarSign },
    ];

    if (isAdmin) {
        navItems.push({ id: 'admin', label: 'Admin', icon: Settings });
    }

    // Affichage principal
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-md fixed w-full z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex-shrink-0">
                            <h1 className="text-2xl font-extrabold text-indigo-600 flex items-center">
                                <span className="mr-2">✈️</span> ULM Manager
                            </h1>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setView(item.id)}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition duration-150 ease-in-out ${
                                        view === item.id
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    <item.icon size={18} className="mr-1" /> {item.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center">
                            {(user || isDemo) && (
                                <button
                                    onClick={handleLogout}
                                    className="p-2 ml-4 text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center"
                                >
                                    <LogOut size={18} className="mr-1" /> Déconnexion
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto pt-16 pb-8">
                {renderView()}
            </main>

            <nav className="fixed bottom-0 w-full bg-white shadow-2xl sm:hidden">
                <div className="flex justify-around items-center h-16">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id)}
                            className={`flex flex-col items-center justify-center p-1 text-xs font-medium ${
                                view === item.id
                                    ? 'text-indigo-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <item.icon size={24} />
                            <span className="mt-1">{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default App;
