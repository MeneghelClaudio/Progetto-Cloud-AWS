FROM mysql:8.4
COPY reset.sql /reset.sql
CMD ["sh", "-c", "mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME < /reset.sql && echo 'db-reset OK'"]
