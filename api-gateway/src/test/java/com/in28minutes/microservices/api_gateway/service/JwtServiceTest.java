package com.in28minutes.microservices.api_gateway.service;

import com.in28minutes.microservices.api_gateway.config.JwtProperties;

public class JwtServiceTest {

    private JwtService jwtService;

    void setUp(){

        JwtProperties jwtProperties = new JwtProperties();

        jwtProperties.setSecret("test-secret-key-test-secret-key-test-secret-key");
        jwtProperties.setExpirationMinutes(60);
        jwtProperties.setUsername("admin");
        jwtProperties.setPassword("admin123");


        jwtProperties.validate


    }
}
