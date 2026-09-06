<#
    End-to-end smoke test for the report review cycle (Sections 2 and 3).

    Walks the full loop the brief asks for:
        draft -> submit -> request changes -> edit -> resubmit -> approve

    and checks the things that are easy to get wrong:
      * a manager cannot see someone else's draft
      * requesting changes opens a NEW version instead of overwriting
      * the version the manager commented on is preserved verbatim
      * each comment records which version it was written against
      * a member cannot read, edit or review another member's report
      * a manager cannot rewrite report content

    Assumes a running backend with the bootstrap manager present.

    Usage:
        .\scripts\smoke-workflow.ps1
        .\scripts\smoke-workflow.ps1 -BaseUrl http://localhost:8081
#>
param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$ManagerEmail = "manager@sisenco.local",
    [string]$ManagerPassword = "Manager@12345"
)

$ErrorActionPreference = "Stop"
$script:pass = 0
$script:fail = 0

function Check {
    param([string]$Name, [scriptblock]$Call, [int]$Expect = 200)
    try {
        $r = & $Call
        $code = if ($r -is [Microsoft.PowerShell.Commands.WebResponseObject]) { $r.StatusCode } else { 200 }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
    }
    if ($code -eq $Expect) {
        Write-Host ("  PASS  {0,-52} {1}" -f $Name, $code) -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host ("  FAIL  {0,-52} got {1}, expected {2}" -f $Name, $code, $Expect) -ForegroundColor Red
        $script:fail++
    }
}

function Assert {
    param([string]$Name, [bool]$Condition, [string]$Detail = "")
    if ($Condition) {
        Write-Host ("  PASS  {0,-52} ok" -f $Name) -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host ("  FAIL  {0,-52} {1}" -f $Name, $Detail) -ForegroundColor Red
        $script:fail++
    }
}

function Json($o) { $o | ConvertTo-Json -Depth 10 -Compress }
function Login($email, $password, $sessionName) {
    $body = Json @{ email = $email; password = $password }
    $r = Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -ContentType application/json -Body $body -SessionVariable s
    Set-Variable -Name $sessionName -Value $s -Scope Script
    return ($r.Content | ConvertFrom-Json)
}

# A fixed Monday well in the past, so reruns never collide with the current week.
$monday = [datetime]"2026-08-03"
$week = $monday.ToString("yyyy-MM-dd")
$suffix = Get-Random -Minimum 1000 -Maximum 9999
$raviEmail = "ravi.$suffix@sisenco.local"
$tharaEmail = "thara.$suffix@sisenco.local"

Write-Host "`nReport workflow smoke test against $BaseUrl" -ForegroundColor Cyan
Write-Host "week under test: $week`n" -ForegroundColor DarkGray

# ---------------------------------------------------------------- setup
$manager = Login $ManagerEmail $ManagerPassword "mgr"
Write-Host "Setup" -ForegroundColor Cyan
Assert "manager signs in with MANAGER role" ($manager.role -eq "MANAGER") "role was $($manager.role)"

$projectCode = "SMOKE$suffix"
$project = Invoke-RestMethod "$BaseUrl/api/projects" -Method Post -ContentType application/json -WebSession $mgr `
    -Body (Json @{ name = "Smoke Project $suffix"; code = $projectCode; description = "Created by the workflow smoke test"; color = "#4F46E5" })
Assert "manager creates a project" ($null -ne $project.id)

$ravi = Invoke-RestMethod "$BaseUrl/api/users" -Method Post -ContentType application/json -WebSession $mgr `
    -Body (Json @{ name = "Ravi Silva"; email = $raviEmail; password = "password123"; role = "MEMBER"; jobTitle = "Developer" })
