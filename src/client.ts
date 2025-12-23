/**
 * Trilium API Client using openapi-fetch
 * 
 * This provides a type-safe client for the Trilium ETAPI.
 * Types are auto-generated from the OpenAPI specification.
 */

import createClient, { type Client } from 'openapi-fetch';
import type { paths, components } from './generated/trilium.js';
import { TriliumMapper, buildSearchQuery, type MappingConfig, type TriliumSearchHelpers } from './mapper.js';

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

export interface SearchAndMapOptions<T> {
  /** Search query - either a string or structured search helpers */
  query: string | TriliumSearchHelpers;
  /** Mapping configuration or TriliumMapper instance to transform notes to type T */
  mapping: MappingConfig<T> | TriliumMapper<T>;
  /** Optional: limit number of results */
  limit?: number;
  /** Optional: order by field (e.g., 'dateModified', 'title') */
  orderBy?: string;
  /** Optional: order direction */
  orderDirection?: 'asc' | 'desc';
  /** Optional: fast search mode (less accurate but faster) */
  fastSearch?: boolean;
}

/** Details about a note that failed to map */
export interface MappingFailure {
  /** The note ID that failed to map */
  noteId: string;
  /** The note title for easier identification */
  noteTitle: string;
  /** The error message explaining why mapping failed */
  reason: string;
  /** The original note object */
  note: TriliumNote;
}

export interface SearchAndMapResult<T> {
  /** Mapped results as typed objects */
  data: T[];
  /** Notes that failed to map (e.g., missing required fields) */
  failures: MappingFailure[];
}

/** Extended Trilium client with search and map helper */
export interface TriliumClient extends Client<paths> {
  /**
   * Search notes and automatically map results to typed objects.
   * Throws on API/network errors.
   * 
   * @see {@link https://triliumnext.github.io/Docs/Wiki/search.html} for Trilium search syntax
   * 
   * @example
   * ```ts
   * interface BlogPost {
   *   title: string;
   *   slug: string;
   *   published: boolean;
   * }
   * 
   * // Basic usage
   * const { data: posts, failures } = await client.searchAndMap<BlogPost>({
   *   query: { '#blog': true, '#published': true },
   *   mapping: {
   *     title: 'note.title',
   *     slug: '#slug',
   *     published: { from: '#published', transform: transforms.boolean, default: false },
   *   },
   *   limit: 10,
   *   orderBy: 'dateModified',
   *   orderDirection: 'desc',
   * });
   * 
   * if (failures.length > 0) {
   *   console.warn(`${failures.length} notes failed to map`);
   * }
   * ```
   */
  searchAndMap<T>(options: SearchAndMapOptions<T>): Promise<SearchAndMapResult<T>>;
}

/**
 * Create a type-safe Trilium API client
 * 
 * @example
 * ```ts
 * const client = createTriliumClient({
 *   baseUrl: 'http://localhost:8080',
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
 * 
 * // Search and map to typed objects
 * const { data: posts } = await client.searchAndMap<BlogPost>({
 *   query: { '#blog': true },
 *   mapping: {
 *     title: 'note.title',
 *     slug: '#slug',
 *   },
 * });
 * ```
 */
export function createTriliumClient(config: TriliumClientConfig): TriliumClient {
  const baseUrl = config.baseUrl.endsWith('/') 
    ? config.baseUrl.slice(0, -1) 
    : config.baseUrl;

  const client = createClient<paths>({
    baseUrl: `${baseUrl}/etapi`,
    headers: {
      Authorization: config.apiKey,
    },
  });

  // Add searchAndMap helper
  const searchAndMap = async <T>(options: SearchAndMapOptions<T>): Promise<SearchAndMapResult<T>> => {
    // Build the search query
    const searchQuery = typeof options.query === 'string' 
      ? options.query 
      : buildSearchQuery(options.query);
    
    // Build additional params
    const params: string[] = [];
    if (options.orderBy) {
      params.push(`orderBy:${options.orderBy}`);
      if (options.orderDirection) {
        params.push(options.orderDirection);
      }
    }
    if (options.limit) {
      params.push(`limit:${options.limit}`);
    }
    if (options.fastSearch) {
      params.push('fastSearch');
    }
    
    const fullQuery = params.length > 0
      ? `${searchQuery} ${params.join(' ')}`
      : searchQuery;

    const { data, error } = await client.GET('/notes', {
      params: { query: { search: fullQuery } },
    });

    if (error) {
      throw error;
    }
    if (!data?.results) {
      throw new Error('No results returned from search');
    }

    // Support both MappingConfig and TriliumMapper instance
    const mapper = options.mapping instanceof TriliumMapper
      ? options.mapping
      : new TriliumMapper<T>(options.mapping);
    
    // Map notes individually to track failures
    const mappedData: T[] = [];
    const failures: MappingFailure[] = [];

    for (const note of data.results) {
      try {
        const [mapped] = mapper.map([note]);
        if (mapped !== undefined) {
          mappedData.push(mapped);
        } else {
          failures.push({
            noteId: note.noteId ?? 'unknown',
            noteTitle: note.title ?? 'Untitled',
            reason: 'Mapping returned undefined',
            note,
          });
        }
      } catch (err) {
        failures.push({
          noteId: note.noteId ?? 'unknown',
          noteTitle: note.title ?? 'Untitled',
          reason: err instanceof Error ? err.message : String(err),
          note,
        });
      }
    }

    return { data: mappedData, failures };
  };

  return Object.assign(client, { searchAndMap }) as TriliumClient;
}

// Default export for convenience
export default createTriliumClient;
