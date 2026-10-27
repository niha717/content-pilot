$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$jdk=Get-ChildItem .tools -Directory -Filter 'jdk*' -ErrorAction SilentlyContinue | Select-Object -First 1
if($jdk){$env:JAVA_HOME=$jdk.FullName}
if(!$env:JAVA_HOME){throw '请安装 JDK 25 并设置 JAVA_HOME，或将 JDK 解压至 .tools。'}
# Gradle worker classpaths on Windows may fail when their paths contain Chinese characters.
$env:GRADLE_USER_HOME=Join-Path $env:TEMP 'content-pilot-gradle'
$env:PILOT_BUILD_DIR=Join-Path $env:TEMP 'content-pilot-build'
Push-Location frontend
try {npm ci --no-audit --no-fund;if($LASTEXITCODE){throw '前端依赖安装失败'};npm run build;if($LASTEXITCODE){throw '前端构建失败'}} finally {Pop-Location}
./gradlew.bat test bootJar --no-daemon
if($LASTEXITCODE){throw '后端测试或构建失败'}
New-Item -ItemType Directory -Force build/libs,build/reports | Out-Null
Copy-Item "$env:PILOT_BUILD_DIR/libs/content-pilot-0.1.0.jar" build/libs/ -Force
Copy-Item "$env:PILOT_BUILD_DIR/reports/tests" build/reports/ -Recurse -Force
Write-Host '构建完成：scripts/start.ps1 启动本地平台。'
