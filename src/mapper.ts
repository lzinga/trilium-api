/**
 * Trilium Note Mapper and Search Query Builder
 * 
 * Provides utilities for mapping Trilium notes to strongly-typed objects
 * and building type-safe search queries.
 */

import type { TriliumNote } from './client.js';

// ============================================================================
// Search Query Builder Types
// ============================================================================

/**
 * Comparison operators for search conditions
 */
export type ComparisonOperator = '=' | '!=' | '<' | '<=' | '>' | '>=' | '*=' | '=*' | '*=*';

/**
 * A value with an optional comparison operator
 */
export interface ConditionValue<T = string | number | boolean> {
  value: T;
  operator?: ComparisonOperator;
}

/**
 * Simple value or condition with operator
 */
export type SearchValue = string | number | boolean | ConditionValue;

/**
 * Base search conditions for labels, relations, and note properties.
 * Use template literal keys for labels (#) and relations (~).
 * Regular string keys are treated as note properties.
 */
export type TriliumSearchConditions = {
  /** Labels: use #labelName as key */
  [key: `#${string}`]: SearchValue | undefined;
} & {
  /** Relations: use ~relationName as key */
  [key: `~${string}`]: SearchValue | undefined;
} & {
  /** Note properties: use note.property as key or just property name */
  [key: string]: SearchValue | undefined;
};

/**
 * Logical operators for combining search conditions
 */
export interface TriliumSearchLogical {
  /** Combine multiple conditions with AND */
  AND?: TriliumSearchHelpers[];
  /** Combine multiple conditions with OR */
  OR?: TriliumSearchHelpers[];
  /** Negate a condition */
  NOT?: TriliumSearchHelpers;
}

/**
 * Complete search helpers combining conditions and logical operators.
 * Can contain field conditions AND/OR logical operators.
 */
export type TriliumSearchHelpers = 
  | TriliumSearchLogical
  | (TriliumSearchConditions & Partial<TriliumSearchLogical>);

/**
 * Builds a Trilium search query string from a structured helper object
 * 
 * @param helpers - The search conditions and logical operators
 * @returns A properly formatted Trilium search query string
 * 
 * @example
 * // Simple label search
 * buildSearchQuery({ '#blog': true })
 * // => '#blog'
 * 
 * @example
 * // Label with value
 * buildSearchQuery({ '#status': 'published' })
 * // => "#status = 'published'"
 * 
 * @example
 * // Complex AND/OR conditions
 * buildSearchQuery({
 *   AND: [
 *     { '#blog': true },
 *     { OR: [
 *       { '#status': 'published' },
 *       { '#status': 'featured' }
 *     ]}
 *   ]
 * })
 * // => "#blog AND (#status = 'published' OR #status = 'featured')"
 * 
 * @example
 * // Note properties with operators
 * buildSearchQuery({
 *   'note.type': 'text',
 *   '#wordCount': { value: 1000, operator: '>=' }
 * })
 * // => "note.type = 'text' AND #wordCount >= 1000"
 */
