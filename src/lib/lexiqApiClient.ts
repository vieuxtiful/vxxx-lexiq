/**
 * LexiQ API Client - Frontend utilities for backend communication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface TermData {
  id?: string;
  term: string;
  target_term?: string;
  domain: string;
  language: string;
  classification: 'valid' | 'review' | 'critical' | 'spelling' | 'grammar';
  score: number;
  frequency: number;
  context: string;
  rationale: string;
  suggestions?: string[];
  semantic_type?: string;
  confidence?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ValidationResult {
  term: string;
  is_valid: boolean;
  confidence: number;
  fallback_tier: string;
  rationale: string;
  recommended_term?: string;
  semantic_type?: string;
  domain_match: boolean;
  language_match: boolean;
}

export interface Recommendation {
  term: string;
  source: string;
  confidence: number;
  rationale: string;
  usage_count?: number;
  context_match?: boolean;
  semantic_info?: any;
}

export interface SyncEvent {
  event_type: string;
  timestamp: string;
  data: any;
  user_id?: string;
  session_id?: string;
}

class LexiQApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  async createTerm(termData: Omit<TermData, 'id'>): Promise<TermData> {
    const response = await this.request<{ status: string; data: TermData }>(
      '/api/v2/lexiq/terms',
      {
        method: 'POST',
        body: JSON.stringify(termData),
      }
    );
    return response.data;
  }

  async getTerm(termId: string): Promise<TermData> {
    const response = await this.request<{ status: string; data: TermData }>(
      `/api/v2/lexiq/terms/${termId}`
    );
    return response.data;
  }

  async updateTerm(termId: string, updates: Partial<TermData>): Promise<TermData> {
    const response = await this.request<{ status: string; data: TermData }>(
      `/api/v2/lexiq/terms/${termId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      }
    );
    return response.data;
  }

  async deleteTerm(termId: string): Promise<void> {
    await this.request(`/api/v2/lexiq/terms/${termId}`, {
      method: 'DELETE',
    });
  }

  async batchUpdateTerms(
    updates: Array<{ term_id: string; updates: Partial<TermData> }>
  ): Promise<{ total: number; success: number; failed: number }> {
    const response = await this.request<{ status: string; data: any }>(
      '/api/v2/lexiq/terms/batch',
      {
        method: 'POST',
        body: JSON.stringify({ updates }),
      }
    );
    return response.data;
  }

  async queryTerms(
    filters?: Record<string, any>,
    limit?: number,
    offset: number = 0
  ): Promise<TermData[]> {
    const response = await this.request<{ status: string; data: TermData[] }>(
      '/api/v2/lexiq/terms/query',
      {
        method: 'POST',
        body: JSON.stringify({ filters, limit, offset }),
      }
    );
    return response.data;
  }

  // ============================================================================
  // Validation & Recommendations
  // ============================================================================

  async validateTerm(
    term: string,
    domain: string,
    language: string,
    context: string = ''
  ): Promise<ValidationResult> {
    const response = await this.request<{ status: string; data: ValidationResult }>(
      '/api/v2/lexiq/validate',
      {
        method: 'POST',
        body: JSON.stringify({ term, domain, language, context }),
      }
    );
    return response.data;
  }

  async batchValidateTerms(
    terms: Array<{ text: string; context: string }>,
    domain: string,
    language: string
  ): Promise<ValidationResult[]> {
    const response = await this.request<{ status: string; data: ValidationResult[] }>(
      '/api/v2/lexiq/validate/batch',
      {
        method: 'POST',
        body: JSON.stringify({ terms, domain, language }),
      }
    );
    return response.data;
  }

  async getRecommendations(
    term: string,
    domain: string,
    language: string,
    context: string,
    classification: string
  ): Promise<{
    original_term: string;
    recommendations: Recommendation[];
    validation: Partial<ValidationResult>;
  }> {
    const response = await this.request<{ status: string; data: any }>(
      '/api/v2/lexiq/recommendations',
      {
        method: 'POST',
        body: JSON.stringify({ term, domain, language, context, classification }),
      }
    );
    return response.data;
  }

  // ============================================================================
  // Statistics & Sync
  // ============================================================================

  async getStatistics(): Promise<{
    total_terms: number;
    by_classification: Record<string, number>;
    by_domain: Record<string, number>;
    by_language: Record<string, number>;
    average_score: number;
    average_confidence: number;
  }> {
    const response = await this.request<{ status: string; data: any }>(
      '/api/v2/lexiq/statistics'
    );
    return response.data;
  }

  async getSyncHistory(limit: number = 50): Promise<SyncEvent[]> {
    const response = await this.request<{ status: string; data: SyncEvent[] }>(
      `/api/v2/lexiq/sync/history?limit=${limit}`
    );
    return response.data;
  }

  // ============================================================================
  // Import/Export
  // ============================================================================

  async exportCSV(filepath: string): Promise<void> {
    await this.request('/api/v2/lexiq/export/csv', {
      method: 'POST',
      body: JSON.stringify({ filepath }),
    });
  }

  async importCSV(file: File, replace: boolean = false): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${this.baseUrl}/api/v2/lexiq/import/csv?replace=${replace}`,
      {
        method: 'POST',
        headers: {
          ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Import failed');
    }

    return response.json();
  }

  // ============================================================================
  // HotMatch Integration
  // ============================================================================

  async detectHotMatches(
    terms: Array<{ text: string; context: string }>,
    domain: string,
    language: string,
    content: string,
    projectId?: string
  ): Promise<any> {
    const response = await this.request('/api/v2/hot-matches/detect', {
      method: 'POST',
      body: JSON.stringify({ terms, domain, language, content, projectId }),
    });
    return response;
  }

  async recordHotMatchSelection(
    baseTerm: string,
    selectedTerm: string,
    rejectedTerms: string[],
    domain: string,
    language: string,
    userId: string,
    projectId?: string,
    sessionId?: string
  ): Promise<void> {
    await this.request('/api/v2/hot-matches/record-selection', {
      method: 'POST',
      body: JSON.stringify({
        baseTerm,
        selectedTerm,
        rejectedTerms,
        domain,
        language,
        userId,
        projectId,
        sessionId,
      }),
    });
  }

  async getHotMatchPercentage(hash: string, term: string): Promise<number> {
    const response = await this.request<{ percentage: number }>(
      `/api/v2/hot-matches/percentage?hash=${hash}&term=${term}`
    );
    return response.percentage;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<any> {
    return this.request('/api/v2/lexiq/health');
  }
}

// Export singleton instance
export const lexiqApi = new LexiQApiClient();

// Export class for custom instances
export default LexiQApiClient;
