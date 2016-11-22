DROP TABLE user_roles;
DROP TABLE app_role;

-- Attempt to delete the "default" admin account, in case it still exists
DELETE FROM app_user
WHERE username = 'admin@example.com' AND passsword_hash = '$2a$06$CHCGJ/vKVC4/txqvCp/3IO1MdPJosLr3gV1phWI6VRedk.W29AH3e';