package com.in28minutes.microservices.api_gateway.controller;

import com.in28minutes.microservices.api_gateway.config.JwtProperties;
import com.in28minutes.microservices.api_gateway.dto.LoginRequest;
import com.in28minutes.microservices.api_gateway.dto.LoginResponse;
import com.in28minutes.microservices.api_gateway.exception.InvalidLoginException;
import com.in28minutes.microservices.api_gateway.service.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final JwtProperties jwtProperties;
    private final JwtService jwtService;


    //we will use JwtProperties to compare login credentials
    //we will use JwtService to generate JWT token
    public AuthController(JwtProperties jwtProperties, JwtService jwtService) {
        this.jwtProperties = jwtProperties;
        this.jwtService = jwtService;
    }


    //login endpoint for generating JWT token
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest loginRequest) {

        boolean validUsername = jwtProperties.getUsername().equals(loginRequest.getUsername());
        boolean validPassword = jwtProperties.getPassword().equals(loginRequest.getPassword());

        if (!validUsername || !validPassword) {
            throw new InvalidLoginException();
        }

        String token = jwtService.generateToken(loginRequest.getUsername());

        return ResponseEntity.ok(new LoginResponse(token));
    }
}