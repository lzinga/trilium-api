import { describe, it, expect } from 'vitest';
import { buildSearchQuery, TriliumMapper, transforms } from './mapper.js';
import type { TriliumNote } from './client.js';

// ============================================================================
// buildSearchQuery Tests
// ============================================================================

describe('buildSearchQuery', () => {
  describe('label conditions', () => {
    it('should handle boolean true label (presence check)', () => {
      expect(buildSearchQuery({ '#blog': true })).toBe('#blog');
    });

    it('should handle boolean false label (absence check)', () => {
      expect(buildSearchQuery({ '#draft': false })).toBe('#!draft');
    });

    it('should handle label with string value', () => {
      expect(buildSearchQuery({ '#status': 'published' })).toBe("#status = 'published'");
    });

    it('should handle label with number value', () => {
      expect(buildSearchQuery({ '#priority': 5 })).toBe('#priority = 5');
    });

    it('should handle label with operator', () => {
      expect(buildSearchQuery({ '#wordCount': { value: 1000, operator: '>=' } })).toBe('#wordCount >= 1000');
    });

    it('should handle label with contains operator', () => {
      expect(buildSearchQuery({ '#tags': { value: 'javascript', operator: '*=*' } })).toBe("#tags *=* 'javascript'");
    });

    it('should handle nested label property', () => {
      expect(buildSearchQuery({ '#template.title': 'Blog Post' })).toBe("#template.title = 'Blog Post'");
    });
  });

  describe('relation conditions', () => {
    it('should handle relation with string value (default contains)', () => {
      expect(buildSearchQuery({ '~author': 'John' })).toBe("~author *=* 'John'");
    });

    it('should handle relation with operator', () => {
      expect(buildSearchQuery({ '~category': { value: 'Tech', operator: '=' } })).toBe("~category = 'Tech'");
    });

    it('should handle nested relation property', () => {
      expect(buildSearchQuery({ '~author.title': 'John Doe' })).toBe("~author.title = 'John Doe'");
    });
  });

  describe('note property conditions', () => {
    it('should handle note property with note. prefix', () => {
      expect(buildSearchQuery({ 'note.type': 'text' })).toBe("note.type = 'text'");
    });

    it('should handle note property without note. prefix', () => {
      expect(buildSearchQuery({ type: 'text' })).toBe("note.type = 'text'");
    });

    it('should handle note property with boolean value', () => {
      expect(buildSearchQuery({ isProtected: false })).toBe('note.isProtected = false');
    });

    it('should handle note property with operator', () => {
      expect(buildSearchQuery({ title: { value: 'Blog', operator: '*=' } })).toBe("note.title *= 'Blog'");
    });
  });

  describe('logical operators', () => {
    it('should handle AND operator', () => {
      const query = buildSearchQuery({
        AND: [{ '#blog': true }, { '#published': true }],
      });
      expect(query).toBe('#blog AND #published');
    });

    it('should handle OR operator', () => {
      const query = buildSearchQuery({
        OR: [{ '#status': 'draft' }, { '#status': 'review' }],
      });
      expect(query).toBe("#status = 'draft' OR #status = 'review'");
    });

    it('should handle NOT operator', () => {
      const query = buildSearchQuery({
        NOT: { '#archived': true },
      });
      expect(query).toBe('not(#archived)');
    });

    it('should handle nested AND with OR', () => {
      const query = buildSearchQuery({
        AND: [{ '#blog': true }, { OR: [{ '#status': 'published' }, { '#status': 'featured' }] }],
      });
      expect(query).toBe("#blog AND (#status = 'published' OR #status = 'featured')");
    });

    it('should handle complex nested conditions', () => {
      const query = buildSearchQuery({
        AND: [
          { '#blog': true },
          { 'note.type': 'text' },
          {
            OR: [{ '#category': 'tech' }, { '#category': 'programming' }],
          },
          { NOT: { '#draft': true } },
        ],
      });
      expect(query).toBe("#blog AND note.type = 'text' AND (#category = 'tech' OR #category = 'programming') AND not(#draft)");
    });
  });

  describe('multiple conditions (implicit AND)', () => {
    it('should join multiple conditions with AND', () => {
      const query = buildSearchQuery({
        '#blog': true,
        'note.type': 'text',
      });
      expect(query).toBe("#blog AND note.type = 'text'");
    });

    it('should skip undefined values', () => {
      const query = buildSearchQuery({
        '#blog': true,
        '#draft': undefined,
        'note.type': 'text',
      });
      expect(query).toBe("#blog AND note.type = 'text'");
    });
  });

  describe('edge cases', () => {
    it('should return empty string for empty object', () => {
      expect(buildSearchQuery({})).toBe('');
    });

    it('should throw error for invalid NOT usage', () => {
      expect(() => buildSearchQuery({ NOT: { value: 'test' } as any })).toThrow('NOT operator requires a query object');
    });
  });
});

