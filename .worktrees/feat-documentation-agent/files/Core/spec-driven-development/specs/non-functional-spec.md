---
id: non-functional-spec
type: guide
domain: generic
status: stable
version: 1.0.0
---

# Non-Functional Requirements Specification

## Purpose

Provide guidance and checklists for cross-cutting concerns that apply to all features. AI agents use this document to ensure implementations meet performance, security, reliability, and observability standards.

## When to use

Reference this document when:
- Implementing any new feature
- Reviewing code for production readiness
- Planning infrastructure requirements
- Addressing security and compliance needs

## Required sections

This guide covers:
- Performance requirements
- Security requirements
- Reliability and observability
- Scalability considerations

Each section includes explicit checklists for AI agents.

---

## Performance

### Response Time Targets

| Operation Type | Target (p50) | Target (p95) | Target (p99) |
|----------------|--------------|--------------|--------------|
| API read (simple) | < 50ms | < 100ms | < 200ms |
| API read (complex) | < 200ms | < 500ms | < 1s |
| API write | < 100ms | < 300ms | < 500ms |
| Page load (initial) | < 1s | < 2s | < 3s |
| Page load (subsequent) | < 500ms | < 1s | < 1.5s |
| Search/filter | < 300ms | < 700ms | < 1s |

### Throughput Targets

| Metric | Minimum | Target |
|--------|---------|--------|
| Concurrent users | 100 | 1000 |
| Requests per second | 100 | 1000 |
| Database connections | 20 | 100 |

### Payload Size Limits

| Context | Limit | Handling |
|---------|-------|----------|
| API request body | 1MB | Return 413 Payload Too Large |
| API response | 5MB | Paginate or stream |
| File upload | 10MB | Validate before processing |
| WebSocket message | 64KB | Split large messages |

### Caching Strategy

| Resource Type | Cache Location | TTL | Invalidation |
|---------------|----------------|-----|--------------|
| Static assets | CDN + browser | 1 year | Version in filename |
| API responses (public) | CDN | 5 minutes | Cache-Control header |
| API responses (user) | Application | 1 minute | On mutation |
| Database queries | Application | 5 minutes | On related write |
| Session data | Redis/Memory | 1 hour | On logout |

### Pagination Guidelines

| Scenario | Strategy | Default Page Size | Max Page Size |
|----------|----------|-------------------|---------------|
| List endpoints | Offset pagination | 20 | 100 |
| Large datasets | Cursor pagination | 50 | 200 |
| Search results | Offset pagination | 10 | 50 |
| Infinite scroll | Cursor pagination | 20 | 50 |

### Performance Checklist

- [ ] Response time targets defined for critical endpoints
- [ ] Database queries analyzed for N+1 problems
- [ ] Appropriate indexes created for query patterns
- [ ] Caching implemented for frequently accessed data
- [ ] Pagination implemented for list endpoints
- [ ] Payload sizes validated on input
- [ ] Large responses paginated or streamed
- [ ] Static assets served via CDN
- [ ] Bundle size optimized (code splitting, tree shaking)
- [ ] Images optimized and lazy loaded

---

## Security

### Input Validation

| Validation | Implementation | Purpose |
|------------|----------------|---------|
| Type checking | Schema validation | Prevent type confusion |
| Length limits | Min/max constraints | Prevent overflow/DoS |
| Format validation | Regex patterns | Ensure expected format |
| Sanitization | Escape/encode | Prevent injection |
| Whitelist | Allowed values only | Prevent unexpected input |

### Injection Prevention

| Attack Vector | Prevention | Implementation |
|---------------|------------|----------------|
| SQL Injection | Parameterized queries | Never concatenate user input |
| XSS | Output encoding | Escape HTML entities |
| Command Injection | Avoid shell execution | Use libraries instead |
| Path Traversal | Validate paths | Whitelist allowed paths |
| LDAP Injection | Escape special chars | Use LDAP libraries |

### Authentication Requirements

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| Password storage | bcrypt (cost 12+) | Never store plaintext |
| Session tokens | 256-bit random | Cryptographically secure RNG |
| Token expiration | 1 hour access, 7 day refresh | Configurable per environment |
| Failed attempts | Lock after 5 failures | Exponential backoff |
| Password requirements | Min 8 chars, complexity | Configurable policy |

### Authorization Requirements

