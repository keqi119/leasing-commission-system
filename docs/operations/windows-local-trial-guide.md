# 租赁公司提成系统 Windows 单机试用说明书

## 1. 系统用途

本系统用于汽车经营性租赁小团队的销售提成试算、审批、导出和试运行问题留痕。单机试用版适合在一台 Windows 电脑上完成验收、培训和小范围试用。

## 2. 适用场景

- 老板、财务、HR、销售、资管一起验证提成结算闭环。
- 使用 2026-04 验收数据验证计算公式。
- 使用 2026-05 脱敏试运行数据验证导入、问题、调整、审批、导出流程。
- 不适合作为云端生产系统或多人公网访问系统。

## 3. 电脑前置要求

- Windows 10 或 Windows 11。
- Node.js 20 或更高版本。
- pnpm 11 或项目指定版本。
- PowerShell。
- 建议至少 4GB 可用磁盘空间。

## 4. 获取项目

方式一：从 Git 拉取代码。

```powershell
cd /d D:\
git clone https://github.com/keqi119/leasing-commission-system.git
cd /d D:\leasing-commission-system
```

方式二：解压本地试用包到：

```text
D:\leasing-commission-system
```

## 5. 初始化本地环境

```powershell
cd /d D:\leasing-commission-system
.\scripts\windows\setup-local.ps1
```

脚本会检查 Node.js 和 pnpm，安装依赖，创建 `.env`，创建 `local-data` 子目录，并生成 Prisma 所需文件。

## 6. 初始化验收数据

```powershell
.\scripts\windows\reset-acceptance-db.ps1
```

脚本会提示：

```text
This will overwrite local trial data.
```

请输入 `RESET` 确认。确认后会自动备份当前数据库，并生成 2026-04 验收数据和 2026-05 脱敏试运行数据。

## 7. 启动系统

```powershell
.\scripts\windows\start-local.ps1
```

默认访问地址：

```text
http://localhost:3000/commission
```

如果 `.env` 中修改了 `LCS_APP_PORT`，访问端口也要对应修改。

## 8. 停止系统

回到运行 `start-local.ps1` 的 PowerShell 窗口，按 `Ctrl + C`。也可以查看停止说明：

```powershell
.\scripts\windows\stop-local.ps1
```

## 9. 本地健康检查

系统启动后运行：

```powershell
.\scripts\windows\smoke-local.ps1
```

检查内容包括 `/api/health`、`/commission`、`/commission/trial-run-checks`、`/commission/trial-runs`、`/commission/settlements`、`/commission/exports`。

也可以直接打开：

```text
http://localhost:3000/api/health
```

## 10. 备份数据

```powershell
.\scripts\windows\backup-db.ps1
```

备份文件会生成到：

```text
local-data/backups/
```

文件名示例：

```text
dev-20260704-153000.db
```

## 11. 恢复数据

```powershell
.\scripts\windows\restore-db.ps1 -BackupPath .\local-data\backups\dev-20260704-153000.db
```

恢复前，脚本会自动备份当前数据库，避免误覆盖后无法找回。

## 12. 重置验收数据

```powershell
.\scripts\windows\reset-acceptance-db.ps1
```

注意：这会覆盖当前本地试运行数据。执行前系统会自动备份当前数据库，但仍建议先确认当前数据是否需要留存。

## 13. 常见问题

### 端口 3000 被占用怎么办

打开 `.env`，修改：

```text
LCS_APP_PORT=3001
```

然后重新运行 `start-local.ps1`。

### pnpm 找不到怎么办

先确认 Node.js 已安装。然后运行：

```powershell
corepack enable
corepack prepare pnpm@11.7.0 --activate
```

### dev.db 不存在怎么办

运行：

```powershell
.\scripts\windows\reset-acceptance-db.ps1
```

### 页面打不开怎么办

先确认 `start-local.ps1` 没有报错，然后运行：

```powershell
.\scripts\windows\smoke-local.ps1
```

### 导入文件在哪里

标准模板导入文件建议放在 `local-data/imports/`。

### 导出文件在哪里

导出文件建议放在 `local-data/exports/`。

### 备份文件在哪里

备份文件在 `local-data/backups/`。

### 如何避免误删真实试运行数据

- 重置前先运行 `backup-db.ps1`。
- 不要手工删除 `local-data/db/dev.db`。
- 恢复备份前确认 `BackupPath` 指向正确文件。

## 14. 已知限制

- H07 是 Windows 单机试用包，不是生产部署。
- 不包含云服务器部署、Docker、HTTPS、企业账号登录、工资系统对接。
- 数据库使用本地 SQLite 文件。
- 不支持多人同时公网访问。
- 任意历史 Excel 自动解析不在本阶段范围内。
