import supabase from "../services/supabase-client.js";

// Configuration for protected tables
const PROTECTED_TABLES = ['query_history', 'other_table_to_protect'];

const validateQuery = async (query) => {
  /** Validate Query
   * CREATE OR REPLACE FUNCTION public.validate_query(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN json_build_object('valid', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'valid', false,
    'error', SQLERRM
  );
END;
$$;
```
*/
try {
    if (query === "") {
      return {isValid: false , msg: "Query is empty" , error: ""};
    }

    const {data } = await supabase.rpc("validate_query" , {query});
    console.log("validation data" , data)
    console.log("isValid" , data);
    // return response;

    return {isValid: data.valid , queryErr: null , backendErr: null}
    // return {isValid: data.valid , msg: "" , error: ""};
  } catch (error) {
    console.error("Error validating the query" , error);
    return {isValid: false , queryErr: "" , backendErr: error || ""}
  }
}

const saveQueryHistory = async (query , exec_time , success , error_message) => {
  /**
CREATE OR REPLACE FUNCTION public.save_query_history(
  query TEXT,
  exec_time INTEGER,
  success BOOLEAN,
  error TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO query_history(query, execution_time, is_successful, error_message)
  VALUES (query, exec_time, success, error);
END;
$$; */

  try {
    // const { data , error } = await supabase.rpc("save_query_history" , {query , exec_time , success , error_message});
    await supabase.rpc("save_query_history" , {error: error_message , exec_time , query , success});

    console.log("history saved in query history table" ,);
    // return data;
  } catch (error) {
    console.error("Error saving the query history" , error);
    throw error;
  }
}


const executeQuery = async (query) => {
  // Check if query affects protected tables
  const queryLower = query.toLowerCase();
  const protectedTableAccessed = PROTECTED_TABLES.some(table => 
    queryLower.includes(` ${table}`) || 
    queryLower.includes(`"${table}"`) || 
    queryLower.includes(`.${table}`) ||
    queryLower.includes(`"${table}`) ||
    queryLower.includes(`${table};`)
  );

  if (protectedTableAccessed) {
    return {
      columns: null,
      rows: null,
      Error: "Access to protected tables is not allowed",
      executionTime: 0,
      rowCount: 0,
      schemaChanged: false
    };
  }

  // Check if query is a DDL operation that would change schema
  const isSchemaChangingOperation = 
    queryLower.includes('create table') || 
    queryLower.includes('drop table') ||
    queryLower.includes('alter table');

  /** Execute SQL Function in Supabase
   * CREATE OR REPLACE FUNCTION public.execute_sql(query text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  query_result json;
  row_count integer;
  columns_json json;
  rows_json json;
BEGIN
  BEGIN
    -- Check if query is a SELECT query
    IF NOT (lower(query) ~ '^select') THEN
      -- For non-SELECT queries, just execute and return rows affected
      EXECUTE query;
      GET DIAGNOSTICS row_count = ROW_COUNT;
      
      RETURN json_build_object(
        'columns', json_build_array('affected_rows'),
        'rows', json_build_array(json_build_array(row_count))
      );
    END IF;
    
    -- For SELECT queries
    EXECUTE 'SELECT json_agg(t) FROM (' || query || ') t' INTO query_result;
    
    -- If no rows returned, create empty structure
    IF query_result IS NULL THEN
      -- Try to get column names by selecting nothing
      BEGIN
        EXECUTE 'SELECT json_agg(c) FROM (
          SELECT column_name FROM information_schema.columns
          WHERE table_name = (
            SELECT tablename FROM pg_catalog.pg_tables 
            WHERE schemaname = ''public'' 
            ORDER BY tablename LIMIT 1
          )
        ) c' INTO columns_json;
        
        RETURN json_build_object(
          'columns', columns_json,
          'rows', '[]'::json
        );
      EXCEPTION WHEN OTHERS THEN
        -- If that fails, return empty response
        RETURN json_build_object(
          'columns', '[]'::json,
          'rows', '[]'::json
        );
      END;
    END IF;
    
    -- Extract column names from first row
    SELECT json_agg(key) INTO columns_json
    FROM json_object_keys(query_result->0) key;
    
    -- Transform rows to arrays of values
    SELECT json_agg(
      (SELECT json_agg(value) FROM json_each_text(row))
    ) INTO rows_json
    FROM json_array_elements(query_result) row;
    
    RETURN json_build_object(
      'columns', columns_json,
      'rows', rows_json
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
  END;
END;
$$;
   */
  const startTime = new Date();
  let exec_time = 0;
  try {
      
    // const validateQueryResult = await validateQuery(query);
    const {isValid , queryErr , backendErr} = await validateQuery(query);
    if (backendErr) {
      throw new Error(backendErr);
    }

    if (isValid !== true) {
      
      exec_time = new Date() - startTime;

      await saveQueryHistory(query , exec_time , false , queryErr);

      return {
        columns: null,
        rows: null, 
        Error: queryErr,
        executionTime: exec_time,
        rowCount: 0,
        schemaChanged: false
      } 
    }


    const executeQueryResult = await supabase.rpc("execute_sql" , {query});

    exec_time = new Date() - startTime;

    if (executeQueryResult === null) {
      errorMsg = "No data returned from the query";
      exec_time = new Date() - startTime;

      await saveQueryHistory(query , exec_time , false , errorMsg);

      return {
        columns: null,
        rows: null, 
        Error: errorMsg,
        executionTime: exec_time,
        rowCount: 0,
        schemaChanged: false
      } 
    }

    // console.log("executeQueryResult" , executeQueryResult);

    // return executeQueryResult;
    if (executeQueryResult.error !== null) {
      // throw new Error(executeQueryResult.error);

      await saveQueryHistory(query , exec_time , false , executeQueryResult.error);

      return {
        columns: null,
        rows: null, 
        Error: executeQueryResult.error,
        executionTime: exec_time,
        rowCount: 0,
        schemaChanged: false
      } 
    }

    const {data} = executeQueryResult;
    
    console.log("columns" , data.columns);
    console.log("rows" , data.rows);

    await saveQueryHistory(query , exec_time , true , null);

    return {
      columns: data.columns,
      rows: data.rows,
      Error: null,
      executionTime: exec_time,
      rowCount: data.rows ? Array?.from(data?.rows)?.length : 0,
      schemaChanged: isSchemaChangingOperation
    } 

  } catch (error) {
      console.error("Error executing the query" , error);
      throw error;
  }
}

