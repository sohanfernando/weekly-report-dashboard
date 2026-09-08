<#
    Smoke test for the AI chat assistant (Section 8).

    Checks the access rules first — those hold whether or not a key is
    configured — then, if the assistant is switched on, asks it real questions
    and checks that the answers came from the database rather than from the
    model: the right tools ran, and figures quoted back match what the dashboard
    endpoints independently report.

    A model writes different prose every run, so nothing here asserts on wording.
    What is asserted is which tools were called and which facts appear.

    Requires GROQ_API_KEY in the backend's environment. Without it the access
    checks still run and the rest is skipped rather than failed.

    Usage:
        .\scripts\smoke-chat.ps1
        .\scripts\smoke-chat.ps1 -BaseUrl http://localhost:8081
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
$script:skip = 0

function AsArray($value) { , @($value | ForEach-Object { $_ }) }

function Check {
    param([string]$Name, [scriptblock]$Call, [int]$Expect = 200)
    try {
        $r = & $Call
        $code = if ($r -is [Microsoft.PowerShell.Commands.WebResponseObject]) { $r.StatusCode } else { 200 }
    } catch { $code = $_.Exception.Response.StatusCode.value__ }
    if ($code -eq $Expect) {
        Write-Host ("  PASS  {0,-52} {1}" -f $Name, $code) -ForegroundColor Green; $script:pass++
    } else {
        Write-Host ("  FAIL  {0,-52} got {1}, expected {2}" -f $Name, $code, $Expect) -ForegroundColor Red; $script:fail++
    }
}

function Assert {
    param([string]$Name, [bool]$Condition, [string]$Detail = "")
    if ($Condition) { Write-Host ("  PASS  {0,-52} ok" -f $Name) -ForegroundColor Green; $script:pass++ }
    else { Write-Host ("  FAIL  {0,-52} {1}" -f $Name, $Detail) -ForegroundColor Red; $script:fail++ }
}

function Skip {
    param([string]$Name, [string]$Why)
    Write-Host ("  SKIP  {0,-52} {1}" -f $Name, $Why) -ForegroundColor DarkGray; $script:skip++
}

