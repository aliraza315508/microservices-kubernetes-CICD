# Application Architecture

This document explains the application architecture side of this project.

The project is a Java Spring Boot currency conversion system built using a microservices architecture. Each service has a separate responsibility and communicates with other services through REST APIs and service discovery.

---

## Tech Stack Used in Application Architecture

**Language:** Java 17;  
**Framework:** Spring Boot;  
**Web Layer:** Spring Web, REST APIs;  
**Microservices:** Spring Cloud Gateway, Eureka Naming Server, OpenFeign;  
**Security:** Spring Security, JWT, JJWT;  
**Database Access:** Spring Data JPA;  
**Database:** PostgreSQL;  
**Database Migration:** Flyway;  
**Service Communication:** REST Template, OpenFeign;  
**Observability:** Micrometer Tracing, Brave, Zipkin;  
**Validation:** Jakarta Bean Validation;  
**Build Tool:** Maven;

---

## Application Overview

The application is a currency conversion system made of multiple Spring Boot services.

The main request flow is:

```text
Client
  ↓
API Gateway
  ↓
Currency Conversion Service
  ↓
Currency Exchange Service
  ↓
PostgreSQL Database
```

A client sends a request to convert a currency amount. The request first reaches the API Gateway. The gateway validates the JWT token and forwards the request to the correct downstream service.

The currency conversion service calculates the final converted value by getting exchange rate data from the currency exchange service. The currency exchange service owns the exchange rate data and reads it from PostgreSQL.

---

## Services

The project contains four main Spring Boot services.

**naming-server:** Eureka service discovery server; runs on port `8761`; allows services to register themselves and discover other services;

**api-gateway:** Central entry point for application requests; runs on port `8765`; handles routing, JWT security, and request filtering;

**currency-exchange-service:** Provides exchange rate data; runs on port `8000`; uses Spring Data JPA, PostgreSQL, and Flyway;

**currency-conversion-service:** Calculates converted currency values; runs on port `8100`; calls the exchange service using REST Template and OpenFeign;

---

## naming-server

The `naming-server` service is the Eureka server.

It is responsible for service discovery. Other services register with Eureka so they can discover each other by service name instead of depending on fixed IP addresses.

Important configuration:

```properties
spring.application.name=naming-server
server.port=${SERVER_PORT:8761}

eureka.client.register-with-eureka=false
eureka.client.fetch-registry=false
```

The naming server does not register with itself because it is the discovery server.

---

## api-gateway

The `api-gateway` service is the main entry point into the application.

It is responsible for:

**Routing:** Routes client requests to downstream services;  
**Security:** Protects APIs using JWT authentication;  
**Authentication:** Provides login functionality for token generation;  
**Filtering:** Validates tokens before allowing protected requests;  
**Service Discovery:** Uses Eureka service names for routing;  
**Logging:** Logs incoming request paths;  
**Tracing:** Sends tracing data to Zipkin;

Example gateway route configuration:

```properties
spring.cloud.gateway.routes[0].id=currency-exchange-service
spring.cloud.gateway.routes[0].uri=lb://currency-exchange-service
spring.cloud.gateway.routes[0].predicates[0]=Path=/currency-exchange/**

spring.cloud.gateway.routes[1].id=currency-conversion-service
spring.cloud.gateway.routes[1].uri=lb://currency-conversion-service
spring.cloud.gateway.routes[1].predicates[0]=Path=/currency-conversion/**,/currency-conversion-feign/**
```

The `lb://` prefix means the gateway routes by service name through service discovery instead of using a fixed URL.

---

## currency-exchange-service

The `currency-exchange-service` provides exchange rate data.

Example endpoint:

```text
GET /currency-exchange/from/USD/to/INR
```

Main responsibilities:

**Exchange Rate Lookup:** Finds exchange rate data for a currency pair;  
**Database Access:** Reads exchange rate records from PostgreSQL;  
**JPA Repository:** Uses Spring Data JPA for database queries;  
**Flyway Migration:** Creates and seeds the database table;  
**Validation:** Validates required path variables;  
**Exception Handling:** Returns controlled errors when an exchange rate is not found;  
**Tracing:** Sends tracing data to Zipkin;

