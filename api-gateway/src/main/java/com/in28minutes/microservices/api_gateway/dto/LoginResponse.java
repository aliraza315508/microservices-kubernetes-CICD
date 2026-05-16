package com.in28minutes.microservices.api_gateway.dto;

public class LoginResponse {

    private String token;

    public LoginResponse() {
    }

    public LoginResponse(String token) {
        this.token = token;
    }

    //gets generated jwt token
    public String getToken() {
        return token;
    }

    //sets generated jwt token
    public void setToken(String token) {
        this.token = token;
    }
}