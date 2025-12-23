/**
 * Demo script for the Note Mapper
 *
 * This demonstrates how to use TriliumMapper to map Trilium notes
 * to strongly-typed objects.
 *
 * Usage:
 *   pnpm tsx src/demo-mapper.ts
 *
 * With a real Trilium instance:
 *   TRILIUM_API_KEY=your-token pnpm tsx src/demo-mapper.ts
 */

import { TriliumMapper, transforms, type TriliumNote } from './client.js';

console.log('Note Mapper Demo');
console.log('='.repeat(50));
console.log();

// Define a sample blog post type
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  wordCount: number;
  tags: string[];
  publishedAt: Date | null;
  readTimeMinutes: number;
}

// Create a mapper configuration
const blogMapper = new TriliumMapper<BlogPost>({
  // Simple property mapping
  id: 'note.noteId',
  title: 'note.title',

  // Required label
  slug: { from: '#slug', required: true },

  // Label with default value
  status: { from: '#status', default: 'draft' },

  // Label with transform
  wordCount: { from: '#wordCount', transform: transforms.number, default: 0 },

  // Label with array transform
  tags: { from: '#tags', transform: transforms.commaSeparated, default: [] },

  // Label with date transform
  publishedAt: { from: '#publishedAt', transform: transforms.date, default: null },

  // Computed value based on other fields
  readTimeMinutes: {
    computed: (partial) => Math.ceil((partial.wordCount || 0) / 200),
  },
});

// Create sample Trilium notes (simulating API response)
const sampleNotes: TriliumNote[] = [
  {
    noteId: 'note1',
    title: 'Getting Started with TypeScript',
    type: 'text',
    mime: 'text/html',
    isProtected: false,
    blobId: 'blob1',
    dateCreated: '2024-01-15T10:00:00.000Z',
    dateModified: '2024-01-20T15:30:00.000Z',
    utcDateCreated: '2024-01-15T10:00:00.000Z',
    utcDateModified: '2024-01-20T15:30:00.000Z',
    attributes: [
      { attributeId: 'attr1', noteId: 'note1', type: 'label', name: 'slug', value: 'getting-started-typescript', isInheritable: false },
      { attributeId: 'attr2', noteId: 'note1', type: 'label', name: 'status', value: 'published', isInheritable: false },
      { attributeId: 'attr3', noteId: 'note1', type: 'label', name: 'wordCount', value: '1500', isInheritable: false },
      { attributeId: 'attr4', noteId: 'note1', type: 'label', name: 'tags', value: 'typescript,programming,tutorial', isInheritable: false },
      { attributeId: 'attr5', noteId: 'note1', type: 'label', name: 'publishedAt', value: '2024-01-20', isInheritable: false },
    ],
  },
  {
    noteId: 'note2',
    title: 'Advanced Patterns in Node.js',
    type: 'text',
    mime: 'text/html',
    isProtected: false,
    blobId: 'blob2',
    dateCreated: '2024-02-01T09:00:00.000Z',
    dateModified: '2024-02-05T14:00:00.000Z',
    utcDateCreated: '2024-02-01T09:00:00.000Z',
    utcDateModified: '2024-02-05T14:00:00.000Z',
    attributes: [
      { attributeId: 'attr6', noteId: 'note2', type: 'label', name: 'slug', value: 'advanced-nodejs-patterns', isInheritable: false },
      { attributeId: 'attr7', noteId: 'note2', type: 'label', name: 'status', value: 'draft', isInheritable: false },
      { attributeId: 'attr8', noteId: 'note2', type: 'label', name: 'wordCount', value: '2400', isInheritable: false },
      { attributeId: 'attr9', noteId: 'note2', type: 'label', name: 'tags', value: 'nodejs,javascript,backend', isInheritable: false },
    ],
  },
  {
    noteId: 'note3',
    title: 'Quick Tips for VS Code',
    type: 'text',
    mime: 'text/html',
    isProtected: false,
    blobId: 'blob3',
    dateCreated: '2024-03-01T11:00:00.000Z',
    dateModified: '2024-03-01T11:30:00.000Z',
    utcDateCreated: '2024-03-01T11:00:00.000Z',
    utcDateModified: '2024-03-01T11:30:00.000Z',
    attributes: [
      { attributeId: 'attr10', noteId: 'note3', type: 'label', name: 'slug', value: 'vscode-tips', isInheritable: false },
      // No status - will use default 'draft'
      // No wordCount - will use default 0
      // No tags - will use default []
    ],
  },
];

console.log('Mapper Configuration:');
console.log('-'.repeat(50));
console.log(`
const blogMapper = new TriliumMapper<BlogPost>({
  id: 'note.noteId',
  title: 'note.title',
  slug: { from: '#slug', required: true },
  status: { from: '#status', default: 'draft' },
  wordCount: { from: '#wordCount', transform: transforms.number, default: 0 },
  tags: { from: '#tags', transform: transforms.commaSeparated, default: [] },
  publishedAt: { from: '#publishedAt', transform: transforms.date, default: null },
  readTimeMinutes: {
    computed: (partial) => Math.ceil((partial.wordCount || 0) / 200),
  },
});
`);

console.log('Mapping Results:');
console.log('-'.repeat(50));

// Map all notes
const blogPosts = blogMapper.map(sampleNotes);

for (const post of blogPosts) {
  console.log();
  console.log(`Title: ${post.title}`);
  console.log(`  ID: ${post.id}`);
  console.log(`  Slug: ${post.slug}`);
  console.log(`  Status: ${post.status}`);
  console.log(`  Word Count: ${post.wordCount}`);
  console.log(`  Tags: [${post.tags.join(', ')}]`);
  console.log(`  Published: ${post.publishedAt?.toISOString() || 'Not published'}`);
  console.log(`  Read Time: ${post.readTimeMinutes} min`);
}

console.log();
console.log('='.repeat(50));
console.log();

// Demonstrate single note mapping
console.log('Single Note Mapping:');
console.log('-'.repeat(50));
console.log('const singlePost = blogMapper.map(notes[0]);');
const singlePost = blogMapper.map(sampleNotes[0]!);
console.log('Result:', JSON.stringify(singlePost, null, 2));
console.log();

console.log('='.repeat(50));
console.log('Demo completed!');
