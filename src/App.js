import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Minus,
  PackageSearch,
  Plus,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

// ==========================================
// PASTE YOUR FIREBASE CONFIG HERE
// (Get this from Firebase Console in Step 1)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDe21WoXt8XIA388kKEwU_PF9b8vNAwMmY",
  authDomain: "team-housekeeping.firebaseapp.com",
  projectId: "team-housekeeping",
  storageBucket: "team-housekeeping.firebasestorage.app",
  messagingSenderId: "85076102822",
  appId: "1:85076102822:web:3a68a0c2e770aeee3bee67",
  measurementId: "G-5E6LNWB9BH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Constants & Configuration ---
const FLOORS = [1, 2, 3, 4, 5, 6, 7, 8];
const PANTRIES_PER_FLOOR = 3;
const DEFAULT_PAR = 20;

const CATALOG = [
  { id: "soap", name: "Bath Soap (25g)", category: "Toiletries" },
  { id: "shampoo", name: "Shampoo (50ml)", category: "Toiletries" },
  { id: "lotion", name: "Body Lotion", category: "Toiletries" },
  { id: "slippers", name: "Guest Slippers", category: "Room Comfort" },
  { id: "dental", name: "Dental Kit", category: "Amenities" },
  { id: "shaving", name: "Shaving Kit", category: "Amenities" },
  { id: "pen", name: "Notepad Pen", category: "Stationery" },
  { id: "laundry_bag", name: "Laundry Bags", category: "Room Comfort" },
  { id: "tea", name: "Green Tea Bags", category: "F&B" },
  { id: "coffee", name: "Coffee Sachets", category: "F&B" },
];

const PIN_CONFIG = { MANAGER: "8888", STAFF: "1234" };

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [appData, setAppData] = useState({ inventory: {}, logs: [] });
  const [isSyncing, setIsSyncing] = useState(false);

  // -- Initialize Auth & DB --
  useEffect(() => {
    signInAnonymously(auth).catch((error) =>
      console.error("Auth Error:", error)
    );
    const unsubscribe = onAuthStateChanged(auth, setAuthUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    // Use a clean, simple database path for production
    const docRef = doc(db, "hotel_data", "master_inventory");
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setAppData(snapshot.data());
        } else {
          setDoc(docRef, { inventory: {}, logs: [] });
        }
      },
      (error) => console.error("Sync error:", error)
    );

    return () => unsubscribe();
  }, [authUser]);

  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const saveToDatabase = async (newData) => {
    setAppData(newData); // Update UI immediately
    setIsSyncing(true);
    try {
      await setDoc(doc(db, "hotel_data", "master_inventory"), newData);
    } catch (e) {
      console.error("Save failed", e);
      alert("Error saving data. Please check connection.");
    }
    setIsSyncing(false);
  };

  if (showSplash) return <SplashScreen />;
  if (!userProfile) return <LoginScreen onLogin={setUserProfile} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar
        userProfile={userProfile}
        onLogout={() => setUserProfile(null)}
        isSyncing={isSyncing}
      />
      <main className="max-w-5xl mx-auto px-4 py-6">
        {userProfile.role === "manager" ? (
          <ManagerDashboard appData={appData} />
        ) : (
          <StaffView
            appData={appData}
            onSave={saveToDatabase}
            userName={userProfile.name}
          />
        )}
      </main>
    </div>
  );
}

