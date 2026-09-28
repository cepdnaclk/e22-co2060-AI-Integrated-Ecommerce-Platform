import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminMobileNav from "../components/AdminMobileNav";
import { getCommissionPolicy, updateCommissionPolicy } from "../services/commissionService";

export default function AdminCommissionPolicy() {
    const navigate = useNavigate();
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [editMode, setEditMode] = useState(false);
    const [newRate, setNewRate] = useState("");

    const loadPolicy = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getCommissionPolicy();
            setPolicy(data.policy);
            setNewRate(data.policy?.rate?.toString() || "");
        } catch (err) {
            setError(err.message || "Failed to load commission policy");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolicy();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        
        const rateNum = Number(newRate);
        if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
            setError("Rate must be a number between 0 and 100.");
            return;
        }

        try {
            const result = await updateCommissionPolicy({ rate: rateNum });
            setSuccess(result.message || "Commission policy updated successfully");
            setPolicy(result.policy);
            setEditMode(false);
        } catch (err) {
            setError(err.message || "Failed to update commission policy");
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-20">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => navigate("/admin/dashboard")}
                        className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors"
                    >
                        ←
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                            Marketplace Commission Policy
                        </h1>
                        <p className="text-slate-400 text-sm">
                            Manage the platform-wide commission rate applied to all seller orders.
                        </p>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                        ⚠️ {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        ✅ {success}
                    </div>
                )}

                {/* Policy Card */}
                {loading ? (
                    <div className="text-center text-slate-400 py-12">Loading...</div>
                ) : (
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
                            
                            {/* Current Status Info */}
                            <div className="flex-grow space-y-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Active Policy Name</h3>
                                    <p className="text-lg font-medium">{policy?.name || "No Active Policy"}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Current Rate</h3>
                                        <p className="text-3xl font-black text-purple-400">
                                            {policy?.rate !== undefined ? `${policy.rate}%` : "N/A"}
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`w-3 h-3 rounded-full ${policy?.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                            <span className="font-bold">{policy?.isActive ? "Active" : "Inactive"}</span>
                                        </div>
                                    </div>
                                </div>
                                {policy?.effectiveFrom && (
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Effective Since</h3>
                                        <p className="text-slate-300">
                                            {new Date(policy.effectiveFrom).toLocaleString()}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Edit Section */}
                            <div className="w-full md:w-80 shrink-0">
                                {!editMode ? (
                                    <button 
                                        onClick={() => setEditMode(true)}
                                        className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 hover:opacity-90 transition-all"
                                    >
                                        Update Commission Rate
                                    </button>
                                ) : (
                                    <form onSubmit={handleUpdate} className="bg-slate-900 p-5 rounded-xl border border-slate-700 shadow-inner">
                                        <label className="block text-sm font-bold text-slate-300 mb-2">New Commission Rate (%)</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={newRate}
                                            onChange={(e) => setNewRate(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 mb-4"
                                            placeholder="e.g. 10"
                                            required
                                        />
                                        <div className="flex gap-2">
                                            <button 
                                                type="submit"
                                                className="flex-1 bg-emerald-600 text-white rounded-lg px-4 py-2 font-bold hover:bg-emerald-500 transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setEditMode(false);
                                                    setNewRate(policy?.rate?.toString() || "");
                                                }}
                                                className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-2 font-bold hover:bg-slate-600 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                )}
                                
                                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-200/80 leading-relaxed">
                                    <span className="font-bold text-yellow-400 block mb-1">Important:</span>
                                    Changing the rate applies only to new checkouts. Existing pending or confirmed orders will retain their snapshot commission rate.
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
            <AdminMobileNav />
        </div>
    );
}
