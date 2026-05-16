import React from 'react';
import { DreAlert } from '@/services/dre-alerts.service';
import { AlertTriangle, TrendingDown, Info, ShieldAlert } from 'lucide-react';

interface SmartAlertsProps {
  alerts: DreAlert[];
}

export function SmartAlerts({ alerts }: SmartAlertsProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="mb-8 space-y-3">
      {alerts.map((alert, idx) => {
        
        let bgColor = 'bg-slate-50';
        let borderColor = 'border-slate-200';
        let iconColor = 'text-slate-500';
        let Icon = Info;

        if (alert.type === 'danger') {
          bgColor = 'bg-rose-50/50';
          borderColor = 'border-rose-200';
          iconColor = 'text-rose-500';
          Icon = ShieldAlert;
        } else if (alert.type === 'warning') {
          bgColor = 'bg-amber-50/50';
          borderColor = 'border-amber-200';
          iconColor = 'text-amber-500';
          Icon = AlertTriangle;
        }

        if (alert.id === 'revenue-drop') Icon = TrendingDown;

        return (
          <div 
            key={idx} 
            className={`flex items-start gap-4 p-4 rounded-2xl border ${bgColor} ${borderColor} animate-in fade-in slide-in-from-top-4 duration-500`}
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <div className={`mt-0.5 ${iconColor}`}>
              <Icon size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className={`text-sm font-bold mb-0.5 ${alert.type === 'danger' ? 'text-rose-800' : alert.type === 'warning' ? 'text-amber-800' : 'text-slate-800'}`}>
                {alert.title}
              </h4>
              <p className={`text-sm ${alert.type === 'danger' ? 'text-rose-600/80' : alert.type === 'warning' ? 'text-amber-700/80' : 'text-slate-600'}`}>
                {alert.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
