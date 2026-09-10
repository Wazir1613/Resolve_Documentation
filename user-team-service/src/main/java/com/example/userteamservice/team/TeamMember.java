package com.example.userteamservice.team;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "team_members")
@IdClass(TeamMemberId.class)
public class TeamMember {

    @Id
    @Column(name = "team_id")
    private UUID teamId;

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private Instant joinedAt;

    @PrePersist
    protected void onCreate() {
        joinedAt = Instant.now();
    }

    public UUID getTeamId() { return teamId; }
    public void setTeamId(UUID teamId) { this.teamId = teamId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public Instant getJoinedAt() { return joinedAt; }
}