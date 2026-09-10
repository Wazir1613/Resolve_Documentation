CREATE TABLE users (
                       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                       organization_id UUID NOT NULL,
                       email VARCHAR(255) NOT NULL,
                       username VARCHAR(100) NOT NULL,
                       password_hash VARCHAR(255),
                       full_name VARCHAR(255) NOT NULL,
                       status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
                       created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                       updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                       CONSTRAINT uq_users_org_email UNIQUE (organization_id, email),
                       CONSTRAINT uq_users_org_username UNIQUE (organization_id, username)
);