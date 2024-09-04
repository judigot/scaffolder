-- SET @database_name = ;
WITH check_constraints AS (
    SELECT tc.table_name,
        JSON_ARRAYAGG(cc.check_clause) AS check_constraints
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
        JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS AS cc ON tc.constraint_name = cc.constraint_name
    WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = '$DB_NAME'
    GROUP BY tc.table_name
)
SELECT c.table_name AS table_name,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'column_name',
            c.COLUMN_NAME,
            'data_type',
            c.DATA_TYPE,
            'is_nullable',
            c.IS_NULLABLE,
            'column_default',
            IFNULL(c.COLUMN_DEFAULT, NULL),
            'primary_key',
            c.COLUMN_KEY = 'PRI',
            'unique',
            c.COLUMN_KEY = 'UNI',
            'foreign_key',
            CASE
                WHEN k.REFERENCED_TABLE_NAME IS NOT NULL THEN JSON_OBJECT(
                    'foreign_table_name',
                    k.REFERENCED_TABLE_NAME,
                    'foreign_column_name',
                    k.REFERENCED_COLUMN_NAME
                )
                ELSE NULL
            END
        )
    ) AS columns,
    IFNULL(cc.check_constraints, JSON_ARRAY()) AS check_constraints
FROM INFORMATION_SCHEMA.COLUMNS c
    LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k ON c.TABLE_SCHEMA = k.TABLE_SCHEMA
    AND c.TABLE_NAME = k.TABLE_NAME
    AND c.COLUMN_NAME = k.COLUMN_NAME
    AND k.REFERENCED_TABLE_NAME IS NOT NULL
    LEFT JOIN check_constraints cc ON c.TABLE_NAME = cc.table_name
WHERE c.TABLE_SCHEMA = '$DB_NAME'
GROUP BY c.table_name,
    cc.check_constraints;