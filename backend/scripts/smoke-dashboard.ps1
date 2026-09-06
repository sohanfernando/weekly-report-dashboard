<#
    Smoke test for the manager dashboard (Sections 4 and 6).

    Checks that every metric and chart endpoint answers, that the headline
    numbers are internally consistent with the per-member table they summarise,
    that "not yet started" is derived rather than stored, and that none of it is
    reachable by a team member.

    Assumes a seeded database. Run after a fresh start on an empty schema.

    Usage:
        .\scripts\smoke-dashboard.ps1
        .\scripts\smoke-dashboard.ps1 -BaseUrl http://localhost:8081
#>
param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$ManagerEmail = "manager@sisenco.local",
    [string]$ManagerPassword = "Manager@12345",
    [string]$MemberEmail = "ravi@sisenco.local",
    [string]$MemberPassword = "password123"
)

$ErrorActionPreference = "Stop"
$script:pass = 0
$script:fail = 0

# PowerShell 5.1 does not reliably unroll a JSON array returned by
# Invoke-RestMethod, so force enumeration and stop the result collapsing
# back to a scalar on return.
function AsArray($value) { , @($value | ForEach-Object { $_ }) }

function Check {
    param([string]$Name, [scriptblock]$Call, [int]$Expect = 200)
    try {
        $r = & $Call
        $code = if ($r -is [Microsoft.PowerShell.Commands.WebResponseObject]) { $r.StatusCode } else { 200 }
    } catch { $code = $_.Exception.Response.StatusCode.value__ }
    if ($code -eq $Expect) {
        Write-Host ("  PASS  {0,-50} {1}" -f $Name, $code) -ForegroundColor Green; $script:pass++
    } else {
        Write-Host ("  FAIL  {0,-50} got {1}, expected {2}" -f $Name, $code, $Expect) -ForegroundColor Red; $script:fail++
    }
}

function Assert {
    param([string]$Name, [bool]$Condition, [string]$Detail = "")
    if ($Condition) { Write-Host ("  PASS  {0,-50} ok" -f $Name) -ForegroundColor Green; $script:pass++ }
    else { Write-Host ("  FAIL  {0,-50} {1}" -f $Name, $Detail) -ForegroundColor Red; $script:fail++ }
}

Write-Host "`nDashboard smoke test against $BaseUrl" -ForegroundColor Cyan

Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -ContentType application/json `
    -Body (@{ email = $ManagerEmail; password = $ManagerPassword } | ConvertTo-Json -Compress) -SessionVariable mgrSession | Out-Null
Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -ContentType application/json `
    -Body (@{ email = $MemberEmail; password = $MemberPassword } | ConvertTo-Json -Compress) -SessionVariable memberSession | Out-Null

$endpoints = @(
    @{ n = "summary";              u = "/api/manager/dashboard/summary" },
    @{ n = "submissions";          u = "/api/manager/dashboard/submissions" },
    @{ n = "tasks trend";          u = "/api/manager/dashboard/tasks-trend" },
    @{ n = "workload by project";  u = "/api/manager/dashboard/workload-by-project" },
    @{ n = "time by task type";    u = "/api/manager/dashboard/time-by-task-type" },
    @{ n = "status by member";     u = "/api/manager/dashboard/status-by-member" },
    @{ n = "activity feed";        u = "/api/manager/dashboard/activity?size=5" },
    @{ n = "blockers across team"; u = "/api/manager/dashboard/section?section=BLOCKERS" },
    @{ n = "achievements section"; u = "/api/manager/dashboard/section?section=ACHIEVEMENTS" }
)

Write-Host "`nEvery endpoint answers" -ForegroundColor Cyan
foreach ($e in $endpoints) {
    Check $e.n { Invoke-WebRequest "$BaseUrl$($e.u)" -WebSession $mgrSession }
}

Write-Host "`nHeadline numbers agree with the table beneath them" -ForegroundColor Cyan
$summary = Invoke-RestMethod "$BaseUrl/api/manager/dashboard/summary" -WebSession $mgrSession
$subs = AsArray (Invoke-RestMethod "$BaseUrl/api/manager/dashboard/submissions" -WebSession $mgrSession)

Assert "expectedMembers matches the member count" ($summary.expectedMembers -eq $subs.Count) `
    "summary said $($summary.expectedMembers), table had $($subs.Count)"

$submittedStates = @("SUBMITTED", "NEEDS_CORRECTION", "APPROVED")
$countedSubmitted = @($subs | Where-Object { $submittedStates -contains $_.state }).Count
Assert "submitted count matches the per-member states" ($summary.submitted -eq $countedSubmitted) `
    "summary said $($summary.submitted), table had $countedSubmitted"

