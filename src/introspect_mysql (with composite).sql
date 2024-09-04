WITH check_constraints AS (
    SELECT tc.TABLE_NAME,
        JSON_ARRAYAGG(cc.CHECK_CLAUSE) AS check_constraints
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
        JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS AS cc ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_TYPE = 'CHECK'
        AND tc.TABLE_SCHEMA = '$DB_NAME'
    GROUP BY tc.TABLE_NAME
),
composite_unique_constraints AS (
    SELECT tc.TABLE_NAME,
        JSON_ARRAYAGG(kcu.COLUMN_NAME) AS composite_unique_columns
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
        JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
        AND tc.TABLE_SCHEMA = '$DB_NAME'
    GROUP BY tc.TABLE_NAME,
        tc.CONSTRAINT_NAME
    HAVING COUNT(kcu.COLUMN_NAME) > 1
)
SELECT c.TABLE_NAME AS table_name,
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
            c.COLUMN_KEY = 'UNI'
        )
    ) AS columns,
    IFNULL(cc.check_constraints, JSON_ARRAY()) AS check_constraints,
    IF(
        cuc.composite_unique_columns IS NOT NULL,
        cuc.composite_unique_columns,
        NULL
    ) AS composite_unique_constraints
FROM INFORMATION_SCHEMA.COLUMNS c
    LEFT JOIN check_constraints cc ON c.TABLE_NAME = cc.TABLE_NAME
    LEFT JOIN composite_unique_constraints cuc ON c.TABLE_NAME = cuc.TABLE_NAME
WHERE c.TABLE_SCHEMA = '$DB_NAME'
GROUP BY c.TABLE_NAME,
    cc.check_constraints,
    cuc.composite_unique_columns;