The controller exposes the exchange API:

/*```java
@GetMapping("/currency-exchange/from/{from}/to/{to}")
public CurrencyExchange retrieveExchangeValue(...)
```*/

The repository finds records by source and target currency:

```java
CurrencyExchange findByFromAndTo(String from, String to);
```

The entity represents exchange rate data:

```java
@Entity
public class CurrencyExchange {
    @Id
    private Long id;

    @Column(name = "currency_from")
    private String from;

    @Column(name = "currency_to")
    private String to;

    @Column(name = "conversion_multiple")
    private BigDecimal conversionMultiple;

    @Column(name = "environment")
    private String environment;
}
```

---

## currency-conversion-service

The `currency-conversion-service` calculates the final converted amount.

REST Template endpoint:

```text
GET /currency-conversion/from/USD/to/INR/quantity/10
```

Feign endpoint:

```text
GET /currency-conversion-feign/from/USD/to/INR/quantity/10
```

Main responsibilities:

**Conversion Logic:** Multiplies quantity by the exchange rate;  
**Service Communication:** Calls the currency exchange service;  
**REST Template:** Supports direct HTTP-based service call;  
**OpenFeign:** Supports service-name-based communication through Eureka;  
**Validation:** Validates currency values and quantity;  
**Exception Handling:** Handles downstream service failures;  
**Tracing:** Sends tracing data to Zipkin;

Calculation formula:

```text
totalCalculatedAmount = quantity × conversionMultiple
```

Example:

```text
quantity = 10
conversionMultiple = 65.00
totalCalculatedAmount = 650.00
```

---

## API Gateway Request Flow

The API Gateway is the first application service that receives client traffic.

Request flow:

```text
Client
  ↓
API Gateway
  ↓
JWT Authentication Filter
  ↓
Route Matching
  ↓
Downstream Service
```

Public endpoints:

```text
/auth/login
/actuator/health
```

Protected endpoints require a valid JWT token.

---

## JWT Authentication

JWT authentication is implemented in the `api-gateway` service.

Main classes:

```text
SecurityConfig.java
JwtAuthenticationFilter.java
JwtService.java
JwtProperties.java
AuthController.java
LoginRequest.java
LoginResponse.java
```

Authentication flow:

```text
User sends username/password to /auth/login
  ↓
AuthController validates credentials
  ↓
JwtService generates signed JWT token
  ↓
Client sends token in Authorization header
  ↓
JwtAuthenticationFilter validates token
  ↓
Request continues to downstream service
```

Expected header format:

```text
Authorization: Bearer <token>
```

JWT configuration is externalized:

```properties
jwt.secret=${JWT_SECRET}
jwt.expiration-minutes=${JWT_EXPIRATION_MINUTES:60}
jwt.username=${JWT_USERNAME}
jwt.password=${JWT_PASSWORD}
```

This keeps sensitive security values out of the application code.

---

## Service Discovery with Eureka

Eureka is used for service discovery between microservices.

Common Eureka client configuration:

```properties
eureka.client.serviceUrl.defaultZone=${EUREKA_CLIENT_SERVICEURL_DEFAULTZONE:http://localhost:8761/eureka}
eureka.instance.prefer-ip-address=true
```

This allows services such as the API Gateway and currency conversion service to find downstream services using logical service names.

Example service names:

```text
currency-exchange-service
currency-conversion-service
```

This avoids hardcoding service IP addresses in application logic.

---

## Service-to-Service Communication

The project uses two service communication approaches.

### REST Template

The currency conversion service can call the exchange service using a configured URL:

```properties
currency-exchange-service.url=${CURRENCY_EXCHANGE_SERVICE_URL:http://localhost:8000}
```

This supports direct HTTP communication.

### OpenFeign

The project also includes a Feign client:

/*```java
@FeignClient(name="currency-exchange-service")
public interface CurrencyExchangeProxy {
    @GetMapping("/currency-exchange/from/{from}/to/{to}")
    CurrencyConversion retrieveExchangeValue(...);
}
```*/

Feign works with Eureka because the target service can be called by service name.

