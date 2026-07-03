# 项目隔离说明

## 固定工作区

本项目唯一允许的本地工作区是：

```text
D:\leasing-commission-system
```

废弃目录：

```text
D:\OneDrive\文档\leasing-commission-system
D:/OneDrive/文档/leasing-commission-system
```

后续开发、测试、提交、推送、运行命令都必须在固定工作区执行。

## 禁止引用

仓库内业务代码、API、页面、README 主体和运行脚本不得依赖或引用以下内容：

```text
fleet-ops
auto-subscription-platform
电动车订阅
车队运营
D:\Projects\auto-subscription-platform
```

本系统不得作为其他项目子模块，也不得把其他项目模块作为本系统的业务依赖。

## 自动检查

运行：

```bash
pnpm check:project-isolation
```

脚本会扫描仓库文件，允许本说明和 H02 验收计划中保留隔离关键词，用于解释边界；其他文件发现禁用路径或模块名时会失败。