$countedNotStarted = @($subs | Where-Object { $_.state -eq "NOT_STARTED" }).Count
Assert "not-started count matches" ($summary.notStarted -eq $countedNotStarted) `
    "summary said $($summary.notStarted), table had $countedNotStarted"

$expectedRate = if ($summary.expectedMembers -eq 0) { 0 } else { [math]::Round($summary.submitted * 100 / $summary.expectedMembers, 1) }
Assert "compliance rate is submitted over expected" ([math]::Abs($summary.complianceRate - $expectedRate) -lt 0.05) `
    "got $($summary.complianceRate), expected $expectedRate"

Assert "every member is accounted for" (($summary.submitted + $summary.drafts + $summary.notStarted) -eq $summary.expectedMembers) `
    "submitted+drafts+notStarted did not equal expectedMembers"

Assert "pending and late are mutually exclusive" (($summary.pending -eq 0) -or ($summary.late -eq 0))

Write-Host "`nNot-started is derived, not stored" -ForegroundColor Cyan
Assert "members with no report appear as NOT_STARTED" (@($subs | Where-Object { $_.state -eq "NOT_STARTED" -and $null -eq $_.reportId }).Count -eq $countedNotStarted)
Assert "every non-started row carries a report id" (@($subs | Where-Object { $_.state -ne "NOT_STARTED" -and $null -eq $_.reportId }).Count -eq 0)

Write-Host "`nDrafts stay private" -ForegroundColor Cyan
$sectionBlockers = AsArray (Invoke-RestMethod "$BaseUrl/api/manager/dashboard/section?section=BLOCKERS" -WebSession $mgrSession)
$draftMemberIds = @($subs | Where-Object { $_.state -eq "DRAFT" } | ForEach-Object { $_.userId })
$leaked = @($sectionBlockers | Where-Object { $draftMemberIds -contains $_.userId }).Count
Assert "a draft never appears in the section view" ($leaked -eq 0) "$leaked draft(s) leaked"

Write-Host "`nCharts return usable data" -ForegroundColor Cyan
$trend = AsArray (Invoke-RestMethod "$BaseUrl/api/manager/dashboard/tasks-trend" -WebSession $mgrSession)
Assert "trend has points" ($trend.Count -gt 0)
Assert "completed never exceeds total" (@($trend | Where-Object { $_.completedTasks -gt $_.totalTasks }).Count -eq 0)

$hours = AsArray (Invoke-RestMethod "$BaseUrl/api/manager/dashboard/time-by-task-type" -WebSession $mgrSession)
Assert "time split has buckets" ($hours.Count -gt 0)
Assert "no negative hours" (@($hours | Where-Object { $_.hours -lt 0 }).Count -eq 0)

$workload = AsArray (Invoke-RestMethod "$BaseUrl/api/manager/dashboard/workload-by-project" -WebSession $mgrSession)
Assert "workload covers projects" ($workload.Count -gt 0)

$activity = Invoke-RestMethod "$BaseUrl/api/manager/dashboard/activity?size=5" -WebSession $mgrSession
Assert "activity feed is paginated" ($activity.size -eq 5 -and $activity.totalElements -gt 0)
Assert "activity items name both people" ($null -ne $activity.content[0].reviewerName -and $null -ne $activity.content[0].memberName)

Write-Host "`nMember profile stats" -ForegroundColor Cyan
$memberId = $subs[0].userId
$stats = Invoke-RestMethod "$BaseUrl/api/manager/members/$memberId/stats" -WebSession $mgrSession
Assert "stats return the member" ($stats.member.id -eq $memberId)
Assert "status counts sum to the total" (($stats.drafts + $stats.awaitingReview + $stats.needsCorrection + $stats.approved) -eq $stats.totalReports)
Assert "approval rate is within range" ($stats.approvalRate -ge 0 -and $stats.approvalRate -le 100)
Assert "completed tasks never exceed total" ($stats.completedTasks -le $stats.totalTasks)

Write-Host "`nMembers cannot reach any of it" -ForegroundColor Cyan
foreach ($e in $endpoints) {
    Check "member blocked from $($e.n)" -Expect 403 { Invoke-WebRequest "$BaseUrl$($e.u)" -WebSession $memberSession }
}
Check "member blocked from profile stats" -Expect 403 { Invoke-WebRequest "$BaseUrl/api/manager/members/$memberId/stats" -WebSession $memberSession }
Check "anonymous blocked from summary" -Expect 401 { Invoke-WebRequest "$BaseUrl/api/manager/dashboard/summary" }

Write-Host "`n$($script:pass) passed, $($script:fail) failed`n" -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
if ($script:fail -gt 0) { exit 1 }
