package com.in28minutes.microservices.api_gateway.dto;


public class LoginRequest {

    private String username;
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
