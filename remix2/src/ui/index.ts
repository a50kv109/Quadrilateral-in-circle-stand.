/**
 * Remix 2 UI Namespace & Exports
 * R2-05: Common Geometry Stand UI Shell
 */

export const UI_NAMESPACE = "remix2.ui";

export { App } from './App';
export { WorkspaceSplitter } from './layout/WorkspaceSplitter';
export { HeaderBar } from './components/header/HeaderBar';
export { GeometryCanvas } from './canvas/GeometryCanvas';
export { CanvasControlRibbon } from './canvas/CanvasControlRibbon';
export { CanvasRotationBar } from './canvas/CanvasRotationBar';
export { SchoolToolbar } from './canvas/SchoolToolbar';
export { InformationPanel } from './panels/InformationPanel';
export { SummaryTablePanel } from './panels/SummaryTablePanel';
export { PassportPanel } from './panels/PassportPanel';
export { AAMGatewayPanel } from './panels/AAMGatewayPanel';
export { EducationPanel } from './panels/EducationPanel';
export { NumericAnglesModal } from './dialogs/NumericAnglesModal';
export { projectGeometryState } from './projection/presentationModel';
export { createDefaultQuadrilateralState, createPresetState } from './state/defaultState';
export * from './types/uiTypes';
export * from './types/auxiliaryTypes';
export * from './types/semanticCommands';
export * from './state/auxiliaryEngine';
export * from './state/commandDispatcher';
