BEGIN;

CREATE OR REPLACE FUNCTION websearch_to_wildcard_tsquery(config regconfig, querytext text)
RETURNS tsquery AS $$
    DECLARE
        query_splits text[];
        split text;
        new_querytext text := '';
    BEGIN
        SELECT regexp_split_to_array(d::text, '\s* \s*') INTO query_splits FROM websearch_to_tsquery(config, querytext) d;
        FOREACH split IN ARRAY query_splits LOOP
            CASE WHEN split = '|' OR split = '&' OR split = '!' OR split = '<->' OR split = '!(' OR split = ')'
                THEN new_querytext := new_querytext || split || ' ';
            ELSE new_querytext := new_querytext || split || ':* ';
            END CASE;
        END LOOP;
        RETURN to_tsquery(config, new_querytext);
    END;
$$ LANGUAGE plpgsql;

END;
