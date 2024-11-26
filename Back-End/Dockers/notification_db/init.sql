-- Create a test table
CREATE TABLE test_table (
	id SERIAL PRIMARY KEY,
	name VARCHAR(50) NOT NULL
);

-- Insert some test data
INSERT INTO test_table (name) VALUES ('Alice'), ('Bob'), ('Charlie');

-- Query the test data
SELECT * FROM test_table;