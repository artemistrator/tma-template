# Backup & Restore

## Что бэкапится

1. **PostgreSQL** — все таблицы Directus (tenants, products, orders, tenant_admins, etc.)
2. **Directus uploads** — файлы (изображения товаров, аватары)
3. **`.env.local`** — конфигурация (токены, ключи шифрования)

## Два способа бэкапа

### Способ 1: Ручной скрипт (полный бэкап)

Бэкапит БД + uploads + env в один `.tar.gz` архив.

```bash
# Сделать бэкап (сохраняется в ./backups/)
./scripts/backup.sh

# Сделать бэкап в другую директорию
./scripts/backup.sh /mnt/external/backups

# Хранить бэкапы 30 дней (по умолчанию 14)
BACKUP_RETAIN_DAYS=30 ./scripts/backup.sh
```

Результат: `backups/tma_backup_20260320_030000.tar.gz`

Если настроен `TELEGRAM_BOT_TOKEN` и `TELEGRAM_ADMIN_ID` — после бэкапа придёт уведомление в Telegram.

### Способ 2: Docker-сервис (автоматический, только БД)

Запускает `pg_dump` ежедневно в 3:00 AM внутри Docker.

```bash
# Включить автоматические бэкапы
docker compose --profile backup up -d

# Проверить что работает
docker logs tma-backup

# Бэкапы сохраняются в ./backups/db_*.dump
ls -la backups/
```

### Cron (ручной скрипт по расписанию)

```bash
# Ежедневно в 3:00 AM
crontab -e
0 3 * * * cd /path/to/tma-template && ./scripts/backup.sh >> /var/log/tma-backup.log 2>&1
```

## Восстановление

```bash
# Список доступных бэкапов
ls -lh backups/

# Восстановить из полного архива (скрипт)
./scripts/restore.sh backups/tma_backup_20260320_030000.tar.gz

# Восстановить только БД из Docker-бэкапа
cat backups/db_20260320_030000.dump | \
  docker exec -i tma-postgres pg_restore -U directus -d directus --clean --no-owner 2>/dev/null
```

Скрипт `restore.sh`:
- Просит подтверждение (вводишь `yes`)
- Дропает и пересоздаёт базу
- Восстанавливает uploads в Directus-контейнер
- Показывает diff `.env.local` (не перезаписывает автоматически)
- Перезапускает Directus

## Рекомендации

| Окружение | Способ | Частота | Retention |
|-----------|--------|---------|-----------|
| Dev | Ручной скрипт | По необходимости | 7 дней |
| Staging | Docker-сервис | Ежедневно | 14 дней |
| Production | Cron + скрипт | Ежедневно | 30 дней |
| Production (критичное) | Cron + скрипт + внешнее хранилище | Ежедневно | 90 дней |

### Внешнее хранилище (production)

Для production рекомендуется копировать бэкапы на внешнее хранилище:

```bash
# После бэкапа — копировать на S3
LATEST=$(ls -t backups/tma_backup_*.tar.gz | head -1)
aws s3 cp "$LATEST" s3://my-bucket/tma-backups/

# Или на другой сервер
rsync -avz backups/ backup-server:/backups/tma/
```

## Структура архива

```
tma_backup_20260320_030000.tar.gz
  └── tma_backup_20260320_030000/
      ├── database.dump          # pg_dump --format=custom
      ├── uploads/               # Directus file assets
      │   ├── abc123-image.jpg
      │   └── ...
      └── env.local.bak          # .env.local snapshot
```
