package com.example.userteamservice.user;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(UserNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "status", 404,
                "code", "USER_NOT_FOUND",
                "message", ex.getMessage()
        ));
    }

    @ExceptionHandler(UserEmailTakenException.class)
    public ResponseEntity<Map<String, Object>> handleEmailTaken(UserEmailTakenException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "status", 409,
                "code", "USER_EMAIL_TAKEN",
                "message", ex.getMessage()
        ));
    }
}