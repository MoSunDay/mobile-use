# Mobile Use MCP Dockerfile
# 多阶段构建：构建阶段
FROM golang:1.23.6-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache git ca-certificates tzdata

# 设置 Go 环境变量
ENV CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

# 复制 go mod 文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download && go mod verify

# 复制源代码
COPY . .

# 构建应用
RUN go build -ldflags="-w -s" -o mobile_use_mcp ./cmd/main.go

# 运行阶段
FROM alpine:latest

# 安装运行时依赖
RUN apk --no-cache add ca-certificates tzdata curl

# 设置工作目录
WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S app && \
    adduser -S app -u 1001 -G app

# 从构建阶段复制二进制文件
COPY --from=builder /app/mobile_use_mcp .

# 复制配置文件（如果有）
COPY --from=builder /app/config* ./

# 设置文件权限
RUN chown -R app:app /app
USER app

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# 启动命令 (默认使用 SSE 模式)
CMD ["./mobile_use_mcp", "--transport", "sse", "--port", "8080"]

# 可选的启动脚本版本
# COPY start.sh .
# RUN chmod +x start.sh
# CMD ["./start.sh"]
