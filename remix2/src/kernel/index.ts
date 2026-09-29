/**
 * Remix 2 Kernel Namespace
 * Holds state management, domain profiles, topology checking, analytics, DAG and verification core.
 */

export const KERNEL_NAMESPACE = "remix2.kernel";

export * from './state/geometryState';
export * from './topology/topologyGuard';
export * from '../types/geometry';