export function buildSearchQuery(helpers: TriliumSearchHelpers): string {
  // Handle logical operators
  if ('AND' in helpers && Array.isArray(helpers.AND)) {
    return helpers.AND.map((h) => {
      const query = buildSearchQuery(h);
      // Wrap in parentheses if it contains OR
      return query.includes(' OR ') ? `(${query})` : query;
    }).join(' AND ');
  }

  if ('OR' in helpers && Array.isArray(helpers.OR)) {
    return helpers.OR.map((h) => {
      const query = buildSearchQuery(h);
      // Wrap in parentheses if it contains AND or OR
      return query.includes(' AND ') || query.includes(' OR ') ? `(${query})` : query;
    }).join(' OR ');
  }

  if ('NOT' in helpers && helpers.NOT !== undefined) {
    const notValue = helpers.NOT;
    // Type guard: check if it's a valid TriliumSearchHelpers object
    if (typeof notValue === 'object' && notValue !== null && !('value' in notValue)) {
      const query = buildSearchQuery(notValue);
      return `not(${query})`;
    }
    // If it's a simple value, this shouldn't happen in valid usage
    throw new Error('NOT operator requires a query object, not a simple value');
  }

  // Build individual conditions from TriliumSearchConditions
  const parts: string[] = [];

  for (const [key, value] of Object.entries(helpers)) {
    if (value === undefined || value === null) continue;

    // Handle labels (#)
    if (key.startsWith('#')) {
      const labelName = key.slice(1);

      // Check if it's a nested property like #template.title
      if (labelName.includes('.')) {
        // For nested properties, use the full key as-is
        if (typeof value === 'object' && 'value' in value) {
          const operator = value.operator || '=';
          const val = typeof value.value === 'string' ? `'${value.value}'` : value.value;
          parts.push(`${key} ${operator} ${val}`);
        } else if (typeof value === 'string') {
          parts.push(`${key} = '${value}'`);
        } else {
          parts.push(`${key} = ${value}`);
        }
      } else {
        // Simple label
        if (value === true) {
          parts.push(`#${labelName}`);
        } else if (value === false) {
          parts.push(`#!${labelName}`);
        } else if (typeof value === 'object' && 'value' in value) {
          const operator = value.operator || '=';
          const val = typeof value.value === 'string' ? `'${value.value}'` : value.value;
          parts.push(`#${labelName} ${operator} ${val}`);
        } else if (typeof value === 'string') {
          parts.push(`#${labelName} = '${value}'`);
        } else {
          parts.push(`#${labelName} = ${value}`);
        }
      }
    }
    // Handle relations (~)
    else if (key.startsWith('~')) {
      const relationName = key.slice(1);

      // Check if it's a nested property like ~author.title
      if (relationName.includes('.')) {
        // For nested properties, use the full key as-is
        if (typeof value === 'object' && 'value' in value) {
          const operator = value.operator || '=';
          const val = typeof value.value === 'string' ? `'${value.value}'` : value.value;
          parts.push(`${key} ${operator} ${val}`);
        } else if (typeof value === 'string') {
          parts.push(`${key} = '${value}'`);
        } else {
          parts.push(`${key} = ${value}`);
        }
      } else {
        // Simple relation - default to title search with contains
        if (typeof value === 'object' && 'value' in value) {
          const operator = value.operator || '*=*';
          const val = typeof value.value === 'string' ? `'${value.value}'` : value.value;
          parts.push(`${key} ${operator} ${val}`);
        } else if (typeof value === 'string') {
          parts.push(`${key} *=* '${value}'`);
        }
      }
    }
    // Handle note properties
    else {
      const path = key.startsWith('note.') ? key : `note.${key}`;

      if (typeof value === 'object' && 'value' in value) {
        const operator = value.operator || '=';
        const val = typeof value.value === 'string' ? `'${value.value}'` : value.value;
        parts.push(`${path} ${operator} ${val}`);
      } else if (typeof value === 'string') {
        parts.push(`${path} = '${value}'`);
      } else if (typeof value === 'boolean') {
        parts.push(`${path} = ${value}`);
      } else {
        parts.push(`${path} = ${value}`);
      }
    }
  }

  return parts.join(' AND ');
}

// ============================================================================
// Mapper Types
// ============================================================================

/**
 * Transform function that converts a raw value into the target type
 * @template T - The target object type
 * @template K - The specific key in the target type
 * @template V - The input value type (defaults to unknown for flexibility)
 */
export type TransformFunction<T, K extends keyof T, V = unknown> = (value: V, note: TriliumNote) => T[K] | undefined;

/**
 * Computed function that calculates a value from the partially mapped object
 * @template T - The target object type
 * @template K - The specific key in the target type
 */
export type ComputedFunction<T, K extends keyof T> = (partial: Partial<T>, note: TriliumNote) => T[K] | undefined;

/**
 * Field mapping configuration for a single property
 * Can be a simple string path, a detailed configuration object, or a computed value
 * 
 * @template T - The target object type
 * @template K - The specific key in the target type
 * 
 * @example
 * // Shorthand string path
 * title: 'note.title'
 * 
 * @example
 * // Full configuration
 * tags: {
 *   from: '#tags',
 *   transform: transforms.commaSeparated,
 *   default: [],
 *   required: false
 * }
 * 
 * @example
 * // Computed value
 * readTimeMinutes: {
 *   computed: (partial) => Math.ceil((partial.wordCount || 0) / 200)
 * }
 */
export type FieldMapping<T, K extends keyof T = keyof T> =
  | string // Shorthand: direct path like 'note.title' or '#label'
  | {
      /** Source path (string) or extractor function */
      from: string | ((note: TriliumNote) => unknown);
      /** Optional transform function to convert the raw value - accepts any input type */
      transform?: (value: any, note: TriliumNote) => T[K] | undefined;
      /** Default value if extraction returns undefined */
      default?: T[K];
      /** Whether this field is required (throws if missing) */
      required?: boolean;
    }
  | {
      /** Computed function that calculates value from other mapped fields */
      computed: ComputedFunction<T, K>;
      /** Default value if computed returns undefined */
      default?: T[K];
    };

