package com.in28minutes.microservices.api_gateway.service;

import com.in28minutes.microservices.api_gateway.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        JwtProperties jwtProperties = new JwtProperties();

        jwtProperties.setSecret("test-secret-key-test-secret-key-test-secret-key");
        jwtProperties.setExpirationMinutes(60);
        jwtProperties.setUsername("admin");
        jwtProperties.setPassword("admin123");

        jwtService = new JwtService(jwtProperties);
    }

    @Test
    void generateTokenShouldCreateToken() {
        String token = jwtService.generateToken("admin");

        assertNotNull(token);
        assertFalse(token.isBlank());
    }

    @Test
    void extractUsernameShouldReturnTokenSubject() {
        String token = jwtService.generateToken("admin");

        String username = jwtService.extractUsername(token);

        assertEquals("admin", username);
    }

    @Test
    void isTokenValidShouldReturnTrueForCorrectUsername() {
        String token = jwtService.generateToken("admin");

        boolean result = jwtService.isTokenValid(token, "admin");

        assertTrue(result);
    }

    @Test
    void isTokenValidShouldReturnFalseForWrongUsername() {
        String token = jwtService.generateToken("admin");

        boolean result = jwtService.isTokenValid(token, "wrong-user");

        assertFalse(result);
    }
}