const getSchema = async () => {
  /** Get Schema of the DB
   * CREATE OR REPLACE FUNCTION public.get_schema_info()
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'table_name', tables.table_name,
        'column_name', cols.column_name,
        'data_type', cols.data_type,
        'is_nullable', cols.is_nullable,
        'column_default', cols.column_default,
        'character_maximum_length', cols.character_maximum_length,
        'constraints', (
          SELECT json_agg(json_build_object(
            'constraint_name', tc.constraint_name,
            'constraint_type', tc.constraint_type
          ))
          FROM information_schema.table_constraints tc
          WHERE tc.table_name = tables.table_name AND tc.table_schema = 'public'
        )
      )
    )
    FROM information_schema.tables tables
    JOIN information_schema.columns cols ON tables.table_name = cols.table_name
    WHERE tables.table_schema = 'public'
    AND tables.table_type = 'BASE TABLE'
  );
END;
$$;
   */
try {
  const { data, error } = await supabase.rpc("get_schema_info");

  if (error) {
    return { error };
  }

  const tableMap = {};

  data.forEach((item) => {
    const tableName = item.table_name;
    
    // Skip protected tables
    if (PROTECTED_TABLES.includes(tableName)) {
      return;
    }
    
    const columnName = item.column_name;
    const dataType = item.data_type;

    if (!tableName || !columnName || !dataType) {
      return;
    }

    if (!tableMap[tableName]) {
      tableMap[tableName] = {
        name: tableName,
        columns: [],
      };
    }

    const isNullable = item.is_nullable === "YES";
    const defaultValue = item.column_default || "";
    const maxLength = item.character_maximum_length || 0;

    const constraints = (item.constraints || []).map((constraint) => ({
      name: constraint.constraint_name,
      type: constraint.constraint_type,
    }));

    tableMap[tableName].columns.push({
      name: columnName,
      type: dataType,
      nullable: isNullable,
      defaultValue,
      maxLength,
      constraints,
    });
  });

  const tableList = Object.values(tableMap);
  
  return { tableList };
} catch (error) {
  return { error: error.message };
}

}


export { executeQuery , getSchema , validateQuery};
