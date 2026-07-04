# LCS MVP 本地试用版发布说明

## 版本号

`0.1.0-local-trial`

## Git commit

以实际发布包生成时的提交为准。

## 适用对象

- 老板
- HR
- 财务
- 销售
- 资管
- 本地试运行支持人员

## 包含功能

- 员工、车辆、考核周期、收入指标、订单、租金收入、外调利润、押金、车辆状态等 MVP 台账。
- 2026-04 验收数据初始化。
- 2026-05 脱敏试运行数据初始化。
- Trial Run、Issue、人工调整、老板审批、驳回、重算、导出绑定和试运行报告。
- Windows 单机启动脚本。
- `/api/health` 本地健康检查。
- 数据库备份和恢复脚本。
- 本地试用包生成脚本。

## 不包含功能

- 云服务器部署。
- Docker 部署。
- HTTPS 证书。
- 企业账号登录。
- 工资系统对接。
- 银行流水自动对账。
- 生产级 PostgreSQL / MySQL 迁移。
- Windows Service 常驻服务。
- 自动更新器。

## 启动方式

```powershell
cd /d D:\leasing-commission-system
.\scripts\windows\setup-local.ps1
.\scripts\windows\reset-acceptance-db.ps1
.\scripts\windows\start-local.ps1
```

## 默认访问地址

```text
http://localhost:3000/commission
```

## 本地数据位置

```text
local-data/db/dev.db
local-data/imports/
local-data/exports/
local-data/backups/
local-data/logs/
```

## 备份恢复方式

备份：

```powershell
.\scripts\windows\backup-db.ps1
```

恢复：

```powershell
.\scripts\windows\restore-db.ps1 -BackupPath .\local-data\backups\dev-20260704-153000.db
```

## 安全注意事项

- 不要提交 `.env`。
- 不要提交 `local-data/`。
- 不要把真实客户证件、手机号、银行卡号放进仓库。
- 试用包不会包含本地数据库、导入文件、导出文件或备份文件。

## 已知限制

- 单机试用版不适合多人同时公网访问。
- 本地数据库为 SQLite 文件。
- 不包含生产部署和企业账号体系。
- 任意历史 Excel 自动解析不在本版本范围内。

## 回滚方式

1. 停止本地系统。
2. 找到 `local-data/backups/` 中的旧备份。
3. 运行 `restore-db.ps1` 恢复。
4. 重新运行 `start-local.ps1`。
