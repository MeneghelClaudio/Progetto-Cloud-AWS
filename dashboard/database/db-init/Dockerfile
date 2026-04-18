FROM mysql:8.4
COPY init.sql /init.sql
CMD ["sh", "-c", "mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < /init.sql && echo 'db-init OK'"]
