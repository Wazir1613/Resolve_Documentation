package com.example.userteamservice.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByOrganizationIdAndEmail(UUID organizationId, String email);
    Optional<User> findByOrganizationIdAndUsername(UUID organizationId, String username);
}