/**
 * Complete mapping configuration for a type
 * Maps each property key to its field mapping configuration
 * 
 * @template T - The target object type to map to
 */
export type MappingConfig<T> = {
  [K in keyof T]?: FieldMapping<T, K>;
};

/**
 * Maps Trilium notes to strongly-typed objects using declarative field mappings
 * 
 * Supports:
 * - Direct property paths (note.title, note.noteId)
 * - Label attributes (#labelName)
 * - Relation attributes (~relationName)
 * - Custom extractor functions
 * - Transform functions
 * - Computed values from other fields
 * - Default values
 * - Required field validation
 * 
 * @template T - The target type to map notes to
 * 
 * @example
 * const mapper = new TriliumMapper<BlogPost>({
 *   title: 'note.title',
 *   slug: { from: '#slug', required: true },
 *   wordCount: { from: '#wordCount', transform: transforms.number, default: 0 },
 *   readTimeMinutes: {
 *     computed: (partial) => Math.ceil((partial.wordCount || 0) / 200)
 *   }
 * });
 * 
 * const posts = mapper.map(notes);
 */
export class TriliumMapper<T> {
  /** The mapping configuration for this mapper */
  readonly config: MappingConfig<T>;

  /**
   * Creates a new TriliumMapper instance
   * @param config - The mapping configuration defining how to map note fields to the target type
   */
  constructor(config: MappingConfig<T>) {
    this.config = config;
  }

  /**
   * Merges multiple mapping configurations into a single configuration
   * Later configs override earlier ones for the same keys
   * Supports merging configs from base types into derived types
   * 
   * @template T - The target type for the merged configuration
   * @param configs - One or more mapping configurations to merge
   * @returns A new merged mapping configuration
   * 
   * @example
   * const merged = TriliumMapper.merge<BlogPost>(
   *   StandardNoteMapping,
   *   BlogSpecificMapping,
   *   OverrideMapping
   * );
   */
  static merge<T>(...configs: (Partial<MappingConfig<T>> | MappingConfig<unknown>)[]): MappingConfig<T> {
    return Object.assign({}, ...configs) as MappingConfig<T>;
  }

  /**
   * Maps a single note to the target type
   * @param note - The Trilium note to map
   * @returns The mapped object of type T
   */
  map(note: TriliumNote): T;

  /**
   * Maps an array of notes to the target type
   * @param notes - The Trilium notes to map
   * @returns An array of mapped objects of type T
   */
  map(notes: TriliumNote[]): T[];

  /**
   * Maps one or more Trilium notes to the target type
   * @param noteOrNotes - A single note or array of notes to map
   * @returns A single mapped object or array of mapped objects
   */
  map(noteOrNotes: TriliumNote | TriliumNote[]): T | T[] {
    return Array.isArray(noteOrNotes) ? noteOrNotes.map((note) => this.mapSingle(note)) : this.mapSingle(noteOrNotes);
  }

  /**
   * Maps a single note to the target type using the configured field mappings
   * Processes in two passes: first regular fields, then computed fields
   * @param note - The Trilium note to map
   * @returns The mapped object
   * @throws Error if a required field is missing
   * @private
   */
  private mapSingle(note: TriliumNote): T {
    const result = {} as Record<keyof T, unknown>;
    const computedFields: [keyof T, { computed: ComputedFunction<T, keyof T>; default?: T[keyof T] }][] = [];

    // First pass: process regular fields
    for (const [key, fieldMapping] of Object.entries(this.config) as [keyof T, FieldMapping<T>][]) {
      if (!fieldMapping) continue;

      // Check if it's a computed field
      if (typeof fieldMapping === 'object' && 'computed' in fieldMapping) {
        computedFields.push([key, fieldMapping]);
        continue;
      }

      // Normalize shorthand to full mapping
      const mapping = typeof fieldMapping === 'string' ? { from: fieldMapping } : fieldMapping;

      // Extract value
      let value: unknown = typeof mapping.from === 'function' ? mapping.from(note) : this.extractValue(note, mapping.from);

      // Transform
      if (mapping.transform) {
        value = mapping.transform(value, note);
      }

      // Default
      if (value === undefined && mapping.default !== undefined) {
        value = mapping.default;
      }

      // Validate required
      if (mapping.required && value === undefined) {
        throw new Error(`Required field '${String(key)}' missing from note ${note.noteId} (${note.title})`);
      }

      result[key] = value;
    }

    // Second pass: process computed fields
    for (const [key, mapping] of computedFields) {
      let value = mapping.computed(result as Partial<T>, note);

      // Default
      if (value === undefined && mapping.default !== undefined) {
        value = mapping.default;
      }

      result[key] = value;
    }

    return result as T;
  }

