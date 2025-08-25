# Mobile Use Platform Docker 部署指南

## 概述

本文档介绍如何使用 Docker 和 Docker Compose 部署 Mobile Use Platform，包含三个核心服务：

- **Mobile Agent** (Python FastAPI) - AI 移动设备自动化核心
- **Mobile Use MCP** (Go) - 云手机 MCP 服务器
- **Web** (Next.js) - Web 前端界面

## 前置要求

### 系统要求
- Docker >= 20.10
- Docker Compose >= 2.0
- 至少 4GB 可用内存
- 至少 10GB 可用磁盘空间

### 服务依赖
- 火山引擎云手机服务
- 火山引擎对象存储 (TOS)
- 火山引擎方舟大模型

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd mobile-use
```

### 2. 配置环境变量
```bash
# 复制环境变量模板
cp docker.env.example .env

# 编辑环境变量文件
vim .env
```

### 3. 一键部署
```bash
# 使用部署脚本
./docker-deploy.sh deploy

# 或者手动部署
docker-compose up -d --build
```

### 4. 访问服务
- Web 前端: http://localhost:3000
- Mobile Agent API: http://localhost:8000
- Mobile Use MCP: http://localhost:8080

## 详细配置

### 环境变量说明

#### 火山引擎云手机配置
```bash
ACEP_ACCESS_KEY=your_acep_access_key      # 云手机访问密钥
ACEP_SECRET_KEY=your_acep_secret_key      # 云手机访问密钥 Secret
ACEP_PRODUCT_ID=your_product_id           # 云手机业务 ID
ACEP_DEVICE_ID=your_device_id             # 云手机设备 ID
ACEP_ACCOUNT_ID=your_account_id           # 云手机账户 ID
```

#### 火山引擎对象存储配置
```bash
TOS_ACCESS_KEY=your_tos_access_key        # TOS 访问密钥
TOS_SECRET_KEY=your_tos_secret_key        # TOS 访问密钥 Secret
TOS_BUCKET=your_tos_bucket_name           # TOS 存储桶名称
TOS_REGION=your_tos_region                # TOS 区域
TOS_ENDPOINT=your_tos_endpoint            # TOS Endpoint
```

#### 火山引擎方舟大模型配置
```bash
ARK_API_KEY=your_ark_api_key              # 方舟 API 密钥
ARK_MODEL_ID=your_ark_model_id            # 方舟模型 ID
```

## 服务架构

### 网络架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │  Mobile Agent   │    │ Mobile Use MCP  │
│   (Next.js)     │    │   (FastAPI)     │    │     (Go)        │
│   Port: 3000    │    │   Port: 8000    │    │   Port: 8080    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ mobile-use-network │
                    │   (Docker Bridge)  │
                    └─────────────────┘
```

### 服务依赖关系
- Web → Mobile Agent → Mobile Use MCP
- Mobile Agent 依赖 Mobile Use MCP 提供移动设备操作能力
- Web 前端通过 Mobile Agent 提供用户界面

## 部署脚本使用

### 基本命令
```bash
# 完整部署
./docker-deploy.sh deploy

# 启动服务
./docker-deploy.sh start

# 停止服务
./docker-deploy.sh stop

# 重启服务
./docker-deploy.sh restart

# 查看日志
./docker-deploy.sh logs

# 查看状态
./docker-deploy.sh status

# 清理服务和数据
./docker-deploy.sh cleanup

# 显示帮助
./docker-deploy.sh help
```

## 手动部署

### 1. 构建镜像
```bash
# 构建所有服务
docker-compose build

# 或分别构建
docker-compose build mobile-agent
docker-compose build mobile-use-mcp
docker-compose build web
```

### 2. 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d mobile-use-mcp
docker-compose up -d mobile-agent
docker-compose up -d web
```

### 3. 查看状态
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f mobile-agent
```

## 健康检查

每个服务都配置了健康检查：

- **Mobile Use MCP**: `curl -f http://localhost:8080/health`
- **Mobile Agent**: `curl -f http://localhost:8000/health`
- **Web**: `curl -f http://localhost:3000/api/health`

## 故障排除

### 常见问题

#### 1. 服务启动失败
```bash
# 查看详细日志
docker-compose logs service-name

# 检查环境变量
docker-compose config
```

#### 2. 网络连接问题
```bash
# 检查网络
docker network ls
docker network inspect mobile-use-network

# 重建网络
docker-compose down
docker-compose up -d
```

#### 3. 端口冲突
```bash
# 检查端口占用
netstat -tulpn | grep :3000
netstat -tulpn | grep :8000
netstat -tulpn | grep :8080

# 修改 docker-compose.yml 中的端口映射
```

#### 4. 镜像构建失败
```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建
docker-compose build --no-cache
```

### 调试模式

#### 开发环境部署
```bash
# 使用开发配置
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

#### 查看容器内部
```bash
# 进入容器
docker-compose exec mobile-agent bash
docker-compose exec mobile-use-mcp sh
docker-compose exec web bash
```

## 生产环境部署

### 安全配置
1. 修改默认端口
2. 配置 HTTPS
3. 设置防火墙规则
4. 使用 Docker secrets 管理敏感信息

### 性能优化
1. 调整容器资源限制
2. 配置日志轮转
3. 使用多阶段构建优化镜像大小
4. 配置负载均衡

### 监控和日志
```bash
# 配置日志驱动
docker-compose.yml:
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
```

## 备份和恢复

### 数据备份
```bash
# 备份卷数据
docker run --rm -v mobile-agent-data:/data -v $(pwd):/backup alpine tar czf /backup/mobile-agent-backup.tar.gz -C /data .
```

### 配置备份
```bash
# 备份配置文件
tar czf config-backup.tar.gz .env docker-compose.yml
```

## 更新和维护

### 更新服务
```bash
# 拉取最新代码
git pull

# 重新构建和部署
./docker-deploy.sh deploy
```

### 清理旧镜像
```bash
# 清理未使用的镜像
docker image prune -a

# 清理所有未使用的资源
docker system prune -a --volumes
```

## 支持和帮助

如果遇到问题，请：

1. 检查日志: `docker-compose logs -f`
2. 验证配置: `docker-compose config`
3. 查看服务状态: `docker-compose ps`
4. 参考故障排除部分

更多信息请参考各服务的具体文档。