// ============================================================================
// TriliumMapper Tests
// ============================================================================

describe('TriliumMapper', () => {
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

  describe('basic mapping', () => {
    it('should map note properties using shorthand syntax', () => {
      interface SimpleNote {
        id: string;
        name: string;
      }

      const mapper = new TriliumMapper<SimpleNote>({
        id: 'note.noteId',
        name: 'note.title',
      });

      const note = createMockNote({ noteId: 'abc123', title: 'My Note' });
      const result = mapper.map(note);

      expect(result.id).toBe('abc123');
      expect(result.name).toBe('My Note');
    });

    it('should map label attributes', () => {
      interface BlogPost {
        slug: string;
        category: string;
      }

      const mapper = new TriliumMapper<BlogPost>({
        slug: '#slug',
        category: '#category',
      });

      const note = createMockNote({
        attributes: [
          { attributeId: 'a1', noteId: 'test123', type: 'label', name: 'slug', value: 'my-blog-post', position: 0, isInheritable: false },
          { attributeId: 'a2', noteId: 'test123', type: 'label', name: 'category', value: 'tech', position: 1, isInheritable: false },
        ],
      });

      const result = mapper.map(note);

      expect(result.slug).toBe('my-blog-post');
      expect(result.category).toBe('tech');
    });

    it('should map relation attributes', () => {
      interface LinkedNote {
        authorId: string;
      }

      const mapper = new TriliumMapper<LinkedNote>({
        authorId: '~author',
      });

      const note = createMockNote({
        attributes: [{ attributeId: 'a1', noteId: 'test123', type: 'relation', name: 'author', value: 'author123', position: 0, isInheritable: false }],
      });

      const result = mapper.map(note);

      expect(result.authorId).toBe('author123');
    });
  });

  describe('transform functions', () => {
    it('should apply transform function', () => {
      interface PostWithCount {
        wordCount: number;
      }

      const mapper = new TriliumMapper<PostWithCount>({
        wordCount: {
          from: '#wordCount',
          transform: transforms.number,
        },
      });

      const note = createMockNote({
        attributes: [{ attributeId: 'a1', noteId: 'test123', type: 'label', name: 'wordCount', value: '1500', position: 0, isInheritable: false }],
      });

      const result = mapper.map(note);

      expect(result.wordCount).toBe(1500);
    });

    it('should use custom transform function', () => {
      interface PostWithTags {
        tags: string[];
      }

      const mapper = new TriliumMapper<PostWithTags>({
        tags: {
          from: '#tags',
          transform: (value) => (typeof value === 'string' ? value.split(',').map((s) => s.trim()) : []),
        },
      });

      const note = createMockNote({
        attributes: [{ attributeId: 'a1', noteId: 'test123', type: 'label', name: 'tags', value: 'javascript, typescript, nodejs', position: 0, isInheritable: false }],
      });

      const result = mapper.map(note);

      expect(result.tags).toEqual(['javascript', 'typescript', 'nodejs']);
    });
  });

  describe('default values', () => {
    it('should use default value when field is undefined', () => {
      interface PostWithDefaults {
        views: number;
        status: string;
      }

      const mapper = new TriliumMapper<PostWithDefaults>({
        views: { from: '#views', transform: transforms.number, default: 0 },
        status: { from: '#status', default: 'draft' },
      });

      const note = createMockNote({ attributes: [] });
      const result = mapper.map(note);

      expect(result.views).toBe(0);
      expect(result.status).toBe('draft');
    });

    it('should not use default when value exists', () => {
      interface PostWithDefaults {
        status: string;
      }

      const mapper = new TriliumMapper<PostWithDefaults>({
        status: { from: '#status', default: 'draft' },
      });

      const note = createMockNote({
        attributes: [{ attributeId: 'a1', noteId: 'test123', type: 'label', name: 'status', value: 'published', position: 0, isInheritable: false }],
      });

      const result = mapper.map(note);

      expect(result.status).toBe('published');
    });
  });

  describe('required fields', () => {
    it('should throw error when required field is missing', () => {
      interface RequiredPost {
        slug: string;
      }

      const mapper = new TriliumMapper<RequiredPost>({
        slug: { from: '#slug', required: true },
      });

      const note = createMockNote({ attributes: [] });

      expect(() => mapper.map(note)).toThrow("Required field 'slug' missing from note test123 (Test Note)");
    });

    it('should not throw when required field exists', () => {
      interface RequiredPost {
        slug: string;
      }

      const mapper = new TriliumMapper<RequiredPost>({
        slug: { from: '#slug', required: true },
      });

      const note = createMockNote({
        attributes: [{ attributeId: 'a1', noteId: 'test123', type: 'label', name: 'slug', value: 'my-post', position: 0, isInheritable: false }],
      });

      const result = mapper.map(note);
      expect(result.slug).toBe('my-post');
    });
  });

  describe('computed fields', () => {
    it('should compute value from other mapped fields', () => {
      interface PostWithReadTime {
        wordCount: number;
        readTimeMinutes: number;
      }

      const mapper = new TriliumMapper<PostWithReadTime>({
        wordCount: { from: '#wordCount', transform: transforms.number, default: 0 },
        readTimeMinutes: {
          computed: (partial) => Math.ceil((partial.wordCount || 0) / 200),
        },
      });

      const note = createMockNote({
        attributes: [{ attributeId: 'a1', noteId: 'test123', type: 'label', name: 'wordCount', value: '1000', position: 0, isInheritable: false }],
      });

      const result = mapper.map(note);

      expect(result.wordCount).toBe(1000);
      expect(result.readTimeMinutes).toBe(5);
    });

    it('should have access to note in computed function', () => {
      interface PostWithFullTitle {
        fullTitle: string;
      }

      const mapper = new TriliumMapper<PostWithFullTitle>({
        fullTitle: {
          computed: (_partial, note) => `[${note.noteId}] ${note.title}`,
        },
      });

      const note = createMockNote({ noteId: 'xyz', title: 'Hello World' });
      const result = mapper.map(note);

      expect(result.fullTitle).toBe('[xyz] Hello World');
    });

    it('should use default for computed when undefined', () => {
      interface PostWithComputed {
        summary: string;
      }

      const mapper = new TriliumMapper<PostWithComputed>({
        summary: {
          computed: () => undefined,
          default: 'No summary available',
        },
      });

      const note = createMockNote();
      const result = mapper.map(note);

      expect(result.summary).toBe('No summary available');
    });
  });

  describe('custom extractor functions', () => {
    it('should use custom extractor function', () => {
      interface PostWithCustom {
        labelCount: number;
      }

      const mapper = new TriliumMapper<PostWithCustom>({
        labelCount: {
          from: (note) => note.attributes?.filter((a) => a.type === 'label').length || 0,
        },
      });

      const note = createMockNote({
        attributes: [
          { attributeId: 'a1', noteId: 'test123', type: 'label', name: 'one', value: '1', position: 0, isInheritable: false },
          { attributeId: 'a2', noteId: 'test123', type: 'label', name: 'two', value: '2', position: 1, isInheritable: false },
          { attributeId: 'a3', noteId: 'test123', type: 'relation', name: 'rel', value: 'val', position: 2, isInheritable: false },
        ],
      });

      const result = mapper.map(note);

      expect(result.labelCount).toBe(2);
    });
  });

  describe('array mapping', () => {
    it('should map array of notes', () => {
      interface SimpleNote {
        title: string;
      }

      const mapper = new TriliumMapper<SimpleNote>({
        title: 'note.title',
      });

      const notes = [createMockNote({ title: 'Note 1' }), createMockNote({ title: 'Note 2' }), createMockNote({ title: 'Note 3' })];

      const results = mapper.map(notes);

      expect(results).toHaveLength(3);
      expect(results[0]!.title).toBe('Note 1');
      expect(results[1]!.title).toBe('Note 2');
      expect(results[2]!.title).toBe('Note 3');
    });
  });

  describe('merge configurations', () => {
    it('should merge multiple configurations', () => {
      interface BaseNote {
        id: string;
        title: string;
      }

      interface ExtendedNote extends BaseNote {
        slug: string;
      }

      const baseConfig = {
        id: 'note.noteId',
        title: 'note.title',
      };

      const extendedConfig = {
        slug: '#slug',
      };

      const merged = TriliumMapper.merge<ExtendedNote>(baseConfig, extendedConfig);
      const mapper = new TriliumMapper<ExtendedNote>(merged);

      const note = createMockNote({
        noteId: 'abc',
        title: 'Test',
        attributes: [{ attributeId: 'a1', noteId: 'abc', type: 'label', name: 'slug', value: 'test-slug', position: 0, isInheritable: false }],
      });

      const result = mapper.map(note);

      expect(result.id).toBe('abc');
      expect(result.title).toBe('Test');
      expect(result.slug).toBe('test-slug');
    });

    it('should override earlier configs with later ones', () => {
      interface Note {
        title: string;
      }

      const config1 = { title: 'note.noteId' }; // Wrong mapping
      const config2 = { title: 'note.title' }; // Correct mapping

      const merged = TriliumMapper.merge<Note>(config1, config2);
      const mapper = new TriliumMapper<Note>(merged);

      const note = createMockNote({ noteId: 'abc', title: 'Correct Title' });
      const result = mapper.map(note);

      expect(result.title).toBe('Correct Title');
    });
  });
});

