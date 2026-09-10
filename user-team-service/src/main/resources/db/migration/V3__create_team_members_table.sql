CREATE TABLE team_members (
                              team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
                              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                              joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                              PRIMARY KEY (team_id, user_id)
);