// ==========================================
// SPLASH SCREEN
// ==========================================
function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="relative w-full max-w-md px-8 aspect-[3/4] flex items-center justify-center animate-in zoom-in-95 duration-1000">
        <img
          src="THK.png"
          alt="Team Housekeeping Splash"
          className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-2xl opacity-80"
          onError={(e) => (e.target.style.display = "none")}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent rounded-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center mt-auto pb-12">
          <Building2 size={48} className="text-amber-400 mb-4 animate-pulse" />
          <h1 className="text-4xl font-serif font-bold text-white tracking-wide shadow-black drop-shadow-lg">
            TEAM
            <br />
            HOUSEKEEPING
          </h1>
          <div className="mt-8 flex gap-2 items-center text-amber-200/80 text-sm font-medium tracking-widest uppercase">
            <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            Initializing System
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// LOGIN SCREEN
// ==========================================
function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (pin === PIN_CONFIG.MANAGER)
      onLogin({ name: name.trim(), role: "manager" });
    else if (pin === PIN_CONFIG.STAFF)
      onLogin({ name: name.trim(), role: "staff" });
    else setError("Invalid Access PIN. Please try again.");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 p-8 text-center">
          <ShieldCheck size={48} className="text-indigo-200 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white">Housekeeping Portal</h2>
          <p className="text-indigo-200 mt-2 text-sm">
            Sign in to access your assigned tasks
          </p>
        </div>
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Access PIN
            </label>
            <input
              type="password"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none transition-all text-center tracking-[0.5em] font-mono text-lg"
              placeholder="••••"
              maxLength={4}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-md active:scale-[0.98]"
          >
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// NAVBAR
// ==========================================
function Navbar({ userProfile, onLogout, isSyncing }) {
  return (
    <header className="bg-indigo-700 text-white shadow-md sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={24} className="text-indigo-200" />
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">
            Team Housekeeping
          </h1>
          <h1 className="text-xl font-bold tracking-tight sm:hidden">THK</h1>
          {isSyncing && (
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse ml-2" />
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">
              {userProfile.name}
            </p>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                userProfile.role === "manager"
                  ? "bg-amber-400 text-amber-900"
                  : "bg-indigo-500 text-indigo-50"
              }`}
            >
              {userProfile.role}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 hover:bg-indigo-600 rounded-lg transition-colors border border-indigo-500 text-indigo-100 hover:text-white"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

// ==========================================
// STAFF VIEW
// ==========================================
function StaffView({ appData, onSave, userName }) {
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [selectedPantry, setSelectedPantry] = useState(1);
  const [localCounts, setLocalCounts] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const prefix = `f${selectedFloor}_p${selectedPantry}_`;
    const loadedCounts = {};
    CATALOG.forEach((item) => {
      loadedCounts[item.id] = appData.inventory[prefix + item.id] ?? 0;
    });
    setLocalCounts(loadedCounts);
    setHasChanges(false);
  }, [selectedFloor, selectedPantry, appData.inventory]);

  const updateCount = (itemId, val) => {
    let newVal = parseInt(val) || 0;
    if (newVal < 0) newVal = 0;
    setLocalCounts((prev) => ({ ...prev, [itemId]: newVal }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const prefix = `f${selectedFloor}_p${selectedPantry}_`;
    const newInventory = { ...appData.inventory };
    CATALOG.forEach((item) => {
      newInventory[prefix + item.id] = localCounts[item.id];
    });

    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      user: userName,
      floor: selectedFloor,
      pantry: selectedPantry,
      action: "Updated Inventory",
    };
    const newLogs = [logEntry, ...(appData.logs || [])].slice(0, 30);

    onSave({ inventory: newInventory, logs: newLogs });
    setHasChanges(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Location
          </label>
          <div className="flex gap-2">
            <select
              value={selectedFloor}
              onChange={(e) => setSelectedFloor(Number(e.target.value))}
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3 outline-none"
            >
              {FLOORS.map((f) => (
                <option key={f} value={f}>
                  Floor {f}
                </option>
              ))}
            </select>
            <select
              value={selectedPantry}
              onChange={(e) => setSelectedPantry(Number(e.target.value))}
              className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl p-3 outline-none"
            >
              {[1, 2, 3].map((p) => (
                <option key={p} value={p}>
                  Pantry {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-end">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all ${
              hasChanges
                ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            Save Counts
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <div className="col-span-6 sm:col-span-7">Item Name</div>
          <div className="col-span-2 hidden sm:block text-center">Par</div>
          <div className="col-span-6 sm:col-span-3 text-center">Count</div>
        </div>
        <div className="divide-y divide-slate-100">
          {CATALOG.map((item) => {
            const count = localCounts[item.id] ?? 0;
            const variance = count - DEFAULT_PAR;
            return (
              <div
                key={item.id}
                className="p-4 grid grid-cols-12 gap-2 items-center"
              >
                <div className="col-span-6 sm:col-span-7">
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                  <div className="sm:hidden mt-1">
                    <span
                      className={`text-xs font-bold ${
                        variance < 0 ? "text-red-500" : "text-green-600"
                      }`}
                    >
                      Var: {variance > 0 ? "+" : ""}
                      {variance}
                    </span>
                  </div>
                </div>
                <div className="col-span-2 hidden sm:block text-center font-medium text-slate-500">
                  {DEFAULT_PAR}
                </div>
                <div className="col-span-6 sm:col-span-3 flex justify-end sm:justify-center">
                  <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <button
                      onClick={() => updateCount(item.id, count - 1)}
                      className="p-1.5 sm:p-2 bg-white rounded shadow-sm text-slate-600 hover:text-red-600"
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={count}
                      onChange={(e) => updateCount(item.id, e.target.value)}
                      className="w-10 sm:w-12 text-center font-bold text-lg bg-transparent border-none p-0 outline-none"
                      style={{ appearance: "textfield" }}
                    />
                    <button
                      onClick={() => updateCount(item.id, count + 1)}
                      className="p-1.5 sm:p-2 bg-white rounded shadow-sm text-slate-600 hover:text-green-600"
                    >
                      <Plus size={16} />
                    </button>
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

// ==========================================
// MANAGER DASHBOARD
// ==========================================
function ManagerDashboard({ appData }) {
  const inventoryMap = appData.inventory || {};
  const logs = appData.logs || [];

  const globalTotals = useMemo(() => {
    const totals = {};
    CATALOG.forEach((item) => (totals[item.id] = 0));
    Object.entries(inventoryMap).forEach(([key, count]) => {
      const itemId = key.split("_")[2];
      if (totals[itemId] !== undefined) totals[itemId] += count;
    });
    return totals;
  }, [inventoryMap]);

  const lowStockAlerts = useMemo(() => {
    const alerts = [];
    FLOORS.forEach((floor) => {
      [1, 2, 3].forEach((pantry) => {
        CATALOG.forEach((item) => {
          const count = inventoryMap[`f${floor}_p${pantry}_${item.id}`] ?? 0;
          if (count < DEFAULT_PAR)
            alerts.push({
              floor,
              pantry,
              item: item.name,
              count,
              shortfall: DEFAULT_PAR - count,
            });
        });
      });
    });
    return alerts.sort((a, b) => b.shortfall - a.shortfall);
  }, [inventoryMap]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Tracked</p>
            <p className="text-2xl font-bold text-slate-900">
              {CATALOG.length * 24}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-red-100 text-red-600 p-3 rounded-xl">
            <PackageSearch size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Deficit Areas</p>
            <p className="text-2xl font-bold text-slate-900">
              {lowStockAlerts.length}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="bg-green-100 text-green-600 p-3 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Par Status</p>
            <p className="text-2xl font-bold text-slate-900">
              {Math.max(
                0,
                100 -
                  Math.round(
                    (lowStockAlerts.length / (CATALOG.length * 24)) * 100
                  )
              )}
              %
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <LayoutDashboard size={18} /> Hotel-Wide Totals
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {CATALOG.map((item) => {
              const total = globalTotals[item.id];
              const required = 24 * DEFAULT_PAR;
              const percent = Math.min(
                100,
                Math.max(0, (total / required) * 100)
              );
              return (
                <div
                  key={item.id}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100"
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-semibold text-slate-800">
                      {item.name}
                    </span>
                    <span className="font-bold text-slate-600">
                      {total}{" "}
                      <span className="text-xs font-normal">/ {required}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        percent < 50
                          ? "bg-red-500"
                          : percent < 80
                          ? "bg-amber-400"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 flex flex-col h-[280px]">
            <div className="p-4 border-b border-red-100 bg-red-50">
              <h3 className="font-bold text-red-800">Urgent Deficits</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-0">
              {lowStockAlerts.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  All pantries are at par!
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-slate-100">
                    {lowStockAlerts.slice(0, 50).map((alert, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-600">
                          F{alert.floor} - P{alert.pantry}
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {alert.item}
                        </td>
                        <td className="px-4 py-3 text-right text-red-600 font-bold">
                          {alert.count}{" "}
                          <span className="text-xs font-normal">
                            (-{alert.shortfall})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[196px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} /> Activity Log
              </h3>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {logs.length === 0 ? (
                <div className="text-center text-slate-500 pt-4">
                  No activity yet.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 text-sm border-l-2 border-indigo-500 pl-3"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{log.user}</p>
                      <p className="text-slate-600">
                        Updated F{log.floor}, P{log.pantry}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
