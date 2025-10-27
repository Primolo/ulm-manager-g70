import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, onSnapshot, collection, query, addDoc, updateDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { setLogLevel } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Configuration Firebase globale (fournie par l'environnement Canvas)
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'ulm-manager-default-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialisation de Firebase
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

// Activer le mode debug pour Firestore
if (db) setLogLevel('debug');

// --- CONSTANTES ET FONCTIONS UTILITAIRES ---

// Chemins de collections publics
const getCollectionPath = (collectionName) => {
    return `artifacts/${appId}/public/data/${collectionName}`;
};

// Styles Tailwind CSS réutilisables
const PrimaryButtonStyle = "w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition duration-200 ease-in-out";
const SecondaryButtonStyle = "w-full py-2 px-4 bg-white text-indigo-600 border border-indigo-200 font-semibold rounded-xl shadow-md hover:bg-gray-50 transition duration-200 ease-in-out";
const MobileInputStyle = "w-full p-4 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 text-lg";
const CardStyle = "bg-white p-6 rounded-2xl shadow-xl";

// --- COMPOSANTS DE VUES ---

// 1. Vue Administration
const AdminView = ({ pilots, aircraftData, expenseCategories, db, userId, appId, onUpdate, onAddPilot, onAddCategory, onUpdateAircraft }) => {
    const [newPilotEmail, setNewPilotEmail] = useState('');
    const [newPilotName, setNewPilotName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newFixedCost, setNewFixedCost] = useState(aircraftData.fixed_cost_annual || 0);

    // Simulation de l'ajout d'un pilote
    const handleAddPilot = async (e) => {
        e.preventDefault();
        if (!newPilotEmail || !newPilotName) return;

        // Dans un environnement réel, ceci créerait un utilisateur Supabase/Firebase Auth.
        // Ici, nous simulons l'ajout à la liste des co-propriétaires
        const newPilot = {
            name: newPilotName,
            email: newPilotEmail,
            isAdmin: false,
            // Simule l'UID pour l'affichage
            uid: `simulated-uid-${Date.now()}`, 
        };

        const colRef = collection(db, getCollectionPath('co_owners'));
        await addDoc(colRef, newPilot);

        setNewPilotEmail('');
        setNewPilotName('');
        alert("Pilote ajouté (simulation Firestore). Un vrai système nécessiterait une invitation Auth.");
    };

    // Ajout d'une catégorie de dépense
    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName) return;

        const newCat = {
            value: newCategoryName.toLowerCase().replace(/\s/g, '_'),
            label: newCategoryName
        };

        const colRef = collection(db, getCollectionPath('expense_categories'));
        await addDoc(colRef, newCat);
        setNewCategoryName('');
    };

    // Mise à jour des coûts fixes de l'ULM
    const handleUpdateAircraft = async (e) => {
        e.preventDefault();
        const aircraftRef = doc(db, getCollectionPath('aircraft'), 'G70');
        await setDoc(aircraftRef, {
            name: aircraftData.name,
            fixed_cost_annual: parseFloat(newFixedCost),
            latest_tach_hour: aircraftData.latest_tach_hour
        }, { merge: true });
        alert("Coût fixe annuel mis à jour.");
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
                            <div key={p.uid} className="flex justify-between items-center p-3 border-b">
                                <div>
                                    <p className="font-semibold">{p.name}</p>
                                    <p className="text-sm text-gray-500 truncate">{p.uid}</p>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${p.isAdmin ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {p.isAdmin ? 'Admin' : 'Membre'}
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
                            value={aircraftData.name}
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
                        <span key={cat.value} className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full">
                            {cat.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// 2. Composant Modale pour l'ajout de dépense
const AddExpenseModal = ({ isOpen, onClose, userId, db, expenseCategories, onAdd }) => {
    const [date, setDate] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('Maintenance');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!date || !amount || !description) return;

        const newExpense = {
            date: date,
            cost: parseFloat(amount),
            type: type,
            description: description,
            user_id: userId,
            created_at: new Date().toISOString()
        };

        const colRef = collection(db, getCollectionPath('expenses'));
        await addDoc(colRef, newExpense);

        // Réinitialisation et fermeture
        setAmount('');
        setDescription('');
        onClose();
        onAdd(newExpense); // Mise à jour de l'état local (pour le mock, non nécessaire avec onSnapshot)
    };

    if (!isOpen) return null;

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
                            <option value="Maintenance">Maintenance (Prévue)</option>
                            {expenseCategories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
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
const CostsView = ({ expenses, flightLogs, aircraftData, totalFlightHours }) => {
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
    }, [totalMaintenanceCost, totalFuelHours, fixedCostAnnual]);


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
                    <p className="text-sm text-gray-700">
                        $$\frac{\text{Coûts Fixes} + \text{Coûts Variables} + \text{Coût Carburant}}{\text{Heures Volées}}$$
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
                        expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).map((exp, index) => (
                            <div key={index} className="flex justify-between p-3 bg-gray-50 rounded-lg">
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
                db={db}
                expenseCategories={[]} // Utiliser l'état réel si disponible
                onAdd={() => { /* onSnapshot gère la mise à jour */ }}
            />
        </div>
    );
};

// 4. Vue Loguer Vol (Mobile-Optimisée)
const LogFlightView = ({ userId, db, pilots, aircraftData, onLog }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [endTachHours, setEndTachHours] = useState('');
    const [fuelCost, setFuelCost] = useState('');
    const [pilot, setPilot] = useState(userId);

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
        const logsRef = collection(db, getCollectionPath('flight_logs'));
        await addDoc(logsRef, newLog);

        // 2. Mettre à jour la dernière heure TACH de l'ULM
        const aircraftRef = doc(db, getCollectionPath('aircraft'), 'G70');
        await updateDoc(aircraftRef, {
            latest_tach_hour: endHours
        });

        // Réinitialisation du formulaire
        setEndTachHours('');
        setFuelCost('');
        alert(`Vol enregistré ! Durée: ${duration.toFixed(2)}h. Nouvelle heure TACH: ${endHours.toFixed(1)}.`);
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
                                <option key={p.uid} value={p.uid}>{p.name}</option>
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
const ReserveView = ({ userId, db, pilots, reservations, currentPilot, onAdd }) => {
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
            pilot_name: currentPilot.name,
            created_at: new Date().toISOString()
        };

        const colRef = collection(db, getCollectionPath('reservations'));
        await addDoc(colRef, newReservation);

        // Réinitialisation
        setTitle('');
        alert("Réservation enregistrée avec succès !");
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
                            {reservationsForSelectedDay.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((res, index) => (
                                <div key={index} className="flex justify-between text-sm p-2 bg-white rounded-lg shadow-sm">
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
const DashboardView = ({ aircraftData, pilots, totalFlightHours, realHourlyCost }) => {
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
                <p className="text-xl text-gray-500 mt-2">Bienvenue, {pilots.find(p => p.isAdmin)?.name || 'Admin'} !</p>
            </div>

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
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20v-2c0-.656-.126-1.283-.356-1.857M9 20H4v-2a3 3 0 015-2.828M9 20v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.212 0M9 17v-2m3 2v-2m3 2v-2M12 6V4"></path></svg>}
                    label="Co-propriétaires Enregistrés"
                    value={pilots.length}
                    unit=""
                    color="red"
                />
            </div>

            {/* Prochaines Réservations */}
            <div className={CardStyle}>
                <h2 className="text-2xl font-semibold mb-4 text-indigo-700">Prochaines Réservations</h2>
                {/* Simulation: Afficher les 5 prochaines réservations */}
                <div className="space-y-3">
                    {/* Filtre les futures réservations et affiche les 5 premières */}
                    {/* Placeholder */}
                    <p className="text-gray-500">Voir la vue "Réservation" pour le calendrier complet.</p>
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
    const [currentPilot, setCurrentPilot] = useState({ name: 'Chargement...', isAdmin: false });

    // Données temps réel de la base de données
    const [aircraftData, setAircraftData] = useState({});
    const [pilots, setPilots] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [flightLogs, setFlightLogs] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);


    // 1. Authentification et Initialisation de l'utilisateur
    useEffect(() => {
        if (!auth) {
            console.error("Firebase Auth non initialisé.");
            setIsAuthReady(true);
            return;
        }

        const setupAuth = async (user) => {
            let currentUserId = user ? user.uid : crypto.randomUUID();
            setUserId(currentUserId);

            // Tente de récupérer ou créer le profil utilisateur
            const userRef = doc(db, getCollectionPath('co_owners'), currentUserId);
            const userUnsub = onSnapshot(userRef, async (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCurrentPilot(data);
                    setIsAdmin(data.isAdmin || false);
                } else {
                    // Création du profil initial (nom générique pour l'exemple)
                    const initialData = {
                        uid: currentUserId,
                        name: `Pilote-${currentUserId.substring(0, 4)}`,
                        email: user?.email || 'N/A',
                        // Le premier utilisateur sera l'admin dans cette version de démo
                        isAdmin: pilots.length === 0, 
                        created_at: new Date().toISOString()
                    };
                    await setDoc(userRef, initialData);
                    setCurrentPilot(initialData);
                    setIsAdmin(initialData.isAdmin);
                }
                setIsAuthReady(true);
            }, (error) => console.error("Erreur de récupération du profil:", error));
            
            return () => userUnsub();
        };


        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setupAuth(user);
            } else if (initialAuthToken) {
                // Tentative de connexion avec le token fourni par Canvas
                signInWithCustomToken(auth, initialAuthToken)
                    .then(({ user }) => setupAuth(user))
                    .catch(error => {
                        console.error("Erreur signInWithCustomToken:", error);
                        signInAnonymously(auth).then(({ user }) => setupAuth(user));
                    });
            } else {
                // Connexion anonyme si aucun token n'est fourni
                signInAnonymously(auth).then(({ user }) => setupAuth(user));
            }
        });

        return () => unsubscribeAuth();
    }, [initialAuthToken, db, pilots.length]); // Dépend de pilots.length pour initialiser l'admin


    // 2. Chargement des données temps réel (onSnapshot)
    useEffect(() => {
        if (!db || !isAuthReady) return;

        const unsubscribeFunctions = [];

        // Écouteur ULM (Singleton)
        const unsubAircraft = onSnapshot(doc(db, getCollectionPath('aircraft'), 'G70'), (docSnap) => {
            if (docSnap.exists()) {
                setAircraftData({ ...docSnap.data(), id: 'G70' });
            } else {
                // Crée le document initial si inexistant
                setDoc(doc(db, getCollectionPath('aircraft'), 'G70'), {
                    name: 'ULM G70',
                    fixed_cost_annual: 4500.0,
                    latest_tach_hour: 0.0
                });
            }
        }, (e) => console.error("Erreur aircraft:", e));
        unsubscribeFunctions.push(unsubAircraft);

        // Écouteur Pilotes
        const unsubPilots = onSnapshot(collection(db, getCollectionPath('co_owners')), (snapshot) => {
            setPilots(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        }, (e) => console.error("Erreur pilotes:", e));
        unsubscribeFunctions.push(unsubPilots);

        // Écouteur Réservations
        const qReservations = query(collection(db, getCollectionPath('reservations')));
        const unsubReservations = onSnapshot(qReservations, (snapshot) => {
            setReservations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        }, (e) => console.error("Erreur réservations:", e));
        unsubscribeFunctions.push(unsubReservations);

        // Écouteur Logs de Vol
        const qLogs = query(collection(db, getCollectionPath('flight_logs')));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
            setFlightLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        }, (e) => console.error("Erreur logs:", e));
        unsubscribeFunctions.push(unsubLogs);

        // Écouteur Dépenses
        const qExpenses = query(collection(db, getCollectionPath('expenses')));
        const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
            setExpenses(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        }, (e) => console.error("Erreur dépenses:", e));
        unsubscribeFunctions.push(unsubExpenses);

        // Écouteur Catégories de Dépenses
        const qCategories = query(collection(db, getCollectionPath('expense_categories')));
        const unsubCategories = onSnapshot(qCategories, (snapshot) => {
            const categories = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            // Ajout des catégories par défaut
            const defaultCategories = [
                { value: 'fuel', label: 'Carburant' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'fees', label: 'Frais d\'Aérodrome' },
                { value: 'other', label: 'Autre' },
            ];
            setExpenseCategories([...defaultCategories, ...categories]);
        }, (e) => console.error("Erreur catégories:", e));
        unsubscribeFunctions.push(unsubCategories);


        return () => unsubscribeFunctions.forEach(unsub => unsub());
    }, [db, isAuthReady, userId]);

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

        switch (page) {
            case 'dashboard':
                return <DashboardView
                    aircraftData={aircraftData}
                    pilots={pilots}
                    totalFlightHours={totalFlightHours}
                    realHourlyCost={realHourlyCost}
                />;
            case 'reserve':
                return <ReserveView
                    userId={userId}
                    db={db}
                    pilots={pilots}
                    reservations={reservations}
                    currentPilot={currentPilot}
                />;
            case 'log-flight':
                return <LogFlightView
                    userId={userId}
                    db={db}
                    pilots={pilots}
                    aircraftData={aircraftData}
                />;
            case 'costs':
                return <CostsView
                    expenses={expenses}
                    flightLogs={flightLogs}
                    aircraftData={aircraftData}
                    totalFlightHours={totalFlightHours}
                />;
            case 'admin':
                if (!isAdmin) return <div className="text-center p-20 text-red-600 font-semibold">Accès Refusé. Droits Admin Requis.</div>;
                return <AdminView
                    pilots={pilots}
                    aircraftData={aircraftData}
                    expenseCategories={expenseCategories}
                    db={db}
                    userId={userId}
                    appId={appId}
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
                            <span className="hidden sm:inline text-xs ml-2 text-gray-400">ID App: {appId.substring(0, 8)}...</span>
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

