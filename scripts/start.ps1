$ErrorActionPreference='Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if(Test-Path .env){
  foreach($line in Get-Content .env){
    if($line.Trim() -and !$line.Trim().StartsWith('#') -and $line.Contains('=')){
      $parts=$line.Split('=',2);[Environment]::SetEnvironmentVariable($parts[0].Trim(),$parts[1].Trim().Trim('"').Trim("'"),'Process')
    }
  }
}
$jdk=Get-ChildItem .tools -Directory -Filter 'jdk*' -ErrorAction SilentlyContinue | Select-Object -First 1
$java=if($jdk){Join-Path $jdk.FullName 'bin/java.exe'}elseif($env:JAVA_HOME){Join-Path $env:JAVA_HOME 'bin/java.exe'}else{'java'}
$jar=Join-Path (Get-Location) 'build/libs/content-pilot-0.1.0.jar'
if(!(Test-Path $jar)){throw '请先运行 scripts/build.ps1'}
$port=if($env:SERVER_PORT){[int]$env:SERVER_PORT}else{8080}
if(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue){throw "$port 端口已被使用；请先停止现有服务。"}
Write-Host "平台：http://127.0.0.1:$port/；前后端已打包在同一服务，按 Ctrl+C 停止。"
& $java '-Dfile.encoding=UTF-8' -jar $jar