---

## Database Design

The `currency-exchange-service` owns the exchange rate data.

Database configuration:

```properties
spring.datasource.url=jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
```

Main table:

```text
currency_exchange
```

Main columns:

```text
id
currency_from
currency_to
conversion_multiple
environment
```

Database responsibilities are kept inside the exchange service. The conversion service does not directly access the database. It calls the exchange service through an API.

This keeps database ownership clear and follows the microservices principle that a service should own its own data access.

---

## Flyway Database Migration

Flyway is used by the `currency-exchange-service` for database schema migration.

Flyway configuration:

```properties
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.jpa.hibernate.ddl-auto=validate
```

Migration files:

```text
currency-exchange-service/src/main/resources/db/migration/
  V1__create_currency_exchange_table.sql
  V2__seed_currency_exchange_data.sql
```

### V1 Migration

Creates the `currency_exchange` table.

```sql
create table currency_exchange (
  id bigint primary key,
  currency_from varchar(255) not null,
  currency_to varchar(255) not null,
  conversion_multiple numeric(38, 2) not null,
  environment varchar(255)
);
```

### V2 Migration

Seeds the table with sample exchange rate data.

Example currency pairs:

```text
USD to INR
EUR to INR
AUD to INR
GBP to INR
CAD to INR
```

Flyway makes database setup repeatable and version-controlled.

---

## Zipkin Distributed Tracing

Zipkin is used for distributed tracing across services.

Tracing dependencies include:

```text
micrometer-tracing-bridge-brave
zipkin-reporter-brave
```

Tracing configuration:

```properties
management.tracing.enabled=${MANAGEMENT_TRACING_ENABLED:true}
management.tracing.sampling.probability=${TRACING_SAMPLING_PROBABILITY:1.0}
management.zipkin.tracing.endpoint=${ZIPKIN_ENDPOINT:http://localhost:9411/api/v2/spans}
```

Zipkin helps trace a request as it moves through:

```text
API Gateway
  ↓
Currency Conversion Service
  ↓
Currency Exchange Service
```

This helps understand request flow, latency, and service interaction in a microservices system.

---

## Exception Handling

The project includes structured exception handling.

API Gateway exception classes:

```text
GlobalExceptionHandler.java
InvalidLoginException.java
ApiErrorResponse.java
```

Currency conversion exception classes:

```text
CurrencyConversionException.java
GlobalExceptionHandler.java
ApiErrorResponse.java
```

Currency exchange exception classes:

```text
CurrencyExchangeNotFoundException.java
GlobalExceptionHandler.java
ApiErrorResponse.java
```

This improves API behavior by returning clear error responses instead of raw stack traces.

---

## Validation

The project uses validation annotations to reject invalid requests.

Examples:

/*```java
@NotBlank(message = "From currency is required")
@NotBlank(message = "To currency is required")
@Positive(message = "Quantity must be greater than zero")
```   */

Validation protects the application from invalid currency values and invalid conversion quantities.

---

## Production-Style Application Decisions

This project includes several production-style application architecture decisions.

**API Gateway Pattern:** Client requests enter through one gateway instead of directly calling every service;

**Centralized JWT Security:** Authentication is handled at the gateway layer;

**Service Discovery:** Services use Eureka service names instead of hardcoded service addresses;

**Clear Service Ownership:** The exchange service owns exchange rate data and database access;

**Database Migration:** Flyway manages schema creation and seed data;

**Externalized Configuration:** Sensitive and environment-specific values come from environment variables;

**Structured Error Handling:** Custom exceptions return controlled API error responses;

**Request Validation:** Invalid inputs are rejected before business logic runs;

**Distributed Tracing:** Zipkin traces requests across multiple services;

**Separate Communication Options:** REST Template and OpenFeign demonstrate two approaches to service-to-service communication;

---

## Summary

This document explains the application architecture side of this project.

The Java application side demonstrates Spring Boot, REST APIs, API Gateway routing, JWT authentication, Eureka discovery, Spring Data JPA, PostgreSQL, Flyway, validation, exception handling, service-to-service communication, and Zipkin tracing.
