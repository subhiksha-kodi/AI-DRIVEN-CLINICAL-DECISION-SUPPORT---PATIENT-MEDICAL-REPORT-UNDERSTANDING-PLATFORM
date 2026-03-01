import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { Apple, Info, CheckCircle } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const DietChartTab = ({ dietData, language = 'en' }) => {
    if (!dietData || dietData.length === 0) {
        return (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <Apple className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="text-slate-500 font-medium">No diet data available for this analysis.</p>
            </div>
        );
    }

    // Custom Tooltip for Pie Chart
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 shadow-lg rounded-lg border border-slate-100">
                    <p className="font-bold text-slate-800">{data.item}</p>
                    <p className="text-xs text-slate-500">{data.value} {data.unit}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                {/* Pie Chart Visualization */}
                <div className="h-[300px] w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={dietData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="item"
                            >
                                {dietData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Introduction / Summary */}
                <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                        <h4 className="text-emerald-900 font-bold flex items-center gap-2 mb-2">
                            <Apple size={20} className="text-emerald-500" />
                            Your Personalized Diet Plan
                        </h4>
                        <p className="text-emerald-800 text-sm leading-relaxed">
                            Based on your clinical markers and medications, here are the most important dietary considerations for your recovery and long-term health. Follow these portions daily for optimal results.
                        </p>
                    </div>
                </div>
            </div>

            {/* Detailed Recommendations List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dietData.map((diet, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div
                            className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h5 className="font-bold text-slate-800">{diet.item}</h5>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    {diet.value} {diet.unit}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed mb-2">
                                {diet.reason}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold uppercase tracking-tighter bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
                                <CheckCircle size={10} />
                                Recommended Daily
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default DietChartTab;
