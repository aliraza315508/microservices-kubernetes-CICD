package com.in28minutes.microservices.api_gateway.dto;


import jakarta.validation.constraints.NotBlank;

public class LoginRequest {

    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank(message = "Password is required")
    private String password;

    public LoginRequest() {
    }

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    //gets username from login request
    public String getUsername() {
        return username;
    }

    //sets username from login request
    public void setUsername(String username) {
        this.username = username;
    }

    //gets password from login request
    public String getPassword() {
        return password;
    }

    //sets password from login request
    public void setPassword(String password) {
        this.password = password;
    }
}