  /**
   * Extracts a value from a note using a string path
   * 
   * Supports:
   * - Label attributes: #labelName
   * - Relation attributes: ~relationName
   * - Note properties: note.property.path
   * 
   * @param note - The Trilium note to extract from
   * @param path - The path string indicating where to extract the value
   * @returns The extracted value or undefined if not found
   * @private
   * 
   * @example
   * extractValue(note, 'note.title') // => note.title
   * extractValue(note, '#slug')      // => label attribute 'slug'
   * extractValue(note, '~template')  // => relation attribute 'template'
   */
  private extractValue(note: TriliumNote, path: string): unknown {
    if (!path) return undefined;

    // Label attribute: #labelName
    if (path.startsWith('#')) {
      return note.attributes?.find((attr) => attr.type === 'label' && attr.name === path.slice(1))?.value;
    }

    // Relation attribute: ~relationName
    if (path.startsWith('~')) {
      return note.attributes?.find((attr) => attr.type === 'relation' && attr.name === path.slice(1))?.value;
    }

    // Note property: note.property.path
    if (path.startsWith('note.')) {
      return path.slice(5).split('.').reduce((obj, key) => (obj as Record<string, unknown>)?.[key], note as unknown);
    }

    return undefined;
  }
}

// ============================================================================
// Common Transform Functions
// ============================================================================

/**
 * Common transform functions for use with TriliumMapper
 */
export const transforms = {
  /** Convert to number */
  number: (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  },

  /** Convert to boolean */
  boolean: (value: unknown): boolean | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
    }
    return undefined;
  },

  /** Split comma-separated string into array */
  commaSeparated: (value: unknown): string[] | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return undefined;
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  },

  /** Parse JSON string */
  json: <T>(value: unknown): T | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') return undefined;
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  },

  /** Parse date string */
  date: (value: unknown): Date | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const date = new Date(String(value));
    return isNaN(date.getTime()) ? undefined : date;
  },

  /** Trim whitespace from string */
  trim: (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    return String(value).trim() || undefined;
  },
};

// ============================================================================
// Standard Note Type and Mapping
// ============================================================================

/**
 * Standard note fields that all mapped types must include.
 * Extend this interface when creating your own mapped types.
 * 
 * @example
 * ```ts
 * interface BlogPost extends StandardNote {
 *   slug: string;
 *   published: boolean;
 * }
 * ```
 */
export interface StandardNote {
  /** The unique note ID */
  id: string;
  /** The note title */
  title: string;
  /** UTC date when the note was created */
  dateCreatedUtc: Date;
  /** UTC date when the note was last modified */
  dateLastModifiedUtc: Date;
}

/**
 * Standard mapping configuration for StandardNote fields.
 * Use with TriliumMapper.merge() to create mappings for types extending StandardNote.
 * 
 * @example
 * ```ts
 * interface BlogPost extends StandardNote {
 *   slug: string;
 *   published: boolean;
 * }
 * 
 * const blogMapping = TriliumMapper.merge<BlogPost>(
 *   StandardNoteMapping,
 *   {
 *     slug: '#slug',
 *     published: { from: '#published', transform: transforms.boolean, default: false },
 *   }
 * );
 * ```
 */
export const StandardNoteMapping: MappingConfig<StandardNote> = {
  id: {
    from: 'note.noteId',
    required: true,
  },
  title: {
    from: 'note.title',
    required: true,
  },
  dateCreatedUtc: {
    from: 'note.utcDateCreated',
    transform: transforms.date,
    required: true,
  },
  dateLastModifiedUtc: {
    from: 'note.utcDateModified',
    transform: transforms.date,
    required: true,
  },
};

/**
 * Helper type for defining custom field mappings.
 * Use this when defining mappings for types that extend StandardNote.
 * It automatically excludes StandardNote fields since they're auto-merged.
 * 
 * @template T - Your custom type that extends StandardNote
 * 
 * @example
 * ```ts
 * interface BlogPost extends StandardNote {
 *   slug: string;
 *   published: boolean;
 * }
 * 
 * // Clean type - no need for verbose Omit<>
 * const blogMapping: CustomMapping<BlogPost> = {
 *   slug: '#slug',
 *   published: { from: '#published', transform: transforms.boolean, default: false },
 * };
 * 
 * const { data } = await client.searchAndMap<BlogPost>({
 *   query: '#blog',
 *   mapping: blogMapping,
 * });
 * ```
 */
export type CustomMapping<T extends StandardNote> = MappingConfig<Omit<T, keyof StandardNote>>;
