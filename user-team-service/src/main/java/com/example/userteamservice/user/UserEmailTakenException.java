package com.example.userteamservice.user;

public class UserEmailTakenException extends RuntimeException {
    public UserEmailTakenException(String value) {
        super("Already in use within this organization: " + value);
    }
}