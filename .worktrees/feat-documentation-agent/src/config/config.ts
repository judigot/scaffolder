import type { IConfig } from '@/interfaces/IConfig.ts';
import { getApiUrl } from '@/utils/getApiUrl.ts';

export default {
  general: {
    appName: 'MyWebApp',
    version: '1.0.0',
    environment: 'development',
    baseUrl: String(import.meta.env.VITE_FRONTEND_URL),
    apiBaseUrl: getApiUrl(),
    defaultLanguage: 'english',
    supportedLanguages: [
      'english',
      'japanese',
      'chinese',
      'spanish',
      'french',
      'german',
      'korean',
      'russian',
    ],
    timezone: 'Asia/Manila',
    startWeekOnMonday: false,
    logging: {
      level: 'debug',
      logToFile: false,
      logFilePath: './logs/app.log',
    },
  },
  users: {
    hasUsers: true,
    fields: {
      id: {
        type: 'string',
        label: 'User ID',
        validations: [
          {
            rule: 'string',
            refinements: { uuid: false },
          },
        ],
      },
      username: {
        type: 'string',
        label: 'Username',
        isSearchable: true,
        isSortable: true,
        validations: [
          {
            rule: 'string',
            message: 'Username is required',
            refinements: { nonempty: true },
          },
          {
            rule: 'string',
            message: 'Username must be at least 3 characters',
            refinements: { min_length: 3 },
          },
        ],
        transform: 'lowercase',
      },
      email: {
        type: 'string',
        label: 'Email Address',
        isSearchable: true,
        isSortable: true,
        validations: [
          {
            rule: 'string',
            message: 'Email is required',
            refinements: { nonempty: true },
          },
          {
            rule: 'string',
            message: 'Please enter a valid email address',
            refinements: { email: true },
          },
        ],
        transform: 'lowercase',
      },
      password_hash: {
        type: 'string',
        label: 'Password',
        validations: [
          {
            rule: 'string',
            message: 'Password is required',
            refinements: { nonempty: true },
          },
          {
            rule: 'string',
            message: 'Password must meet security requirements',
            refinements: {
              min_length: 8,
              regex:
                /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
            },
          },
        ],
      },
      first_name: {
        type: 'string',
        label: 'First Name',
        isSearchable: true,
        isSortable: true,
        validations: [
          {
            rule: 'string',
            message: 'First name is required',
            refinements: { nonempty: true },
          },
          {
            rule: 'string',
            message: 'First name must be at least 2 characters',
            refinements: { min_length: 2 },
          },
        ],
        transform: 'capitalize',
      },
      last_name: {
        type: 'string',
        label: 'Last Name',
        isSearchable: true,
        isSortable: true,
        validations: [
          {
            rule: 'string',
            message: 'Last name is required',
            refinements: { nonempty: true },
          },
          {
            rule: 'string',
            message: 'Last name must be at least 2 characters',
            refinements: { min_length: 2 },
          },
        ],
        transform: 'capitalize',
      },
      status: {
        type: 'string',
        label: 'Account Status',
        isFilterable: true,
        isSortable: true,
        validations: [
          {
            rule: 'string',
            message: 'Status is required',
            refinements: { nonempty: true },
          },
          {
            rule: 'enum',
            message: 'Invalid status',
            enum: ['active', 'inactive', 'pending', 'suspended', 'banned'],
          },
        ],
      },
      created_at: {
        type: 'date',
        label: 'Created At',
        isSortable: true,
      },
      updated_at: {
        type: 'date',
        label: 'Last Updated',
        isSortable: true,
      },
      deleted_at: {
        type: 'date',
        label: 'Deleted At',
      },
      created_by_id: {
        type: 'string',
        label: 'Created By',
      },
      updated_by_id: {
        type: 'string',
        label: 'Updated By',
      },
    },
    defaultUserRoles: ['superadmin', 'admin', 'user', 'guest'],
    guestAccessEnabled: false,
    isMultiTenancyEnabled: true,
    tenantIdentifier: 'subdomain',
    emailVerification: {
      enabled: true,
      expiryDuration: 86400,
      resendCooldown: 300,
      maxResendAttempts: 5,
    },
    accountLockout: {
      enabled: true,
      maxFailedAttempts: 5,
      lockoutDuration: 900,
      notifyOnLockout: true,
    },
    authentication: {
      strategies: ['jwt', 'oauth'],
      jwt: {
        secretKey: 'supersecretkey',
        expiresIn: '1h',
        issuer: 'MyWebApp',
        refreshToken: {
          enabled: true,
          expiresIn: '7d',
        },
      },
      oauth: {
        google: {
          clientId: 'your-google-client-id',
          clientSecret: 'your-google-client-secret',
          redirectUri: `${String(import.meta.env.VITE_FRONTEND_URL)}/auth/google/callback`,
          scopes: ['profile', 'email'],
        },
        github: {
          clientId: 'your-github-client-id',
          clientSecret: 'your-github-client-secret',
          redirectUri: `${String(import.meta.env.VITE_FRONTEND_URL)}/auth/github/callback`,
          scopes: ['read:user', 'user:email'],
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumber: true,
        requireSpecialCharacter: true,
      },
      twoFactorAuth: {
        enabled: true,
        methods: ['totp', 'sms'],
        totp: {
          issuer: 'MyWebApp',
          period: 30,
          digits: 6,
        },
        sms: {
          provider: 'Twilio',
          apiKey: 'your-twilio-api-key',
        },
      },
    },
    session: {
      idleTimeout: 1800,
      absoluteTimeout: 86400,
      multiSessionAllowed: false,
    },
    authorization: {
      roleHierarchy: {
        superadmin: ['admin', 'user', 'guest'],
        admin: ['user', 'guest'],
        user: ['guest'],
        guest: [],
      },
      defaultPermissions: {
        superadmin: ['*'],
        admin: ['manage_users', 'manage_content', 'view_reports'],
        user: ['create_content', 'view_content'],
        guest: ['view_content'],
      },
    },
  },
  security: {
    cors: {
      enabled: true,
      allowedOrigins: [String(import.meta.env.VITE_FRONTEND_URL)],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    },
    rateLimit: {
      enabled: true,
      maxRequests: 100,
      windowMs: 60000,
    },
    csrf: {
      enabled: true,
      tokenHeader: 'X-CSRF-Token',
    },
    encryption: {
      saltRounds: 10,
    },
  },
  database: {
    type: 'PostgreSQL',
    host: 'localhost',
    port: 5432,
    username: 'myuser',
    password: 'mypassword',
    databaseName: 'mydatabase',
    pool: {
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
    },
    search: {
      fullTextSearch: {
        enabled: true,
        vectorColumn: 'document_vector',
        language: 'english',
      },
      elasticsearch: {
        enabled: true,
        node: 'http://127.0.0.1:9200',
        auth: {
          username: 'elastic',
          password: 'changeme',
        },
        indices: {
          prefix: 'myapp_',
          settings: {
            numberOfShards: 1,
            numberOfReplicas: 1,
          },
        },
        maxRetries: 3,
        requestTimeout: 30000,
        sniffOnStart: true,
      },
    },
  },
  caching: {
    enabled: true,
    defaultCache: 'redis',
    caches: {
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'yourpassword',
        ttl: 3600,
        db: 0,
      },
      inMemory: {
        enabled: true,
        maxSize: 100,
        ttl: 300,
      },
    },
    cacheStrategies: {
      shortLived: {
        ttl: 60,
        description: 'For frequently changing data',
      },
      mediumLived: {
        ttl: 3600,
        description: 'For moderately changing data',
      },
      longLived: {
        ttl: 86400,
        description: 'For rarely changing data',
      },
    },
  },
  features: {
    payments: {
      stripe: {
        publicKey: 'your-stripe-public-key',
        secretKey: 'your-stripe-secret-key',
        currency: 'USD',
      },
    },
  },
  notifications: {
    enabled: true,
    email: {
      enabled: true,
      smtp: {
        host: 'smtp.mailtrap.io',
        port: 587,
        secure: false,
        username: 'smtp-user',
        password: 'smtp-password',
        tls: {
          rejectUnauthorized: true,
        },
      },
      fromAddress: 'no-reply@mywebapp.com',
      fromName: 'MyWebApp',
      templates: {
        welcome: {
          subject: 'Welcome to MyWebApp',
          template: 'welcome-email',
        },
        passwordReset: {
          subject: 'Password Reset Request',
          template: 'password-reset',
          expiryHours: 24,
        },
        verification: {
          subject: 'Please verify your email',
          template: 'email-verification',
          expiryHours: 48,
        },
      },
      rateLimiting: {
        enabled: true,
        maxPerHour: 100,
      },
    },
    push: {
      enabled: true,
      providers: {
        firebase: {
          enabled: true,
          serverKey: 'your-firebase-server-key',
          projectId: 'your-project-id',
          clientEmail: 'your-client-email',
          privateKey: 'your-private-key',
          databaseURL: 'https://your-project.firebaseio.com',
        },
        apn: {
          enabled: false,
          keyId: 'your-key-id',
          teamId: 'your-team-id',
          bundle: 'com.mywebapp',
          key: 'your-private-key',
        },
      },
      topics: {
        news: 'news-updates',
        marketing: 'marketing-updates',
        system: 'system-updates',
      },
      defaults: {
        ttl: 2419200,
        priority: 'high',
        sound: 'default',
        badge: 1,
      },
    },
    sms: {
      enabled: false,
      provider: 'twilio',
      twilio: {
        accountSid: 'your-account-sid',
        authToken: 'your-auth-token',
        fromNumber: '+1234567890',
      },
      templates: {
        verification: 'Your verification code is: {{code}}',
        alert: 'Alert: {{message}}',
      },
      rateLimiting: {
        enabled: true,
        maxPerHour: 50,
      },
    },
    inApp: {
      enabled: true,
      storage: {
        type: 'database',
        ttl: 2592000,
      },
      maxPerUser: 100,
      categories: ['system', 'security', 'updates', 'marketing'],
    },
    webhooks: {
      enabled: false,
      endpoints: [],
      retryPolicy: {
        attempts: 3,
        backoff: 'exponential',
        initialDelay: 1000,
      },
    },
  },
  ui: {
    theme: {
      default: 'light',
      availableThemes: ['light', 'dark'],
    },
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 100,
    },
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm:ss',
    languageSwitcher: true,
    defaultTheme: 'light',
    navbar: {
      fixed: true,
      height: 60,
    },
    footer: {
      visible: true,
      height: 40,
    },
    forms: {
      validations: {
        onBlur: true,
        onSubmit: true,
        errorMessages: {
          required: 'This field is required.',
          email: 'Please enter a valid email address.',
          minLength: 'The input is too short.',
          maxLength: 'The input is too long.',
        },
      },
    },
  },
  routing: {
    basePath: '/',
    notFoundPath: '/404',
    protectedRoutes: ['/dashboard', '/settings'],
  },
  stateManagement: {
    storeType: 'zustand',
    persistence: {
      enabled: true,
      storageKey: 'appState',
      storageType: 'localStorage',
    },
  },
  api: {
    retryAttempts: 3,
    timeoutMs: 10000,
    errorHandling: {
      showUserMessage: true,
      defaultMessage: 'Something went wrong. Please try again later.',
    },
  },
  performance: {
    lazyLoading: true,
    preloadAssets: ['css', 'js'],
    compression: {
      enabled: true,
      type: 'gzip',
      threshold: 1024,
    },
  },
  analytics: {
    enabled: true,
    trackingId: 'UA-XXXXXXXXX-X',
    provider: 'GoogleAnalytics',
  },
  monitoring: {
    errorTracking: {
      enabled: true,
      provider: 'Sentry',
      dsn: 'your-sentry-dsn',
    },
    performanceMonitoring: {
      enabled: true,
      interval: 5000,
    },
  },
  storage: {
    provider: 'AWS',
    aws: {
      s3: {
        bucketName: 'mywebapp-bucket',
        region: 'us-east-1',
        accessKeyId: 'your-access-key-id',
        secretAccessKey: 'your-secret-access-key',
      },
    },
    local: {
      uploadPath: './uploads',
    },
  },
} satisfies IConfig;
