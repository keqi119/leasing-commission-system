# 本地环境变量说明

本文档说明 Windows 单机试用版使用的环境变量。推荐先复制 `.env.example` 为 `.env`，再按需调整。

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `LCS_APP_NAME` | `leasing-commission-system` | 应用名称，用于健康检查返回。 |
| `LCS_APP_ENV` | `local` | 当前运行环境，单机试用固定使用 `local`。 |
| `LCS_APP_PORT` | `3000` | 本地 Web 访问端口。 |
| `LCS_DATABASE_PATH` | `local-data/db/dev.db` | SQLite 数据库文件位置。 |
| `LCS_EXPORT_DIR` | `local-data/exports` | 奖金发放表等导出文件目录。 |
| `LCS_IMPORT_DIR` | `local-data/imports` | 标准模板导入文件暂存目录。 |
| `LCS_BACKUP_DIR` | `local-data/backups` | 数据库备份目录。 |
| `LCS_LOG_DIR` | `local-data/logs` | 本地日志目录。 |
| `DATABASE_URL` | `file:./dev.db` | Prisma 本地校验兼容变量。 |

## Windows 路径注意事项

- 推荐使用相对路径，例如 `local-data/db/dev.db`。
- 不建议把真实业务数据放进桌面、同步盘或临时目录。
- `.env` 文件不要提交到 Git。
- `local-data/` 中的数据库、导入文件、导出文件、备份文件都不会进入 Git。

## 常见调整

如果 3000 端口被占用，可以修改：

```text
LCS_APP_PORT=3001
```

如果要把数据库放到其他磁盘目录，可以设置绝对路径，例如：

```text
LCS_DATABASE_PATH=D:\lcs-data\db\dev.db
```

健康检查 API 不会返回完整绝对路径，避免泄露本机敏感目录。
