CREATE INDEX IF NOT EXISTS idx_users_org
    ON users (organization_id);

CREATE INDEX IF NOT EXISTS idx_users_org_status
    ON users (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_users_created_at
    ON users (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_teams_org
    ON teams (organization_id);

CREATE INDEX IF NOT EXISTS idx_teams_org_created_at
    ON teams (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_members_user
    ON team_members (user_id, team_id);