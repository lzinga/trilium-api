import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTriliumClient } from './client.js';

// Mock fetch globally - openapi-fetch uses Request objects
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Helper to create a proper Response mock
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

describe('createTriliumClient', () => {
  const config = {
    baseUrl: 'http://localhost:37840',
    apiKey: 'test-api-key',
  };

  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('client creation', () => {
    it('should create a client with correct baseUrl', () => {
      const client = createTriliumClient(config);
      expect(client).toBeDefined();
      expect(typeof client.GET).toBe('function');
      expect(typeof client.POST).toBe('function');
      expect(typeof client.PATCH).toBe('function');
      expect(typeof client.DELETE).toBe('function');
    });

    it('should handle trailing slash in baseUrl', () => {
      const clientWithSlash = createTriliumClient({
        baseUrl: 'http://localhost:37840/',
        apiKey: 'test-api-key',
      });
      expect(clientWithSlash).toBeDefined();
    });
  });

  describe('GET /app-info', () => {
    it('should fetch app info', async () => {
      const mockAppInfo = {
        appVersion: '0.60.0',
        dbVersion: 220,
        syncVersion: 30,
        buildDate: '2024-01-01T00:00:00Z',
        buildRevision: 'abc123',
        dataDirectory: '/home/user/data',
        clipperProtocolVersion: 1,
        utcDateTime: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockAppInfo));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/app-info');

      expect(error).toBeUndefined();
      expect(data).toEqual(mockAppInfo);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Check the Request object
      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.url).toBe('http://localhost:37840/etapi/app-info');
      expect(request.method).toBe('GET');
    });
  });

  describe('GET /notes/{noteId}', () => {
    it('should fetch a note by ID', async () => {
      const mockNote = {
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
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockNote));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/notes/{noteId}', {
        params: { path: { noteId: 'test123' } },
      });

      expect(error).toBeUndefined();
      expect(data).toEqual(mockNote);
      
      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.url).toBe('http://localhost:37840/etapi/notes/test123');
      expect(request.method).toBe('GET');
    });

    it('should handle 404 error when note not found', async () => {
      const errorResponse = { status: 404, code: 'NOTE_NOT_FOUND', message: 'Note not found' };
      mockFetch.mockResolvedValueOnce(createMockResponse(errorResponse, 404));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/notes/{noteId}', {
        params: { path: { noteId: 'nonexistent' } },
      });

      expect(data).toBeUndefined();
      expect(error).toBeDefined();
    });
  });

  describe('GET /notes (search)', () => {
    it('should search notes with query', async () => {
      const mockResults = {
        results: [
          { noteId: 'note1', title: 'Blog Post 1' },
          { noteId: 'note2', title: 'Blog Post 2' },
        ],
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockResults));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/notes', {
        params: { query: { search: '#blog' } },
      });

      expect(error).toBeUndefined();
      expect(data).toEqual(mockResults);
      
      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.url).toContain('search=%23blog');
    });

    it('should search with limit parameter', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ results: [] }));

      const client = createTriliumClient(config);
      await client.GET('/notes', {
        params: { query: { search: 'test', limit: 10 } },
      });

      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.url).toContain('limit=10');
    });
  });

  describe('POST /create-note', () => {
    it('should create a new note', async () => {
      const mockCreatedNote = {
        note: {
          noteId: 'newNote123',
          title: 'New Note',
          type: 'text',
          mime: 'text/html',
          isProtected: false,
        },
        branch: {
          branchId: 'branch456',
          noteId: 'newNote123',
          parentNoteId: 'root',
          notePosition: 10,
          isExpanded: false,
        },
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockCreatedNote, 201));

      const client = createTriliumClient(config);
      const { data, error } = await client.POST('/create-note', {
        body: {
          parentNoteId: 'root',
          title: 'New Note',
          type: 'text',
          content: '<p>Hello World</p>',
        },
      });

      expect(error).toBeUndefined();
      expect(data).toEqual(mockCreatedNote);
      
      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.url).toBe('http://localhost:37840/etapi/create-note');
      expect(request.method).toBe('POST');
    });
  });

  describe('PATCH /notes/{noteId}', () => {
    it('should patch a note', async () => {
      const mockUpdatedNote = {
        noteId: 'test123',
        title: 'Updated Title',
        type: 'text',
        mime: 'text/html',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockUpdatedNote));

      const client = createTriliumClient(config);
      const { data, error } = await client.PATCH('/notes/{noteId}', {
        params: { path: { noteId: 'test123' } },
        body: { title: 'Updated Title' },
      });

      expect(error).toBeUndefined();
      expect(data?.title).toBe('Updated Title');
      
      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.url).toBe('http://localhost:37840/etapi/notes/test123');
      expect(request.method).toBe('PATCH');
    });
  });

  describe('DELETE /notes/{noteId}', () => {
    it('should delete a note', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse('', 204, 'text/plain'));

      const client = createTriliumClient(config);
      const { error } = await client.DELETE('/notes/{noteId}', {
        params: { path: { noteId: 'test123' } },
      });

      expect(error).toBeUndefined();
      
      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.url).toBe('http://localhost:37840/etapi/notes/test123');
      expect(request.method).toBe('DELETE');
    });
  });

  describe('GET /notes/{noteId}/content', () => {
    it('should fetch note content', async () => {
      const mockContent = '<p>This is the note content</p>';

      mockFetch.mockResolvedValueOnce(createMockResponse(mockContent, 200, 'text/html'));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/notes/{noteId}/content', {
        params: { path: { noteId: 'test123' } },
      });

      expect(error).toBeUndefined();
      // Content comes back as parsed
      expect(data).toBeDefined();
    });
  });

  describe('PUT /notes/{noteId}/content', () => {
    it('should update note content', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse('', 204, 'text/plain'));

      const client = createTriliumClient(config);
      const { error } = await client.PUT('/notes/{noteId}/content', {
        params: { path: { noteId: 'test123' } },
        body: '<p>Updated content</p>' as any,
      });

      expect(error).toBeUndefined();
      
      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.url).toBe('http://localhost:37840/etapi/notes/test123/content');
      expect(request.method).toBe('PUT');
    });
  });

  describe('Branches API', () => {
    it('should create a branch', async () => {
      const mockBranch = {
        branchId: 'branch123',
        noteId: 'note123',
        parentNoteId: 'parent123',
        notePosition: 10,
        prefix: '',
        isExpanded: false,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockBranch, 201));

      const client = createTriliumClient(config);
      const { data, error } = await client.POST('/branches', {
        body: {
          noteId: 'note123',
          parentNoteId: 'parent123',
        },
      });

      expect(error).toBeUndefined();
      expect(data).toEqual(mockBranch);
    });

    it('should get a branch by ID', async () => {
      const mockBranch = {
        branchId: 'branch123',
        noteId: 'note123',
        parentNoteId: 'root',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockBranch));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/branches/{branchId}', {
        params: { path: { branchId: 'branch123' } },
      });

      expect(error).toBeUndefined();
      expect(data).toEqual(mockBranch);
    });

    it('should delete a branch', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse('', 204, 'text/plain'));

      const client = createTriliumClient(config);
      const { error } = await client.DELETE('/branches/{branchId}', {
        params: { path: { branchId: 'branch123' } },
      });

      expect(error).toBeUndefined();
    });
  });

  describe('Attributes API', () => {
    it('should create an attribute', async () => {
      const mockAttribute = {
        attributeId: 'attr123',
        noteId: 'note123',
        type: 'label',
        name: 'testLabel',
        value: 'testValue',
        position: 10,
        isInheritable: false,
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockAttribute, 201));

      const client = createTriliumClient(config);
      const { data, error } = await client.POST('/attributes', {
        body: {
          noteId: 'note123',
          type: 'label',
          name: 'testLabel',
          value: 'testValue',
        },
      });

      expect(error).toBeUndefined();
      expect(data).toEqual(mockAttribute);
    });

    it('should get an attribute by ID', async () => {
      const mockAttribute = {
        attributeId: 'attr123',
        noteId: 'note123',
        type: 'label',
        name: 'testLabel',
        value: 'testValue',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockAttribute));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/attributes/{attributeId}', {
        params: { path: { attributeId: 'attr123' } },
      });

      expect(error).toBeUndefined();
      expect(data).toEqual(mockAttribute);
    });

    it('should delete an attribute', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse('', 204, 'text/plain'));

      const client = createTriliumClient(config);
      const { error } = await client.DELETE('/attributes/{attributeId}', {
        params: { path: { attributeId: 'attr123' } },
      });

      expect(error).toBeUndefined();
    });
  });

  describe('Attachments API', () => {
    it('should get an attachment by ID', async () => {
      const mockAttachment = {
        attachmentId: 'attach123',
        ownerId: 'note123',
        role: 'file',
        mime: 'image/png',
        title: 'test.png',
        position: 10,
        blobId: 'blob123',
      };

      mockFetch.mockResolvedValueOnce(createMockResponse(mockAttachment));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/attachments/{attachmentId}', {
        params: { path: { attachmentId: 'attach123' } },
      });

      expect(error).toBeUndefined();
      expect(data).toEqual(mockAttachment);
    });

    it('should delete an attachment', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse('', 204, 'text/plain'));

      const client = createTriliumClient(config);
      const { error } = await client.DELETE('/attachments/{attachmentId}', {
        params: { path: { attachmentId: 'attach123' } },
      });

      expect(error).toBeUndefined();
    });
  });

  describe('Authorization header', () => {
    it('should include Authorization header in requests', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      const client = createTriliumClient(config);
      await client.GET('/app-info');

      const request = mockFetch.mock.calls[0]![0] as Request;
      expect(request.headers.get('Authorization')).toBe('test-api-key');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = createTriliumClient(config);
      
      await expect(client.GET('/app-info')).rejects.toThrow('Network error');
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 500, message: 'Internal Server Error' }, 500));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/app-info');

      expect(data).toBeUndefined();
      expect(error).toBeDefined();
    });

    it('should handle 401 unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ status: 401, message: 'Unauthorized' }, 401));

      const client = createTriliumClient(config);
      const { data, error } = await client.GET('/app-info');

      expect(data).toBeUndefined();
      expect(error).toBeDefined();
    });
  });
});
