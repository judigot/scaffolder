type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Environment = 'development' | 'staging' | 'production';
type Language =
  | 'english'
  | 'japanese'
  | 'chinese'
  | 'spanish'
  | 'french'
  | 'german'
  | 'korean'
  | 'russian';
type AuthStrategy = 'jwt' | 'oauth';
type TwoFactorMethod = 'totp' | 'sms';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type CacheType = 'redis' | 'inMemory';
type Theme = 'light' | 'dark';
type NotificationPriority = 'high' | 'normal' | 'low';
type StorageProvider = 'AWS' | 'local';
type BackoffStrategy = 'exponential';
type DatabaseType = 'PostgreSQL';
type StoreType = 'zustand';
type StorageType = 'localStorage';
type AnalyticsProvider = 'GoogleAnalytics';
type ErrorTrackingProvider = 'Sentry';
type SmsProvider = 'twilio';
type TenantIdentifier = 'subdomain';
type CompressionType = 'gzip';

// Field Types
type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'bigint'
  | 'symbol'
  | 'undefined'
  | 'null'
  | 'void'
  | 'never'
  | 'unknown';

export type UserRole = 'superadmin' | 'admin' | 'user' | 'guest';
export type UserStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'suspended'
  | 'banned';
type TransformType = 'trim' | 'lowercase' | 'uppercase' | 'capitalize';

// Add validation rule types
interface IValidationRule {
  rule:
    | 'string'
    | 'number'
    | 'boolean'
    | 'date'
    | 'array'
    | 'object'
    | 'enum'
    | 'union'
    | 'optional'
    | 'nullable'
    | 'default';
  message?: string;
  refinements?: {
    min?: number;
    max?: number;
    email?: boolean;
    url?: boolean;
    uuid?: boolean;
    cuid?: boolean;
    regex?: RegExp;
    startsWith?: string;
    endsWith?: string;
    includes?: string;
    length?: number;
    datetime?: boolean;
    positive?: boolean;
    negative?: boolean;
    int?: boolean;
    finite?: boolean;
    safe?: boolean;
    trim?: boolean;
    toLowerCase?: boolean;
    toUpperCase?: boolean;
    nonempty?: boolean;
    min_length?: number;
    max_length?: number;
    custom?: (value: unknown) => boolean;
  };
  enum?: unknown[];
  default?: unknown;
  array?: {
    min?: number;
    max?: number;
    length?: number;
    type?: IValidationRule;
  };
  object?: Record<string, IValidationRule>;
}

interface IUserFieldDefinition {
  type: FieldType;
  label: string;
  isFilterable: boolean;
  isSortable: boolean;
  isSearchable: boolean;
  validations: IValidationRule[];
  transform: TransformType;
}

type IUserFields = Record<string, Partial<IUserFieldDefinition>>;

interface ILogging {
  level: LogLevel;
  logToFile: boolean;
  logFilePath: string;
}

interface IEmailVerification {
  enabled: boolean;
  expiryDuration: number;
  resendCooldown: number;
  maxResendAttempts: number;
}

interface IAccountLockout {
  enabled: boolean;
  maxFailedAttempts: number;
  lockoutDuration: number;
  notifyOnLockout: boolean;
}

interface IJwtConfig {
  secretKey: string;
  expiresIn: string;
  issuer: string;
  refreshToken: {
    enabled: boolean;
    expiresIn: string;
  };
}

interface IOAuthProvider {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface IPasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialCharacter: boolean;
}

interface ITwoFactorAuth {
  enabled: boolean;
  methods: TwoFactorMethod[];
  totp: {
    issuer: string;
    period: number;
    digits: number;
  };
  sms: {
    provider: string;
    apiKey: string;
  };
}

interface ISession {
  idleTimeout: number;
  absoluteTimeout: number;
  multiSessionAllowed: boolean;
}

interface IAuthorization {
  roleHierarchy: Record<string, string[]>;
  defaultPermissions: Record<string, string[]>;
}

interface ICors {
  enabled: boolean;
  allowedOrigins: string[];
  allowedMethods: HttpMethod[];
  allowedHeaders: string[];
}

interface IRateLimit {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
}

interface IFullTextSearch {
  enabled: boolean;
  vectorColumn: string;
  language: string;
}

interface IElasticsearch {
  enabled: boolean;
  node: string;
  auth: {
    username: string;
    password: string;
  };
  indices: {
    prefix: string;
    settings: {
      numberOfShards: number;
      numberOfReplicas: number;
    };
  };
  maxRetries: number;
  requestTimeout: number;
  sniffOnStart: boolean;
}

interface IRedisCache {
  host: string;
  port: number;
  password: string;
  ttl: number;
  db: number;
}

interface IInMemoryCache {
  enabled: boolean;
  maxSize: number;
  ttl: number;
}

interface ICacheStrategy {
  ttl: number;
  description: string;
}

interface IStripeConfig {
  publicKey: string;
  secretKey: string;
  currency: string;
}

interface ISmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  tls: {
    rejectUnauthorized: boolean;
  };
}

interface IEmailTemplate {
  subject: string;
  template: string;
  expiryHours?: number;
}

