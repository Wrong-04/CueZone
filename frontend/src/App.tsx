import React from 'react';
import { Routes, Route } from 'react-router-dom';

const App = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#D96B27] mb-4">CueZone Billiards Management</h1>
        <p className="text-lg text-slate-300">Hệ thống quản lý CLB Billiards & Giải đấu Bank Pool</p>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="p-4 border border-[#1B365D] rounded-lg">
            <h2 className="text-xl font-semibold mb-2">POS Portal</h2>
            <p className="text-sm text-slate-400">Giao diện Thu ngân (Web POS)</p>
          </div>
          <div className="p-4 border border-[#1B365D] rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Customer Portal</h2>
            <p className="text-sm text-slate-400">Cổng thông tin Khách hàng</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
