-- Create database and users
CREATE DATABASE IF NOT EXISTS employees;
USE employees;

-- Create users and grant permissions using prepared statements
DELIMITER //
CREATE PROCEDURE setup_users()
BEGIN
    SET @create_user = CONCAT('CREATE USER IF NOT EXISTS ''', @app_user, '''@''%'' IDENTIFIED BY ''', @app_pass, '''');
    SET @grant_privs = CONCAT('GRANT ALL PRIVILEGES ON employees.* TO ''', @app_user, '''@''%''');
    
    PREPARE stmt FROM @create_user;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
    
    PREPARE stmt FROM @grant_privs;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END //
DELIMITER ;

-- Call the procedure with parameters
SET @app_user = 'myuser';
SET @app_pass = 'userpass123';
CALL setup_users();

DROP PROCEDURE IF EXISTS setup_users;