| Principle | Implementation |
|-----------|----------------|
| Least privilege | Grant minimum required permissions |
| Defense in depth | Check at multiple layers |
| Fail secure | Deny on error |
| Complete mediation | Check every access |
| Separation of duties | Require multiple approvers for sensitive actions |

### Sensitive Data Handling

| Data Type | At Rest | In Transit | In Logs |
|-----------|---------|------------|---------|
| Passwords | Hashed (bcrypt) | HTTPS only | Never log |
| API keys | Encrypted | HTTPS only | Masked |
| PII | Encrypted | HTTPS only | Anonymized |
| Session tokens | Encrypted | HTTPS only | Never log |
| Credit cards | Tokenized | PCI compliant | Never log |

### Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Force HTTPS |
| Content-Security-Policy | [appropriate policy] | Prevent XSS |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | Legacy XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer info |

### Rate Limiting

| Scope | Limit | Window | Response |
|-------|-------|--------|----------|
| Per IP (public) | 60 requests | 1 minute | 429 + Retry-After |
| Per user (authenticated) | 300 requests | 1 minute | 429 + Retry-After |
| Per user (sensitive actions) | 10 requests | 1 minute | 429 + Retry-After |
| Login attempts | 5 attempts | 15 minutes | Lock account |

### Security Checklist

- [ ] All inputs validated and sanitized
- [ ] Parameterized queries used for database access
- [ ] Output properly encoded to prevent XSS
- [ ] Authentication uses secure password hashing
- [ ] Session tokens are cryptographically random
- [ ] Authorization checked on every request
- [ ] Sensitive data encrypted at rest
- [ ] All traffic uses HTTPS
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] CORS configured restrictively
- [ ] Secrets stored in environment variables
- [ ] Dependencies scanned for vulnerabilities
- [ ] Error messages don't leak sensitive info

---

## Reliability and Observability

### Logging Guidelines

| Log Level | When to Use | Examples |
|-----------|-------------|----------|
| ERROR | Operation failed, needs attention | Unhandled exception, DB connection lost |
| WARN | Unexpected but handled | Retry succeeded, deprecated API used |
| INFO | Significant business events | User login, order placed, payment received |
| DEBUG | Development troubleshooting | Function entry/exit, variable values |

### Log Format

Use structured logging with consistent fields:

```typescript
interface LogEntry {
  timestamp: string;       // ISO 8601
  level: "ERROR" | "WARN" | "INFO" | "DEBUG";
  message: string;         // Human readable
  service: string;         // Service name
  requestId: string;       // Correlation ID
  userId?: string;         // If authenticated (anonymized)
  duration?: number;       // For timed operations
  error?: {
    name: string;
    message: string;
    stack?: string;        // Only in non-production
  };
  metadata?: Record<string, unknown>;  // Additional context
}
```

### What to Log

| Event | Level | Required Fields |
|-------|-------|-----------------|
| Request received | INFO | method, path, requestId |
| Request completed | INFO | method, path, status, duration, requestId |
| Authentication failure | WARN | reason, ip (anonymized), requestId |
| Authorization failure | WARN | userId, resource, action, requestId |
| Database error | ERROR | operation, error, requestId |
| External service call | INFO | service, operation, duration, status |
| Business event | INFO | eventType, relevant IDs |

### What NOT to Log

- Passwords or credentials
- Full credit card numbers
- Personal health information
- Session tokens or API keys
- Full stack traces in production
- Sensitive PII without anonymization

### Metrics

| Metric Type | Examples | Purpose |
|-------------|----------|---------|
| Counter | requests_total, errors_total | Track occurrences |
| Gauge | active_connections, queue_size | Track current state |
| Histogram | request_duration, response_size | Track distributions |

### Essential Metrics

```
http_requests_total{method, path, status}
http_request_duration_seconds{method, path}
http_request_size_bytes{method, path}
http_response_size_bytes{method, path}

db_queries_total{operation, table}
db_query_duration_seconds{operation}
db_connections_active
db_connections_idle

cache_hits_total{cache}
cache_misses_total{cache}

business_events_total{event_type}
```

### Health Checks

| Check Type | Endpoint | Purpose | Timeout |
|------------|----------|---------|---------|
| Liveness | /health/live | Is process running? | 1s |
| Readiness | /health/ready | Can handle traffic? | 5s |
| Dependency | /health/deps | Are dependencies up? | 10s |

