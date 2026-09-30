/**
 * InformationPanel Component — Host for Summary, Passport, Gateway & Education Tabs
 * R2-05: Common Geometry Stand UI Shell
 */

import React from 'react';
import { Table, ShieldCheck, Cpu, GraduationCap, FlaskConical } from 'lucide-react';
import { ActiveTab, UIState } from '../types/uiTypes';
import { GeometryPresentationData } from '../projection/presentationModel';
import { AuxiliaryState } from '../types/auxiliaryTypes';
import { GeometryResearchRow } from '../../research/index';
import { SummaryTablePanel } from './SummaryTablePanel';
import { PassportPanel } from './PassportPanel';
import { AAMGatewayPanel } from './AAMGatewayPanel';
import { EducationPanel } from './EducationPanel';
import { GeometryResearchTable } from './GeometryResearchTable';

interface InformationPanelProps {
  readonly uiState: UIState;
  readonly presentation: GeometryPresentationData;
  readonly auxiliaryState?: AuxiliaryState;
  readonly researchRows?: readonly GeometryResearchRow[];
  readonly activeStateVersion?: number;
  readonly onTabChange: (tab: ActiveTab) => void;
  readonly onOpenNumericModal: () => void;
  readonly onClearSelection?: () => void;
  readonly onSelectRowSnapshot?: (stateVersion: number) => void;
}

export const InformationPanel: React.FC<InformationPanelProps> = ({
  uiState,
  presentation,
  auxiliaryState,
  researchRows = [],
  activeStateVersion,
  onTabChange,
  onOpenNumericModal,
  onClearSelection,
  onSelectRowSnapshot
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 select-none overflow-hidden">
      {/* 1. Tab Bar Navigation */}
      <div className="h-11 bg-slate-950/80 border-b border-slate-800 px-3 flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => onTabChange('summary')}
            className={`px-3 py-1.5 rounded-t-md font-medium flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
              uiState.activeTab === 'summary'
                ? 'bg-slate-900 text-purple-300 border-purple-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Сводка</span>
          </button>

          <button
            onClick={() => onTabChange('research')}
            className={`px-3 py-1.5 rounded-t-md font-medium flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
              uiState.activeTab === 'research'
                ? 'bg-slate-900 text-purple-300 border-purple-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Исследование</span>
          </button>

          <button
            onClick={() => onTabChange('passport')}
            className={`px-3 py-1.5 rounded-t-md font-medium flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
              uiState.activeTab === 'passport'
                ? 'bg-slate-900 text-purple-300 border-purple-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Паспорт</span>
          </button>

          <button
            onClick={() => onTabChange('gateway')}
            className={`px-3 py-1.5 rounded-t-md font-medium flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
              uiState.activeTab === 'gateway'
                ? 'bg-slate-900 text-purple-300 border-purple-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>ААМ Шлюз</span>
          </button>

          <button
            onClick={() => onTabChange('education')}
            className={`px-3 py-1.5 rounded-t-md font-medium flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
              uiState.activeTab === 'education'
                ? 'bg-slate-900 text-purple-300 border-purple-500 font-semibold'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/50'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Обучение</span>
          </button>
        </div>

        {/* Small scale indicator on top right */}
        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono hidden xl:inline-block whitespace-nowrap">
          1 px = 1 мм
        </span>
      </div>

      {/* 2. Active Tab Content Area */}
      <div className="flex-1 overflow-hidden bg-slate-900/50">
        {uiState.activeTab === 'summary' && (
          <SummaryTablePanel
            presentation={presentation}
            auxiliaryState={auxiliaryState}
            onOpenNumericModal={onOpenNumericModal}
            onClearSelection={onClearSelection}
          />
        )}
        {uiState.activeTab === 'research' && (
          <GeometryResearchTable
            rows={researchRows}
            activeStateVersion={activeStateVersion}
            onSelectRowSnapshot={onSelectRowSnapshot}
          />
        )}
        {uiState.activeTab === 'passport' && (
          <PassportPanel presentation={presentation} />
        )}
        {uiState.activeTab === 'gateway' && (
          <AAMGatewayPanel presentation={presentation} />
        )}
        {uiState.activeTab === 'education' && (
          <EducationPanel presentation={presentation} />
        )}
      </div>
    </div>
  );
};
