# trilium-api

A type-safe TypeScript client for the [Trilium Notes](https://github.com/TriliumNext/Trilium) ETAPI.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Search Query Builder](#search-query-builder)
- [Note Mapper](#note-mapper)
- [Search and Map](#search-and-map)
- [Types](#types)
- [Error Handling](#error-handling)
- [Demo](#demo)
- [Development](#development)
- [Releasing](#releasing)
- [License](#license)

## Features

-  **Fully typed** - Auto-generated types from OpenAPI specification
-  **Lightweight** - Built on [openapi-fetch](https://openapi-ts.dev/openapi-fetch/) (~6kb)
-  **Query Builder** - Type-safe search query construction
-  **Mapper** - Declarative note-to-object mapping with transforms
-  **StandardNote** - Consistent base fields (id, title, dates) on all mapped types

## Installation

```bash
npm install trilium-api
# or
pnpm add trilium-api
```

## Quick Start

```typescript
import { createTriliumClient } from 'trilium-api';

const client = createTriliumClient({
  baseUrl: 'http://localhost:8080',
  apiKey: 'your-etapi-token',
});

// Get app info
const { data: appInfo } = await client.GET('/app-info');
console.log(`Trilium version: ${appInfo?.appVersion}`);

// Get a note by ID
const { data: note } = await client.GET('/notes/{noteId}', {
  params: { path: { noteId: 'root' } },
});

// Search notes
const { data: results } = await client.GET('/notes', {
  params: { query: { search: '#blog' } },
});
```

## API Reference

### Creating a Client

```typescript
import { createTriliumClient } from 'trilium-api';

const client = createTriliumClient({
  baseUrl: 'http://localhost:8080', // Your Trilium server URL
  apiKey: 'your-etapi-token',        // ETAPI token from Trilium settings
});
```

### Common Operations

#### Get a Note

```typescript
const { data: note, error } = await client.GET('/notes/{noteId}', {
  params: { path: { noteId: 'abc123' } },
});

if (error) {
  console.error('Failed to fetch note:', error);
} else {
  console.log(note.title);
}
```

#### Create a Note

```typescript
const { data } = await client.POST('/create-note', {
  body: {
    parentNoteId: 'root',
    title: 'My New Note',
    type: 'text',
    content: '<p>Hello World!</p>',
  },
});

console.log(`Created note: ${data?.note?.noteId}`);
```

#### Update a Note

```typescript
await client.PATCH('/notes/{noteId}', {
  params: { path: { noteId: 'abc123' } },
  body: { title: 'Updated Title' },
});
```

#### Delete a Note

```typescript
await client.DELETE('/notes/{noteId}', {
  params: { path: { noteId: 'abc123' } },
});
```

#### Get/Update Note Content

```typescript
// Get content
const { data: content } = await client.GET('/notes/{noteId}/content', {
  params: { path: { noteId: 'abc123' } },
});

// Update content
await client.PUT('/notes/{noteId}/content', {
  params: { path: { noteId: 'abc123' } },
  body: '<p>New content</p>',
});
```

#### Branches

```typescript
// Create a branch (clone a note to another location)
const { data: branch } = await client.POST('/branches', {
  body: {
    noteId: 'sourceNote123',
    parentNoteId: 'targetParent456',
  },
});

// Delete a branch
await client.DELETE('/branches/{branchId}', {
  params: { path: { branchId: 'branch123' } },
});
```

#### Attributes

```typescript
// Create a label
await client.POST('/attributes', {
  body: {
    noteId: 'abc123',
    type: 'label',
    name: 'status',
    value: 'published',
  },
});

// Create a relation
await client.POST('/attributes', {
  body: {
    noteId: 'abc123',
    type: 'relation',
    name: 'author',
    value: 'authorNoteId',
  },
});
```

## Search Query Builder

Build type-safe Trilium search queries with the `buildSearchQuery` helper:

```typescript
import { buildSearchQuery } from 'trilium-api';

// Simple label search
buildSearchQuery({ '#blog': true });
// => '#blog'

// Label with value
buildSearchQuery({ '#status': 'published' });
// => "#status = 'published'"

// Label absence check
buildSearchQuery({ '#draft': false });
// => '#!draft'

// Comparison operators
buildSearchQuery({ '#wordCount': { value: 1000, operator: '>=' } });
// => '#wordCount >= 1000'

// Note properties
buildSearchQuery({ 'note.type': 'text', title: { value: 'Blog', operator: '*=' } });
// => "note.type = 'text' AND note.title *= 'Blog'"

// Relations
buildSearchQuery({ '~author': 'John' });
// => "~author *=* 'John'"

// AND conditions
buildSearchQuery({
  AND: [
    { '#blog': true },
    { '#published': true },
  ],
});
// => '#blog AND #published'

// OR conditions
buildSearchQuery({
  OR: [
    { '#status': 'draft' },
    { '#status': 'review' },
  ],
});
// => "#status = 'draft' OR #status = 'review'"

// NOT conditions
buildSearchQuery({
  NOT: { '#archived': true },
});
// => 'not(#archived)'

// Complex nested conditions
buildSearchQuery({
  AND: [
    { '#blog': true },
    { 'note.type': 'text' },
    { OR: [
      { '#category': 'tech' },
      { '#category': 'programming' },
    ]},
    { NOT: { '#draft': true } },
  ],
});
// => "#blog AND note.type = 'text' AND (#category = 'tech' OR #category = 'programming') AND not(#draft)"
```

### Using with the Client

```typescript
const query = buildSearchQuery({
  AND: [
    { '#blog': true },
    { '#published': true },
  ],
});

const { data } = await client.GET('/notes', {
  params: { query: { search: query, limit: 10 } },
});
```

## Note Mapper

Map Trilium notes to strongly-typed objects using declarative field mappings.

### StandardNote Base Type

All mapped types should extend `StandardNote`, which provides consistent base fields:

```typescript
import type { StandardNote } from 'trilium-api';

// StandardNote includes:
// - id: string (note ID)
// - title: string (note title)  
// - dateCreatedUtc: Date
// - dateLastModifiedUtc: Date

interface BlogPost extends StandardNote {
  slug: string;
  tags: string[];
  isPublished: boolean;
}
```

### Using TriliumMapper Directly

For standalone mapping (outside of `searchAndMap`), use `TriliumMapper`:

```typescript
import { TriliumMapper, StandardNoteMapping, transforms, type StandardNote } from 'trilium-api';

interface BlogPost extends StandardNote {
  slug: string;
  wordCount: number;
  readTimeMinutes: number;
  tags: string[];
  isPublished: boolean;
}

// Merge StandardNoteMapping with your custom fields
const blogMapper = new TriliumMapper<BlogPost>(
  TriliumMapper.merge(
    StandardNoteMapping,
    {
      slug: { from: '#slug', required: true },
      wordCount: { from: '#wordCount', transform: transforms.number, default: 0 },
      readTimeMinutes: {
        computed: (partial) => Math.ceil((partial.wordCount || 0) / 200),
      },
      tags: { from: '#tags', transform: transforms.commaSeparated, default: [] },
      isPublished: { from: '#published', transform: transforms.boolean, default: false },
    }
  )
);

// Map notes
const post = blogMapper.map(note);
const posts = blogMapper.map(notes);
```

### Field Mapping Options

#### Shorthand String Path

```typescript
{
  title: 'note.title',      // Note property
  slug: '#slug',            // Label attribute
  authorId: '~author',      // Relation attribute
}
```

#### Full Configuration Object

```typescript
{
  fieldName: {
    from: '#labelName',           // Source path or extractor function
    transform: transforms.number, // Optional transform function
    default: 0,                   // Default value if undefined
    required: false,              // Throw if missing (default: false)
  },
}
```

#### Custom Extractor Function

```typescript
{
  labelCount: {
    from: (note) => note.attributes?.filter(a => a.type === 'label').length || 0,
  },
}
```

#### Computed Fields

```typescript
{
  readTimeMinutes: {
    computed: (partial, note) => Math.ceil((partial.wordCount || 0) / 200),
    default: 1,
  },
}
```

### Built-in Transforms

| Transform | Description | Example |
|-----------|-------------|---------|
| `transforms.number` | Convert to number | `"123"` → `123` |
| `transforms.boolean` | Convert to boolean | `"true"` → `true` |
| `transforms.commaSeparated` | Split string to array | `"a, b, c"` → `["a", "b", "c"]` |
| `transforms.json` | Parse JSON string | `'{"a":1}'` → `{ a: 1 }` |
| `transforms.date` | Parse date string | `"2024-01-15"` → `Date` |
| `transforms.trim` | Trim whitespace | `"  hello  "` → `"hello"` |

## Search and Map

The `searchAndMap` method combines searching and mapping in a single call. It **automatically includes `StandardNoteMapping`**, so you only need to define your custom fields!

```typescript
import { createTriliumClient, transforms, type StandardNote, type CustomMapping } from 'trilium-api';

const client = createTriliumClient({
  baseUrl: 'http://localhost:8080',
  apiKey: 'your-etapi-token',
});

// Extend StandardNote with your custom fields
interface BlogPost extends StandardNote {
  slug: string;
  published: boolean;
}

// Use CustomMapping<T> for clean typing - excludes StandardNote fields automatically
const blogMapping: CustomMapping<BlogPost> = {
  slug: '#slug',
  published: { from: '#published', transform: transforms.boolean, default: false },
};

// Just pass your custom mapping - StandardNoteMapping is auto-merged!
const { data, failures } = await client.searchAndMap<BlogPost>({
  query: { '#blog': true, '#published': true },
  mapping: blogMapping,
  limit: 10,
  orderBy: 'dateModified',
  orderDirection: 'desc',
});

// Each post has: id, title, dateCreatedUtc, dateLastModifiedUtc, slug, published
data.forEach(post => {
  console.log(`${post.title} (${post.id}) - ${post.slug}`);
});

// Check for mapping failures
if (failures.length > 0) {
  console.warn(`${failures.length} notes failed to map:`);
  failures.forEach(f => console.warn(`  - ${f.noteTitle}: ${f.reason}`));
}
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `query` | `string \| object` | Search query string or structured query object |
| `mapping` | `CustomMapping<T>` | Field mapping for your custom fields (StandardNote fields auto-merged) |
| `limit` | `number` | Maximum number of results |
| `orderBy` | `string` | Field to order by (e.g., `'dateModified'`, `'title'`) |
| `orderDirection` | `'asc' \| 'desc'` | Sort direction |
| `fastSearch` | `boolean` | Enable fast search mode (less accurate but faster) |

### Return Value

```typescript
{
  data: T[],              // Successfully mapped objects
  failures: MappingFailure[]  // Notes that failed to map
}
```

### Handling Failures

When a note fails to map (e.g., missing required field, transform error), it's added to the `failures` array instead of throwing:

```typescript
interface MappingFailure {
  noteId: string;    // The note ID that failed
  noteTitle: string; // The note title for identification
  reason: string;    // Error message explaining the failure
  note: TriliumNote; // The original note object for debugging
}
```

This allows you to process partial results while still knowing which notes had issues:

```typescript
interface BlogPost extends StandardNote {
  slug: string;
}

const { data, failures } = await client.searchAndMap<BlogPost>({
  query: '#blog',
  mapping: {
    slug: { from: '#slug', required: true }, // Will fail if missing
  },
});

// data contains all successfully mapped posts
// failures contains notes missing the required #slug label
```

### Error Handling

API or network errors throw an exception:

```typescript
try {
  const { data, failures } = await client.searchAndMap<BlogPost>({
    query: '#blog',
    mapping: blogMapping,
  });
} catch (err) {
  console.error('Search failed:', err);
}
```

## Types

The package exports a focused set of types for common use cases:

```typescript
// Main imports for typical usage
import { 
  createTriliumClient, 
  transforms, 
  buildSearchQuery,
} from 'trilium-api';

import type { 
  // Your mapped types should extend this
  StandardNote,
  // For typing your custom field mappings
  CustomMapping,
  // For typing query objects
  TriliumSearchHelpers,
  // For error handling
  MappingFailure,
  // Trilium entity types (for API responses)
  TriliumNote,
  TriliumBranch,
  TriliumAttribute,
  TriliumAttachment,
  TriliumAppInfo,
} from 'trilium-api';

// Advanced: for standalone TriliumMapper usage (outside searchAndMap)
import { TriliumMapper, StandardNoteMapping } from 'trilium-api';
import type { MappingConfig } from 'trilium-api';
```

## Error Handling

The client returns `{ data, error }` for all operations:

```typescript
const { data, error } = await client.GET('/notes/{noteId}', {
  params: { path: { noteId: 'nonexistent' } },
});

if (error) {
  // error contains the response body on failure
  console.error('Error:', error);
} else {
  // data is typed based on the endpoint
  console.log('Note:', data.title);
}
```

## Demo

Several demo scripts are included to help you understand the library's features.

### Note Tree Demo

Connects to a local Trilium instance and displays a tree view of your notes.

```bash
# Set your ETAPI token and run
TRILIUM_API_KEY=your-token pnpm demo

# On Windows PowerShell
$env:TRILIUM_API_KEY="your-token"; pnpm demo
```

**Configuration:**

| Variable | Default | Description |
|----------|---------|-------------|
| `TRILIUM_URL` | `http://localhost:8080` | Trilium server URL |
| `TRILIUM_API_KEY` | - | Your ETAPI token (required) |
| `MAX_DEPTH` | `3` | Maximum depth of the note tree |

**Getting Your ETAPI Token:**

1. Open Trilium Notes
2. Go to **Menu** > **Options** > **ETAPI**
3. Click **Create new ETAPI token**
4. Copy the generated token

### Search Query Builder Demo

Demonstrates how to build type-safe search queries (no Trilium connection required).

```bash
pnpm demo:search
```

Example output:
```
1. Simple label search:
   Code: buildSearchQuery({ "#blog": true })
   Result: #blog

2. Label with value:
   Code: buildSearchQuery({ "#status": "published" })
   Result: #status = 'published'

3. Complex nested conditions:
   Result: #blog AND (#status = 'published' OR #status = 'featured') AND #wordCount >= 500
```

### Note Mapper Demo

Demonstrates how to map Trilium notes to strongly-typed objects (no Trilium connection required).

```bash
pnpm demo:mapper
```

Example output:
```
Title: Getting Started with TypeScript
  ID: note1
  Slug: getting-started-typescript
  Status: published
  Word Count: 1500
  Tags: [typescript, programming, tutorial]
  Published: 2024-01-20T00:00:00.000Z
  Read Time: 8 min
```

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/trilium-api.git
cd trilium-api

# Install dependencies
pnpm install
```

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm test` | Run tests in watch mode |
| `pnpm run test:run` | Run tests once |
| `pnpm run test:ts` | Type check without emitting |
| `pnpm run generate-api` | Regenerate types from OpenAPI spec |

### Regenerating API Types

The TypeScript types are auto-generated from the [TriliumNext OpenAPI specification](https://github.com/TriliumNext/Trilium/blob/develop/apps/server/etapi.openapi.yaml). To regenerate types after an API update:

```bash
pnpm run generate-api
```

This runs `openapi-typescript` which:
1. Fetches the latest OpenAPI spec from the TriliumNext repository
2. Generates TypeScript types to `src/generated/trilium.d.ts`
3. Creates fully typed `paths`, `components`, and `operations` interfaces

#### Using a Different OpenAPI Source

To generate from a local file or different URL, modify the command in `package.json`:

```json
{
  "scripts": {
    "generate-api": "openapi-typescript ./path/to/local/etapi.openapi.yaml -o ./src/generated/trilium.d.ts"
  }
}
```

Or from a different URL:

```json
{
  "scripts": {
    "generate-api": "openapi-typescript https://your-server.com/etapi.openapi.yaml -o ./src/generated/trilium.d.ts"
  }
}
```

#### Verifying Generation

After regenerating, always verify:

```bash
# 1. Check TypeScript compilation
pnpm run test:ts

# 2. Run all tests
pnpm run test:run

# 3. Check for any breaking changes in the generated types
git diff src/generated/trilium.d.ts
```

### Writing Tests

Tests are written using [Vitest](https://vitest.dev/) and located alongside source files with `.test.ts` extension.

#### Test File Structure

```
src/
├── client.ts          # API client
├── client.test.ts     # Client tests
├── mapper.ts          # Mapper utilities
├── mapper.test.ts     # Mapper tests
└── generated/
    └── trilium.d.ts   # Generated types (don't test directly)
```

#### Adding Tests for the Client

The client tests mock `fetch` globally. Here's how to add a new test:

```typescript
// src/client.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTriliumClient } from './client.js';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Helper to create mock responses
function createMockResponse(body: any, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': contentType }),
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    blob: async () => new Blob([JSON.stringify(body)]),
    clone: function() { return this; },
  };
}

describe('my new feature', () => {
  const config = {
    baseUrl: 'http://localhost:8080',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('should do something', async () => {
    // 1. Setup mock response
    mockFetch.mockResolvedValueOnce(createMockResponse({ 
      noteId: 'test123',
      title: 'Test Note' 
    }));

    // 2. Create client and make request
    const client = createTriliumClient(config);
    const { data, error } = await client.GET('/notes/{noteId}', {
      params: { path: { noteId: 'test123' } },
    });

    // 3. Assert results
    expect(error).toBeUndefined();
    expect(data?.title).toBe('Test Note');

    // 4. Verify the request (openapi-fetch uses Request objects)
    const request = mockFetch.mock.calls[0]![0] as Request;
    expect(request.url).toBe('http://localhost:8080/etapi/notes/test123');
    expect(request.method).toBe('GET');
    expect(request.headers.get('Authorization')).toBe('test-api-key');
  });
});
```

#### Adding Tests for the Mapper

Mapper tests don't require fetch mocking—just create mock note objects:

```typescript
// src/mapper.test.ts
import { describe, it, expect } from 'vitest';
import { TriliumMapper, transforms, buildSearchQuery } from './mapper.js';
import type { TriliumNote } from './client.js';

// Helper to create mock notes
function createMockNote(overrides: Partial<TriliumNote> = {}): TriliumNote {
  return {
    noteId: 'test123',
    title: 'Test Note',
    type: 'text',
    mime: 'text/html',
    isProtected: false,
    blobId: 'blob123',
    attributes: [],
    parentNoteIds: ['root'],
    childNoteIds: [],
    parentBranchIds: ['branch123'],
    childBranchIds: [],
    dateCreated: '2024-01-01 12:00:00.000+0000',
    dateModified: '2024-01-01 12:00:00.000+0000',
    utcDateCreated: '2024-01-01 12:00:00.000Z',
    utcDateModified: '2024-01-01 12:00:00.000Z',
    ...overrides,
  };
}

describe('my mapper feature', () => {
  it('should map custom fields', () => {
    interface MyType {
      customField: string;
    }

    const mapper = new TriliumMapper<MyType>({
      customField: {
        from: '#myLabel',
        transform: (value) => String(value).toUpperCase(),
      },
    });

    const note = createMockNote({
      attributes: [{
        attributeId: 'a1',
        noteId: 'test123',
        type: 'label',
        name: 'myLabel',
        value: 'hello',
        position: 0,
        isInheritable: false,
      }],
    });

    const result = mapper.map(note);
    expect(result.customField).toBe('HELLO');
  });
});

describe('buildSearchQuery', () => {
  it('should handle my custom query', () => {
    const query = buildSearchQuery({
      '#myLabel': { value: 100, operator: '>=' },
    });
    expect(query).toBe('#myLabel >= 100');
  });
});
```

#### Adding a New Transform

To add a custom transform function:

```typescript
// src/mapper.ts - add to the transforms object
export const transforms = {
  // ... existing transforms ...

  /** Convert to lowercase */
  lowercase: (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    return String(value).toLowerCase();
  },

  /** Parse as URL */
  url: (value: unknown): URL | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    try {
      return new URL(String(value));
    } catch {
      return undefined;
    }
  },
};
```

Then add tests:

```typescript
// src/mapper.test.ts
describe('transforms', () => {
  describe('lowercase', () => {
    it('should convert to lowercase', () => {
      expect(transforms.lowercase('HELLO')).toBe('hello');
      expect(transforms.lowercase('HeLLo WoRLD')).toBe('hello world');
    });

    it('should return undefined for null/undefined', () => {
      expect(transforms.lowercase(undefined)).toBeUndefined();
      expect(transforms.lowercase(null)).toBeUndefined();
    });
  });
});
```

### Running Specific Tests

```bash
# Run tests matching a pattern
pnpm test -- -t "buildSearchQuery"

# Run tests in a specific file
pnpm test -- src/mapper.test.ts

# Run with coverage
pnpm test -- --coverage
```

### Debugging Tests

Add `.only` to focus on specific tests:

```typescript
describe.only('focused suite', () => {
  it.only('focused test', () => {
    // Only this test will run
  });
});
```

Use `console.log` or the Vitest UI:

```bash
pnpm test -- --ui
```

## Releasing

This project uses GitHub Actions to automatically version, release, and publish to npm.


### Creating a Release

1. Go to **Actions** → **Publish to npm** → **Run workflow**
2. Select the version bump type:
   - `patch` - Bug fixes (1.0.0 → 1.0.1) - **default**
   - `minor` - New features (1.0.0 → 1.1.0)
   - `major` - Breaking changes (1.0.0 → 2.0.0)
3. Click **Run workflow**

The workflow will automatically:
- Run type checking and tests
- Bump the version in `package.json`
- Commit the version change and create a git tag
- Build the package (CJS, ESM, and TypeScript declarations)
- Publish to npm
- Create a GitHub Release with auto-generated release notes

### Verifying the Release

- Check the [Actions tab](../../actions) for the workflow status
- Verify the package on [npm](https://www.npmjs.com/package/trilium-api)

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
