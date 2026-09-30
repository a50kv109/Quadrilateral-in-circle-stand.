/**
 * AAMGatewayPanel Component — SOL Command Pipeline & AI Agent Gateway
 * R2-05: Common Geometry Stand UI Shell
 */

import React from 'react';
import { Cpu, Terminal, ShieldAlert, ArrowRight } from 'lucide-react';
import { GeometryPresentationData } from '../projection/presentationModel';

interface AAMGatewayPanelProps {
  readonly presentation: GeometryPresentationData;
}

export const AAMGatewayPanel: React.FC<AAMGatewayPanelProps> = ({ presentation }) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 select-none text-xs space-y-4">
      {/* 1. Gateway Status Header */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-xs">
              ААМ Шлюз / SOL Agent Gateway
            </h2>
            <p className="text-[11px] text-slate-400">
              Операционный мост между агентами, верификацией и ядром состояния
            </p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-700/60 text-blue-300 font-mono text-[11px]">
          READY FOR R2-12
        </span>
      </div>

      {/* 2. Architectural Pipeline Banner */}
      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex flex-col gap-2">
        <span className="font-semibold text-slate-200">
          Принцип операционного взаимодействия (SOL Pipeline):
        </span>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300 overflow-x-auto py-1">
          <span className="px-2 py-1 bg-slate-900 rounded border border-slate-800">UI / Agent</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="px-2 py-1 bg-purple-950/80 rounded border border-purple-800 text-purple-300">
            SOL Gateway
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="px-2 py-1 bg-slate-900 rounded border border-slate-800">State Mutation</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="px-2 py-1 bg-emerald-950/80 rounded border border-emerald-800 text-emerald-300">
            Verification
          </span>
        </div>
      </div>

      {/* 3. Transaction Log Simulation */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 font-mono text-[11px]">
        <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 font-semibold text-slate-300 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span>Журнал транзакций ядра (State Transaction Stream)</span>
        </div>
        <div className="p-3 space-y-2 text-slate-400">
          <div className="flex items-start gap-2">
            <span className="text-slate-600">[00:00:01]</span>
            <span className="text-emerald-400">INIT_STATE:</span>
            <span>Created UniversalGeometryState (v1, CYCLIC, N=4)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-600">[00:00:01]</span>
            <span className="text-blue-400">TOPOLOGY_GUARD:</span>
            <span>Validation passed: status=VALID, winding=2π, gaps&gt;0.005</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-600">[ACTIVE]</span>
            <span className="text-purple-400">PROVENANCE:</span>
            <span className="text-slate-300">{presentation.provenance}</span>
          </div>
        </div>
      </div>

      {/* 4. Notice on Future Implementation */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-400">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Архитектурное разграничение:</strong> Полный операционный диспетчер SOL Gateway (R2-12), Relation Graph (R2-07) и Verification Core (R2-08) будут развёрнуты в последующих запланированных пакетах. Интерфейс готов к подключению их выходных потоков без переделки шаблона представления.
        </span>
      </div>
    </div>
  );
};
