/**
 * Trilium API Client using openapi-fetch
 * 
 * This provides a type-safe client for the Trilium ETAPI.
 * Types are auto-generated from the OpenAPI specification.
 */

import createClient from 'openapi-fetch';
import type { paths, components } from './generated/trilium.js';

// Re-export common types for convenience
export type TriliumNote = components['schemas']['Note'];
export type TriliumBranch = components['schemas']['Branch'];
export type TriliumAttribute = components['schemas']['Attribute'];
export type TriliumAttachment = components['schemas']['Attachment'];
export type TriliumAppInfo = components['schemas']['AppInfo'];

// Export the paths type for advanced usage
export type { paths, components };

// Re-export mapper utilities
export {
  TriliumMapper,
  buildSearchQuery,
  transforms,
  type MappingConfig,
  type FieldMapping,
  type TransformFunction,
  type ComputedFunction,
  type TriliumSearchHelpers,
  type TriliumSearchConditions,
  type TriliumSearchLogical,
  type ComparisonOperator,
  type ConditionValue,
  type SearchValue,
} from './mapper.js';

export interface TriliumClientConfig {
  baseUrl: string;
  apiKey: string;
}

/**
 * Create a type-safe Trilium API client
 * 
 * @example
 * ```ts
 * const client = createTriliumClient({
 *   baseUrl: 'http://localhost:37840',
 *   apiKey: 'your-etapi-token'
 * });
 * 
 * // Get app info
 * const { data, error } = await client.GET('/app-info');
 * 
 * // Get a note by ID
 * const { data: note } = await client.GET('/notes/{noteId}', {
 *   params: { path: { noteId: 'root' } }
 * });
 * 
 * // Create a note
 * const { data: newNote } = await client.POST('/notes', {
 *   body: {
 *     parentNoteId: 'root',
 *     title: 'My Note',
 *     type: 'text',
 *     content: '<p>Hello World</p>'
 *   }
 * });
 * 
 * // Search notes
 * const { data: searchResults } = await client.GET('/notes', {
 *   params: { query: { search: '#blog' } }
 * });
 * ```
 */
export function createTriliumClient(config: TriliumClientConfig) {
  const baseUrl = config.baseUrl.endsWith('/') 
    ? config.baseUrl.slice(0, -1) 
    : config.baseUrl;

  return createClient<paths>({
    baseUrl: `${baseUrl}/etapi`,
    headers: {
      Authorization: config.apiKey,
    },
  });
}

// Default export for convenience
export default createTriliumClient;
