package com.example.userteamservice.user;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
public class UserController
{
    private final UserService userService;

    public UserController(UserService userService)
    {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestParam UUID organizationId, @RequestBody User user)
    {
        user.setOrganizationId(organizationId);
        User created = userService.createUser(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    public List<User> getUsers(@RequestParam UUID organizationId)
    {
        return userService.getUsersForOrganization(organizationId);
    }

    @GetMapping("/{id}")
    public User getUser(@RequestParam UUID organizationId, @PathVariable UUID id)
    {
        return userService.getUserById(organizationId, id);
    }

    @PatchMapping("/{id}")
    public User updateUser(@RequestParam UUID organizationId, @PathVariable UUID id, @RequestBody User updates)
    {
        return userService.updateUser(organizationId, id, updates);
    }
}