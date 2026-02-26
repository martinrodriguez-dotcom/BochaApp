import React, { useState, useMemo, useEffect } from 'react';
import { 
  Wallet, 
  CalendarDays, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Loader2
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";

// Configuración que soporta tanto este entorno de pruebas como tu despliegue real
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyDxYsbpglFnFeSPgRAxMDc_vbSLZrhz1yU",
      authDomain: "finanzas-personales-app-19506.firebaseapp.com",
      projectId: "finanzas-personales-app-19506",
      storageBucket: "finanzas-personales-app-19506.firebasestorage.app",
      messagingSenderId: "68218471555",
      appId: "1:68218471555:web:0ef748aae5c75d1c2107b6"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const isPreview = typeof __firebase_config !== 'undefined';
const currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'finanzas-app';

// Función auxiliar para obtener la colección correcta (separada por usuario por seguridad)
const getCollectionRef = () => {
  if (isPreview) return collection(db, 'artifacts', currentAppId, 'users', auth.currentUser.uid, 'transactions');
  return collection(db, 'usuarios', auth.currentUser.uid, 'movimientos');
};

const getDocRef = (id) => {
  if (isPreview) return doc(db, 'artifacts', currentAppId, 'users', auth.currentUser.uid, 'transactions', id);
  return doc(db, 'usuarios', auth.currentUser.uid, 'movimientos', id);
};

// Utilidad para formatear moneda (Pesos Argentinos por defecto por la ubicación, pero adaptable)
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Utilidad para formatear fechas
const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('planilla');
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar Autenticación
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error iniciando sesión:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  // Escuchar datos en tiempo real de Firestore
  useEffect(() => {
    if (!user) {
        setTransactions([]);
        return;
    }

    setIsLoading(true);
    const unsubscribe = onSnapshot(
      getCollectionRef(), 
      (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        setTransactions(data);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error obteniendo datos de Firestore:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addTransaction = async (newTx) => {
    if (!user) return;
    try {
      await addDoc(getCollectionRef(), newTx);
    } catch (error) {
      console.error("Error guardando:", error);
    }
  };

  const deleteTransaction = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(getDocRef(id));
    } catch (error) {
      console.error("Error eliminando:", error);
    }
  };

  // Pantalla de carga mientras trae los datos
  if (!user || isLoading) {
     return (
       <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
         <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
         <p className="text-slate-500 font-medium">Conectando a tu base de datos...</p>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row">
      
      {/* Navegación / Sidebar */}
      <nav className="bg-slate-900 text-white md:w-64 flex-shrink-0 md:min-h-screen p-4 flex flex-row md:flex-col justify-between md:justify-start gap-4 overflow-x-auto">
        <div className="flex items-center gap-3 mb-2 md:mb-8 md:px-2">
          <Wallet className="w-8 h-8 text-emerald-400" />
          <h1 className="text-xl font-bold tracking-tight hidden md:block">Mis Finanzas</h1>
        </div>
        
        <div className="flex flex-row md:flex-col gap-2">
          <button 
            onClick={() => setActiveTab('planilla')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap ${activeTab === 'planilla' ? 'bg-slate-800 text-emerald-400' : 'hover:bg-slate-800/50'}`}
          >
            <LayoutList className="w-5 h-5" />
            <span className="font-medium">Planilla General</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('futuros')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap ${activeTab === 'futuros' ? 'bg-slate-800 text-emerald-400' : 'hover:bg-slate-800/50'}`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="font-medium">Agregar Futuros</span>
          </button>

          <button 
            onClick={() => setActiveTab('calendario')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors whitespace-nowrap ${activeTab === 'calendario' ? 'bg-slate-800 text-emerald-400' : 'hover:bg-slate-800/50'}`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="font-medium">Calendario Mensual</span>
          </button>
        </div>
      </nav>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'planilla' && <Planilla transactions={transactions} onAdd={addTransaction} onDelete={deleteTransaction} />}
          {activeTab === 'futuros' && <AgregarFuturos onAdd={addTransaction} />}
          {activeTab === 'calendario' && <Calendario transactions={transactions} />}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// VISTA 1: PLANILLA (Resumen detallado)
// ==========================================
function Planilla({ transactions, onAdd, onDelete }) {
  // Estado para el formulario rápido
  const [quickForm, setQuickForm] = useState({
    type: 'gasto',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0] // Fecha de hoy por defecto
  });

  const handleQuickSubmit = (e) => {
    e.preventDefault();
    if (!quickForm.description || !quickForm.amount || !quickForm.date) return;
    
    onAdd({
      type: quickForm.type,
      description: quickForm.description,
      amount: parseFloat(quickForm.amount),
      date: quickForm.date
    });

    // Limpiar formulario excepto la fecha y el tipo para seguir cargando
    setQuickForm(prev => ({ ...prev, description: '', amount: '' }));
  };

  // Ordenar transacciones y calcular saldo acumulado
  const processedData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let currentBalance = 0;
    
    return sorted.map(tx => {
      currentBalance += tx.type === 'ingreso' ? tx.amount : -tx.amount;
      return { ...tx, balance: currentBalance };
    });
  }, [transactions]);

  const currentTotal = processedData.length > 0 ? processedData[processedData.length - 1].balance : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Planilla de Movimientos</h2>
          <p className="text-slate-500">Historial completo de ingresos y gastos.</p>
        </div>
        <div className="bg-slate-50 px-6 py-4 rounded-xl border border-slate-100 min-w-[200px] w-full md:w-auto">
          <p className="text-sm font-medium text-slate-500 mb-1">Saldo Actual Total</p>
          <p className={`text-3xl font-bold tracking-tight ${currentTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {formatCurrency(currentTotal)}
          </p>
        </div>
      </header>

      {/* Formulario Rápido para Movimientos Diarios */}
      <form onSubmit={handleQuickSubmit} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3 items-end">
        <div className="w-full md:w-auto flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Fecha</label>
          <input 
            type="date" 
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
            value={quickForm.date}
            onChange={(e) => setQuickForm({...quickForm, date: e.target.value})}
          />
        </div>
        <div className="w-full md:w-auto flex-[2]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
          <input 
            type="text" 
            required
            placeholder="Ej. Almuerzo, Transporte..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
            value={quickForm.description}
            onChange={(e) => setQuickForm({...quickForm, description: e.target.value})}
          />
        </div>
        <div className="w-full md:w-auto flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Monto</label>
          <input 
            type="number" 
            required
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm"
            value={quickForm.amount}
            onChange={(e) => setQuickForm({...quickForm, amount: e.target.value})}
          />
        </div>
        <div className="w-full md:w-auto flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
          <select 
            className={`w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium ${quickForm.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}
            value={quickForm.type}
            onChange={(e) => setQuickForm({...quickForm, type: e.target.value})}
          >
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </select>
        </div>
        <button 
          type="submit"
          className="w-full md:w-auto px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2 h-[38px]"
        >
          <PlusCircle className="w-4 h-4" /> Agregar
        </button>
      </form>

      {/* Vista Desktop: Tabla */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider border-b border-slate-100">
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Descripción</th>
                <th className="p-4 font-medium text-right">Ingreso</th>
                <th className="p-4 font-medium text-right">Gasto</th>
                <th className="p-4 font-medium text-right">Saldo</th>
                <th className="p-4 font-medium text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No hay movimientos registrados.</td>
                </tr>
              ) : (
                processedData.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-600">{formatDate(tx.date)}</td>
                    <td className="p-4 text-slate-800">{tx.description}</td>
                    <td className="p-4 text-right font-medium text-emerald-600">
                      {tx.type === 'ingreso' ? `+ ${formatCurrency(tx.amount)}` : '-'}
                    </td>
                    <td className="p-4 text-right font-medium text-rose-600">
                      {tx.type === 'gasto' ? `- ${formatCurrency(tx.amount)}` : '-'}
                    </td>
                    <td className={`p-4 text-right font-bold ${tx.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                      {formatCurrency(tx.balance)}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => onDelete(tx.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar movimiento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vista Mobile: Tarjetas */}
      <div className="md:hidden space-y-3">
        {processedData.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-500">
            No hay movimientos registrados.
          </div>
        ) : (
          processedData.map((tx) => (
            <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
              <div className="flex justify-between items-start border-b border-slate-50 pb-3">
                <div>
                  <h4 className="font-semibold text-slate-800">{tx.description}</h4>
                  <p className="text-xs text-slate-500">{formatDate(tx.date)}</p>
                </div>
                <button 
                  onClick={() => onDelete(tx.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Monto</p>
                  <p className={`text-sm font-bold ${tx.type === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-0.5">Saldo acumulado</p>
                  <p className={`text-sm font-bold ${tx.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                    {formatCurrency(tx.balance)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

// ==========================================
// VISTA 2: AGREGAR FUTUROS
// ==========================================
function AgregarFuturos({ onAdd }) {
  const [formData, setFormData] = useState({
    type: 'gasto',
    description: '',
    amount: '',
    date: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date) return;

    onAdd({
      type: formData.type,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date
    });

    // Reset form except type
    setFormData(prev => ({ ...prev, description: '', amount: '', date: '' }));
    
    // Feedback visual básico (podría ser un toast en una app real)
    alert('¡Movimiento agregado exitosamente!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 text-center md:text-left">
        <h2 className="text-2xl font-bold text-slate-800">Planificar Movimientos</h2>
        <p className="text-slate-500">Agrega ingresos o gastos que ocurrirán en el futuro.</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
        
        {/* Selector de Tipo */}
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'ingreso' })}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-lg font-medium transition-all ${
              formData.type === 'ingreso' 
                ? 'bg-white text-emerald-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowUpRight className="w-5 h-5" /> Ingreso
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, type: 'gasto' })}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-lg font-medium transition-all ${
              formData.type === 'gasto' 
                ? 'bg-white text-rose-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowDownRight className="w-5 h-5" /> Gasto
          </button>
        </div>

        {/* Campos del formulario */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <input 
              type="text" 
              required
              placeholder="Ej. Pago de tarjeta, Sueldo..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input 
                type="date" 
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors text-slate-700"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors flex justify-center items-center gap-2 mt-8"
        >
          <PlusCircle className="w-5 h-5" />
          Guardar Movimiento {formData.type === 'ingreso' ? 'de Ingreso' : 'de Gasto'}
        </button>
      </form>
    </div>
  );
}

// ==========================================
// VISTA 3: CALENDARIO MENSUAL
// ==========================================
function Calendario({ transactions }) {
  // Estado para el mes y año que estamos visualizando
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1)); // Febrero 2026 por defecto (meses van de 0-11)

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Obtener qué día de la semana empieza el mes (0 = Domingo, 1 = Lunes...)
    let firstDayIndex = new Date(year, month, 1).getDay();
    // Ajustar para que la semana empiece en Lunes (0 = Lunes, 6 = Domingo)
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // 1. Calcular el saldo inicial ANTES de este mes
    const firstDayOfMonth = new Date(year, month, 1);
    const initialBalance = transactions
      .filter(t => new Date(t.date + 'T00:00:00') < firstDayOfMonth)
      .reduce((sum, t) => sum + (t.type === 'ingreso' ? t.amount : -t.amount), 0);

    let runningBalance = initialBalance;
    const days = [];

    // Espacios vacíos al principio del calendario
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Llenar los días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      // Formatear fecha para comparar (YYYY-MM-DD)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Encontrar transacciones para este día
      const dayTxs = transactions.filter(t => t.date === dateStr);
      
      const dayIncome = dayTxs.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
      const dayExpense = dayTxs.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0);
      
      const netForDay = dayIncome - dayExpense;
      runningBalance += netForDay;

      days.push({
        day,
        dateStr,
        dayIncome,
        dayExpense,
        balance: runningBalance,
        txs: dayTxs
      });
    }

    return { days, initialBalance };
  }, [currentDate, transactions]);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Controles del calendario */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800 w-48 text-center capitalize">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button 
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="text-sm font-medium text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          Saldo al inicio del mes: <span className="text-slate-800">{formatCurrency(calendarData.initialBalance)}</span>
        </div>
      </header>

      {/* Grilla del Calendario */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Encabezado de días */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {weekDays.map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarData.days.map((dayData, index) => {
            if (!dayData) {
              return <div key={`empty-${index}`} className="min-h-[120px] bg-slate-50/50 border-r border-b border-slate-100 p-2"></div>;
            }

            const isToday = dayData.dateStr === new Date().toISOString().split('T')[0];
            const hasMovements = dayData.dayIncome > 0 || dayData.dayExpense > 0;

            return (
              <div 
                key={dayData.dateStr} 
                className={`min-h-[120px] border-r border-b border-slate-100 p-2 md:p-3 flex flex-col transition-colors ${isToday ? 'bg-emerald-50/30' : 'hover:bg-slate-50'}`}
              >
                {/* Número del día */}
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-600'}`}>
                    {dayData.day}
                  </span>
                  {hasMovements && (
                    <div className="flex gap-1">
                      {dayData.dayIncome > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                      {dayData.dayExpense > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>}
                    </div>
                  )}
                </div>

                {/* Resumen del día (Ingresos/Gastos) */}
                <div className="flex-1 flex flex-col gap-1 justify-center">
                  {dayData.dayIncome > 0 && (
                    <div className="text-[10px] md:text-xs font-semibold text-emerald-600 truncate bg-emerald-50 px-1 py-0.5 rounded">
                      +{formatCurrency(dayData.dayIncome)}
                    </div>
                  )}
                  {dayData.dayExpense > 0 && (
                    <div className="text-[10px] md:text-xs font-semibold text-rose-600 truncate bg-rose-50 px-1 py-0.5 rounded">
                      -{formatCurrency(dayData.dayExpense)}
                    </div>
                  )}
                </div>

                {/* Saldo acumulado al final del día */}
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className={`text-xs font-bold text-right truncate ${dayData.balance < 0 ? 'text-rose-600' : 'text-slate-700'}`} title="Saldo acumulado">
                    {formatCurrency(dayData.balance)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