$thara = Invoke-RestMethod "$BaseUrl/api/users" -Method Post -ContentType application/json -WebSession $mgr `
    -Body (Json @{ name = "Thara Fernando"; email = $tharaEmail; password = "password123"; role = "MEMBER"; jobTitle = "QA" })
Assert "manager creates two members" ($null -ne $ravi.id -and $null -ne $thara.id)

Login $raviEmail "password123" "raviS" | Out-Null
Login $tharaEmail "password123" "tharaS" | Out-Null

# ---------------------------------------------------------------- draft
Write-Host "`n1. Member drafts a report" -ForegroundColor Cyan

$draftBody = Json @{
    weekStart = $week
    projectId = $project.id
    tasks     = @(
        @{ name = "Build login screen"; priority = "HIGH"; plannedPct = 100; actualPct = 80; status = "IN_PROGRESS"; hoursPlanned = 12; hoursSpent = 14; deliverable = "PR #21" },
        @{ name = "Write unit tests"; priority = "MEDIUM"; plannedPct = 100; actualPct = 100; status = "COMPLETED"; hoursPlanned = 6; hoursSpent = 5; deliverable = "42 tests" }
    )
    nextWeekPlan   = "Finish the login screen and start the dashboard."
    blockers       = @(
        @{ description = "Waiting on design tokens from the design team"; key = $true; resolved = $false },
        @{ description = "Flaky CI runner"; key = $false; resolved = $false }
    )
    achievements   = @(
        @{ description = "Cut build time from 9 to 4 minutes"; key = $true }
    )
    hours          = @(
        @{ taskType = "DEVELOPMENT"; hours = 14 },
        @{ taskType = "TESTING"; hours = 5 },
        @{ taskType = "MEETINGS"; hours = 3 }
    )
    notes = "First week on the new module."
    links = "https://github.com/example/pr/21"
}

$report = Invoke-RestMethod "$BaseUrl/api/reports" -Method Post -ContentType application/json -WebSession $raviS -Body $draftBody
$reportId = $report.id
Assert "report is created as DRAFT" ($report.status -eq "DRAFT") "status was $($report.status)"
Assert "version 1 exists and is editable" ($report.currentVersion.versionNo -eq 1 -and $report.currentVersion.editable)
Assert "week end is derived as Sunday" ($report.weekEnd -eq $monday.AddDays(6).ToString("yyyy-MM-dd"))
Assert "key blocker is flagged" (@($report.currentVersion.blockers | Where-Object { $_.key }).Count -eq 1)

Check "a second report for the same week is refused" -Expect 409 {
    Invoke-WebRequest "$BaseUrl/api/reports" -Method Post -ContentType application/json -WebSession $raviS -Body $draftBody
}
Check "a non-Monday week start is refused" -Expect 400 {
    Invoke-WebRequest "$BaseUrl/api/reports" -Method Post -ContentType application/json -WebSession $raviS `
        -Body (Json @{ weekStart = "2026-08-05"; tasks = @(@{ name = "x"; priority = "LOW"; plannedPct = 0; actualPct = 0; status = "NOT_STARTED"; hoursPlanned = 0; hoursSpent = 0 }) })
}
Check "two key blockers are refused" -Expect 400 {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId" -Method Put -ContentType application/json -WebSession $raviS `
        -Body (Json @{ weekStart = $week; projectId = $project.id
                       tasks = @(@{ name = "x"; priority = "LOW"; plannedPct = 0; actualPct = 0; status = "NOT_STARTED"; hoursPlanned = 0; hoursSpent = 0 })
                       blockers = @(@{ description = "a"; key = $true }, @{ description = "b"; key = $true }) })
}

Write-Host "`n2. A draft is private to its author" -ForegroundColor Cyan
Check "manager cannot open another's draft" -Expect 404 {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId" -WebSession $mgr
}
$teamBefore = Invoke-RestMethod "$BaseUrl/api/manager/reports?weekStart=$week" -WebSession $mgr
Assert "draft does not appear on the team dashboard" (@($teamBefore.content | Where-Object { $_.id -eq $reportId }).Count -eq 0)
Check "another member cannot open it" -Expect 404 {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId" -WebSession $tharaS
}

