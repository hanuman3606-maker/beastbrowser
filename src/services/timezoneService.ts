export interface TimezoneData {
  timezone: string;
  country: string;
  city: string;
  region: string;
  lat: number;
  lng: number;
  accuracy: number;
}

export interface TimezoneProvider {
  name: string;
  getTimezone(ip: string): Promise<TimezoneData | null>;
  priority: number;
}

class TimezoneService {
  private providers: TimezoneProvider[] = [
    {
      name: 'ip-api',
      priority: 1,
      getTimezone: async (ip: string): Promise<TimezoneData | null> => {
        try {
          const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,timezone,country,city,region,lat,lon,query`);
          const data = await response.json();
          
          if (data.status === 'success') {
            return {
              timezone: data.timezone,
              country: data.country,
              city: data.city,
              region: data.region,
              lat: data.lat,
              lng: data.lon,
              accuracy: 1
            };
          }
          return null;
        } catch (error) {
          console.error('ip-api provider failed:', error);
          return null;
        }
      }
    },
    {
      name: 'ipgeolocation',
      priority: 2,
      getTimezone: async (ip: string): Promise<TimezoneData | null> => {
        try {
          const response = await fetch(`https://api.ipgeolocation.io/timezone?apiKey=demo&ip=${ip}`);
          const data = await response.json();
          
          if (data.timezone) {
            return {
              timezone: data.timezone,
              country: data.country_name || '',
              city: data.city || '',
              region: data.state_prov || '',
              lat: data.latitude || 0,
              lng: data.longitude || 0,
              accuracy: 2
            };
          }
          return null;
        } catch (error) {
          console.error('ipgeolocation provider failed:', error);
          return null;
        }
      }
    },
    {
      name: 'worldtimeapi',
      priority: 3,
      getTimezone: async (ip: string): Promise<TimezoneData | null> => {
        try {
          // First get location from ip-api fallback
          const locationResponse = await fetch(`http://ip-api.com/json/${ip}?fields=status,lat,lon`);
          const locationData = await locationResponse.json();
          
          if (locationData.status === 'success') {
            // Get timezone from coordinates
            const tzResponse = await fetch(`https://worldtimeapi.org/api/timezone`);
            const timezones = await tzResponse.json();
            
            // Simple timezone estimation based on coordinates
            const estimatedTimezone = this.estimateTimezoneFromCoordinates(
              locationData.lat, 
              locationData.lon
            );
            
            return {
              timezone: estimatedTimezone,
              country: '',
              city: '',
              region: '',
              lat: locationData.lat,
              lng: locationData.lon,
              accuracy: 3
            };
          }
          return null;
        } catch (error) {
          console.error('worldtimeapi provider failed:', error);
          return null;
        }
      }
    }
  ];

  private estimateTimezoneFromCoordinates(lat: number, lng: number): string {
    // Simple timezone estimation based on longitude
    const timezoneOffset = Math.round(lng / 15);
    
    if (timezoneOffset >= 0) {
      return `Etc/GMT+${Math.abs(timezoneOffset)}`;
    } else {
      return `Etc/GMT-${Math.abs(timezoneOffset)}`;
    }
  }

  private getFallbackTimezone(): TimezoneData {
    return {
      timezone: 'America/New_York',
      country: 'United States',
      city: 'New York',
      region: 'New York',
      lat: 40.7128,
      lng: -74.0060,
      accuracy: 999
    };
  }

  async detectTimezoneFromIP(ip: string): Promise<TimezoneData> {
    console.log(`🔍 Detecting timezone for IP: ${ip}`);
    
    // Sort providers by priority
    const sortedProviders = [...this.providers].sort((a, b) => a.priority - b.priority);
    
    for (const provider of sortedProviders) {
      try {
        console.log(`🌐 Trying provider: ${provider.name}`);
        const result = await provider.getTimezone(ip);
        
        if (result) {
          console.log(`✅ Timezone detected using ${provider.name}:`, result);
          return result;
        }
        
        console.log(`❌ Provider ${provider.name} returned no data, trying next...`);
      } catch (error) {
        console.error(`❌ Provider ${provider.name} failed:`, error);
      }
    }
    
    console.log('⚠️ All timezone providers failed, using fallback');
    return this.getFallbackTimezone();
  }

  async detectTimezoneFromProxy(proxyHost: string): Promise<TimezoneData> {
    try {
      // Extract IP from proxy host (remove port if present)
      const ip = proxyHost.split(':')[0];
      return await this.detectTimezoneFromIP(ip);
    } catch (error) {
      console.error('Failed to detect timezone from proxy:', error);
      return this.getFallbackTimezone();
    }
  }

  getTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const targetTime = new Date(utcTime.toLocaleString("en-US", {timeZone: timezone}));
      const offset = (targetTime.getTime() - utcTime.getTime()) / (1000 * 60 * 60);
      return Math.round(offset);
    } catch (error) {
      console.error('Failed to get timezone offset:', error);
      return 0;
    }
  }

  formatTimezoneForBrowser(timezone: string): string {
    // Format timezone for browser environment
    return timezone.replace(/_/g, ' ');
  }
}

export const timezoneService = new TimezoneService();