### Health Check Response

```typescript
interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    name: string;
    status: "pass" | "fail";
    duration: number;
    message?: string;
  }[];
}
```

### Distributed Tracing

| Component | Requirement |
|-----------|-------------|
| Trace ID | Propagate across all services |
| Span ID | Create for each operation |
| Parent ID | Link child spans to parent |
| Context | Pass via headers (W3C Trace Context) |

### Alerting Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| Error rate > 1% | Warning | Notify on-call |
| Error rate > 5% | Critical | Page on-call |
| Latency p95 > 2x target | Warning | Notify on-call |
| Latency p95 > 5x target | Critical | Page on-call |
| Service unavailable | Critical | Page on-call |
| Disk > 80% | Warning | Notify on-call |
| Disk > 95% | Critical | Page on-call |

### Observability Checklist

- [ ] Structured logging implemented
- [ ] Request/response logged with correlation ID
- [ ] Errors logged with context
- [ ] Sensitive data excluded from logs
- [ ] Essential metrics exposed
- [ ] Health check endpoints implemented
- [ ] Trace context propagated
- [ ] Alerting thresholds configured
- [ ] Dashboard created for key metrics
- [ ] Runbook created for common alerts

---

## Scalability

### Statelessness Requirements

| Principle | Implementation |
|-----------|----------------|
| No local session storage | Use distributed cache (Redis) |
| No local file storage | Use object storage (S3) |
| No local caching | Use distributed cache |
| Request independence | Each request contains all needed context |
| Process disposability | Fast startup, graceful shutdown |

### Horizontal Scaling

| Component | Strategy | Considerations |
|-----------|----------|----------------|
| Web servers | Load balancer | Sticky sessions only if required |
| Background workers | Queue-based | Ensure idempotent processing |
| Database reads | Read replicas | Acceptable replication lag |
| Database writes | Vertical scaling / sharding | Partition strategy |
| Cache | Clustered Redis | Consistent hashing |

### Database Scaling

| Strategy | When to Use | Trade-offs |
|----------|-------------|------------|
| Read replicas | Read-heavy workloads | Replication lag |
| Connection pooling | High connection count | Pool exhaustion |
| Query optimization | Before scaling | Requires analysis |
| Vertical scaling | Quick win | Cost, limits |
| Sharding | Extreme scale | Complexity |

### Graceful Degradation

| Scenario | Strategy | User Experience |
|----------|----------|-----------------|
| Database slow | Return cached data | Slightly stale data |
| External service down | Skip or queue | Feature unavailable |
| High load | Shed non-essential | Core features only |
| Partial outage | Circuit breaker | Fail fast |

### Resource Limits

| Resource | Limit | Handling |
|----------|-------|----------|
| Memory per process | 512MB - 2GB | Monitor and restart |
| CPU per process | 1-2 cores | Horizontal scale |
| Database connections | 20-100 per instance | Pool management |
| File descriptors | 65535 | OS configuration |
| Request timeout | 30s | Return 504 |

### Scalability Checklist

- [ ] Application is stateless
- [ ] Session data in distributed store
- [ ] File storage uses object storage
- [ ] Database connection pooling configured
- [ ] Read replicas configured for read-heavy endpoints
- [ ] Caching layer implemented
- [ ] Queue-based processing for background tasks
- [ ] Circuit breakers for external services
- [ ] Graceful shutdown implemented
- [ ] Resource limits configured
- [ ] Auto-scaling policies defined
- [ ] Load testing performed

---

## Summary Checklist for AI Agents

Before considering a feature production-ready:

### Performance

- [ ] Latency targets defined for critical endpoints
- [ ] Database queries optimized
- [ ] Caching strategy implemented
- [ ] Pagination for list endpoints
- [ ] Bundle size acceptable

### Security

- [ ] All inputs validated
- [ ] Injection attacks prevented
- [ ] Authentication secure
- [ ] Authorization enforced
- [ ] Sensitive data protected
- [ ] Security headers set

### Reliability

- [ ] Logging implemented
- [ ] Metrics exposed
- [ ] Health checks available
- [ ] Errors handled gracefully
- [ ] Alerts configured

### Scalability

- [ ] Stateless design
- [ ] Database connections managed
- [ ] External services resilient
- [ ] Resource limits set
- [ ] Load tested

