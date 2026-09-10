package com.example.userteamservice.user;

import org.springframework.stereotype.Service;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(User user) {
        if (userRepository.findByOrganizationIdAndEmail(user.getOrganizationId(), user.getEmail()).isPresent()) {
            throw new UserEmailTakenException(user.getEmail());
        }
        if (userRepository.findByOrganizationIdAndUsername(user.getOrganizationId(), user.getUsername()).isPresent()) {
            throw new UserEmailTakenException(user.getUsername());
        }
        return userRepository.save(user);
    }

    public List<User> getUsersForOrganization(UUID organizationId) {
        return userRepository.findAll().stream()
                .filter(u -> u.getOrganizationId().equals(organizationId))
                .toList();
    }

    public User getUserById(UUID organizationId, UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException(id));
        if (!user.getOrganizationId().equals(organizationId)) {
            throw new UserNotFoundException(id); // 404, not 403 — per contract's tenant-isolation rule
        }
        return user;
    }

    public User updateUser(UUID organizationId, UUID id, User updates) {
        User existing = getUserById(organizationId, id);

        if (updates.getEmail() != null && !updates.getEmail().equals(existing.getEmail())) {
            if (userRepository.findByOrganizationIdAndEmail(organizationId, updates.getEmail()).isPresent()) {
                throw new UserEmailTakenException(updates.getEmail());
            }
            existing.setEmail(updates.getEmail());
        }
        if (updates.getUsername() != null) {
            existing.setUsername(updates.getUsername());
        }
        if (updates.getFullName() != null) {
            existing.setFullName(updates.getFullName());
        }
        if (updates.getStatus() != null) {
            existing.setStatus(updates.getStatus());
        }

        return userRepository.save(existing);
    }
}