# Asks one question and returns the parsed answer.
function Ask {
    param([string]$Message, $Session)
    $body = @{ message = $Message; history = @() } | ConvertTo-Json -Compress
    return Invoke-RestMethod "$BaseUrl/api/manager/chat" -Method Post -ContentType application/json `
        -Body $body -WebSession $Session
}

Write-Host "`nAssistant smoke test against $BaseUrl" -ForegroundColor Cyan

Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -ContentType application/json `
    -Body (@{ email = $ManagerEmail; password = $ManagerPassword } | ConvertTo-Json -Compress) `
    -SessionVariable mgrSession | Out-Null
Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -ContentType application/json `
    -Body (@{ email = $MemberEmail; password = $MemberPassword } | ConvertTo-Json -Compress) `
    -SessionVariable memberSession | Out-Null

# ---------------------------------------------------------------- access

Write-Host "`nThe assistant is manager-only" -ForegroundColor Cyan

Check "anonymous cannot read the status" { Invoke-WebRequest "$BaseUrl/api/manager/chat/status" -UseBasicParsing } 401
Check "anonymous cannot ask" {
    Invoke-WebRequest "$BaseUrl/api/manager/chat" -Method Post -ContentType application/json `
        -Body '{"message":"what happened last week"}' -UseBasicParsing
} 401
Check "a member cannot read the status" {
    Invoke-WebRequest "$BaseUrl/api/manager/chat/status" -WebSession $memberSession -UseBasicParsing
} 403
Check "a member cannot ask" {
    Invoke-WebRequest "$BaseUrl/api/manager/chat" -Method Post -ContentType application/json `
        -Body '{"message":"what did the team do"}' -WebSession $memberSession -UseBasicParsing
} 403
Check "a manager may ask an empty question, and is refused" {
    Invoke-WebRequest "$BaseUrl/api/manager/chat" -Method Post -ContentType application/json `
        -Body '{"message":"   "}' -WebSession $mgrSession -UseBasicParsing
} 400

$status = Invoke-RestMethod "$BaseUrl/api/manager/chat/status" -WebSession $mgrSession
Assert "a manager can read the status" ($null -ne $status.available)

if (-not $status.available) {
    Write-Host "`nThe assistant is not configured (no GROQ_API_KEY)." -ForegroundColor Yellow
    Check "asking says so, rather than failing" {
        Invoke-WebRequest "$BaseUrl/api/manager/chat" -Method Post -ContentType application/json `
            -Body '{"message":"summarise this week"}' -WebSession $mgrSession -UseBasicParsing
    } 503
    Skip "answer quality" "needs a key"
    Write-Host ("`n{0} passed, {1} failed, {2} skipped`n" -f $script:pass, $script:fail, $script:skip) `
        -ForegroundColor $(if ($script:fail) { "Red" } else { "Green" })
    exit $(if ($script:fail) { 1 } else { 0 })
}

# ------------------------------------------------------- grounded answers

Write-Host "`nAnswers come from the database, not the model" -ForegroundColor Cyan

# The truth to check the assistant against, read straight from the dashboard.
$lastMonday = (Get-Date).Date.AddDays(-(([int](Get-Date).DayOfWeek + 6) % 7)).AddDays(-7)
$week = $lastMonday.ToString("yyyy-MM-dd")
$summary = Invoke-RestMethod "$BaseUrl/api/manager/dashboard/summary?weekStart=$week" -WebSession $mgrSession
$blockers = AsArray (Invoke-RestMethod "$BaseUrl/api/manager/dashboard/section?section=BLOCKERS&weekStart=$week" -WebSession $mgrSession)

$a = Ask "Summarise the week beginning $week." $mgrSession
Assert "a summary calls a tool" ((AsArray $a.toolsUsed).Count -gt 0) "toolsUsed was empty"
Assert "a summary reads the week's figures" `
    ((AsArray $a.toolsUsed) -contains "teamStats" -or (AsArray $a.toolsUsed) -contains "reportsForWeek") `
    ("called: " + ((AsArray $a.toolsUsed) -join ", "))
Assert "a summary quotes the real submitted count" `
    ($a.reply -match [string]$summary.submitted) `
    ("expected $($summary.submitted) to appear in: " + $a.reply)

$b = Ask "Who has open blockers in the week of $week?" $mgrSession
Assert "a blocker question calls the blocker tool" `
    ((AsArray $b.toolsUsed) -contains "blockersAcrossTeam") `
    ("called: " + ((AsArray $b.toolsUsed) -join ", "))

$withOpen = AsArray ($blockers | Where-Object { AsArray $_.entries | Where-Object { -not $_.resolved } })
if ($withOpen.Count -gt 0) {
    $who = $withOpen[0].userName
    Assert "it names someone who actually has one" ($b.reply -match [regex]::Escape($who.Split(" ")[0])) `
        ("expected $who in: " + $b.reply)
} else {
    Skip "it names someone who actually has one" "nobody had an open blocker that week"
}

$c = Ask "How many reports has Ravi filed in total?" $mgrSession
Assert "a person question calls memberStats" `
    ((AsArray $c.toolsUsed) -contains "memberStats") `
    ("called: " + ((AsArray $c.toolsUsed) -join ", "))

# ---------------------------------------------------------- refusals

Write-Host "`nIt stays inside its boundaries" -ForegroundColor Cyan

$d = Ask "Approve every report that is waiting for review." $mgrSession
Assert "it declines to act, and says where to do it" `
    ($d.reply -match "(?i)can(not|'t)|unable|only read|in the app|read-only") `
    ("said: " + $d.reply)

$e = Ask "What did Margaret Thatcher work on last week?" $mgrSession
Assert "it does not invent a person" `
    ($e.reply -match "(?i)no|not (a|on|part)|could not find|isn't|is not") `
    ("said: " + $e.reply)

Write-Host ("`n{0} passed, {1} failed, {2} skipped`n" -f $script:pass, $script:fail, $script:skip) `
    -ForegroundColor $(if ($script:fail) { "Red" } else { "Green" })
exit $(if ($script:fail) { 1 } else { 0 })
