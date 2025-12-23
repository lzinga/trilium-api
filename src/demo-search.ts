/**
 * Demo script for the Search Query Builder
 *
 * This demonstrates how to use buildSearchQuery to construct
 * type-safe Trilium search queries.
 *
 * Usage:
 *   pnpm tsx src/demo-search.ts
 */

import { buildSearchQuery } from './mapper.js';

console.log('Search Query Builder Demo');
console.log('='.repeat(50));
console.log();

// Simple label search
console.log('1. Simple label search:');
console.log('   Code: buildSearchQuery({ "#blog": true })');
console.log('   Result:', buildSearchQuery({ '#blog': true }));
console.log();

// Label with value
console.log('2. Label with value:');
console.log('   Code: buildSearchQuery({ "#status": "published" })');
console.log('   Result:', buildSearchQuery({ '#status': 'published' }));
console.log();

// Label absence check
console.log('3. Label absence check:');
console.log('   Code: buildSearchQuery({ "#draft": false })');
console.log('   Result:', buildSearchQuery({ '#draft': false }));
console.log();

// Comparison operators
console.log('4. Comparison operators:');
console.log('   Code: buildSearchQuery({ "#wordCount": { value: 1000, operator: ">=" } })');
console.log('   Result:', buildSearchQuery({ '#wordCount': { value: 1000, operator: '>=' } }));
console.log();

// Note properties
console.log('5. Note properties:');
console.log('   Code: buildSearchQuery({ "note.type": "text", title: { value: "Blog", operator: "*=" } })');
console.log(
  '   Result:',
  buildSearchQuery({ 'note.type': 'text', title: { value: 'Blog', operator: '*=' } })
);
console.log();

// Relations
console.log('6. Relations:');
console.log('   Code: buildSearchQuery({ "~author": "John" })');
console.log('   Result:', buildSearchQuery({ '~author': 'John' }));
console.log();

// AND conditions
console.log('7. AND conditions:');
console.log('   Code: buildSearchQuery({ AND: [{ "#blog": true }, { "#published": true }] })');
console.log('   Result:', buildSearchQuery({ AND: [{ '#blog': true }, { '#published': true }] }));
console.log();

// OR conditions
console.log('8. OR conditions:');
console.log('   Code: buildSearchQuery({ OR: [{ "#status": "published" }, { "#status": "featured" }] })');
console.log(
  '   Result:',
  buildSearchQuery({ OR: [{ '#status': 'published' }, { '#status': 'featured' }] })
);
console.log();

// Complex nested conditions
console.log('9. Complex nested conditions:');
const complexQuery = {
  AND: [
    { '#blog': true },
    {
      OR: [{ '#status': 'published' }, { '#status': 'featured' }],
    },
    { '#wordCount': { value: 500, operator: '>=' as const } },
  ],
};
console.log('   Code: buildSearchQuery({');
console.log('     AND: [');
console.log('       { "#blog": true },');
console.log('       { OR: [{ "#status": "published" }, { "#status": "featured" }] },');
console.log('       { "#wordCount": { value: 500, operator: ">=" } }');
console.log('     ]');
console.log('   })');
console.log('   Result:', buildSearchQuery(complexQuery));
console.log();

// NOT conditions
console.log('10. NOT conditions:');
console.log('   Code: buildSearchQuery({ NOT: { "#archived": true } })');
console.log('   Result:', buildSearchQuery({ NOT: { '#archived': true } }));
console.log();

// Multiple conditions (implicit AND)
console.log('11. Multiple conditions (implicit AND):');
console.log('   Code: buildSearchQuery({ "#blog": true, "#published": true, "note.type": "text" })');
console.log(
  '   Result:',
  buildSearchQuery({ '#blog': true, '#published': true, 'note.type': 'text' })
);
console.log();

console.log('='.repeat(50));
console.log('Demo completed!');
