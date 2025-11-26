module.exports = {
    apps: [
        {
            name: 'huajianli',
            script: 'node_modules/next/dist/bin/next',
            args: 'start --keepAliveTimeout 5000', // 添加 keepAliveTimeout 参数
            instances: 1,
            exec_mode: 'cluster',
            watch: false,
            env: {
                PORT: 8083,
                NODE_ENV: 'production',
                TZ: 'Asia/Shanghai',
            },
            env_production: {
                PORT: 8083,
                NODE_ENV: 'production',
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            error_file: 'logs/pm2/error.log',
            out_file: 'logs/pm2/out.log',
            merge_logs: true,
            max_memory_restart: '1G',
        },
    ],
}