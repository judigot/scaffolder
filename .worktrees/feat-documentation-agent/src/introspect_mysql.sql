WITH check_constraints AS (
    SELECT tc.TABLE_NAME,
           JSON_ARRAYAGG(cc.CHECK_CLAUSE) AS check_constraints
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
    JOIN INFORMATION_SCHEMA.CHECK_CONSTRAINTS AS cc
        ON tc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
    WHERE tc.CONSTRAINT_TYPE = 'CHECK'
      AND tc.TABLE_SCHEMA = '$DB_NAME'
    GROUP BY tc.TABLE_NAME
),
composite_unique_constraints AS (
    SELECT tc.TABLE_NAME,
           JSON_ARRAYAGG(kcu.COLUMN_NAME) AS composite_unique_columns
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
    WHERE tc.CONSTRAINT_TYPE = 'UNIQUE'
      AND tc.TABLE_SCHEMA = '$DB_NAME'
    GROUP BY tc.TABLE_NAME, tc.CONSTRAINT_NAME
    HAVING COUNT(kcu.COLUMN_NAME) > 1
)
SELECT c.TABLE_NAME AS table_name,
       JSON_ARRAYAGG(
           JSON_OBJECT(
               'column_name', c.COLUMN_NAME,
               'data_type', c.DATA_TYPE,
               'is_nullable', c.IS_NULLABLE,
               'column_default', IFNULL(c.COLUMN_DEFAULT, NULL),
               'primary_key', c.COLUMN_KEY = 'PRI',
               'unique', c.COLUMN_KEY = 'UNI',
               'foreign_key', CASE
                   WHEN k.REFERENCED_TABLE_NAME IS NOT NULL THEN JSON_OBJECT(
                       'foreign_table_name', k.REFERENCED_TABLE_NAME,
                       'foreign_column_name', k.REFERENCED_COLUMN_NAME
                   )
                   ELSE NULL
               END
           )
       ) AS columns,
       NULLIF(cc.check_constraints, JSON_ARRAY()) AS check_constraints,
       IFNULL(
           (SELECT JSON_ARRAYAGG(cuc.composite_unique_columns)
            FROM composite_unique_constraints cuc
            WHERE cuc.TABLE_NAME = c.TABLE_NAME),
           NULL
       ) AS composite_unique_constraints
FROM INFORMATION_SCHEMA.COLUMNS c
LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k 
    ON c.TABLE_SCHEMA = k.TABLE_SCHEMA
    AND c.TABLE_NAME = k.TABLE_NAME
    AND c.COLUMN_NAME = k.COLUMN_NAME
    AND k.REFERENCED_TABLE_NAME IS NOT NULL
LEFT JOIN check_constraints cc ON c.TABLE_NAME = cc.TABLE_NAME
WHERE c.TABLE_SCHEMA = '$DB_NAME'
GROUP BY c.TABLE_NAME, cc.check_constraints
ORDER BY c.TABLE_NAME;
