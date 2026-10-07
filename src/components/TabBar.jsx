import { PieChart, Wallet, TrendingUp, ArrowDownCircle, Calendar } from 'lucide-react';

export const TabBar = ({ activeTab, onChange }) => (
    <div className="grid grid-cols-5 gap-[10px] mb-5 bg-[#1f1f21] p-1.5 rounded-[6px] border border-white/[0.03]">
      {[{ id: 'overview', icon: PieChart, label: '總覽' }, { id: 'cash', icon: Wallet, label: '現金' }, { id: 'stocks', icon: TrendingUp, label: '股票' }, { id: 'debts', icon: ArrowDownCircle, label: '負債' }, { id: 'expenses', icon: Calendar, label: '支出' }].map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={`flex flex-col items-center justify-center py-4 rounded-[6px] transition-all gap-2 border ${activeTab === tab.id ? 'bg-[#506384] text-white border-[#506384] shadow-lg' : 'bg-transparent text-[#4b5563] border-transparent'}`}>
          <tab.icon size={18} /><span className="font-sans text-[15px] font-black tracking-tighter uppercase">{tab.label}</span>
        </button>
      ))}
    </div>
);
