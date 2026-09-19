export { selectInstallation } from './core/select-installation.js';
export { EnvironmentSchema, SelectionPolicySchema } from './core/selection-contract.js';
export type { SelectionEnvironment, SelectionPolicy, SelectionResult, CandidateResult, ConditionResult } from './core/selection-contract.js';
export { ReleasePageManifestJsonSchema, validateReleasePageManifest } from './manifest/public-contract.js';
export type { ManifestValidationResult } from './manifest/public-contract.js';
