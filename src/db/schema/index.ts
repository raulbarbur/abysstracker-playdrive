// src/db/schema/index.ts
// Central schema barrel — import from here, not from individual files.
// Import order follows dependency graph (no circular refs).

export * from './core';
export * from './identity';
export * from './catalog';
export * from './inventory';
export * from './treasury';
export * from './workshop';
export * from './production';
export * from './crm';
export * from './sales';