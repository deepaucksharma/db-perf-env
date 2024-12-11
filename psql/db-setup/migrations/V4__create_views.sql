-- Create a sample view for reporting
CREATE VIEW app.user_summary AS
SELECT
    COUNT(*) AS total_users,
    MAX(created_at) AS latest_user_created
FROM app.users;
