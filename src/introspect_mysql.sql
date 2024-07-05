-- SET @database_name = ;
SELECT c.table_name,
    JSON_OBJECT(
        'columns',
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
                'check_constraints',
                JSON_ARRAY(),
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
        )
    ) AS table_definition
FROM INFORMATION_SCHEMA.COLUMNS c
    LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE k ON c.TABLE_SCHEMA = k.TABLE_SCHEMA
    AND c.TABLE_NAME = k.TABLE_NAME
    AND c.COLUMN_NAME = k.COLUMN_NAME
    AND k.REFERENCED_TABLE_NAME IS NOT NULL
WHERE c.TABLE_SCHEMA = '$DB_NAME'
GROUP BY c.table_name;