-- Add columns to pms.employees
ALTER TABLE pms.employees ADD password_hash NVARCHAR(255) NULL;
ALTER TABLE pms.employees ADD must_change_password BIT DEFAULT 1;
ALTER TABLE pms.employees ADD last_login DATETIME NULL;
ALTER TABLE pms.employees ADD login_attempts INT DEFAULT 0;
ALTER TABLE pms.employees ADD locked_until DATETIME NULL;

-- Add index for login
CREATE INDEX ix_employees_login ON pms.employees(employee_code, is_active);

-- Set default values for existing users
-- Note: '1234' hash will be handled by the application logic if password_hash is null, 
-- but we can set must_change_password to 1 for all existing users.
UPDATE pms.employees SET must_change_password = 1;
