import { User } from '@/types/auth';

// API base URL - BeastBrowser local server
const API_BASE_URL = 'http://localhost:3000/api/v1';

// API key for authentication with the local server
const API_KEY = import.meta.env.VITE_BEAST_BROWSER_API_KEY || 'beastbrowser-dev-key';

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

interface SignupResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}

interface PlanResponse {
  success: boolean;
  plan?: any;
  error?: string;
}

interface UsageResponse {
  success: boolean;
  usage?: any;
  error?: string;
}

interface SessionResponse {
  success: boolean;
  session?: any;
  error?: string;
}

class ApiService {
  private static instance: ApiService;
  private token: string | null = null;

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  // Set the authentication token
  setToken(token: string): void {
    this.token = token;
    // Store token in localStorage for persistence
    localStorage.setItem('auth_token', token);
  }

  // Get the authentication token
  getToken(): string | null {
    if (this.token) {
      return this.token;
    }
    
    // Try to get token from localStorage
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      this.token = storedToken;
      return storedToken;
    }
    
    return null;
  }

  // Clear the authentication token
  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Get common headers for API requests
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  // Login user
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success && data.token) {
        this.setToken(data.token);
        return {
          success: true,
          token: data.token,
          user: data.user
        };
      }

      return {
        success: false,
        error: data.error || 'Login failed'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  // Signup user
  async signup(email: string, password: string, displayName: string): Promise<SignupResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ email, password, displayName })
      });

      const data = await response.json();

      if (data.success && data.token) {
        this.setToken(data.token);
        return {
          success: true,
          token: data.token,
          user: data.user
        };
      }

      return {
        success: false,
        error: data.error || 'Signup failed'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  // Logout user
  async logout(): Promise<{ success: boolean }> {
    try {
      // Clear local token
      this.clearToken();
      
      // Optionally notify the server to invalidate the token
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      return { success: true };
    } catch (error) {
      // Even if server call fails, clear local token
      this.clearToken();
      return { success: true };
    }
  }

  // Verify authentication token
  async verifyAuth(): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          user: data.user
        };
      }

      // If verification fails, clear the token
      this.clearToken();
      
      return {
        success: false,
        error: data.error || 'Authentication verification failed'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  // Get user's plan
  async getUserPlan(): Promise<PlanResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/plan`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          plan: data.plan
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to get user plan'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  // Get user's usage statistics
  async getUserUsage(): Promise<UsageResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/usage`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          usage: data.usage
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to get usage statistics'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  // Record usage
  async recordUsage(usageData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/usage`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(usageData)
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Failed to record usage'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  // Get session info
  async getSessionInfo(): Promise<SessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/session`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          session: data.session
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to get session info'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }

  // Create or refresh session
  async refreshSession(): Promise<SessionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/session`, {
        method: 'POST',
        headers: this.getHeaders()
      });

      const data = await response.json();

      if (data.success) {
        return {
          success: true,
          session: data.session
        };
      }

      return {
        success: false,
        error: data.error || 'Failed to refresh session'
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      };
    }
  }
}

export const apiService = ApiService.getInstance();