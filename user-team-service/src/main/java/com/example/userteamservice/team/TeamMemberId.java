package com.example.userteamservice.team;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class TeamMemberId implements Serializable {

    private UUID teamId;
    private UUID userId;

    public TeamMemberId() {}

    public TeamMemberId(UUID teamId, UUID userId) {
        this.teamId = teamId;
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TeamMemberId)) return false;
        TeamMemberId that = (TeamMemberId) o;
        return Objects.equals(teamId, that.teamId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(teamId, userId);
    }
}