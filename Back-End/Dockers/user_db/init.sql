-- Connect to the new database
\c user_db;
-- Create a sample table
-- CREATE TABLE avatars (
--     id SERIAL PRIMARY KEY
-- );

-- CREATE TABLE users (
--     id SERIAL PRIMARY KEY,
--     first_name VARCHAR(100),
-- 	last_name VARCHAR(100),
-- 	birth_date TIMESTAMP,
-- 	lvl NUMERIC(6, 3),
-- 	bio VARCHAR(500),
-- 	id_avatar INTEGER REFERENCES avatars(id),
-- 	id_account INTEGER
-- );

-- CREATE TABLE friends (
--     id SERIAL PRIMARY KEY,
-- 	user_1 INTEGER REFERENCES users(id) ON DELETE CASCADE,
-- 	user_2 INTEGER REFERENCES users(id) ON DELETE CASCADE
-- );

-- Insert some initial data