interface IFirebaseConfig {
  enabled: boolean;
  serverKey: string;
  projectId: string;
  clientEmail: string;
  privateKey: string;
  databaseURL: string;
}

interface IApnConfig {
  enabled: boolean;
  keyId: string;
  teamId: string;
  bundle: string;
  key: string;
}

interface ITwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface IWebhookConfig {
  enabled: boolean;
  endpoints: string[];
  retryPolicy: {
    attempts: number;
    backoff: BackoffStrategy;
    initialDelay: number;
  };
}

interface IUIConfig {
  theme: {
    default: Theme;
    availableThemes: Theme[];
  };
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  dateFormat: string;
  timeFormat: string;
  languageSwitcher: boolean;
  defaultTheme: Theme;
  navbar: {
    fixed: boolean;
    height: number;
  };
  footer: {
    visible: boolean;
    height: number;
  };
  forms: {
    validations: {
      onBlur: boolean;
      onSubmit: boolean;
      errorMessages: Record<string, string>;
    };
  };
}

interface IStorageConfig {
  provider: StorageProvider;
  aws: {
    s3: {
      bucketName: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  local: {
    uploadPath: string;
  };
}

export interface IConfig {
  general: {
    appName: string;
    version: string;
    environment: Environment;
    baseUrl: string;
    apiBaseUrl: string;
    defaultLanguage: Language;
    supportedLanguages: Language[];
    timezone: string;
    startWeekOnMonday: boolean;
    logging: ILogging;
  };
  users: {
    hasUsers: boolean;
    fields: Partial<IUserFields>;
    defaultUserRoles: string[];
    guestAccessEnabled: boolean;
    isMultiTenancyEnabled: boolean;
    tenantIdentifier: TenantIdentifier;
    emailVerification: IEmailVerification;
    accountLockout: IAccountLockout;
    authentication: {
      strategies: AuthStrategy[];
      jwt: IJwtConfig;
      oauth: {
        google: IOAuthProvider;
        github: IOAuthProvider;
      };
      passwordPolicy: IPasswordPolicy;
      twoFactorAuth: ITwoFactorAuth;
    };
    session: ISession;
    authorization: IAuthorization;
  };
  security: {
    cors: ICors;
    rateLimit: IRateLimit;
    csrf: {
      enabled: boolean;
      tokenHeader: string;
    };
    encryption: {
      saltRounds: number;
    };
  };
  database: {
    type: DatabaseType;
    host: string;
    port: number;
    username: string;
    password: string;
    databaseName: string;
    pool: {
      max: number;
      min: number;
      idleTimeoutMillis: number;
    };
    search: {
      fullTextSearch: IFullTextSearch;
      elasticsearch: IElasticsearch;
    };
  };
  caching: {
    enabled: boolean;
    defaultCache: CacheType;
    caches: {
      redis: IRedisCache;
      inMemory: IInMemoryCache;
    };
    cacheStrategies: {
      shortLived: ICacheStrategy;
      mediumLived: ICacheStrategy;
      longLived: ICacheStrategy;
    };
  };
  features: {
    payments: {
      stripe: IStripeConfig;
    };
  };
  notifications: {
    enabled: boolean;
    email: {
      enabled: boolean;
      smtp: ISmtpConfig;
      fromAddress: string;
      fromName: string;
      templates: {
        welcome: IEmailTemplate;
        passwordReset: IEmailTemplate;
        verification: IEmailTemplate;
      };
      rateLimiting: {
        enabled: boolean;
        maxPerHour: number;
      };
    };
    push: {
      enabled: boolean;
      providers: {
        firebase: IFirebaseConfig;
        apn: IApnConfig;
      };
      topics: {
        news: string;
        marketing: string;
        system: string;
      };
      defaults: {
        ttl: number;
        priority: NotificationPriority;
        sound: string;
        badge: number;
      };
    };
    sms: {
      enabled: boolean;
      provider: SmsProvider;
      twilio: ITwilioConfig;
      templates: Record<string, string>;
      rateLimiting: {
        enabled: boolean;
        maxPerHour: number;
      };
    };
    inApp: {
      enabled: boolean;
      storage: {
        type: 'database';
        ttl: number;
      };
      maxPerUser: number;
      categories: string[];
    };
    webhooks: IWebhookConfig;
  };
  ui: IUIConfig;
  routing: {
    basePath: string;
    notFoundPath: string;
    protectedRoutes: string[];
  };
  stateManagement: {
    storeType: StoreType;
    persistence: {
      enabled: boolean;
      storageKey: string;
      storageType: StorageType;
    };
  };
  api: {
    retryAttempts: number;
    timeoutMs: number;
    errorHandling: {
      showUserMessage: boolean;
      defaultMessage: string;
    };
  };
  performance: {
    lazyLoading: boolean;
    preloadAssets: string[];
    compression: {
      enabled: boolean;
      type: CompressionType;
      threshold: number;
    };
  };
  analytics: {
    enabled: boolean;
    trackingId: string;
    provider: AnalyticsProvider;
  };
  monitoring: {
    errorTracking: {
      enabled: boolean;
      provider: ErrorTrackingProvider;
      dsn: string;
    };
    performanceMonitoring: {
      enabled: boolean;
      interval: number;
    };
  };
  storage: IStorageConfig;
}