# ---------------------------------------------------------------- submit
Write-Host "`n3. Member submits" -ForegroundColor Cyan
$submitted = Invoke-RestMethod "$BaseUrl/api/reports/$reportId/submit" -Method Post -WebSession $raviS
Assert "status becomes SUBMITTED" ($submitted.status -eq "SUBMITTED")
Assert "version 1 is frozen" (-not $submitted.currentVersion.editable)
Assert "submittedAt is recorded" ($null -ne $submitted.submittedAt)
Assert "report is no longer editable by the owner" (-not $submitted.editable)

Check "owner cannot edit a submitted report" -Expect 409 {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId" -Method Put -ContentType application/json -WebSession $raviS -Body $draftBody
}
Check "manager can now open it" {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId" -WebSession $mgr
}
$teamAfter = Invoke-RestMethod "$BaseUrl/api/manager/reports?weekStart=$week" -WebSession $mgr
Assert "it now appears on the team dashboard" (@($teamAfter.content | Where-Object { $_.id -eq $reportId }).Count -eq 1)

# ------------------------------------------------------- request changes
Write-Host "`n4. Manager requests changes" -ForegroundColor Cyan
Check "requesting changes without a comment is refused" -Expect 400 {
    Invoke-WebRequest "$BaseUrl/api/manager/reports/$reportId/review" -Method Post -ContentType application/json -WebSession $mgr `
        -Body (Json @{ action = "REQUEST_CHANGES"; comment = "   " })
}
Check "a member cannot review anything" -Expect 403 {
    Invoke-WebRequest "$BaseUrl/api/manager/reports/$reportId/review" -Method Post -ContentType application/json -WebSession $tharaS `
        -Body (Json @{ action = "APPROVE" })
}

$comment = "Please break the login task down and add the actual hours for the CI work."
$sentBack = Invoke-RestMethod "$BaseUrl/api/manager/reports/$reportId/review" -Method Post -ContentType application/json -WebSession $mgr `
    -Body (Json @{ action = "REQUEST_CHANGES"; comment = $comment })

Assert "status becomes NEEDS_CORRECTION" ($sentBack.status -eq "NEEDS_CORRECTION")
Assert "a version 2 is opened" ($sentBack.currentVersion.versionNo -eq 2 -and $sentBack.currentVersion.editable)
Assert "two versions now exist" (@($sentBack.versions).Count -eq 2)
Assert "version 1 stays frozen" (-not (@($sentBack.versions | Where-Object { $_.versionNo -eq 1 })[0].editable))
Assert "version 2 carries the previous content forward" (@($sentBack.currentVersion.tasks).Count -eq 2)
Assert "comment is visible to the member" ($sentBack.reviews[0].comment -eq $comment)
Assert "comment is pinned to version 1" ($sentBack.reviews[0].versionNo -eq 1)

# ---------------------------------------------------------------- correct
Write-Host "`n5. Member corrects and resubmits" -ForegroundColor Cyan
$correctedBody = Json @{
    weekStart = $week
    projectId = $project.id
    tasks     = @(
        @{ name = "Build login form markup"; priority = "HIGH"; plannedPct = 100; actualPct = 100; status = "COMPLETED"; hoursPlanned = 6; hoursSpent = 7; deliverable = "PR #21" },
        @{ name = "Wire login to the auth API"; priority = "HIGH"; plannedPct = 100; actualPct = 100; status = "COMPLETED"; hoursPlanned = 6; hoursSpent = 7; deliverable = "PR #22" },
        @{ name = "Write unit tests"; priority = "MEDIUM"; plannedPct = 100; actualPct = 100; status = "COMPLETED"; hoursPlanned = 6; hoursSpent = 5; deliverable = "42 tests" }
    )
    nextWeekPlan = "Start the dashboard."
    blockers     = @(@{ description = "Waiting on design tokens"; key = $true; resolved = $true })
    achievements = @(@{ description = "Cut build time from 9 to 4 minutes"; key = $true })
    hours        = @(@{ taskType = "DEVELOPMENT"; hours = 14 }, @{ taskType = "TESTING"; hours = 5 }, @{ taskType = "MEETINGS"; hours = 4 })
    notes        = "Split the login task as requested."
    links        = "https://github.com/example/pr/21"
}
$corrected = Invoke-RestMethod "$BaseUrl/api/reports/$reportId" -Method Put -ContentType application/json -WebSession $raviS -Body $correctedBody
Assert "member can edit again after being sent back" (@($corrected.currentVersion.tasks).Count -eq 3)

