08:05:20.508 Running build in Washington, D.C., USA (East) – iad1
08:05:20.513 Build machine configuration: 2 cores, 8 GB
08:05:20.821 Cloning github.com/xymathpro-hue/xymath (Branch: main, Commit: 4859a4b)
08:05:22.715 Cloning completed: 1.891s
08:05:23.062 Restored build cache from previous deployment (8b35y8Pzp1wGfiecVeKHLxshvQoG)
08:05:23.903 Running "vercel build"
08:05:24.947 Vercel CLI 50.4.10
08:05:25.240 Installing dependencies...
08:05:30.770 
08:05:30.770 up to date in 5s
08:05:30.771 
08:05:30.771 153 packages are looking for funding
08:05:30.771   run `npm fund` for details
08:05:30.811 Detected Next.js version: 16.0.7
08:05:30.819 Running "npm run build"
08:05:30.919 
08:05:30.919 > xymath@0.1.0 build
08:05:30.919 > next build
08:05:30.920 
08:05:31.991    ▲ Next.js 16.0.7 (Turbopack)
08:05:31.993 
08:05:32.005  ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead. Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
08:05:32.035    Creating an optimized production build ...
08:05:52.896  ✓ Compiled successfully in 20.3s
08:05:52.898    Running TypeScript ...
08:06:03.878 Failed to compile.
08:06:03.878 
08:06:03.879 ./src/app/(dashboard)/simulados/novo/page.tsx:808:60
08:06:03.879 Type error: Property 'habilidade_bncc_id' does not exist on type 'Questao'. Did you mean 'habilidade_id'?
08:06:03.880 
08:06:03.880 [0m [90m 806 |[39m                                       {q[33m.[39mdificuldade [33m===[39m [32m'facil'[39m [33m?[39m [32m'Fácil'[39m [33m:[39m q[33m.[39mdificuldade [33m===[39m [32m'medio'[39m [33m?[39m [32m'Médio'[39m [33m:[39m [32m'Difícil'[39m}
08:06:03.880  [90m 807 |[39m                                     [33m<[39m[33m/[39m[33mBadge[39m[33m>[39m
08:06:03.880 [31m[1m>[22m[39m[90m 808 |[39m                                     {getHabilidadeCodigo(q[33m.[39mhabilidade_bncc_id) [33m&&[39m (
08:06:03.880  [90m     |[39m                                                            [31m[1m^[22m[39m
08:06:03.880  [90m 809 |[39m                                       [33m<[39m[33mBadge[39m className[33m=[39m[32m"text-xs"[39m[33m>[39m{getHabilidadeCodigo(q[33m.[39mhabilidade_bncc_id)}[33m<[39m[33m/[39m[33mBadge[39m[33m>[39m
08:06:03.881  [90m 810 |[39m                                     )}
08:06:03.881  [90m 811 |[39m                                     {getDescritorCodigo(q[33m.[39mdescritor_saeb_id) [33m&&[39m ([0m
08:06:03.923 Next.js build worker exited with code: 1 and signal: null
08:06:03.964 Error: Command "npm run build" exited with 1