// ============================================================================
// transforms Tests
// ============================================================================

describe('transforms', () => {
  describe('number', () => {
    it('should convert string to number', () => {
      expect(transforms.number('123')).toBe(123);
      expect(transforms.number('45.67')).toBe(45.67);
    });

    it('should return undefined for invalid values', () => {
      expect(transforms.number(undefined)).toBeUndefined();
      expect(transforms.number(null)).toBeUndefined();
      expect(transforms.number('')).toBeUndefined();
      expect(transforms.number('not a number')).toBeUndefined();
    });

    it('should pass through numbers', () => {
      expect(transforms.number(42)).toBe(42);
    });
  });

  describe('boolean', () => {
    it('should convert string to boolean', () => {
      expect(transforms.boolean('true')).toBe(true);
      expect(transforms.boolean('TRUE')).toBe(true);
      expect(transforms.boolean('1')).toBe(true);
      expect(transforms.boolean('yes')).toBe(true);
      expect(transforms.boolean('false')).toBe(false);
      expect(transforms.boolean('FALSE')).toBe(false);
      expect(transforms.boolean('0')).toBe(false);
      expect(transforms.boolean('no')).toBe(false);
    });

    it('should return undefined for invalid values', () => {
      expect(transforms.boolean(undefined)).toBeUndefined();
      expect(transforms.boolean(null)).toBeUndefined();
      expect(transforms.boolean('maybe')).toBeUndefined();
    });

    it('should pass through booleans', () => {
      expect(transforms.boolean(true)).toBe(true);
      expect(transforms.boolean(false)).toBe(false);
    });
  });

  describe('commaSeparated', () => {
    it('should split comma-separated string', () => {
      expect(transforms.commaSeparated('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(transforms.commaSeparated('a, b, c')).toEqual(['a', 'b', 'c']);
      expect(transforms.commaSeparated('  a  ,  b  ,  c  ')).toEqual(['a', 'b', 'c']);
    });

    it('should filter empty values', () => {
      expect(transforms.commaSeparated('a,,b')).toEqual(['a', 'b']);
      expect(transforms.commaSeparated(',a,b,')).toEqual(['a', 'b']);
    });

    it('should return undefined for invalid values', () => {
      expect(transforms.commaSeparated(undefined)).toBeUndefined();
      expect(transforms.commaSeparated(null)).toBeUndefined();
      expect(transforms.commaSeparated('')).toBeUndefined();
      expect(transforms.commaSeparated(123)).toBeUndefined();
    });
  });

  describe('json', () => {
    it('should parse JSON string', () => {
      expect(transforms.json('{"a":1}')).toEqual({ a: 1 });
      expect(transforms.json('[1,2,3]')).toEqual([1, 2, 3]);
      expect(transforms.json('"string"')).toBe('string');
    });

    it('should return undefined for invalid JSON', () => {
      expect(transforms.json('not json')).toBeUndefined();
      expect(transforms.json('{invalid}')).toBeUndefined();
    });

    it('should return undefined for empty values', () => {
      expect(transforms.json(undefined)).toBeUndefined();
      expect(transforms.json(null)).toBeUndefined();
      expect(transforms.json('')).toBeUndefined();
    });
  });

  describe('date', () => {
    it('should parse date string', () => {
      const result = transforms.date('2024-01-15T00:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString().startsWith('2024-01-15')).toBe(true);
    });

    it('should parse ISO date string', () => {
      const result = transforms.date('2024-01-15T10:30:00Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should return undefined for invalid dates', () => {
      expect(transforms.date('not a date')).toBeUndefined();
      expect(transforms.date(undefined)).toBeUndefined();
      expect(transforms.date(null)).toBeUndefined();
      expect(transforms.date('')).toBeUndefined();
    });
  });

  describe('trim', () => {
    it('should trim whitespace', () => {
      expect(transforms.trim('  hello  ')).toBe('hello');
      expect(transforms.trim('\n\thello\n\t')).toBe('hello');
    });

    it('should return undefined for empty results', () => {
      expect(transforms.trim('   ')).toBeUndefined();
      expect(transforms.trim('')).toBeUndefined();
    });

    it('should return undefined for null/undefined', () => {
      expect(transforms.trim(undefined)).toBeUndefined();
      expect(transforms.trim(null)).toBeUndefined();
    });

    it('should convert non-strings to string', () => {
      expect(transforms.trim(123)).toBe('123');
    });
  });
});