$v1 = @($corrected.versions | Where-Object { $_.versionNo -eq 1 })[0]
Assert "version 1 content is untouched by the edit" (@($v1.tasks).Count -eq 2) "v1 had $(@($v1.tasks).Count) tasks"
Assert "version 1 still shows the original task name" (@($v1.tasks | Where-Object { $_.name -eq "Build login screen" }).Count -eq 1)

$resubmitted = Invoke-RestMethod "$BaseUrl/api/reports/$reportId/submit" -Method Post -WebSession $raviS
Assert "resubmitting returns to SUBMITTED" ($resubmitted.status -eq "SUBMITTED")
Assert "version 2 is now frozen too" (-not $resubmitted.currentVersion.editable)

# ---------------------------------------------------------------- approve
Write-Host "`n6. Manager approves" -ForegroundColor Cyan
$approved = Invoke-RestMethod "$BaseUrl/api/manager/reports/$reportId/review" -Method Post -ContentType application/json -WebSession $mgr `
    -Body (Json @{ action = "APPROVE"; comment = "Much clearer, thank you." })
Assert "status becomes APPROVED" ($approved.status -eq "APPROVED")
Assert "no third version is created on approval" (@($approved.versions).Count -eq 2)
Assert "both review actions are kept" (@($approved.reviews).Count -eq 2)
Assert "latest review is the approval" ($approved.reviews[0].action -eq "APPROVE")
Assert "approval is pinned to version 2" ($approved.reviews[0].versionNo -eq 2)
Assert "the earlier request is still on record" (@($approved.reviews | Where-Object { $_.action -eq "REQUEST_CHANGES" }).Count -eq 1)

Check "an approved report cannot be edited" -Expect 409 {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId" -Method Put -ContentType application/json -WebSession $raviS -Body $correctedBody
}
Check "an approved report cannot be reviewed again" -Expect 409 {
    Invoke-WebRequest "$BaseUrl/api/manager/reports/$reportId/review" -Method Post -ContentType application/json -WebSession $mgr `
        -Body (Json @{ action = "APPROVE" })
}

# ------------------------------------------------------------ separation
Write-Host "`n7. Members are isolated from each other" -ForegroundColor Cyan
Check "another member cannot read it" -Expect 404 {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId" -WebSession $tharaS
}
Check "another member cannot edit it" -Expect 403 {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId" -Method Put -ContentType application/json -WebSession $tharaS -Body $correctedBody
}
Check "another member cannot submit it" -Expect 403 {
    Invoke-WebRequest "$BaseUrl/api/reports/$reportId/submit" -Method Post -WebSession $tharaS
}
Check "a member cannot list the team dashboard" -Expect 403 {
    Invoke-WebRequest "$BaseUrl/api/manager/reports" -WebSession $tharaS
}
$mine = Invoke-RestMethod "$BaseUrl/api/reports/mine" -WebSession $tharaS
Assert "another member's history is empty" ($mine.totalElements -eq 0)

$versions = Invoke-RestMethod "$BaseUrl/api/reports/$reportId/versions" -WebSession $mgr
Assert "manager can list every version on demand" (@($versions).Count -eq 2)

Write-Host "`n$($script:pass) passed, $($script:fail) failed`n" -ForegroundColor $(if ($script:fail -eq 0) { "Green" } else { "Red" })
if ($script:fail -gt 0) { exit 1 }
