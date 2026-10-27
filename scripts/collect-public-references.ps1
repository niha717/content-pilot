param([string]$SnapshotDate = '2026-10-26')
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Force evidence,src/main/resources/references | Out-Null
$headers=@{'User-Agent'='Mozilla/5.0';'Referer'='https://www.bilibili.com/'}
$captured=[DateTimeOffset]::UtcNow.ToOffset([TimeSpan]::FromHours(8)).ToString('o')
$weekStart=[DateTimeOffset]::Parse($SnapshotDate+'T00:00:00+08:00')
$days=([int]$weekStart.DayOfWeek+6)%7
$weekStart=$weekStart.AddDays(-$days)
$url='https://api.bilibili.com/x/web-interface/popular?ps=50&pn=1'
$raw=Invoke-RestMethod $url -Headers $headers
if($raw.code -ne 0){throw 'B站公开榜单不可用，停止采集，不生成替代记录。'}
$raw | ConvertTo-Json -Depth 40 | Set-Content -Encoding utf8 evidence/bilibili-popular-verified.json
$excluded=@()
if(Test-Path evidence/unavailable-videos.json){$excluded=@((Get-Content evidence/unavailable-videos.json -Raw | ConvertFrom-Json).bvid)}
$selected=@($raw.data.list | Where-Object {$_.bvid -notin $excluded -and $_.pubdate -ge $weekStart.ToUnixTimeSeconds() -and $_.pubdate -le [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()} | Sort-Object pubdate -Descending | Select-Object -First 6)
if($selected.Count -ne 6){throw '当前公开热门页中本周样本不足6条，停止采集。'}
$rows=@();$n=0
foreach($video in $selected){
  $n++
  # The public popular response already contains title, owner, publish time and counters.
  # Do not retry the detail API after its HTTP 412; original pages are checked in a normal browser.
  $v=$video
  $v | ConvertTo-Json -Depth 40 | Set-Content -Encoding utf8 ('evidence/'+$video.bvid+'.json')
  $published=[DateTimeOffset]::FromUnixTimeSeconds($v.pubdate).ToOffset([TimeSpan]::FromHours(8)).ToString('o')
  $excerpt=[string]$v.desc
  if($excerpt.Length -gt 60){$excerpt=$excerpt.Substring(0,60)}
  if($excerpt -eq '-' -or [string]::IsNullOrWhiteSpace($excerpt)){$excerpt=[string]$v.title}
  $rows+=@{id=('bilibili-'+$v.bvid);title=$v.title;mediaType='VIDEO';category=$v.tname;body=$excerpt;source=@{
    platform='BILIBILI';sourceId=$v.bvid;author=$v.owner.name;originalUrl=('https://www.bilibili.com/video/'+$v.bvid+'/');rankingUrl='https://www.bilibili.com/v/popular/all';
    rankingScope=('官方综合热门接口第1页50条候选，筛选北京时间本周 '+$weekStart.ToString('yyyy-MM-dd')+' 起发布，按发布时间倒序取6条；非全站最新发布榜');rank=$n;publishedAt=$published;fetchedAt=$captured;
    coverage='TITLE_DESCRIPTION_EXCERPT';verification='VERIFIED_PUBLIC_METADATA';metrics=@{views=$v.stat.view;likes=$v.stat.like;comments=$v.stat.reply;favorites=$v.stat.favorite;shares=$v.stat.share;coins=$v.stat.coin;danmaku=$v.stat.danmaku};
    limitation='正文仅为作者公开简介节选，未取得字幕或观看全片；公开播放与互动次数不是去重曝光/点击，无法计算CTR或完播率。'
  }}
}
# Public ranking exposes author/time/counters only. Preserve evidence without inventing titles, text or note IDs.
$xhsUrl='https://www.qian-gua.com/Home/HotRankView?datecode=20261024&period=1&type=2'
$html=(Invoke-WebRequest $xhsUrl).Content
$blocks=[regex]::Matches($html,'(?s)<div class="note-item">.*?</li>')
$xhsCaptured=$captured
if($blocks.Count -lt 10){
  $previous='evidence/xhs-notes-20261024.html'
  if(!(Test-Path $previous)){throw '小红书公开榜单不可用且无已核验快照。'}
  $html=Get-Content $previous -Raw
  $blocks=[regex]::Matches($html,'(?s)<div class="note-item">.*?</li>')
  $xhsCaptured=([DateTimeOffset](Get-Item $previous).LastWriteTime).ToOffset([TimeSpan]::FromHours(8)).ToString('o')
  Write-Warning '本次小红书请求未返回榜单；保留先前经浏览器核验的公开快照及原采集时间。'
}
if($blocks.Count -lt 10){throw '已保存快照不足10条，停止采集。'}
$html | Set-Content -Encoding utf8 evidence/xhs-ranking-verified.html
function Read-Field([string]$block,[string]$class){return [Net.WebUtility]::HtmlDecode(([regex]::Match($block,'class="'+$class+'">(.*?)</',[System.Text.RegularExpressions.RegexOptions]::Singleline).Groups[1].Value)).Trim()}
function Count-Value([string]$text){$s=($text -replace '<[^>]+>','').Trim();if($s.EndsWith('万')){return [long]([decimal]($s.TrimEnd('万'))*10000)};return [long]$s}
for($i=0;$i -lt 10;$i++){
  $block=$blocks[$i].Value;$author=Read-Field $block 'b-name';$props=Read-Field $block 'b-props'
  $title=Read-Field $block 'name';$rank=[int](Read-Field $block 'rank')
  $counts=[regex]::Matches($block,'(?s)<span class="prop">(.*?)</span>')
  if($counts.Count -ne 4){throw '公开榜单指标布局变化，停止采集。'}
  $publishedText=($props -split '丨')[0].Trim()
  $category=if(($props -split '丨').Count -gt 1){($props -split '丨')[1].Trim()}else{'未知'}
  if(!$category){$category='未知'}
  $rows+=@{id=('xhs-pending-'+$SnapshotDate+'-'+$rank);title=('[待核验原文] '+$author+' · '+$publishedText);mediaType='ARTICLE';category=$category;body='';source=@{
    platform='XIAOHONGSHU';sourceId=$null;author=$author;originalUrl=$null;rankingUrl=$xhsUrl;
    rankingScope='千瓜公开笔记榜：页面显示近12小时、全部笔记、全部分类，前10条。URL日期参数不代表榜单日期；无法验证图文筛选，不能声称是全站最热文字TOP10。';rank=$rank;
    publishedAt=$publishedText;fetchedAt=$xhsCaptured;coverage='METADATA_ONLY';verification='PENDING_ORIGINAL_AND_TYPE';
    metrics=@{views=$null;likes=(Count-Value $counts[0].Groups[1].Value);comments=(Count-Value $counts[1].Groups[1].Value);favorites=(Count-Value $counts[2].Groups[1].Value);shares=(Count-Value $counts[3].Groups[1].Value);coins=$null;danmaku=$null};
    limitation=('页面原标题字段为“'+$title+'”；没有正文、原帖链接和可核验笔记类型。仅保存第三方榜单线索，禁止进入内容检索。以“万”为单位的计数为页面四舍五入值。')
  }}
}
$rows | ConvertTo-Json -Depth 20 | Set-Content -Encoding utf8 src/main/resources/references/verified-sources.json
@{capturedAt=$captured;bilibiliVerified=6;xiaohongshuVerifiedText=0;xiaohongshuPending=10;generatedContent=0} | ConvertTo-Json | Set-Content -Encoding utf8 evidence/collection-summary.json
Get-Content evidence/collection-summary.json
