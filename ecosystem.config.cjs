/**
 * PM2 进程管理配置
 * 文档: https://pm2.keymetrics.io/docs/usage/application-declaration/
 *
 * 常用命令:
 *   pm2 start ecosystem.config.cjs        # 启动
 *   pm2 restart gwszjy                     # 重启
 *   pm2 stop gwszjy                        # 停止
 *   pm2 delete gwszjy                      # 删除
 *   pm2 logs gwszjy                        # 查看日志
 *   pm2 monit                              # 监控面板
 *   pm2 status                             # 查看状态
 *   pm2 save                               # 保存当前进程列表（开机自启需要）
 *   pm2-startup install                    # 注册 Windows 开机自启服务（仅首次）
 */
module.exports = {
  apps: [
    {
      name: 'gwszjy',              // 进程名称
      script: './node_modules/vite/bin/vite.js',  // 直接用 node 运行 vite，绕开 Windows npm.cmd 问题
      args: '--host 0.0.0.0',     // 监听所有网卡
      cwd: __dirname,              // 项目根目录
      watch: false,                // 不开启文件监听重启（vite 自带 HMR）
      env: {
        NODE_ENV: 'development'
      },
      // 日志配置
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 崩溃自动重启
      autorestart: true,
      max_restarts: 10,            // 最大重启次数
      restart_delay: 3000,         // 重启间隔(ms)
      // 内存超限自动重启
      max_memory_restart: '2G',
      // Windows 下隐藏命令行窗口
      windowsHide: true,
      // 实例数
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
